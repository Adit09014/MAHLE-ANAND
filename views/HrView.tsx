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
  ClipboardList,
  ShieldCheck,
  Scale,
  Sliders,
  Image as ImageIcon,
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

const inputCls =
  "w-full rounded-xl border border-blue-900/15 bg-white px-3 py-2 text-xs font-medium text-blue-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20 shadow-xs";

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block space-y-1">
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
  role: "employee" | "hod" | "hr" | "admin";
  isHOD?: boolean;
  isPanelJudge?: boolean;
  isAdmin?: boolean;
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
  const [editRole, setEditRole] = useState<"employee" | "hod" | "hr" | "admin">("employee");
  const [editIsPanelJudge, setEditIsPanelJudge] = useState(false);
  const [editIsHOD, setEditIsHOD] = useState(false);
  const [editIsAdmin, setEditIsAdmin] = useState(false);
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
  const [addRole, setAddRole] = useState<"employee" | "hod" | "hr" | "admin">("employee");
  const [addIsPanelJudge, setAddIsPanelJudge] = useState(false);
  const [addIsAdmin, setAddIsAdmin] = useState(false);
  const [addGender, setAddGender] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addMsg, setAddMsg] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Quick HOD Assignment Modal States
  const [assignHodUnitId, setAssignHodUnitId] = useState<string | null>(null);
  const [assignHodEmpCode, setAssignHodEmpCode] = useState<string>("");
  const [assignHodSearch, setAssignHodSearch] = useState<string>("");
  const [assignHodPassword, setAssignHodPassword] = useState<string>("");
  const [assignHodError, setAssignHodError] = useState<string | null>(null);
  const [assignHodSaving, setAssignHodSaving] = useState<boolean>(false);
  const [assignHodSuccess, setAssignHodSuccess] = useState<string | null>(null);

  const handleAssignHodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignHodUnitId || !assignHodEmpCode) {
      setAssignHodError("Please select an employee to assign as HOD.");
      return;
    }
    if (!assignHodPassword.trim()) {
      setAssignHodError("Admin password is required to save changes.");
      return;
    }

    setAssignHodSaving(true);
    setAssignHodError(null);

    const targetEmp = allEmployees.find((emp) => emp.code === assignHodEmpCode);

    try {
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: assignHodEmpCode,
          unitId: assignHodUnitId,
          role: "hod",
          isHOD: true,
          adminPassword: assignHodPassword.trim(),
        }),
      });

      const data = await res.json();
      setAssignHodSaving(false);

      if (!res.ok) {
        setAssignHodError(data.error || "Failed to assign HOD.");
      } else {
        const unitName = unitById(assignHodUnitId)?.name || assignHodUnitId;
        setAssignHodSuccess(`${targetEmp?.name || assignHodEmpCode} assigned as HOD for ${unitName}!`);
        fetchEmployees();
        setTimeout(() => {
          setAssignHodUnitId(null);
          setAssignHodEmpCode("");
          setAssignHodPassword("");
          setAssignHodSuccess(null);
        }, 1200);
      }
    } catch (err) {
      setAssignHodSaving(false);
      setAssignHodError("Network error while assigning HOD.");
    }
  };

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
    | { type: "change_stage"; targetStage: string; title: string; warning?: string | null }
    | { type: "announce_winner"; title: string; warning?: string | null }
    | null
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
    if (targetStage === cycle.stage) return;

    let title = "Change Cycle Stage";
    let warning: string | null = null;

    if (targetStage === "validation") {
      title = "Advance Cycle Stage to HR Validation";
      warning = "Advancing to HR Validation will close the self-nomination submission window. Employees will no longer be able to submit new self-nominations or edit their citations for this cycle.";
    } else if (targetStage === "judging") {
      title = "Open Panel Scoring Stage";
      warning = "Opening Panel Scoring will lock HR validation & HOD endorsements. Panel judges will be able to log in and score endorsed nominations.";
    } else if (targetStage === "nomination") {
      title = "Revert Cycle Stage to Nominations";
      warning = "Reverting to Nominations will re-open self-nomination submissions for employees and allow editing citations.";
    } else if (targetStage === "announced") {
      title = "Declare Winners & Publish Results";
      warning = "Declaring winners will finalize the award cycle and publish public leaderboard results.";
    }

    setStageAuthAction({
      type: "change_stage",
      targetStage,
      title,
      warning,
    });
    setStageAuthPassword("");
    setStageAuthError(null);
  };

  const handleAnnounceClick = () => {
    setStageAuthAction({
      type: "announce_winner",
      title: "Declare Winners & Publish Results",
      warning: "Declaring winners will finalize the award cycle and publish public leaderboard results.",
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
    setEditRole((emp.role as "employee" | "hod" | "hr" | "admin") || "employee");
    setEditIsPanelJudge(Boolean(emp.isPanelJudge));
    setEditIsHOD(Boolean(emp.isHOD));
    setEditIsAdmin(Boolean(emp.isAdmin) || emp.role === "admin");
    setEditGender(emp.gender || "");
    setEditNewPassword("");
    setEditResetDefault(false);
    setEditStatusMsg(null);
  };

  const handleSaveEmpEditClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;
    setEditStatusMsg(null);
    setShowConfirmPrompt(true);
  };

  const handleProceedToPasswordAuth = () => {
    setShowConfirmPrompt(false);
    setShowAdminAuthPrompt(true);
    setAdminPasswordInput("");
    setAdminAuthError(null);
  };

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
          role: editIsAdmin ? "admin" : editRole,
          isHOD: editIsHOD,
          isPanelJudge: editIsPanelJudge,
          isAdmin: editIsAdmin,
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
          role: addIsAdmin ? "admin" : addRole,
          isPanelJudge: addIsPanelJudge,
          isAdmin: addIsAdmin,
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

  const handleDeleteEmpClick = (emp: EmployeeRecord) => {
    setDeletingEmpTarget(emp);
    setShowDeleteConfirmPrompt(true);
  };

  const handleProceedToDeletePasswordAuth = () => {
    setShowDeleteConfirmPrompt(false);
    setShowDeleteAdminAuthPrompt(true);
    setDeleteAdminPasswordInput("");
    setDeleteAdminAuthError(null);
  };

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
    const baseEnd = getEffectiveEndDate(currentPhase);
    const nextEnd = addDaysToDateStr(baseEnd, days);
    updatePhaseTimeline(phaseKey, {
      isExtended: true,
      extendedUntil: nextEnd,
    });
  };

  const resetPhaseExtension = (phaseKey: keyof CycleTimeline) => {
    updatePhaseTimeline(phaseKey, {
      isExtended: false,
      extendedUntil: undefined,
    });
  };

  const setJudge = async (slotId: string, empCode: string) => {
    const nextJudges = cycle.judges.map((j) => {
      if (j.id !== slotId) return j;
      const matchHod = hodsList.find((h) => h.code === empCode);
      return {
        ...j,
        code: empCode,
        name: matchHod ? matchHod.name : "",
      };
    });

    commit({
      ...cycle,
      judges: nextJudges,
    });

    try {
      await fetch("/api/employees/panel", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judges: nextJudges }),
      });
      fetchEmployees();
    } catch (e) {
      /* ignore */
    }
  };

  const announce = async () => {
    const allScored = res
      .flatMap((r) => r.ranked)
      .filter((w) => w && w.nom && w.avg !== null && w.count > 0);
    const next = { ...points };
    allScored.forEach((w) => {
      const k = w.nom.code;
      const scoreVal = Math.round(w.avg! * 10) / 10;
      const isWinner = res.some((r) => r.ranked[0]?.nom?.id === w.nom.id);

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
        next[k].points = Math.round((next[k].points + scoreVal) * 10) / 10;
        next[k].wins.push({
          month: cycle.month,
          category: w.nom.category,
          score: scoreVal,
          isWinner,
        });
      }
    });
    setPoints(next);
    try {
      await savePoints(next);
    } catch (e) {
      /* ignore */
    }
    commit({
      ...cycle,
      stage: "announced",
      announcedAt: new Date().toISOString(),
    });
  };

  const syncLedgerFromCurrentCycle = async () => {
    const confirmed = window.confirm(
      `Sync panel scores from ${cycle.month} into the Annual LSIP Ledger?\n\nThis will permanently record each evaluated employee's panel score for this cycle. If scores already exist for this month they will be skipped.`
    );
    if (!confirmed) return;
    const allScored = res
      .flatMap((r) => r.ranked)
      .filter((w) => w && w.nom && w.avg !== null && w.count > 0);

    const next = { ...points };
    let addedCount = 0;
    allScored.forEach((w) => {
      const k = w.nom.code;
      const scoreVal = Math.round(w.avg! * 10) / 10;
      const isWinner = res.some((r) => r.ranked[0]?.nom?.id === w.nom.id);

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
        next[k].points = Math.round((next[k].points + scoreVal) * 10) / 10;
        next[k].wins.push({
          month: cycle.month,
          category: w.nom.category,
          score: scoreVal,
          isWinner,
        });
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
        ? `Successfully recorded ${addedCount} employee score(s) into Annual LSIP Ledger!`
        : "Annual LSIP Ledger is already up to date with scores for this month."
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
      {/* 1. Header Banner */}
      <div className="rounded-2xl border border-blue-900/10 bg-gradient-to-r from-[#0A2540] via-[#0F355C] to-[#0A2540] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-10 h-40 w-40 rounded-full bg-blue-400/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-sky-400/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-sky-200 backdrop-blur-md">
              <Sparkles size={13} className="text-sky-300" />
              <span>MAHLE ANAND HR Admin Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              HR Recognition Management &amp; System Controls
            </h1>
            <p className="text-sm text-sky-100/80 leading-relaxed">
              Control active cycle stages, extend nomination deadlines, assign panel judges, declare monthly winners, and manage employee directory accounts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={exportCsv}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-white/20 active:scale-95 transition-all"
            >
              <Download size={15} /> Export Cycle CSV
            </button>
            <button
              onClick={exportAnnualLedgerCsv}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 text-amber-950 px-4 py-2.5 text-xs font-bold uppercase tracking-wider shadow-md hover:bg-amber-300 active:scale-95 transition-all"
            >
              <Trophy size={15} /> Export LSIP Ledger
            </button>
          </div>
        </div>
      </div>

      {/* 2. Admin Stage Controls & Metric Summary Cards */}
      <Card className="p-6 border border-blue-900/10 shadow-sm bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-blue-900/10 pb-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-900/60 block mb-1">
              Cycle Stage Management ({monthLabel})
            </span>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleStageChangeClick(s.id)}
                  disabled={s.id === "announced"}
                  className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-150 active:scale-95 ${cycle.stage === s.id
                      ? "bg-[#0A2540] text-white shadow-md shadow-blue-900/20 ring-2 ring-sky-400"
                      : "border border-blue-900/15 bg-white text-blue-900/70 hover:border-blue-700 hover:bg-blue-50/50 disabled:opacity-40"
                    }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {cycle.stage === "judging" ? (
              <button
                onClick={() => handleStageChangeClick("validation")}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-rose-700 active:scale-95 transition"
              >
                <Scale size={15} /> Close Panel Scoring Page
              </button>
            ) : (
              <button
                disabled={cycle.stage === "announced"}
                onClick={() => handleStageChangeClick("judging")}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 active:scale-95 transition"
              >
                <Scale size={15} /> Open Panel Scoring Page
              </button>
            )}

            <button
              onClick={handleAnnounceClick}
              disabled={cycle.stage === "announced" || pool.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-amber-950 shadow-md hover:bg-amber-400 disabled:opacity-50 active:scale-95 transition"
            >
              <Trophy size={15} /> Declare Winners <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-1">
            <div className="flex items-center justify-between text-indigo-900/70">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Applied</span>
              <ClipboardList size={18} className="text-indigo-600" />
            </div>
            <p className="text-2xl font-black text-blue-950">{cycle.nominations.length}</p>
            <span className="text-[11px] text-indigo-700 font-medium">Applied Nominations</span>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-1">
            <div className="flex items-center justify-between text-emerald-900/70">
              <span className="text-[11px] font-bold uppercase tracking-wider">HOD Endorsed</span>
              <ShieldCheck size={18} className="text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-blue-950">{pool.length}</p>
            <span className="text-[11px] text-emerald-700 font-medium">Endorsed Candidates</span>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-1">
            <div className="flex items-center justify-between text-amber-900/70">
              <span className="text-[11px] font-bold uppercase tracking-wider">Pending HR Review</span>
              <Clock size={18} className="text-amber-600" />
            </div>
            <p className="text-2xl font-black text-blue-950">{pending}</p>
            <span className="text-[11px] text-amber-700 font-medium">Awaiting Validation</span>
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 space-y-1">
            <div className="flex items-center justify-between text-sky-900/70">
              <span className="text-[11px] font-bold uppercase tracking-wider">Panel Scores</span>
              <Scale size={18} className="text-sky-600" />
            </div>
            <p className="text-2xl font-black text-blue-950">
              {pool.reduce((a, n) => a + panelScore(cycle, n.id).count, 0)}
              <span className="text-sm text-slate-400 font-semibold"> / {pool.length * PANEL_SIZE}</span>
            </p>
            <span className="text-[11px] text-sky-700 font-medium">Panel Votes Submitted</span>
          </div>
        </div>
      </Card>

      {/* 3. Admin Timeline & Date Extension Management */}
      <Card className="p-6 border border-blue-900/10 shadow-sm bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-900/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-blue-700" />
              <h3 className="text-base font-bold text-blue-950">
                Timeline &amp; Date Extension Controls for {monthLabel}
              </h3>
            </div>
            <p className="mt-1 text-xs text-blue-900/60">
              Set start and end dates for self-nomination, HOD endorsements, and panel scoring. Extend deadlines anytime.
            </p>
          </div>
          <Pill tone="good">Admin Access Enabled</Pill>
        </div>

        <div className="mt-5 space-y-4">
          {(
            [
              {
                key: "nomination",
                title: "1. Self-Nomination Timeline",
                desc: "Window for employees to submit self-nominations.",
                phase: timeline.nomination,
              },
              {
                key: "hodEndorsement",
                title: "2. HOD Endorsement Timeline",
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
                className={`rounded-2xl border p-5 transition ${phase.isExtended
                    ? "border-amber-400/80 bg-amber-50/60 shadow-xs"
                    : "border-blue-900/10 bg-slate-50/40"
                  }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-extrabold text-blue-950 uppercase tracking-wider flex items-center gap-2">
                      {title}
                      {phase.isExtended && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-900">
                          <Clock size={11} /> EXTENDED
                        </span>
                      )}
                    </h4>
                    <p className="mt-1 text-xs text-blue-900/60">{desc}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs font-bold text-blue-950 bg-white px-3 py-1 rounded-lg border border-blue-900/10">
                      Active: {formatDatePretty(phase.startDate)} – {formatDatePretty(effectiveEnd)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-end gap-3 pt-3 border-t border-blue-900/5">
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
                      className={`${inputCls} ${phase.isExtended ? "border-amber-500 font-semibold text-amber-950 bg-amber-50" : ""}`}
                    />
                  </div>

                  {/* Date Extension Buttons (DUPLICATE PLUS SIGN FIXED) */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-blue-900/60 mr-1">Extend Deadline:</span>
                    <button
                      type="button"
                      onClick={() => extendPhaseByDays(key, 1)}
                      className="inline-flex items-center gap-1 rounded-xl border border-blue-900/20 bg-white px-3 py-2 text-xs font-bold text-blue-950 hover:bg-blue-800 hover:text-white transition shadow-2xs active:scale-95"
                    >
                      <Plus size={12} /> 1 Day
                    </button>
                    <button
                      type="button"
                      onClick={() => extendPhaseByDays(key, 3)}
                      className="inline-flex items-center gap-1 rounded-xl border border-blue-900/20 bg-white px-3 py-2 text-xs font-bold text-blue-950 hover:bg-blue-800 hover:text-white transition shadow-2xs active:scale-95"
                    >
                      <Plus size={12} /> 3 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => extendPhaseByDays(key, 7)}
                      className="inline-flex items-center gap-1 rounded-xl border border-blue-900/20 bg-white px-3 py-2 text-xs font-bold text-blue-950 hover:bg-blue-800 hover:text-white transition shadow-2xs active:scale-95"
                    >
                      <Plus size={12} /> 7 Days
                    </button>

                    {phase.isExtended && (
                      <button
                        type="button"
                        onClick={() => resetPhaseExtension(key)}
                        className="inline-flex items-center gap-1 rounded-xl border border-amber-600/40 bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-200 transition shadow-2xs active:scale-95"
                        title="Reset extension to standard end date"
                      >
                        <RotateCcw size={12} /> Reset Extension
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* HOD Management by Department */}
      <Card className="p-6 border border-blue-900/10 shadow-sm bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-900/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-blue-950 flex items-center gap-2">
              <ShieldCheck size={18} className="text-blue-700" />
              HOD Management — Assign Heads of Department
            </h3>
            <p className="mt-1 text-xs text-blue-900/60">
              Each department can have <strong>only one HOD</strong>. Select any department below to assign or change its Head of Department.
            </p>
          </div>
          <Pill tone="good">1 HOD Per Dept Enforced</Pill>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-blue-900/10">
          <table className="w-full text-xs">
            <thead className="bg-blue-900/5 text-blue-900/70 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3 text-left">Department / Unit</th>
                <th className="px-4 py-3 text-left">Current HOD</th>
                <th className="px-4 py-3 text-left">Emp Code</th>
                <th className="px-4 py-3 text-left">Designation</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-900/10 bg-white">
              {UNITS.map((unit) => {
                const currentHod = allEmployees.find(
                  (e) => e.unitId === unit.id && (e.isHOD || e.role === "hod")
                );

                return (
                  <tr key={unit.id} className="hover:bg-blue-50/40 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-950">{unit.name}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                          {unit.kind}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-blue-950">
                      {currentHod ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-950 text-[10px] font-extrabold text-white">
                            {currentHod.name.charAt(0)}
                          </div>
                          <span>{currentHod.name}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                          <AlertTriangle size={12} /> No HOD Assigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-blue-900/70">
                      {currentHod?.code || "—"}
                    </td>
                    <td className="px-4 py-3 text-blue-900/60">
                      {currentHod?.designation || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setAssignHodUnitId(unit.id);
                          setAssignHodEmpCode(currentHod?.code || "");
                          setAssignHodSearch("");
                          setAssignHodPassword("");
                          setAssignHodError(null);
                          setAssignHodSuccess(null);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition active:scale-95 shadow-2xs ${
                          currentHod
                            ? "border-blue-900/20 bg-white text-blue-900 hover:bg-blue-50"
                            : "border-blue-700 bg-blue-900 text-white hover:bg-blue-800"
                        }`}
                      >
                        {currentHod ? (
                          <>
                            <Edit3 size={13} /> Change HOD
                          </>
                        ) : (
                          <>
                            <UserPlus size={13} /> Assign HOD
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. Panel Judge Selection (HODs Only, Max 3 Allowed) */}
      <Card className="p-6 border border-blue-900/10 shadow-sm bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-900/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-blue-950 flex items-center gap-2">
              <Scale size={18} className="text-emerald-600" />
              HOD Judging Panel Selection for {monthLabel}
            </h3>
            <p className="mt-1 text-xs text-blue-900/60">
              Select 3 registered HODs to serve on the monthly Panel Scoring Committee. Appointed judges gain access to the Panel Scoring page.
            </p>
          </div>
          <Pill tone="good">Max 3 HOD Judges Allowed</Pill>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {cycle.judges.map((j, i) => (
            <Field key={j.id} label={`HOD Judge ${i + 1} Appointment`}>
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

      {/* 5. Live Standings & Results Preview */}
      <div>
        <h3 className="mb-3 text-base font-bold tracking-tight text-blue-950 flex items-center gap-2">
          <Trophy size={18} className="text-amber-500" />
          {cycle.stage === "announced" ? "Official Announced Winners" : "Live Candidate Standings"}
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {res.map((r) => (
            <Card key={r.category.id + (r.slotLabel || "")} className="p-5 border border-blue-900/10 bg-white">
              <div className="flex items-center justify-between border-b border-blue-900/10 pb-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-extrabold text-blue-950">{r.category.name}</h4>
                  {r.slotLabel && <Pill>{r.slotLabel}</Pill>}
                </div>
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  {r.ranked.length} Candidate(s)
                </span>
              </div>
              {r.ranked.length === 0 ? (
                <p className="mt-4 text-xs text-blue-900/50 italic py-4 text-center">
                  No endorsed nominees in this category yet.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {r.ranked.map((x, i) => (
                    <li
                      key={x.nom.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-900/10 text-xs font-bold text-blue-950">
                          #{i + 1}
                        </span>
                        <div>
                          <strong className="block text-xs font-bold text-blue-950">{x.nom.name}</strong>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {unitById(x.nom.unit)?.name} ({x.nom.code})
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {i === 0 && x.avg !== null && cycle.stage === "announced" && (
                          <Pill tone="gold">Winner</Pill>
                        )}
                        <span className="font-mono text-xs font-extrabold text-blue-950">
                          {x.avg === null ? "—" : x.avg.toFixed(2)} Pts
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          ({x.count}/{PANEL_SIZE})
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* 6. Annual R&R Ledger & Year-End LSIP Weightage Tracker */}
      <Card className="p-6 border border-blue-900/10 shadow-sm bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-blue-900/10 pb-4">
          <div>
            <h3 className="text-base font-bold tracking-tight text-blue-950 flex items-center gap-2">
              <Trophy className="text-amber-500" size={18} /> Annual R&amp;R Ledger &amp; Year-End LSIP Weightage Tracker
            </h3>
            <p className="text-xs text-blue-900/70 mt-1">
              Employee panel scores (0–10) are recorded in this HR annual ledger every month for year-end LSIP recognition awards.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {cycle.stage === "announced" && (
              <button
                onClick={syncLedgerFromCurrentCycle}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-100 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-200 transition shadow-xs active:scale-95"
                title="Sync scores from current announced cycle into Annual LSIP Ledger"
              >
                <RotateCcw size={13} /> Sync Scores to LSIP
              </button>
            )}
            <button
              onClick={exportAnnualLedgerCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-900/20 bg-blue-900/5 px-3.5 py-2 text-xs font-bold text-blue-950 hover:bg-blue-800 hover:text-white transition shadow-xs active:scale-95"
              title="Export complete year-end LSIP ledger to CSV"
            >
              <Download size={13} /> Export LSIP Ledger (CSV)
            </button>
          </div>
        </div>

        {/* Annual Points & LSIP Weightage Table */}
        <div className="mt-5 overflow-x-auto rounded-xl border border-blue-900/10 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-blue-900/10 bg-blue-900/5 text-[11px] font-bold uppercase tracking-wider text-blue-900/70">
              <tr>
                <th className="px-4 py-3">Employee Code &amp; Name</th>
                <th className="px-4 py-3">Department / Unit</th>
                <th className="px-4 py-3 text-center">Evaluations</th>
                <th className="px-4 py-3 text-center">Cumulative LSIP Score</th>
                <th className="px-4 py-3">Monthly Scores &amp; Categories</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-900/10">
              {Object.keys(points).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-blue-900/50 italic">
                    No scores recorded in HR annual LSIP ledger yet. Scores accumulate as monthly evaluations are completed.
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
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-900">
                          {winsCount} {winsCount === 1 ? "Entry" : "Entries"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-amber-700">
                        {totalPts.toFixed(1)} Pts
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {p.wins && p.wins.length > 0 ? (
                            p.wins.map((w, idx) => (
                              <span
                                key={idx}
                                className={`rounded px-2 py-0.5 text-[10px] font-semibold border ${
                                  w.isWinner
                                    ? "bg-amber-100 text-amber-900 border-amber-300"
                                    : "bg-blue-900/5 text-blue-900/80 border-blue-900/10"
                                }`}
                              >
                                {w.month}: {catById(w.category)?.name || w.category} {w.score !== undefined ? `(${w.score.toFixed(1)} Pts)` : ""}{w.isWinner ? " 🏆" : ""}
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

      {/* 7. Employee Master Directory & Management */}
      <Card className="p-6 border border-blue-900/10 shadow-sm bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-blue-900/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-blue-950 flex items-center gap-2">
              <User className="text-blue-800" size={18} /> Employee Master Directory &amp; Admin Access
            </h3>
            <p className="text-xs text-blue-900/60 mt-0.5">
              Manage employee details, department assignments, roles, panel judge access, and passwords.
            </p>
          </div>
          <button
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
            className="inline-flex items-center gap-2 rounded-xl bg-[#0A2540] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-blue-900 active:scale-95 transition"
          >
            <UserPlus size={15} /> Add New Employee
          </button>
        </div>

        {/* Search & Filters */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-900/40" />
            <input
              type="text"
              placeholder="Search by Employee Code or Name..."
              value={empSearch}
              onChange={(e) => setEmpSearch(e.target.value)}
              className="w-full rounded-xl border border-blue-900/15 bg-white pl-9 pr-3 py-2 text-xs text-blue-950 outline-none focus:border-blue-700 shadow-xs"
            />
          </div>

          <div className="w-36">
            <select
              value={empRoleFilter}
              onChange={(e) => setEmpRoleFilter(e.target.value)}
              className="w-full rounded-xl border border-blue-900/15 bg-white px-3 py-2 text-xs font-medium text-blue-950 outline-none shadow-xs"
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
              className="w-full rounded-xl border border-blue-900/15 bg-white px-3 py-2 text-xs font-medium text-blue-950 outline-none shadow-xs"
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
            <thead className="bg-blue-900/5 text-blue-900/70 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3 text-left">Emp Code</th>
                <th className="px-4 py-3 text-left">Employee Name</th>
                <th className="px-4 py-3 text-left">Department / Unit</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Panel Judge</th>
                <th className="px-4 py-3 text-right">Actions</th>
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
                    <td className="px-4 py-3 font-mono font-bold text-blue-950">{emp.code}</td>
                    <td className="px-4 py-3 font-medium text-blue-950">{emp.name}</td>
                    <td className="px-4 py-3 text-blue-900/80">{unitById(emp.unitId)?.name || emp.unitId}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${emp.role === "hr"
                            ? "bg-purple-100 text-purple-900 border border-purple-300"
                            : emp.role === "hod"
                              ? "bg-blue-100 text-blue-900 border border-blue-300"
                              : "bg-slate-100 text-slate-700 border border-slate-300"
                          }`}
                      >
                        {emp.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {emp.isPanelJudge ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          <CheckCircle2 size={11} /> Panel Judge
                        </span>
                      ) : (
                        <span className="text-blue-900/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(emp)}
                        className="inline-flex items-center gap-1 rounded-xl border border-blue-900/15 bg-white px-3 py-1.5 text-xs font-semibold text-blue-900 hover:bg-blue-50 transition active:scale-95 shadow-2xs"
                      >
                        <Edit3 size={13} /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteEmpClick(emp)}
                        className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 transition active:scale-95 shadow-2xs"
                        title="Delete Employee"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>


      {/* Modals Section */}
      {/* 1. Stage Action Password Auth Modal */}
      {stageAuthAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-blue-900/10 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-blue-900/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <Key size={18} />
                </div>
                <h3 className="text-sm font-bold text-blue-950">{stageAuthAction.title}</h3>
              </div>
              <button onClick={() => setStageAuthAction(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {stageAuthAction.warning && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 font-medium leading-relaxed">
                <AlertTriangle size={17} className="text-amber-600 shrink-0 mt-0.5" />
                <span>{stageAuthAction.warning}</span>
              </div>
            )}

            <p className="text-xs text-blue-900/70 leading-relaxed">
              This action alters live cycle stage visibility. Enter your <strong>Admin Password</strong> to authorize:
            </p>

            {stageAuthError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <AlertTriangle size={15} />
                <span>{stageAuthError}</span>
              </div>
            )}

            <form onSubmit={executeStageAuthAction} className="space-y-4">
              <div>
                <Label>Admin Password</Label>
                <input
                  type="password"
                  required
                  placeholder="Enter Admin Password..."
                  value={stageAuthPassword}
                  onChange={(e) => setStageAuthPassword(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStageAuthAction(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={stageAuthSubmitting}
                  className="rounded-xl bg-[#0A2540] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-900"
                >
                  {stageAuthSubmitting ? "Authorizing..." : "Confirm & Authorize"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-blue-900/10 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-blue-900/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900/10 text-blue-900">
                  <UserPlus size={18} />
                </div>
                <h3 className="text-base font-bold text-blue-950">Add New Employee Account</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {addMsg && (
              <div
                className={`flex items-center gap-2 rounded-xl p-3 text-xs font-medium ${addMsg.type === "success"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border border-red-200 bg-red-50 text-red-800"
                  }`}
              >
                {addMsg.type === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                <span>{addMsg.msg}</span>
              </div>
            )}

            <form onSubmit={handleAddEmpSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Employee Code (Unique)</Label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP105"
                    value={addCode}
                    onChange={(e) => setAddCode(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label>Full Employee Name</Label>
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Department / Unit</Label>
                  <select value={addUnitId} onChange={(e) => setAddUnitId(e.target.value)} className={inputCls}>
                    {UNITS.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>System Role</Label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as "employee" | "hod" | "hr" | "admin")}
                    className={inputCls}
                  >
                    <option value="employee">Employee</option>
                    <option value="hod">HOD (Department Head)</option>
                    <option value="hr">HR Admin</option>
                    <option value="admin">System Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="addIsAdmin"
                    checked={addIsAdmin}
                    onChange={(e) => setAddIsAdmin(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-purple-700 focus:ring-purple-600"
                  />
                  <label htmlFor="addIsAdmin" className="text-xs font-semibold text-blue-950">
                    Appoint as System Admin (`isAdmin: true`)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="addIsPanelJudge"
                    checked={addIsPanelJudge}
                    onChange={(e) => setAddIsPanelJudge(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-800 focus:ring-blue-700"
                  />
                  <label htmlFor="addIsPanelJudge" className="text-xs font-semibold text-blue-950">
                    Appoint as Panel Judge (`isPanelJudge: true`)
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSaving}
                  className="rounded-xl bg-[#0A2540] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-900"
                >
                  {addSaving ? "Saving..." : "Create Employee Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Edit Employee Modal */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-blue-900/10 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-blue-900/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900/10 text-blue-900">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-blue-950">Edit Employee Details</h3>
                  <p className="text-xs text-blue-900/60 font-mono">Code: <strong>{editingEmp.code}</strong></p>
                </div>
              </div>
              <button onClick={() => setEditingEmp(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {editStatusMsg && (
              <div
                className={`flex items-center gap-2 rounded-xl p-3 text-xs font-medium ${editStatusMsg.type === "success"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border border-red-200 bg-red-50 text-red-800"
                  }`}
              >
                {editStatusMsg.type === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                <span>{editStatusMsg.msg}</span>
              </div>
            )}

            <form onSubmit={handleSaveEmpEditClick} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Employee Name</Label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label>Department / Unit</Label>
                  <select value={editUnitId} onChange={(e) => setEditUnitId(e.target.value)} className={inputCls}>
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
                  <Label>System Role</Label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as "employee" | "hod" | "hr" | "admin")}
                    className={inputCls}
                  >
                    <option value="employee">Employee</option>
                    <option value="hod">HOD (Department Head)</option>
                    <option value="hr">HR Admin</option>
                    <option value="admin">System Admin</option>
                  </select>
                </div>
                <div>
                  <Label>Change Password</Label>
                  <input
                    type="password"
                    placeholder={editResetDefault ? "Will reset to default password" : "New password (optional)"}
                    disabled={editResetDefault}
                    value={editNewPassword}
                    onChange={(e) => setEditNewPassword(e.target.value)}
                    className={`${inputCls} ${editResetDefault ? "bg-slate-100 opacity-60 cursor-not-allowed" : ""}`}
                  />
                  <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/70 p-2">
                    <input
                      type="checkbox"
                      id="editResetDefault"
                      checked={editResetDefault}
                      onChange={(e) => {
                        setEditResetDefault(e.target.checked);
                        if (e.target.checked) setEditNewPassword("");
                      }}
                      className="h-3.5 w-3.5 rounded border-amber-400 text-amber-700 focus:ring-amber-600 cursor-pointer"
                    />
                    <label htmlFor="editResetDefault" className="text-[11px] font-medium text-amber-950 cursor-pointer">
                      Reset password to default (<strong>{editingEmp ? `${editingEmp.code.trim().length >= 4 ? editingEmp.code.trim().slice(-4) : editingEmp.code.trim()}${(editName || editingEmp.name).replace(/[^a-zA-Z]/g, "").slice(0, 4)}` : ""}</strong>)
                    </label>
                  </div>
                </div>
              </div>

              {/* IsHOD & Panel Judge & Admin Toggles */}
              <div className="rounded-xl border border-blue-900/10 bg-blue-900/3 p-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-900/50 mb-1">Access Flags</p>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editIsHOD"
                    checked={editIsHOD}
                    onChange={(e) => setEditIsHOD(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-800 focus:ring-blue-700"
                  />
                  <label htmlFor="editIsHOD" className="text-xs font-semibold text-blue-950">
                    Mark as HOD (Head of Department)
                    <span className="ml-1 font-normal text-blue-900/50">— grants HOD endorsement access</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editIsAdmin"
                    checked={editIsAdmin}
                    onChange={(e) => setEditIsAdmin(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-purple-700 focus:ring-purple-600"
                  />
                  <label htmlFor="editIsAdmin" className="text-xs font-semibold text-blue-950">
                    Appoint as System Admin (`isAdmin: true`)
                    <span className="ml-1 font-normal text-blue-900/50">— grants full system admin privileges</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editIsPanelJudge"
                    checked={editIsPanelJudge}
                    onChange={(e) => setEditIsPanelJudge(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  <label htmlFor="editIsPanelJudge" className="text-xs font-semibold text-blue-950">
                    Appoint as Panel Judge
                    <span className="ml-1 font-normal text-blue-900/50">— grants panel scoring access</span>
                  </label>
                </div>
              </div>

              {/* Notice if replacing existing HOD of department */}
              {(() => {
                if (!editIsHOD && editRole !== "hod") return null;
                const existingHodInDept = allEmployees.find(
                  (e) => e.unitId === editUnitId && (e.isHOD || e.role === "hod") && e.code !== editingEmp?.code
                );
                if (!existingHodInDept) return null;
                const deptName = unitById(editUnitId)?.name || editUnitId;

                return (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
                    <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold text-amber-950">Notice: 1 HOD per Department Rule</strong>
                      <p className="text-[11px] mt-0.5">
                        Setting this employee as HOD will automatically replace <strong>{existingHodInDept.name} ({existingHodInDept.code})</strong> as the HOD of <strong>{deptName}</strong>.
                      </p>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#0A2540] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-900"
                >
                  Save Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Edit Confirm Modal */}
      {showConfirmPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-blue-900/10 bg-white p-6 shadow-2xl space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-base font-bold text-blue-950">Confirm Employee Profile Edit</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to update profile details for <strong>{editingEmp?.name} ({editingEmp?.code})</strong>?
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmPrompt(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedToPasswordAuth}
                className="rounded-xl bg-[#0A2540] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-900"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Admin Password Auth Prompt for Edit */}
      {showAdminAuthPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-blue-900/10 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-blue-900/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <Key size={18} />
                </div>
                <h3 className="text-sm font-bold text-blue-950">Admin Authorization Required</h3>
              </div>
              <button onClick={() => setShowAdminAuthPrompt(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {adminAuthError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <AlertTriangle size={15} />
                <span>{adminAuthError}</span>
              </div>
            )}

            <form onSubmit={executeEmpEditWithAdminPassword} className="space-y-4">
              <div>
                <Label>Admin Password</Label>
                <input
                  type="password"
                  required
                  placeholder="Enter Admin Password..."
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminAuthPrompt(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="rounded-xl bg-[#0A2540] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-900"
                >
                  {editSaving ? "Saving..." : "Authorize & Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Delete Confirm Modal */}
      {showDeleteConfirmPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-2xl space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <Trash2 size={24} />
            </div>
            <h3 className="text-base font-bold text-red-950">Delete Employee Account</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete employee <strong>{deletingEmpTarget?.name} ({deletingEmpTarget?.code})</strong>?
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmPrompt(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedToDeletePasswordAuth}
                className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-red-700"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Delete Admin Password Auth Prompt */}
      {showDeleteAdminAuthPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <Key size={18} />
                </div>
                <h3 className="text-sm font-bold text-red-950">Authorize Employee Deletion</h3>
              </div>
              <button onClick={() => setShowDeleteAdminAuthPrompt(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {deleteAdminAuthError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <AlertTriangle size={15} />
                <span>{deleteAdminAuthError}</span>
              </div>
            )}

            <form onSubmit={executeEmpDeleteWithAdminPassword} className="space-y-4">
              <div>
                <Label>Admin Password</Label>
                <input
                  type="password"
                  required
                  placeholder="Enter Admin Password..."
                  value={deleteAdminPasswordInput}
                  onChange={(e) => setDeleteAdminPasswordInput(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteAdminAuthPrompt(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteSaving}
                  className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-red-700"
                >
                  {deleteSaving ? "Deleting..." : "Confirm & Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Quick HOD Assignment Modal */}
      {assignHodUnitId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-blue-900/20 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-blue-900/10 pb-4">
              <div>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
                  {unitById(assignHodUnitId)?.kind || "Department"}
                </span>
                <h3 className="text-lg font-extrabold text-blue-950 mt-1">
                  Assign Head of Department — {unitById(assignHodUnitId)?.name || assignHodUnitId}
                </h3>
              </div>
              <button
                onClick={() => setAssignHodUnitId(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            {assignHodError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{assignHodError}</span>
              </div>
            )}

            {assignHodSuccess && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                <CheckCircle2 size={15} className="shrink-0" />
                <span>{assignHodSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAssignHodSubmit} className="space-y-4">
              <div>
                <Label>Select Employee to Assign as HOD</Label>
                <div className="space-y-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search employee by name or code..."
                      value={assignHodSearch}
                      onChange={(e) => setAssignHodSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-blue-950 focus:bg-white focus:border-blue-700 outline-none"
                    />
                  </div>

                  <select
                    required
                    value={assignHodEmpCode}
                    onChange={(e) => setAssignHodEmpCode(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">-- Choose Employee --</option>
                    {allEmployees
                      .filter(
                        (emp) =>
                          !assignHodSearch.trim() ||
                          emp.name.toLowerCase().includes(assignHodSearch.toLowerCase()) ||
                          emp.code.toLowerCase().includes(assignHodSearch.toLowerCase())
                      )
                      .map((emp) => {
                        const isCurrentHodOfThisDept =
                          emp.unitId === assignHodUnitId && (emp.isHOD || emp.role === "hod");
                        const deptName = unitById(emp.unitId)?.name || emp.unitId;
                        return (
                          <option key={emp.code} value={emp.code}>
                            {emp.name} ({emp.code}) — {deptName} {isCurrentHodOfThisDept ? "★ Current HOD" : ""}
                          </option>
                        );
                      })}
                  </select>
                </div>
              </div>

              {/* Warning Notice if replacing an existing HOD */}
              {(() => {
                const currentDeptHod = allEmployees.find(
                  (e) => e.unitId === assignHodUnitId && (e.isHOD || e.role === "hod")
                );
                const selectedEmp = allEmployees.find((e) => e.code === assignHodEmpCode);

                if (currentDeptHod && selectedEmp && selectedEmp.code !== currentDeptHod.code) {
                  return (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-950">
                        <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                        <span>HOD Replacement Notice</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        Assigning <strong>{selectedEmp.name}</strong> will make them HOD of{" "}
                        <strong>{unitById(assignHodUnitId)?.name}</strong>. The current HOD{" "}
                        <strong>{currentDeptHod.name} ({currentDeptHod.code})</strong> will be demoted back to Employee.
                      </p>
                    </div>
                  );
                }

                if (selectedEmp && selectedEmp.unitId !== assignHodUnitId) {
                  return (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                      <p className="text-[11px]">
                        <strong>{selectedEmp.name}</strong> is currently assigned to department{" "}
                        <strong>{unitById(selectedEmp.unitId)?.name || selectedEmp.unitId}</strong>. Their department will be updated to{" "}
                        <strong>{unitById(assignHodUnitId)?.name}</strong>.
                      </p>
                    </div>
                  );
                }

                return null;
              })()}

              <div>
                <Label>Admin Confirmation Password</Label>
                <div className="relative">
                  <Key size={14} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Enter your Admin password to confirm"
                    value={assignHodPassword}
                    onChange={(e) => setAssignHodPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2.5 text-xs text-blue-950 focus:border-blue-700 outline-none shadow-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignHodUnitId(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignHodSaving || !assignHodEmpCode}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-900 px-5 py-2 text-xs font-bold text-white hover:bg-blue-800 transition disabled:opacity-50 shadow-sm"
                >
                  {assignHodSaving ? "Assigning HOD…" : "Confirm HOD Assignment"}
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
