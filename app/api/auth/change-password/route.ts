import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import getPool, { sql } from "@/lib/mssql";
import clientPromise from "@/lib/mongodb";
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

    // 1. Fetch employee name from SSMS (needed for default password formula)
    const pool = await getPool();
    const req = pool.request();
    req.input("emp_no", sql.NVarChar, empCode);
    const ssmsResult = await req.query(
      `SELECT DisplayName FROM ${TABLE} WHERE Emp_No = @emp_no`
    );

    if (!ssmsResult.recordset.length) {
      return NextResponse.json(
        { error: `Employee record '${empCode}' not found in database.` },
        { status: 404 }
      );
    }

    const empName = String(ssmsResult.recordset[0].DisplayName || "").trim();

    // 2. Fetch current password hash from MongoDB
    const mongo = await clientPromise;
    const db = mongo.db();
    const pwDoc = await db.collection("emp_passwords").findOne({ code: empCode });

    // 3. Verify current password
    const isCurrentValid = verifyPassword(currentPassword, pwDoc?.passwordHash, empCode, empName);

    if (!isCurrentValid) {
      return NextResponse.json(
        { error: "Current password is incorrect. Please try again." },
        { status: 401 }
      );
    }

    // 4. Save new password hash to MongoDB
    const newHash = hashPassword(newPassword.trim());
    await db.collection("emp_passwords").updateOne(
      { code: empCode },
      { $set: { code: empCode, passwordHash: newHash, updatedAt: new Date() } },
      { upsert: true }
    );

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
