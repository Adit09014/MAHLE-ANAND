import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";
import { AuthUser } from "@/lib/types";
import { verifyPassword } from "@/lib/auth-utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { role, code, password } = body;

    if (!role || !["employee", "hr"].includes(role)) {
      return NextResponse.json({ error: "Invalid login type specified." }, { status: 400 });
    }

    if (!code || !code.trim()) {
      return NextResponse.json({ error: "Employee Code (ID) is required." }, { status: 400 });
    }

    if (!password || !password.trim()) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    const empCode = code.trim().toUpperCase();
    const client = await clientPromise;
    const db = client.db();

    const empRecord = await db.collection("employees").findOne({ code: empCode });

    if (!empRecord) {
      return NextResponse.json(
        { error: `Employee code '${empCode}' not found in database. Please check your ID.` },
        { status: 401 }
      );
    }

    // Role validation
    if (role === "hr" && empRecord.role !== "hr") {
      // Fallback if password matches master HR password or HR record
      const isValidPassword =
        password === (process.env.HR_MASTER_PASSWORD || "") ||
        verifyPassword(password, empRecord.passwordHash, empRecord.code, empRecord.name);

      if (!isValidPassword) {
        return NextResponse.json(
          { error: `Employee code '${empCode}' does not have HR Admin privileges or password is incorrect.` },
          { status: 401 }
        );
      }
    } else {
      // Standard password verification against hashed password in DB
      const isValidPassword = verifyPassword(
        password,
        empRecord.passwordHash,
        empRecord.code,
        empRecord.name
      );

      if (!isValidPassword) {
        return NextResponse.json(
          {
            error: `Incorrect password for '${empCode}'. Please verify your credentials and try again.`,
          },
          { status: 401 }
        );
      }
    }

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const cycle = await db.collection("cycles").findOne({ month: currentMonth });

    const isPanelJudge = Boolean(empRecord.isPanelJudge);
    let assignedJudgeSlot: string | undefined = undefined;

    if (isPanelJudge && cycle && cycle.judges) {
      const found = cycle.judges.find(
        (j: { id: string; name?: string; code?: string }) =>
          (j.code && j.code.toUpperCase() === empCode) ||
          (j.name && j.name.toLowerCase().includes(empRecord.name.toLowerCase()))
      );
      if (found) {
        assignedJudgeSlot = found.id;
      } else {
        assignedJudgeSlot = empCode;
      }
    }

    const userRole = empRecord.role === "hr" ? "hr" : empRecord.role === "hod" ? "hod" : "employee";

    const verifiedUser: AuthUser = {
      role: userRole,
      name: empRecord.name,
      code: empRecord.code,
      unitId: empRecord.unitId,
      designation: empRecord.designation || (userRole === "hr" ? "HR Admin" : userRole === "hod" ? "Department Head" : "Staff Member"),
      isPanelJudge,
      judgeId: assignedJudgeSlot,
      gender: empRecord.gender || "",
    };

    const cookieStore = await cookies();
    cookieStore.set("rr_session", JSON.stringify(verifiedUser), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return NextResponse.json({ ok: true, user: verifiedUser });
  } catch (error) {
    return NextResponse.json({ error: "Database error during login verification." }, { status: 500 });
  }
}
