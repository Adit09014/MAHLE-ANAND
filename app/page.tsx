"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Menu,
  Bell,
  Settings,
} from "lucide-react";
import { UNITS, STAGES, PRIZE, POINTS } from "../lib/constants";
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
  const [asUnit, setAsUnit] = useState(UNITS[0].id);
  const [asJudge, setAsJudge] = useState("j1");

  // Mobile menu & Help Center state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Load session from cookie and set RBAC role defaults
  useEffect(() => {
    async function checkAuth() {
      const session = await getAuthSession();
      if (session.authenticated && session.user) {
        setCurrentUser(session.user);
        if (session.user.unitId) setAsUnit(session.user.unitId);
        if (session.user.judgeId) setAsJudge(session.user.judgeId);
      }
    }
    checkAuth();
  }, []);

  const refresh = useCallback(async (m: string) => {
    setLoading(true);
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
      setErr("Couldn't reach shared storage. Try refreshing the cycle.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh(month);
  }, [month, refresh]);

  const handleLogout = async () => {
    await logoutUser();
    router.push("/login");
    router.refresh();
  };

  const commit = async (next: Cycle) => {
    setCycle(next);
    try {
      await saveCycle(next);
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

  // Filter permitted tabs based on user role & isPanelJudge DB boolean (RBAC)
  const isPanelJudge = Boolean(currentUser?.isPanelJudge);

  const allowedRoles: TabId[] = currentUser
    ? currentUser.role === "hr"
      ? isPanelJudge
        ? ["dashboard", "employee", "hod", "judge", "results", "hr", "settings"]
        : ["dashboard", "employee", "hod", "results", "hr", "settings"]
      : currentUser.role === "hod"
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
          <BrandMark url={brand.logoUrl} />
          <span className="font-bold text-sm tracking-tight text-white">MAHLE Anand</span>
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
          <div className="p-6 border-b border-slate-100 flex items-center gap-3.5 shrink-0">
            <BrandMark url={brand.logoUrl} />
            <div className="min-w-0">
              <h1 className="text-base font-extrabold tracking-tight text-blue-950 leading-tight truncate">
                MAHLE Anand
              </h1>
              <p className="text-xs font-medium text-slate-400 truncate">
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
          {/* Help Center */}
          <button
            onClick={() => {
              setShowHelpModal(true);
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-semibold whitespace-nowrap text-slate-600 hover:bg-slate-50 hover:text-blue-950 rounded-xl transition-all"
          >
            <HelpCircle size={18} className="text-slate-400 shrink-0" />
            <span className="truncate">Help Center</span>
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
            {/* Unit selector for HOD or HR */}
            {activeRole === "hod" && (
              <div className="flex items-center gap-2">
                <select
                  value={asUnit}
                  disabled={currentUser?.role === "hod"}
                  onChange={(e) => setAsUnit(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-950 shadow-xs"
                >
                  {UNITS.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.kind === "Plant" ? `Plant — ${u.name}` : u.name}
                    </option>
                  ))}
                </select>
                {currentUser?.role === "hod" && (
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

            {/* Month Selector & Refresh Controls */}
            {currentUser?.role === "hr" ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden sm:inline-block">
                  Admin Month:
                </span>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-950 outline-none focus:border-blue-700 shadow-xs"
                  title="Select Active Cycle Month (Admin Access)"
                />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-blue-950 shadow-xs">
                <Calendar size={13} className="text-blue-800" />
                <span>{monthLabel}</span>
              </div>
            )}

            <button
              onClick={() => refresh(month)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-50 shadow-xs active:scale-95 transition-all"
              title="Refresh cycle data"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          {/* Right Side: Notifications & User Profile */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHelpModal(true)}
              className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 relative transition"
              title="Notifications & Help"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-sky-500" />
            </button>

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
            <p className="py-16 text-center text-sm text-slate-500">
              Loading the {monthLabel} cycle…
            </p>
          ) : (
            <>
              {activeRole === "dashboard" && (
                <DashboardView
                  cycle={cycle}
                  points={points}
                  currentUser={currentUser}
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
                />
              )}
              {activeRole === "hod" && (
                <HodView
                  unitId={asUnit}
                  cycle={cycle}
                  commit={commit}
                  locked={locked}
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

      {/* Help Center Popup Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <HelpCircle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-blue-950">Help Center &amp; Guidelines</h3>
                  <p className="text-xs text-slate-500">MAHLE ANAND Recognition Rules &amp; Policy</p>
                </div>
              </div>
              <button onClick={() => setShowHelpModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <strong className="block text-sm font-bold text-blue-950 mb-1">Monthly Reward Perks</strong>
                <p>Each monthly award winner receives <strong>Rs 2,000 cash prize</strong> and <strong>+10 points</strong> recorded in the HR annual ledger.</p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-950">
                <strong className="block text-sm font-bold mb-1">Year-End LSIP Weightage (50%)</strong>
                <p>Cumulative monthly points carry a 50% weightage toward year-end LSIP awards.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                <strong className="block text-sm font-bold text-blue-950">Cycle Timeline Schedule</strong>
                <ul className="list-disc pl-4 space-y-0.5 font-medium">
                  <li>Self Nomination: 1st – 7th of Month</li>
                  <li>HOD Review &amp; Endorsement: 8th – 9th of Month</li>
                  <li>Panel Scoring: 10th – 12th of Month</li>
                  <li>Winners Announced: 15th of Month</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowHelpModal(false)}
                className="rounded-xl bg-[#0A2540] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-900 transition"
              >
                Close Guidelines
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
