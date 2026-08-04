import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";
import { AuthUser } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { role, name, code, unitId, judgeId, password } = body;

    if (!role || !["employee", "hr"].includes(role)) {
      return NextResponse.json({ error: "Invalid login type specified." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    let verifiedUser: AuthUser;

    if (role === "hr") {
      if (!password || password !== "mahle123") {
        return NextResponse.json({ error: "Invalid HR access password." }, { status: 401 });
      }

      // Check if HR user exists in database or use default HR master
      const hrRecord = await db.collection("employees").findOne({ role: "hr" });
      verifiedUser = {
        role: "hr",
        name: hrRecord ? hrRecord.name : name?.trim() || "HR Administrator",
        code: hrRecord ? hrRecord.code : "HR001",
        unitId: hrRecord ? hrRecord.unitId : "hr",
        isPanelJudge: true,
      };
    } else {
      // Employee login option (handles regular Employee, HOD, and HOD/Employee Panel Judge)
      if (!code || !code.trim()) {
        return NextResponse.json({ error: "Employee code is required." }, { status: 400 });
      }

      const empCode = code.trim().toUpperCase();
      const empRecord = await db.collection("employees").findOne({ code: empCode });

      if (!empRecord) {
        return NextResponse.json(
          { error: `Employee code '${empCode}' not found in database. Please contact HR.` },
          { status: 401 }
        );
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
          // Default fallback slot if not specifically indexed in cycle
          assignedJudgeSlot = "j1";
        }
      }

      const userRole = empRecord.role === "hod" ? "hod" : "employee";

      verifiedUser = {
        role: userRole,
        name: empRecord.name,
        code: empRecord.code,
        unitId: empRecord.unitId,
        isPanelJudge,
        judgeId: assignedJudgeSlot,
        gender: empRecord.gender || "",
      };
    }

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
