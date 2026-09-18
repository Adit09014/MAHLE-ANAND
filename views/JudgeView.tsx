"use client";

import React, { useState, useMemo } from "react";
import { Lock, Clock, Calendar, Search, Filter, Scale, CheckCircle2, User, Award, FileText, Sparkles, Star, ChevronRight, Check, Eye, ExternalLink, X, MessageSquare } from "lucide-react";
import { CATEGORIES, catById, unitById } from "../lib/constants";
import { endorsedList, getCycleTimeline, getEffectiveEndDate, formatDatePretty, isPanelScoringOpen } from "../lib/helpers";
import { AuthUser, Cycle, Nomination } from "../lib/types";
import Card from "../components/Card";
import Label from "../components/Label";
import Pill from "../components/Pill";
import Empty from "../components/Empty";

export interface JudgeViewProps {
  cycle: Cycle;
  commit: (next: Cycle) => void;
  judgeId: string;
  locked: boolean;
  currentUser?: AuthUser | null;
  month?: string;
  setMonth?: (m: string) => void;
  monthOptions?: { value: string; label: string }[];
}

export const JudgeView: React.FC<JudgeViewProps> = ({
  cycle,
  commit,
  judgeId,
  locked,
  currentUser,
  month,
  setMonth,
  monthOptions,
}) => {
  // Dynamically resolve unique judge ID slot for the logged in user
  const effectiveJudgeId = useMemo(() => {
    if (currentUser) {
      if (currentUser.code) {
        const uCode = currentUser.code.toUpperCase();
        const matchByCode = cycle.judges.find(
          (j) => j.code && j.code.toUpperCase() === uCode
        );
        if (matchByCode) return matchByCode.id;
      }

      if (currentUser.name) {
        const uName = currentUser.name.toLowerCase().trim();
        const matchByName = cycle.judges.find(
          (j) => j.name && j.name.toLowerCase().trim() === uName
        );
        if (matchByName) return matchByName.id;
      }

      if (currentUser.code) return currentUser.code.toUpperCase();
    }
    return judgeId || "j1";
  }, [currentUser, cycle.judges, judgeId]);

  const judge = cycle.judges.find((j) => j.id === effectiveJudgeId) || {
    id: effectiveJudgeId,
    name: currentUser?.name || "Panel Judge",
  };

  // Ensure selected month is one of the valid months where the user is an appointed judge
  React.useEffect(() => {
    if (monthOptions && monthOptions.length > 0 && !monthOptions.some((o) => o.value === month) && setMonth) {
      setMonth(monthOptions[0].value);
    }
  }, [month, monthOptions, setMonth]);
  const pool = endorsedList(cycle);
  const timeline = getCycleTimeline(cycle);
  const judgePhase = timeline.panelScoring;
  const effectiveEnd = getEffectiveEndDate(judgePhase);
  const open = !locked && isPanelScoringOpen(cycle);

  // Selected candidate state
  const [selectedNomId, setSelectedNomId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [citationModalNom, setCitationModalNom] = useState<Nomination | null>(null);

  // Filter pool candidates based on search & category filter
  const filteredPool = useMemo(() => {
    return pool.filter((n) => {
      const matchSearch =
        n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (unitById(n.unit)?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = catFilter === "all" || n.category === catFilter;
      return matchSearch && matchCat;
    });
  }, [pool, searchQuery, catFilter]);

  // Set default selected candidate if none selected
  const activeNom = useMemo(() => {
    if (selectedNomId) {
      const found = pool.find((n) => n.id === selectedNomId);
      if (found) return found;
    }
    return filteredPool[0] || pool[0] || null;
  }, [pool, filteredPool, selectedNomId]);

  const activeScore = activeNom ? (cycle.scores[activeNom.id] || {})[effectiveJudgeId] : undefined;

  const setScore = (nomId: string, value: number | undefined) => {
    if (!open) return;
    const forNom = { ...(cycle.scores[nomId] || {}) };
    if (value === undefined || Number.isNaN(value)) {
      forNom[effectiveJudgeId] = -1; // Explicit withdrawal signal for score
    } else {
      forNom[effectiveJudgeId] = Math.max(0, Math.min(10, value));
    }
    commit({ ...cycle, scores: { ...cycle.scores, [nomId]: forNom } });
  };

  const scoredCount = useMemo(() => {
    return pool.filter((n) => (cycle.scores[n.id] || {})[effectiveJudgeId] !== undefined).length;
  }, [pool, cycle.scores, effectiveJudgeId]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <Card className="p-6 bg-white border border-blue-900/10 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-sky-900 mb-1">
              <Scale size={13} className="text-sky-600" />
              <span>Appointed Panel Judge Console</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-blue-950">
              Panel Candidate Evaluation ({judge?.name || "Panel Judge"})
            </h1>
            <p className="text-xs text-slate-500">
              Review endorsed submissions and score candidate achievements out of 10.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {monthOptions && monthOptions.length > 0 && setMonth && (
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

            <div className="rounded-xl border border-blue-900/10 bg-slate-50 px-4 py-2 text-right">
              <span className="block text-[10px] font-bold uppercase text-slate-400">Scoring Progress</span>
              <strong className="text-base font-black text-blue-950">
                {scoredCount} <span className="text-xs font-normal text-slate-400">/ {pool.length} Scored</span>
              </strong>
            </div>

            <div>
              {open ? (
                <Pill tone="good">Scoring Window OPEN</Pill>
              ) : (
                <Pill tone="warn">Scoring Window CLOSED</Pill>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-blue-950 font-medium">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-blue-700 shrink-0" />
            <span>
              Evaluation Timeline: <strong>{formatDatePretty(judgePhase.startDate)}</strong> – <strong>{formatDatePretty(effectiveEnd)}</strong>
            </span>
          </div>
          {judgePhase.isExtended && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-300 px-2.5 py-0.5 text-xs font-bold text-amber-900">
              <Clock size={12} /> Extended until {formatDatePretty(effectiveEnd)}
            </span>
          )}
        </div>
      </Card>

      {/* 2. Panel Judging System & Evaluation Guidelines Instruction Box */}
      <Card className="p-6 bg-white border border-slate-200/80 shadow-xs rounded-2xl space-y-4">
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Left Side Table (7 cols on lg) */}
          <div className="lg:col-span-7 overflow-hidden rounded-xl border border-slate-300">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0A2540] text-white font-bold">
                  <th className="py-2.5 px-4 w-1/3 border-r border-blue-900/40">Item</th>
                  <th className="py-2.5 px-4">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-slate-100/80 text-slate-800">
                <tr>
                  <td className="py-2.5 px-4 font-bold text-blue-950 border-r border-slate-200">Judge score</td>
                  <td className="py-2.5 px-4">Single numeric score <strong>0–10</strong> per judge (integer or one decimal allowed).</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-bold text-blue-950 border-r border-slate-200">Panel score</td>
                  <td className="py-2.5 px-4">
                    <div className="inline-flex items-center gap-1.5 font-medium">
                      <span>PanelScore =</span>
                      <span className="inline-flex flex-col items-center justify-center text-center px-1 font-mono">
                        <span className="border-b border-slate-800 pb-0.5 text-[11px] font-bold">Judge1 + Judge2 + Judge3</span>
                        <span className="pt-0.5 text-[11px] font-bold">3</span>
                      </span>
                      <span>(scale 0–10).</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-bold text-blue-950 border-r border-slate-200">Winner selection</td>
                  <td className="py-2.5 px-4">Nominee with highest <strong>PanelScore</strong> wins the award for the month.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-bold text-blue-950 border-r border-slate-200">Monthly points awarded</td>
                  <td className="py-2.5 px-4">Winner receives points equal to their <strong>average panel score</strong> recorded in HR tracker.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-bold text-blue-950 border-r border-slate-200">Year-end conversion</td>
                  <td className="py-2.5 px-4">Cumulative monthly points feed into the monthly component of the year-end R&amp;R (as previously defined).</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Right Side Scoring Criteria Box & Example (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Top Bordered Box */}
            <div className="rounded-xl border-2 border-[#0A2540] bg-white p-4 text-xs text-blue-950">
              <ul className="space-y-2 list-disc pl-4 font-medium leading-relaxed">
                <li>
                  <strong>9–10:</strong> Exceptional evidence and clear measurable impact; strong alignment.
                </li>
                <li>
                  <strong>7–8:</strong> Strong evidence and good impact; minor gaps
                </li>
                <li>
                  <strong>4–6:</strong> Moderate evidence; some impact but limited specificity.
                </li>
                <li>
                  <strong>0–3:</strong> Weak or no evidence; vague claims.
                </li>
              </ul>
            </div>

            {/* Bottom Example Section */}
            <div className="space-y-1.5 text-xs text-slate-800 pt-1">
              <h4 className="text-sm font-bold text-blue-950 tracking-tight">Example</h4>
              <p className="leading-relaxed">
                Judge scores: 8, 9, 8 &rarr; Panel Score = (8 + 9 + 8)/3 = 8.33 .
              </p>
              <p className="leading-relaxed">
                Highest Panel Score across nominees wins and receives points equal to their <strong>average panel score (8.33 points)</strong>.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {!open && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
          <Lock size={15} className="shrink-0" />
          <span>
            {cycle.stage !== "judging"
              ? `Panel scoring is currently CLOSED. The cycle is in the ${cycle.stage === "validation" ? "HOD Endorsement" : cycle.stage === "nomination" ? "Self-Nomination" : cycle.stage} stage.`
              : `Panel scoring is currently CLOSED. Evaluations are scheduled between ${formatDatePretty(judgePhase.startDate)} and ${formatDatePretty(effectiveEnd)}.`}
          </span>
        </div>
      )}

      {pool.length === 0 ? (
        <Empty
          title="No endorsed nominees yet"
          hint="Candidates will appear here once HODs complete department endorsements."
        />
      ) : (
        /* 2. Reference 2-Column Split Workspace (Left: Candidate List, Right: Selected Candidate Detail & Scoring) */
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Left Column: Pending Review Candidate List */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="p-4 border border-blue-900/10 shadow-xs bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-blue-950">Pending Review</h3>
                  <p className="text-[11px] text-slate-400">{pool.length} nominations endorsed</p>
                </div>
                <span className="rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-[10px] font-bold text-sky-900">
                  {scoredCount}/{pool.length} Done
                </span>
              </div>

              {/* Search & Category Filter Controls */}
              <div className="space-y-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search candidate name or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-1.5 text-xs text-blue-950 outline-none focus:border-blue-700"
                  />
                </div>

                <select
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-700"
                >
                  <option value="all">All Award Categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Candidate Cards List */}
              <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
                {filteredPool.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">No candidates match your search.</p>
                ) : (
                  filteredPool.map((n) => {
                    const isSelected = activeNom?.id === n.id;
                    const score = (cycle.scores[n.id] || {})[effectiveJudgeId];
                    const cat = catById(n.category);
                    const unit = unitById(n.unit);

                    return (
                      <div
                        key={n.id}
                        onClick={() => setSelectedNomId(n.id)}
                        className={`rounded-2xl border p-3.5 cursor-pointer transition duration-150 space-y-2.5 ${isSelected
                          ? "border-sky-500 bg-sky-50/80 ring-2 ring-sky-400/40 shadow-xs"
                          : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0A2540] text-white font-bold text-xs">
                              {n.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-blue-950 truncate">{n.name}</h4>
                              <p className="text-[10px] text-slate-500 truncate">
                                {unit?.name || n.unit} · {n.code}
                              </p>
                            </div>
                          </div>
                          {score !== undefined ? (
                            <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-black text-emerald-900 shrink-0">
                              {score}/10
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400 shrink-0">
                              Pending
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-1.5 pt-1">
                          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            <span className="rounded bg-sky-100/70 border border-sky-200 px-2 py-0.5 text-[9px] font-bold text-sky-900 uppercase">
                              {cat?.name || n.category}
                            </span>
                            {n.mafsValue && (
                              <span className="rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[9px] font-bold text-amber-900 truncate max-w-[110px]" title={n.mafsValue}>
                                {n.mafsValue}
                              </span>
                            )}
                            {n.hodComment && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-sky-50 border border-sky-200/80 px-1.5 py-0.5 text-[9px] font-bold text-sky-900" title={`HOD Feedback: ${n.hodComment}`}>
                                <MessageSquare size={9} className="text-sky-700" />
                                <span>HOD Note</span>
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNomId(n.id);
                              setCitationModalNom(n);
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-900/5 hover:bg-blue-900 hover:text-white text-[10px] font-bold text-blue-950 px-2 py-0.5 transition cursor-pointer border border-blue-900/10 shrink-0 shadow-2xs"
                            title="View Citation & Impact Details"
                          >
                            <Eye size={10} /> Citation
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>

          {/* Right Column: Detailed Candidate Dossier & Panel Rating out of 10 */}
          <div className="lg:col-span-8">
            {activeNom ? (
              <Card className="p-6 border border-blue-900/10 shadow-xs bg-white space-y-6">
                {/* Header Profile Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0A2540] text-white font-black text-xl uppercase shadow-md">
                      {activeNom.name.charAt(0)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-black text-blue-950">{activeNom.name}</h2>
                        <span className="rounded-full bg-sky-100 border border-sky-200 px-2.5 py-0.5 text-[10px] font-bold text-sky-900 uppercase">
                          {catById(activeNom.category)?.name || activeNom.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        {unitById(activeNom.unit)?.name || activeNom.unit} · Code: <strong className="font-mono text-slate-700">{activeNom.code}</strong>
                        {activeNom.gender ? ` (${activeNom.gender})` : ""}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Endorsed Nomination · Submitted {new Date(activeNom.submittedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setCitationModalNom(activeNom)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-blue-900/15 bg-white px-3 py-1.5 text-xs font-bold text-blue-950 hover:bg-blue-900 hover:text-white transition shadow-2xs cursor-pointer"
                        >
                          <Eye size={13} /> View Full Citation &amp; Evidence
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Big Current Score Card */}
                  <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50/40 p-4 text-center shrink-0 min-w-[130px] shadow-2xs">
                    <span className="block text-[10px] font-extrabold uppercase tracking-widest text-sky-900">
                      CURRENT SCORE
                    </span>
                    <span className="text-3xl font-black tracking-tight text-blue-950 block mt-0.5">
                      {activeScore !== undefined ? activeScore : "--"}
                      <span className="text-sm font-bold text-slate-400">/10</span>
                    </span>
                    <span className="text-[10px] font-semibold text-sky-800 block mt-0.5">
                      {activeScore !== undefined ? "Scored by You" : "Not Scored Yet"}
                    </span>
                  </div>
                </div>

                {/* Candidate Nomination Statement Cards */}
                <div className="space-y-4">
                  {activeNom.mafsValue && (
                    <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center gap-2">
                      <Sparkles size={16} className="text-amber-600 shrink-0" />
                      <div className="text-xs">
                        <span className="font-bold text-amber-950 mr-1">MAFS Value Demonstrated:</span>
                        <span className="font-bold text-amber-900">{activeNom.mafsValue}</span>
                      </div>
                    </div>
                  )}

                  {/* Projects Undertaken / Key Contribution Card */}
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-5 space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-blue-700" />
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-950">
                        Projects Undertaken / Key Contribution
                      </h3>
                    </div>
                    <p className="text-xs text-blue-950/85 leading-relaxed whitespace-pre-wrap italic font-sans bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-2xs">
                      &ldquo;{activeNom.citation}&rdquo;
                    </p>
                  </div>

                  {/* Business Impact Card */}
                  {activeNom.businessImpact && (
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-5 space-y-2">
                      <div className="flex items-center gap-2">
                        <Award size={16} className="text-emerald-700" />
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-950">
                          Business Impact &amp; ROI
                        </h3>
                      </div>
                      <p className="text-xs text-blue-950/85 leading-relaxed whitespace-pre-wrap italic font-sans bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-2xs">
                        &ldquo;{activeNom.businessImpact}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Supporting Evidence Link if provided */}
                  {activeNom.evidence && (
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <ExternalLink size={15} className="text-sky-700 shrink-0" />
                        <span className="font-bold text-blue-950">Supporting Evidence Document:</span>
                        <a
                          href={activeNom.evidence.startsWith("http") ? activeNom.evidence : `https://${activeNom.evidence}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-sky-800 hover:text-sky-950 hover:underline truncate"
                        >
                          {activeNom.evidence}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* HOD Endorsement Remarks & Feedback */}
                  {activeNom.hodComment && (
                    <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-blue-50/60 to-sky-50 p-5 space-y-2 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <MessageSquare size={16} className="text-sky-700" />
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-sky-950">
                          HOD Endorsement Remarks &amp; Feedback
                        </h3>
                      </div>
                      <p className="text-xs text-blue-950 leading-relaxed whitespace-pre-wrap font-medium bg-white p-3.5 rounded-xl border border-sky-100 shadow-2xs">
                        &ldquo;{activeNom.hodComment}&rdquo;
                      </p>
                    </div>
                  )}
                </div>

                {/* 3. Panel Rating Out of 10 Controls */}
                <div className="rounded-2xl border border-blue-900/15 bg-blue-950/[0.02] p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-blue-900/10 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Star size={18} className="text-amber-500 fill-amber-400" />
                      <h3 className="text-sm font-extrabold text-blue-950">
                        Panel Judge Score Rating (Rate Out of 10)
                      </h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setCitationModalNom(activeNom)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-950 hover:bg-sky-100 hover:border-sky-400 transition shadow-2xs cursor-pointer"
                        title="Read full citation, impact & evidence while rating"
                      >
                        <Eye size={13} className="text-sky-700" />
                        <span>View Citation While Scoring</span>
                      </button>
                      <span className="text-xs font-bold text-blue-950">
                        Score: <strong className="text-base text-blue-900">{activeScore !== undefined ? activeScore : "--"}</strong> / 10
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500">
                    Select a score from 1 to 10 based on project feasibility, innovation, business impact, and MAFS alignment:
                  </p>

                  {/* Interactive 1 to 10 Number Rating Buttons */}
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 pt-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                      const isSelected = activeScore === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          disabled={!open}
                          onClick={() => setScore(activeNom.id, num)}
                          className={`h-11 rounded-xl text-sm font-extrabold transition-all duration-150 active:scale-95 shadow-2xs ${isSelected
                            ? "bg-[#0A2540] text-white ring-2 ring-sky-400 shadow-md scale-105"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-50"
                            }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>

                  {/* Manual / Decimal Score Input Option */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <Label>Custom Score Input (0.0 – 10.0):</Label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={0.5}
                        disabled={!open}
                        placeholder="e.g. 8.5"
                        value={activeScore ?? ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? undefined : parseFloat(e.target.value);
                          setScore(activeNom.id, val);
                        }}
                        className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-center font-bold text-xs text-blue-950 outline-none focus:border-blue-700 shadow-2xs"
                      />
                    </div>

                    {activeScore !== undefined && (
                      <button
                        type="button"
                        disabled={!open}
                        onClick={() => setScore(activeNom.id, undefined)}
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Clear Score
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ) : (
              <Empty
                title="Select a candidate to evaluate"
                hint="Choose a candidate from the left list to review their details and enter panel score."
              />
            )}
          </div>
        </div>
      )}

      {/* Panel Judge Full Citation & Dossier Modal */}
      {citationModalNom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 text-blue-950">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A2540] text-white shadow-sm">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-blue-950">Nomination Citation &amp; Evidence</h3>
                  <p className="text-xs text-slate-500">
                    Category: <strong className="text-blue-900">{catById(citationModalNom.category)?.name || citationModalNom.category}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCitationModalNom(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Nominee Profile summary */}
            <div className="rounded-xl border border-blue-900/10 bg-slate-50 p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-base font-extrabold text-blue-950">{citationModalNom.name}</h4>
                  <p className="text-xs text-slate-500 font-mono">
                    Employee ID: <strong>{citationModalNom.code}</strong>
                  </p>
                </div>
                <span className="rounded-full bg-sky-100 border border-sky-300 px-3 py-1 text-xs font-bold text-sky-950">
                  {catById(citationModalNom.category)?.name || citationModalNom.category}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 pt-1 border-t border-slate-200/60">
                {citationModalNom.gender && (
                  <span><strong>Gender:</strong> {citationModalNom.gender}</span>
                )}
                <span><strong>Department:</strong> {unitById(citationModalNom.unit)?.name || citationModalNom.unit}</span>
                {citationModalNom.location && (
                  <span><strong>Location:</strong> {citationModalNom.location}</span>
                )}
                {citationModalNom.submittedAt && (
                  <span>
                    <strong>Submitted:</strong> {new Date(citationModalNom.submittedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* MAFS Value Demonstrated */}
            {citationModalNom.mafsValue && (
              <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200 p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900 uppercase tracking-wider">
                  <Sparkles size={15} className="text-amber-600 shrink-0" />
                  <span>MAFS Value Demonstrated</span>
                </div>
                <p className="text-sm font-bold text-amber-950">
                  {citationModalNom.mafsValue}
                </p>
              </div>
            )}

            {/* Citation & Key Contributions */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                <FileText size={14} className="text-blue-700 shrink-0" />
                <span>Projects Undertaken / Key Contribution</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-900 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap font-sans shadow-inner">
                {citationModalNom.citation || "No citation text provided."}
              </div>
            </div>

            {/* Measurable Business Impact */}
            {citationModalNom.businessImpact && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-900">
                  <Award size={14} className="text-emerald-700 shrink-0" />
                  <span>Business Impact &amp; Measurable Outcome</span>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-xs text-emerald-950 leading-relaxed max-h-44 overflow-y-auto whitespace-pre-wrap font-sans">
                  {citationModalNom.businessImpact}
                </div>
              </div>
            )}

            {/* HOD Endorsement Remarks & Feedback */}
            {citationModalNom.hodComment && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-950">
                  <MessageSquare size={14} className="text-sky-700 shrink-0" />
                  <span>HOD Endorsement Remarks &amp; Feedback</span>
                </div>
                <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-xs text-blue-950 leading-relaxed max-h-44 overflow-y-auto whitespace-pre-wrap font-medium shadow-2xs">
                  &ldquo;{citationModalNom.hodComment}&rdquo;
                </div>
              </div>
            )}

            {/* Supporting Evidence Link */}
            {citationModalNom.evidence && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Supporting Evidence Link</span>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs flex items-center gap-2">
                  <ExternalLink size={14} className="text-sky-700 shrink-0" />
                  <a
                    href={citationModalNom.evidence.startsWith("http") ? citationModalNom.evidence : `https://${citationModalNom.evidence}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-sky-800 hover:text-sky-950 hover:underline break-all truncate"
                  >
                    {citationModalNom.evidence}
                  </a>
                </div>
              </div>
            )}

            {/* Score Candidate Directly from Modal */}
            <div className="rounded-xl border border-blue-900/15 bg-blue-950/[0.03] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Star size={15} className="text-amber-500 fill-amber-400" />
                  <span className="text-xs font-extrabold text-blue-950">
                    Rate This Candidate (Out of 10)
                  </span>
                </div>
                <span className="text-xs font-bold text-blue-950">
                  Current Score:{" "}
                  <strong className="text-sm text-blue-900">
                    {(cycle.scores[citationModalNom.id] || {})[effectiveJudgeId] !== undefined
                      ? (cycle.scores[citationModalNom.id] || {})[effectiveJudgeId]
                      : "Not Scored"}
                  </strong>
                </span>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const curr = (cycle.scores[citationModalNom.id] || {})[effectiveJudgeId];
                  const isSel = curr === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      disabled={!open}
                      onClick={() => setScore(citationModalNom.id, num)}
                      className={`h-9 rounded-lg text-xs font-extrabold transition active:scale-95 cursor-pointer ${
                        isSel
                          ? "bg-[#0A2540] text-white ring-2 ring-sky-400 shadow-sm"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                Scores save instantly upon selection.
              </span>
              <button
                type="button"
                onClick={() => setCitationModalNom(null)}
                className="rounded-xl bg-[#0A2540] px-4 py-2 text-xs font-bold text-white hover:bg-blue-900 transition cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JudgeView;
