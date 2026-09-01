"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Award,
  AlertTriangle,
} from "lucide-react";
import { Role } from "@/lib/types";
import { loginUser } from "@/lib/auth";
import BrandMark from "@/components/BrandMark";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("employee");

  // Form states
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    async function fetchBrand() {
      try {
        const res = await fetch("/api/branding");
        if (res.ok) {
          const data = await res.json();
          if (data?.logoUrl) setLogoUrl(data.logoUrl);
        }
      } catch (e) {
        /* ignore */
      }
    }

    async function checkAlreadyLoggedIn() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data?.authenticated) {
            router.replace("/");
            return;
          }
        }
      } catch (e) {
        /* ignore */
      }
    }

    fetchBrand();
    checkAlreadyLoggedIn();
  }, []);

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
      setError(res.error || "Invalid employee credentials.");
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

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Left Column: Dark Blue Hero Section with Car Background Image */}
      <div 
        className="lg:col-span-6 xl:col-span-5 text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden min-h-[420px] lg:min-h-screen bg-cover bg-center"
        style={{ backgroundImage: "url('/car-bg.png')" }}
      >
        {/* Dark Gradient Overlay for optimal contrast and readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#061C33]/85 via-[#0A2540]/80 to-[#0D3156]/90 backdrop-blur-[1px] pointer-events-none" />

        {/* Subtle Background Glows */}
        <div className="absolute right-0 top-0 -mt-16 -mr-16 h-80 w-80 rounded-full bg-sky-500/15 blur-3xl pointer-events-none" />
        <div className="absolute left-0 bottom-0 -mb-16 -ml-16 h-80 w-80 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

        {/* Top Header: Current Logo Container */}
        <div className="relative z-10">
          <BrandMark url={logoUrl} bgWhite className="h-10 sm:h-12 lg:h-14" />
        </div>

        {/* Center Content: Main Heading & Description */}
        <div className="relative z-10 space-y-3 my-auto py-6">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
            Empowering<br />Excellence.
          </h1>
          <p className="text-xs sm:text-sm text-sky-100/90 leading-relaxed max-w-md font-normal">
            Welcome to the MAHLE ANAND Filter System Rewards Portal. Recognize achievements, celebrate milestones, and build a culture of appreciation.
          </p>
        </div>

        {/* Bottom Section: Culture of Recognition 4 Stat Cards */}
        <div className="relative z-10 mt-4 space-y-3">
          <div className="flex items-center gap-2 text-sky-300 font-bold text-xs uppercase tracking-wider">
            <Award size={16} className="text-sky-300 shrink-0" />
            <span>Culture of Recognition</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Card 1 */}
            <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-md space-y-1 flex flex-col justify-between">
              <span className="text-2xl sm:text-3xl font-light tracking-tight text-white">71<span className="text-base font-normal">st</span></span>
              <p className="text-[11px] text-white/90 leading-tight font-medium">Rank in Great Place to Work®</p>
              <div className="absolute right-1 top-2 bottom-2 w-1 rounded-full bg-sky-400" />
            </div>

            {/* Card 2 */}
            <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-md space-y-1 flex flex-col justify-between">
              <span className="text-2xl sm:text-3xl font-light tracking-tight text-white">20</span>
              <p className="text-[11px] text-white/90 leading-tight font-medium">Patents filed in India</p>
              <div className="absolute right-1 top-2 bottom-2 w-1 rounded-full bg-sky-400" />
            </div>

            {/* Card 3 */}
            <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-md space-y-1 flex flex-col justify-between col-span-2 sm:col-span-1">
              <p className="text-[11px] text-white/90 leading-snug font-medium pt-1">
                Has a unique filter paper impregnation facility and also provides eco-friendly fuel filters
              </p>
              <div className="absolute right-1 top-2 bottom-2 w-1 rounded-full bg-sky-400" />
            </div>

            {/* Card 4 */}
            <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-md space-y-1 flex flex-col justify-between">
              <span className="text-2xl sm:text-3xl font-light tracking-tight text-white">1600+</span>
              <p className="text-[11px] text-white/90 leading-tight font-medium">Employees</p>
              <div className="absolute right-1 top-2 bottom-2 w-1 rounded-full bg-sky-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Clean Sign In Form */}
      <div className="lg:col-span-6 xl:col-span-7 bg-slate-50 flex items-center justify-center p-6 sm:p-12 lg:p-16 min-h-screen">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-7 sm:p-9 space-y-6 relative overflow-hidden">
          {/* Top Cyan Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500" />

          {/* Form Header */}
          <div className="text-center space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-blue-950">
              Welcome Back
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Please sign in to your account.
            </p>
          </div>

          {/* Role Tabs: Employee vs Admin */}
          <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/60">
            <button
              type="button"
              onClick={() => handleTabChange("employee")}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-150 ${
                role === "employee"
                  ? "bg-white text-blue-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Employee
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("hr")}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-150 ${
                role === "hr"
                  ? "bg-white text-blue-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Admin
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 font-medium">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Employee ID Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                EMPLOYEE ID
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  required
                  placeholder={role === "hr" ? "e.g. M1001" : "e.g. MA-12345"}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 py-3 text-xs font-semibold text-blue-950 uppercase outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20 shadow-xs transition"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                PASSWORD
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 py-3 text-xs font-semibold text-blue-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20 shadow-xs transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>


            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#0A2540] hover:bg-blue-900 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-950/20 active:scale-95 transition-all disabled:opacity-50 mt-2"
            >
              <span>{loading ? "Signing In..." : "Sign In"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
