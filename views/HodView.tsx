"use client";

import React from "react";
import { Lock } from "lucide-react";
import { unitById, CATEGORIES, MAX_CATEGORIES_PER_UNIT, STAGES } from "../lib/constants";
import { Cycle, Nomination } from "../lib/types";
import Card from "../components/Card";
import Label from "../components/Label";
import Button from "../components/Button";
import Pill from "../components/Pill";
import Empty from "../components/Empty";

export interface HodViewProps {
  cycle: Cycle;
  commit: (next: Cycle) => void;
  unitId: string;
  locked: boolean;
}

export const HodView: React.FC<HodViewProps> = ({ cycle, commit, unitId, locked }) => {
  const unit = unitById(unitId);
  const mine = cycle.nominations.filter((n) => n.unit === unitId);
  const picks = cycle.endorsed[unitId] || {};
  const usedCats = Object.keys(picks).filter((c) => picks[c]);
  const open = ["nomination", "validation"].includes(cycle.stage) && !locked;

  const toggle = (nom: Nomination) => {
    const next = { ...picks };
    if (next[nom.category] === nom.id) {
      delete next[nom.category];
    } else {
      if (!next[nom.category] && usedCats.length >= MAX_CATEGORIES_PER_UNIT)
        return;
      next[nom.category] = nom.id;
    }
    commit({
      ...cycle,
      endorsed: { ...cycle.endorsed, [unitId]: next },
    });
  };

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center gap-x-6 gap-y-3 p-5">
        <div>
          <Label>Endorsing as HOD</Label>
          <p className="text-base font-semibold tracking-tight">
            {unit ? (unit.kind === "Plant" ? `${unit.name} plant` : unit.name) : unitId}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-6">
          <div>
            <Label>Categories used</Label>
            <p className="font-mono text-2xl leading-none tabular-nums">
              {usedCats.length}
              <span className="text-base text-blue-900/35">
                /{MAX_CATEGORIES_PER_UNIT}
              </span>
            </p>
          </div>
          <div>
            <Label>Nominations received</Label>
            <p className="font-mono text-2xl leading-none tabular-nums">
              {mine.length}
            </p>
          </div>
        </div>
      </Card>

      {!open && (
        <div className="flex items-center gap-2 rounded border border-blue-900/15 bg-white px-3 py-2 text-xs">
          <Lock size={13} /> Endorsement is closed — the cycle has moved to{" "}
          {STAGES.find((s) => s.id === cycle.stage)?.label || cycle.stage}.
        </div>
      )}

      {CATEGORIES.map((cat) => {
        const pool = mine.filter((n) => n.category === cat.id);
        if (!pool.length) return null;
        const chosen = picks[cat.id];
        const blocked = !chosen && usedCats.length >= MAX_CATEGORIES_PER_UNIT;
        return (
          <div key={cat.id}>
            <div className="mb-2 flex items-center gap-3">
              <h3 className="text-sm font-semibold tracking-tight">
                {cat.name}
              </h3>
              {chosen && <Pill tone="good">Endorsed</Pill>}
              {blocked && <Pill tone="warn">Category limit reached</Pill>}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {pool.map((n) => {
                const isPick = chosen === n.id;
                return (
                  <Card
                    key={n.id}
                    className={`p-4 ${isPick ? "ring-2 ring-blue-700" : ""}`}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-medium">{n.name}</p>
                      <span className="font-mono text-xs text-blue-900/45">
                        {n.code}
                      </span>
                    </div>
                    {n.gender && (
                      <p className="mt-1 text-xs text-blue-900/55">
                        Declared under: {n.gender}
                      </p>
                    )}
                    <p className="mt-2 text-xs leading-relaxed text-blue-900/75">
                      {n.citation}
                    </p>
                    {n.evidence && (
                      <p className="mt-2 break-words font-mono text-xs text-blue-900/50">
                        {n.evidence}
                      </p>
                    )}
                    <div className="mt-3">
                      <Button
                        tone={isPick ? "danger" : "solid"}
                        onClick={() => toggle(n)}
                        disabled={!open || (blocked && !isPick)}
                      >
                        {isPick ? "Withdraw endorsement" : "Endorse"}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {mine.length === 0 && (
        <Empty
          title={`No one from ${unit?.name || unitId} has nominated yet`}
          hint="Nudge the team — the window closes on the 7th."
        />
      )}
    </div>
  );
};

export default HodView;
