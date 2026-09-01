import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import getPool, { sql } from "@/lib/mssql";
import { AuthUser, Cycle, Role } from "@/lib/types";
import { verifyPassword } from "@/lib/auth-utils";

const TABLE = process.env.MSSQL_TABLE || "dbo.Employees";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { role, code, password } = body;

    if (!role || !["employee", "hr"].includes(role)) {
      return NextResponse.json({ error: "Invalid login type specified." }, { status: 400 });
    }

    if (!code?.trim()) {
      return NextResponse.json({ error: "Employee Code (ID) is required." }, { status: 400 });
    }

    if (!password?.trim()) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    const empCode = code.trim().toUpperCase();
    const pool = await getPool();

    // 1. Fetch employee identity + role + password hash from SSMS in one query
    const req = pool.request();
    req.input("emp_no", sql.NVarChar, empCode);
    const result = await req.query(`
      SELECT
        e.Emp_No, e.DisplayName, e.Work_Email, e.Department, e.Location, e.Designation,
        ISNULL(r.Role, 'employee')  AS Role,
        ISNULL(r.IsHOD, 0)         AS IsHOD,
        ISNULL(r.IsPanelJudge, 0)  AS IsPanelJudge,
        ISNULL(r.IsAdmin, 0)       AS IsAdmin,
        ISNULL(r.Gender, '')       AS Gender,
        p.PasswordHash
      FROM ${TABLE} e
      LEFT JOIN dbo.EmpRoles     r ON e.Emp_No = r.Emp_No
      LEFT JOIN dbo.EmpPasswords p ON e.Emp_No = p.Emp_No
      WHERE e.Emp_No = @emp_no
    `);

    if (!result.recordset.length) {
      return NextResponse.json(
        { error: `Employee code '${empCode}' not found in database. Please check your ID.` },
        { status: 401 }
      );
    }

    const row = result.recordset[0];
    const empName = String(row.DisplayName || "").trim();
    const dbRole = String(row.Role || "employee");
    const isHOD = Boolean(row.IsHOD);
    const isAdmin = Boolean(row.IsAdmin);
    const storedHash: string | undefined = row.PasswordHash ?? undefined;

    // 2. Validate role & password
    // Allow HR/Admin portal login if dbRole is 'hr'/'admin' OR user has isAdmin=1
    const hasAdminRights = dbRole === "hr" || dbRole === "admin" || isAdmin;
    if (role === "hr" && !hasAdminRights) {
      const isValidPassword =
        password === (process.env.HR_MASTER_PASSWORD || "") ||
        verifyPassword(password, storedHash, empCode, empName);

      if (!isValidPassword) {
        return NextResponse.json(
          { error: `Employee '${empCode}' does not have HR Admin privileges or password is incorrect.` },
          { status: 401 }
        );
      }
    } else {
      const isValidPassword = verifyPassword(password, storedHash, empCode, empName);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: `Incorrect password for '${empCode}'. Please verify your credentials and try again.` },
          { status: 401 }
        );
      }
    }

    // 3. Resolve panel judge assignment from SQL Server dbo.Cycles
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const cycleReq = pool.request();
    cycleReq.input("month", sql.NVarChar, currentMonth);
    const cycleResult = await cycleReq.query(`
      SELECT DataJSON FROM dbo.Cycles WHERE Month = @month
    `);

    let cycle: Cycle | null = null;
    if (cycleResult.recordset.length) {
      try {
        cycle = JSON.parse(cycleResult.recordset[0].DataJSON);
      } catch {
        /* ignore JSON parse error */
      }
    }

    const isPanelJudge = Boolean(row.IsPanelJudge);
    let assignedJudgeSlot: string | undefined = undefined;

    if (isPanelJudge && cycle?.judges) {
      const found = cycle.judges.find(
        (j: { id: string; name?: string; code?: string }) =>
          (j.code && j.code.toUpperCase() === empCode) ||
          (j.name && j.name.toLowerCase().includes(empName.toLowerCase()))
      );
      assignedJudgeSlot = found ? found.id : empCode;
    }

    const userRole: Role = isAdmin || dbRole === "admin" ? "admin" : dbRole === "hr" ? "hr" : isHOD || dbRole === "hod" ? "hod" : "employee";

    const verifiedUser: AuthUser = {
      role: userRole,
      name: empName,
      code: empCode,
      unitId: String(row.Department || "").trim(),
      designation:
        String(row.Designation || "").trim() ||
        (userRole === "admin" ? "System Admin" : userRole === "hr" ? "HR Admin" : isHOD ? "Department Head" : "Staff Member"),
      isHOD,
      isPanelJudge,
      isAdmin,
      gender: String(row.Gender || ""),
    };

    const cookieStore = await cookies();
    cookieStore.set("rr_session", JSON.stringify(verifiedUser), {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true", // false by default for HTTP local network access (e.g. reward-mahle.local)
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return NextResponse.json({ ok: true, user: verifiedUser });
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    return NextResponse.json(
      { error: "Database error during login verification." },
      { status: 500 }
    );
  }
}
