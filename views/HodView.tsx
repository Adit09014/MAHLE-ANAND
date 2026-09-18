"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Lock, Clock, Calendar, CheckCircle2, ShieldCheck, Eye, Sparkles, MessageSquare, Save, Check, FileText, Award, TrendingUp, ExternalLink, ChevronDown, ChevronUp, X, MapPin } from "lucide-react";
import { unitById, CATEGORIES, getMaxCategoriesForUnit, STAGES } from "../lib/constants";
import { Cycle, Nomination } from "../lib/types";
import { getCycleTimeline, getEffectiveEndDate, formatDatePretty, isHodEndorsementOpen } from "../lib/helpers";
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

  // Ensure selected month exists in available pending monthOptions
  useEffect(() => {
    if (monthOptions && monthOptions.length > 0 && !monthOptions.some((o) => o.value === month) && setMonth) {
      setMonth(monthOptions[0].value);
    }
  }, [month, monthOptions, setMonth]);

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
  const open = !locked && isHodEndorsementOpen(cycle);

  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({});
  const [expandedImpacts, setExpandedImpacts] = useState<Record<string, boolean>>({});
  const [selectedNomination, setSelectedNomination] = useState<Nomination | null>(null);

  const toggleExpandCitation = (id: string) => {
    setExpandedCitations((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpandImpact = (id: string) => {
    setExpandedImpacts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveComment = (nom: Nomination) => {
    if (readOnly) return;
    setSavingId(nom.id);
    const draft = commentDrafts[nom.id] !== undefined ? commentDrafts[nom.id] : (nom.hodComment || "");
    const nextNoms = (cycle.nominations || []).map((item) =>
      item.id === nom.id ? { ...item, hodComment: draft.trim() } : item
    );
    commit({
      ...cycle,
      nominations: nextNoms,
    });
    setSavingId(null);
    setSavedStatus((prev) => ({ ...prev, [nom.id]: true }));
    setTimeout(() => {
      setSavedStatus((prev) => ({ ...prev, [nom.id]: false }));
    }, 2500);
  };

  const toggle = (nom: Nomination) => {
    if (readOnly || !open) return;
    const next = { ...picks };
    if (next[nom.category] === nom.id) {
      next[nom.category] = ""; // Explicit withdrawal signal for server merge
    } else {
      if (!next[nom.category] && usedCats.length >= maxCategories)
        return;
      next[nom.category] = nom.id; // Enforces 1 employee per category
    }
    const currentDraft = commentDrafts[nom.id];
    const nextNoms = (cycle.nominations || []).map((n) =>
      n.id === nom.id
        ? {
            ...n,
            unit: unitId,
            ...(currentDraft !== undefined ? { hodComment: currentDraft.trim() } : {}),
          }
        : n
    );
    commit({
      ...cycle,
      nominations: nextNoms,
      endorsed: { ...(cycle.endorsed || {}), [unitId]: next },
    });
  };

  return (
    <div className="space-y-6">
      {/* Read-Only Notice Banner for HR Admin */}
      {readOnly && (
        <div className="flex items-center gap-2.5 rounded-xl border border-sky-200 bg-sky-50 p-3.5 text-xs text-sky-950 font-semibold shadow-2xs">
          <Eye size={17} className="text-sky-700 shrink-0" />
          <span>
            <strong>Read-Only Mode (HR Admin):</strong> You are inspecting HOD endorsements for {unit?.name || unitId}. Endorsements and withdrawals can only be performed by the designated Head of Department.
          </span>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="rounded-2xl border border-blue-900/10 bg-gradient-to-r from-[#0A2540] via-[#0F355C] to-[#0A2540] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-10 h-40 w-40 rounded-full bg-blue-400/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-sky-400/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-sky-200 backdrop-blur-md">
              <Sparkles size={13} className="text-sky-300" />
              <span>Head of Department Review Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              HOD Candidate Endorsement
            </h1>
            <p className="text-sm text-sky-100/80 leading-relaxed">
              Review and validate employee self-nominations from your department. Selected nominees advance to the HOD Panel Evaluation stage.
            </p>
          </div>

          {/* Month Selector Pill */}
          <div className="flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-4 py-2 text-xs font-semibold backdrop-blur-md shrink-0">
            <Calendar size={15} className="text-sky-300" />
            <span className="text-sky-100">Recognition Cycle:</span>
            {monthOptions && monthOptions.length > 0 && setMonth ? (
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="bg-transparent font-bold text-white outline-none cursor-pointer border-b border-white/30 pb-0.5 hover:border-white transition"
              >
                {monthOptions.map((o) => (
                  <option key={o.value} value={o.value} className="text-blue-950 bg-white font-medium">
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <strong className="text-white">{cycle.month}</strong>
            )}
          </div>
        </div>
      </div>

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
            {cycle.stage !== "validation"
              ? `HOD Endorsement is currently CLOSED. The cycle is in the ${cycle.stage === "nomination" ? "Self-Nomination" : cycle.stage === "judging" ? "Panel Scoring" : cycle.stage} stage.`
              : `HOD Endorsement is currently CLOSED. Submissions are scheduled between ${formatDatePretty(hodPhase.startDate)} and ${formatDatePretty(effectiveEnd)}.`}
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
            <div className="grid gap-4 md:grid-cols-2">
              {pool.map((n) => {
                const isPick = chosen === n.id;
                const isCitExpanded = !!expandedCitations[n.id];
                const isImpExpanded = !!expandedImpacts[n.id];
                return (
                  <Card
                    key={n.id}
                    className={`p-5 space-y-3.5 transition-all duration-150 ${isPick ? "ring-2 ring-blue-700 bg-blue-50/[0.08]" : "hover:border-blue-900/20"}`}
                  >
                    {/* Header */}
                    <div className="flex items-baseline justify-between gap-3 border-b border-blue-900/10 pb-2.5">
                      <div>
                        <h4 className="text-base font-bold text-blue-950">{n.name}</h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-blue-900/60 mt-0.5">
                          <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                            {n.code}
                          </span>
                          {n.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={11} className="text-slate-400" />
                              {n.location}
                            </span>
                          )}
                          {n.gender && (
                            <span className="text-blue-900/50">
                              · Declared: {n.gender}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isPick && <Pill tone="good">Endorsed</Pill>}
                        <button
                          type="button"
                          onClick={() => setSelectedNomination(n)}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-900/15 bg-white px-2.5 py-1 text-xs font-bold text-blue-950 hover:bg-blue-900 hover:text-white transition active:scale-95 shadow-2xs cursor-pointer"
                          title="View complete citation and nomination submission"
                        >
                          <Eye size={12} /> View Details
                        </button>
                      </div>
                    </div>

                    {/* MAFS Value Demonstrated Badge */}
                    {n.mafsValue && (
                      <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/80 px-3 py-2 text-xs text-amber-950 shadow-2xs">
                        <Sparkles size={14} className="text-amber-600 shrink-0" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                          MAFS Core Value:
                        </span>
                        <span className="font-extrabold text-amber-950">
                          {n.mafsValue}
                        </span>
                      </div>
                    )}

                    {/* Projects Undertaken / Key Contribution (Citation) */}
                    <div className="rounded-xl border border-blue-900/10 bg-slate-50/60 p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-950">
                          <FileText size={13} className="text-blue-700 shrink-0" />
                          <span>Projects Undertaken / Key Contribution</span>
                        </span>
                        {n.citation && n.citation.length > 180 && (
                          <button
                            type="button"
                            onClick={() => toggleExpandCitation(n.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
                          >
                            {isCitExpanded ? (
                              <>
                                <ChevronUp size={12} /> Collapse
                              </>
                            ) : (
                              <>
                                <ChevronDown size={12} /> Expand
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <div className={`text-xs text-blue-950/90 leading-relaxed font-sans whitespace-pre-wrap ${!isCitExpanded && (n.citation || "").length > 180 ? "line-clamp-4" : ""}`}>
                        {n.citation || "No citation entered."}
                      </div>
                    </div>

                    {/* Measurable Business Impact */}
                    {n.businessImpact && (
                      <div className="rounded-xl border border-emerald-900/15 bg-emerald-50/40 p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-950">
                            <TrendingUp size={13} className="text-emerald-700 shrink-0" />
                            <span>Business Impact &amp; Measurable Outcome</span>
                          </span>
                          {n.businessImpact.length > 160 && (
                            <button
                              type="button"
                              onClick={() => toggleExpandImpact(n.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 cursor-pointer"
                            >
                              {isImpExpanded ? (
                                <>
                                  <ChevronUp size={12} /> Collapse
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={12} /> Expand
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        <div className={`text-xs text-emerald-950/90 leading-relaxed font-sans whitespace-pre-wrap ${!isImpExpanded && n.businessImpact.length > 160 ? "line-clamp-3" : ""}`}>
                          {n.businessImpact}
                        </div>
                      </div>
                    )}

                    {/* Supporting Evidence Link */}
                    {n.evidence && (
                      <div className="flex items-center gap-2 text-xs pt-0.5">
                        <ExternalLink size={13} className="text-sky-700 shrink-0" />
                        <span className="font-semibold text-slate-500">Supporting Evidence:</span>
                        <a
                          href={n.evidence.startsWith("http") ? n.evidence : `https://${n.evidence}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-sky-800 hover:text-sky-950 hover:underline break-all truncate text-xs"
                          title={n.evidence}
                        >
                          {n.evidence}
                        </a>
                      </div>
                    )}

                    {/* Endorsement Actions */}
                    <div className="pt-2">
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

                    {/* HOD Feedback & Remarks Section */}
                    <div className="mt-4 pt-3.5 border-t border-blue-900/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-blue-950 uppercase tracking-wider">
                          <MessageSquare size={13} className="text-sky-700" />
                          <span>HOD Comment / Feedback</span>
                        </label>
                        {savedStatus[n.id] && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                            <Check size={12} /> Saved!
                          </span>
                        )}
                      </div>

                      {readOnly ? (
                        n.hodComment ? (
                          <div className="rounded-lg bg-sky-50 border border-sky-200/80 p-2.5 text-xs text-sky-950 leading-relaxed">
                            <p className="italic font-medium">&ldquo;{n.hodComment}&rdquo;</p>
                          </div>
                        ) : (
                          <p className="text-[11px] text-blue-900/40 italic">
                            No HOD comments added.
                          </p>
                        )
                      ) : (
                        <div className="space-y-2">
                          <textarea
                            rows={2}
                            value={commentDrafts[n.id] !== undefined ? commentDrafts[n.id] : (n.hodComment || "")}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCommentDrafts((prev) => ({ ...prev, [n.id]: val }));
                              setSavedStatus((prev) => ({ ...prev, [n.id]: false }));
                            }}
                            placeholder="Add comments or feedback for this employee (shown on their dashboard)..."
                            className="w-full resize-none rounded-xl border border-blue-900/15 bg-white p-2.5 text-xs text-blue-950 placeholder:text-blue-900/35 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 transition shadow-inner"
                          />
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-blue-900/55 leading-tight">
                              Visible directly to {n.name.split(" ")[0]} on their personal dashboard.
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSaveComment(n)}
                              disabled={savingId === n.id}
                              className="inline-flex items-center gap-1.5 shrink-0 rounded-lg bg-gradient-to-r from-[#0A2540] to-blue-900 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:from-blue-900 hover:to-sky-900 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                            >
                              <Save size={12} />
                              <span>{savingId === n.id ? "Saving..." : "Save Comment"}</span>
                            </button>
                          </div>
                          {n.hodComment && !savedStatus[n.id] && (
                            <p className="text-[10px] text-emerald-800 font-medium truncate">
                              Current: &ldquo;{n.hodComment}&rdquo;
                            </p>
                          )}
                        </div>
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

      {/* Full Citation & Nomination Details Modal */}
      {selectedNomination && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 text-blue-950">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-900 text-white shadow-sm">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-blue-950">Full Nomination Citation Details</h3>
                  <p className="text-xs text-slate-500">
                    Category: <strong className="text-blue-900">{CATEGORIES.find((c) => c.id === selectedNomination.category)?.name || selectedNomination.category}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNomination(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Candidate Metadata Summary */}
            <div className="rounded-xl border border-blue-900/10 bg-slate-50 p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-base font-extrabold text-blue-950">{selectedNomination.name}</h4>
                  <p className="text-xs text-slate-500 font-mono">
                    Employee ID: <strong>{selectedNomination.code}</strong>
                  </p>
                </div>
                {picks[selectedNomination.category] === selectedNomination.id ? (
                  <Pill tone="good"><CheckCircle2 size={11} className="inline mr-1" /> Endorsed</Pill>
                ) : (
                  <Pill tone="muted">Candidate Nominee</Pill>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 pt-1 border-t border-slate-200/60">
                {selectedNomination.gender && (
                  <span><strong>Gender:</strong> {selectedNomination.gender}</span>
                )}
                <span><strong>Department:</strong> {unitById(selectedNomination.unit)?.name || selectedNomination.unit}</span>
                {selectedNomination.location && (
                  <span><strong>Location:</strong> {selectedNomination.location}</span>
                )}
                {selectedNomination.submittedAt && (
                  <span>
                    <strong>Submitted:</strong> {new Date(selectedNomination.submittedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* MAFS Value Demonstrated */}
            {selectedNomination.mafsValue && (
              <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200 p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900 uppercase tracking-wider">
                  <Sparkles size={15} className="text-amber-600 shrink-0" />
                  <span>MAFS Value Demonstrated</span>
                </div>
                <p className="text-sm font-bold text-amber-950">
                  {selectedNomination.mafsValue}
                </p>
              </div>
            )}

            {/* Citation & Description */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                <FileText size={14} className="text-blue-700 shrink-0" />
                <span>Projects Undertaken / Key Contribution</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-900 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap font-sans shadow-inner">
                {selectedNomination.citation || "No citation text provided."}
              </div>
            </div>

            {/* Measurable Business Impact */}
            {selectedNomination.businessImpact && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-900">
                  <TrendingUp size={14} className="text-emerald-700 shrink-0" />
                  <span>Business Impact &amp; Measurable Outcome</span>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-xs text-emerald-950 leading-relaxed max-h-44 overflow-y-auto whitespace-pre-wrap font-sans">
                  {selectedNomination.businessImpact}
                </div>
              </div>
            )}

            {/* Evidence Link */}
            {selectedNomination.evidence && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Supporting Evidence</span>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs flex items-center gap-2">
                  <ExternalLink size={14} className="text-sky-700 shrink-0" />
                  <a
                    href={selectedNomination.evidence.startsWith("http") ? selectedNomination.evidence : `https://${selectedNomination.evidence}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-sky-800 hover:text-sky-950 hover:underline break-all truncate"
                  >
                    {selectedNomination.evidence}
                  </a>
                </div>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedNomination(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>

              {!readOnly && (
                <Button
                  tone={picks[selectedNomination.category] === selectedNomination.id ? "danger" : "solid"}
                  onClick={() => {
                    toggle(selectedNomination);
                  }}
                  disabled={!open || (!picks[selectedNomination.category] && usedCats.length >= maxCategories)}
                >
                  {picks[selectedNomination.category] === selectedNomination.id ? "Withdraw endorsement" : "Endorse this candidate"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodView;
