"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Download,
  ChevronRight,
  Calendar,
  Clock,
  Plus,
  RotateCcw,
  User,
  Edit3,
  Search,
  Key,
  Trash2,
  UserPlus,
  X,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Trophy,
} from "lucide-react";
import { STAGES, PANEL_SIZE, POINTS, UNITS, catById, unitById } from "../lib/constants";
import {
  results,
  endorsedList,
  panelScore,
  getCycleTimeline,
  getEffectiveEndDate,
  addDaysToDateStr,
  formatDatePretty,
} from "../lib/helpers";
import { saveBranding, savePoints } from "../lib/storage";
import { Cycle, PointsState, Branding, CycleTimeline, PhaseTimeline } from "../lib/types";
import Card from "../components/Card";
import Label from "../components/Label";
import Button from "../components/Button";
import Pill from "../components/Pill";
import BrandMark from "../components/BrandMark";
import Empty from "../components/Empty";

const inputCls =
  "w-full rounded border border-blue-900/15 bg-white px-3 py-2 text-sm text-blue-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20";

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <Label>{label}</Label>
    {children}
  </label>
);

interface HodEmployee {
  code: string;
  name: string;
  unitId: string;
  role?: string;
  isPanelJudge?: boolean;
}

export interface EmployeeRecord {
  _id?: string;
  code: string;
  name: string;
  unitId: string;
  role: "employee" | "hod" | "hr";
  isPanelJudge?: boolean;
  gender?: string;
  designation?: string;
  email?: string;
}

export interface HrViewProps {
  cycle: Cycle;
  commit: (next: Cycle) => void;
  points: PointsState;
  setPoints: React.Dispatch<React.SetStateAction<PointsState>>;
  monthLabel: string;
  brand: Branding;
  setBrand: React.Dispatch<React.SetStateAction<Branding>>;
}

export const HrView: React.FC<HrViewProps> = ({
  cycle,
  commit,
  points,
  setPoints,
  monthLabel,
  brand,
  setBrand,
}) => {
  const [logoDraft, setLogoDraft] = useState(brand.logoUrl || "");
  const [logoSaved, setLogoSaved] = useState(false);
  const [hodsList, setHodsList] = useState<HodEmployee[]>([]);

  // Employee Directory & Details Management States
  const [allEmployees, setAllEmployees] = useState<EmployeeRecord[]>([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [empSearch, setEmpSearch] = useState("");
  const [empRoleFilter, setEmpRoleFilter] = useState("all");
  const [empUnitFilter, setEmpUnitFilter] = useState("all");

  // Edit Employee Modal States
  const [editingEmp, setEditingEmp] = useState<EmployeeRecord | null>(null);
  const [editName, setEditName] = useState("");
  const [editUnitId, setEditUnitId] = useState("p1");
  const [editRole, setEditRole] = useState<"employee" | "hod" | "hr">("employee");
  const [editIsPanelJudge, setEditIsPanelJudge] = useState(false);
  const [editGender, setEditGender] = useState("");
  const [editNewPassword, setEditNewPassword] = useState("");
  const [editResetDefault, setEditResetDefault] = useState(false);
  const [editStatusMsg, setEditStatusMsg] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Add Employee Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [addCode, setAddCode] = useState("");
  const [addName, setAddName] = useState("");
  const [addUnitId, setAddUnitId] = useState("p1");
  const [addRole, setAddRole] = useState<"employee" | "hod" | "hr">("employee");
  const [addIsPanelJudge, setAddIsPanelJudge] = useState(false);
  const [addGender, setAddGender] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addMsg, setAddMsg] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const fetchEmployees = async () => {
    setEmpLoading(true);
    try {
      const res = await fetch("/api/employees");
      if (res.ok) {
        const data = await res.json();
        setAllEmployees(data.employees || []);
      }
    } catch (e) {
      /* ignore */
    } finally {
      setEmpLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Stage & Winner Password Verification Modal States
  const [stageAuthAction, setStageAuthAction] = useState<
    { type: "change_stage"; targetStage: string; title: string } | { type: "announce_winner"; title: string } | null
  >(null);
  const [stageAuthPassword, setStageAuthPassword] = useState("");
  const [stageAuthError, setStageAuthError] = useState<string | null>(null);
  const [stageAuthSubmitting, setStageAuthSubmitting] = useState(false);

  // Admin Confirmation & Password Auth Modal States
  const [showConfirmPrompt, setShowConfirmPrompt] = useState(false);
  const [showAdminAuthPrompt, setShowAdminAuthPrompt] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);

  const handleStageChangeClick = (targetStage: string) => {
    const isRevertingFromJudging = cycle.stage === "judging" && (targetStage === "nomination" || targetStage === "validation");
    if (targetStage === "judging" || targetStage === "nomination" || isRevertingFromJudging) {
      let title = "Change Cycle Stage";
      if (targetStage === "judging") {
        title = "Change Cycle Stage to Panel Scoring";
      } else if (targetStage === "nomination") {
        title = "Revert Cycle Stage to Nominations";
      } else if (targetStage === "validation") {
        title = "Revert Cycle Stage to HR Validation";
      }

      setStageAuthAction({
        type: "change_stage",
        targetStage,
        title,
      });
      setStageAuthPassword("");
      setStageAuthError(null);
    } else {
      commit({ ...cycle, stage: targetStage });
    }
  };

  const handleAnnounceClick = () => {
    setStageAuthAction({
      type: "announce_winner",
      title: "Declare Winners & Publish Results",
    });
    setStageAuthPassword("");
    setStageAuthError(null);
  };

  const executeStageAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageAuthAction || !stageAuthPassword.trim()) {
      setStageAuthError("Admin password is required.");
      return;
    }

    setStageAuthSubmitting(true);
    setStageAuthError(null);

    try {
      const response = await fetch("/api/auth/verify-admin-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword: stageAuthPassword.trim() }),
      });

      const data = await response.json();
      setStageAuthSubmitting(false);

      if (!response.ok) {
        setStageAuthError(data.error || "Incorrect Admin Password or authorization error.");
      } else {
        const action = stageAuthAction;
        setStageAuthAction(null);

        if (action.type === "change_stage") {
          commit({ ...cycle, stage: action.targetStage });
        } else if (action.type === "announce_winner") {
          await announce();
        }
      }
    } catch (err) {
      setStageAuthSubmitting(false);
      setStageAuthError("Network error while authorizing action.");
    }
  };

  const openEditModal = (emp: EmployeeRecord) => {
    setEditingEmp(emp);
    setEditName(emp.name);
    setEditUnitId(emp.unitId);
    setEditRole(emp.role || "employee");
    setEditIsPanelJudge(Boolean(emp.isPanelJudge));
    setEditGender(emp.gender || "");
    setEditNewPassword("");
    setEditResetDefault(false);
    setEditStatusMsg(null);
  };

  // Step 1: Triggered when HR Admin clicks "Save Details"
  const handleSaveEmpEditClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;
    setEditStatusMsg(null);
    setShowConfirmPrompt(true); // Show Yes/No modal
  };

  // Step 2: Triggered when HR Admin clicks "Yes, Continue"
  const handleProceedToPasswordAuth = () => {
    setShowConfirmPrompt(false);
    setShowAdminAuthPrompt(true); // Show Admin Password modal
    setAdminPasswordInput("");
    setAdminAuthError(null);
  };

  // Step 3: Triggered when HR Admin submits password in Admin Password modal
  const executeEmpEditWithAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp || !adminPasswordInput.trim()) {
      setAdminAuthError("Admin password is required.");
      return;
    }

    setEditSaving(true);
    setAdminAuthError(null);

    try {
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: editingEmp.code,
          name: editName,
          unitId: editUnitId,
          role: editRole,
          isPanelJudge: editIsPanelJudge,
          gender: editGender,
          newPassword: editNewPassword.trim() ? editNewPassword.trim() : undefined,
          resetPassword: editResetDefault,
          adminPassword: adminPasswordInput.trim(),
        }),
      });

      const data = await res.json();
      setEditSaving(false);

      if (!res.ok) {
        setAdminAuthError(data.error || "Incorrect Admin Password or authorization error.");
      } else {
        setShowAdminAuthPrompt(false);
        setEditStatusMsg({ type: "success", msg: `Employee ${editingEmp.code} updated successfully!` });
        fetchEmployees();
        setTimeout(() => {
          setEditingEmp(null);
          setEditStatusMsg(null);
        }, 1200);
      }
    } catch (e) {
      setEditSaving(false);
      setAdminAuthError("Network error while authorizing changes.");
    }
  };

  const handleAddEmpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCode || !addName) return;

    setAddSaving(true);
    setAddMsg(null);

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: addCode.trim().toUpperCase(),
          name: addName.trim(),
          unitId: addUnitId,
          role: addRole,
          isPanelJudge: addIsPanelJudge,
          gender: addGender,
        }),
      });

      const data = await res.json();
      setAddSaving(false);

      if (!res.ok) {
        setAddMsg({ type: "error", msg: data.error || "Failed to add employee." });
      } else {
        setAddMsg({ type: "success", msg: `Employee ${addCode} added successfully!` });
        fetchEmployees();
        setAddCode("");
        setAddName("");
        setTimeout(() => {
          setShowAddModal(false);
          setAddMsg(null);
        }, 1200);
      }
    } catch (e) {
      setAddSaving(false);
      setAddMsg({ type: "error", msg: "Network error while adding employee." });
    }
  };

  // Delete Employee Confirmation & Password Auth Modal States
  const [deletingEmpTarget, setDeletingEmpTarget] = useState<EmployeeRecord | null>(null);
  const [showDeleteConfirmPrompt, setShowDeleteConfirmPrompt] = useState(false);
  const [showDeleteAdminAuthPrompt, setShowDeleteAdminAuthPrompt] = useState(false);
  const [deleteAdminPasswordInput, setDeleteAdminPasswordInput] = useState("");
  const [deleteAdminAuthError, setDeleteAdminAuthError] = useState<string | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // Step 1: Triggered when HR Admin clicks Trash button on employee row
  const handleDeleteEmpClick = (emp: EmployeeRecord) => {
    setDeletingEmpTarget(emp);
    setShowDeleteConfirmPrompt(true); // Show Yes/No modal for delete
  };

  // Step 2: Triggered when HR Admin clicks "Yes, Continue" in Delete modal
  const handleProceedToDeletePasswordAuth = () => {
    setShowDeleteConfirmPrompt(false);
    setShowDeleteAdminAuthPrompt(true); // Show Admin Password modal for delete
    setDeleteAdminPasswordInput("");
    setDeleteAdminAuthError(null);
  };

  // Step 3: Triggered when HR Admin submits password in Delete Admin Password modal
  const executeEmpDeleteWithAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingEmpTarget || !deleteAdminPasswordInput.trim()) {
      setDeleteAdminAuthError("Admin password is required.");
      return;
    }

    setDeleteSaving(true);
    setDeleteAdminAuthError(null);

    try {
      const res = await fetch(
        `/api/employees?code=${encodeURIComponent(deletingEmpTarget.code)}&adminPassword=${encodeURIComponent(deleteAdminPasswordInput.trim())}`,
        { method: "DELETE" }
      );

      const data = await res.json();
      setDeleteSaving(false);

      if (!res.ok) {
        setDeleteAdminAuthError(data.error || "Incorrect Admin Password or authorization error.");
      } else {
        setShowDeleteAdminAuthPrompt(false);
        setDeletingEmpTarget(null);
        fetchEmployees();
      }
    } catch (e) {
      setDeleteSaving(false);
      setDeleteAdminAuthError("Network error while deleting employee.");
    }
  };

  const filteredEmployees = useMemo(() => {
    return allEmployees.filter((emp) => {
      const matchesSearch =
        !empSearch.trim() ||
        emp.name.toLowerCase().includes(empSearch.toLowerCase()) ||
        emp.code.toLowerCase().includes(empSearch.toLowerCase());
      const matchesRole = empRoleFilter === "all" || emp.role === empRoleFilter;
      const matchesUnit = empUnitFilter === "all" || emp.unitId === empUnitFilter;
      return matchesSearch && matchesRole && matchesUnit;
    });
  }, [allEmployees, empSearch, empRoleFilter, empUnitFilter]);

  useEffect(() => {
    async function fetchHods() {
      try {
        const res = await fetch("/api/employees?role=hod");
        if (res.ok) {
          const data = await res.json();
          setHodsList(data.employees || []);
        }
      } catch (e) {
        /* ignore */
      }
    }
    fetchHods();
  }, []);

  const saveLogo = async () => {
    const next = { ...brand, logoUrl: logoDraft.trim() };
    setBrand(next);
    setLogoSaved(false);
    try {
      await saveBranding(next);
      setLogoSaved(true);
    } catch (e) {
      setLogoSaved(false);
    }
  };

  const res = useMemo(() => results(cycle), [cycle]);
  const pool = endorsedList(cycle);
  const pending = cycle.nominations.filter((n) => n.validated === null).length;
  const timeline = getCycleTimeline(cycle);

  const updatePhaseTimeline = (
    phaseKey: keyof CycleTimeline,
    updates: Partial<PhaseTimeline>
  ) => {
    const currentTimeline = getCycleTimeline(cycle);
    const currentPhase = currentTimeline[phaseKey];
    const nextPhase: PhaseTimeline = { ...currentPhase, ...updates };
    const nextTimeline: CycleTimeline = {
      ...currentTimeline,
      [phaseKey]: nextPhase,
    };
    commit({
      ...cycle,
      timeline: nextTimeline,
    });
  };

  const extendPhaseByDays = (phaseKey: keyof CycleTimeline, days: number) => {
    const currentTimeline = getCycleTimeline(cycle);
    const currentPhase = currentTimeline[phaseKey];
    const baseEnd = currentPhase.extendedUntil || currentPhase.endDate;
    const newEnd = addDaysToDateStr(baseEnd, days);
    updatePhaseTimeline(phaseKey, {
      isExtended: true,
      extendedUntil: newEnd,
    });
  };

  const resetPhaseExtension = (phaseKey: keyof CycleTimeline) => {
    updatePhaseTimeline(phaseKey, {
      isExtended: false,
      extendedUntil: undefined,
    });
  };

  const setStage = (stage: string) => commit({ ...cycle, stage });

  const setJudge = async (slotId: string, empCode: string) => {
    const selectedEmp = hodsList.find((e) => e.code === empCode);
    const judgeName = selectedEmp
      ? `${selectedEmp.name} (${unitById(selectedEmp.unitId)?.name || selectedEmp.unitId})`
      : "";

    const updatedJudges = cycle.judges.map((j) =>
      j.id === slotId ? { ...j, name: judgeName, code: empCode } : j
    );

    // Commit updated cycle
    commit({
      ...cycle,
      judges: updatedJudges,
    });

    // Sync isPanelJudge boolean field to MongoDB employees collection (Max 3 HODs)
    const activeJudgeCodes = updatedJudges
      .map((j) => j.code)
      .filter((c): c is string => Boolean(c))
      .slice(0, 3); // Enforce max 3

    try {
      await fetch("/api/employees/panel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judgeCodes: activeJudgeCodes }),
      });
    } catch (e) {
      /* sync failed */
    }
  };

  const validate = (id: string, ok: boolean) =>
    commit({
      ...cycle,
      nominations: cycle.nominations.map((n) =>
        n.id === id ? { ...n, validated: ok } : n
      ),
    });

  const announce = async () => {
    // Winner is top-ranked nominee with at least 1 valid judge score (w.count > 0)
    const winners = res
      .map((r) => r.ranked[0])
      .filter((w) => w && w.nom && w.avg !== null && w.count > 0);
    const next = { ...points };
    winners.forEach((w) => {
      const k = w.nom.code;
      next[k] = next[k] || {
        name: w.nom.name,
        unit: w.nom.unit,
        points: 0,
        wins: [],
      };
      // Prevent duplicate logging for the same month and category
      const winExists = next[k].wins.some(
        (win) => win.month === cycle.month && win.category === w.nom.category
      );
      if (!winExists) {
        next[k].points += POINTS;
        next[k].wins.push({ month: cycle.month, category: w.nom.category });
      }
    });
    setPoints(next);
    try {
      await savePoints(next);
    } catch (e) {
      /* surfaced by the cycle write below if storage is down */
    }
    commit({
      ...cycle,
      stage: "announced",
      announcedAt: new Date().toISOString(),
    });
  };

  const syncLedgerFromCurrentCycle = async () => {
    const winners = res
      .map((r) => r.ranked[0])
      .filter((w) => w && w.nom && w.avg !== null && w.count > 0);

    const next = { ...points };
    let addedCount = 0;
    winners.forEach((w) => {
      const k = w.nom.code;
      next[k] = next[k] || {
        name: w.nom.name,
        unit: w.nom.unit,
        points: 0,
        wins: [],
      };
      const winExists = next[k].wins.some(
        (win) => win.month === cycle.month && win.category === w.nom.category
      );
      if (!winExists) {
        next[k].points += POINTS;
        next[k].wins.push({ month: cycle.month, category: w.nom.category });
        addedCount++;
      }
    });

    setPoints(next);
    try {
      await savePoints(next);
    } catch (e) {
      /* ignore */
    }
    alert(
      addedCount > 0
        ? `Successfully recorded ${addedCount} winner(s) into Annual LSIP Ledger!`
        : "Annual LSIP Ledger is already up to date with declared winners for this month."
    );
  };

  const exportCsv = () => {
    const rows: string[][] = [
      [
        "Month",
        "Category",
        "Slot",
        "Employee",
        "Code",
        "Department",
        "Judge 1",
        "Judge 2",
        "Judge 3",
        "Panel average",
        "Result",
      ],
    ];
    res.forEach((r) =>
      r.ranked.forEach((x, i) => {
        const s = cycle.scores[x.nom.id] || {};
        rows.push([
          cycle.month,
          r.category.name,
          r.slotLabel || "",
          x.nom.name,
          x.nom.code,
          unitById(x.nom.unit)?.name || x.nom.unit,
          String(s.j1 ?? ""),
          String(s.j2 ?? ""),
          String(s.j3 ?? ""),
          x.avg === null ? "" : x.avg.toFixed(2),
          i === 0 && x.avg !== null ? "Winner" : "",
        ]);
      })
    );
    const csv = rows
      .map((r) => r.map((c) => `"${String(c ?? "")}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `RR-${cycle.month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAnnualLedgerCsv = () => {
    const rows: string[][] = [
      [
        "Employee Code",
        "Employee Name",
        "Department / Unit",
        "Monthly Wins Count",
        "Cumulative Monthly Points (10 pts/win)",
        "LSIP 50% Weightage Score",
        "Winning Month(s) & Categories",
      ],
    ];

    Object.entries(points).forEach(([code, record]) => {
      const unitName = unitById(record.unit)?.name || record.unit;
      const winsCount = record.wins?.length || 0;
      const cumulativePoints = record.points || 0;
      const lsipWeightageScore = (cumulativePoints * 0.5).toFixed(1);
      const winsHistory = record.wins
        ?.map((w) => `${w.month}: ${catById(w.category)?.name || w.category}`)
        .join(" | ");

      rows.push([
        code,
        record.name,
        unitName,
        String(winsCount),
        String(cumulativePoints),
        lsipWeightageScore,
        winsHistory || "None",
      ]);
    });

    const csv = rows
      .map((r) => r.map((c) => `"${String(c ?? "")}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `Annual_LSIP_RR_Ledger.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Admin Cycle & Panel Scoring Control */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Label>Cycle Stage &amp; Admin Permission Control</Label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleStageChangeClick(s.id)}
                  disabled={s.id === "announced"}
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-150 active:scale-95 ${
                    cycle.stage === s.id
                      ? "bg-blue-800 text-white shadow-md shadow-blue-900/20"
                      : "border border-blue-900/15 bg-white text-blue-900/70 hover:border-blue-700 hover:bg-blue-50/50 disabled:opacity-40"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Dedicated Admin Panel Score Open/Close Button */}
            {cycle.stage === "judging" ? (
              <Button
                tone="danger"
                onClick={() => handleStageChangeClick("validation")}
              >
                Close Panel Scoring Page
              </Button>
            ) : (
              <Button
                tone="solid"
                disabled={cycle.stage === "announced"}
                onClick={() => handleStageChangeClick("judging")}
              >
                Open Panel Scoring Page
              </Button>
            )}

            <Button tone="quiet" onClick={exportCsv}>
              <Download size={13} /> Export CSV
            </Button>
            <Button
              onClick={handleAnnounceClick}
              disabled={cycle.stage === "announced" || pool.length === 0}
            >
              Declare Winners (Admin Permission Required) <ChevronRight size={13} />
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded bg-blue-900/5 p-3 text-xs text-blue-900/80">
          <span className="font-semibold text-blue-950">Admin Permission Status:</span>
          <span>
            Panel Scoring Page is{" "}
            <strong className={cycle.stage === "judging" ? "text-emerald-700" : "text-amber-800"}>
              {cycle.stage === "judging" ? "OPEN" : "CLOSED"}
            </strong>.
          </span>
          <span>
            Results Declaration is{" "}
            <strong className={cycle.stage === "announced" ? "text-emerald-700" : "text-blue-900"}>
              {cycle.stage === "announced" ? "DECLARED & PUBLISHED" : "PENDING ADMIN APPROVAL"}
            </strong>.
          </span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          {[
            ["Nominations", cycle.nominations.length],
            ["Endorsed", pool.length],
            ["Awaiting validation", pending],
            [
              "Scores in",
              pool.reduce((a, n) => a + panelScore(cycle, n.id).count, 0) +
                "/" +
                pool.length * PANEL_SIZE,
            ],
          ].map(([k, v]) => (
            <div key={k as string} className="rounded bg-blue-900/5 px-3 py-2.5">
              <Label>{k as string}</Label>
              <p className="font-mono text-xl tabular-nums">{v}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Admin Timeline & Date Extension Management */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-900/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-blue-700" />
              <h3 className="text-sm font-semibold tracking-tight">
                Timeline &amp; Date Extension Controls for {monthLabel}
              </h3>
            </div>
            <p className="mt-1 text-xs text-blue-900/60">
              Decide start and end dates for form filling, HOD endorsements, and panel scoring. Extend deadlines anytime.
            </p>
          </div>
          <Pill tone="good">Admin Access Enabled</Pill>
        </div>

        <div className="mt-5 space-y-4">
          {(
            [
              {
                key: "nomination",
                title: "1. Form Filling Timeline (Self-Nomination)",
                desc: "Window for employees to submit self-nominations.",
                phase: timeline.nomination,
              },
              {
                key: "hodEndorsement",
                title: "2. HOD Approval & Pushing Timeline",
                desc: "Window for HODs to endorse candidates for their department.",
                phase: timeline.hodEndorsement,
              },
              {
                key: "panelScoring",
                title: "3. Panel Scoring Timeline",
                desc: "Window for assigned HOD panel judges to enter candidate scores.",
                phase: timeline.panelScoring,
              },
            ] as const
          ).map(({ key, title, desc, phase }) => {
            const effectiveEnd = getEffectiveEndDate(phase);
            return (
              <div
                key={key}
                className={`rounded border p-4 transition ${
                  phase.isExtended
                    ? "border-amber-400/80 bg-amber-50/60 shadow-sm"
                    : "border-blue-900/15 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-semibold text-blue-950 uppercase tracking-wider flex items-center gap-2">
                      {title}
                      {phase.isExtended && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                          <Clock size={11} /> EXTENDED
                        </span>
                      )}
                    </h4>
                    <p className="mt-0.5 text-xs text-blue-900/60">{desc}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs font-semibold text-blue-950">
                      Active: {formatDatePretty(phase.startDate)} – {formatDatePretty(effectiveEnd)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <div className="w-36">
                    <Label>Start Date</Label>
                    <input
                      type="date"
                      value={phase.startDate}
                      onChange={(e) => updatePhaseTimeline(key, { startDate: e.target.value })}
                      className={inputCls}
                    />
                  </div>

                  <div className="w-36">
                    <Label>{phase.isExtended ? "Extended Until" : "End Date"}</Label>
                    <input
                      type="date"
                      value={effectiveEnd}
                      onChange={(e) =>
                        updatePhaseTimeline(key, {
                          isExtended: true,
                          extendedUntil: e.target.value,
                        })
                      }
                      className={`${inputCls} ${phase.isExtended ? "border-amber-500 font-semibold text-amber-950" : ""}`}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-blue-900/60 mr-1">Extend:</span>
                    <button
                      type="button"
                      onClick={() => extendPhaseByDays(key, 1)}
                      className="inline-flex items-center gap-1 rounded border border-blue-900/20 bg-blue-900/5 px-2.5 py-1.5 text-xs font-medium text-blue-950 hover:bg-blue-800 hover:text-white transition"
                    >
                      <Plus size={11} /> +1 Day
                    </button>
                    <button
                      type="button"
                      onClick={() => extendPhaseByDays(key, 3)}
                      className="inline-flex items-center gap-1 rounded border border-blue-900/20 bg-blue-900/5 px-2.5 py-1.5 text-xs font-medium text-blue-950 hover:bg-blue-800 hover:text-white transition"
                    >
                      <Plus size={11} /> +3 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => extendPhaseByDays(key, 7)}
                      className="inline-flex items-center gap-1 rounded border border-blue-900/20 bg-blue-900/5 px-2.5 py-1.5 text-xs font-medium text-blue-950 hover:bg-blue-800 hover:text-white transition"
                    >
                      <Plus size={11} /> +7 Days
                    </button>

                    {phase.isExtended && (
                      <button
                        type="button"
                        onClick={() => resetPhaseExtension(key)}
                        className="inline-flex items-center gap-1 rounded border border-amber-600/40 bg-amber-100 px-2.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-200 transition"
                        title="Reset extension to standard end date"
                      >
                        <RotateCcw size={11} /> Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>



      {/* Panel Judge Assignment (HODs Only, Max 3 Allowed) */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">
              HOD Judging Panel Selection for {monthLabel}
            </h3>
            <p className="mt-1 text-xs text-blue-900/60">
              Only registered HODs can be assigned to the judging panel (Max 3 HOD judges). Selected HODs gain Panel Scoring access (`isPanelJudge: true` in DB).
            </p>
          </div>
          <Pill tone="good">Max 3 HOD Judges Allowed</Pill>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {cycle.judges.map((j, i) => (
            <Field key={j.id} label={`HOD Judge ${i + 1} Slot`}>
              <select
                className={inputCls}
                value={j.code || ""}
                onChange={(e) => setJudge(j.id, e.target.value)}
              >
                <option value="">Select Registered HOD</option>
                {hodsList.map((h) => {
                  const labelName = `${h.name} — ${h.code} (${unitById(h.unitId)?.name || h.unitId})`;
                  return (
                    <option key={h.code} value={h.code}>
                      {labelName}
                    </option>
                  );
                })}
              </select>
            </Field>
          ))}
        </div>
      </Card>



      {/* Standings */}
      <div>
        <h3 className="mb-2 text-sm font-semibold tracking-tight">
          {cycle.stage === "announced" ? "Winners" : "Live standings"}
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {res.map((r) => (
            <Card key={r.category.id + (r.slotLabel || "")} className="p-4">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold">{r.category.name}</h4>
                {r.slotLabel && <Pill>{r.slotLabel}</Pill>}
              </div>
              {r.ranked.length === 0 ? (
                <p className="mt-3 text-xs text-blue-900/50">
                  No endorsed nominee.
                </p>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {r.ranked.map((x, i) => (
                    <li
                      key={x.nom.id}
                      className="flex items-center gap-3 border-t border-blue-900/10 pt-1.5 first:border-0 first:pt-0"
                    >
                      <span className="font-mono text-xs text-blue-900/35">
                        {i + 1}
                      </span>
                      <span className="flex-1 text-sm">
                        {x.nom.name}
                        <span className="ml-2 text-xs text-blue-900/50">
                          {unitById(x.nom.unit)?.name}
                        </span>
                      </span>
                      {i === 0 && x.avg !== null && cycle.stage === "announced" && (
                        <Pill tone="gold">Winner</Pill>
                      )}
                      <span className="font-mono text-sm tabular-nums">
                        {x.avg === null ? "—" : x.avg.toFixed(2)}
                      </span>
                      <span className="font-mono text-xs text-blue-900/40">
                        {x.count}/{PANEL_SIZE}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Annual R&R Ledger & Year-End LSIP Weightage Tracker */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-blue-900/10 pb-4">
          <div>
            <h3 className="text-base font-bold tracking-tight text-blue-950 flex items-center gap-2">
              <Trophy className="text-amber-500" size={18} /> Annual R&amp;R Ledger &amp; Year-End LSIP Weightage Tracker
            </h3>
            <p className="text-xs text-blue-900/70 mt-1">
              Monthly winners receive <strong>10 points</strong> recorded in this HR ledger. Monthly awards carry a <strong>50% weightage</strong> in the year-end LSIP awards.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {cycle.stage === "announced" && (
              <button
                onClick={syncLedgerFromCurrentCycle}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-200 transition shadow-sm active:scale-95"
                title="Sync winner(s) from current announced cycle into Annual Ledger"
              >
                <RotateCcw size={13} /> Sync Winners
              </button>
            )}
            <button
              onClick={exportAnnualLedgerCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-900/20 bg-blue-900/5 px-3 py-1.5 text-xs font-semibold text-blue-950 hover:bg-blue-800 hover:text-white transition shadow-sm active:scale-95"
              title="Export complete year-end LSIP ledger to CSV"
            >
              <Download size={13} /> Export LSIP Ledger (CSV)
            </button>
          </div>
        </div>

        {/* Business Policy Summary Banner */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/60 bg-amber-50/70 p-3.5 text-xs text-amber-950">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Year-End Conversion Rule:</span> Cumulative monthly points feed directly into the monthly component of Year-End R&amp;R (50% weightage).
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono font-bold text-[11px]">
            <span className="rounded bg-amber-200/80 px-2 py-0.5 text-amber-900">1 Win = 10 Points</span>
            <span className="rounded bg-amber-200/80 px-2 py-0.5 text-amber-900">Weightage = 50% LSIP</span>
          </div>
        </div>

        {/* Annual Points & LSIP Weightage Table */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-blue-900/10 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-blue-900/10 bg-blue-900/5 text-[11px] font-bold uppercase tracking-wider text-blue-900/70">
              <tr>
                <th className="px-4 py-3">Employee Code &amp; Name</th>
                <th className="px-4 py-3">Department / Unit</th>
                <th className="px-4 py-3 text-center">Monthly Wins</th>
                <th className="px-4 py-3 text-center">Cumulative Points</th>
                <th className="px-4 py-3">Winning Month(s) &amp; Categories</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-900/10">
              {Object.keys(points).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-blue-900/50 italic">
                    No points recorded in HR annual ledger yet. Points will accumulate as monthly winners are announced.
                  </td>
                </tr>
              ) : (
                Object.entries(points).map(([code, p]) => {
                  const winsCount = p.wins?.length || 0;
                  const totalPts = p.points || 0;
                  return (
                    <tr key={code} className="hover:bg-blue-50/40 transition">
                      <td className="px-4 py-3 font-medium text-blue-950">
                        <div className="font-bold">{p.name}</div>
                        <div className="font-mono text-[10px] text-blue-900/50">{code}</div>
                      </td>
                      <td className="px-4 py-3 text-blue-900/80">
                        {unitById(p.unit)?.name || p.unit}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-900">
                          {winsCount} {winsCount === 1 ? "Win" : "Wins"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-amber-700">
                        {totalPts} pts
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {p.wins && p.wins.length > 0 ? (
                            p.wins.map((w, idx) => (
                              <span
                                key={idx}
                                className="rounded bg-blue-900/5 px-2 py-0.5 text-[10px] font-medium text-blue-900/80 border border-blue-900/10"
                              >
                                {w.month}: {catById(w.category)?.name || w.category}
                              </span>
                            ))
                          ) : (
                            <span className="text-blue-900/40 italic">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Admin Employee Master Directory & Management */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-blue-900/10 pb-4">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-blue-950 flex items-center gap-2">
              <User className="text-blue-800" size={16} /> Employee Master Directory &amp; Admin Access
            </h3>
            <p className="text-xs text-blue-900/60 mt-0.5">
              Manage employee details, department assignments, roles, panel judge access, and passwords.
            </p>
          </div>
          <Button
            onClick={() => {
              setShowAddModal(true);
              setAddCode("");
              setAddName("");
              setAddUnitId("p1");
              setAddRole("employee");
              setAddIsPanelJudge(false);
              setAddGender("");
              setAddMsg(null);
            }}
            className="flex items-center gap-1.5"
          >
            <UserPlus size={14} /> Add New Employee
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-900/40" />
            <input
              type="text"
              placeholder="Search by Employee Code or Name..."
              value={empSearch}
              onChange={(e) => setEmpSearch(e.target.value)}
              className="w-full rounded-xl border border-blue-900/15 bg-white pl-9 pr-3 py-2 text-xs text-blue-950 outline-none focus:border-blue-700 shadow-sm"
            />
          </div>

          <div className="w-36">
            <select
              value={empRoleFilter}
              onChange={(e) => setEmpRoleFilter(e.target.value)}
              className="w-full rounded-xl border border-blue-900/15 bg-white px-3 py-2 text-xs font-medium text-blue-950 outline-none shadow-sm"
            >
              <option value="all">All Roles</option>
              <option value="employee">Employee</option>
              <option value="hod">HOD</option>
              <option value="hr">HR Admin</option>
            </select>
          </div>

          <div className="w-44">
            <select
              value={empUnitFilter}
              onChange={(e) => setEmpUnitFilter(e.target.value)}
              className="w-full rounded-xl border border-blue-900/15 bg-white px-3 py-2 text-xs font-medium text-blue-950 outline-none shadow-sm"
            >
              <option value="all">All Departments/Units</option>
              {UNITS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Employee Table */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-blue-900/10">
          <table className="w-full text-xs">
            <thead className="bg-blue-900/5 text-blue-900/70 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-2.5 text-left">Emp Code</th>
                <th className="px-4 py-2.5 text-left">Employee Name</th>
                <th className="px-4 py-2.5 text-left">Department / Unit</th>
                <th className="px-4 py-2.5 text-left">Role</th>
                <th className="px-4 py-2.5 text-left">Panel Judge</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-900/10 bg-white">
              {empLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-blue-900/50">
                    Loading employee directory...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-blue-900/50">
                    No employees matching filter criteria found.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.code} className="hover:bg-blue-50/40 transition">
                    <td className="px-4 py-2.5 font-mono font-bold text-blue-950">{emp.code}</td>
                    <td className="px-4 py-2.5 font-medium text-blue-950">{emp.name}</td>
                    <td className="px-4 py-2.5 text-blue-900/80">{unitById(emp.unitId)?.name || emp.unitId}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                          emp.role === "hr"
                            ? "bg-purple-100 text-purple-900 border border-purple-300"
                            : emp.role === "hod"
                            ? "bg-blue-100 text-blue-900 border border-blue-300"
                            : "bg-slate-100 text-slate-700 border border-slate-300"
                        }`}
                      >
                        {emp.role}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {emp.isPanelJudge ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          <CheckCircle2 size={10} /> Panel Judge
                        </span>
                      ) : (
                        <span className="text-blue-900/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(emp)}
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-900/15 bg-white px-2.5 py-1 text-xs font-semibold text-blue-900 hover:bg-blue-50 transition active:scale-95 shadow-sm"
                      >
                        <Edit3 size={12} /> Edit Details
                      </button>
                      <button
                        onClick={() => handleDeleteEmpClick(emp)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 transition active:scale-95 shadow-sm"
                        title="Delete Employee"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Employee Details Modal */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-blue-900/10 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-blue-900/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900/10 text-blue-900">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-blue-950">
                    Edit Employee Details
                  </h3>
                  <p className="text-xs text-blue-900/60 font-mono">
                    Code: <strong>{editingEmp.code}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingEmp(null)}
                className="rounded-lg p-1.5 text-blue-900/40 hover:bg-blue-900/5 hover:text-blue-950 transition"
              >
                <X size={18} />
              </button>
            </div>

            {editStatusMsg && (
              <div
                className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-xs font-medium ${
                  editStatusMsg.type === "success"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border border-red-200 bg-red-50 text-red-800"
                }`}
              >
                {editStatusMsg.type === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                <span>{editStatusMsg.msg}</span>
              </div>
            )}

            <form onSubmit={handleSaveEmpEditClick} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-blue-900/60 mb-1">
                    Employee Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-blue-900/15 bg-white px-3 py-2 text-xs text-blue-950 outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-blue-900/60 mb-1">
                    Department / Unit
                  </label>
                  <select
                    value={editUnitId}
                    onChange={(e) => setEditUnitId(e.target.value)}
                    className="w-full rounded-xl border border-blue-900/15 bg-white px-3 py-2 text-xs font-medium text-blue-950 outline-none focus:border-blue-700"
                  >
                    {UNITS.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-blue-900/60 mb-1">
                    System Role
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as "employee" | "hod" | "hr")}
                    className="w-full rounded-xl border border-blue-900/15 bg-white px-3 py-2 text-xs font-medium text-blue-950 outline-none focus:border-blue-700"
                  >
                    <option value="employee">Employee</option>
                    <option value="hod">HOD (Department Head)</option>
                    <option value="hr">HR Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-blue-900/60 mb-1">
                    Gender
                  </label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full rounded-xl border border-blue-900/15 bg-white px-3 py-2 text-xs font-medium text-blue-950 outline-none focus:border-blue-700"
                  >
                    <option value="">Unspecified</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-blue-950">
                  <input
                    type="checkbox"
                    checked={editIsPanelJudge}
                    onChange={(e) => setEditIsPanelJudge(e.target.checked)}
                    className="h-4 w-4 rounded border-blue-900/30 text-blue-800 focus:ring-blue-700"
                  />
                  <span>Assign as Panel Judge for Scoring</span>
                </label>
              </div>

              <div className="border-t border-blue-900/10 pt-3 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900/70 flex items-center gap-1.5">
                  <Key size={13} /> Admin Password Control
                </h4>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-amber-900 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                    <input
                      type="checkbox"
                      checked={editResetDefault}
                      onChange={(e) => {
                        setEditResetDefault(e.target.checked);
                        if (e.target.checked) setEditNewPassword("");
                      }}
                      className="h-4 w-4 rounded border-amber-400 text-amber-700"
                    />
                    <span>Reset Password to Default Formula</span>
                  </label>
                </div>

                {!editResetDefault && (
                  <div>
                    <label className="block text-[11px] font-semibold text-blue-900/60 mb-1">
                      Set Custom New Password (optional)
                    </label>
                    <input
                      type="password"
                      placeholder="Leave blank to keep existing password"
                      value={editNewPassword}
                      onChange={(e) => setEditNewPassword(e.target.value)}
                      className="w-full rounded-xl border border-blue-900/15 bg-white px-3 py-2 text-xs text-blue-950 outline-none focus:border-blue-700"
                    />
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-blue-900/10 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  className="rounded-xl border border-blue-900/15 bg-white px-4 py-2 text-xs font-semibold text-blue-950 hover:bg-blue-50/50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="rounded-xl bg-blue-800 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-md hover:bg-blue-900 active:scale-95 transition-all disabled:opacity-50"
                >
                  {editSaving ? "Saving..." : "Save Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. Yes / No Confirmation Pop-up */}
      {showConfirmPrompt && editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-blue-900/10 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight text-blue-950">
                  Confirm Detail Changes
                </h3>
                <p className="text-xs text-blue-900/60 mt-0.5">
                  Are you sure you want to update details for employee{" "}
                  <strong className="text-blue-950">{editName} ({editingEmp.code})</strong>?
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmPrompt(false)}
                className="rounded-xl border border-blue-900/15 bg-white px-4 py-2 text-xs font-semibold text-blue-950 hover:bg-blue-50/50 transition"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedToPasswordAuth}
                className="rounded-xl bg-blue-800 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-md hover:bg-blue-900 active:scale-95 transition-all"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Admin Password Authentication Pop-up */}
      {showAdminAuthPrompt && editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-blue-900/10 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-blue-900/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900/10 text-blue-900">
                  <Key size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-blue-950">
                    Admin Password Verification
                  </h3>
                  <p className="text-[11px] text-blue-900/60">
                    Enter your Admin password to authorize changes.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAdminAuthPrompt(false)}
                className="rounded-lg p-1 text-blue-900/40 hover:bg-blue-900/5 hover:text-blue-950 transition"
              >
                <X size={16} />
              </button>
            </div>

            {adminAuthError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-800">
                <AlertTriangle size={14} className="shrink-0 text-red-600" />
                <span>{adminAuthError}</span>
              </div>
            )}

            <form onSubmit={executeEmpEditWithAdminPassword} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-blue-900/60 mb-1">
                  Your Admin Password *
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter your Admin password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  className="w-full rounded-xl border border-blue-900/15 bg-white px-3 py-2 text-xs text-blue-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAdminAuthPrompt(false)}
                  className="rounded-xl border border-blue-900/15 bg-white px-3.5 py-2 text-xs font-semibold text-blue-950 hover:bg-blue-50/50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="rounded-xl bg-blue-800 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-md hover:bg-blue-900 active:scale-95 transition-all disabled:opacity-50"
                >
                  {editSaving ? "Authorizing..." : "Confirm & Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. Yes / No Delete Confirmation Pop-up */}
      {showDeleteConfirmPrompt && deletingEmpTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-red-900/10 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight text-red-950">
                  Confirm Employee Deletion
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Are you sure you want to delete employee{" "}
                  <strong className="text-red-950">{deletingEmpTarget.name} ({deletingEmpTarget.code})</strong>? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmPrompt(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedToDeletePasswordAuth}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-md hover:bg-red-700 active:scale-95 transition-all"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Delete Admin Password Authentication Pop-up */}
      {showDeleteAdminAuthPrompt && deletingEmpTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-red-900/10 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-red-900/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-700">
                  <Key size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-red-950">
                    Admin Password Verification
                  </h3>
                  <p className="text-[11px] text-slate-600">
                    Enter your Admin password to authorize deletion.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteAdminAuthPrompt(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={16} />
              </button>
            </div>

            {deleteAdminAuthError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-800">
                <AlertTriangle size={14} className="shrink-0 text-red-600" />
                <span>{deleteAdminAuthError}</span>
              </div>
            )}

            <form onSubmit={executeEmpDeleteWithAdminPassword} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Your Admin Password *
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter your Admin password"
                  value={deleteAdminPasswordInput}
                  onChange={(e) => setDeleteAdminPasswordInput(e.target.value)}
                  className="w-full rounded-xl border border-red-900/15 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowDeleteAdminAuthPrompt(false)}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteSaving}
                  className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-md hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  {deleteSaving ? "Authorizing..." : "Confirm & Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-blue-900/10 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-blue-900/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900/10 text-blue-900">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-blue-950">
                    Register New Employee
                  </h3>
                  <p className="text-xs text-blue-900/60">
                    Add new employee record to MongoDB master directory.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1.5 text-blue-900/40 hover:bg-blue-900/5 hover:text-blue-950 transition"
              >
                <X size={18} />
              </button>
            </div>

            {addMsg && (
              <div
                className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-xs font-medium ${
                  addMsg.type === "success"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border border-red-200 bg-red-50 text-red-800"
                }`}
              >
                {addMsg.type === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                <span>{addMsg.msg}</span>
              </div>
            )}

            <form onSubmit={handleAddEmpSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-blue-900/60 mb-1">
                    Employee Code (ID) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. M1005"
                    value={addCode}
                    onChange={(e) => setAddCode(e.target.value)}
                    className="w-full rounded-xl border border-blue-900/15 bg-white px-3 py-2 text-xs font-mono text-blue-950 outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-blue-900/60 mb-1">
                    Employee Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amit Verma"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full rounded-xl border border-blue-900/15 bg-white px-3 py-2 text-xs text-blue-950 outline-none focus:border-blue-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-blue-900/60 mb-1">
                    Department / Unit *
                  </label>
                  <select
                    value={addUnitId}
                    onChange={(e) => setAddUnitId(e.target.value)}
                    className="w-full rounded-xl border border-blue-900/15 bg-white px-3 py-2 text-xs font-medium text-blue-950 outline-none focus:border-blue-700"
                  >
                    {UNITS.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-blue-900/60 mb-1">
                    System Role
                  </label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as "employee" | "hod" | "hr")}
                    className="w-full rounded-xl border border-blue-900/15 bg-white px-3 py-2 text-xs font-medium text-blue-950 outline-none focus:border-blue-700"
                  >
                    <option value="employee">Employee</option>
                    <option value="hod">HOD (Department Head)</option>
                    <option value="hr">HR Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-blue-900/60 mb-1">
                    Gender
                  </label>
                  <select
                    value={addGender}
                    onChange={(e) => setAddGender(e.target.value)}
                    className="w-full rounded-xl border border-blue-900/15 bg-white px-3 py-2 text-xs font-medium text-blue-950 outline-none focus:border-blue-700"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-blue-950">
                    <input
                      type="checkbox"
                      checked={addIsPanelJudge}
                      onChange={(e) => setAddIsPanelJudge(e.target.checked)}
                      className="h-4 w-4 rounded border-blue-900/30 text-blue-800 focus:ring-blue-700"
                    />
                    <span>Assign as Panel Judge</span>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-blue-900/10 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-blue-900/15 bg-white px-4 py-2 text-xs font-semibold text-blue-950 hover:bg-blue-50/50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSaving}
                  className="rounded-xl bg-blue-800 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-md hover:bg-blue-900 active:scale-95 transition-all disabled:opacity-50"
                >
                  {addSaving ? "Registering..." : "Register Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stage & Announce Password Verification Modal */}
      {stageAuthAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-blue-900/10 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-blue-900/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900/10 text-blue-900">
                  <Key size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-blue-950">
                    Admin Password Required
                  </h3>
                  <p className="text-[11px] text-blue-900/60 mt-0.5">
                    {stageAuthAction.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStageAuthAction(null)}
                className="rounded-lg p-1 text-blue-900/40 hover:bg-blue-900/5 hover:text-blue-950 transition"
              >
                <X size={16} />
              </button>
            </div>

            {stageAuthError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-800">
                <AlertTriangle size={14} className="shrink-0 text-red-600" />
                <span>{stageAuthError}</span>
              </div>
            )}

            <form onSubmit={executeStageAuthAction} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-blue-900/60 mb-1">
                  Your Admin Password *
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter your Admin password"
                  value={stageAuthPassword}
                  onChange={(e) => setStageAuthPassword(e.target.value)}
                  className="w-full rounded-xl border border-blue-900/15 bg-white px-3 py-2 text-xs text-blue-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setStageAuthAction(null)}
                  className="rounded-xl border border-blue-900/15 bg-white px-3.5 py-2 text-xs font-semibold text-blue-950 hover:bg-blue-50/50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={stageAuthSubmitting}
                  className="rounded-xl bg-blue-800 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-md hover:bg-blue-900 active:scale-95 transition-all disabled:opacity-50"
                >
                  {stageAuthSubmitting ? "Verifying..." : "Confirm & Proceed"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};

export default HrView;
