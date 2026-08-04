"use client";

import React from "react";
import { Lock } from "lucide-react";
import { CATEGORIES, unitById } from "../lib/constants";
import { endorsedList } from "../lib/helpers";
import { Cycle } from "../lib/types";
import Card from "../components/Card";
import Label from "../components/Label";
import Pill from "../components/Pill";
import Empty from "../components/Empty";

export interface JudgeViewProps {
  cycle: Cycle;
  commit: (next: Cycle) => void;
  judgeId: string;
  locked: boolean;
}

export const JudgeView: React.FC<JudgeViewProps> = ({ cycle, commit, judgeId, locked }) => {
  const judge = cycle.judges.find((j) => j.id === judgeId);
  const pool = endorsedList(cycle);
  const open = cycle.stage === "judging" && !locked;

  const setScore = (nomId: string, raw: string) => {
    const v = raw === "" ? undefined : Math.max(0, Math.min(10, Number(raw)));
    const forNom = { ...(cycle.scores[nomId] || {}) };
    if (v === undefined || Number.isNaN(v)) delete forNom[judgeId];
    else forNom[judgeId] = v;
    commit({ ...cycle, scores: { ...cycle.scores, [nomId]: forNom } });
  };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <Label>Scoring as Panel Judge</Label>
            <p className="text-base font-semibold tracking-tight">
              {judge?.name || "Unnamed Panel Judge"}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {open ? (
              <Pill tone="good">Scoring Window OPEN (Controlled by Admin)</Pill>
            ) : (
              <Pill tone="warn">Scoring Window CLOSED by Admin</Pill>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-blue-900/60">
          Enter a score from 0–10 per nominee. <strong>Confidentiality Note:</strong> Overall panel average scores and full results are strictly restricted to Admin visibility.
        </p>
      </Card>

      {!open ? (
        <div className="flex items-center gap-2 rounded border border-amber-500/40 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 font-medium">
          <Lock size={14} className="shrink-0" />
          <span>Panel scoring is currently CLOSED by Admin. Input fields are disabled until Admin opens the Panel Scoring page.</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded border border-emerald-500/40 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 font-medium">
          <Pill tone="good">Active</Pill>
          <span>Panel scoring window is OPEN by Admin permission. Enter your scores below.</span>
        </div>
      )}

      {pool.length === 0 ? (
        <Empty
          title="No endorsed nominees yet"
          hint="Dossiers appear here once HODs have endorsed their candidates."
        />
      ) : (
        CATEGORIES.map((cat) => {
          const list = pool.filter((n) => n.category === cat.id);
          if (!list.length) return null;
          return (
            <div key={cat.id}>
              <h3 className="mb-2 text-sm font-semibold tracking-tight">
                {cat.name}
                <span className="ml-2 font-mono text-xs text-blue-900/45">
                  {list.length} nominee{list.length > 1 ? "s" : ""}
                </span>
              </h3>
              <div className="space-y-3">
                {list.map((n) => {
                  const mine = (cycle.scores[n.id] || {})[judgeId];
                  return (
                    <Card key={n.id} className="p-4">
                      <div className="flex flex-wrap items-start gap-4">
                        <div className="flex-1" style={{ minWidth: "240px" }}>
                          <div className="flex items-baseline gap-3">
                            <p className="font-medium">{n.name}</p>
                            <span className="font-mono text-xs text-blue-900/45">
                              {n.code}
                            </span>
                            <Pill>{unitById(n.unit)?.name}</Pill>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-blue-900/75">
                            {n.citation}
                          </p>
                          {n.evidence && (
                            <p className="mt-2 break-words font-mono text-xs text-blue-900/50">
                              Evidence: {n.evidence}
                            </p>
                          )}
                        </div>
                        <div className="w-28 shrink-0">
                          <Label>Your score</Label>
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step={0.5}
                            disabled={!open}
                            value={mine ?? ""}
                            onChange={(e) => setScore(n.id, e.target.value)}
                            className="w-full rounded border border-blue-900/20 bg-white px-3 py-2 text-center font-mono text-2xl tabular-nums outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20 disabled:bg-blue-900/5"
                          />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default JudgeView;
