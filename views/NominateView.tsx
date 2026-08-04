import React, { useState } from "react";
import { Lock, Clock, Calendar } from "lucide-react";
import { UNITS, CATEGORIES, catById, unitById } from "../lib/constants";
import { AuthUser, Cycle, Nomination } from "../lib/types";
import { getCycleTimeline, getEffectiveEndDate, formatDatePretty } from "../lib/helpers";
import Card from "../components/Card";
import Label from "../components/Label";
import Button from "../components/Button";
import Empty from "../components/Empty";
import Pill from "../components/Pill";

const inputCls =
  "w-full rounded border border-blue-900/15 bg-white px-3 py-2 text-sm text-blue-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20";

const readOnlyCls =
  "w-full rounded border border-blue-900/15 bg-blue-900/5 px-3 py-2 text-sm font-medium text-blue-950 outline-none cursor-not-allowed";

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <Label>{label}</Label>
    {children}
  </label>
);

export interface NominateViewProps {
  cycle: Cycle;
  commit: (next: Cycle) => void;
  currentUser?: AuthUser | null;
  locked: boolean;
}

export const NominateView: React.FC<NominateViewProps> = ({ cycle, commit, currentUser, locked }) => {
  const [f, setF] = React.useState({
    name: currentUser?.name || "",
    code: currentUser?.code || "",
    unit: currentUser?.unitId || UNITS[0].id,
    category: CATEGORIES[0].id,
    gender: currentUser?.gender || "",
    citation: "",
    evidence: "",
  });

  const [msg, setMsg] = useState<{ bad: boolean; text: string } | null>(null);

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

  const timeline = getCycleTimeline(cycle);
  const nomPhase = timeline.nomination;
  const effectiveEnd = getEffectiveEndDate(nomPhase);
  const open = cycle.stage === "nomination" && !locked;
  const cat = catById(f.category);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = () => {
    const code = (f.code || currentUser?.code || "").trim().toUpperCase();
    const name = (f.name || currentUser?.name || "").trim();
    const unit = f.unit || currentUser?.unitId || UNITS[0].id;

    if (!name || !code)
      return setMsg({ bad: true, text: "Your employee profile details could not be found." });
    if (f.citation.trim().length < 40)
      return setMsg({
        bad: true,
        text: "Write at least a couple of lines of citation — the panel scores on evidence.",
      });
    if (cat?.splitByGender && !f.gender)
      return setMsg({
        bad: true,
        text: "Employee of the Month is declared for a male and a female winner — pick your gender below.",
      });

    // One self-nomination allowed per category per employee
    if (cycle.nominations.some((n) => n.code === code && n.category === f.category))
      return setMsg({
        bad: true,
        text: `You have already filed a nomination under '${cat?.name}' for this month. You may nominate yourself in other categories.`,
      });

    const nom: Nomination = {
      id: `${code}-${f.category}-${Date.now()}`,
      name,
      code,
      unit,
      category: f.category,
      gender: cat?.splitByGender ? f.gender : "",
      citation: f.citation.trim(),
      evidence: f.evidence.trim(),
      submittedAt: new Date().toISOString(),
      validated: null,
      hrNote: "",
    };

    commit({ ...cycle, nominations: [...cycle.nominations, nom] });
    setF((prev) => ({ ...prev, citation: "", evidence: "" }));
    setMsg({ bad: false, text: `Self-nomination successfully filed under ${cat?.name}.` });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-900/10 pb-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Self-Nomination
            </h2>
            <p className="mt-0.5 text-xs text-blue-900/60">
              Your profile details are auto-filled. You can nominate yourself across multiple categories.
            </p>
          </div>
          {nomPhase.isExtended && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-900">
              <Clock size={12} /> Deadline Extended to {formatDatePretty(effectiveEnd)}
            </span>
          )}
        </div>

        {/* Timeline Information Banner */}
        <div className="mt-3 flex items-center gap-2 rounded bg-blue-900/5 px-3 py-2 text-xs text-blue-950 font-medium">
          <Calendar size={14} className="text-blue-700 shrink-0" />
          <span>
            Form Filling Window: <strong>{formatDatePretty(nomPhase.startDate)}</strong> – <strong>{formatDatePretty(effectiveEnd)}</strong>
            {nomPhase.isExtended ? " (Admin Extended)" : ""}
          </span>
        </div>

        {!open && (
          <div className="mt-3 flex items-center gap-2 rounded border border-blue-900/15 bg-blue-900/5 px-3 py-2 text-xs font-medium text-blue-900/80">
            <Lock size={13} /> The nomination window is currently closed for this cycle.
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {/* Locked Profile Fields - Self Nomination Only */}
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
          <Field label="Department / Plant (Auto-Filled)">
            <select
              className={readOnlyCls}
              value={f.unit}
              disabled
            >
              {UNITS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.kind === "Plant" ? `Plant — ${u.name}` : u.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Award Category">
            <select
              className={inputCls}
              value={f.category}
              disabled={!open}
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
          <div className="sm:col-span-2">
            <Field label="Citation — what you did and what it changed">
              <textarea
                rows={4}
                className={inputCls}
                placeholder="Name the measure that moved: PPM, response time, cost, downtime, people trained."
                value={f.citation}
                disabled={!open}
                onChange={(e) => set("citation", e.target.value)}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Supporting evidence — link or file reference">
              <input
                className={inputCls}
                placeholder="SharePoint link, 8D number, customer mail reference…"
                value={f.evidence}
                disabled={!open}
                onChange={(e) => set("evidence", e.target.value)}
              />
            </Field>
          </div>
        </div>

        {cat && (
          <p className="mt-4 rounded bg-blue-900/5 px-3 py-2 text-xs leading-relaxed text-blue-900/70">
            <strong className="font-semibold">{cat.name}:</strong> {cat.blurb}
          </p>
        )}

        {msg && (
          <p
            className={`mt-3 text-xs font-medium ${msg.bad ? "text-red-800" : "text-blue-800"}`}
          >
            {msg.text}
          </p>
        )}

        <div className="mt-4">
          <Button onClick={submit} disabled={!open}>
            Submit Self-Nomination
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold tracking-tight">
          Filed this month
          <span className="ml-2 font-mono text-xs text-blue-900/50">
            {cycle.nominations.length}
          </span>
        </h3>
        <div className="mt-4 space-y-2">
          {cycle.nominations.length === 0 ? (
            <Empty
              title="No nominations yet"
              hint="The first entry of the cycle shows up here."
            />
          ) : (
            cycle.nominations
              .slice()
              .reverse()
              .map((n) => (
                <div
                  key={n.id}
                  className="rounded border border-blue-900/10 px-3 py-2.5"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium">{n.name}</p>
                    <span className="font-mono text-xs text-blue-900/45">
                      {n.code}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-blue-900/60">
                    {unitById(n.unit)?.name} · {catById(n.category)?.name}
                    {n.gender ? ` (${n.gender})` : ""}
                  </p>
                </div>
              ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default NominateView;
