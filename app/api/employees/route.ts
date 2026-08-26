import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import getPool, { sql } from "@/lib/mssql";
import clientPromise from "@/lib/mongodb";
import { AuthUser } from "@/lib/types";
import { generateDefaultPassword, hashPassword, verifyPassword } from "@/lib/auth-utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TABLE = process.env.MSSQL_TABLE || "dbo.Employees";

/**
 * Maps an SSMS row to the app's internal employee shape.
 * SSMS columns: Emp_No, DisplayName, Work_Email, Department, Location, Designation
 */
function mapSsmsRow(row: Record<string, unknown>) {
  return {
    code: String(row.Emp_No || "").trim().toUpperCase(),
    name: String(row.DisplayName || "").trim(),
    email: String(row.Work_Email || "").trim(),
    unitId: String(row.Department || "").trim(),
    location: String(row.Location || "").trim(),
    designation: String(row.Designation || "").trim(),
  };
}

// ─── GET /api/employees ───────────────────────────────────────────────────────
// Returns employees from SSMS, merged with roles/isPanelJudge from MongoDB.

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const unitId = searchParams.get("unitId");
    const role = searchParams.get("role");

    // 1. Build SSMS query
    const pool = await getPool();
    const req = pool.request();

    let query = `SELECT Emp_No, DisplayName, Work_Email, Department, Location, Designation FROM ${TABLE} WHERE 1=1`;

    if (code) {
      req.input("emp_no", sql.NVarChar, code.trim().toUpperCase());
      query += " AND Emp_No = @emp_no";
    }
    if (unitId) {
      req.input("department", sql.NVarChar, unitId);
      query += " AND Department = @department";
    }

    const result = await req.query(query);
    let employees = result.recordset.map(mapSsmsRow);

    // 2. Merge roles from MongoDB (emp_roles collection)
    const mongo = await clientPromise;
    const db = mongo.db();

    const codes = employees.map((e) => e.code);
    const roleDocs = codes.length
      ? await db.collection("emp_roles").find({ code: { $in: codes } }).toArray()
      : [];

    const roleMap: Record<string, { role: string; isPanelJudge: boolean }> = {};
    for (const doc of roleDocs) {
      roleMap[doc.code] = { role: doc.role || "employee", isPanelJudge: Boolean(doc.isPanelJudge) };
    }

    let merged = employees.map((emp) => ({
      ...emp,
      role: roleMap[emp.code]?.role || "employee",
      isPanelJudge: roleMap[emp.code]?.isPanelJudge || false,
    }));

    // 3. Filter by role if requested
    if (role) {
      merged = merged.filter((e) => e.role === role);
    }

    return NextResponse.json({ employees: merged });
  } catch (error) {
    console.error("[GET /api/employees]", error);
    return NextResponse.json(
      { error: "Failed to fetch employees from SQL Server." },
      { status: 500 }
    );
  }
}

// ─── POST /api/employees ─────────────────────────────────────────────────────
// Upserts the role / isPanelJudge for an employee into MongoDB (emp_roles).
// SSMS is the source of truth for identity — POST cannot create new employees.

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, role, isPanelJudge } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Employee code is required." },
        { status: 400 }
      );
    }

    const empCode = code.trim().toUpperCase();

    // Verify the employee actually exists in SSMS
    const pool = await getPool();
    const checkReq = pool.request();
    checkReq.input("emp_no", sql.NVarChar, empCode);
    const check = await checkReq.query(
      `SELECT Emp_No FROM ${TABLE} WHERE Emp_No = @emp_no`
    );

    if (!check.recordset.length) {
      return NextResponse.json(
        { error: `Employee '${empCode}' not found in SQL Server directory.` },
        { status: 404 }
      );
    }

    // Upsert role metadata in MongoDB
    const mongo = await clientPromise;
    const db = mongo.db();

    const roleData = {
      code: empCode,
      role: role || "employee",
      isPanelJudge: Boolean(isPanelJudge),
      updatedAt: new Date(),
    };

    await db.collection("emp_roles").updateOne(
      { code: empCode },
      { $set: roleData },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, employee: roleData });
  } catch (error) {
    console.error("[POST /api/employees]", error);
    return NextResponse.json(
      { error: "Failed to update employee role." },
      { status: 500 }
    );
  }
}

// ─── PUT /api/employees ───────────────────────────────────────────────────────
// Updates role, isPanelJudge, or resets/sets password for an employee.

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("rr_session");
    if (!sessionCookie?.value) {
      return NextResponse.json(
        { error: "Unauthorized session. Admin authentication required." },
        { status: 401 }
      );
    }

    const adminUser: AuthUser = JSON.parse(sessionCookie.value);
    if (!adminUser?.code) {
      return NextResponse.json({ error: "Invalid Admin session profile." }, { status: 401 });
    }

    const body = await request.json();
    const { code, role, isPanelJudge, designation, newPassword, resetPassword, adminPassword } = body;

    if (!adminPassword?.trim()) {
      return NextResponse.json(
        { error: "Admin confirmation password is required to save changes." },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: "Employee code (ID) is required to update details." },
        { status: 400 }
      );
    }

    const adminCode = adminUser.code.trim().toUpperCase();
    const mongo = await clientPromise;
    const db = mongo.db();

    // Verify admin via SSMS (identity) + MongoDB (password)
    const pool = await getPool();
    const adminReq = pool.request();
    adminReq.input("emp_no", sql.NVarChar, adminCode);
    const adminSsms = await adminReq.query(
      `SELECT Emp_No, DisplayName FROM ${TABLE} WHERE Emp_No = @emp_no`
    );

    if (!adminSsms.recordset.length) {
      return NextResponse.json({ error: "Admin employee record not found." }, { status: 401 });
    }

    const adminSsmsRow = adminSsms.recordset[0];
    const adminPwDoc = await db.collection("emp_passwords").findOne({ code: adminCode });

    const isAdminPasswordValid = verifyPassword(
      adminPassword,
      adminPwDoc?.passwordHash,
      adminCode,
      String(adminSsmsRow.DisplayName)
    );

    if (!isAdminPasswordValid) {
      return NextResponse.json(
        { error: "Incorrect Admin Password. Authorization failed." },
        { status: 401 }
      );
    }

    // Verify target employee exists in SSMS
    const empCode = code.trim().toUpperCase();
    const empReq = pool.request();
    empReq.input("emp_no2", sql.NVarChar, empCode);
    const empSsms = await empReq.query(
      `SELECT Emp_No, DisplayName FROM ${TABLE} WHERE Emp_No = @emp_no2`
    );

    if (!empSsms.recordset.length) {
      return NextResponse.json(
        { error: `Employee '${empCode}' not found in SQL Server directory.` },
        { status: 404 }
      );
    }

    // Update role in MongoDB emp_roles
    const roleUpdate: Record<string, unknown> = { updatedAt: new Date() };
    if (role) roleUpdate.role = role;
    if (typeof isPanelJudge === "boolean") roleUpdate.isPanelJudge = isPanelJudge;

    await db.collection("emp_roles").updateOne(
      { code: empCode },
      { $set: { code: empCode, ...roleUpdate } },
      { upsert: true }
    );

    // Handle password change
    const empDisplayName = String(empSsms.recordset[0].DisplayName);
    if (newPassword?.trim()) {
      const newHash = hashPassword(newPassword.trim());
      await db.collection("emp_passwords").updateOne(
        { code: empCode },
        { $set: { code: empCode, passwordHash: newHash, updatedAt: new Date() } },
        { upsert: true }
      );
    } else if (resetPassword) {
      // Remove custom hash → fallback to default formula
      await db.collection("emp_passwords").deleteOne({ code: empCode });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PUT /api/employees]", error);
    return NextResponse.json(
      { error: "Failed to update employee details." },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/employees ────────────────────────────────────────────────────
// Removes the employee's role & password overrides from MongoDB.
// (Cannot delete from SSMS — it's the HR master directory.)

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("rr_session");
    if (!sessionCookie?.value) {
      return NextResponse.json(
        { error: "Unauthorized session. Admin authentication required." },
        { status: 401 }
      );
    }

    const adminUser: AuthUser = JSON.parse(sessionCookie.value);
    if (!adminUser?.code) {
      return NextResponse.json({ error: "Invalid Admin session profile." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const adminPassword = searchParams.get("adminPassword");

    if (!code) {
      return NextResponse.json({ error: "Employee code is required." }, { status: 400 });
    }

    if (!adminPassword?.trim()) {
      return NextResponse.json(
        { error: "Admin confirmation password is required." },
        { status: 400 }
      );
    }

    const adminCode = adminUser.code.trim().toUpperCase();
    const mongo = await clientPromise;
    const db = mongo.db();
    const pool = await getPool();

    // Verify admin identity in SSMS
    const adminReq = pool.request();
    adminReq.input("emp_no", sql.NVarChar, adminCode);
    const adminSsms = await adminReq.query(
      `SELECT Emp_No, DisplayName FROM ${TABLE} WHERE Emp_No = @emp_no`
    );

    if (!adminSsms.recordset.length) {
      return NextResponse.json({ error: "Admin employee record not found." }, { status: 401 });
    }

    const adminPwDoc = await db.collection("emp_passwords").findOne({ code: adminCode });

    const isAdminPasswordValid = verifyPassword(
      adminPassword.trim(),
      adminPwDoc?.passwordHash,
      adminCode,
      String(adminSsms.recordset[0].DisplayName)
    );

    if (!isAdminPasswordValid) {
      return NextResponse.json(
        { error: "Incorrect Admin Password. Authorization failed." },
        { status: 401 }
      );
    }

    const empCode = code.trim().toUpperCase();

    // Remove role + password overrides from MongoDB
    await db.collection("emp_roles").deleteOne({ code: empCode });
    await db.collection("emp_passwords").deleteOne({ code: empCode });

    return NextResponse.json({
      ok: true,
      message: `Employee ${empCode} app data removed. (SSMS record unchanged.)`,
    });
  } catch (error) {
    console.error("[DELETE /api/employees]", error);
    return NextResponse.json(
      { error: "Failed to remove employee data." },
      { status: 500 }
    );
  }
}
