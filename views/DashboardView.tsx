"use client";

import React, { useMemo } from "react";
import {
  Trophy,
  Award,
  ClipboardList,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  History,
  PlusCircle,
  Medal,
  Check,
  Zap,
  ShieldCheck,
  Scale,
  Users,
  Building2,
  Sliders,
} from "lucide-react";
import { catById, unitById, POINTS, STAGES, getMaxCategoriesForUnit, getDynamicUnits } from "../lib/constants";
import { Cycle, PointsState, AuthUser, Unit } from "../lib/types";
import {
  results,
  endorsedList,
  panelScore,
  getCycleTimeline,
  getEffectiveEndDate,
  formatDatePretty,
} from "../lib/helpers";
import Card from "../components/Card";
import Label from "../components/Label";
import Button from "../components/Button";
import Pill from "../components/Pill";
import Empty from "../components/Empty";

export interface DashboardViewProps {
  cycle: Cycle;
  points: PointsState;
  currentUser?: AuthUser;
  onNavigateToNominate?: () => void;
  onNavigateToEndorse?: () => void;
  onNavigateToJudge?: () => void;
  onNavigateToHr?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  cycle,
  points,
  currentUser,
  onNavigateToNominate,
  onNavigateToEndorse,
  onNavigateToJudge,
  onNavigateToHr,
}) => {
  const userName = currentUser?.name || "Team Member";
  const userCode = currentUser?.code?.toUpperCase() || "";
  const isAdmin = currentUser?.role === "hr" || currentUser?.role === "admin" || Boolean(currentUser?.isAdmin);
  const isHod = currentUser?.role === "hod";
  const isPanelJudge = Boolean(currentUser?.isPanelJudge);
  const hodUnitId = currentUser?.unitId || "hr";
  const hodUnitObj = unitById(hodUnitId);

  const [allEmployees, setAllEmployees] = React.useState<Array<{ code?: string; name?: string; unitId?: string }>>([]);

  React.useEffect(() => {
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

  const activeUnits = useMemo(() => getDynamicUnits(allEmployees), [allEmployees]);

  // Calculate timeline phase details
  const timeline = getCycleTimeline(cycle);
  const stageIdx = STAGES.findIndex((s) => s.id === cycle.stage);

  // --- ADMIN SPECIFIC CALCULATIONS ---
  // 1. Total Nominations Across Company
  const totalCompanyNominations = cycle?.nominations?.length || 0;

  // 2. Departments that completed Max Endorsement Pushes
  const deptsQuotaCompletedCount = useMemo(() => {
    let count = 0;
    activeUnits.forEach((u) => {
      const picks = cycle?.endorsed?.[u.id] || {};
      const filledCount = Object.keys(picks).filter((c) => picks[c]).length;
      const maxQuota = getMaxCategoriesForUnit(u.id);
      if (filledCount >= maxQuota) {
        count++;
      }
    });
    return count;
  }, [cycle?.endorsed, activeUnits]);

  // 3. Panel Judges Assigned & Month's Panel Names
  const assignedJudges = useMemo(() => {
    if (!cycle?.judges) return [];
    return cycle.judges.filter((j) => j.name && j.name.trim() !== "");
  }, [cycle?.judges]);

  const assignedJudgesNamesText = useMemo(() => {
    if (assignedJudges.length === 0) return "No Judges Assigned Yet";
    return assignedJudges.map((j) => j.name).join(", ");
  }, [assignedJudges]);

  // 4. Department-Wise Applied Employee Count & Status List
  const deptStatsList = useMemo(() => {
    return activeUnits.map((u) => {
      const targetUnit = (u.id || "").trim().toLowerCase();
      const unitNoms = (cycle?.nominations || []).filter((n) => {
        const nomUnit = (n.unit || "").trim().toLowerCase();
        if (nomUnit && nomUnit === targetUnit) return true;
        const emp = allEmployees.find(
          (e) => Boolean(e.code && e.code.toUpperCase() === (n.code || "").toUpperCase())
        );
        return Boolean(emp && emp.unitId && emp.unitId.trim().toLowerCase() === targetUnit);
      });
      const matchedKey = Object.keys(cycle?.endorsed || {}).find(
        (k) => k.trim().toLowerCase() === targetUnit
      ) || u.id;
      const picks = (cycle?.endorsed || {})[matchedKey] || {};
      const endorsedCount = Object.keys(picks).filter((c) => picks[c]).length;
      const maxQuota = getMaxCategoriesForUnit(u.id);
      return {
        unit: u,
        appliedCount: unitNoms.length,
        endorsedCount,
        maxQuota,
        isFullQuota: endorsedCount >= maxQuota,
      };
    });
  }, [cycle?.nominations, cycle?.endorsed, activeUnits, allEmployees]);

  // 5. Leaderboard of Top 3 Depts by Titles Won
  const topDeptsLeaderboard = useMemo(() => {
    const deptWinsMap: Record<
      string,
      { unit: Unit; totalWins: number; winsList: Array<{ name: string; categoryTitle: string }> }
    > = {};

    activeUnits.forEach((u) => {
      deptWinsMap[u.id] = { unit: u, totalWins: 0, winsList: [] };
    });

    Object.values(points).forEach((pRecord) => {
      if (deptWinsMap[pRecord.unit] && pRecord.wins) {
        pRecord.wins.forEach((w) => {
          const catName = catById(w.category)?.name || w.category;
          deptWinsMap[pRecord.unit].totalWins += 1;
          deptWinsMap[pRecord.unit].winsList.push({ name: pRecord.name, categoryTitle: catName });
        });
      }
    });

    return Object.values(deptWinsMap)
      .sort((a, b) => b.totalWins - a.totalWins)
      .slice(0, 3);
  }, [points, activeUnits]);

  // --- HOD SPECIFIC CALCULATIONS ---
  const deptWinsList = useMemo(() => {
    const list: Array<{ name: string; categoryTitle: string; month?: string; score?: number; isWinner?: boolean }> = [];
    Object.values(points).forEach((pRecord) => {
      if (pRecord.unit === hodUnitId && pRecord.wins) {
        pRecord.wins.forEach((w) => {
          const catName = catById(w.category)?.name || w.category;
          list.push({ name: pRecord.name, categoryTitle: catName, month: w.month, score: w.score, isWinner: w.isWinner });
        });
      }
    });
    return list;
  }, [points, hodUnitId]);

  const deptWinsCount = deptWinsList.length;

  const deptNominations = useMemo(() => {
    if (!cycle?.nominations) return [];
    const targetUnit = (hodUnitId || "").trim().toLowerCase();
    return cycle.nominations.filter((n) => {
      const nomUnit = (n.unit || "").trim().toLowerCase();
      if (nomUnit && nomUnit === targetUnit) return true;
      const emp = allEmployees.find(
        (e) => Boolean(e.code && e.code.toUpperCase() === (n.code || "").toUpperCase())
      );
      return Boolean(emp && emp.unitId && emp.unitId.trim().toLowerCase() === targetUnit);
    });
  }, [cycle?.nominations, hodUnitId, allEmployees]);

  const usedPicks = cycle.endorsed[hodUnitId] || {};
  const maxHodQuota = getMaxCategoriesForUnit(hodUnitId);
  const endorsedCatCount = Object.keys(usedPicks).filter((c) => usedPicks[c]).length;
  const remainingEndorsements = Math.max(0, maxHodQuota - endorsedCatCount);

  // --- EMPLOYEE SPECIFIC CALCULATIONS ---
  const userNominations = useMemo(() => {
    if (!cycle?.nominations) return [];
    if (!userCode) return [];
    return cycle.nominations.filter(
      (n) => n.code.toUpperCase() === userCode || (userName && n.name.toLowerCase().trim() === userName.toLowerCase().trim())
    );
  }, [cycle?.nominations, userCode, userName]);

  const userPointRecord = (userCode && points[userCode]) || (userName && points[userName]) || null;
  const userCumulativePoints = userPointRecord?.points ?? 0;
  const userWinsList = userPointRecord?.wins ?? [];

  const isDeclared = cycle.stage === "announced";
  const categoryResults = useMemo(() => results(cycle), [cycle]);

  const activeCycleWins = useMemo(() => {
    if (!isDeclared || !categoryResults) return [];
    const winsArr: string[] = [];
    categoryResults.forEach((catRes) => {
      const winnerNom = catRes.ranked[0]?.nom;
      if (
        winnerNom &&
        (winnerNom.code.toUpperCase() === userCode ||
          winnerNom.name.toLowerCase().trim() === userName.toLowerCase().trim())
      ) {
        const title = catRes.slotLabel
          ? `${catRes.category.name} (${catRes.slotLabel})`
          : catRes.category.name;
        winsArr.push(title);
      }
    });
    return winsArr;
  }, [isDeclared, categoryResults, userCode, userName]);

  const allTitlesWon = useMemo(() => {
    const titles: Array<{ month?: string; categoryTitle: string; score?: number; isWinner?: boolean }> = [];
    userWinsList.forEach((w) => {
      const catName = catById(w.category)?.name || w.category;
      titles.push({ month: w.month, categoryTitle: catName, score: w.score, isWinner: w.isWinner });
    });
    activeCycleWins.forEach((wTitle) => {
      if (!titles.some((t) => t.categoryTitle === wTitle && t.month === cycle.month)) {
        titles.push({ month: cycle.month, categoryTitle: wTitle, isWinner: true });
      }
    });
    return titles;
  }, [userWinsList, activeCycleWins, cycle.month]);

  const totalWinsCount = allTitlesWon.length;

  // Timeline stage config
  const timelineStages = [
    {
      id: "nomination",
      name: "Submission",
      windowText: `${formatDatePretty(timeline.nomination.startDate)} – ${formatDatePretty(getEffectiveEndDate(timeline.nomination))}`,
      desc: "Self Nomination",
    },
    {
      id: "validation",
      name: "HOD Review",
      windowText: `${formatDatePretty(timeline.hodEndorsement.startDate)} – ${formatDatePretty(getEffectiveEndDate(timeline.hodEndorsement))}`,
      desc: "Endorsement & Validation",
    },
    {
      id: "judging",
      name: "Judging",
      windowText: `${formatDatePretty(timeline.panelScoring.startDate)} – ${formatDatePretty(getEffectiveEndDate(timeline.panelScoring))}`,
      desc: "Panel Scoring",
    },
    {
      id: "announced",
      name: "Winners",
      windowText: "15th of Month",
      desc: "Declaration",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Welcome Header Banner */}
      <div className="rounded-2xl border border-blue-900/10 bg-gradient-to-r from-[#0A2540] via-[#0F355C] to-[#0A2540] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-10 h-40 w-40 rounded-full bg-blue-400/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-sky-400/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-sky-200 backdrop-blur-md">
                <Sparkles size={13} className="text-sky-300" />
                <span>
                  {isAdmin
                    ? "MAHLE ANAND Filter System Admin Executive Dashboard"
                    : isHod
                      ? `HOD Dashboard — ${hodUnitObj?.name || hodUnitId}`
                      : "MAHLE ANAND Filter System Personal Dashboard"}
                </span>
              </div>

              {/* Panel Judge Appointment Badge */}
              {isPanelJudge && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-400/25 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-emerald-200 backdrop-blur-md shadow-sm">
                  <Award size={13} className="text-emerald-300 shrink-0" />
                  <span>Appointed Panel Judge</span>
                </div>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back, <span className="text-sky-300">{userName}</span>
            </h1>
            <p className="text-sm text-sky-100/80 leading-relaxed">
              {isAdmin
                ? "Executive overview of total nominations, department quota completions, panel judge assignments, and department leadership rankings."
                : isHod
                  ? `Manage employee nominations, review department entries, and track recognition awards won by ${hodUnitObj?.name || "your department"}.`
                  : "Track your applied nominations, cumulative reward points, and official award titles across MAHLE ANAND Filter System."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {isAdmin && (
              <button
                onClick={onNavigateToHr || onNavigateToNominate}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 px-5 py-3 text-xs font-bold uppercase tracking-wider text-blue-950 shadow-lg shadow-sky-500/20 hover:from-sky-300 hover:to-blue-400 hover:scale-[1.02] active:scale-95 transition-all duration-150"
              >
                <Sliders size={16} />
                <span>Open HR Admin Console</span>
              </button>
            )}

            {isHod && !isAdmin && (
              <button
                onClick={onNavigateToEndorse || onNavigateToNominate}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 px-5 py-3 text-xs font-bold uppercase tracking-wider text-blue-950 shadow-lg shadow-sky-500/20 hover:from-sky-300 hover:to-blue-400 hover:scale-[1.02] active:scale-95 transition-all duration-150"
              >
                <ShieldCheck size={16} />
                <span>Review &amp; Endorse Dept</span>
              </button>
            )}

            {isPanelJudge && (
              <button
                onClick={onNavigateToJudge || onNavigateToNominate}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 px-4 py-3 text-xs font-bold uppercase tracking-wider text-teal-950 shadow-lg shadow-emerald-500/20 hover:from-emerald-300 hover:to-teal-400 hover:scale-[1.02] active:scale-95 transition-all duration-150"
              >
                <Scale size={16} />
                <span>Panel Scoring Console</span>
              </button>
            )}

            {!isAdmin && !isHod && !isPanelJudge && (
              <button
                onClick={onNavigateToNominate}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 px-5 py-3 text-xs font-bold uppercase tracking-wider text-blue-950 shadow-lg shadow-sky-500/20 hover:from-sky-300 hover:to-blue-400 hover:scale-[1.02] active:scale-95 transition-all duration-150"
              >
                <PlusCircle size={16} />
                <span>Apply / Nominate Now</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Special Panel Judge Appointment Card */}
      {isPanelJudge && (
        <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-50 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shadow-sm">
                <Scale size={22} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-extrabold text-emerald-950 tracking-tight">
                    Panel Judging Committee Member
                  </h4>
                  <span className="rounded-full bg-emerald-200/80 border border-emerald-400/40 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-900 uppercase tracking-wider shadow-2xs">
                    Appointed by Admin
                  </span>
                </div>
                <p className="text-xs text-emerald-900/80 leading-relaxed">
                  You are appointed to the 3-member judging panel. You can evaluate and score endorsed entries during the <strong>Panel Scoring window (10th – 12th)</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={onNavigateToJudge || onNavigateToNominate}
              className="inline-flex items-center justify-center gap-1.5 shrink-0 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-emerald-900 active:scale-95 transition-all"
            >
              <Scale size={14} /> Open Panel Scoring
            </button>
          </div>
        </div>
      )}

      {/* 2. Top Summary Metric Cards */}
      {isAdmin ? (
        /* ADMIN SPECIFIC TOP CARDS (Total Nominations, HOD Quota Completion, Judges Assigned & Names) */
        <div className="grid gap-5 md:grid-cols-3">
          {/* Card 1: TOTAL NOMINATIONS */}
          <Card className="p-6 transition-all duration-200 hover:shadow-md hover:border-blue-900/20 relative overflow-hidden bg-white">
            <div className="flex items-center justify-between border-b border-blue-900/5 pb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-900/60">
                TOTAL NOMINATIONS
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
                <ClipboardList size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-blue-950">
                {totalCompanyNominations}
              </span>
              <span className="text-xs font-semibold text-blue-900/60">
                Total Applied Entries
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-blue-900/60 font-medium">
              <span>All 14 Units Submissions</span>
              <span className="font-semibold text-indigo-600">
                Active Month ({cycle.month})
              </span>
            </div>
          </Card>

          {/* Card 2: HOD QUOTA COMPLETED */}
          <Card className="p-6 transition-all duration-200 hover:shadow-md hover:border-blue-900/20 relative overflow-hidden bg-white">
            <div className="flex items-center justify-between border-b border-blue-900/5 pb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-900/60">
                HOD QUOTA COMPLETED
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
                <ShieldCheck size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-blue-950">
                {deptsQuotaCompletedCount}
                <span className="text-base font-bold text-slate-400"> / {activeUnits.length}</span>
              </span>
              <span className="text-xs font-semibold text-blue-900/60">
                Depts Filled Quota
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-blue-900/60 font-medium">
              <span>Depts Completed Quota Pushes</span>
              <span className="font-semibold text-sky-700">
                {Math.round((deptsQuotaCompletedCount / (activeUnits.length || 1)) * 100)}% Rate
              </span>
            </div>
          </Card>

          {/* Card 3: JUDGES ASSIGNED & PANEL NAMES */}
          <Card className="p-6 transition-all duration-200 hover:shadow-md hover:border-blue-900/20 relative overflow-hidden bg-white">
            <div className="flex items-center justify-between border-b border-blue-900/5 pb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-900/60">
                PANEL JUDGES ASSIGNED
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Scale size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-blue-950">
                {assignedJudges.length}
              </span>
              <span className="text-xs font-semibold text-blue-900/60">
                Assigned Judges
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-blue-900/60 font-medium truncate">
              <span className="truncate" title={assignedJudgesNamesText}>
                {assignedJudgesNamesText}
              </span>
            </div>
          </Card>
        </div>
      ) : isHod ? (
        /* HOD SPECIFIC TOP CARDS */
        <div className="grid gap-5 md:grid-cols-3">
          <Card className="p-6 transition-all duration-200 hover:shadow-md hover:border-blue-900/20 bg-white">
            <div className="flex items-center justify-between border-b border-blue-900/5 pb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-900/60">
                DEPARTMENT APPLICANTS
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                <Building2 size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-blue-950">
                {deptNominations.length}
              </span>
              <span className="text-xs font-semibold text-blue-900/60">
                Applied Entries
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-blue-900/60 font-medium">
              <span>Active Cycle Submissions</span>
              <span className="font-semibold text-indigo-600">
                {cycle.stage === "nomination" ? "Submission Open" : "Under HOD Review"}
              </span>
            </div>
          </Card>

          {/* Card 3: REMAINING ENDORSEMENTS */}
          <Card className="p-6 transition-all duration-200 hover:shadow-md hover:border-blue-900/20 relative overflow-hidden bg-white">
            <div className="flex items-center justify-between border-b border-blue-900/5 pb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-900/60">
                REMAINING ENDORSEMENTS
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <ShieldCheck size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-blue-950">
                {remainingEndorsements}
              </span>
              <span className="text-xs font-semibold text-blue-900/60">
                Remaining Pushes
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-blue-900/60 font-medium">
              <span>Used {endorsedCatCount} of {maxHodQuota} Quota</span>
              <span className={`font-semibold ${remainingEndorsements > 0 ? "text-emerald-600" : "text-slate-500"}`}>
                {remainingEndorsements > 0 ? "Quota Available" : "Completed"}
              </span>
            </div>
          </Card>
        </div>
      ) : (
        /* EMPLOYEE SPECIFIC TOP CARDS */
        <div className="grid gap-5 md:grid-cols-3">
          {/* Card 1: CUMULATIVE POINTS */}
          <Card className="p-6 transition-all duration-200 hover:shadow-md hover:border-blue-900/20 relative overflow-hidden bg-white">
            <div className="flex items-center justify-between border-b border-blue-900/5 pb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-900/60">
                CUMULATIVE POINTS
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
                <Zap size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-blue-950">
                {userCumulativePoints.toLocaleString("en-IN")}
              </span>
              <span className="text-sm font-extrabold text-sky-600 uppercase tracking-wider">
                Pts
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-blue-900/60 font-medium">
              <span>My Personal Points</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                <TrendingUp size={12} /> Active Points
              </span>
            </div>
          </Card>

          {/* Card 2: MY APPLIED AWARDS */}
          <Card className="p-6 transition-all duration-200 hover:shadow-md hover:border-blue-900/20 relative overflow-hidden bg-white">
            <div className="flex items-center justify-between border-b border-blue-900/5 pb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-900/60">
                MY APPLIED AWARDS
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
                <ClipboardList size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-blue-950">
                {userNominations.length}
              </span>
              <span className="text-xs font-semibold text-blue-900/60">
                My Applied Nominations
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-blue-900/60 font-medium">
              <span>Active Recognition Cycle</span>
              <span className="font-semibold text-indigo-600">
                {cycle.stage === "nomination" ? "Submission Open" : cycle.stage === "announced" ? "Completed" : "Under Evaluation"}
              </span>
            </div>
          </Card>

          {/* Card 3: AWARDS WON BY EMPLOYEE */}
          <Card className="p-6 transition-all duration-200 hover:shadow-md hover:border-blue-900/20 relative overflow-hidden bg-white">
            <div className="flex items-center justify-between border-b border-blue-900/5 pb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-900/60">
                AWARDS WON
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Trophy size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-blue-950">
                {totalWinsCount}
              </span>
              <span className="text-xs font-semibold text-blue-900/60">
                Titles Won
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-blue-900/60 font-medium">
              <span>
                {totalWinsCount > 0 ? (
                  <span className="font-bold text-amber-700 truncate max-w-[170px] inline-block">
                    Latest: {allTitlesWon[allTitlesWon.length - 1].categoryTitle}
                  </span>
                ) : (
                  "No Awards Won Yet"
                )}
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 shrink-0">
                <Medal size={12} /> Panel Avg Pts
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* 3. Recognition Cycle Status (Common Timeline Stepper Card) */}
      <Card className="p-6 border border-blue-900/10 shadow-sm bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-900/10 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-blue-950">
              Recognition Cycle Status
            </h2>
            <p className="text-xs text-blue-900/60">
              Current progress and timeline milestones for the active cycle.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-900/10 px-3 py-1.5 text-xs font-bold text-blue-900">
            <Clock size={14} className="text-blue-800" />
            <span>Cycle Stage: <strong className="text-blue-950 uppercase">{cycle.stage}</strong></span>
          </div>
        </div>

        {/* Stepper Visual Timeline Bar */}
        <div className="mt-8 mb-4 px-2 sm:px-6">
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0">
            <div className="hidden md:block absolute top-5 left-8 right-8 h-1 bg-blue-100 rounded-full -z-0">
              <div
                className="h-full bg-gradient-to-r from-blue-700 via-sky-500 to-blue-800 transition-all duration-500 rounded-full"
                style={{
                  width: `${(stageIdx / (timelineStages.length - 1)) * 100}%`,
                }}
              />
            </div>

            {timelineStages.map((stg, i) => {
              const isPassed = i < stageIdx;
              const isCurrent = i === stageIdx;

              return (
                <div
                  key={stg.id}
                  className="relative z-10 flex md:flex-col items-center gap-4 md:gap-2 text-left md:text-center w-full md:w-1/4"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 font-bold transition-all duration-300 shadow-sm ${isPassed
                      ? "border-blue-800 bg-blue-800 text-white shadow-blue-900/20"
                      : isCurrent
                        ? "border-sky-500 bg-white text-sky-600 ring-4 ring-sky-100 shadow-md scale-110"
                        : "border-gray-200 bg-gray-50 text-gray-400"
                      }`}
                  >
                    {isPassed ? (
                      <Check size={18} className="stroke-[3]" />
                    ) : isCurrent ? (
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-600" />
                      </span>
                    ) : (
                      <span className="text-xs font-semibold">{i + 1}</span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <h4
                      className={`text-xs font-bold tracking-tight ${isCurrent
                        ? "text-blue-950 font-extrabold text-sm"
                        : isPassed
                          ? "text-blue-900"
                          : "text-gray-400"
                        }`}
                    >
                      {stg.name}
                    </h4>
                    <p className="text-[11px] font-medium text-blue-900/60 block">
                      {stg.desc}
                    </p>
                    <span
                      className={`inline-block mt-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isPassed
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : isCurrent
                          ? "bg-sky-100 text-sky-900 border border-sky-300"
                          : "bg-gray-100 text-gray-500"
                        }`}
                    >
                      {isPassed ? "Completed" : isCurrent ? "In Progress" : "Pending"}
                    </span>
                    <p className="text-[10px] font-mono text-blue-900/50 pt-0.5 block">
                      {stg.windowText}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* 4. Lower Dashboard Section (Role-Based Layouts) */}
      {isAdmin ? (
        /* ADMIN SPECIFIC LOWER SECTION (Stacked Vertically: Dept-Wise Applied List Top, Top 3 Dept Leaderboard Bottom) */
        <div className="space-y-6">
          {/* Top Section: Department-Wise Applied Employee Count & Status List */}
          <Card className="p-6 border border-blue-900/10 shadow-sm bg-white">
            <div className="flex items-center justify-between border-b border-blue-900/10 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900/10 text-blue-900">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-blue-950">
                    Department-Wise Applied Employee List
                  </h3>
                  <p className="text-xs text-blue-900/60">
                    Employee submission counts and HOD endorsement status across all 14 units.
                  </p>
                </div>
              </div>
              <button
                onClick={onNavigateToHr || onNavigateToNominate}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-900/15 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-900 hover:bg-blue-100 transition"
              >
                <Sliders size={14} /> HR Admin Console
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {deptStatsList.map((st) => (
                <div
                  key={st.unit.id}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 hover:border-slate-300 hover:bg-slate-50 transition space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                    <div>
                      <strong className="block text-xs font-bold text-blue-950">
                        {st.unit.name}
                      </strong>
                    </div>
                    <span className="rounded-full bg-blue-900/10 px-2.5 py-0.5 text-xs font-bold text-blue-900">
                      {st.appliedCount} {st.appliedCount === 1 ? "Nominee" : "Nominees"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 pt-1">
                    <span>HOD Quota:</span>
                    {st.isFullQuota ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                        <CheckCircle2 size={12} /> Quota Filled ({st.endorsedCount}/{st.maxQuota})
                      </span>
                    ) : st.endorsedCount > 0 ? (
                      <span className="font-semibold text-sky-700">
                        Partial ({st.endorsedCount}/{st.maxQuota})
                      </span>
                    ) : (
                      <span className="text-amber-700 font-semibold">
                        0/{st.maxQuota} Endorsed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Bottom Section: Leaderboard of Top 3 Depts by Titles Won */}
          <Card className="p-6 border border-blue-900/10 shadow-sm bg-white">
            <div className="flex items-center justify-between border-b border-blue-900/10 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-amber-500" />
                <h3 className="text-base font-bold text-blue-950">
                  Top 3 Departments Leaderboard (Titles Won)
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900/50">
                Department Rankings
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {topDeptsLeaderboard.map((dept, idx) => (
                <div
                  key={dept.unit.id}
                  className={`rounded-2xl border p-5 transition space-y-3 ${idx === 0
                    ? "border-amber-300 bg-amber-50/60 shadow-xs ring-1 ring-amber-300/50"
                    : idx === 1
                      ? "border-slate-300 bg-slate-50/80 shadow-2xs"
                      : "border-amber-700/30 bg-amber-950/[0.02]"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${idx === 0
                          ? "bg-amber-400 text-amber-950 shadow-xs"
                          : idx === 1
                            ? "bg-slate-300 text-slate-900"
                            : "bg-amber-700/30 text-amber-900"
                          }`}
                      >
                        #{idx + 1}
                      </span>
                      <div>
                        <strong className="block text-sm font-extrabold text-blue-950">
                          {dept.unit.name}
                        </strong>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block text-base font-black text-blue-950">
                        {dept.totalWins} {dept.totalWins === 1 ? "Win" : "Wins"}
                      </span>
                    </div>
                  </div>

                  {/* Titles List snippet */}
                  {dept.winsList.length > 0 && (
                    <div className="border-t border-slate-200/60 pt-2.5 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Recent Award Titles:
                      </span>
                      <div className="space-y-1">
                        {dept.winsList.slice(0, 3).map((w, wIdx) => (
                          <div key={wIdx} className="text-xs text-slate-700 flex items-center justify-between gap-2">
                            <span className="font-semibold text-blue-950 truncate">
                              {w.categoryTitle}
                            </span>
                            <span className="text-[10px] text-slate-500 italic shrink-0">
                              ({w.name.split(" ")[0]})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : isHod ? (
        /* HOD SPECIFIC APPLIED NOMINATIONS & DEPT WINS SHOWCASE (Stacked Up-Down) */
        <div className="space-y-6 flex flex-col">
          <Card className="p-6 border border-blue-900/10 shadow-sm bg-white">
            <div className="flex items-center justify-between border-b border-blue-900/10 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900/10 text-blue-900">
                  <History size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-blue-950">
                    Department Applied Nominations
                  </h3>
                  <p className="text-xs text-blue-900/60">
                    Nominations submitted by employees in {hodUnitObj?.name || hodUnitId} for active evaluation.
                  </p>
                </div>
              </div>
              <button
                onClick={onNavigateToEndorse || onNavigateToNominate}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-900/15 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-900 hover:bg-blue-100 transition"
              >
                <ShieldCheck size={14} /> Manage Endorsements
              </button>
            </div>

            {deptNominations.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-900/40">
                  <History size={24} />
                </div>
                <h4 className="text-sm font-bold text-blue-950">
                  No department entries submitted yet
                </h4>
                <p className="text-xs text-blue-900/60 max-w-sm mx-auto">
                  Employees in your department have not applied for nominations in this cycle yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {deptNominations.map((nom) => {
                  const cat = catById(nom.category);
                  const isEndorsed = usedPicks[nom.category] === nom.id;

                  return (
                    <div
                      key={nom.id}
                      className="rounded-xl border border-blue-900/10 bg-blue-950/[0.01] p-4 hover:border-blue-900/20 transition duration-150 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-900/5 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-900 uppercase">
                            {cat?.name || nom.category}
                          </span>
                          <h4 className="text-sm font-bold text-blue-950">
                            {nom.name}
                          </h4>
                          <span className="text-xs font-mono text-blue-900/50">
                            ({nom.code})
                          </span>
                        </div>
                        <div>
                          {isEndorsed ? (
                            <Pill tone="good">
                              <CheckCircle2 size={11} className="inline mr-1" /> HOD Endorsed
                            </Pill>
                          ) : (
                            <Pill tone="warn">Pending Endorsement</Pill>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-blue-900/80 line-clamp-2 italic bg-white p-2.5 rounded-lg border border-blue-900/5">
                        &ldquo;{nom.citation}&rdquo;
                      </p>

                      <div className="flex items-center justify-between text-[11px] font-mono text-blue-900/50 pt-1">
                        <span>Unit: {hodUnitObj?.name || nom.unit}</span>
                        <span>Submitted: {new Date(nom.submittedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-6 border border-blue-900/10 shadow-sm bg-white">
            <div className="flex items-center justify-between border-b border-blue-900/10 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-amber-500" />
                <h3 className="text-base font-bold text-blue-950">
                  Dept Wins History
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900/50">
                {hodUnitObj?.name || hodUnitId}
              </span>
            </div>

            <div className="space-y-3">
              {deptWinsList.length === 0 ? (
                <div className="text-center py-8 px-2 text-xs text-blue-900/60 space-y-2">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                    <Trophy size={20} />
                  </div>
                  <p className="font-semibold text-blue-950">No Wins Recorded Yet</p>
                  <p className="text-[11px] text-blue-900/50 leading-relaxed">
                    Department wins are listed here when official results are declared by Admin.
                  </p>
                </div>
              ) : (
                deptWinsList.map((item, idx) => (
                  <div
                    key={`${item.name}-${idx}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-amber-200/60 bg-amber-50/40 hover:bg-amber-50/80 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/20 text-amber-700">
                        <Trophy size={16} />
                      </div>
                      <div>
                        <strong className="block text-xs font-bold text-blue-950">
                          {item.name}
                        </strong>
                        <span className="text-[10px] font-medium text-slate-500">
                          {item.categoryTitle}
                        </span>
                      </div>
                    </div>
                    <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-900 uppercase border border-amber-300/40">
                      +{item.score !== undefined ? item.score.toFixed(1) : ""} Pts
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      ) : (
        /* EMPLOYEE SPECIFIC APPLIED NOMINATIONS & TITLES WON (Stacked Up-Down) */
        <div className="space-y-6 flex flex-col">
          <Card className="p-6 border border-blue-900/10 shadow-sm bg-white">
            <div className="flex items-center justify-between border-b border-blue-900/10 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900/10 text-blue-900">
                  <History size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-blue-950">
                    My Applied Awards &amp; Activity
                  </h3>
                  <p className="text-xs text-blue-900/60">
                    Status of nominations submitted by you in the current cycle.
                  </p>
                </div>
              </div>
              <button
                onClick={onNavigateToNominate}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-900/15 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-900 hover:bg-blue-100 transition"
              >
                <PlusCircle size={14} /> New Entry
              </button>
            </div>

            {userNominations.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-900/40">
                  <History size={28} />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h4 className="text-base font-bold text-blue-950">
                    No recent activity
                  </h4>
                  <p className="text-xs text-blue-900/60 leading-relaxed">
                    You have not submitted a nomination in the active recognition cycle yet. Nominate yourself or a colleague to participate in this month&apos;s recognition awards.
                  </p>
                </div>
                <div>
                  <button
                    onClick={onNavigateToNominate}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0A2540] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-blue-900 active:scale-95 transition-all"
                  >
                    New Nomination
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {userNominations.map((nom) => {
                  const cat = catById(nom.category);
                  const isEndorsed = cycle.endorsed[nom.unit]?.[nom.category] === nom.id;

                  return (
                    <div
                      key={nom.id}
                      className="rounded-xl border border-blue-900/10 bg-blue-950/[0.01] p-4 hover:border-blue-900/20 transition duration-150 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-900/5 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-900 uppercase">
                            {cat?.name || nom.category}
                          </span>
                          <h4 className="text-sm font-bold text-blue-950">
                            {nom.name}
                          </h4>
                          <span className="text-xs font-mono text-blue-900/50">
                            ({nom.code})
                          </span>
                        </div>
                        <div>
                          {isEndorsed ? (
                            <Pill tone="good">
                              <CheckCircle2 size={11} className="inline mr-1" /> HOD Endorsed
                            </Pill>
                          ) : nom.validated === false ? (
                            <Pill tone="warn">Under HR Review</Pill>
                          ) : (
                            <Pill tone="muted">Submission Received</Pill>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-blue-900/80 line-clamp-2 italic bg-white p-2.5 rounded-lg border border-blue-900/5">
                        &ldquo;{nom.citation}&rdquo;
                      </p>

                      <div className="flex items-center justify-between text-[11px] font-mono text-blue-900/50 pt-1">
                        <span>Unit: {unitById(nom.unit)?.name || nom.unit}</span>
                        <span>Submitted: {new Date(nom.submittedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-6 border border-blue-900/10 shadow-sm bg-white">
            <div className="flex items-center justify-between border-b border-blue-900/10 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Award size={18} className="text-amber-500" />
                <h3 className="text-base font-bold text-blue-950">
                  My Awards &amp; Titles Won
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900/50">
                Titles
              </span>
            </div>

            <div className="space-y-3">
              {allTitlesWon.length === 0 ? (
                <div className="text-center py-8 px-2 text-xs text-blue-900/60 space-y-2">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                    <Trophy size={20} />
                  </div>
                  <p className="font-semibold text-blue-950">No Awards Won Yet</p>
                  <p className="text-[11px] text-blue-900/50 leading-relaxed">
                    Participate in active recognition cycles. Winning an award earns <strong>points from panel evaluations</strong> toward year-end LSIP awards!
                  </p>
                </div>
              ) : (
                allTitlesWon.map((item, idx) => (
                  <div
                    key={`${item.categoryTitle}-${idx}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-amber-200/60 bg-amber-50/40 hover:bg-amber-50/80 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/20 text-amber-700">
                        <Trophy size={16} />
                      </div>
                      <div>
                        <strong className="block text-xs font-bold text-blue-950">
                          {item.categoryTitle}
                        </strong>
                        <span className="text-[10px] font-mono text-blue-900/50">
                          {item.month ? `Cycle: ${item.month}` : "Official Winner"}
                        </span>
                      </div>
                    </div>
                    <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-900 uppercase border border-amber-300/40">
                      +{item.score !== undefined ? item.score.toFixed(1) : ""} Pts
                    </span>
                  </div>
                ))
              )}

              <div className="pt-2 border-t border-blue-900/5 text-center">
                <span className="text-[11px] text-blue-900/60">
                  Cumulative Points Balance: <strong>{userCumulativePoints} Pts</strong>
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DashboardView;
