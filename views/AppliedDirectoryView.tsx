"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  Filter,
  Download,
  Eye,
  X,
  RefreshCw,
  Award,
  Building2,
  FileText,
  Check,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Mail,
  Bell,
  Send,
  Copy,
  ExternalLink,
} from "lucide-react";
import { unitById, catById, getDynamicUnits } from "../lib/constants";
import { getCycleTimeline, getEffectiveEndDate, formatDatePretty } from "../lib/helpers";
import { Cycle, Nomination, AuthUser } from "../lib/types";
import Card from "../components/Card";
import Pill from "../components/Pill";

export interface EmployeeRecord {
  code: string;
  name: string;
  unitId: string;
  role?: string;
  isHOD?: boolean;
  isPanelJudge?: boolean;
  isAdmin?: boolean;
  gender?: string;
  designation?: string;
  email?: string;
  location?: string;
}

export interface AppliedDirectoryViewProps {
  currentUser?: AuthUser | null;
  month: string;
  setMonth: (m: string) => void;
  monthOptions: Array<{ value: string; label: string }>;
  cycle: Cycle;
  onNavigateToNominate?: () => void;
}

export type PromptTemplateId = "approaching" | "extended" | "final_call" | "custom";

export const AppliedDirectoryView: React.FC<AppliedDirectoryViewProps> = ({
  currentUser,
  month,
  setMonth,
  monthOptions,
  cycle,
}) => {
  // State
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "applied" | "not_applied">("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [selectedNomination, setSelectedNomination] = useState<Nomination | null>(null);

  // Reminder Modal States
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderTarget, setReminderTarget] = useState<"all_pending" | "filtered_pending" | "single">("all_pending");
  const [singleEmpTarget, setSingleEmpTarget] = useState<EmployeeRecord | null>(null);
  const [promptType, setPromptType] = useState<PromptTemplateId>("approaching");
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [copiedAction, setCopiedAction] = useState<"emails" | "body" | "outlook" | null>(null);

  // Fetch all employees from master database
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employees");
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (e) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Timeline and deadline calculations
  const timeline = useMemo(() => getCycleTimeline(cycle), [cycle]);
  const nomPhase = timeline.nomination;
  const isExtended = Boolean(nomPhase.isExtended);
  const effectiveEnd = useMemo(() => getEffectiveEndDate(nomPhase), [nomPhase]);
  const formattedEndDate = useMemo(() => formatDatePretty(effectiveEnd), [effectiveEnd]);

  // Map nominations by employee code (normalized to uppercase)
  const nominationsByEmpCode = useMemo(() => {
    const map = new Map<string, Nomination[]>();
    (cycle?.nominations || []).forEach((nom) => {
      const code = (nom.code || "").trim().toUpperCase();
      if (!code) return;
      if (!map.has(code)) {
        map.set(code, []);
      }
      map.get(code)!.push(nom);
    });
    return map;
  }, [cycle?.nominations]);

  // Combined data for each eligible employee (strictly excluding HODs because HODs do not file self-nominations)
  const employeeDirectory = useMemo(() => {
    return employees
      .filter((emp) => !emp.isHOD && emp.role !== "hod")
      .map((emp) => {
        const codeUpper = (emp.code || "").trim().toUpperCase();
        const noms = nominationsByEmpCode.get(codeUpper) || [];
        const hasApplied = noms.length > 0;
        return {
          ...emp,
          hasApplied,
          nominations: noms,
          nominationCount: noms.length,
        };
      });
  }, [employees, nominationsByEmpCode]);

  // Dynamic units list
  const allUnits = useMemo(() => getDynamicUnits(employees), [employees]);

  // Statistics
  const stats = useMemo(() => {
    const total = employeeDirectory.length;
    const applied = employeeDirectory.filter((e) => e.hasApplied).length;
    const notApplied = total - applied;
    const totalNominations = (cycle?.nominations || []).length;
    const participationRate = total > 0 ? ((applied / total) * 100).toFixed(1) : "0.0";

    return {
      total,
      applied,
      notApplied,
      totalNominations,
      participationRate,
    };
  }, [employeeDirectory, cycle?.nominations]);

  // Filtered rows
  const filteredEmployees = useMemo(() => {
    return employeeDirectory.filter((emp) => {
      // Status filter
      if (statusFilter === "applied" && !emp.hasApplied) return false;
      if (statusFilter === "not_applied" && emp.hasApplied) return false;

      // Unit/Dept filter
      if (unitFilter !== "all" && emp.unitId?.toLowerCase() !== unitFilter.toLowerCase()) {
        return false;
      }

      // Search filter (Code, Name, Email, Designation)
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchCode = emp.code.toLowerCase().includes(q);
        const matchName = emp.name.toLowerCase().includes(q);
        const matchEmail = (emp.email || "").toLowerCase().includes(q);
        const matchDesig = (emp.designation || "").toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchEmail && !matchDesig) {
          return false;
        }
      }

      return true;
    });
  }, [employeeDirectory, statusFilter, unitFilter, search]);

  // Current Month Label
  const currentMonthLabel = useMemo(() => {
    const found = monthOptions.find((o) => o.value === month);
    if (found) return found.label;
    return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [month, monthOptions]);

  // Pending (Not Applied) Employees with valid emails
  const pendingEmployees = useMemo(() => {
    return employeeDirectory.filter((e) => !e.hasApplied && Boolean(e.email));
  }, [employeeDirectory]);

  const filteredPendingEmployees = useMemo(() => {
    return filteredEmployees.filter((e) => !e.hasApplied && Boolean(e.email));
  }, [filteredEmployees]);

  // Target Recipients for Reminder
  const targetRecipients = useMemo(() => {
    if (reminderTarget === "single" && singleEmpTarget) {
      return singleEmpTarget.email ? [singleEmpTarget] : [];
    }
    if (reminderTarget === "filtered_pending") {
      return filteredPendingEmployees;
    }
    return pendingEmployees;
  }, [reminderTarget, singleEmpTarget, filteredPendingEmployees, pendingEmployees]);

  const targetEmails = useMemo(() => {
    return targetRecipients.map((e) => e.email!.trim()).filter(Boolean);
  }, [targetRecipients]);

  // Template Prompt Generator
  const generateTemplateContent = (type: PromptTemplateId, recipientName?: string) => {
    const portalUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const greeting = recipientName ? `Dear ${recipientName},` : "Dear Colleague,";

    switch (type) {
      case "extended":
        return {
          subject: `Update: Self-Nomination Deadline Extended to ${formattedEndDate} - MAHLE Rewards`,
          body: `${greeting}

Great news! The nomination submission window for the ${currentMonthLabel} Corporate Rewards & Recognition cycle has been officially extended to ${formattedEndDate}.

If you haven't submitted your self-nomination yet, you now have additional time to showcase your accomplishments, innovative initiatives, and teamwork.

👉 Submit your nomination directly here:
${portalUrl}

Eligible Categories:
• Customer Service
• Eagle Eye
• Employee of the Month
• Best New Comer
• Learning Champion

Take this opportunity to ensure your hard work and achievements are recognized!

Warm regards,
MAHLE ANAND Filter Systems
HR & Recognition Committee`,
        };

      case "final_call":
        return {
          subject: `Urgent: Final Call - Self-Nominations Close Today! - MAHLE Rewards`,
          body: `${greeting}

Today is the final day to submit your self-nomination for the ${currentMonthLabel} recognition cycle. The nomination submission portal will officially close tonight.

Please take a few minutes right now to record your achievements before the deadline:
👉 ${portalUrl}

Nominations submitted after the cutoff cannot be considered for this evaluation cycle.

Best regards,
MAHLE ANAND Filter Systems
HR & Recognition Committee`,
        };

      case "approaching":
      default:
        return {
          subject: `Reminder: Self-Nomination Window Closing Soon (${formattedEndDate}) - MAHLE Rewards`,
          body: `${greeting}

This is a friendly reminder that the self-nomination window for the ${currentMonthLabel} Corporate Rewards & Recognition cycle will close on ${formattedEndDate}.

If you have achieved notable accomplishments, delivered measurable business impact, or demonstrated outstanding performance, please submit your self-nomination before the deadline.

👉 Submit your nomination here:
${portalUrl}

Eligible Categories:
• Customer Service
• Eagle Eye
• Employee of the Month
• Best New Comer
• Learning Champion

Best regards,
MAHLE ANAND Filter Systems
HR & Recognition Committee`,
        };
    }
  };

  // Open Reminder Modal and Initialize Content
  const handleOpenReminderModal = (target: "all_pending" | "filtered_pending" | "single", emp?: EmployeeRecord) => {
    const initialType: PromptTemplateId = isExtended ? "extended" : "approaching";
    setReminderTarget(target);
    setSingleEmpTarget(emp || null);
    setPromptType(initialType);

    const generated = generateTemplateContent(initialType, emp?.name);
    setCustomSubject(generated.subject);
    setCustomBody(generated.body);
    setCopiedAction(null);
    setShowReminderModal(true);
  };

  // Switch Prompt Template
  const handleSelectPromptType = (type: PromptTemplateId) => {
    setPromptType(type);
    if (type !== "custom") {
      const generated = generateTemplateContent(type, singleEmpTarget?.name);
      setCustomSubject(generated.subject);
      setCustomBody(generated.body);
    }
  };

  // One-Click Action: Open Mail Client / Outlook
  const handleOpenOutlook = () => {
    if (targetEmails.length === 0) return;

    // If more than 30 recipients, copy emails to clipboard to prevent Windows mailto: URI length truncation
    if (targetEmails.length > 30) {
      navigator.clipboard.writeText(targetEmails.join("; "));
      setCopiedAction("outlook");
      setTimeout(() => setCopiedAction(null), 7000);
      window.location.href = `mailto:?subject=${encodeURIComponent(customSubject)}&body=${encodeURIComponent(customBody)}`;
    } else {
      window.location.href = `mailto:?bcc=${encodeURIComponent(targetEmails.join("; "))}&subject=${encodeURIComponent(
        customSubject
      )}&body=${encodeURIComponent(customBody)}`;
    }
  };

  // Copy BCC emails to clipboard
  const handleCopyEmails = () => {
    navigator.clipboard.writeText(targetEmails.join("; "));
    setCopiedAction("emails");
    setTimeout(() => setCopiedAction(null), 4000);
  };

  // Copy Email Body to clipboard
  const handleCopyBody = () => {
    const fullText = `Subject: ${customSubject}\n\n${customBody}`;
    navigator.clipboard.writeText(fullText);
    setCopiedAction("body");
    setTimeout(() => setCopiedAction(null), 4000);
  };

  // Export CSV of Applied / Not Applied status
  const exportStatusCsv = () => {
    const headers = [
      "Employee ID",
      "Employee Name",
      "Work Email",
      "Department / Unit",
      "Designation",
      "Location",
      "Nomination Status",
      "Total Nominations",
      "Categories Applied",
      "Submission Timestamps",
    ];

    const rows = filteredEmployees.map((emp) => {
      const categories = emp.nominations.map((n) => catById(n.category)?.name || n.category).join("; ");
      const dates = emp.nominations
        .map((n) => (n.submittedAt ? new Date(n.submittedAt).toLocaleDateString("en-IN") : "N/A"))
        .join("; ");

      return [
        emp.code,
        `"${emp.name.replace(/"/g, '""')}"`,
        emp.email || "",
        `"${(unitById(emp.unitId)?.name || emp.unitId).replace(/"/g, '""')}"`,
        `"${(emp.designation || "").replace(/"/g, '""')}"`,
        `"${(emp.location || "").replace(/"/g, '""')}"`,
        emp.hasApplied ? "APPLIED" : "NOT APPLIED",
        emp.nominationCount,
        `"${categories.replace(/"/g, '""')}"`,
        `"${dates.replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Eligible_Employees_Nomination_Status_${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner with Month Selector */}
      <div className="rounded-2xl border border-blue-900/10 bg-gradient-to-r from-[#0A2540] via-[#0F355C] to-[#0A2540] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-10 h-40 w-40 rounded-full bg-sky-400/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-md">
              <Sparkles size={13} className="text-emerald-300" />
              <span>Nomination Participation Directory</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Applied Employees Tracker
            </h1>
            <p className="text-sm text-sky-100/80 leading-relaxed">
              Real-time directory tracking which eligible employees have filled their self-nominations for the selected cycle.
              Department Heads (HODs) are excluded because they evaluate instead of filing self-nominations.
              Employees with completed nominations are highlighted with a distinct <strong className="text-emerald-300 font-bold">Green ID</strong>.
            </p>
          </div>

          {/* Month Selector & Quick Actions */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Month Selector */}
            <div className="flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-3.5 py-2 backdrop-blur-sm shadow-sm">
              <Calendar size={15} className="text-sky-300" />
              <span className="text-xs font-bold text-sky-200 uppercase tracking-wider hidden sm:inline">
                Cycle:
              </span>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer pr-2"
              >
                {monthOptions.map((o) => (
                  <option key={o.value} value={o.value} className="bg-[#0A2540] text-white">
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchEmployees}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer shadow-xs"
              title="Refresh employee data"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>

            {/* Export CSV */}
            <button
              onClick={exportStatusCsv}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-emerald-950 px-4 py-2.5 text-xs font-bold uppercase tracking-wider shadow-md hover:bg-emerald-400 active:scale-95 transition-all cursor-pointer"
              title="Export nomination submission status as CSV"
            >
              <Download size={14} /> Export CSV
            </button>

            {/* Remind Pending Staff Button */}
            <button
              onClick={() => handleOpenReminderModal("all_pending")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 text-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider shadow-md hover:bg-indigo-400 active:scale-95 transition-all cursor-pointer"
              title="Send reminder emails to eligible employees who haven't applied yet"
            >
              <Bell size={14} /> Send Reminder ({pendingEmployees.length})
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Directory */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Eligible Staff</span>
            <Users size={18} className="text-blue-700" />
          </div>
          <p className="text-2xl font-black text-blue-950">{stats.total}</p>
          <span className="text-[11px] text-slate-500 font-medium">Excludes Department HODs</span>
        </div>

        {/* Applied (Green) */}
        <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-4 space-y-1 shadow-xs relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-emerald-200/40 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-emerald-900/80">
            <span className="text-[11px] font-bold uppercase tracking-wider">Applied (Green ID)</span>
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-emerald-900">{stats.applied}</p>
            <span className="text-xs font-extrabold text-emerald-700">
              ({stats.participationRate}%)
            </span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium">Filled Nomination in {currentMonthLabel}</span>
        </div>

        {/* Not Applied */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-amber-900/80">
            <span className="text-[11px] font-bold uppercase tracking-wider">Not Applied</span>
            <Clock size={18} className="text-amber-600" />
          </div>
          <p className="text-2xl font-black text-blue-950">{stats.notApplied}</p>
          <span className="text-[11px] text-amber-700 font-medium">Eligible Pending Submission</span>
        </div>

        {/* Total Submissions */}
        <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-sky-900/80">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Nominations</span>
            <Award size={18} className="text-sky-600" />
          </div>
          <p className="text-2xl font-black text-blue-950">{stats.totalNominations}</p>
          <span className="text-[11px] text-sky-700 font-medium">Entries Submitted this Month</span>
        </div>
      </div>

      {/* 3. Filter Bar & Interactive Directory Table */}
      <Card className="p-6 border border-blue-900/10 shadow-sm bg-white space-y-5">
        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          {/* Quick Filter Tabs: All, Applied, Not Applied */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "all"
                  ? "bg-white text-blue-950 shadow-xs"
                  : "text-slate-600 hover:text-blue-950"
              }`}
            >
              All Eligible ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter("applied")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "applied"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-emerald-800 hover:bg-emerald-50"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Applied ({stats.applied})
            </button>
            <button
              onClick={() => setStatusFilter("not_applied")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "not_applied"
                  ? "bg-[#0A2540] text-white shadow-xs"
                  : "text-slate-600 hover:text-blue-950"
              }`}
            >
              Not Applied ({stats.notApplied})
            </button>
          </div>

          {/* Search and Department Dropdowns */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Box */}
            <div className="relative min-w-[220px] sm:min-w-[260px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Emp ID, Name, Email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-blue-950 placeholder-slate-400 focus:border-blue-700 focus:bg-white outline-none shadow-xs"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Department Dropdown */}
            <div className="min-w-[180px]">
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-blue-950 outline-none shadow-xs cursor-pointer focus:border-blue-700"
              >
                <option value="all">All Departments / Units</option>
                {allUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 text-left">Employee ID</th>
                <th className="px-4 py-3.5 text-left">Employee Details</th>
                <th className="px-4 py-3.5 text-left">Department / Unit</th>
                <th className="px-4 py-3.5 text-left">Nomination Status ({currentMonthLabel})</th>
                <th className="px-4 py-3.5 text-left">Applied Category(s)</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw size={20} className="animate-spin inline mr-2 text-blue-700" />
                    Loading employee nomination records...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    No employee records match the selected search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  return (
                    <tr
                      key={emp.code}
                      className={`transition-colors ${
                        emp.hasApplied
                          ? "bg-emerald-50/30 hover:bg-emerald-50/60"
                          : "hover:bg-slate-50/70"
                      }`}
                    >
                      {/* 1. Employee ID - Prominently GREEN if applied! */}
                      <td className="px-4 py-3.5">
                        {emp.hasApplied ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 border border-emerald-300 px-3 py-1 text-xs font-mono font-black text-emerald-900 shadow-2xs">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            {emp.code}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-mono font-medium text-slate-600">
                            {emp.code}
                          </span>
                        )}
                      </td>

                      {/* 2. Employee Details */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-blue-950 text-xs">{emp.name}</div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          {emp.email && <span>{emp.email}</span>}
                          {emp.designation && <span>• {emp.designation}</span>}
                        </div>
                      </td>

                      {/* 3. Department / Unit */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-blue-950">
                          {unitById(emp.unitId)?.name || emp.unitId || "General"}
                        </div>
                        {emp.location && (
                          <div className="text-[10px] text-slate-400">{emp.location}</div>
                        )}
                      </td>

                      {/* 4. Nomination Status */}
                      <td className="px-4 py-3.5">
                        {emp.hasApplied ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-900">
                              <CheckCircle2 size={12} className="text-emerald-700" />
                              Applied ({emp.nominationCount} {emp.nominationCount === 1 ? "entry" : "entries"})
                            </span>
                            {emp.nominations[0]?.submittedAt && (
                              <div className="text-[10px] text-emerald-700/80 font-medium">
                                Submitted {new Date(emp.nominations[0].submittedAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">
                            <Clock size={11} className="text-slate-400" />
                            Not Applied
                          </span>
                        )}
                      </td>

                      {/* 5. Applied Categories */}
                      <td className="px-4 py-3.5">
                        {emp.hasApplied ? (
                          <div className="flex flex-wrap gap-1.5">
                            {emp.nominations.map((nom) => {
                              const catObj = catById(nom.category);
                              return (
                                <span
                                  key={nom.id}
                                  className="inline-flex items-center gap-1 rounded-md bg-sky-50 border border-sky-200 px-2 py-0.5 text-[10px] font-bold text-sky-950"
                                  title={nom.citation}
                                >
                                  <Award size={10} className="text-sky-700" />
                                  {catObj?.name || nom.category}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* 6. Action */}
                      <td className="px-4 py-3.5 text-right">
                        {emp.hasApplied ? (
                          <button
                            onClick={() => setSelectedNomination(emp.nominations[0])}
                            className="inline-flex items-center gap-1 rounded-xl border border-blue-900/15 bg-white px-3 py-1.5 text-xs font-bold text-blue-950 hover:bg-blue-900 hover:text-white transition active:scale-95 shadow-2xs cursor-pointer"
                            title="View submitted citation details"
                          >
                            <Eye size={12} /> View Citation
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenReminderModal("single", emp)}
                            disabled={!emp.email}
                            className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50/70 px-2.5 py-1 text-xs font-bold text-indigo-900 hover:bg-indigo-100 hover:border-indigo-300 transition active:scale-95 shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title={emp.email ? `Send reminder email to ${emp.name}` : "No work email address recorded"}
                          >
                            <Mail size={12} className="text-indigo-600" />
                            <span>Remind</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Count */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-2">
          <span>
            Showing <strong>{filteredEmployees.length}</strong> of <strong>{stats.total}</strong> eligible employees (HODs excluded)
          </span>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <strong>{stats.applied}</strong> Applied (Green ID)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <strong>{stats.notApplied}</strong> Not Applied
            </span>
          </div>
        </div>
      </Card>

      {/* 4. Citation Details Modal */}
      {selectedNomination && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 text-blue-950">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <Award size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-blue-950">Nomination Citation Details</h3>
                  <p className="text-xs text-slate-400">
                    Cycle: {currentMonthLabel}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNomination(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Nominee Profile summary */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-sm font-extrabold text-blue-950">{selectedNomination.name}</h4>
                  <span className="text-xs text-slate-500 font-mono">
                    ID: <strong>{selectedNomination.code}</strong>
                  </span>
                </div>
                <span className="inline-block rounded-md bg-sky-100 border border-sky-300 px-2.5 py-1 text-xs font-bold text-sky-950">
                  {catById(selectedNomination.category)?.name || selectedNomination.category}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-slate-600 pt-1">
                <span>
                  <strong>Department:</strong> {unitById(selectedNomination.unit)?.name || selectedNomination.unit}
                </span>
                {selectedNomination.location && (
                  <span>
                    <strong>Location:</strong> {selectedNomination.location}
                  </span>
                )}
                {selectedNomination.submittedAt && (
                  <span>
                    <strong>Submitted:</strong>{" "}
                    {new Date(selectedNomination.submittedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* Citation Content */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Citation &amp; Description</span>
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-800 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                {selectedNomination.citation || "No citation text provided."}
              </div>
            </div>

            {/* Measurable Business Impact */}
            {selectedNomination.businessImpact && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Business Impact / Measurable Outcome
                </span>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedNomination.businessImpact}
                </div>
              </div>
            )}

            {/* MAFS Value */}
            {selectedNomination.mafsValue && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">MAFS Core Value</span>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-800">
                  {selectedNomination.mafsValue}
                </div>
              </div>
            )}

            {/* Evidence Link */}
            {selectedNomination.evidence && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Supporting Evidence Link</span>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <a
                    href={selectedNomination.evidence}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-700 hover:underline break-all font-mono"
                  >
                    {selectedNomination.evidence}
                  </a>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedNomination(null)}
                className="rounded-xl bg-[#0A2540] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-900 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Send Reminder Email Modal with Prompt Selection */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 text-blue-950">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                  <Bell size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-blue-950">Send Nomination Reminder</h3>
                  <p className="text-xs text-slate-400">
                    Cycle: {currentMonthLabel} • Deadline: <strong className="text-blue-950">{formattedEndDate}</strong> {isExtended ? "(Extended)" : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReminderModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Recipient Target Summary */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900/70">
                  Target Recipients ({targetEmails.length} Email{targetEmails.length === 1 ? "" : "s"})
                </span>
                <p className="text-xs text-indigo-950 font-medium">
                  {reminderTarget === "single" && singleEmpTarget ? (
                    <>Sending to <strong>{singleEmpTarget.name}</strong> ({singleEmpTarget.email})</>
                  ) : reminderTarget === "filtered_pending" ? (
                    <>Sending to <strong>{targetEmails.length} pending staff</strong> matching current filter</>
                  ) : (
                    <>Sending to <strong>all {targetEmails.length} pending eligible employees</strong></>
                  )}
                </p>
              </div>

              {/* Target Switching Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setReminderTarget("all_pending");
                    setSingleEmpTarget(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    reminderTarget === "all_pending"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white text-indigo-900 border border-indigo-200 hover:bg-indigo-50"
                  }`}
                >
                  All ({pendingEmployees.length})
                </button>
                {unitFilter !== "all" && (
                  <button
                    type="button"
                    onClick={() => {
                      setReminderTarget("filtered_pending");
                      setSingleEmpTarget(null);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      reminderTarget === "filtered_pending"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white text-indigo-900 border border-indigo-200 hover:bg-indigo-50"
                    }`}
                  >
                    Dept ({filteredPendingEmployees.length})
                  </button>
                )}
              </div>
            </div>

            {/* Prompt / Template Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-500" />
                Select Reminder Prompt Type:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Approaching Soon */}
                <button
                  type="button"
                  onClick={() => handleSelectPromptType("approaching")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    promptType === "approaching"
                      ? "border-sky-500 bg-sky-50/80 shadow-xs ring-1 ring-sky-500"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-950">⏰ Deadline Approaching</span>
                    <span className="text-[10px] font-extrabold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-md">
                      Standard
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Alerts staff that nomination closes on {formattedEndDate}.
                  </p>
                </button>

                {/* 2. Extended Deadline */}
                <button
                  type="button"
                  onClick={() => handleSelectPromptType("extended")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    promptType === "extended"
                      ? "border-emerald-500 bg-emerald-50/80 shadow-xs ring-1 ring-emerald-500"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-950">🎉 Deadline Extended</span>
                    <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                      {isExtended ? "Active Extension" : "Extended"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Announces extra time granted until {formattedEndDate}.
                  </p>
                </button>

                {/* 3. Final Call / Today */}
                <button
                  type="button"
                  onClick={() => handleSelectPromptType("final_call")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    promptType === "final_call"
                      ? "border-rose-500 bg-rose-50/80 shadow-xs ring-1 ring-rose-500"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-950">🚨 Final Call / Today</span>
                    <span className="text-[10px] font-extrabold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md">
                      Urgent
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Urgent call: today is the final day before portal closure.
                  </p>
                </button>

                {/* 4. Custom Message */}
                <button
                  type="button"
                  onClick={() => handleSelectPromptType("custom")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    promptType === "custom"
                      ? "border-purple-500 bg-purple-50/80 shadow-xs ring-1 ring-purple-500"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-950">✍️ Custom Prompt</span>
                    <span className="text-[10px] font-extrabold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                      Editable
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Compose your own tailored subject and body.
                  </p>
                </button>
              </div>
            </div>

            {/* Email Subject Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Email Subject Line:
              </label>
              <input
                type="text"
                value={customSubject}
                onChange={(e) => {
                  setCustomSubject(e.target.value);
                  setPromptType("custom");
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-blue-950 focus:border-blue-700 outline-none shadow-xs"
              />
            </div>

            {/* Email Body Preview & Editor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Email Message Body:
                </label>
                <button
                  type="button"
                  onClick={handleCopyBody}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  {copiedAction === "body" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  <span>{copiedAction === "body" ? "Copied Message!" : "Copy Text"}</span>
                </button>
              </div>
              <textarea
                rows={9}
                value={customBody}
                onChange={(e) => {
                  setCustomBody(e.target.value);
                  setPromptType("custom");
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs text-blue-950 font-normal leading-relaxed focus:bg-white focus:border-blue-700 outline-none shadow-xs font-sans whitespace-pre-wrap"
              />
            </div>

            {/* Copy / Action Feedback Notification */}
            {copiedAction === "outlook" && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 animate-in fade-in">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>
                  <strong>Opening Outlook!</strong> Since you have {targetEmails.length} recipients, all email addresses have been copied to your clipboard. Simply paste (Ctrl+V) them into the <strong>BCC field</strong> in Outlook.
                </span>
              </div>
            )}

            {copiedAction === "emails" && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 animate-in fade-in">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>Copied {targetEmails.length} recipient emails to clipboard! Paste into your Outlook/email BCC field.</span>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Copy All BCC Emails */}
                <button
                  type="button"
                  onClick={handleCopyEmails}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer active:scale-95"
                  title="Copy all pending email addresses separated by semicolons"
                >
                  {copiedAction === "emails" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>Copy {targetEmails.length} Emails</span>
                </button>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowReminderModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>

                {/* Primary Action: Open in Outlook */}
                <button
                  type="button"
                  onClick={handleOpenOutlook}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A2540] hover:bg-blue-900 text-white px-5 py-2 text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer"
                  title="Open Outlook or your default email app with pre-filled reminder"
                >
                  <Mail size={14} className="text-sky-300" />
                  <span>Open in Outlook / Mail</span>
                  <ExternalLink size={12} className="opacity-70" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppliedDirectoryView;
