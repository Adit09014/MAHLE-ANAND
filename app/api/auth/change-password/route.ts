import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";
import { AuthUser } from "@/lib/types";
import { verifyPassword, hashPassword } from "@/lib/auth-utils";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("rr_session");

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json(
        { error: "Unauthorized session. Please log in again." },
        { status: 401 }
      );
    }

    const currentUser: AuthUser = JSON.parse(sessionCookie.value);
    if (!currentUser || !currentUser.code) {
      return NextResponse.json(
        { error: "Invalid user session profile." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !currentPassword.trim()) {
      return NextResponse.json(
        { error: "Current password is required." },
        { status: 400 }
      );
    }

    if (!newPassword || !newPassword.trim()) {
      return NextResponse.json(
        { error: "New password is required." },
        { status: 400 }
      );
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
    const client = await clientPromise;
    const db = client.db();

    const empRecord = await db.collection("employees").findOne({ code: empCode });

    if (!empRecord) {
      return NextResponse.json(
        { error: `Employee record '${empCode}' not found in database.` },
        { status: 404 }
      );
    }

    // Verify current password against database hash or computed formula
    const isCurrentValid = verifyPassword(
      currentPassword,
      empRecord.passwordHash,
      empRecord.code,
      empRecord.name
    );

    if (!isCurrentValid) {
      return NextResponse.json(
        { error: "Current password is incorrect. Please try again." },
        { status: 401 }
      );
    }

    // Hash new password and update MongoDB
    const newHash = hashPassword(newPassword);

    await db.collection("employees").updateOne(
      { code: empCode },
      { $set: { passwordHash: newHash, updatedAt: new Date() } }
    );

    return NextResponse.json({
      ok: true,
      message: "Password changed successfully! You can now log in with your new password.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Database error while updating password." },
      { status: 500 }
    );
  }
}
