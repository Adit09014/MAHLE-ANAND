"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  ShieldCheck,
  Scale,
  Trophy,
  RefreshCw,
  Check,
  AlertTriangle,
  LogOut,
  UserCheck,
  Lock,
  Award,
  Key,
  X,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { UNITS, STAGES, PRIZE, POINTS } from "../lib/constants";
import { emptyCycle, getCycleTimeline, getEffectiveEndDate, formatDatePretty } from "../lib/helpers";
import { loadCycle, saveCycle, loadBranding, loadPoints } from "../lib/storage";
import { getAuthSession, logoutUser } from "../lib/auth";
import { Cycle, PointsState, Branding, Role, AuthUser } from "../lib/types";
import BrandMark from "../components/BrandMark";
import NominateView from "../views/NominateView";
import HodView from "../views/HodView";
import JudgeView from "../views/JudgeView";
import HrView from "../views/HrView";
import ResultsView from "../views/ResultsView";

export type TabId = Role | "results";

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
  const [role, setRole] = useState<TabId>("employee");
  const [asUnit, setAsUnit] = useState(UNITS[0].id);
  const [asJudge, setAsJudge] = useState("j1");

  // Change Password Modal States
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [changePassError, setChangePassError] = useState<string | null>(null);
  const [changePassSuccess, setChangePassSuccess] = useState<string | null>(null);
  const [changePassLoading, setChangePassLoading] = useState(false);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError(null);
    setChangePassSuccess(null);

    if (newPass.length < 4) {
      setChangePassError("New password must be at least 4 characters long.");
      return;
    }

    if (newPass !== confirmPass) {
      setChangePassError("New password and confirm password do not match.");
      return;
    }

    setChangePassLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentPass,
          newPassword: newPass,
          confirmPassword: confirmPass,
        }),
      });

      const data = await res.json();
      setChangePassLoading(false);

      if (!res.ok) {
        setChangePassError(data.error || "Failed to update password.");
      } else {
        setChangePassSuccess(data.message || "Password updated successfully!");
        setCurrentPass("");
        setNewPass("");
        setConfirmPass("");
        setTimeout(() => {
          setShowChangePassModal(false);
          setChangePassSuccess(null);
        }, 2000);
      }
    } catch (err) {
      setChangePassLoading(false);
      setChangePassError("Network error while changing password.");
    }
  };

  // Load session from cookie and set RBAC role defaults
  useEffect(() => {
    async function checkAuth() {
      const session = await getAuthSession();
      if (session.authenticated && session.user) {
        setCurrentUser(session.user);
        const userRole = session.user.role;
        const isJudge = Boolean(session.user.isPanelJudge);

        // Default tab based on role & judge status
        if (userRole === "hr") {
          setRole("hr");
        } else if (userRole === "hod") {
          setRole("hod");
        } else {
          setRole("employee");
        }

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

  const stageIdx = STAGES.findIndex((s) => s.id === cycle.stage);
  const locked = cycle.stage === "announced";

  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString(
    "en-IN",
    { month: "long", year: "numeric" }
  );

  // All potential tabs
  const allTabs: Array<{ id: TabId; label: string; icon: React.ComponentType<{ size?: number }> }> = [
    { id: "employee", label: "Self nomination", icon: ClipboardList },
    { id: "hod", label: "HOD endorsement (2 Push)", icon: ShieldCheck },
    { id: "judge", label: "Panel scoring", icon: Scale },
    { id: "results", label: "Results", icon: Award },
    { id: "hr", label: "HR console", icon: Trophy },
  ];

  // Filter permitted tabs based on user role & isPanelJudge DB boolean (RBAC)
  // Panel scoring tab ("judge") is ONLY visible to users with isPanelJudge === true in DB
  const isPanelJudge = Boolean(currentUser?.isPanelJudge);

  const allowedRoles: TabId[] = currentUser
    ? currentUser.role === "hr"
      ? isPanelJudge
        ? ["employee", "hod", "judge", "results", "hr"]
        : ["employee", "hod", "results", "hr"]
      : currentUser.role === "hod"
        ? isPanelJudge
          ? ["hod", "judge", "results"]
          : ["hod", "results"]
        : isPanelJudge
          ? ["employee", "judge", "results"]
          : ["employee", "results"]
    : ["employee", "results"];

  const visibleTabs = allTabs.filter((t) => allowedRoles.includes(t.id));

  // Ensure active tab is within allowed roles
  const activeRole = allowedRoles.includes(role) ? role : allowedRoles[0];

  return (
    <div className="min-h-screen text-blue-950" style={{ backgroundColor: "#EFF3F8" }}>
      {/* Header Top Bar (Contains ONLY Logo, Company Name, Username, & Logout Button) */}
      <header className="text-white shadow-md bg-[#0A2540]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4">
          {/* Logo & Company Name */}
          <div className="flex items-center gap-4">
            <BrandMark url={brand.logoUrl} />
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                MAHLE ANAND Filter Systems
              </h1>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-200/80">
                Rewards &amp; Recognition Portal
              </p>
            </div>
          </div>

          {/* Username, Designation/Role, Panel Judge Badge, Change Password, & Logout Button */}
          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs text-white backdrop-blur-sm shadow-sm">
                  <UserCheck size={15} className="text-sky-300 shrink-0" />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 leading-tight">
                    <strong className="font-bold text-white text-xs">{currentUser.name}</strong>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-sky-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-sky-200 uppercase tracking-wider border border-sky-300/30">
                        {currentUser.designation || currentUser.role}
                      </span>
                      {currentUser.isPanelJudge && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/25 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-200 border border-emerald-300/40 shadow-sm backdrop-blur-sm">
                          <Award size={10} className="text-emerald-300" /> Panel Judge
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowChangePassModal(true);
                    setChangePassError(null);
                    setChangePassSuccess(null);
                    setCurrentPass("");
                    setNewPass("");
                    setConfirmPass("");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-sky-300/30 bg-sky-400/10 px-3 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-400/20 hover:text-white transition-all duration-150 active:scale-95 shadow-sm"
                  title="Change Password"
                >
                  <Key size={13} className="text-sky-300" />
                  <span className="hidden sm:inline">Change Password</span>
                </button>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-md hover:from-red-700 hover:to-red-800 active:scale-95 transition-all duration-150"
              title="Sign Out"
            >
              <LogOut size={13} /> Logout
            </button>
          </div>
        </div>

        {/* Timeline Bar Directly Below Top Bar with Glassmorphism for Current Timeline */}
        <div className="border-t border-white/10 bg-[#0A2540]/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl flex-wrap gap-3 px-5 py-3.5">
            {(() => {
              const timeline = getCycleTimeline(cycle);
              return STAGES.map((s, i) => {
                let windowText = s.window;
                let isExtended = false;
                if (s.id === "nomination") {
                  const p = timeline.nomination;
                  windowText = `${formatDatePretty(p.startDate)} – ${formatDatePretty(getEffectiveEndDate(p))}`;
                  isExtended = Boolean(p.isExtended);
                } else if (s.id === "validation") {
                  const p = timeline.hodEndorsement;
                  windowText = `${formatDatePretty(p.startDate)} – ${formatDatePretty(getEffectiveEndDate(p))}`;
                  isExtended = Boolean(p.isExtended);
                } else if (s.id === "judging") {
                  const p = timeline.panelScoring;
                  windowText = `${formatDatePretty(p.startDate)} – ${formatDatePretty(getEffectiveEndDate(p))}`;
                  isExtended = Boolean(p.isExtended);
                }

                const isCurrent = i === stageIdx;
                const isPassed = i < stageIdx;

                return (
                  <div
                    key={s.id}
                    style={{ minWidth: "160px" }}
                    className={`relative flex flex-1 items-center gap-3 transition-all duration-300 ${
                      isCurrent
                        ? "backdrop-blur-md bg-white/20 border border-white/40 text-white shadow-xl shadow-sky-950/40 ring-2 ring-sky-300/60 rounded-2xl p-3.5"
                        : isPassed
                        ? "bg-white/5 border border-white/10 text-sky-200/70 rounded-xl p-3"
                        : "bg-white/[0.02] border border-white/5 text-white/30 rounded-xl p-3"
                    }`}
                  >
                    {/* Glass Reflection Highlight overlay on active stage */}
                    {isCurrent && (
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/25 via-white/5 to-transparent pointer-events-none" />
                    )}

                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold ${
                        isCurrent
                          ? "bg-sky-400 text-blue-950 shadow-md shadow-sky-400/30 ring-2 ring-white/50"
                          : isPassed
                          ? "bg-white/20 text-white"
                          : "bg-white/10 text-white/40"
                      }`}
                    >
                      {isPassed ? <Check size={14} /> : i + 1}
                    </span>

                    <span className="leading-tight z-10">
                      <span className="block text-xs font-bold tracking-tight flex items-center gap-1.5">
                        {s.label}
                        {isExtended && (
                          <span className="rounded-full bg-amber-400/30 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-amber-200 border border-amber-300/40 shadow-sm backdrop-blur-sm">
                            Ext
                          </span>
                        )}
                      </span>
                      <span className={`block font-mono text-[11px] mt-0.5 ${isCurrent ? "text-sky-100 font-semibold" : "opacity-75"}`}>
                        {windowText}
                      </span>
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </header>

      {/* Identity strip with Role-Based Navigation */}
      <div className="border-b border-blue-900/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-5 py-3">
          <div className="flex flex-wrap gap-1">
            {visibleTabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeRole === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setRole(t.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? "bg-[#0A2540] text-white shadow-md shadow-blue-950/20"
                      : "text-blue-900/70 hover:bg-blue-900/5 hover:text-blue-950"
                  }`}
                >
                  <Icon size={14} /> {t.label}
                </button>
              );
            })}
          </div>

          {/* Unit selector for HOD or HR */}
          {activeRole === "hod" && (
            <div className="flex items-center gap-2">
              <select
                value={asUnit}
                disabled={currentUser?.role === "hod"} // Lock to HOD's assigned unit
                onChange={(e) => setAsUnit(e.target.value)}
                className="rounded-xl border border-blue-900/15 bg-white px-3 py-1.5 text-xs font-medium text-blue-950 disabled:bg-blue-900/5 shadow-sm"
              >
                {UNITS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.kind === "Plant" ? `Plant — ${u.name}` : u.name}
                  </option>
                ))}
              </select>
              {currentUser?.role === "hod" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-900/50" title="Assigned Unit Locked">
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
                disabled={currentUser?.role === "judge" || currentUser?.isPanelJudge} // Lock to Judge's assigned position
                onChange={(e) => setAsJudge(e.target.value)}
                className="rounded-xl border border-blue-900/15 bg-white px-3 py-1.5 text-xs font-medium text-blue-950 disabled:bg-blue-900/5 shadow-sm"
              >
                {cycle.judges.map((j, i) => (
                  <option key={j.id} value={j.id}>
                    {j.name ? j.name : `Judge ${i + 1} (unnamed)`}
                  </option>
                ))}
              </select>
              {(currentUser?.role === "judge" || currentUser?.isPanelJudge) && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-900/50" title="Assigned Judge Slot Locked">
                  <Lock size={12} /> Assigned Slot
                </span>
              )}
            </div>
          )}

          {/* Month Selector & Refresh Controls (Admin Only Select / Default Current Month) */}
          <div className="ml-auto flex items-center gap-2.5">
            {currentUser?.role === "hr" ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900/60 hidden sm:inline-block">
                  Admin Month:
                </span>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="rounded-xl border border-blue-900/20 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-950 outline-none focus:border-blue-700 shadow-sm"
                  title="Select Active Cycle Month (Admin Access)"
                />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-xl border border-blue-900/15 bg-blue-50/70 px-3 py-1.5 text-xs font-bold text-blue-950 shadow-sm">
                <Calendar size={13} className="text-blue-800" />
                <span>{monthLabel}</span>
                <span className="text-[10px] font-mono font-medium text-blue-900/50 uppercase">
                  (Active)
                </span>
              </div>
            )}

            <button
              onClick={() => refresh(month)}
              className="inline-flex items-center gap-1 rounded-xl border border-blue-900/15 bg-white px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-900/80 hover:bg-blue-50/50 shadow-sm active:scale-95 transition-all"
              title="Refresh cycle data"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-5 py-6">
        {err && (
          <div className="mb-4 flex items-start gap-2 rounded border border-amber-500/40 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            {err}
          </div>
        )}
        {loading ? (
          <p className="py-16 text-center text-sm text-blue-900/50">
            Loading the {monthLabel} cycle…
          </p>
        ) : (
          <>
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
                cycle={cycle}
                commit={commit}
                unitId={asUnit}
                locked={locked}
              />
            )}
            {activeRole === "judge" && (
              <JudgeView
                cycle={cycle}
                commit={commit}
                judgeId={asJudge}
                locked={locked}
              />
            )}
            {activeRole === "results" && (
              <ResultsView cycle={cycle} />
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
          </>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-5 pb-10 text-xs leading-relaxed text-blue-900/45">
        Winner in each category receives Rs {PRIZE.toLocaleString("en-IN")} and{" "}
        {POINTS} monthly points. Monthly awards carry 50% weightage in the
        year-end LSIP awards. Role-Based Access Control enforced for {currentUser?.name || "User"}.
      </footer>

      {/* Change Password Modal Pop-up */}
      {showChangePassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-blue-900/10 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-blue-900/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900/10 text-blue-900">
                  <Key size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-blue-950">
                    Change Password
                  </h3>
                  <p className="text-xs text-blue-900/60">
                    Confirm your current password and set a new password.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowChangePassModal(false)}
                className="rounded-lg p-1.5 text-blue-900/40 hover:bg-blue-900/5 hover:text-blue-950 transition"
              >
                <X size={18} />
              </button>
            </div>

            {changePassError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{changePassError}</span>
              </div>
            )}

            {changePassSuccess && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
                <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                <span>{changePassSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-blue-900/60 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  className="w-full rounded-xl border border-blue-900/15 bg-white px-3.5 py-2.5 text-sm text-blue-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-blue-900/60 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password (min 4 characters)"
                  className="w-full rounded-xl border border-blue-900/15 bg-white px-3.5 py-2.5 text-sm text-blue-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-blue-900/60 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter new password to confirm"
                  className="w-full rounded-xl border border-blue-900/15 bg-white px-3.5 py-2.5 text-sm text-blue-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-blue-900/10 pt-4">
                <button
                  type="button"
                  onClick={() => setShowChangePassModal(false)}
                  className="rounded-xl border border-blue-900/15 bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-blue-950 hover:bg-blue-50/50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changePassLoading}
                  className="rounded-xl bg-gradient-to-r from-blue-800 to-blue-900 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white shadow-md hover:from-blue-900 hover:to-blue-950 active:scale-95 transition-all duration-150 disabled:opacity-50"
                >
                  {changePassLoading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
