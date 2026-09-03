"use client";

import React, { useMemo } from "react";
import { Trophy, Award, Lock, Sparkles, CheckCircle2, Calendar } from "lucide-react";
import { catById, unitById, POINTS } from "../lib/constants";
import { results } from "../lib/helpers";
import { Cycle } from "../lib/types";
import Card from "../components/Card";
import Label from "../components/Label";
import Pill from "../components/Pill";
import Empty from "../components/Empty";

export interface ResultsViewProps {
  cycle: Cycle;
  month?: string;
  setMonth?: (m: string) => void;
  monthOptions?: { value: string; label: string }[];
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  cycle,
  month,
  setMonth,
  monthOptions,
}) => {
  const isDeclared = cycle.stage === "announced";
  const res = useMemo(() => results(cycle), [cycle]);

  const monthLabel = new Date(`${cycle.month}-01T00:00:00`).toLocaleDateString(
    "en-IN",
    { month: "long", year: "numeric" }
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-900/10 text-blue-900">
              <Trophy size={24} className="text-amber-500" />
            </div>
            <div>
              <Label>Rewards &amp; Recognition Results</Label>
              <h2 className="text-lg font-bold tracking-tight text-blue-950">
                Official Monthly Winners — {monthLabel}
              </h2>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {monthOptions && setMonth && (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-xs">
                <Calendar size={14} className="text-slate-400 shrink-0" />
                <select
                  value={month || cycle.month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-blue-950 outline-none cursor-pointer"
                >
                  {monthOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              {isDeclared ? (
                <Pill tone="good">
                  <CheckCircle2 size={12} className="mr-1 inline" /> Results Published by Admin
                </Pill>
              ) : (
                <Pill tone="warn">
                  <Lock size={12} className="mr-1 inline" /> Result Pending Admin Declaration
                </Pill>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Closed State: Result Yet to Be Declared */}
      {!isDeclared ? (
        <Card className="p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Lock size={28} />
          </div>
          <h3 className="mt-4 text-lg font-bold text-blue-950">
            Result Yet to Be Declared
          </h3>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-blue-900/60">
            The monthly Rewards &amp; Recognition results for <strong>{monthLabel}</strong> are currently closed and pending evaluation &amp; declaration by Admin. Please check back once Admin publishes the official winners.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-xs font-semibold text-amber-900">
            <Sparkles size={14} className="text-amber-600" /> Standby for Official Announcement
          </div>
        </Card>
      ) : (
        /* Opened State: Winners Showcase */
        <div className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            {res.map((r, i) => {
              const winner = r.ranked[0]; // Top scored candidate
              const catName = r.slotLabel
                ? `${r.category.name} (${r.slotLabel})`
                : r.category.name;

              return (
                <Card
                  key={`${r.category.id}-${r.slotLabel || i}`}
                  className="relative overflow-hidden p-5 shadow-sm border border-blue-900/10"
                >
                  <div className="mb-3 flex items-center justify-between border-b border-blue-900/10 pb-3">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-900/50">
                        Award Category
                      </span>
                      <h3 className="text-base font-bold text-blue-950">
                        {catName}
                      </h3>
                    </div>
                    <Award size={22} className="text-amber-500 shrink-0" />
                  </div>

                  {winner && winner.nom ? (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-extrabold text-blue-950">
                            {winner.nom.name}
                          </p>
                          <p className="text-xs font-medium text-blue-900/60">
                            Code: <span className="font-mono">{winner.nom.code}</span> · {unitById(winner.nom.unit)?.name || winner.nom.unit}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                          🏆 Winner
                        </span>
                      </div>

                      <p className="rounded bg-blue-900/5 p-3 text-xs leading-relaxed text-blue-900/80 italic">
                        &ldquo;{winner.nom.citation}&rdquo;
                      </p>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-blue-900/50">
                      No winner declared for this slot in current cycle.
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsView;
