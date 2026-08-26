import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import getPool, { sql } from "@/lib/mssql";
import { AuthUser } from "@/lib/types";
import { verifyPassword } from "@/lib/auth-utils";

const TABLE = process.env.MSSQL_TABLE || "dbo.Employees";

export async function POST(request: Request) {
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
    const { adminPassword } = body;

    if (!adminPassword?.trim()) {
      return NextResponse.json(
        { error: "Admin confirmation password is required." },
        { status: 400 }
      );
    }

    const adminCode = adminUser.code.trim().toUpperCase();
    const pool = await getPool();

    // Fetch admin name + password hash from SSMS
    const req = pool.request();
    req.input("emp_no", sql.NVarChar, adminCode);
    const result = await req.query(`
      SELECT e.DisplayName, p.PasswordHash
      FROM ${TABLE} e
      LEFT JOIN dbo.EmpPasswords p ON e.Emp_No = p.Emp_No
      WHERE e.Emp_No = @emp_no
    `);

    if (!result.recordset.length) {
      return NextResponse.json({ error: "Admin employee record not found." }, { status: 401 });
    }

    const row = result.recordset[0];
    const adminName = String(row.DisplayName || "").trim();
    const storedHash: string | undefined = row.PasswordHash ?? undefined;

    const isValid = verifyPassword(adminPassword.trim(), storedHash, adminCode, adminName);
    if (!isValid) {
      return NextResponse.json(
        { error: "Incorrect Admin Password. Authorization failed." },
        { status: 401 }
      );
    }

    return NextResponse.json({ ok: true, message: "Admin password verified successfully." });
  } catch (error) {
    console.error("[POST /api/auth/verify-admin-pass]", error);
    return NextResponse.json(
      { error: "Failed to verify admin password." },
      { status: 500 }
    );
  }
}
