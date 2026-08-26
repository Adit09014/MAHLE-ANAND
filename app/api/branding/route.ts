import { NextResponse } from "next/server";
import getPool, { sql } from "@/lib/mssql";
import { Branding } from "@/lib/types";

export async function GET() {
  try {
    const pool = await getPool();
    const req = pool.request();
    req.input("keyName", sql.NVarChar, "header_logo");

    const result = await req.query(`
      SELECT LogoUrl FROM dbo.Branding WHERE KeyName = @keyName
    `);

    if (!result.recordset.length) {
      return NextResponse.json({ logoUrl: "" });
    }

    return NextResponse.json({ logoUrl: result.recordset[0].LogoUrl || "" });
  } catch (error) {
    console.error("[GET /api/branding]", error);
    return NextResponse.json(
      { error: "Failed to fetch branding from SQL Server." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const branding: Branding = await request.json();
    const pool = await getPool();
    const req = pool.request();

    req.input("keyName", sql.NVarChar, "header_logo");
    req.input("logoUrl", sql.NVarChar(sql.MAX), branding.logoUrl || "");

    await req.query(`
      MERGE dbo.Branding AS target
      USING (VALUES (@keyName, @logoUrl)) AS source (KeyName, LogoUrl)
      ON target.KeyName = source.KeyName
      WHEN MATCHED THEN
        UPDATE SET LogoUrl = source.LogoUrl, UpdatedAt = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (KeyName, LogoUrl) VALUES (source.KeyName, source.LogoUrl);
    `);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/branding]", error);
    return NextResponse.json(
      { error: "Failed to save branding to SQL Server." },
      { status: 500 }
    );
  }
}
