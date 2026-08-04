"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Trophy,
  Lock,
  ArrowRight,
  AlertTriangle,
  Star,
  Award,
  UserCheck,
} from "lucide-react";
import { Role } from "@/lib/types";
import { loginUser } from "@/lib/auth";
import BrandMark from "@/components/BrandMark";

const inputCls =
  "w-full rounded-lg border border-blue-900/15 bg-white px-3.5 py-2.5 text-sm text-blue-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20 transition";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("employee");

  // Form states
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await loginUser({
      role,
      code,
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

  const handleTabChange = (selectedRole: Role) => {
    setRole(selectedRole);
    setError(null);
    setCode("");
    setPassword("");
  };

  const loginTabs = [
    { id: "employee", label: "Employee Login", icon: ClipboardList, desc: "Employee, HOD, & Panel Judge" },
    { id: "hr", label: "Admin Login", icon: Trophy, desc: "HR & System Administrators" },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between text-blue-950 bg-[#EBF4FD]">
      {/* 1. Empty Top Bar with MAHLE ANAND Logo Only */}
      <header className="border-b border-blue-900/10 bg-[#E8F3FC]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <BrandMark />
          </div>
          {/* Empty Top Bar as requested */}
        </div>
      </header>

      {/* 2. Hero Section (Matching Reference Image Layout) */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8 lg:py-12">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
          
          {/* Left Column: Heading, Subtitle & Embedded Login Tab directly underneath */}
          <div className="lg:col-span-7 space-y-6">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-100/70 px-3.5 py-1 text-xs font-bold text-amber-900 shadow-sm">
              <span className="text-amber-600 font-mono text-xs">#</span>
              <span>CELEBRATING EXCELLENCE</span>
            </div>

            {/* Title & Subtitle */}
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#0A2540] sm:text-4xl lg:text-5xl leading-tight">
                MAHLE Anand Rewards &amp; Recognition
              </h1>
              <p className="mt-3 text-sm sm:text-base text-blue-900/70 leading-relaxed max-w-2xl">
                Celebrating Excellence. Inspiring Innovation. Recognizing Every Outstanding Contribution Across Our Global Teams.
              </p>
            </div>

            {/* Embedded Login Tab Directly Below MAHLE Rewards Text */}
            <div className="w-full max-w-xl rounded-2xl border border-blue-900/10 bg-white p-6 shadow-xl sm:p-7">
              <div className="mb-4">
                <h2 className="text-lg font-bold tracking-tight text-blue-950">
                  Sign In to Access Portal
                </h2>
                <p className="mt-0.5 text-xs text-blue-900/60">
                  Select your role tab and enter your Employee Code (ID) + Password.
                </p>
              </div>

              {/* Login Tabs */}
              <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-blue-900/5 p-1.5">
                {loginTabs.map((t) => {
                  const Icon = t.icon;
                  const isSel = role === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTabChange(t.id as Role)}
                      className={`flex flex-col items-center justify-center gap-1 rounded-lg py-2.5 px-2 text-xs font-semibold transition ${
                        isSel
                          ? "bg-blue-800 text-white shadow-sm"
                          : "text-blue-900/60 hover:text-blue-950 hover:bg-white/60"
                      }`}
                    >
                      <Icon size={16} />
                      <span>{t.label}</span>
                      <span className={`text-[10px] font-normal ${isSel ? "text-blue-100" : "text-blue-900/50"}`}>
                        {t.desc}
                      </span>
                    </button>
                  );
                })}
              </div>

              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-blue-900/60 mb-1">
                      Employee Code (ID)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. M1003"
                      className={`${inputCls} font-mono uppercase`}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-blue-900/60 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Enter your password"
                      className={inputCls}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>



                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0A2540] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow hover:bg-blue-900 transition disabled:opacity-50"
                >
                  {loading ? "Verifying Credentials..." : "Verify & Sign In"}
                  <ArrowRight size={14} />
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Visual Showcase Matching Reference Image */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="relative w-full max-w-md">
              
              {/* Floating Badge 1: Innovation Champion */}
              <div className="absolute -top-4 -left-2 z-20 flex items-center gap-1.5 rounded-full border border-blue-900/10 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-blue-950 shadow-md backdrop-blur">
                <Star size={13} className="text-amber-500 fill-amber-400" />
                <span>Innovation Champion</span>
              </div>

              {/* Floating Badge 2: Eagle Eye */}
              <div className="absolute top-10 -right-2 z-20 flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-emerald-950 shadow-md backdrop-blur">
                <Award size={13} className="text-emerald-600" />
                <span>Eagle Eye</span>
              </div>

              {/* Main Golden Trophy Showcase Card */}
              <div className="relative overflow-hidden rounded-2xl border border-blue-900/10 bg-gradient-to-br from-[#0A2540] to-[#041221] p-3 shadow-2xl">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-black">
                  <Image
                    src="/golden_award_trophy.png"
                    alt="Golden Award Trophy"
                    fill
                    className="object-cover transition transform hover:scale-105 duration-500"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* 3. Dark Blue Footer (Matching Main Page #0A2540) */}
      <footer className="bg-[#0A2540] text-white/80 text-xs">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid gap-8 md:grid-cols-2">
            
            {/* Column 1: MAHLE ANAND Logo & Description */}
            <div className="space-y-3">
              <BrandMark bgWhite />
              <p className="text-xs leading-relaxed text-white/60 max-w-sm">
                Celebrating excellence, inspiring innovation, and acknowledging every valuable contribution across MAHLE Anand.
              </p>
            </div>

            {/* Column 2: HR Contact Information (Right-aligned) */}
            <div className="md:text-right">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-3">
                HR Contact
              </h4>
              <ul className="space-y-2 text-white/60">
                <li>support.rewards@mahle-anand.com</li>
                <li>Ext: 4421 / HR Desk</li>
              </ul>
            </div>

          </div>

          {/* Bottom Bar: Copyright */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-white/50 text-[11px]">
            <p>&copy; 2026 MAHLE Anand. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
