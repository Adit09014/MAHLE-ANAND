import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { Cycle } from "@/lib/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ month: string }> }
) {
  try {
    const { month } = await params;
    const client = await clientPromise;
    const db = client.db();
    const cycle = await db.collection("cycles").findOne({ month });

    if (!cycle) {
      return NextResponse.json({ found: false });
    }

    const { _id, ...cycleData } = cycle;
    return NextResponse.json({ found: true, cycle: cycleData });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch cycle from MongoDB." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ month: string }> }
) {
  try {
    const { month } = await params;
    const body: Cycle = await request.json();
    const client = await clientPromise;
    const db = client.db();

    await db.collection("cycles").updateOne(
      { month },
      { $set: { ...body, updatedAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save cycle to MongoDB." },
      { status: 500 }
    );
  }
}
