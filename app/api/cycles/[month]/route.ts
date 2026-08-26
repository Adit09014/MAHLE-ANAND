import { NextResponse } from "next/server";
import getPool, { sql } from "@/lib/mssql";
import { Cycle } from "@/lib/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ month: string }> }
) {
  try {
    const { month } = await params;
    const pool = await getPool();
    const req = pool.request();
    req.input("month", sql.NVarChar, month);

    const result = await req.query(`
      SELECT DataJSON FROM dbo.Cycles WHERE Month = @month
    `);

    if (!result.recordset.length) {
      return NextResponse.json({ found: false });
    }

    const cycleData: Cycle = JSON.parse(result.recordset[0].DataJSON);
    return NextResponse.json({ found: true, cycle: cycleData });
  } catch (error) {
    console.error("[GET /api/cycles/[month]]", error);
    return NextResponse.json(
      { error: "Failed to fetch cycle from SQL Server." },
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
    const pool = await getPool();
    const req = pool.request();

    req.input("month", sql.NVarChar, month);
    req.input("dataJson", sql.NVarChar(sql.MAX), JSON.stringify(body));

    await req.query(`
      MERGE dbo.Cycles AS target
      USING (VALUES (@month, @dataJson)) AS source (Month, DataJSON)
      ON target.Month = source.Month
      WHEN MATCHED THEN
        UPDATE SET DataJSON = source.DataJSON, UpdatedAt = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (Month, DataJSON) VALUES (source.Month, source.DataJSON);
    `);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/cycles/[month]]", error);
    return NextResponse.json(
      { error: "Failed to save cycle to SQL Server." },
      { status: 500 }
    );
  }
}
