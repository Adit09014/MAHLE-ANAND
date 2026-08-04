import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { Branding } from "@/lib/types";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const doc = await db.collection("branding").findOne({ key: "header_logo" });

    if (!doc) {
      return NextResponse.json({ logoUrl: "" });
    }

    return NextResponse.json({ logoUrl: doc.logoUrl || "" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch branding from MongoDB." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const branding: Branding = await request.json();
    const client = await clientPromise;
    const db = client.db();

    await db.collection("branding").updateOne(
      { key: "header_logo" },
      { $set: { logoUrl: branding.logoUrl, updatedAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save branding to MongoDB." },
      { status: 500 }
    );
  }
}
