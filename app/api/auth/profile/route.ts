import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import getPool, { sql } from "@/lib/mssql";
import { AuthUser } from "@/lib/types";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("rr_session");

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    let user: AuthUser;
    try {
      user = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json({ error: "Invalid session cookie." }, { status: 401 });
    }

    if (!user.code) {
      return NextResponse.json({ error: "User code not found in session." }, { status: 400 });
    }

    const pool = await getPool();
    const req = pool.request();
    req.input("emp_no", sql.NVarChar, user.code.trim().toUpperCase());
    const result = await req.query(`
      SELECT e.Work_Email, r.Gender
      FROM dbo.Employees e
      LEFT JOIN dbo.EmpRoles r ON e.Emp_No = r.Emp_No
      WHERE e.Emp_No = @emp_no
    `);

    const row = result.recordset[0];
    return NextResponse.json({
      email: String(row?.Work_Email || user.email || "").trim(),
      gender: String(row?.Gender || user.gender || "").trim(),
    });
  } catch (error) {
    console.error("[GET /api/auth/profile]", error);
    return NextResponse.json({ error: "Failed to fetch profile." }, { status: 500 });
  }
}

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
    const { gender, email } = body;
    const empCode = user.code.trim().toUpperCase();

    const pool = await getPool();
    let updatedEmail = user.email || "";
    let updatedGender = user.gender || "";

    // 1. Validate & Update Work Email (if provided)
    if (email !== undefined) {
      const trimmedEmail = String(email || "").trim().toLowerCase();

      // Enforce @mahle.com email requirement
      const emailRegex = /^[a-zA-Z0-9._%+-]+@mahle\.com$/i;
      if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
        return NextResponse.json(
          {
            error: "Invalid email domain. Work email must be a valid address ending with @mahle.com (e.g. name.surname@mahle.com).",
          },
          { status: 400 }
        );
      }

      const emailReq = pool.request();
      emailReq.input("emp_no", sql.NVarChar, empCode);
      emailReq.input("work_email", sql.NVarChar, trimmedEmail);
      await emailReq.query(`
        UPDATE dbo.Employees
        SET Work_Email = @work_email
        WHERE Emp_No = @emp_no
      `);

      updatedEmail = trimmedEmail;
    }

    // 2. Update Gender in dbo.EmpRoles (if provided)
    if (gender !== undefined) {
      const newGender = String(gender || "").trim();

      // Fetch current role info to preserve permissions
      const roleCheck = pool.request();
      roleCheck.input("emp_no", sql.NVarChar, empCode);
      const roleResult = await roleCheck.query(
        "SELECT Role, IsHOD, IsPanelJudge, IsAdmin FROM dbo.EmpRoles WHERE Emp_No = @emp_no"
      );

      const currentRole = roleResult.recordset[0]?.Role || user.role || "employee";
      const currentIsHOD = Boolean(roleResult.recordset[0]?.IsHOD ?? user.isHOD);
      const currentIsPanelJudge = Boolean(roleResult.recordset[0]?.IsPanelJudge ?? user.isPanelJudge);
      const currentIsAdmin = Boolean(roleResult.recordset[0]?.IsAdmin ?? user.isAdmin);

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

      updatedGender = newGender;
    }

    // 3. Update session cookie
    const updatedUser: AuthUser = {
      ...user,
      email: updatedEmail,
      gender: updatedGender,
    };

    cookieStore.set("rr_session", JSON.stringify(updatedUser), {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: "lax",
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
