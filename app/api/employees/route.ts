import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import getPool, { sql } from "@/lib/mssql";
import { AuthUser } from "@/lib/types";
import { hashPassword, verifyPassword } from "@/lib/auth-utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TABLE = process.env.MSSQL_TABLE || "dbo.Employees";

/**
 * Maps an SSMS Employees row to the app's internal employee shape.
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
// Returns employees from SSMS Employees, merged with roles from EmpRoles.

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const unitId = searchParams.get("unitId");
    const role = searchParams.get("role");

    const pool = await getPool();
    const req = pool.request();

    // Join Employees + EmpRoles in a single query
    let query = `
      SELECT
        e.Emp_No, e.DisplayName, e.Work_Email, e.Department, e.Location, e.Designation,
        ISNULL(r.Role, 'employee')   AS Role,
        ISNULL(r.IsHOD, 0)          AS IsHOD,
        ISNULL(r.IsPanelJudge, 0)   AS IsPanelJudge,
        ISNULL(r.Gender, '')        AS Gender
      FROM ${TABLE} e
      LEFT JOIN dbo.EmpRoles r ON e.Emp_No = r.Emp_No
      WHERE 1=1
    `;

    if (code) {
      req.input("emp_no", sql.NVarChar, code.trim().toUpperCase());
      query += " AND e.Emp_No = @emp_no";
    }
    if (unitId) {
      req.input("department", sql.NVarChar, unitId);
      query += " AND e.Department = @department";
    }
    if (role) {
      req.input("role_filter", sql.NVarChar, role);
      // HOD filter: match either Role='hod' OR IsHOD=1
      if (role === "hod") {
        query += " AND (ISNULL(r.Role, 'employee') = 'hod' OR ISNULL(r.IsHOD, 0) = 1)";
      } else {
        query += " AND ISNULL(r.Role, 'employee') = @role_filter";
      }
    }

    const result = await req.query(query);

    const employees = result.recordset.map((row) => {
      const isHod = Boolean(row.IsHOD);
      // IsHOD=1 always resolves to 'hod' role regardless of Role column
      const resolvedRole = isHod
        ? "hod"
        : String(row.Role || "employee");
      return {
        ...mapSsmsRow(row),
        role: resolvedRole,
        isHOD: isHod,
        isPanelJudge: Boolean(row.IsPanelJudge),
        gender: String(row.Gender || ""),
      };
    });

    return NextResponse.json({ employees });
  } catch (error) {
    console.error("[GET /api/employees]", error);
    return NextResponse.json(
      { error: "Failed to fetch employees from SQL Server." },
      { status: 500 }
    );
  }
}

// ─── POST /api/employees ─────────────────────────────────────────────────────
// Upserts role/isPanelJudge for an employee into dbo.EmpRoles.
// Identity comes from SSMS — POST cannot create new employees.

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, role, isPanelJudge, isHOD, unitId, gender } = body;

    if (!code) {
      return NextResponse.json({ error: "Employee code is required." }, { status: 400 });
    }

    const empCode = code.trim().toUpperCase();
    const pool = await getPool();

    // Verify the employee exists in dbo.Employees
    const checkReq = pool.request();
    checkReq.input("emp_no", sql.NVarChar, empCode);
    const check = await checkReq.query(
      `SELECT Emp_No, Department FROM ${TABLE} WHERE Emp_No = @emp_no`
    );

    if (!check.recordset.length) {
      return NextResponse.json(
        { error: `Employee '${empCode}' not found in SQL Server directory.` },
        { status: 404 }
      );
    }

    // Update Department if provided
    if (unitId) {
      const updateDeptReq = pool.request();
      updateDeptReq.input("emp_no", sql.NVarChar, empCode);
      updateDeptReq.input("department", sql.NVarChar, unitId);
      await updateDeptReq.query(`UPDATE ${TABLE} SET Department = @department WHERE Emp_No = @emp_no`);
    }

    const isSettingHOD = Boolean(isHOD) || role === "hod";
    const resolvedRole = isSettingHOD ? "hod" : (role || "employee");

    // Single HOD Per Department Enforcement
    if (isSettingHOD) {
      const targetDept = unitId || check.recordset[0]?.Department;
      if (targetDept) {
        const clearHodReq = pool.request();
        clearHodReq.input("department", sql.NVarChar, targetDept);
        clearHodReq.input("emp_no", sql.NVarChar, empCode);
        await clearHodReq.query(`
          UPDATE r
          SET r.IsHOD = 0,
              r.Role = CASE WHEN r.Role = 'hod' THEN 'employee' ELSE r.Role END,
              r.UpdatedAt = GETDATE()
          FROM dbo.EmpRoles r
          INNER JOIN ${TABLE} e ON r.Emp_No = e.Emp_No
          WHERE e.Department = @department AND e.Emp_No <> @emp_no
        `);
      }
    }

    // MERGE into dbo.EmpRoles (upsert)
    const upsertReq = pool.request();
    upsertReq.input("emp_no", sql.NVarChar, empCode);
    upsertReq.input("role", sql.NVarChar, resolvedRole);
    upsertReq.input("isHOD", sql.Bit, isSettingHOD ? 1 : 0);
    upsertReq.input("isPanelJudge", sql.Bit, isPanelJudge ? 1 : 0);
    upsertReq.input("gender", sql.NVarChar, gender || "");

    await upsertReq.query(`
      MERGE dbo.EmpRoles AS target
      USING (VALUES (@emp_no, @role, @isHOD, @isPanelJudge, @gender)) AS source (Emp_No, Role, IsHOD, IsPanelJudge, Gender)
      ON target.Emp_No = source.Emp_No
      WHEN MATCHED THEN
        UPDATE SET Role = source.Role, IsHOD = source.IsHOD, IsPanelJudge = source.IsPanelJudge, Gender = source.Gender, UpdatedAt = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (Emp_No, Role, IsHOD, IsPanelJudge, Gender) VALUES (source.Emp_No, source.Role, source.IsHOD, source.IsPanelJudge, source.Gender);
    `);

    return NextResponse.json({ ok: true, employee: { code: empCode, role: resolvedRole, isHOD: isSettingHOD, isPanelJudge } });
  } catch (error) {
    console.error("[POST /api/employees]", error);
    return NextResponse.json({ error: "Failed to update employee role." }, { status: 500 });
  }
}

// ─── PUT /api/employees ───────────────────────────────────────────────────────
// Updates role, isPanelJudge, or password for an employee (all in SSMS).

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
    const { code, role, isPanelJudge, isHOD, unitId, name, gender, newPassword, resetPassword, adminPassword } = body;

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
    const pool = await getPool();

    // Fetch admin identity + password hash from SSMS
    const adminReq = pool.request();
    adminReq.input("admin_code", sql.NVarChar, adminCode);
    const adminResult = await adminReq.query(`
      SELECT e.DisplayName, p.PasswordHash
      FROM ${TABLE} e
      LEFT JOIN dbo.EmpPasswords p ON e.Emp_No = p.Emp_No
      WHERE e.Emp_No = @admin_code
    `);

    if (!adminResult.recordset.length) {
      return NextResponse.json({ error: "Admin employee record not found." }, { status: 401 });
    }

    const adminRow = adminResult.recordset[0];
    const isAdminPasswordValid = verifyPassword(
      adminPassword,
      adminRow.PasswordHash ?? undefined,
      adminCode,
      String(adminRow.DisplayName)
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
    empReq.input("emp_no", sql.NVarChar, empCode);
    const empResult = await empReq.query(`
      SELECT DisplayName, Department FROM ${TABLE} WHERE Emp_No = @emp_no
    `);

    if (!empResult.recordset.length) {
      return NextResponse.json(
        { error: `Employee '${empCode}' not found in SQL Server directory.` },
        { status: 404 }
      );
    }

    // Update dbo.Employees fields (Department, DisplayName) if provided
    if (unitId || name) {
      const updateEmpReq = pool.request();
      updateEmpReq.input("emp_no", sql.NVarChar, empCode);
      const setClauses: string[] = [];
      if (unitId) {
        updateEmpReq.input("department", sql.NVarChar, unitId);
        setClauses.push("Department = @department");
      }
      if (name) {
        updateEmpReq.input("displayName", sql.NVarChar, name.trim());
        setClauses.push("DisplayName = @displayName");
      }
      if (setClauses.length > 0) {
        await updateEmpReq.query(`UPDATE ${TABLE} SET ${setClauses.join(", ")} WHERE Emp_No = @emp_no`);
      }
    }

    // Update dbo.EmpRoles if role/isHOD/isPanelJudge provided
    if (role !== undefined || isHOD !== undefined || isPanelJudge !== undefined) {
      const isSettingHOD = Boolean(isHOD) || role === "hod";
      const resolvedRole = isSettingHOD ? "hod" : (role || "employee");

      // Single HOD Per Department Enforcement
      if (isSettingHOD) {
        const targetDept = unitId || empResult.recordset[0]?.Department;
        if (targetDept) {
          const clearHodReq = pool.request();
          clearHodReq.input("department", sql.NVarChar, targetDept);
          clearHodReq.input("emp_no", sql.NVarChar, empCode);
          await clearHodReq.query(`
            UPDATE r
            SET r.IsHOD = 0,
                r.Role = CASE WHEN r.Role = 'hod' THEN 'employee' ELSE r.Role END,
                r.UpdatedAt = GETDATE()
            FROM dbo.EmpRoles r
            INNER JOIN ${TABLE} e ON r.Emp_No = e.Emp_No
            WHERE e.Department = @department AND e.Emp_No <> @emp_no
          `);
        }
      }

      const roleReq = pool.request();
      roleReq.input("emp_no", sql.NVarChar, empCode);
      roleReq.input("role", sql.NVarChar, resolvedRole);
      roleReq.input("isHOD", sql.Bit, isSettingHOD ? 1 : 0);
      roleReq.input("isPanelJudge", sql.Bit, isPanelJudge ? 1 : 0);
      roleReq.input("gender", sql.NVarChar, gender || "");

      await roleReq.query(`
        MERGE dbo.EmpRoles AS target
        USING (VALUES (@emp_no, @role, @isHOD, @isPanelJudge, @gender)) AS source (Emp_No, Role, IsHOD, IsPanelJudge, Gender)
        ON target.Emp_No = source.Emp_No
        WHEN MATCHED THEN
          UPDATE SET Role = source.Role, IsHOD = source.IsHOD, IsPanelJudge = source.IsPanelJudge, Gender = source.Gender, UpdatedAt = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (Emp_No, Role, IsHOD, IsPanelJudge, Gender) VALUES (source.Emp_No, source.Role, source.IsHOD, source.IsPanelJudge, source.Gender);
      `);
    }

    // Handle password update
    if (newPassword?.trim()) {
      const newHash = hashPassword(newPassword.trim());
      const pwReq = pool.request();
      pwReq.input("emp_no", sql.NVarChar, empCode);
      pwReq.input("hash", sql.NVarChar(64), newHash);

      await pwReq.query(`
        MERGE dbo.EmpPasswords AS target
        USING (VALUES (@emp_no, @hash)) AS source (Emp_No, PasswordHash)
        ON target.Emp_No = source.Emp_No
        WHEN MATCHED THEN
          UPDATE SET PasswordHash = source.PasswordHash, UpdatedAt = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (Emp_No, PasswordHash) VALUES (source.Emp_No, source.PasswordHash);
      `);
    } else if (resetPassword) {
      // Delete custom hash — fallback to default formula on next login
      const delReq = pool.request();
      delReq.input("emp_no", sql.NVarChar, empCode);
      await delReq.query(`DELETE FROM dbo.EmpPasswords WHERE Emp_No = @emp_no`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PUT /api/employees]", error);
    return NextResponse.json({ error: "Failed to update employee details." }, { status: 500 });
  }
}

// ─── DELETE /api/employees ────────────────────────────────────────────────────
// Removes role & password overrides from SSMS.
// (Cannot delete from dbo.Employees — it is the HR master directory.)

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
      return NextResponse.json({ error: "Admin confirmation password is required." }, { status: 400 });
    }

    const adminCode = adminUser.code.trim().toUpperCase();
    const pool = await getPool();

    // Verify admin identity + password from SSMS
    const adminReq = pool.request();
    adminReq.input("admin_code", sql.NVarChar, adminCode);
    const adminResult = await adminReq.query(`
      SELECT e.DisplayName, p.PasswordHash
      FROM ${TABLE} e
      LEFT JOIN dbo.EmpPasswords p ON e.Emp_No = p.Emp_No
      WHERE e.Emp_No = @admin_code
    `);

    if (!adminResult.recordset.length) {
      return NextResponse.json({ error: "Admin employee record not found." }, { status: 401 });
    }

    const adminRow = adminResult.recordset[0];
    const isAdminPasswordValid = verifyPassword(
      adminPassword.trim(),
      adminRow.PasswordHash ?? undefined,
      adminCode,
      String(adminRow.DisplayName)
    );

    if (!isAdminPasswordValid) {
      return NextResponse.json(
        { error: "Incorrect Admin Password. Authorization failed." },
        { status: 401 }
      );
    }

    const empCode = code.trim().toUpperCase();

    // Remove role + password rows from SSMS (CASCADE from Employees is NOT triggered here)
    const delRoleReq = pool.request();
    delRoleReq.input("emp_no", sql.NVarChar, empCode);
    await delRoleReq.query(`DELETE FROM dbo.EmpRoles WHERE Emp_No = @emp_no`);

    const delPwReq = pool.request();
    delPwReq.input("emp_no", sql.NVarChar, empCode);
    await delPwReq.query(`DELETE FROM dbo.EmpPasswords WHERE Emp_No = @emp_no`);

    return NextResponse.json({
      ok: true,
      message: `Employee ${empCode} app data removed. (HR record in dbo.Employees unchanged.)`,
    });
  } catch (error) {
    console.error("[DELETE /api/employees]", error);
    return NextResponse.json({ error: "Failed to remove employee data." }, { status: 500 });
  }
}
