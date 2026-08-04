"use client";

import React, { useState } from "react";
import { Lock } from "lucide-react";
import { UNITS, CATEGORIES, catById, unitById } from "../lib/constants";
import { Cycle, Nomination } from "../lib/types";
import Card from "../components/Card";
import Label from "../components/Label";
import Button from "../components/Button";
import Empty from "../components/Empty";

const inputCls =
  "w-full rounded border border-blue-900/15 bg-white px-3 py-2 text-sm text-blue-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20";

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <Label>{label}</Label>
    {children}
  </label>
);

export interface NominateViewProps {
  cycle: Cycle;
  commit: (next: Cycle) => void;
  locked: boolean;
}

export const NominateView: React.FC<NominateViewProps> = ({ cycle, commit, locked }) => {
  const blank = {
    name: "",
    code: "",
    unit: UNITS[0].id,
    category: CATEGORIES[0].id,
    gender: "",
    citation: "",
    evidence: "",
  };
  const [f, setF] = useState(blank);
  const [msg, setMsg] = useState<{ bad: boolean; text: string } | null>(null);

  const open = cycle.stage === "nomination" && !locked;
  const cat = catById(f.category);
  const set = (k: keyof typeof blank, v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = () => {
    const code = f.code.trim().toUpperCase();
    if (!f.name.trim() || !code)
      return setMsg({ bad: true, text: "Name and employee code are both required." });
    if (f.citation.trim().length < 40)
      return setMsg({
        bad: true,
        text: "Write at least a couple of lines of citation — the panel scores on evidence.",
      });
    if (cat?.splitByGender && !f.gender)
      return setMsg({
        bad: true,
        text: "Employee of the Month is declared for a male and a female winner — pick one.",
      });
    if (cycle.nominations.some((n) => n.code === code))
      return setMsg({
        bad: true,
        text: `${code} already has a nomination this month. One category per employee per month.`,
      });

    const nom: Nomination = {
      id: `${code}-${Date.now()}`,
      name: f.name.trim(),
      code,
      unit: f.unit,
      category: f.category,
      gender: cat?.splitByGender ? f.gender : "",
      citation: f.citation.trim(),
      evidence: f.evidence.trim(),
      submittedAt: new Date().toISOString(),
      validated: null,
      hrNote: "",
    };
    commit({ ...cycle, nominations: [...cycle.nominations, nom] });
    setF(blank);
    setMsg({ bad: false, text: `Nomination filed for ${nom.name}.` });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="text-base font-semibold tracking-tight">
          Self-nomination
        </h2>
        <p className="mt-1 text-xs text-blue-900/60">
          One category per employee per month. Your HOD picks who goes forward.
        </p>

        {!open && (
          <div className="mt-4 flex items-center gap-2 rounded border border-blue-900/15 bg-blue-900/5 px-3 py-2 text-xs">
            <Lock size={13} /> The nomination window is closed for this cycle.
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Employee name">
            <input
              className={inputCls}
              value={f.name}
              disabled={!open}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>
          <Field label="Employee code">
            <input
              className={`${inputCls} font-mono uppercase`}
              value={f.code}
              disabled={!open}
              onChange={(e) => set("code", e.target.value)}
            />
          </Field>
          <Field label="Department / plant">
            <select
              className={inputCls}
              value={f.unit}
              disabled={!open}
              onChange={(e) => set("unit", e.target.value)}
            >
              {UNITS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.kind === "Plant" ? `Plant — ${u.name}` : u.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Award category">
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
            <Field label="Declared under">
              <select
                className={inputCls}
                value={f.gender}
                disabled={!open}
                onChange={(e) => set("gender", e.target.value)}
              >
                <option value="">Select</option>
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
            Submit nomination
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
