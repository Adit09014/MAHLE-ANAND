import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";
import { AuthUser } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { role, name, code, unitId, judgeId, password } = body;

    if (!role || !["employee", "hod", "judge", "hr"].includes(role)) {
      return NextResponse.json({ error: "Invalid role specified." }, { status: 400 });
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
      };
    } else if (role === "employee") {
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

      verifiedUser = {
        role: "employee",
        name: empRecord.name,
        code: empRecord.code,
        unitId: empRecord.unitId,
      };
    } else if (role === "hod") {
      if (!unitId) {
        return NextResponse.json({ error: "Please select a department or plant." }, { status: 400 });
      }

      // Check for HOD record for this unit or code match
      let hodRecord = null;
      if (code && code.trim()) {
        const inputCode = code.trim().toUpperCase();
        hodRecord = await db.collection("employees").findOne({ code: inputCode, unitId });
      }

      if (!hodRecord) {
        hodRecord = await db.collection("employees").findOne({ unitId, role: "hod" });
      }

      if (!hodRecord) {
        // Fallback check: any employee under this unit
        hodRecord = await db.collection("employees").findOne({ unitId });
      }

      if (!hodRecord) {
        return NextResponse.json(
          { error: `No registered employee or HOD record found in database for selected unit.` },
          { status: 401 }
        );
      }

      verifiedUser = {
        role: "hod",
        name: name?.trim() || hodRecord.name,
        code: hodRecord.code,
        unitId: hodRecord.unitId,
      };
    } else if (role === "judge") {
      if (!judgeId) {
        return NextResponse.json({ error: "Please select a panel judge position." }, { status: 400 });
      }

      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const cycle = await db.collection("cycles").findOne({ month: currentMonth });

      let judgeName = name?.trim() || `Judge ${judgeId.toUpperCase()}`;
      if (cycle && cycle.judges) {
        const assignedJudge = cycle.judges.find((j: { id: string; name: string }) => j.id === judgeId);
        if (assignedJudge && assignedJudge.name) {
          judgeName = assignedJudge.name;
        }
      }

      verifiedUser = {
        role: "judge",
        name: judgeName,
        judgeId,
      };
    } else {
      return NextResponse.json({ error: "Invalid role specified." }, { status: 400 });
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
