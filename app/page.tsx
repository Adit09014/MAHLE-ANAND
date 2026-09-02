"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  ShieldCheck,
  Scale,
  Trophy,
  RefreshCw,
  AlertTriangle,
  LogOut,
  UserCheck,
  Lock,
  Award,
  Key,
  X,
  CheckCircle2,
  Calendar,
  HelpCircle,
  BookOpen,
  FileText,
  Calculator,
  Menu,
  Bell,
  Settings,
} from "lucide-react";
import { UNITS, STAGES, POINTS, getDynamicUnits } from "../lib/constants";
import { emptyCycle, getCycleTimeline, getEffectiveEndDate, formatDatePretty } from "../lib/helpers";
import { loadCycle, saveCycle, loadBranding, loadPoints } from "../lib/storage";
import { getAuthSession, logoutUser } from "../lib/auth";
import { Cycle, PointsState, Branding, Role, AuthUser } from "../lib/types";
import BrandMark from "../components/BrandMark";
import DashboardView from "../views/DashboardView";
import NominateView from "../views/NominateView";
import HodView from "../views/HodView";
import JudgeView from "../views/JudgeView";
import HrView from "../views/HrView";
import ResultsView from "../views/ResultsView";
import SettingsView from "../views/SettingsView";

export type TabId = "dashboard" | Role | "results" | "settings";

export default function RRAdmin() {
  const router = useRouter();
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [month, setMonth] = useState(thisMonth);
  const [cycle, setCycle] = useState<Cycle>(emptyCycle(thisMonth));
  const [points, setPoints] = useState<PointsState>({});
  const [brand, setBrand] = useState<Branding>({ logoUrl: "" });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [role, setRole] = useState<TabId>("dashboard");
  const [asUnit, setAsUnit] = useState("HR");
  const [asJudge, setAsJudge] = useState("j1");

  // Mobile menu & Help Center state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const [allEmployees, setAllEmployees] = useState<Array<{ unitId?: string }>>([]);

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

  const dynamicUnits = useMemo(() => getDynamicUnits(allEmployees), [allEmployees]);

  const monthOptions = useMemo(() => {
    const opts = [];
    const d = new Date();
    // 1 current + 6 future = 7 iterations. No past months.
    for (let i = 0; i < 7; i++) {
      const year = d.getFullYear();
      const m = d.getMonth() + 1;
      const val = `${year}-${String(m).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      opts.push({ value: val, label });
      d.setMonth(d.getMonth() + 1);
    }
    return opts;
  }, []);

  // Load session from cookie and set RBAC role defaults
  useEffect(() => {
    async function checkAuth() {
      const session = await getAuthSession();
      if (session.authenticated && session.user) {
        setCurrentUser(session.user);
        if (session.user.unitId) setAsUnit(session.user.unitId);
        if (session.user.judgeId) setAsJudge(session.user.judgeId);
      } else {
        router.replace("/login");
      }
    }
    checkAuth();
  }, []);

  const refresh = useCallback(async (m: string, silent = false) => {
    if (!silent) setLoading(true);
    setErr(null);
    try {
      const [c, p, b] = await Promise.all([
        loadCycle(m),
        loadPoints(),
        loadBranding(),
      ]);
      setCycle(c);
      setPoints(p);
      setBrand(b);
    } catch (e) {
      if (!silent) setErr("Couldn't reach shared storage. Try refreshing the cycle.");
    }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    refresh(month);
  }, [month, refresh]);

  // Auto-sync cycle data periodically in the background (every 8s) and on window focus
  useEffect(() => {
    const interval = setInterval(() => {
      refresh(month, true);
    }, 8000);

    const onFocus = () => refresh(month, true);
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [month, refresh]);

  const handleLogout = async () => {
    await logoutUser();
    router.push("/login");
    router.refresh();
  };

  const commit = async (next: Cycle) => {
    setCycle(next);
    try {
      // Always fetch the latest DB state first to avoid overwriting concurrent changes
      const fresh = await loadCycle(next.month);
      
      // Merge: use the fresh DB data as baseline, overlay only the fields that changed
      const merged: Cycle = {
        ...fresh,
        stage: next.stage,
        judges: next.judges,
        timeline: next.timeline,
        announcedAt: next.announcedAt !== undefined ? next.announcedAt : fresh.announcedAt,
      };

      // Merge nominations: prefer the version with more recent submittedAt, keep all
      const nomMap = new Map<string, any>();
      (fresh.nominations || []).forEach((n: any) => nomMap.set(n.id, n));
      (next.nominations || []).forEach((n: any) => {
        const existing = nomMap.get(n.id);
        if (!existing) {
          nomMap.set(n.id, n);
        } else {
          // Keep whichever has the later submittedAt, or the incoming one
          const existTs = new Date(existing.submittedAt || 0).getTime();
          const nextTs = new Date(n.submittedAt || 0).getTime();
          nomMap.set(n.id, nextTs >= existTs ? n : existing);
        }
      });
      merged.nominations = Array.from(nomMap.values());

      // Merge endorsed: for units the incoming payload explicitly touches, incoming is
      // authoritative (allows withdrawals). For units NOT in incoming, keep DB values
      // (prevents stale Admin state from wiping HOD endorsements).
      const mergedEndorsed: Record<string, Record<string, string>> = {};
      // Start with fresh DB endorsements for ALL units
      if (fresh.endorsed) {
        Object.keys(fresh.endorsed).forEach((uId) => {
          mergedEndorsed[uId] = { ...(fresh.endorsed[uId] || {}) };
        });
      }
      // For units explicitly in the incoming payload, REPLACE with incoming.
      // Withdrawal signals (empty strings) are passed through to the server.
      if (next.endorsed) {
        Object.keys(next.endorsed).forEach((uId) => {
          mergedEndorsed[uId] = { ...(next.endorsed[uId] || {}) };
        });
      }
      merged.endorsed = mergedEndorsed;

      // Merge scores: combine scores, process -1 as a deletion signal
      const mergedScores: Record<string, Record<string, number>> = { ...(fresh.scores || {}) };
      if (next.scores) {
        Object.keys(next.scores).forEach((nomId) => {
          const incoming = next.scores[nomId] || {};
          const existing = mergedScores[nomId] || {};
          const combined = { ...existing, ...incoming };
          
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
      merged.scores = mergedScores;

      setCycle(merged);
      const saved = await saveCycle(merged);
      if (saved) {
        setCycle(saved);
      }
      setErr(null);
    } catch (e) {
      setErr("That change didn't save. Refresh the cycle and try again.");
    }
  };

  const locked = cycle.stage === "announced";

  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString(
    "en-IN",
    { month: "long", year: "numeric" }
  );

  // All potential tabs matching reference UI naming & icons
  const allTabs: Array<{ id: TabId; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "employee", label: "Self Nomination", icon: ClipboardList },
    { id: "hod", label: "HOD Endorsements", icon: ShieldCheck },
    { id: "judge", label: "Panel Scoring", icon: Scale },
    { id: "results", label: "Result", icon: Award },
    { id: "hr", label: "HR Console", icon: Trophy },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  // Check if current user is an appointed panel judge for this cycle in real time (live)
  const isAppointedJudgeInCycle = Boolean(
    currentUser &&
    cycle?.judges?.some(
      (j) =>
        (j.code && j.code.trim().toUpperCase() === currentUser.code?.trim().toUpperCase()) ||
        (j.name && currentUser.name && j.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
    )
  );

  const isPanelJudge = Boolean(currentUser?.isPanelJudge) || isAppointedJudgeInCycle;
  const isAdmin = Boolean(currentUser?.isAdmin) || currentUser?.role === "admin";
  const isHOD = Boolean(currentUser?.isHOD) || currentUser?.role === "hod";

  const allowedRoles: TabId[] = currentUser
    ? isAdmin
      ? isHOD
        ? ["dashboard", "hod", "judge", "results", "hr", "settings"]
        : ["dashboard", "employee", "hod", "judge", "results", "hr", "settings"]
      : isHOD
        ? isPanelJudge
          ? ["dashboard", "hod", "judge", "results", "settings"]
          : ["dashboard", "hod", "results", "settings"]
        : isPanelJudge
          ? ["dashboard", "employee", "judge", "results", "settings"]
          : ["dashboard", "employee", "results", "settings"]
    : ["dashboard", "employee", "results", "settings"];

  const visibleTabs = allTabs.filter((t) => allowedRoles.includes(t.id));
  const activeRole = allowedRoles.includes(role) ? role : allowedRoles[0];

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-blue-950 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between bg-[#0A2540] text-white p-4 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <BrandMark url={brand.logoUrl} className="h-7 max-w-[110px]" />
          <span className="font-bold text-sm tracking-tight text-white">MAHLE ANAND Filter System</span>
        </div>
        {currentUser && (
          <span className="text-xs font-semibold bg-white/10 px-2.5 py-1 rounded-full text-sky-200">
            {currentUser.name.split(" ")[0]}
          </span>
        )}
      </div>

      {/* Backdrop overlay for mobile menu */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-xs"
        />
      )}

      {/* Left Sidebar Navigation Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 min-w-[16rem] max-w-[16rem] shrink-0 grow-0 bg-white border-r border-slate-200/80 flex flex-col justify-between transition-transform duration-200 shadow-lg md:shadow-none md:sticky md:top-0 md:h-screen md:translate-x-0 overflow-y-auto ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top Header & Navigation Section */}
        <div>
          {/* Brand Header */}
          <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex flex-col gap-2 shrink-0">
            <BrandMark url={brand.logoUrl} className="h-9 max-w-full w-auto" />
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-blue-950 leading-tight">
                MAHLE ANAND Filter System
              </h1>
              <p className="text-[11px] font-medium text-slate-400">
                Corporate Rewards
              </p>
            </div>
          </div>

          {/* Nav Menu Links */}
          <nav className="p-4 space-y-1.5">
            {visibleTabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeRole === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setRole(t.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 ${
                    isActive
                      ? "bg-sky-100/70 text-blue-950 shadow-xs border border-sky-200/60"
                      : "text-slate-600 hover:bg-slate-50 hover:text-blue-950"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-blue-700 shrink-0" : "text-slate-400 shrink-0"} />
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Options */}
        <div className="p-4 border-t border-slate-100 space-y-1 shrink-0">
          {/* Instructions & Guidelines */}
          <button
            onClick={() => {
              setShowHelpModal(true);
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-semibold whitespace-nowrap text-slate-600 hover:bg-slate-50 hover:text-blue-950 rounded-xl transition-all"
          >
            <BookOpen size={18} className="text-slate-400 shrink-0" />
            <span className="truncate">Instructions</span>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-bold whitespace-nowrap text-slate-600 hover:bg-red-50 hover:text-red-700 rounded-xl transition-all"
          >
            <LogOut size={18} className="text-slate-400 shrink-0" />
            <span className="truncate">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Right Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          {/* Left Side: Unit/Judge Selectors & Active Stage */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Unit selector for HOD or Admin */}
            {activeRole === "hod" && (
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <select
                    value={asUnit}
                    onChange={(e) => setAsUnit(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-950 shadow-xs outline-none focus:border-blue-700"
                  >
                    {dynamicUnits.map((u: { id: string; name: string }) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-950 shadow-xs">
                    {asUnit}
                  </div>
                )}
                {!isAdmin && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                    <Lock size={12} /> Assigned Unit
                  </span>
                )}
              </div>
            )}

            {/* Judge position selector for Judge or HR */}
            {activeRole === "judge" && (
              <div className="flex items-center gap-2">
                <select
                  value={asJudge}
                  disabled={currentUser?.role === "judge" || currentUser?.isPanelJudge}
                  onChange={(e) => setAsJudge(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-950 shadow-xs"
                >
                  {cycle.judges.map((j, i) => (
                    <option key={j.id} value={j.id}>
                      {j.name ? j.name : `Judge ${i + 1} (unnamed)`}
                    </option>
                  ))}
                </select>
                {(currentUser?.role === "judge" || currentUser?.isPanelJudge) && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                    <Lock size={12} /> Assigned Slot
                  </span>
                )}
              </div>
            )}

            {/* Top Bar Controls */}

            <button
              onClick={() => refresh(month)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-50 shadow-xs active:scale-95 transition-all"
              title="Refresh cycle data"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          {/* Right Side: User Profile */}
          <div className="flex items-center gap-3">
            {currentUser && (
              <div
                onClick={() => setRole("settings")}
                className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-slate-50/80 px-3.5 py-1.5 text-xs text-blue-950 shadow-xs cursor-pointer hover:bg-slate-100 transition"
                title="View Settings & Profile"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-900 text-white font-bold text-xs uppercase">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="flex flex-col leading-tight">
                  <div className="flex items-center gap-1.5">
                    <strong className="font-bold text-blue-950 text-xs">{currentUser.name}</strong>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">
                    {currentUser.designation || currentUser.role}
                  </span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main View Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-5 md:p-8">
          {err && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {err}
            </div>
          )}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
              <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-blue-700 animate-spin" />
              <p className="text-sm font-medium text-slate-500">Loading {monthLabel} cycle…</p>
            </div>
          ) : (
            <>
              {activeRole === "dashboard" && (
                <DashboardView
                  cycle={cycle}
                  points={points}
                  currentUser={currentUser || undefined}
                  onNavigateToNominate={() => setRole("employee")}
                  onNavigateToEndorse={() => setRole("hod")}
                  onNavigateToJudge={() => setRole("judge")}
                  onNavigateToHr={() => setRole("hr")}
                />
              )}
              {activeRole === "employee" && (
                <NominateView
                  cycle={cycle}
                  commit={commit}
                  currentUser={currentUser}
                  locked={locked}
                  month={month}
                  setMonth={setMonth}
                  monthOptions={monthOptions}
                />
              )}
              {activeRole === "hod" && (
                <HodView
                  unitId={asUnit}
                  cycle={cycle}
                  commit={commit}
                  locked={locked}
                  readOnly={currentUser?.role === "hr" || currentUser?.role === "admin"}
                  month={month}
                  setMonth={setMonth}
                  monthOptions={monthOptions}
                />
              )}
              {activeRole === "judge" && (
                <JudgeView
                  judgeId={asJudge}
                  cycle={cycle}
                  commit={commit}
                  locked={locked}
                  currentUser={currentUser}
                />
              )}
              {activeRole === "hr" && (
                <HrView
                  cycle={cycle}
                  commit={commit}
                  points={points}
                  setPoints={setPoints}
                  monthLabel={monthLabel}
                  brand={brand}
                  setBrand={setBrand}
                  month={month}
                  setMonth={setMonth}
                  monthOptions={monthOptions}
                />
              )}
              {activeRole === "results" && (
                <ResultsView
                  cycle={cycle}
                />
              )}
              {activeRole === "settings" && (
                <SettingsView
                  currentUser={currentUser}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Instructions & Guidelines Popup Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 text-slate-900 custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-800 font-bold">
                  <BookOpen size={22} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-blue-950 tracking-tight">
                    Instructions &amp; Policy Guidelines
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    MAHLE ANAND Filter System Recognition Process, Scoring Formula &amp; LSIP Rules
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              {/* Process Flow Timeline */}
              <div className="space-y-2">
                <strong className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Monthly Evaluation Process (5-Step Workflow)
                </strong>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-950 text-xs">Step 1: Self Nomination</span>
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">1st – 7th</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Employees complete self-nomination for eligible categories, attaching citations and business impact evidence.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-950 text-xs">Step 2: HOD Review &amp; Endorsement</span>
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">8th – 9th</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      HODs review department entries and forward max 1 employee per category (max 2 categories per unit).
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-950 text-xs">Step 3: Panel Scoring</span>
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">10th – 12th</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      A 3-member revolving panel independently scores each nominee on a 0–10 numeric scale.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-950 text-xs">Step 4: Winner Announced</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">15th of Month</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Highest average panel score nominee wins category title for the month.
                    </p>
                  </div>
                </div>
              </div>

              {/* Scoring Formula Table */}
              <div className="rounded-xl border border-slate-200/80 overflow-hidden">
                <div className="bg-slate-100/70 px-3.5 py-2 border-b border-slate-200/80 font-bold text-xs text-blue-950">
                  Evaluation &amp; Scoring Matrix
                </div>
                <div className="divide-y divide-slate-100 bg-white text-[11px]">
                  <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-bold text-blue-950 sm:w-32">Judge Score</span>
                    <span className="text-slate-600 flex-1">Single numeric score <strong>0–10</strong> per judge (integers or one decimal allowed).</span>
                  </div>
                  <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-bold text-blue-950 sm:w-32">Panel Score</span>
                    <span className="text-slate-600 flex-1 font-mono">
                      PanelScore = (Judge 1 + Judge 2 + Judge 3) / 3 &nbsp;<span className="text-slate-400 font-sans">(scale 0–10)</span>
                    </span>
                  </div>
                  <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-bold text-blue-950 sm:w-32">Winner Selection</span>
                    <span className="text-slate-600 flex-1">Nominee with the highest average <strong>PanelScore</strong> wins the award for the month.</span>
                  </div>
                </div>
              </div>

              {/* Year-End LSIP Recognition Ledger Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 via-sky-50 to-indigo-50 border border-sky-200/80 space-y-2">
                <div className="flex items-center gap-2">
                  <Calculator size={16} className="text-sky-700 shrink-0" />
                  <strong className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                    Year-End LSIP Recognition Ledger
                  </strong>
                </div>
                <p className="text-[11px] text-slate-700 font-medium leading-relaxed">
                  We add and maintain a ledger of employee scores every month for year-end LSIP recognition awards.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400">
                MAHLE ANAND Filter System Recognition Policy Guidelines
              </span>
              <button
                onClick={() => setShowHelpModal(false)}
                className="rounded-xl bg-[#0A2540] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-900 transition"
              >
                Close Instructions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
