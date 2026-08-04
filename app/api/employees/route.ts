import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

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
    const { code, name, unitId, gender, designation, role, email } = body;

    if (!code || !name || !unitId) {
      return NextResponse.json(
        { error: "Employee code, name, and department/plant unit are required." },
        { status: 400 }
      );
    }

    const empCode = code.trim().toUpperCase();
    const client = await clientPromise;
    const db = client.db();

    const employee = {
      code: empCode,
      name: name.trim(),
      unitId,
      gender: gender || "",
      designation: designation || "Staff Member",
      role: role || "employee",
      email: email ? email.trim() : `${empCode.toLowerCase()}@mahle.com`,
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
