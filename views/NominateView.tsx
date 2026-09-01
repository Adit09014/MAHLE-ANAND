"use client";

import React, { useState, useMemo } from "react";
import { Lock, Clock, Calendar, CheckCircle2, ShieldAlert, FileText, Check, Edit3, X } from "lucide-react";
import { UNITS, CATEGORIES, catById, unitById, getDynamicUnits } from "../lib/constants";
import { AuthUser, Cycle, Nomination } from "../lib/types";
import { getCycleTimeline, getEffectiveEndDate, formatDatePretty } from "../lib/helpers";
import Card from "../components/Card";
import Label from "../components/Label";
import Button from "../components/Button";
import Empty from "../components/Empty";
import Pill from "../components/Pill";

const inputCls =
  "w-full rounded-xl border border-blue-900/15 bg-white px-3.5 py-2.5 text-xs text-blue-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20 shadow-xs transition";

const readOnlyCls =
  "w-full rounded-xl border border-blue-900/15 bg-blue-900/5 px-3.5 py-2.5 text-xs font-semibold text-blue-950 outline-none cursor-not-allowed";

const Field: React.FC<{ label: string; children: React.ReactNode; helpText?: string }> = ({
  label,
  children,
  helpText,
}) => (
  <label className="block space-y-1">
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      {helpText && <span className="text-[10px] text-slate-400 font-mono">{helpText}</span>}
    </div>
    {children}
  </label>
);

const MAFS_VALUES = [
  "1 Safety First",
  "2 Integrity",
  "3 Intrapreneurship",
  "4 Excellence Orientation",
  "5 Courtesy and Self Control",
];

const getWordCount = (str: string) => str.trim().split(/\s+/).filter(Boolean).length;

export interface NominateViewProps {
  cycle: Cycle;
  commit: (next: Cycle) => void;
  currentUser?: AuthUser | null;
  locked: boolean;
}

export const NominateView: React.FC<NominateViewProps> = ({ cycle, commit, currentUser, locked }) => {
  const isHOD = Boolean(currentUser?.isHOD) || currentUser?.role === "hod";

  const [f, setF] = useState({
    name: currentUser?.name || "",
    code: currentUser?.code || "",
    unit: currentUser?.unitId || UNITS[0].id,
    category: CATEGORIES[0].id,
    gender: currentUser?.gender || "",
    citation: "",
    businessImpact: "",
    mafsValue: "1 Safety First",
  });

  const [editingNomId, setEditingNomId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ bad: boolean; text: string } | null>(null);

  const [allEmployees, setAllEmployees] = useState<Array<{ unitId?: string }>>([]);

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

  const dynamicUnits = useMemo(() => getDynamicUnits(allEmployees), [allEmployees]);

  // Sync profile data when currentUser updates
  React.useEffect(() => {
    if (currentUser) {
      setF((prev) => ({
        ...prev,
        name: currentUser.name || prev.name,
        code: currentUser.code || prev.code,
        unit: currentUser.unitId || prev.unit,
        gender: currentUser.gender || prev.gender,
      }));
    }
  }, [currentUser]);

  if (isHOD) {
    return (
      <Card className="p-8 text-center space-y-4 max-w-xl mx-auto my-12 bg-white border border-amber-200 shadow-sm rounded-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <ShieldAlert size={28} />
        </div>
        <h3 className="text-lg font-bold text-blue-950">Self-Nomination Restricted for HODs</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          As a Head of Department (HOD), your role is to evaluate and endorse nominees submitted by your department members. HODs cannot file self-nominations.
        </p>
      </Card>
    );
  }

  const timeline = getCycleTimeline(cycle);
  const nomPhase = timeline.nomination;
  const effectiveEnd = getEffectiveEndDate(nomPhase);
  const open = cycle.stage === "nomination" && !locked;
  const cat = catById(f.category);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const userCode = (currentUser?.code || "").toUpperCase();
  const userName = (currentUser?.name || "").toLowerCase().trim();

  // Filter nominations strictly filed by the logged-in user
  const userNominations = useMemo(() => {
    if (!cycle?.nominations) return [];
    return cycle.nominations.filter(
      (n) =>
        (userCode && n.code.toUpperCase() === userCode) ||
        (userName && n.name.toLowerCase().trim() === userName)
    );
  }, [cycle?.nominations, userCode, userName]);

  const citationWords = getWordCount(f.citation);
  const impactWords = getWordCount(f.businessImpact);

  const handleCitationChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const words = getWordCount(val);
    if (words <= 500 || val.length < f.citation.length) {
      set("citation", val);
    }
  };

  const handleImpactChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const words = getWordCount(val);
    if (words <= 250 || val.length < f.businessImpact.length) {
      set("businessImpact", val);
    }
  };

  const handleStartEdit = (nom: Nomination) => {
    setEditingNomId(nom.id);
    setF((prev) => ({
      ...prev,
      category: nom.category,
      gender: nom.gender || "",
      citation: nom.citation || "",
      businessImpact: nom.businessImpact || "",
      mafsValue: nom.mafsValue || "1 Safety First",
    }));
    setMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingNomId(null);
    setF((prev) => ({ ...prev, citation: "", businessImpact: "" }));
    setMsg(null);
  };

  const submit = () => {
    const code = (f.code || currentUser?.code || "").trim().toUpperCase();
    const name = (f.name || currentUser?.name || "").trim();
    const unit = (currentUser?.unitId || f.unit || "").trim();

    if (!name || !code)
      return setMsg({ bad: true, text: "Your employee profile details could not be found." });

    if (!f.citation.trim())
      return setMsg({
        bad: true,
        text: "Please write details for 'Projects Undertaken / Key Contribution'.",
      });

    if (citationWords > 500)
      return setMsg({
        bad: true,
        text: "Projects Undertaken / Key Contribution exceeds the 500-word limit.",
      });

    if (!f.businessImpact.trim())
      return setMsg({
        bad: true,
        text: "Please write details for 'Business Impact'.",
      });

    if (impactWords > 250)
      return setMsg({
        bad: true,
        text: "Business Impact exceeds the 250-word limit.",
      });

    if (cat?.splitByGender && !f.gender)
      return setMsg({
        bad: true,
        text: "Employee of the Month is declared for a male and female winner — please select gender.",
      });

    if (!editingNomId) {
      // Check duplicate category ONLY when creating a new nomination
      if (userNominations.some((n) => n.category === f.category))
        return setMsg({
          bad: true,
          text: `You have already filed a nomination under '${cat?.name}' for this month. You may edit your existing entry or nominate yourself in other categories.`,
        });
    }

    if (editingNomId) {
      // Update existing nomination
      const nextNoms = cycle.nominations.map((n) => {
        if (n.id === editingNomId) {
          return {
            ...n,
            category: f.category,
            gender: cat?.splitByGender ? f.gender : "",
            citation: f.citation.trim(),
            businessImpact: f.businessImpact.trim(),
            mafsValue: f.mafsValue,
            submittedAt: new Date().toISOString(),
          };
        }
        return n;
      });

      commit({ ...cycle, nominations: nextNoms });
      setEditingNomId(null);
      setF((prev) => ({ ...prev, citation: "", businessImpact: "" }));
      setMsg({ bad: false, text: `Self-nomination under ${cat?.name} updated successfully!` });
    } else {
      // Create new nomination
      const nom: Nomination = {
        id: `${code}-${f.category}-${Date.now()}`,
        name,
        code,
        unit,
        category: f.category,
        gender: cat?.splitByGender ? f.gender : "",
        citation: f.citation.trim(),
        businessImpact: f.businessImpact.trim(),
        mafsValue: f.mafsValue,
        evidence: "",
        submittedAt: new Date().toISOString(),
        validated: null,
        hrNote: "",
      };

      commit({ ...cycle, nominations: [...cycle.nominations, nom] });
      setF((prev) => ({ ...prev, citation: "", businessImpact: "" }));
      setMsg({ bad: false, text: `Self-nomination successfully filed under ${cat?.name}.` });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* 1. Self-Nomination Form Card */}
      <Card className="p-6 border border-blue-900/10 shadow-xs bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-900/10 pb-4">
          <div>
            <h2 className="text-base font-bold tracking-tight text-blue-950 flex items-center gap-2">
              {editingNomId ? "Edit Self-Nomination" : "Self-Nomination Form"}
              {editingNomId && (
                <span className="rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                  Editing Existing Entry
                </span>
              )}
            </h2>
            <p className="mt-0.5 text-xs text-blue-900/60">
              {editingNomId
                ? "Modify your submitted citation and business impact details below."
                : "Auto-filled profile details. You can nominate yourself across multiple categories."}
            </p>
          </div>
          {nomPhase.isExtended && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-300 px-3 py-1 text-xs font-bold text-amber-900">
              <Clock size={12} /> Extended to {formatDatePretty(effectiveEnd)}
            </span>
          )}
        </div>

        {/* Editing active notification banner */}
        {editingNomId && (
          <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-950 font-medium">
            <div className="flex items-center gap-2">
              <Edit3 size={15} className="text-amber-700 shrink-0" />
              <span>You are currently editing your nomination for <strong>{cat?.name}</strong>.</span>
            </div>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-200/60 hover:bg-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-900"
            >
              <X size={13} /> Cancel Edit
            </button>
          </div>
        )}

        {/* Timeline Information Banner */}
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-blue-900/5 border border-blue-900/10 px-3.5 py-2.5 text-xs text-blue-950 font-medium">
          <Calendar size={15} className="text-blue-700 shrink-0" />
          <span>
            Submission Window: <strong>{formatDatePretty(nomPhase.startDate)}</strong> – <strong>{formatDatePretty(effectiveEnd)}</strong>
            {nomPhase.isExtended ? " (Admin Extended)" : ""}
          </span>
        </div>

        {!open && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-900">
            <Lock size={14} className="shrink-0" /> The nomination window is currently closed for this cycle.
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {/* Profile Auto-filled locked fields */}
          <Field label="Employee Name (Auto-Filled)">
            <input
              className={readOnlyCls}
              value={f.name}
              readOnly
              disabled
              title="Locked to your registered profile"
            />
          </Field>
          <Field label="Employee Code (Auto-Filled)">
            <input
              className={`${readOnlyCls} font-mono uppercase`}
              value={f.code}
              readOnly
              disabled
              title="Locked to your registered profile"
            />
          </Field>
          <Field label="Department / Unit">
            <select
              className={inputCls}
              value={f.unit}
              disabled={!open || Boolean(editingNomId)}
              onChange={(e) => set("unit", e.target.value)}
            >
              {dynamicUnits.map((u: { id: string; name: string }) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Award Category">
            <select
              className={inputCls}
              value={f.category}
              disabled={!open || Boolean(editingNomId)}
              onChange={(e) => set("category", e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          {cat?.splitByGender && (
            <Field label="Declared Under">
              <select
                className={inputCls}
                value={f.gender}
                disabled={!open}
                onChange={(e) => set("gender", e.target.value)}
              >
                <option value="">Select Gender</option>
                <option>Male</option>
                <option>Female</option>
              </select>
            </Field>
          )}

          {/* MAFS Values Demonstrated Single Tick Option */}
          <div className="sm:col-span-2 space-y-2 pt-1 border-t border-slate-100">
            <Label>MAFS Values Demonstrated (Select One Option)</Label>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {MAFS_VALUES.map((valStr) => {
                const isSelected = f.mafsValue === valStr;
                return (
                  <label
                    key={valStr}
                    onClick={() => open && set("mafsValue", valStr)}
                    className={`flex items-center gap-2.5 rounded-xl border p-3 cursor-pointer transition text-xs font-semibold ${
                      isSelected
                        ? "border-sky-500 bg-sky-50 text-blue-950 shadow-2xs ring-1 ring-sky-400"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    } ${!open ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        isSelected
                          ? "border-sky-600 bg-sky-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check size={10} className="stroke-[3]" />}
                    </div>
                    <span>{valStr}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Projects Undertaken / Key Contribution (Max 500 Words) */}
          <div className="sm:col-span-2 pt-1">
            <Field
              label="Projects Undertaken / Key Contribution"
              helpText={`${citationWords} / 500 words`}
            >
              <textarea
                rows={5}
                className={inputCls}
                placeholder="Preferably format your key contributions and projects undertaken in bullet points."
                value={f.citation}
                disabled={!open}
                onChange={handleCitationChange}
              />
            </Field>
          </div>

          {/* Business Impact (Max 250 Words) */}
          <div className="sm:col-span-2">
            <Field
              label="Business Impact"
              helpText={`${impactWords} / 250 words`}
            >
              <textarea
                rows={4}
                className={inputCls}
                placeholder="Preferably detail measurable business impact and ROI in bullet points."
                value={f.businessImpact}
                disabled={!open}
                onChange={handleImpactChange}
              />
            </Field>
          </div>
        </div>

        {cat && (
          <p className="mt-4 rounded-xl bg-blue-900/5 p-3.5 text-xs leading-relaxed text-blue-900/70 border border-blue-900/10">
            <strong className="font-bold text-blue-950">{cat.name}:</strong> {cat.blurb}
          </p>
        )}

        {msg && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-xs font-medium ${
              msg.bad
                ? "border border-red-200 bg-red-50 text-red-800"
                : "border border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {msg.bad ? <ShieldAlert size={16} /> : <CheckCircle2 size={16} />}
            <span>{msg.text}</span>
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <Button onClick={submit} disabled={!open}>
            {editingNomId ? "Save & Update Citation" : "Submit Self-Nomination"}
          </Button>
          {editingNomId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </Card>

      {/* 2. My Applied Nominations History List (User Specific Only) */}
      <Card className="p-6 border border-blue-900/10 shadow-xs bg-white space-y-4">
        <div className="flex items-center justify-between border-b border-blue-900/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900/10 text-blue-900">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-blue-950">
                My Applied Self-Nominations
              </h3>
              <p className="text-xs text-blue-900/60">
                Nominations submitted strictly by you in the current active cycle.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-blue-900/10 px-3 py-1 text-xs font-bold text-blue-950">
            {userNominations.length} {userNominations.length === 1 ? "Entry" : "Entries"}
          </span>
        </div>

        <div className="space-y-3">
          {userNominations.length === 0 ? (
            <Empty
              title="No self-nominations submitted yet"
              hint="Nominations you submit will show up here for tracking."
            />
          ) : (
            userNominations
              .slice()
              .reverse()
              .map((n) => {
                const isEndorsed = cycle.endorsed[n.unit]?.[n.category] === n.id;
                const isBeingEdited = editingNomId === n.id;
                return (
                  <div
                    key={n.id}
                    className={`rounded-2xl border p-4 space-y-3 transition ${
                      isBeingEdited
                        ? "border-amber-300 bg-amber-50/50 shadow-xs"
                        : "border-slate-200/80 bg-slate-50/50 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-900 uppercase">
                          {catById(n.category)?.name || n.category}
                        </span>
                        <h4 className="text-xs font-bold text-blue-950">
                          {n.name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {open && (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(n)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-blue-900/20"
                            title="Edit Citation & Impact details"
                          >
                            <Edit3 size={12} className="text-blue-700" />
                            <span>Edit Citation</span>
                          </button>
                        )}
                        {isEndorsed ? (
                          <Pill tone="good">
                            <CheckCircle2 size={11} className="inline mr-1" /> HOD Endorsed
                          </Pill>
                        ) : (
                          <Pill tone="muted">Submitted</Pill>
                        )}
                      </div>
                    </div>

                    {n.mafsValue && (
                      <span className="inline-block rounded-md bg-sky-50 border border-sky-200/60 px-2 py-0.5 text-[10px] font-bold text-sky-900">
                        MAFS: {n.mafsValue}
                      </span>
                    )}

                    <div className="space-y-1.5 text-xs text-blue-900/80">
                      <div>
                        <strong className="block text-[11px] font-bold text-slate-500 uppercase">Projects / Contribution:</strong>
                        <p className="line-clamp-3 italic bg-white p-2.5 rounded-lg border border-slate-200/60 text-[11px] whitespace-pre-wrap">
                          {n.citation}
                        </p>
                      </div>

                      {n.businessImpact && (
                        <div>
                          <strong className="block text-[11px] font-bold text-slate-500 uppercase">Business Impact:</strong>
                          <p className="line-clamp-2 italic bg-white p-2.5 rounded-lg border border-slate-200/60 text-[11px] whitespace-pre-wrap">
                            {n.businessImpact}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
                      <span>Unit: {unitById(n.unit)?.name || n.unit}</span>
                      <span>{new Date(n.submittedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </Card>
    </div>
  );
};

export default NominateView;
