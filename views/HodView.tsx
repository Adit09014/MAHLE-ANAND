"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Lock, Clock, Calendar, CheckCircle2, ShieldCheck, Eye } from "lucide-react";
import { unitById, CATEGORIES, getMaxCategoriesForUnit, STAGES } from "../lib/constants";
import { Cycle, Nomination } from "../lib/types";
import { getCycleTimeline, getEffectiveEndDate, formatDatePretty } from "../lib/helpers";
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
  readOnly?: boolean;
  month?: string;
  setMonth?: (m: string) => void;
  monthOptions?: { value: string; label: string }[];
}

export const HodView: React.FC<HodViewProps> = ({ 
  cycle, 
  commit, 
  unitId, 
  locked, 
  readOnly = false,
  month,
  setMonth,
  monthOptions
}) => {
  const [allEmployees, setAllEmployees] = useState<Array<{ code: string; name: string; unitId: string }>>([]);

  useEffect(() => {
    async function fetchEmps() {
      try {
        const res = await fetch("/api/employees");
        if (res.ok) {
          const data = await res.json();
          setAllEmployees(data.employees || []);
        }
      } catch (e) {
        /* ignore */
      }
    }
    fetchEmps();
  }, []);

  const unit = unitById(unitId);

  const mine = useMemo(() => {
    const targetUnit = (unitId || "").trim().toLowerCase();
    return (cycle.nominations || []).filter((n) => {
      // 1. Explicitly Routed via Location / Target HOD (New System)
      if (n.location) {
        if (n.location === "Head Office(H.O)") {
          // Route exclusively to the Target HOD chosen by the employee
          if (n.targetHod) {
            const hodEmp = allEmployees.find(e => e.code === n.targetHod);
            if (hodEmp && hodEmp.unitId && hodEmp.unitId.trim().toLowerCase() === targetUnit) {
              return true;
            }
          }
        } else {
          // Route exclusively to the Location HOD (e.g., PUNE, CHENNAI)
          if (n.location.trim().toLowerCase() === targetUnit) {
            return true;
          }
        }
      } else {
        // 2. Fallback for Legacy Nominations (Old System: Employee Department Routing)
        const emp = allEmployees.find((e) => e.code.toUpperCase() === (n.code || "").toUpperCase());
        if (emp && emp.unitId && emp.unitId.trim().toLowerCase() === targetUnit) {
          return true;
        }
        if (emp && emp.name && n.name && emp.name.trim().toLowerCase() === n.name.trim().toLowerCase()) {
          if (emp.unitId && emp.unitId.trim().toLowerCase() === targetUnit) {
            return true;
          }
        }
      }

      // 3. Direct match on nomination's stored unit (Used for saved endorsements)
      const nomUnit = (n.unit || "").trim().toLowerCase();
      if (nomUnit && nomUnit === targetUnit) return true;

      // 4. Guaranteed inclusion: if this nomination is endorsed for this unit
      const matchedEndorsedKey = Object.keys(cycle.endorsed || {}).find(
        (k) => k.trim().toLowerCase() === targetUnit
      ) || unitId;
      const unitPicks = (cycle.endorsed || {})[matchedEndorsedKey] || {};
      if (Object.values(unitPicks).includes(n.id)) {
        return true;
      }

      return false;
    });
  }, [cycle.nominations, cycle.endorsed, unitId, allEmployees]);
  const matchedKey = Object.keys(cycle.endorsed || {}).find(
    (k) => k.trim().toLowerCase() === (unitId || "").trim().toLowerCase()
  ) || unitId;
  const picks = (cycle.endorsed || {})[matchedKey] || {};
  const usedCats = Object.keys(picks).filter((c) => picks[c]);
  const maxCategories = getMaxCategoriesForUnit(unitId);
  const timeline = getCycleTimeline(cycle);
  const hodPhase = timeline.hodEndorsement;
  const effectiveEnd = getEffectiveEndDate(hodPhase);
  const open = cycle.stage === "validation" && !locked;

  const toggle = (nom: Nomination) => {
    if (readOnly) return;
    const next = { ...picks };
    if (next[nom.category] === nom.id) {
      next[nom.category] = ""; // Explicit withdrawal signal for server merge
    } else {
      if (!next[nom.category] && usedCats.length >= maxCategories)
        return;
      next[nom.category] = nom.id; // Enforces 1 employee per category
    }
    const nextNoms = (cycle.nominations || []).map((n) =>
      n.id === nom.id ? { ...n, unit: unitId } : n
    );
    commit({
      ...cycle,
      nominations: nextNoms,
      endorsed: { ...(cycle.endorsed || {}), [unitId]: next },
    });
  };

  return (
    <div className="space-y-5">
      {/* Read-Only Notice Banner for HR Admin */}
      {readOnly && (
        <div className="flex items-center gap-2.5 rounded-xl border border-sky-200 bg-sky-50 p-3.5 text-xs text-sky-950 font-semibold shadow-2xs">
          <Eye size={17} className="text-sky-700 shrink-0" />
          <span>
            <strong>Read-Only Mode (HR Admin):</strong> You are inspecting HOD endorsements for {unit?.name || unitId}. Endorsements and withdrawals can only be performed by the designated Head of Department.
          </span>
        </div>
      )}

      {month && setMonth && monthOptions && (
        <Card className="flex flex-col sm:flex-row gap-5 p-5 border border-blue-900/10 shadow-xs bg-white items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Select Viewing Month:
            </span>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-xl border border-blue-900/15 bg-white px-3 py-1.5 text-xs font-semibold text-blue-950 outline-none focus:border-blue-700 shadow-xs cursor-pointer"
            >
              {monthOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </Card>
      )}

      {/* Policy Guidance Banner */}
      <div className="rounded-xl border border-blue-900/15 bg-gradient-to-r from-blue-900/5 via-blue-900/10 to-blue-900/5 p-4 text-xs text-blue-950 shadow-sm">
        <div className="flex items-start gap-2.5">
          <ShieldCheck size={20} className="text-blue-800 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-blue-950 text-sm tracking-tight flex items-center gap-2">
              HOD Endorsement &amp; Selection Policy ({unit?.kind === "Plant" ? "Plant Policy — Max 4 Entries" : "Function Policy — Max 2 Entries"})
            </h4>
            <p className="text-blue-900/80 leading-relaxed">
              Each HOD reviews entries from their {unit?.kind === "Plant" ? "plant" : "department"} and forwards <strong>one employee per category</strong>, for a <strong>maximum of {maxCategories} categories</strong> that month.
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-2 font-mono text-[11px]">
              <span className="rounded-md bg-blue-900/10 px-2 py-0.5 font-semibold text-blue-900 border border-blue-900/15">
                Rule 1: Max 1 Employee Per Category
              </span>
              <span className="rounded-md bg-blue-900/10 px-2 py-0.5 font-semibold text-blue-900 border border-blue-900/15">
                Rule 2: Max {maxCategories} Categories Per Month ({usedCats.length}/{maxCategories} Used)
              </span>
            </div>
          </div>
        </div>
      </div>

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
                /{maxCategories}
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

      {/* Timeline & Extension Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded bg-blue-900/5 px-4 py-3 text-xs text-blue-950 font-medium">
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-blue-700 shrink-0" />
          <span>
            HOD Approval &amp; Pushing Timeline: <strong>{formatDatePretty(hodPhase.startDate)}</strong> – <strong>{formatDatePretty(effectiveEnd)}</strong>
          </span>
        </div>
        {hodPhase.isExtended && (
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-900">
            <Clock size={12} /> Extended until {formatDatePretty(effectiveEnd)}
          </span>
        )}
      </div>

      {!open && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-950 shadow-2xs">
          <Lock size={15} className="text-amber-800 shrink-0" />
          <span>
            {cycle.stage === "nomination"
              ? "HOD Validation is currently waiting to open. Endorsements unlock once the cycle reaches HOD Validation stage (8th – 9th) after employee nominations close."
              : `HOD Validation is closed — the cycle has moved to ${STAGES.find((s) => s.id === cycle.stage)?.label || cycle.stage}.`}
          </span>
        </div>
      )}

      {CATEGORIES.map((cat) => {
        const pool = mine.filter((n) => n.category === cat.id);
        if (!pool.length) return null;
        const chosen = picks[cat.id];
        const blocked = !chosen && usedCats.length >= maxCategories;
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
                      {readOnly ? (
                        isPick ? (
                          <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 border border-emerald-300 px-3 py-1.5 text-xs font-extrabold text-emerald-900 shadow-2xs">
                            <CheckCircle2 size={13} className="text-emerald-700" /> Endorsed by HOD (Read-Only)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500">
                            <Lock size={12} className="text-slate-400" /> Read-Only Mode
                          </span>
                        )
                      ) : (
                        <Button
                          tone={isPick ? "danger" : "solid"}
                          onClick={() => toggle(n)}
                          disabled={!open || (blocked && !isPick)}
                        >
                          {isPick ? "Withdraw endorsement" : "Endorse"}
                        </Button>
                      )}
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
