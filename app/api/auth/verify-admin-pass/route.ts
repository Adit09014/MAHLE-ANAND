import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";
import { AuthUser } from "@/lib/types";
import { verifyPassword } from "@/lib/auth-utils";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("rr_session");
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json(
        { error: "Unauthorized session. Admin authentication required." },
        { status: 401 }
      );
    }

    const adminUser: AuthUser = JSON.parse(sessionCookie.value);
    if (!adminUser || !adminUser.code) {
      return NextResponse.json(
        { error: "Invalid Admin session profile." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { adminPassword } = body;

    if (!adminPassword || !adminPassword.trim()) {
      return NextResponse.json(
        { error: "Admin confirmation password is required." },
        { status: 400 }
      );
    }

    const adminCode = adminUser.code.trim().toUpperCase();
    const client = await clientPromise;
    const db = client.db();

    // Fetch Admin record from MongoDB
    const adminRecord = await db.collection("employees").findOne({ code: adminCode });
    if (!adminRecord) {
      return NextResponse.json(
        { error: "Admin employee record not found." },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(
      adminPassword.trim(),
      adminRecord.passwordHash,
      adminRecord.code,
      adminRecord.name
    );

    if (!isValid) {
      return NextResponse.json(
        { error: "Incorrect Admin Password. Authorization failed." },
        { status: 401 }
      );
    }

    return NextResponse.json({ ok: true, message: "Admin password verified successfully." });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to verify admin password." },
      { status: 500 }
    );
  }
}
