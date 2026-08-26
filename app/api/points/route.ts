import { NextResponse } from "next/server";
import getPool, { sql } from "@/lib/mssql";
import { PointsState } from "@/lib/types";

export async function GET() {
  try {
    const pool = await getPool();
    const req = pool.request();
    req.input("keyName", sql.NVarChar, "annual_ledger");

    const result = await req.query(`
      SELECT DataJSON FROM dbo.Points WHERE KeyName = @keyName
    `);

    if (!result.recordset.length) {
      return NextResponse.json({ points: {} });
    }

    const points: PointsState = JSON.parse(result.recordset[0].DataJSON || "{}");
    return NextResponse.json({ points });
  } catch (error) {
    console.error("[GET /api/points]", error);
    return NextResponse.json(
      { error: "Failed to fetch points from SQL Server." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const points: PointsState = await request.json();
    const pool = await getPool();
    const req = pool.request();

    req.input("keyName", sql.NVarChar, "annual_ledger");
    req.input("dataJson", sql.NVarChar(sql.MAX), JSON.stringify(points));

    await req.query(`
      MERGE dbo.Points AS target
      USING (VALUES (@keyName, @dataJson)) AS source (KeyName, DataJSON)
      ON target.KeyName = source.KeyName
      WHEN MATCHED THEN
        UPDATE SET DataJSON = source.DataJSON, UpdatedAt = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (KeyName, DataJSON) VALUES (source.KeyName, source.DataJSON);
    `);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/points]", error);
    return NextResponse.json(
      { error: "Failed to save points to SQL Server." },
      { status: 500 }
    );
  }
}
