import { NextResponse } from "next/server";
import getPool, { sql } from "@/lib/mssql";
import { Cycle } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pool = await getPool();
    const req = pool.request();

    const result = await req.query(`
      SELECT Month, DataJSON FROM dbo.Cycles
    `);

    const cycles: Record<string, { stage: string; announcedAt: string | null; judges: Array<{ id: string; name: string; code?: string }> }> = {};

    for (const row of result.recordset) {
      try {
        const cycleData: Cycle = JSON.parse(row.DataJSON);
        cycles[String(row.Month).trim()] = {
          stage: cycleData.stage || "nomination",
          announcedAt: cycleData.announcedAt || null,
          judges: cycleData.judges || [],
        };
      } catch (e) {
        /* ignore JSON parse errors */
      }
    }

    return NextResponse.json({ ok: true, cycles });
  } catch (error) {
    console.error("[GET /api/cycles]", error);
    return NextResponse.json(
      { error: "Failed to fetch cycles from SQL Server." },
      { status: 500 }
    );
  }
}
