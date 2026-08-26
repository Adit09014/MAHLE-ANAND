import { NextResponse } from "next/server";
import getPool, { sql } from "@/lib/mssql";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { judges } = body; // Array of judge objects [{ id, code, name }]

    if (!Array.isArray(judges)) {
      return NextResponse.json({ error: "judges must be an array." }, { status: 400 });
    }

    const judgeCodes = judges
      .map((j: { code?: string }) => String(j.code || "").trim().toUpperCase())
      .filter(Boolean);

    const pool = await getPool();

    // 1. Reset IsPanelJudge to 0 for all rows
    const resetReq = pool.request();
    await resetReq.query(`UPDATE dbo.EmpRoles SET IsPanelJudge = 0`);

    // 2. Set IsPanelJudge to 1 for selected judge codes
    for (const code of judgeCodes) {
      const upsertReq = pool.request();
      upsertReq.input("emp_no", sql.NVarChar, code);
      await upsertReq.query(`
        MERGE dbo.EmpRoles AS target
        USING (VALUES (@emp_no, 1)) AS source (Emp_No, IsPanelJudge)
        ON target.Emp_No = source.Emp_No
        WHEN MATCHED THEN
          UPDATE SET IsPanelJudge = source.IsPanelJudge, UpdatedAt = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (Emp_No, Role, IsPanelJudge) VALUES (source.Emp_No, 'employee', source.IsPanelJudge);
      `);
    }

    return NextResponse.json({ ok: true, activePanelJudgeCodes: judgeCodes });
  } catch (error) {
    console.error("[PUT /api/employees/panel]", error);
    return NextResponse.json(
      { error: "Failed to update panel judges in SQL Server." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return PUT(request);
}
