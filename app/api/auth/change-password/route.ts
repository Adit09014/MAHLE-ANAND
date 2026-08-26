import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import getPool, { sql } from "@/lib/mssql";
import { AuthUser } from "@/lib/types";
import { verifyPassword, hashPassword } from "@/lib/auth-utils";

const TABLE = process.env.MSSQL_TABLE || "dbo.Employees";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("rr_session");

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { error: "Unauthorized session. Please log in again." },
        { status: 401 }
      );
    }

    const currentUser: AuthUser = JSON.parse(sessionCookie.value);
    if (!currentUser?.code) {
      return NextResponse.json({ error: "Invalid user session profile." }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword?.trim()) {
      return NextResponse.json({ error: "Current password is required." }, { status: 400 });
    }
    if (!newPassword?.trim()) {
      return NextResponse.json({ error: "New password is required." }, { status: 400 });
    }
    if (newPassword.trim().length < 4) {
      return NextResponse.json(
        { error: "New password must be at least 4 characters long." },
        { status: 400 }
      );
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New password and confirmation password do not match." },
        { status: 400 }
      );
    }

    const empCode = currentUser.code.trim().toUpperCase();
    const pool = await getPool();

    // Fetch employee name + existing password hash from SSMS
    const req = pool.request();
    req.input("emp_no", sql.NVarChar, empCode);
    const result = await req.query(`
      SELECT e.DisplayName, p.PasswordHash
      FROM ${TABLE} e
      LEFT JOIN dbo.EmpPasswords p ON e.Emp_No = p.Emp_No
      WHERE e.Emp_No = @emp_no
    `);

    if (!result.recordset.length) {
      return NextResponse.json(
        { error: `Employee record '${empCode}' not found in database.` },
        { status: 404 }
      );
    }

    const row = result.recordset[0];
    const empName = String(row.DisplayName || "").trim();
    const storedHash: string | undefined = row.PasswordHash ?? undefined;

    // Verify current password
    const isCurrentValid = verifyPassword(currentPassword, storedHash, empCode, empName);
    if (!isCurrentValid) {
      return NextResponse.json(
        { error: "Current password is incorrect. Please try again." },
        { status: 401 }
      );
    }

    // Save new password hash into dbo.EmpPasswords (SSMS)
    const newHash = hashPassword(newPassword.trim());
    const upsertReq = pool.request();
    upsertReq.input("emp_no", sql.NVarChar, empCode);
    upsertReq.input("hash", sql.NVarChar(64), newHash);

    await upsertReq.query(`
      MERGE dbo.EmpPasswords AS target
      USING (VALUES (@emp_no, @hash)) AS source (Emp_No, PasswordHash)
      ON target.Emp_No = source.Emp_No
      WHEN MATCHED THEN
        UPDATE SET PasswordHash = source.PasswordHash, UpdatedAt = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (Emp_No, PasswordHash) VALUES (source.Emp_No, source.PasswordHash);
    `);

    return NextResponse.json({
      ok: true,
      message: "Password changed successfully! You can now log in with your new password.",
    });
  } catch (error) {
    console.error("[POST /api/auth/change-password]", error);
    return NextResponse.json(
      { error: "Database error while updating password." },
      { status: 500 }
    );
  }
}
