import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import getPool, { sql } from "@/lib/mssql";
import { AuthUser } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("rr_session");

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    let user: AuthUser;
    try {
      user = JSON.parse(sessionCookie.value);
    } catch (e) {
      return NextResponse.json({ error: "Invalid session cookie." }, { status: 401 });
    }

    if (!user.code) {
      return NextResponse.json({ error: "User code not found in session." }, { status: 400 });
    }

    const body = await request.json();
    const { gender } = body;

    const empCode = user.code.trim().toUpperCase();
    const newGender = String(gender || "").trim();

    const pool = await getPool();

    // 1. Fetch current role info from dbo.EmpRoles to preserve existing values
    const roleCheck = pool.request();
    roleCheck.input("emp_no", sql.NVarChar, empCode);
    const roleResult = await roleCheck.query(
      "SELECT Role, IsHOD, IsPanelJudge, IsAdmin, Gender FROM dbo.EmpRoles WHERE Emp_No = @emp_no"
    );

    const currentRole = roleResult.recordset[0]?.Role || user.role || "employee";
    const currentIsHOD = Boolean(roleResult.recordset[0]?.IsHOD ?? user.isHOD);
    const currentIsPanelJudge = Boolean(roleResult.recordset[0]?.IsPanelJudge ?? user.isPanelJudge);
    const currentIsAdmin = Boolean(roleResult.recordset[0]?.IsAdmin ?? user.isAdmin);

    // 2. Upsert into dbo.EmpRoles
    const upsertReq = pool.request();
    upsertReq.input("emp_no", sql.NVarChar, empCode);
    upsertReq.input("role", sql.NVarChar, currentRole);
    upsertReq.input("isHOD", sql.Bit, currentIsHOD ? 1 : 0);
    upsertReq.input("isPanelJudge", sql.Bit, currentIsPanelJudge ? 1 : 0);
    upsertReq.input("isAdmin", sql.Bit, currentIsAdmin ? 1 : 0);
    upsertReq.input("gender", sql.NVarChar, newGender);

    await upsertReq.query(`
      MERGE dbo.EmpRoles AS target
      USING (VALUES (@emp_no, @role, @isHOD, @isPanelJudge, @isAdmin, @gender)) AS source (Emp_No, Role, IsHOD, IsPanelJudge, IsAdmin, Gender)
      ON target.Emp_No = source.Emp_No
      WHEN MATCHED THEN
        UPDATE SET Gender = source.Gender, UpdatedAt = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (Emp_No, Role, IsHOD, IsPanelJudge, IsAdmin, Gender) VALUES (source.Emp_No, source.Role, source.IsHOD, source.IsPanelJudge, source.IsAdmin, source.Gender);
    `);

    // 3. Update session cookie with updated gender
    const updatedUser: AuthUser = {
      ...user,
      gender: newGender,
    };

    cookieStore.set("rr_session", JSON.stringify(updatedUser), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      ok: true,
      message: "Profile updated successfully!",
      user: updatedUser,
    });
  } catch (error) {
    console.error("[POST /api/auth/profile]", error);
    return NextResponse.json({ error: "Failed to update profile details." }, { status: 500 });
  }
}
