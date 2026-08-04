import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { PointsState } from "@/lib/types";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const doc = await db.collection("points").findOne({ key: "annual_ledger" });

    if (!doc) {
      return NextResponse.json({ points: {} });
    }

    return NextResponse.json({ points: doc.points || {} });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch points from MongoDB." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const points: PointsState = await request.json();
    const client = await clientPromise;
    const db = client.db();

    await db.collection("points").updateOne(
      { key: "annual_ledger" },
      { $set: { points, updatedAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save points to MongoDB." },
      { status: 500 }
    );
  }
}
