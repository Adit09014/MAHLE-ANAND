import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";
import { AuthUser } from "@/lib/types";
import { generateDefaultPassword, hashPassword, verifyPassword } from "@/lib/auth-utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const unitId = searchParams.get("unitId");
    const role = searchParams.get("role");

    const client = await clientPromise;
    const db = client.db();

    const query: Record<string, unknown> = {};
    if (code) query.code = code.trim().toUpperCase();
    if (unitId) query.unitId = unitId;
    if (role) query.role = role;

    const employees = await db.collection("employees").find(query).toArray();
    return NextResponse.json({ employees });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch employees from MongoDB." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, unitId, gender, designation, role, email, isPanelJudge } = body;

    if (!code || !name || !unitId) {
      return NextResponse.json(
        { error: "Employee code, name, and department/plant unit are required." },
        { status: 400 }
      );
    }

    const empCode = code.trim().toUpperCase();
    const empName = name.trim();
    const client = await clientPromise;
    const db = client.db();

    const plainPassword = generateDefaultPassword(empCode, empName);
    const passwordHash = hashPassword(plainPassword);

    const employee = {
      code: empCode,
      name: empName,
      unitId,
      gender: gender || "",
      designation: designation || "Staff Member",
      role: role || "employee",
      isPanelJudge: Boolean(isPanelJudge),
      email: email ? email.trim() : `${empCode.toLowerCase()}@mahle.com`,
      passwordHash,
      updatedAt: new Date(),
    };

    await db.collection("employees").updateOne(
      { code: empCode },
      { $set: employee },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, employee });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save employee to MongoDB." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
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
    const {
      code,
      name,
      unitId,
      role,
      isPanelJudge,
      gender,
      designation,
      newPassword,
      resetPassword,
      adminPassword,
    } = body;

    if (!adminPassword || !adminPassword.trim()) {
      return NextResponse.json(
        { error: "Admin confirmation password is required to save changes." },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: "Employee code (ID) is required to update details." },
        { status: 400 }
      );
    }

    const adminCode = adminUser.code.trim().toUpperCase();
    const client = await clientPromise;
    const db = client.db();

    // Verify Admin Password against MongoDB
    const adminRecord = await db.collection("employees").findOne({ code: adminCode });
    if (!adminRecord) {
      return NextResponse.json(
        { error: "Admin employee record not found." },
        { status: 401 }
      );
    }

    const isAdminPasswordValid = verifyPassword(
      adminPassword,
      adminRecord.passwordHash,
      adminRecord.code,
      adminRecord.name
    );

    if (!isAdminPasswordValid) {
      return NextResponse.json(
        { error: "Incorrect Admin Password. Authorization failed." },
        { status: 401 }
      );
    }

    const empCode = code.trim().toUpperCase();
    const existing = await db.collection("employees").findOne({ code: empCode });
    if (!existing) {
      return NextResponse.json(
        { error: `Employee '${empCode}' not found in database.` },
        { status: 404 }
      );
    }

    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name) updateFields.name = name.trim();
    if (unitId) updateFields.unitId = unitId;
    if (role) updateFields.role = role;
    if (typeof isPanelJudge === "boolean") updateFields.isPanelJudge = isPanelJudge;
    if (gender !== undefined) updateFields.gender = gender;
    if (designation !== undefined) updateFields.designation = designation;

    // Handle password update or reset to default
    if (newPassword && newPassword.trim()) {
      updateFields.passwordHash = hashPassword(newPassword.trim());
    } else if (resetPassword) {
      const targetName = name || existing.name;
      const defaultPlain = generateDefaultPassword(empCode, targetName);
      updateFields.passwordHash = hashPassword(defaultPlain);
    }

    await db.collection("employees").updateOne(
      { code: empCode },
      { $set: updateFields }
    );

    const updatedEmployee = await db.collection("employees").findOne({ code: empCode });
    return NextResponse.json({ ok: true, employee: updatedEmployee });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update employee details in MongoDB." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const adminPassword = searchParams.get("adminPassword");

    if (!code) {
      return NextResponse.json(
        { error: "Employee code is required to delete employee." },
        { status: 400 }
      );
    }

    if (!adminPassword || !adminPassword.trim()) {
      return NextResponse.json(
        { error: "Admin confirmation password is required to delete employee." },
        { status: 400 }
      );
    }

    const adminCode = adminUser.code.trim().toUpperCase();
    const client = await clientPromise;
    const db = client.db();

    // Verify Admin Password against MongoDB
    const adminRecord = await db.collection("employees").findOne({ code: adminCode });
    if (!adminRecord) {
      return NextResponse.json(
        { error: "Admin employee record not found." },
        { status: 401 }
      );
    }

    const isAdminPasswordValid = verifyPassword(
      adminPassword.trim(),
      adminRecord.passwordHash,
      adminRecord.code,
      adminRecord.name
    );

    if (!isAdminPasswordValid) {
      return NextResponse.json(
        { error: "Incorrect Admin Password. Authorization failed." },
        { status: 401 }
      );
    }

    const empCode = code.trim().toUpperCase();
    await db.collection("employees").deleteOne({ code: empCode });

    return NextResponse.json({ ok: true, message: `Employee ${empCode} deleted successfully.` });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete employee from MongoDB." },
      { status: 500 }
    );
  }
}
