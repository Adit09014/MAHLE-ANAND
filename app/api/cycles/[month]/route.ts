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

    // 1. Fetch existing cycle data from SSMS to prevent overwriting concurrent updates
    const fetchReq = pool.request();
    fetchReq.input("month", sql.NVarChar, month);
    const existingRes = await fetchReq.query(`
      SELECT DataJSON FROM dbo.Cycles WHERE Month = @month
    `);

    let existing: Partial<Cycle> = {};
    if (existingRes.recordset.length) {
      try {
        existing = JSON.parse(existingRes.recordset[0].DataJSON);
      } catch {
        /* ignore parse error */
      }
    }

    // 2. Perform deep merge of cycle properties
    // ENDORSED: Per-unit authoritative merge.
    // For units the incoming payload explicitly mentions → incoming is authoritative (replace).
    // For units only in DB (not mentioned in incoming) → preserve DB values.
    const mergedEndorsed: Record<string, Record<string, string>> = {};

    // Start with all existing DB endorsements
    Object.keys(existing.endorsed || {}).forEach((uId) => {
      mergedEndorsed[uId] = { ...((existing.endorsed as any)[uId] || {}) };
    });

    // For units explicitly in the incoming body, REPLACE with incoming
    Object.keys(body.endorsed || {}).forEach((uId) => {
      const inPicks = { ...((body.endorsed as any)[uId] || {}) };
      // Clean up empty-string withdrawal signals
      Object.keys(inPicks).forEach((cat) => {
        if (!inPicks[cat]) delete inPicks[cat];
      });
      if (Object.keys(inPicks).length > 0) {
        mergedEndorsed[uId] = inPicks;
      } else {
        // All categories withdrawn for this unit
        delete mergedEndorsed[uId];
      }
    });

    // Preserve nominations list by ID without letting stale client state revert updated fields (like unit)
    const nomMap = new Map<string, any>();
    (body.nominations || []).forEach((n: any) => nomMap.set(n.id, n));
    (existing.nominations || []).forEach((n: any) => {
      const incomingNom = nomMap.get(n.id);
      if (incomingNom) {
        nomMap.set(n.id, {
          ...incomingNom,
          ...n,
          unit: n.unit && n.unit !== "hr" ? n.unit : incomingNom.unit || n.unit,
        });
      } else {
        nomMap.set(n.id, n);
      }
    });
    const mergedNominations = Array.from(nomMap.values());

    // Preserve scores by nomination ID and judge ID, process -1 as a deletion signal
    const mergedScores: Record<string, Record<string, number>> = {
      ...(existing.scores || {}),
    };
    if (body.scores) {
      Object.keys(body.scores).forEach((nomId) => {
        const incoming = body.scores[nomId] || {};
        const existPicks = mergedScores[nomId] || {};
        const combined = { ...existPicks, ...incoming };

        Object.keys(combined).forEach((jId) => {
          if (combined[jId] === -1) {
            delete combined[jId];
          }
        });

        if (Object.keys(combined).length > 0) {
          mergedScores[nomId] = combined;
        } else {
          delete mergedScores[nomId];
        }
      });
    }

    // Merge timeline phases
    const mergedTimeline = {
      nomination: {
        ...(existing.timeline?.nomination || {}),
        ...(body.timeline?.nomination || {}),
      },
      hodEndorsement: {
        ...(existing.timeline?.hodEndorsement || {}),
        ...(body.timeline?.hodEndorsement || {}),
      },
      panelScoring: {
        ...(existing.timeline?.panelScoring || {}),
        ...(body.timeline?.panelScoring || {}),
      },
    };

    const finalCycle: Cycle = {
      month,
      stage: body.stage || existing.stage || "nomination",
      judges: body.judges || existing.judges || [
        { id: "j1", name: "" },
        { id: "j2", name: "" },
        { id: "j3", name: "" },
      ],
      nominations: mergedNominations,
      endorsed: mergedEndorsed,
      scores: mergedScores,
      announcedAt: body.announcedAt !== undefined ? body.announcedAt : (existing.announcedAt ?? null),
      timeline: mergedTimeline as any,
    };

    // 3. Save merged cycle to SSMS
    const saveReq = pool.request();
    saveReq.input("month", sql.NVarChar, month);
    saveReq.input("dataJson", sql.NVarChar(sql.MAX), JSON.stringify(finalCycle));

    await saveReq.query(`
      MERGE dbo.Cycles AS target
      USING (VALUES (@month, @dataJson)) AS source (Month, DataJSON)
      ON target.Month = source.Month
      WHEN MATCHED THEN
        UPDATE SET DataJSON = source.DataJSON, UpdatedAt = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (Month, DataJSON) VALUES (source.Month, source.DataJSON);
    `);

    return NextResponse.json({ ok: true, cycle: finalCycle });
  } catch (error) {
    console.error("[POST /api/cycles/[month]]", error);
    return NextResponse.json(
      { error: "Failed to save cycle to SQL Server." },
      { status: 500 }
    );
  }
}
