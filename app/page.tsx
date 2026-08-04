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
} from "lucide-react";
import { UNITS, STAGES, PRIZE, POINTS } from "../lib/constants";
import { emptyCycle } from "../lib/helpers";
import { loadCycle, saveCycle, loadBranding, loadPoints } from "../lib/storage";
import { getAuthSession, logoutUser } from "../lib/auth";
import { Cycle, PointsState, Branding, Role, AuthUser } from "../lib/types";
import BrandMark from "../components/BrandMark";
import NominateView from "../views/NominateView";
import HodView from "../views/HodView";
import JudgeView from "../views/JudgeView";
import HrView from "../views/HrView";

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
  const [role, setRole] = useState<Role>("employee");
  const [asUnit, setAsUnit] = useState(UNITS[0].id);
  const [asJudge, setAsJudge] = useState("j1");

  // Load session from cookie and set RBAC role defaults
  useEffect(() => {
    async function checkAuth() {
      const session = await getAuthSession();
      if (session.authenticated && session.user) {
        setCurrentUser(session.user);
        const userRole = session.user.role;

        // Default tab based on role
        if (userRole === "judge") {
          setRole("judge");
        } else if (userRole === "hod") {
          setRole("hod");
        } else if (userRole === "hr") {
          setRole("hr");
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
  const allTabs: Array<{ id: Role; label: string; icon: React.ComponentType<{ size?: number }> }> = [
    { id: "employee", label: "Nominate", icon: ClipboardList },
    { id: "hod", label: "HOD endorsement", icon: ShieldCheck },
    { id: "judge", label: "Panel scoring", icon: Scale },
    { id: "hr", label: "HR console", icon: Trophy },
  ];

  // Filter permitted tabs based on user role (RBAC)
  const allowedRoles: Role[] = currentUser
    ? currentUser.role === "hr"
      ? ["employee", "hod", "judge", "hr"]
      : currentUser.role === "hod"
        ? ["employee", "hod"]
        : currentUser.role === "judge"
          ? ["judge"]
          : ["employee"]
    : ["employee"];

  const visibleTabs = allTabs.filter((t) => allowedRoles.includes(t.id));

  // Ensure active tab is within allowed roles
  const activeRole = allowedRoles.includes(role) ? role : allowedRoles[0];

  return (
    <div className="min-h-screen text-blue-950" style={{ backgroundColor: "#EFF3F8" }}>
      {/* Header */}
      <header className="text-white shadow-md" style={{ backgroundColor: "#0A2540" }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
          <div className="flex items-center gap-4">
            <BrandMark url={brand.logoUrl} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-sky-200">
                MAHLE ANAND Filter Systems
              </p>
              <h1 className="text-lg font-semibold tracking-tight">
                Rewards &amp; Recognition — monthly cycle
              </h1>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {currentUser && (
              <div className="hidden sm:flex items-center gap-2 rounded border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white">
                <UserCheck size={14} className="text-sky-300" />
                <span>
                  <strong className="font-semibold">{currentUser.name}</strong>{" "}
                  <span className="uppercase text-[11px] font-mono tracking-wider opacity-80">
                    ({currentUser.role})
                  </span>
                </span>
              </div>
            )}
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-300"
            />
            <button
              onClick={() => refresh(month)}
              className="inline-flex items-center gap-1.5 rounded border border-white/20 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/80 hover:bg-white/10"
            >
              <RefreshCw size={12} /> Refresh
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded bg-red-600/80 hover:bg-red-600 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition"
              title="Sign Out"
            >
              <LogOut size={12} /> Logout
            </button>
          </div>
        </div>

        {/* Stage rail */}
        <div className="mx-auto flex max-w-6xl flex-wrap gap-2 px-5 pb-4">
          {STAGES.map((s, i) => (
            <div
              key={s.id}
              style={{ minWidth: "150px" }}
              className={`flex flex-1 items-center gap-2.5 rounded border px-3 py-2 ${
                i === stageIdx
                  ? "border-sky-300/60 bg-sky-300/15"
                  : i < stageIdx
                    ? "border-white/10 bg-white/5 text-white/50"
                    : "border-white/10 text-white/35"
              }`}
            >
              <span className="font-mono text-sm tabular-nums">
                {i < stageIdx ? <Check size={14} /> : i + 1}
              </span>
              <span className="leading-tight">
                <span className="block text-xs font-semibold">{s.label}</span>
                <span className="block font-mono text-xs opacity-70">
                  {s.window}
                </span>
              </span>
            </div>
          ))}
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
                  className={`inline-flex items-center gap-1.5 rounded px-3.5 py-2 text-xs font-semibold transition ${
                    isActive
                      ? "bg-blue-800 text-white shadow-sm"
                      : "text-blue-900/60 hover:bg-blue-900/5 hover:text-blue-950"
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
                className="rounded border border-blue-900/15 px-2.5 py-1.5 text-xs font-medium text-blue-950 disabled:bg-blue-900/5"
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
                disabled={currentUser?.role === "judge"} // Lock to Judge's assigned position
                onChange={(e) => setAsJudge(e.target.value)}
                className="rounded border border-blue-900/15 px-2.5 py-1.5 text-xs font-medium text-blue-950 disabled:bg-blue-900/5"
              >
                {cycle.judges.map((j, i) => (
                  <option key={j.id} value={j.id}>
                    {j.name ? j.name : `Judge ${i + 1} (unnamed)`}
                  </option>
                ))}
              </select>
              {currentUser?.role === "judge" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-900/50" title="Assigned Judge Slot Locked">
                  <Lock size={12} /> Assigned Slot
                </span>
              )}
            </div>
          )}

          <span className="ml-auto font-mono text-xs text-blue-900/50">
            {monthLabel}
          </span>
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
              <NominateView cycle={cycle} commit={commit} locked={locked} />
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
    </div>
  );
}
