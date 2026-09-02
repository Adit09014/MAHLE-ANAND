import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import getPool, { sql } from "@/lib/mssql";
import { AuthUser } from "@/lib/types";
import { hashPassword, verifyPassword } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

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
        ISNULL(r.IsAdmin, 0)        AS IsAdmin,
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
      const isAdmin = Boolean(row.IsAdmin);
      const storedRole = String(row.Role || "employee");
      const resolvedRole = isAdmin ? "admin" : storedRole;
      return {
        ...mapSsmsRow(row),
        role: resolvedRole,
        isHOD: isHod,
        isPanelJudge: Boolean(row.IsPanelJudge),
        isAdmin: isAdmin,
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
    const { code, name, email, location, role, isPanelJudge, isHOD, isAdmin, unitId, gender } = body;

    if (!code || !String(code).trim()) {
      return NextResponse.json({ error: "Employee code is required." }, { status: 400 });
    }

    const empCode = String(code).trim().toUpperCase();
    const empName = String(name || "").trim() || `Employee ${empCode}`;
    const workEmail = String(email || body.work_email || "").trim();
    const workLocation = String(location || "").trim();
    const pool = await getPool();

    const isSettingHOD = Boolean(isHOD);
    const isSettingAdmin = Boolean(isAdmin) || role === "admin";
    const resolvedRole = role || (isSettingAdmin ? "admin" : "employee");
    const designation = isSettingAdmin ? "System Admin" : role === "hr" ? "HR Admin" : isSettingHOD ? "Department Head" : "Staff Member";

    // 1. Upsert into dbo.Employees (creates employee record if new, or updates details if exists)
    const empUpsertReq = pool.request();
    empUpsertReq.input("emp_no", sql.NVarChar, empCode);
    empUpsertReq.input("displayName", sql.NVarChar, empName);
    empUpsertReq.input("work_email", sql.NVarChar, workEmail);
    empUpsertReq.input("department", sql.NVarChar, unitId || "hr");
    empUpsertReq.input("location", sql.NVarChar, workLocation);
    empUpsertReq.input("designation", sql.NVarChar, designation);

    await empUpsertReq.query(`
      MERGE ${TABLE} AS target
      USING (VALUES (@emp_no, @displayName, @work_email, @department, @location, @designation)) AS source (Emp_No, DisplayName, Work_Email, Department, Location, Designation)
      ON target.Emp_No = source.Emp_No
      WHEN MATCHED THEN
        UPDATE SET DisplayName = source.DisplayName, Work_Email = source.Work_Email, Department = source.Department, Location = source.Location, Designation = source.Designation
      WHEN NOT MATCHED THEN
        INSERT (Emp_No, DisplayName, Work_Email, Department, Location, Designation) VALUES (source.Emp_No, source.DisplayName, source.Work_Email, source.Department, source.Location, source.Designation);
    `);

    // 2. Single HOD Per Department Enforcement (clears IsHOD flag for others in dept)
    if (isSettingHOD) {
      const targetDept = unitId || "hr";
      const clearHodReq = pool.request();
      clearHodReq.input("department", sql.NVarChar, targetDept);
      clearHodReq.input("emp_no", sql.NVarChar, empCode);
      await clearHodReq.query(`
        UPDATE r
        SET r.IsHOD = 0,
            r.UpdatedAt = GETDATE()
        FROM dbo.EmpRoles r
        INNER JOIN ${TABLE} e ON r.Emp_No = e.Emp_No
        WHERE e.Department = @department AND e.Emp_No <> @emp_no
      `);
    }

    // 3. MERGE into dbo.EmpRoles (upsert)
    const upsertReq = pool.request();
    upsertReq.input("emp_no", sql.NVarChar, empCode);
    upsertReq.input("role", sql.NVarChar, resolvedRole);
    upsertReq.input("isHOD", sql.Bit, isSettingHOD ? 1 : 0);
    upsertReq.input("isPanelJudge", sql.Bit, isPanelJudge ? 1 : 0);
    upsertReq.input("isAdmin", sql.Bit, isSettingAdmin ? 1 : 0);
    upsertReq.input("gender", sql.NVarChar, gender || "");

    await upsertReq.query(`
      MERGE dbo.EmpRoles AS target
      USING (VALUES (@emp_no, @role, @isHOD, @isPanelJudge, @isAdmin, @gender)) AS source (Emp_No, Role, IsHOD, IsPanelJudge, IsAdmin, Gender)
      ON target.Emp_No = source.Emp_No
      WHEN MATCHED THEN
        UPDATE SET Role = source.Role, IsHOD = source.IsHOD, IsPanelJudge = source.IsPanelJudge, IsAdmin = source.IsAdmin, Gender = source.Gender, UpdatedAt = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (Emp_No, Role, IsHOD, IsPanelJudge, IsAdmin, Gender) VALUES (source.Emp_No, source.Role, source.IsHOD, source.IsPanelJudge, source.IsAdmin, source.Gender);
    `);

    return NextResponse.json({ ok: true, employee: { code: empCode, name: empName, role: resolvedRole, isHOD: isSettingHOD, isPanelJudge: Boolean(isPanelJudge), isAdmin: isSettingAdmin } });
  } catch (error) {
    console.error("[POST /api/employees]", error);
    return NextResponse.json({ error: "Failed to create employee record." }, { status: 500 });
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
    const { code, newCode, role, isPanelJudge, isHOD, isAdmin, unitId, name, email, location, gender, newPassword, resetPassword, adminPassword } = body;

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
      String(adminRow.DisplayName || "")
    );

    if (!isAdminPasswordValid) {
      return NextResponse.json(
        { error: "Invalid admin confirmation password. Authorization failed." },
        { status: 401 }
      );
    }

    const empCode = code.trim().toUpperCase();

    // Fetch target employee
    const checkEmpReq = pool.request();
    checkEmpReq.input("emp_no", sql.NVarChar, empCode);
    const empResult = await checkEmpReq.query(
      `SELECT e.Emp_No, e.DisplayName, e.Department, r.Role, r.IsAdmin, r.IsHOD, r.IsPanelJudge FROM ${TABLE} e LEFT JOIN dbo.EmpRoles r ON e.Emp_No = r.Emp_No WHERE e.Emp_No = @emp_no`
    );

    if (!empResult.recordset.length) {
      return NextResponse.json(
        { error: `Target employee '${empCode}' not found in SQL Server directory.` },
        { status: 404 }
      );
    }

    // Security check: Allow HR/Admin session users to set or grant isAdmin = true
    if (isAdmin !== undefined && isAdmin) {
      const isRequesterAdmin = adminUser.role === "admin" || adminUser.role === "hr" || Boolean(adminUser.isAdmin);
      if (!isRequesterAdmin) {
        return NextResponse.json(
          { error: "Only an authorized Admin can grant Admin privileges." },
          { status: 403 }
        );
      }
    }

    // Use targetEmpCode for all subsequent queries if the code was changed
    const targetEmpCode = newCode ? String(newCode).trim().toUpperCase() : empCode;

    // Update dbo.Employees fields (Emp_No, Department, DisplayName, Work_Email, Location) if provided
    if (unitId || name || email !== undefined || location !== undefined || newCode) {
      const updateEmpReq = pool.request();
      updateEmpReq.input("emp_no", sql.NVarChar, empCode);
      const setClauses: string[] = [];
      if (newCode) {
        updateEmpReq.input("new_emp_no", sql.NVarChar, targetEmpCode);
        setClauses.push("Emp_No = @new_emp_no");
      }
      if (unitId) {
        updateEmpReq.input("department", sql.NVarChar, unitId);
        setClauses.push("Department = @department");
      }
      if (name) {
        updateEmpReq.input("displayName", sql.NVarChar, name.trim());
        setClauses.push("DisplayName = @displayName");
      }
      if (email !== undefined) {
        updateEmpReq.input("work_email", sql.NVarChar, String(email).trim());
        setClauses.push("Work_Email = @work_email");
      }
      if (location !== undefined) {
        updateEmpReq.input("location", sql.NVarChar, String(location).trim());
        setClauses.push("Location = @location");
      }
      if (setClauses.length > 0) {
        await updateEmpReq.query(`UPDATE ${TABLE} SET ${setClauses.join(", ")} WHERE Emp_No = @emp_no`);
      }

      // If the primary key (Emp_No) was changed, we must also migrate the JSON data 
      // in dbo.Cycles and dbo.Points to ensure nominations and points are not orphaned.
      if (newCode && empCode !== targetEmpCode) {
        // 1. Migrate dbo.Cycles
        const cyclesReq = pool.request();
        const cyclesRes = await cyclesReq.query(`SELECT Month, DataJSON FROM dbo.Cycles`);
        for (const row of cyclesRes.recordset) {
          let cycleChanged = false;
          try {
            const cycle = JSON.parse(row.DataJSON);
            for (const nom of cycle.nominations || []) {
              if (nom.code === empCode) { nom.code = targetEmpCode; cycleChanged = true; }
              if (nom.endorsed?.by === empCode) { nom.endorsed.by = targetEmpCode; cycleChanged = true; }
              if (nom.scores && nom.scores[empCode] !== undefined) {
                nom.scores[targetEmpCode] = nom.scores[empCode];
                delete nom.scores[empCode];
                cycleChanged = true;
              }
            }
            if (cycle.judgeProgress && cycle.judgeProgress[empCode] !== undefined) {
              cycle.judgeProgress[targetEmpCode] = cycle.judgeProgress[empCode];
              delete cycle.judgeProgress[empCode];
              cycleChanged = true;
            }
            if (cycleChanged) {
              const uReq = pool.request();
              uReq.input("month", sql.NVarChar, row.Month);
              uReq.input("data", sql.NVarChar(sql.MAX), JSON.stringify(cycle));
              await uReq.query(`UPDATE dbo.Cycles SET DataJSON = @data, UpdatedAt = GETDATE() WHERE Month = @month`);
            }
          } catch (e) { /* ignore parse errors */ }
        }

        // 2. Migrate dbo.Points
        const ptsReq = pool.request();
        const ptsRes = await ptsReq.query(`SELECT KeyName, DataJSON FROM dbo.Points`);
        for (const row of ptsRes.recordset) {
          try {
            const pts = JSON.parse(row.DataJSON);
            if (pts[empCode] !== undefined) {
              pts[targetEmpCode] = pts[empCode];
              delete pts[empCode];
              const uReq = pool.request();
              uReq.input("key", sql.NVarChar, row.KeyName);
              uReq.input("data", sql.NVarChar(sql.MAX), JSON.stringify(pts));
              await uReq.query(`UPDATE dbo.Points SET DataJSON = @data, UpdatedAt = GETDATE() WHERE KeyName = @key`);
            }
          } catch (e) { /* ignore parse errors */ }
        }
      }
    }

    // Update dbo.EmpRoles if role/isHOD/isPanelJudge/isAdmin/gender provided
    if (role !== undefined || isHOD !== undefined || isPanelJudge !== undefined || isAdmin !== undefined || gender !== undefined) {
      const currentRole = empResult.recordset[0]?.Role || "employee";
      const currentIsAdmin = Boolean(empResult.recordset[0]?.IsAdmin);
      const isSettingHOD = isHOD !== undefined ? Boolean(isHOD) : Boolean(empResult.recordset[0]?.IsHOD);
      const isSettingAdmin = isAdmin !== undefined ? Boolean(isAdmin) : (role === "admin" || currentIsAdmin);
      const resolvedRole = role !== undefined ? role : (isSettingAdmin ? "admin" : currentRole);

      // Single HOD Per Department Enforcement (clears IsHOD flag for others in dept)
      if (isSettingHOD) {
        const targetDept = unitId || empResult.recordset[0]?.Department;
        if (targetDept) {
          const clearHodReq = pool.request();
          clearHodReq.input("department", sql.NVarChar, targetDept);
          clearHodReq.input("emp_no", sql.NVarChar, empCode);
          await clearHodReq.query(`
            UPDATE r
            SET r.IsHOD = 0,
                r.UpdatedAt = GETDATE()
            FROM dbo.EmpRoles r
            INNER JOIN ${TABLE} e ON r.Emp_No = e.Emp_No
            WHERE e.Department = @department AND e.Emp_No <> @emp_no
          `);
        }
      }

      const roleReq = pool.request();
      roleReq.input("emp_no", sql.NVarChar, targetEmpCode);
      roleReq.input("role", sql.NVarChar, resolvedRole);
      roleReq.input("isHOD", sql.Bit, isSettingHOD ? 1 : 0);
      roleReq.input("isPanelJudge", sql.Bit, isPanelJudge ? 1 : 0);
      roleReq.input("isAdmin", sql.Bit, isSettingAdmin ? 1 : 0);
      roleReq.input("gender", sql.NVarChar, gender || "");

      await roleReq.query(`
        MERGE dbo.EmpRoles AS target
        USING (VALUES (@emp_no, @role, @isHOD, @isPanelJudge, @isAdmin, @gender)) AS source (Emp_No, Role, IsHOD, IsPanelJudge, IsAdmin, Gender)
        ON target.Emp_No = source.Emp_No
        WHEN MATCHED THEN
          UPDATE SET Role = source.Role, IsHOD = source.IsHOD, IsPanelJudge = source.IsPanelJudge, IsAdmin = source.IsAdmin, Gender = source.Gender, UpdatedAt = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (Emp_No, Role, IsHOD, IsPanelJudge, IsAdmin, Gender) VALUES (source.Emp_No, source.Role, source.IsHOD, source.IsPanelJudge, source.IsAdmin, source.Gender);
      `);
    }

    // Handle password update
    if (newPassword?.trim()) {
      const newHash = hashPassword(newPassword.trim());
      const pwReq = pool.request();
      pwReq.input("emp_no", sql.NVarChar, targetEmpCode);
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
      delReq.input("emp_no", sql.NVarChar, targetEmpCode);
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

    // 1. Delete from dependent tables first (in case foreign key cascade is disabled)
    const delRoleReq = pool.request();
    delRoleReq.input("emp_no", sql.NVarChar, empCode);
    await delRoleReq.query(`DELETE FROM dbo.EmpRoles WHERE Emp_No = @emp_no`);

    const delPwReq = pool.request();
    delPwReq.input("emp_no", sql.NVarChar, empCode);
    await delPwReq.query(`DELETE FROM dbo.EmpPasswords WHERE Emp_No = @emp_no`);

    // 2. Delete from dbo.Employees master table
    const delEmpReq = pool.request();
    delEmpReq.input("emp_no", sql.NVarChar, empCode);
    await delEmpReq.query(`DELETE FROM ${TABLE} WHERE Emp_No = @emp_no`);

    return NextResponse.json({
      ok: true,
      message: `Employee ${empCode} deleted successfully from database.`,
    });
  } catch (error) {
    console.error("[DELETE /api/employees]", error);
    return NextResponse.json({ error: "Failed to remove employee record." }, { status: 500 });
  }
}
