import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import getPool, { sql } from "@/lib/mssql";
import clientPromise from "@/lib/mongodb";
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

    // 1. Fetch admin name from SSMS (for default password formula fallback)
    const pool = await getPool();
    const req = pool.request();
    req.input("emp_no", sql.NVarChar, adminCode);
    const ssmsResult = await req.query(
      `SELECT DisplayName FROM ${TABLE} WHERE Emp_No = @emp_no`
    );

    if (!ssmsResult.recordset.length) {
      return NextResponse.json({ error: "Admin employee record not found." }, { status: 401 });
    }

    const adminName = String(ssmsResult.recordset[0].DisplayName || "").trim();

    // 2. Fetch admin password hash from MongoDB
    const mongo = await clientPromise;
    const db = mongo.db();
    const pwDoc = await db.collection("emp_passwords").findOne({ code: adminCode });

    // 3. Verify admin password
    const isValid = verifyPassword(adminPassword.trim(), pwDoc?.passwordHash, adminCode, adminName);

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
