"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Download, ChevronRight } from "lucide-react";
import { STAGES, PANEL_SIZE, POINTS, catById, unitById } from "../lib/constants";
import { results, endorsedList, panelScore } from "../lib/helpers";
import { saveBranding, savePoints } from "../lib/storage";
import { Cycle, PointsState, Branding } from "../lib/types";
import Card from "../components/Card";
import Label from "../components/Label";
import Button from "../components/Button";
import Pill from "../components/Pill";
import BrandMark from "../components/BrandMark";
import Empty from "../components/Empty";

const inputCls =
  "w-full rounded border border-blue-900/15 bg-white px-3 py-2 text-sm text-blue-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20";

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <Label>{label}</Label>
    {children}
  </label>
);

interface HodEmployee {
  code: string;
  name: string;
  unitId: string;
}

export interface HrViewProps {
  cycle: Cycle;
  commit: (next: Cycle) => void;
  points: PointsState;
  setPoints: React.Dispatch<React.SetStateAction<PointsState>>;
  monthLabel: string;
  brand: Branding;
  setBrand: React.Dispatch<React.SetStateAction<Branding>>;
}

export const HrView: React.FC<HrViewProps> = ({
  cycle,
  commit,
  points,
  setPoints,
  monthLabel,
  brand,
  setBrand,
}) => {
  const [logoDraft, setLogoDraft] = useState(brand.logoUrl || "");
  const [logoSaved, setLogoSaved] = useState(false);
  const [hods, setHods] = useState<HodEmployee[]>([]);

  useEffect(() => {
    async function fetchHods() {
      try {
        const res = await fetch("/api/employees?role=hod");
        if (res.ok) {
          const data = await res.json();
          setHods(data.employees || []);
        }
      } catch (e) {
        /* ignore */
      }
    }
    fetchHods();
  }, []);

  const saveLogo = async () => {
    const next = { ...brand, logoUrl: logoDraft.trim() };
    setBrand(next);
    setLogoSaved(false);
    try {
      await saveBranding(next);
      setLogoSaved(true);
    } catch (e) {
      setLogoSaved(false);
    }
  };

  const res = useMemo(() => results(cycle), [cycle]);
  const pool = endorsedList(cycle);
  const pending = cycle.nominations.filter((n) => n.validated === null).length;

  const setStage = (stage: string) => commit({ ...cycle, stage });

  const setJudge = (id: string, name: string) =>
    commit({
      ...cycle,
      judges: cycle.judges.map((j) => (j.id === id ? { ...j, name } : j)),
    });

  const validate = (id: string, ok: boolean) =>
    commit({
      ...cycle,
      nominations: cycle.nominations.map((n) =>
        n.id === id ? { ...n, validated: ok } : n
      ),
    });

  const announce = async () => {
    const winners = res
      .map((r) => r.ranked[0])
      .filter((w) => w && w.count === PANEL_SIZE);
    const next = { ...points };
    winners.forEach((w) => {
      const k = w.nom.code;
      next[k] = next[k] || {
        name: w.nom.name,
        unit: w.nom.unit,
        points: 0,
        wins: [],
      };
      next[k].points += POINTS;
      next[k].wins.push({ month: cycle.month, category: w.nom.category });
    });
    setPoints(next);
    try {
      await savePoints(next);
    } catch (e) {
      /* surfaced by the cycle write below if storage is down */
    }
    commit({
      ...cycle,
      stage: "announced",
      announcedAt: new Date().toISOString(),
    });
  };

  const exportCsv = () => {
    const rows: string[][] = [
      [
        "Month",
        "Category",
        "Slot",
        "Employee",
        "Code",
        "Department",
        "Judge 1",
        "Judge 2",
        "Judge 3",
        "Panel average",
        "Result",
      ],
    ];
    res.forEach((r) =>
      r.ranked.forEach((x, i) => {
        const s = cycle.scores[x.nom.id] || {};
        rows.push([
          cycle.month,
          r.category.name,
          r.slotLabel || "",
          x.nom.name,
          x.nom.code,
          unitById(x.nom.unit)?.name || x.nom.unit,
          String(s.j1 ?? ""),
          String(s.j2 ?? ""),
          String(s.j3 ?? ""),
          x.avg === null ? "" : x.avg.toFixed(2),
          i === 0 && x.avg !== null ? "Winner" : "",
        ]);
      })
    );
    const csv = rows
      .map((r) => r.map((c) => `"${String(c ?? "")}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `RR-${cycle.month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Cycle control */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <Label>Cycle stage</Label>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStage(s.id)}
                  disabled={s.id === "announced"}
                  className={`rounded px-3 py-1.5 text-xs font-semibold transition ${
                    cycle.stage === s.id
                      ? "bg-blue-800 text-white"
                      : "border border-blue-900/15 text-blue-900/60 hover:border-blue-800 disabled:opacity-40"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-end gap-3">
            <Button tone="quiet" onClick={exportCsv}>
              <Download size={13} /> Export CSV
            </Button>
            <Button
              onClick={announce}
              disabled={cycle.stage === "announced" || pool.length === 0}
            >
              Declare winners <ChevronRight size={13} />
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          {[
            ["Nominations", cycle.nominations.length],
            ["Endorsed", pool.length],
            ["Awaiting validation", pending],
            [
              "Scores in",
              pool.reduce((a, n) => a + panelScore(cycle, n.id).count, 0) +
                "/" +
                pool.length * PANEL_SIZE,
            ],
          ].map(([k, v]) => (
            <div key={k as string} className="rounded bg-blue-900/5 px-3 py-2.5">
              <Label>{k as string}</Label>
              <p className="font-mono text-xl tabular-nums">{v}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Branding */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold tracking-tight">Header logo</h3>
        <p className="mt-1 text-xs text-blue-900/60">
          Paste a direct link to the official MAHLE logo file (PNG or SVG) and
          it replaces the wordmark for everyone using this app.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex-1" style={{ minWidth: "260px" }}>
            <Field label="Logo image URL">
              <input
                className={inputCls}
                placeholder="https://intranet.mafs.in/brand/mahle-logo.png"
                value={logoDraft}
                onChange={(e) => {
                  setLogoDraft(e.target.value);
                  setLogoSaved(false);
                }}
              />
            </Field>
          </div>
          <Button onClick={saveLogo}>Save logo</Button>
          {logoSaved && <Pill tone="good">Saved</Pill>}
        </div>
        <div className="mt-4 flex items-center gap-3 rounded p-3" style={{ backgroundColor: "#0A2540" }}>
          <BrandMark url={brand.logoUrl} />
          <span className="text-xs text-white/60">Preview</span>
        </div>
      </Card>

      {/* Panel (HOD Selection Only) */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold tracking-tight">
          Judging panel for {monthLabel}
        </h3>
        <p className="mt-1 text-xs text-blue-900/60">
          Only HODs can be assigned to the judging panel. Three HOD judges, assigned every month to keep scoring neutral.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {cycle.judges.map((j, i) => (
            <Field key={j.id} label={`Judge ${i + 1} (HOD Only)`}>
              <select
                className={inputCls}
                value={j.name}
                onChange={(e) => setJudge(j.id, e.target.value)}
              >
                <option value="">Select Registered HOD</option>
                {hods.map((h) => {
                  const labelName = `${h.name} (${unitById(h.unitId)?.name || h.unitId})`;
                  return (
                    <option key={h.code} value={labelName}>
                      {labelName}
                    </option>
                  );
                })}
              </select>
            </Field>
          ))}
        </div>
      </Card>

      {/* Validation */}
      <div>
        <h3 className="mb-2 text-sm font-semibold tracking-tight">
          Validation — citation and evidence complete?
        </h3>
        {cycle.nominations.length === 0 ? (
          <Empty
            title="Nothing to validate yet"
            hint="Entries land here as employees submit them."
          />
        ) : (
          <div className="space-y-2">
            {cycle.nominations.map((n) => (
              <Card
                key={n.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
              >
                <div className="flex-1" style={{ minWidth: "200px" }}>
                  <p className="text-sm font-medium">
                    {n.name}{" "}
                    <span className="font-mono text-xs text-blue-900/45">
                      {n.code}
                    </span>
                  </p>
                  <p className="text-xs text-blue-900/60">
                    {unitById(n.unit)?.name} · {catById(n.category)?.name}
                    {n.evidence ? "" : " · no evidence attached"}
                  </p>
                </div>
                {n.validated === true && <Pill tone="good">Cleared</Pill>}
                {n.validated === false && <Pill tone="warn">Sent back</Pill>}
                <div className="flex gap-2">
                  <Button tone="quiet" onClick={() => validate(n.id, true)}>
                    Clear
                  </Button>
                  <Button tone="danger" onClick={() => validate(n.id, false)}>
                    Send back
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Standings */}
      <div>
        <h3 className="mb-2 text-sm font-semibold tracking-tight">
          {cycle.stage === "announced" ? "Winners" : "Live standings"}
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {res.map((r) => (
            <Card key={r.category.id + (r.slotLabel || "")} className="p-4">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold">{r.category.name}</h4>
                {r.slotLabel && <Pill>{r.slotLabel}</Pill>}
              </div>
              {r.ranked.length === 0 ? (
                <p className="mt-3 text-xs text-blue-900/50">
                  No endorsed nominee.
                </p>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {r.ranked.map((x, i) => (
                    <li
                      key={x.nom.id}
                      className="flex items-center gap-3 border-t border-blue-900/10 pt-1.5 first:border-0 first:pt-0"
                    >
                      <span className="font-mono text-xs text-blue-900/35">
                        {i + 1}
                      </span>
                      <span className="flex-1 text-sm">
                        {x.nom.name}
                        <span className="ml-2 text-xs text-blue-900/50">
                          {unitById(x.nom.unit)?.name}
                        </span>
                      </span>
                      {i === 0 && x.avg !== null && cycle.stage === "announced" && (
                        <Pill tone="gold">Winner</Pill>
                      )}
                      <span className="font-mono text-sm tabular-nums">
                        {x.avg === null ? "—" : x.avg.toFixed(2)}
                      </span>
                      <span className="font-mono text-xs text-blue-900/40">
                        {x.count}/{PANEL_SIZE}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Points ledger */}
      <div>
        <h3 className="mb-2 text-sm font-semibold tracking-tight">
          Annual points ledger
          <span className="ml-2 text-xs font-normal text-blue-900/55">
            feeds 50% of the LSIP awards
          </span>
        </h3>
        {Object.keys(points).length === 0 ? (
          <Empty
            title="No points logged yet"
            hint="Declaring winners writes 10 points each into this ledger."
          />
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-blue-900/5 text-xs uppercase tracking-widest text-blue-900/60">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Employee</th>
                  <th className="px-4 py-2 text-left font-semibold">Code</th>
                  <th className="px-4 py-2 text-left font-semibold">Department</th>
                  <th className="px-4 py-2 text-left font-semibold">Wins</th>
                  <th className="px-4 py-2 text-right font-semibold">Points</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(points)
                  .sort((a, b) => b[1].points - a[1].points)
                  .map(([code, p]) => (
                    <tr key={code} className="border-t border-blue-900/10">
                      <td className="px-4 py-2">{p.name}</td>
                      <td className="px-4 py-2 font-mono text-xs">{code}</td>
                      <td className="px-4 py-2 text-xs">
                        {unitById(p.unit)?.name}
                      </td>
                      <td className="px-4 py-2 text-xs text-blue-900/70">
                        {p.wins
                          .map((w) => `${catById(w.category)?.name} (${w.month})`)
                          .join(", ")}
                      </td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums">
                        {p.points}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
};

export default HrView;
