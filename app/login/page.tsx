"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  ShieldCheck,
  Scale,
  Trophy,
  Lock,
  ArrowRight,
  AlertTriangle,
  DatabaseCheck,
} from "lucide-react";
import { UNITS } from "@/lib/constants";
import { Role } from "@/lib/types";
import { loginUser } from "@/lib/auth";
import BrandMark from "@/components/BrandMark";

const inputCls =
  "w-full rounded border border-blue-900/15 bg-white px-3.5 py-2.5 text-sm text-blue-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20 transition";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("employee");

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("M1003");
  const [unitId, setUnitId] = useState(UNITS[0].id);
  const [judgeId, setJudgeId] = useState("j1");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await loginUser({
      role,
      name,
      code,
      unitId,
      judgeId,
      password,
    });

    setLoading(false);
    if (!res.ok) {
      setError(res.error || "Login failed");
    } else {
      router.push("/");
      router.refresh();
    }
  };

  const loginTabs = [
    { id: "employee", label: "Employee Login", icon: ClipboardList, desc: "Employee, HOD, & Panel Judge" },
    { id: "hr", label: "Admin Login", icon: Trophy, desc: "HR & System Administrators" },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between text-blue-950" style={{ backgroundColor: "#EFF3F8" }}>
      {/* Header */}
      <header className="text-white shadow-md" style={{ backgroundColor: "#0A2540" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <BrandMark />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-sky-200">
                MAHLE ANAND Filter Systems
              </p>
              <h1 className="text-lg font-semibold tracking-tight">
                Rewards &amp; Recognition Portal
              </h1>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-sky-200/80">
            <DatabaseCheck size={14} className="text-emerald-400" /> MongoDB-Verified Authorization
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="mx-auto w-full max-w-md px-4 py-12 flex-1 flex items-center justify-center">
        <div className="w-full rounded-xl border border-blue-900/10 bg-white p-6 shadow-xl sm:p-8">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold tracking-tight text-blue-950">
              Sign In to Your Account
            </h2>
            <p className="mt-1 text-xs text-blue-900/60">
              Select your login type below to proceed.
            </p>
          </div>

          {/* Two-Option Login Selection */}
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg bg-blue-900/5 p-1.5">
            {loginTabs.map((t) => {
              const Icon = t.icon;
              const isSel = role === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setRole(t.id as Role);
                    setError(null);
                  }}
                  className={`flex flex-col items-center gap-1 rounded-md py-3 px-2 text-xs font-semibold transition ${
                    isSel
                      ? "bg-blue-800 text-white shadow-sm"
                      : "text-blue-900/60 hover:text-blue-950 hover:bg-white/50"
                  }`}
                >
                  <Icon size={18} />
                  <span>{t.label}</span>
                  <span className={`text-[10px] font-normal ${isSel ? "text-blue-100" : "text-blue-900/50"}`}>
                    {t.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {role === "employee" ? (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-blue-900/60 mb-1.5">
                    Employee Code (MongoDB Verified)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. M1001, M1003, M1005"
                    className={`${inputCls} font-mono uppercase`}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                <div className="rounded bg-blue-900/5 p-3 text-xs leading-relaxed text-blue-900/70">
                  <p className="font-semibold text-blue-950">Sample Registered DB Codes:</p>
                  <ul className="mt-1 space-y-0.5 font-mono text-[11px] text-blue-800">
                    <li>• <strong className="text-blue-950">M1003</strong>: Employee (Self Nomination)</li>
                    <li>• <strong className="text-blue-950">M1001</strong>: HOD &amp; Panel Judge</li>
                    <li>• <strong className="text-blue-950">M1005</strong>: HOD &amp; Panel Judge</li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-blue-900/60 mb-1.5">
                    HR Admin Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter password (demo: mahle123)"
                    className={inputCls}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <p className="text-xs text-blue-900/50 italic">
                  Demo HR Password: <code className="bg-blue-900/5 px-1 py-0.5 rounded font-mono text-blue-900">mahle123</code>
                </p>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-800 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow hover:bg-blue-900 transition disabled:opacity-50"
            >
              {loading ? "Verifying with MongoDB..." : "Verify & Sign In"}
              <ArrowRight size={14} />
            </button>
          </form>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-blue-900/40">
        MAHLE ANAND Filter Systems &copy; {new Date().getFullYear()} — MongoDB DB-Verified Authentication
      </footer>
    </div>
  );
}
