import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { judgeCodes } = body; // Array of employee codes assigned as panel judges

    if (!Array.isArray(judgeCodes)) {
      return NextResponse.json({ error: "judgeCodes must be an array." }, { status: 400 });
    }

    if (judgeCodes.length > 3) {
      return NextResponse.json({ error: "Maximum 3 panel judges allowed." }, { status: 400 });
    }

    const cleanCodes = judgeCodes.map((c: string) => String(c).trim().toUpperCase()).filter(Boolean);

    const client = await clientPromise;
    const db = client.db();

    // Reset all employees isPanelJudge to false
    await db.collection("employees").updateMany({}, { $set: { isPanelJudge: false } });

    // Set isPanelJudge to true for assigned codes
    if (cleanCodes.length > 0) {
      await db.collection("employees").updateMany(
        { code: { $in: cleanCodes } },
        { $set: { isPanelJudge: true } }
      );
    }

    return NextResponse.json({ ok: true, activePanelJudgeCodes: cleanCodes });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update panel judges in MongoDB." },
      { status: 500 }
    );
  }
}
