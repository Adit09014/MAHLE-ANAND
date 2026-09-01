"use client";

import React, { useState } from "react";
import { User, Key, Lock, ShieldCheck, Award, Building2, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { AuthUser } from "../lib/types";
import { unitById } from "../lib/constants";
import Card from "../components/Card";
import Label from "../components/Label";
import Button from "../components/Button";

export interface SettingsViewProps {
  currentUser?: AuthUser | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser }) => {
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Gender Profile state
  const [genderInput, setGenderInput] = useState(currentUser?.gender || "");
  const [genderSuccess, setGenderSuccess] = useState<string | null>(null);
  const [genderError, setGenderError] = useState<string | null>(null);
  const [genderSaving, setGenderSaving] = useState(false);

  const unitObj = currentUser?.unitId ? unitById(currentUser.unitId) : null;

  const handleSaveGenderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenderError(null);
    setGenderSuccess(null);
    setGenderSaving(true);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gender: genderInput }),
      });

      const data = await res.json();
      setGenderSaving(false);

      if (!res.ok) {
        setGenderError(data.error || "Failed to update gender.");
      } else {
        setGenderSuccess("Gender profile updated successfully!");
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (err) {
      setGenderSaving(false);
      setGenderError("Network error while updating gender.");
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPass.length < 4) {
      setError("New password must be at least 4 characters long.");
      return;
    }

    if (newPass !== confirmPass) {
      setError("New password and confirm password do not match.");
      return;
    }

    setLoading(true);

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
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Failed to update password.");
      } else {
        setSuccess(data.message || "Password updated successfully!");
        setCurrentPass("");
        setNewPass("");
        setConfirmPass("");
      }
    } catch (err) {
      setLoading(false);
      setError("Network error while changing password.");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header Banner */}
      <Card className="p-6 sm:p-8 bg-white border border-blue-900/10 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-900/10 text-blue-900">
            <User size={24} />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-sky-900 mb-1">
              <Sparkles size={12} className="text-sky-600" />
              <span>Account &amp; Security Settings</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-blue-950">
              User Profile &amp; Password Settings
            </h1>
            <p className="text-xs text-slate-500">
              Manage your profile credentials and security options for MAHLE ANAND Filter System Corporate Rewards.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 2. User Profile Details Card */}
        <Card className="p-6 border border-blue-900/10 shadow-xs bg-white space-y-5">
          <div className="flex items-center justify-between border-b border-blue-900/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900/10 text-blue-900">
                <User size={18} />
              </div>
              <h3 className="text-base font-bold text-blue-950">User Details</h3>
            </div>
            <span className="rounded-full bg-blue-900/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-900">
              {currentUser?.role} Account
            </span>
          </div>

          {/* Profile Identity Card */}
          <div className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0A2540] text-white font-black text-xl uppercase shadow-md">
              {currentUser?.name?.charAt(0) || "U"}
            </div>
            <div className="space-y-1 min-w-0">
              <h4 className="text-base font-extrabold text-blue-950 truncate">
                {currentUser?.name || "Employee"}
              </h4>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Code: {currentUser?.code}
                </span>
                {currentUser?.isPanelJudge && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-emerald-900">
                    <Award size={11} className="text-emerald-700" /> Appointed Panel Judge
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white">
              <span className="text-slate-500 font-medium">Assigned Department / Plant</span>
              <strong className="text-blue-950 font-bold">
                {unitObj ? `${unitObj.name} (${unitObj.kind})` : currentUser?.unitId || "N/A"}
              </strong>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white">
              <span className="text-slate-500 font-medium">Role Designation</span>
              <strong className="text-blue-950 font-bold uppercase">
                {currentUser?.designation || currentUser?.role || "Employee"}
              </strong>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white">
              <span className="text-slate-500 font-medium">Account Status</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                <CheckCircle2 size={13} /> Active Verified
              </span>
            </div>

            {/* Gender Profile Setting Form */}
            <div className="pt-2 border-t border-slate-100">
              <form onSubmit={handleSaveGenderSubmit} className="space-y-2">
                <Label>Gender Profile (Optional)</Label>
                {genderError && (
                  <div className="p-2 text-[11px] rounded-lg bg-red-50 text-red-700 border border-red-200">
                    {genderError}
                  </div>
                )}
                {genderSuccess && (
                  <div className="p-2 text-[11px] rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {genderSuccess}
                  </div>
                )}
                <div className="flex gap-2">
                  <select
                    value={genderInput}
                    onChange={(e) => setGenderInput(e.target.value)}
                    className="flex-1 rounded-xl border border-blue-900/15 bg-white px-3 py-2 text-xs text-blue-950 outline-none focus:border-blue-700"
                  >
                    <option value="">-- Not Specified (NULL) --</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <Button type="submit" disabled={genderSaving} className="shrink-0 text-xs py-2 px-3">
                    {genderSaving ? "Saving..." : "Save Gender"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </Card>

        {/* 3. Change Password Card */}
        <Card className="p-6 border border-blue-900/10 shadow-xs bg-white space-y-5">
          <div className="flex items-center justify-between border-b border-blue-900/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900/10 text-blue-900">
                <Key size={18} />
              </div>
              <h3 className="text-base font-bold text-blue-950">Change Password</h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">Security Controls</span>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
            <div>
              <Label>Current Password</Label>
              <input
                type="password"
                required
                placeholder="Enter current password"
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                className="w-full rounded-xl border border-blue-900/15 bg-white px-3.5 py-2.5 text-xs text-blue-950 outline-none focus:border-blue-700 shadow-xs"
              />
            </div>

            <div>
              <Label>New Password</Label>
              <input
                type="password"
                required
                placeholder="Enter new password (min 4 characters)"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="w-full rounded-xl border border-blue-900/15 bg-white px-3.5 py-2.5 text-xs text-blue-950 outline-none focus:border-blue-700 shadow-xs"
              />
            </div>

            <div>
              <Label>Confirm New Password</Label>
              <input
                type="password"
                required
                placeholder="Confirm new password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                className="w-full rounded-xl border border-blue-900/15 bg-white px-3.5 py-2.5 text-xs text-blue-950 outline-none focus:border-blue-700 shadow-xs"
              />
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Updating Password…" : "Update Password"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default SettingsView;
