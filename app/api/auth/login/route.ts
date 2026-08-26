import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import getPool, { sql } from "@/lib/mssql";
import clientPromise from "@/lib/mongodb";
import { AuthUser } from "@/lib/types";
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

    // 1. Fetch employee identity from SQL Server
    const pool = await getPool();
    const req = pool.request();
    req.input("emp_no", sql.NVarChar, empCode);
    const result = await req.query(
      `SELECT Emp_No, DisplayName, Work_Email, Department, Location, Designation
       FROM ${TABLE}
       WHERE Emp_No = @emp_no`
    );

    if (!result.recordset.length) {
      return NextResponse.json(
        { error: `Employee code '${empCode}' not found in database. Please check your ID.` },
        { status: 401 }
      );
    }

    const ssmsRow = result.recordset[0];
    const empName = String(ssmsRow.DisplayName || "").trim();
    const empDesignation = String(ssmsRow.Designation || "").trim();
    const empUnitId = String(ssmsRow.Department || "").trim();

    // 2. Fetch role & password hash from MongoDB
    const mongo = await clientPromise;
    const db = mongo.db();

    const [roleDoc, pwDoc] = await Promise.all([
      db.collection("emp_roles").findOne({ code: empCode }),
      db.collection("emp_passwords").findOne({ code: empCode }),
    ]);

    const empRole: string = roleDoc?.role || "employee";
    const storedHash: string | undefined = pwDoc?.passwordHash;

    // 3. Validate role
    if (role === "hr" && empRole !== "hr") {
      // HR login: also allow master HR password fallback
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
      // Standard employee login
      const isValidPassword = verifyPassword(password, storedHash, empCode, empName);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: `Incorrect password for '${empCode}'. Please verify your credentials and try again.` },
          { status: 401 }
        );
      }
    }

    // 4. Resolve panel judge assignment from MongoDB cycles
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const cycle = await db.collection("cycles").findOne({ month: currentMonth });

    const isPanelJudge = Boolean(roleDoc?.isPanelJudge);
    let assignedJudgeSlot: string | undefined = undefined;

    if (isPanelJudge && cycle?.judges) {
      const found = cycle.judges.find(
        (j: { id: string; name?: string; code?: string }) =>
          (j.code && j.code.toUpperCase() === empCode) ||
          (j.name && j.name.toLowerCase().includes(empName.toLowerCase()))
      );
      assignedJudgeSlot = found ? found.id : empCode;
    }

    const userRole = empRole === "hr" ? "hr" : empRole === "hod" ? "hod" : "employee";

    const verifiedUser: AuthUser = {
      role: userRole,
      name: empName,
      code: empCode,
      unitId: empUnitId,
      designation:
        empDesignation ||
        (userRole === "hr" ? "HR Admin" : userRole === "hod" ? "Department Head" : "Staff Member"),
      isPanelJudge,
      judgeId: assignedJudgeSlot,
      gender: roleDoc?.gender || "",
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
    console.error("[POST /api/auth/login]", error);
    return NextResponse.json(
      { error: "Database error during login verification." },
      { status: 500 }
    );
  }
}
