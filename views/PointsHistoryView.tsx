"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Trophy,
  Award,
  Calendar,
  Download,
  Filter,
  Search,
  Users,
  ChevronRight,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  X,
  FileSpreadsheet,
  TrendingUp,
  User,
  SlidersHorizontal,
} from "lucide-react";
import Card from "../components/Card";
import Label from "../components/Label";
import Pill from "../components/Pill";
import { catById, unitById } from "../lib/constants";
import { PointsState, PointRecord, Win, AuthUser, EmployeeRecord } from "../lib/types";
import { loadPoints, savePoints } from "../lib/storage";

export interface PointsHistoryViewProps {
  currentUser?: AuthUser | null;
  points?: PointsState;
  setPoints?: React.Dispatch<React.SetStateAction<PointsState>>;
}

interface FilteredEmployeePoints {
  code: string;
  name: string;
  unit: string;
  email?: string;
  rangeWins: Win[];
  rangeEvaluationsCount: number;
  rangeWinsCount: number;
  rangePoints: number;
  rangeLsipScore: number;
  allTimePoints: number;
  allTimeWinsCount: number;
}

export const PointsHistoryView: React.FC<PointsHistoryViewProps> = ({
  currentUser,
  points: externalPoints,
  setPoints: externalSetPoints,
}) => {
  // Local points state if not provided from parent
  const [internalPoints, setInternalPoints] = useState<PointsState>({});
  const points = externalPoints || internalPoints;

  const [allEmployees, setAllEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("all");
  const [onlyWithPoints, setOnlyWithPoints] = useState(true);

  // Filter Mode: "year_month" | "date_range"
  const [filterMode, setFilterMode] = useState<"year_month" | "date_range">("year_month");

  // Current year & month defaults
  const now = new Date();
  const currentYearStr = String(now.getFullYear());
  const currentMonthNumStr = String(now.getMonth() + 1).padStart(2, "0");

  // Mode 1: Year & Month
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  // Mode 2: From Month to To Month (YYYY-MM)
  const [fromMonth, setFromMonth] = useState<string>(`${currentYearStr}-01`);
  const [toMonth, setToMonth] = useState<string>(`${currentYearStr}-12`);

  // Selected Employee for Detailed Breakdown Modal
  const [selectedEmp, setSelectedEmp] = useState<FilteredEmployeePoints | null>(null);

  // Sync notification
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Fetch employees and points on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [empRes, ptsData] = await Promise.all([
          fetch("/api/employees"),
          !externalPoints ? loadPoints() : Promise.resolve(null),
        ]);

        if (empRes.ok) {
          const empJson = await empRes.json();
          setAllEmployees(empJson.employees || []);
        }

        if (ptsData) {
          setInternalPoints(ptsData);
        }
      } catch (e) {
        /* ignore fetch error */
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [externalPoints]);

  // Employee Map for resolving emails and current departments
  const employeeMap = useMemo(() => {
    const map = new Map<string, EmployeeRecord>();
    allEmployees.forEach((e) => {
      if (e.code) {
        map.set(e.code.trim().toUpperCase(), e);
      }
    });
    return map;
  }, [allEmployees]);

  // Dynamic Units
  const unitsList = useMemo(() => {
    const set = new Set<string>();
    allEmployees.forEach((e) => {
      if (e.unitId) set.add(e.unitId);
    });
    Object.values(points).forEach((p) => {
      if (p.unit) set.add(p.unit);
    });
    return Array.from(set).sort();
  }, [allEmployees, points]);

  // Available Years derived from recorded scores + current year
  const availableYears = useMemo(() => {
    const yearSet = new Set<string>();
    yearSet.add(currentYearStr);
    yearSet.add(String(now.getFullYear() - 1));

    Object.values(points).forEach((p) => {
      p.wins?.forEach((w) => {
        if (w.month) {
          const y = w.month.split("-")[0];
          if (y && y.length === 4) yearSet.add(y);
        }
      });
    });

    return Array.from(yearSet).sort((a, b) => b.localeCompare(a));
  }, [points, currentYearStr]);

  // Determine active effective date range [effectiveFrom, effectiveTo]
  const { effectiveFrom, effectiveTo, dateRangeLabel } = useMemo(() => {
    if (filterMode === "year_month") {
      if (selectedYear === "all") {
        return {
          effectiveFrom: "",
          effectiveTo: "",
          dateRangeLabel: "All Time Cumulative",
        };
      }
      if (selectedMonth === "all") {
        return {
          effectiveFrom: `${selectedYear}-01`,
          effectiveTo: `${selectedYear}-12`,
          dateRangeLabel: `Full Year ${selectedYear}`,
        };
      }
      const mLabel = new Date(`${selectedYear}-${selectedMonth}-01T00:00:00`).toLocaleDateString(
        "en-IN",
        { month: "long", year: "numeric" }
      );
      return {
        effectiveFrom: `${selectedYear}-${selectedMonth}`,
        effectiveTo: `${selectedYear}-${selectedMonth}`,
        dateRangeLabel: mLabel,
      };
    }

    // Date Range mode
    const fromLabel = fromMonth
      ? new Date(`${fromMonth}-01T00:00:00`).toLocaleDateString("en-IN", {
          month: "short",
          year: "numeric",
        })
      : "Start";
    const toLabel = toMonth
      ? new Date(`${toMonth}-01T00:00:00`).toLocaleDateString("en-IN", {
          month: "short",
          year: "numeric",
        })
      : "End";

    return {
      effectiveFrom: fromMonth,
      effectiveTo: toMonth,
      dateRangeLabel: `${fromLabel} – ${toLabel}`,
    };
  }, [filterMode, selectedYear, selectedMonth, fromMonth, toMonth]);

  // One-click Presets
  const applyPreset = (preset: "fy" | "calendar" | "last6" | "all") => {
    const currentYear = now.getFullYear();
    if (preset === "fy") {
      // Indian Financial Year: April of current/previous year to March of next
      const fyStartYear = now.getMonth() >= 3 ? currentYear : currentYear - 1;
      setFilterMode("date_range");
      setFromMonth(`${fyStartYear}-04`);
      setToMonth(`${fyStartYear + 1}-03`);
    } else if (preset === "calendar") {
      setFilterMode("year_month");
      setSelectedYear(String(currentYear));
      setSelectedMonth("all");
    } else if (preset === "last6") {
      setFilterMode("date_range");
      const d = new Date();
      d.setMonth(d.getMonth() - 5);
      const startM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const endM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      setFromMonth(startM);
      setToMonth(endM);
    } else if (preset === "all") {
      setFilterMode("year_month");
      setSelectedYear("all");
      setSelectedMonth("all");
    }
  };

  // Compile and filter employee points based on selected date range
  const filteredData: FilteredEmployeePoints[] = useMemo(() => {
    // Collect all employee codes from both points ledger and employees directory
    const allCodes = new Set<string>();
    Object.keys(points).forEach((k) => allCodes.add(k.trim().toUpperCase()));
    if (!onlyWithPoints) {
      allEmployees.forEach((e) => {
        if (e.code) allCodes.add(e.code.trim().toUpperCase());
      });
    }

    const rows: FilteredEmployeePoints[] = [];

    allCodes.forEach((code) => {
      const p = points[code] || points[code.toLowerCase()] || undefined;
      const emp = employeeMap.get(code);

      const name = p?.name || emp?.name || code;
      const unit = p?.unit || emp?.unitId || "General";
      const email = emp?.email || "";

      const allTimeWins = p?.wins || [];
      const allTimePoints = p?.points || 0;
      const allTimeWinsCount = allTimeWins.filter((w) => w.isWinner).length;

      // Filter wins/scores strictly within [effectiveFrom, effectiveTo]
      const rangeWins = allTimeWins.filter((w) => {
        if (!w.month) return false;
        if (effectiveFrom && w.month < effectiveFrom) return false;
        if (effectiveTo && w.month > effectiveTo) return false;
        return true;
      });

      const rangeEvaluationsCount = rangeWins.length;
      const rangeWinsCount = rangeWins.filter((w) => w.isWinner).length;
      const rangePointsRaw = rangeWins.reduce((sum, w) => sum + (w.score || 0), 0);
      const rangePoints = Math.round(rangePointsRaw * 10) / 10;
      const rangeLsipScore = Math.round(rangePoints * 0.5 * 10) / 10;

      // Filter out 0 points if toggle is active
      if (onlyWithPoints && rangeEvaluationsCount === 0) {
        return;
      }

      // Filter by unit / department
      if (unitFilter !== "all" && unit !== unitFilter) {
        return;
      }

      // Filter by search query
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchCode = code.toLowerCase().includes(q);
        const matchName = name.toLowerCase().includes(q);
        const matchUnit = (unitById(unit)?.name || unit).toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchUnit) {
          return;
        }
      }

      rows.push({
        code,
        name,
        unit,
        email,
        rangeWins,
        rangeEvaluationsCount,
        rangeWinsCount,
        rangePoints,
        rangeLsipScore,
        allTimePoints,
        allTimeWinsCount,
      });
    });

    // Sort descending by range points, then by range evaluations
    return rows.sort((a, b) => b.rangePoints - a.rangePoints || b.rangeEvaluationsCount - a.rangeEvaluationsCount);
  }, [
    points,
    allEmployees,
    employeeMap,
    onlyWithPoints,
    unitFilter,
    search,
    effectiveFrom,
    effectiveTo,
  ]);

  // Overall Statistics for the selected date range
  const stats = useMemo(() => {
    const totalPoints = filteredData.reduce((sum, r) => sum + r.rangePoints, 0);
    const totalLsip = Math.round(totalPoints * 0.5 * 10) / 10;
    const evaluatedStaffCount = filteredData.filter((r) => r.rangeEvaluationsCount > 0).length;
    const totalWins = filteredData.reduce((sum, r) => sum + r.rangeWinsCount, 0);

    return {
      totalPoints: Math.round(totalPoints * 10) / 10,
      totalLsip,
      evaluatedStaffCount,
      totalWins,
    };
  }, [filteredData]);

  // CSV Export for the filtered period
  const exportFilteredCsv = () => {
    const rows: string[][] = [
      [
        "Employee Code",
        "Employee Name",
        "Department / Unit",
        "Work Email",
        `Evaluations in Range (${dateRangeLabel})`,
        `Wins in Range (${dateRangeLabel})`,
        `Cumulative Points in Range`,
        `50% LSIP Weightage Score`,
        "All-Time Total Points",
        "Monthly Points Breakdown",
      ],
    ];

    filteredData.forEach((r) => {
      const unitName = unitById(r.unit)?.name || r.unit;
      const breakdownStr = r.rangeWins
        .map(
          (w) =>
            `${w.month}: ${catById(w.category)?.name || w.category} (${(w.score || 0).toFixed(1)} Pts)${
              w.isWinner ? " [WINNER]" : ""
            }`
        )
        .join(" | ");

      rows.push([
        r.code,
        `"${r.name.replace(/"/g, '""')}"`,
        `"${unitName.replace(/"/g, '""')}"`,
        r.email || "",
        String(r.rangeEvaluationsCount),
        String(r.rangeWinsCount),
        r.rangePoints.toFixed(1),
        r.rangeLsipScore.toFixed(1),
        r.allTimePoints.toFixed(1),
        `"${breakdownStr.replace(/"/g, '""')}"`,
      ]);
    });

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Points-Ledger-${dateRangeLabel.replace(/[^a-zA-Z0-9_-]/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <Card className="p-6 bg-white border border-blue-900/10 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A2540] text-amber-400 shadow-sm">
              <Trophy size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Label>Annual Performance Records</Label>
                <Pill tone="good">Permanent SQL History</Pill>
              </div>
              <h2 className="text-lg font-black tracking-tight text-blue-950">
                Annual Points Ledger &amp; Performance History
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit archive of employee evaluation scores and 50% LSIP weightage points for year-end appraisals.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={exportFilteredCsv}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0A2540] hover:bg-blue-900 text-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer"
              title="Export filtered records to CSV for Excel year-end appraisal processing"
            >
              <Download size={14} className="text-amber-400" />
              <span>Export Ledger CSV</span>
            </button>
          </div>
        </div>
      </Card>

      {/* 2. Summary Metric Cards for Selected Range */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Points in Range */}
        <Card className="p-5 border border-blue-900/10 bg-white">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <TrendingUp size={14} className="text-blue-600" /> Points in Period
          </span>
          <p className="mt-2 text-2xl font-black text-blue-950">
            {stats.totalPoints.toFixed(1)} <span className="text-xs font-semibold text-slate-500">pts</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1 truncate">{dateRangeLabel}</p>
        </Card>

        {/* 50% LSIP Weightage Score */}
        <Card className="p-5 border border-amber-200 bg-amber-50/50">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
            <Award size={14} className="text-amber-600" /> 50% LSIP Weightage
          </span>
          <p className="mt-2 text-2xl font-black text-amber-900">
            {stats.totalLsip.toFixed(1)} <span className="text-xs font-semibold text-amber-700">pts</span>
          </p>
          <p className="text-[11px] text-amber-800/80 mt-1">Half of total points earned</p>
        </Card>

        {/* Evaluated Staff Count */}
        <Card className="p-5 border border-blue-900/10 bg-white">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Users size={14} className="text-blue-600" /> Evaluated Staff
          </span>
          <p className="mt-2 text-2xl font-black text-blue-950">
            {stats.evaluatedStaffCount}{" "}
            <span className="text-xs font-semibold text-slate-500">
              / {allEmployees.length || "300+"}
            </span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Staff with scored nominations</p>
        </Card>

        {/* Monthly Award Winners */}
        <Card className="p-5 border border-blue-900/10 bg-white">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Trophy size={14} className="text-amber-500" /> Total Award Wins
          </span>
          <p className="mt-2 text-2xl font-black text-blue-950">
            {stats.totalWins} <span className="text-xs font-semibold text-slate-500">wins</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Top-scored monthly champions</p>
        </Card>
      </div>

      {/* 3. Time Period Filter Controls & Presets */}
      <Card className="p-6 bg-white border border-blue-900/10 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-blue-700" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-950">
              Time Period &amp; Date Range Filtering
            </h3>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              Active: {dateRangeLabel}
            </span>
          </div>

          {/* Quick Corporate Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Presets:</span>
            <button
              onClick={() => applyPreset("fy")}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-95 transition cursor-pointer"
            >
              Indian FY (Apr-Mar)
            </button>
            <button
              onClick={() => applyPreset("calendar")}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-95 transition cursor-pointer"
            >
              Calendar Year ({currentYearStr})
            </button>
            <button
              onClick={() => applyPreset("last6")}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-95 transition cursor-pointer"
            >
              Last 6 Months
            </button>
            <button
              onClick={() => applyPreset("all")}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-95 transition cursor-pointer"
            >
              All Time
            </button>
          </div>
        </div>

        {/* Filter Selection Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Filter Mode Switcher */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-extrabold uppercase tracking-wider text-blue-950">
              Filter Mode:
            </label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterMode("year_month")}
                className={`py-1.5 rounded-lg transition text-center cursor-pointer ${
                  filterMode === "year_month"
                    ? "bg-white text-blue-950 shadow-2xs font-extrabold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Year / Month
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("date_range")}
                className={`py-1.5 rounded-lg transition text-center cursor-pointer ${
                  filterMode === "date_range"
                    ? "bg-white text-blue-950 shadow-2xs font-extrabold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                From / To Range
              </button>
            </div>
          </div>

          {/* Mode 1: Year & Month Selectors */}
          {filterMode === "year_month" ? (
            <>
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-blue-950">
                  Select Year:
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-blue-950 outline-none focus:border-blue-700 focus:bg-white cursor-pointer shadow-2xs"
                >
                  <option value="all">🌟 All Years</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-blue-950">
                  Select Month:
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  disabled={selectedYear === "all"}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-blue-950 outline-none focus:border-blue-700 focus:bg-white cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  <option value="all">All Months</option>
                  <option value="01">January (01)</option>
                  <option value="02">February (02)</option>
                  <option value="03">March (03)</option>
                  <option value="04">April (04)</option>
                  <option value="05">May (05)</option>
                  <option value="06">June (06)</option>
                  <option value="07">July (07)</option>
                  <option value="08">August (08)</option>
                  <option value="09">September (09)</option>
                  <option value="10">October (10)</option>
                  <option value="11">November (11)</option>
                  <option value="12">December (12)</option>
                </select>
              </div>
            </>
          ) : (
            /* Mode 2: From Date / To Date Range */
            <>
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-blue-950">
                  From Month:
                </label>
                <input
                  type="month"
                  value={fromMonth}
                  onChange={(e) => setFromMonth(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-blue-950 outline-none focus:border-blue-700 focus:bg-white cursor-pointer shadow-2xs"
                />
              </div>

              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-blue-950">
                  To Month:
                </label>
                <input
                  type="month"
                  value={toMonth}
                  onChange={(e) => setToMonth(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-blue-950 outline-none focus:border-blue-700 focus:bg-white cursor-pointer shadow-2xs"
                />
              </div>
            </>
          )}

          {/* Department Filter */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-extrabold uppercase tracking-wider text-blue-950">
              Department:
            </label>
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-blue-950 outline-none focus:border-blue-700 focus:bg-white cursor-pointer shadow-2xs"
            >
              <option value="all">All Departments ({unitsList.length})</option>
              {unitsList.map((u) => (
                <option key={u} value={u}>
                  {unitById(u)?.name || u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search & Only With Points Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Employee ID, Name, or Department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2 text-xs font-medium text-blue-950 outline-none focus:border-blue-700 shadow-2xs"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyWithPoints}
              onChange={(e) => setOnlyWithPoints(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-900 focus:ring-blue-900 cursor-pointer"
            />
            <span className="text-xs font-semibold text-slate-700">
              Show only staff with evaluated points in this period ({filteredData.length} records)
            </span>
          </label>
        </div>
      </Card>

      {/* 4. Master Data Table (Strictly Clean Numbers & Points, NO Citations) */}
      <Card className="p-0 border border-blue-900/10 shadow-xs bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-extrabold text-blue-950">
              Performance Points Ledger ({filteredData.length} Staff Members)
            </h3>
            <p className="text-[11px] text-slate-400">
              Showing scores for <strong>{dateRangeLabel}</strong> · Click any row to view individual monthly breakdown.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500">
            Total Points in View: <strong className="text-blue-950 font-mono">{stats.totalPoints.toFixed(1)} Pts</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3.5">Employee ID &amp; Name</th>
                <th className="px-4 py-3.5">Department</th>
                <th className="px-4 py-3.5 text-center">Evaluations</th>
                <th className="px-4 py-3.5 text-center">Wins</th>
                <th className="px-4 py-3.5 min-w-[220px]">Monthly Scores in Period</th>
                <th className="px-4 py-3.5 text-right">Points in Range</th>
                <th className="px-4 py-3.5 text-right">50% LSIP Score</th>
                <th className="px-4 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <Trophy size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No score records found for this period.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting the date range, year, or unchecking &ldquo;Show only staff with evaluated points&rdquo;.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredData.map((r) => (
                  <tr
                    key={r.code}
                    onClick={() => setSelectedEmp(r)}
                    className="hover:bg-blue-50/50 transition cursor-pointer"
                  >
                    {/* Employee */}
                    <td className="px-4 py-3">
                      <div className="font-extrabold text-blue-950 flex items-center gap-1.5">
                        <User size={13} className="text-blue-600 shrink-0" />
                        <span>{r.name}</span>
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 ml-5">{r.code}</div>
                    </td>

                    {/* Department */}
                    <td className="px-4 py-3 text-slate-700">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-medium text-slate-700 border border-slate-200/80">
                        {unitById(r.unit)?.name || r.unit}
                      </span>
                    </td>

                    {/* Evaluations in Period */}
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center rounded-full bg-blue-100/70 text-blue-900 px-2 py-0.5 text-[11px] font-bold">
                        {r.rangeEvaluationsCount}
                      </span>
                    </td>

                    {/* Wins in Period */}
                    <td className="px-4 py-3 text-center">
                      {r.rangeWinsCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 px-2.5 py-0.5 text-[11px] font-extrabold border border-amber-300">
                          🏆 {r.rangeWinsCount}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Monthly Scores (NO CITATIONS) */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-sm">
                        {r.rangeWins.length > 0 ? (
                          r.rangeWins.map((w, idx) => (
                            <span
                              key={idx}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                w.isWinner
                                  ? "bg-amber-50 text-amber-900 border-amber-300 shadow-2xs"
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                              title={`${w.month}: ${catById(w.category)?.name || w.category} - ${(w.score || 0).toFixed(1)} Pts`}
                            >
                              <span>{w.month}:</span>
                              <span className="font-mono">{(w.score || 0).toFixed(1)}</span>
                              {w.isWinner && <span>🏆</span>}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No scores in range</span>
                        )}
                      </div>
                    </td>

                    {/* Points in Range */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-sm font-black text-blue-950">
                        {r.rangePoints.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">pts</span>
                    </td>

                    {/* 50% LSIP Score */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-sm font-black text-amber-700">
                        {r.rangeLsipScore.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-amber-600/80 ml-1">pts</span>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmp(r);
                        }}
                        className="p-1 rounded-lg hover:bg-blue-100 text-blue-700 transition"
                        title="View detailed points breakdown"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 5. Employee Details & Monthly Scoring Audit Modal */}
      {selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4.5 bg-[#0A2540] text-white shrink-0 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-amber-400">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
                    {selectedEmp.name}
                  </h3>
                  <p className="text-xs text-sky-200/80 font-mono">
                    ID: {selectedEmp.code} · {unitById(selectedEmp.unit)?.name || selectedEmp.unit}
                    {selectedEmp.email ? ` · ${selectedEmp.email}` : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmp(null)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Metric Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Points in Period
                  </span>
                  <p className="text-xl font-black text-blue-950 font-mono mt-1">
                    {selectedEmp.rangePoints.toFixed(1)}
                  </p>
                  <p className="text-[10px] text-slate-400">{dateRangeLabel}</p>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    50% LSIP Score
                  </span>
                  <p className="text-xl font-black text-amber-900 font-mono mt-1">
                    {selectedEmp.rangeLsipScore.toFixed(1)}
                  </p>
                  <p className="text-[10px] text-amber-700">Appraisal Credit</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    All-Time Points
                  </span>
                  <p className="text-xl font-black text-slate-800 font-mono mt-1">
                    {selectedEmp.allTimePoints.toFixed(1)}
                  </p>
                  <p className="text-[10px] text-slate-400">Cumulative</p>
                </div>
              </div>

              {/* Monthly Breakdown Table (No Citations, Pure Data) */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-950 mb-2">
                  Monthly Evaluation Breakdown ({dateRangeLabel})
                </h4>

                {selectedEmp.rangeWins.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                    No evaluated cycle scores recorded for this employee in the selected period.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5">Cycle Month</th>
                          <th className="px-3 py-2.5">Award Category</th>
                          <th className="px-3 py-2.5 text-right">Panel Points</th>
                          <th className="px-3 py-2.5 text-right">50% LSIP</th>
                          <th className="px-3 py-2.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedEmp.rangeWins.map((w, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="px-3 py-2.5 font-bold text-blue-950 font-mono">
                              {w.month}
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">
                              {catById(w.category)?.name || w.category}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-blue-950">
                              {(w.score || 0).toFixed(1)} pts
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-amber-700">
                              {((w.score || 0) * 0.5).toFixed(1)} pts
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {w.isWinner ? (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-extrabold border border-amber-300">
                                  🏆 Winner
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Evaluated</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedEmp(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PointsHistoryView;
