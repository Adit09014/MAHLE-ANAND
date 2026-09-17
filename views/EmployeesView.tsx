"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserPlus,
  Edit3,
  Trash2,
  Search,
  Key,
  X,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ShieldCheck,
  Scale,
  Sparkles,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import { unitById, getDynamicUnits } from "../lib/constants";
import { AuthUser } from "../lib/types";
import Card from "../components/Card";
import Label from "../components/Label";
import Pill from "../components/Pill";

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
  location?: string;
}

export interface EmployeesViewProps {
  currentUser?: AuthUser | null;
}

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-blue-950 focus:border-blue-700 focus:bg-white outline-none shadow-xs";

export const EmployeesView: React.FC<EmployeesViewProps> = ({ currentUser }) => {
  // Employee Data States
  const [allEmployees, setAllEmployees] = useState<EmployeeRecord[]>([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [empSearch, setEmpSearch] = useState("");
  const [empRoleFilter, setEmpRoleFilter] = useState("all");
  const [empUnitFilter, setEmpUnitFilter] = useState("all");

  // Add Employee Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [addCode, setAddCode] = useState("");
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addLocation, setAddLocation] = useState("");
  const [addUnitId, setAddUnitId] = useState("p1");
  const [addRole, setAddRole] = useState<"employee" | "hod" | "hr" | "admin">("employee");
  const [addIsPanelJudge, setAddIsPanelJudge] = useState(false);
  const [addIsAdmin, setAddIsAdmin] = useState(false);
  const [addGender, setAddGender] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addMsg, setAddMsg] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Edit Employee Modal States
  const [editingEmp, setEditingEmp] = useState<EmployeeRecord | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editUnitId, setEditUnitId] = useState("");
  const [editRole, setEditRole] = useState<"employee" | "hod" | "hr" | "admin">("employee");
  const [editIsPanelJudge, setEditIsPanelJudge] = useState(false);
  const [editIsHOD, setEditIsHOD] = useState(false);
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [editGender, setEditGender] = useState("");
  const [editNewPassword, setEditNewPassword] = useState("");
  const [editResetDefault, setEditResetDefault] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editStatusMsg, setEditStatusMsg] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Admin Confirmation & Password Auth Modal States for Edit
  const [showConfirmPrompt, setShowConfirmPrompt] = useState(false);
  const [showAdminAuthPrompt, setShowAdminAuthPrompt] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);

  // Delete Employee States
  const [deletingEmpTarget, setDeletingEmpTarget] = useState<EmployeeRecord | null>(null);
  const [showDeleteConfirmPrompt, setShowDeleteConfirmPrompt] = useState(false);
  const [showDeleteAdminAuthPrompt, setShowDeleteAdminAuthPrompt] = useState(false);
  const [deleteAdminPasswordInput, setDeleteAdminPasswordInput] = useState("");
  const [deleteAdminAuthError, setDeleteAdminAuthError] = useState<string | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // Banner status message
  const [statusBanner, setStatusBanner] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const fetchEmployees = async () => {
    setEmpLoading(true);
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      if (res.ok) {
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

  const allUnits = useMemo(() => getDynamicUnits(allEmployees), [allEmployees]);

  const filteredEmployees = useMemo(() => {
    return allEmployees.filter((emp) => {
      const matchesSearch =
        !empSearch.trim() ||
        emp.name.toLowerCase().includes(empSearch.toLowerCase()) ||
        emp.code.toLowerCase().includes(empSearch.toLowerCase());
      const matchesRole =
        empRoleFilter === "all"
          ? true
          : empRoleFilter === "admin"
          ? emp.isAdmin || emp.role === "admin"
          : emp.role === empRoleFilter;
      const matchesUnit = empUnitFilter === "all" || emp.unitId === empUnitFilter;
      return matchesSearch && matchesRole && matchesUnit;
    });
  }, [allEmployees, empSearch, empRoleFilter, empUnitFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = allEmployees.length;
    const hods = allEmployees.filter((e) => e.isHOD || e.role === "hod").length;
    const judges = allEmployees.filter((e) => e.isPanelJudge).length;
    const admins = allEmployees.filter((e) => e.isAdmin || e.role === "admin").length;
    return { total, hods, judges, admins };
  }, [allEmployees]);

  // Edit Handlers
  const openEditModal = (emp: EmployeeRecord) => {
    setEditingEmp(emp);
    setEditCode(emp.code);
    setEditName(emp.name);
    setEditEmail(emp.email || "");
    setEditLocation(emp.location || "");
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
          newCode:
            editCode.trim().toUpperCase() !== editingEmp.code.toUpperCase()
              ? editCode.trim().toUpperCase()
              : undefined,
          name: editName,
          email: editEmail.trim(),
          location: editLocation.trim(),
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
        setStatusBanner({ type: "success", msg: `Employee ${editingEmp.code} profile updated successfully!` });
        fetchEmployees();
        setTimeout(() => {
          setEditingEmp(null);
          setEditStatusMsg(null);
        }, 1200);
        setTimeout(() => setStatusBanner(null), 5000);
      }
    } catch (e) {
      setEditSaving(false);
      setAdminAuthError("Network error while authorizing changes.");
    }
  };

  // Add Handlers
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
          email: addEmail.trim(),
          location: addLocation.trim(),
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
        setAddMsg({ type: "success", msg: `Employee ${addCode} created successfully!` });
        setStatusBanner({ type: "success", msg: `New employee ${addCode} created successfully!` });
        fetchEmployees();
        setAddCode("");
        setAddName("");
        setAddEmail("");
        setAddLocation("");
        setTimeout(() => {
          setShowAddModal(false);
          setAddMsg(null);
        }, 1200);
        setTimeout(() => setStatusBanner(null), 5000);
      }
    } catch (e) {
      setAddSaving(false);
      setAddMsg({ type: "error", msg: "Network error while adding employee." });
    }
  };

  // Delete Handlers
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
        `/api/employees?code=${encodeURIComponent(deletingEmpTarget.code)}&adminPassword=${encodeURIComponent(
          deleteAdminPasswordInput.trim()
        )}`,
        { method: "DELETE" }
      );

      const data = await res.json();
      setDeleteSaving(false);

      if (!res.ok) {
        setDeleteAdminAuthError(data.error || "Incorrect Admin Password or authorization error.");
      } else {
        setShowDeleteAdminAuthPrompt(false);
        const codeDeleted = deletingEmpTarget.code;
        setDeletingEmpTarget(null);
        setStatusBanner({ type: "success", msg: `Employee ${codeDeleted} deleted successfully.` });
        fetchEmployees();
        setTimeout(() => setStatusBanner(null), 5000);
      }
    } catch (e) {
      setDeleteSaving(false);
      setDeleteAdminAuthError("Network error while deleting employee.");
    }
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
              <ShieldCheck size={13} className="text-sky-300" />
              <span>Admin Access Only</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Employee Directory &amp; User Administration
            </h1>
            <p className="text-sm text-sky-100/80 leading-relaxed">
              Create, update, and manage employee master records, assign department affiliations, designate HODs and Panel Judges, and manage system login credentials.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={fetchEmployees}
              disabled={empLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
              title="Refresh employee directory"
            >
              <RefreshCw size={14} className={empLoading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => {
                setShowAddModal(true);
                setAddCode("");
                setAddName("");
                setAddUnitId("p1");
                setAddRole("employee");
                setAddIsPanelJudge(false);
                setAddIsAdmin(false);
                setAddGender("");
                setAddMsg(null);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 text-amber-950 px-4 py-2.5 text-xs font-bold uppercase tracking-wider shadow-md hover:bg-amber-300 active:scale-95 transition-all cursor-pointer"
            >
              <UserPlus size={15} /> Add New Employee
            </button>
          </div>
        </div>
      </div>

      {/* Status Banner */}
      {statusBanner && (
        <div
          className={`flex items-center gap-2 rounded-xl p-3.5 text-xs font-medium animate-in fade-in shadow-xs ${
            statusBanner.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {statusBanner.type === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle size={16} className="text-red-600 shrink-0" />
          )}
          <span>{statusBanner.msg}</span>
        </div>
      )}

      {/* 2. Metric Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-1">
          <div className="flex items-center justify-between text-indigo-900/70">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Directory</span>
            <Users size={18} className="text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-blue-950">{stats.total}</p>
          <span className="text-[11px] text-indigo-700 font-medium">Registered Employees</span>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-1">
          <div className="flex items-center justify-between text-emerald-900/70">
            <span className="text-[11px] font-bold uppercase tracking-wider">Department Heads</span>
            <ShieldCheck size={18} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-blue-950">{stats.hods}</p>
          <span className="text-[11px] text-emerald-700 font-medium">Designated HODs</span>
        </div>

        <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 space-y-1">
          <div className="flex items-center justify-between text-sky-900/70">
            <span className="text-[11px] font-bold uppercase tracking-wider">Panel Judges</span>
            <Scale size={18} className="text-sky-600" />
          </div>
          <p className="text-2xl font-black text-blue-950">{stats.judges}</p>
          <span className="text-[11px] text-sky-700 font-medium">Appointed Evaluators</span>
        </div>

        <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 space-y-1">
          <div className="flex items-center justify-between text-purple-900/70">
            <span className="text-[11px] font-bold uppercase tracking-wider">Administrators</span>
            <UserCheck size={18} className="text-purple-600" />
          </div>
          <p className="text-2xl font-black text-blue-950">{stats.admins}</p>
          <span className="text-[11px] text-purple-700 font-medium">System Superusers</span>
        </div>
      </div>

      {/* 3. Employee Directory Table & Filter Bar */}
      <Card className="p-6 border border-blue-900/10 shadow-sm bg-white space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-blue-900/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-blue-950 flex items-center gap-2">
              <Users className="text-blue-800" size={18} /> Employee Master Repository
            </h3>
            <p className="text-xs text-blue-900/60 mt-0.5">
              Browse, search, edit details, update department/unit, and manage passwords for all registered personnel.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 font-mono">
            Showing {filteredEmployees.length} of {allEmployees.length} records
          </span>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-900/40" />
            <input
              type="text"
              placeholder="Search by Employee Code or Name..."
              value={empSearch}
              onChange={(e) => setEmpSearch(e.target.value)}
              className="w-full rounded-xl border border-blue-900/15 bg-white pl-9 pr-3 py-2 text-xs text-blue-950 outline-none focus:border-blue-700 shadow-xs"
            />
          </div>

          <div className="w-40">
            <select
              value={empRoleFilter}
              onChange={(e) => setEmpRoleFilter(e.target.value)}
              className="w-full rounded-xl border border-blue-900/15 bg-white px-3 py-2 text-xs font-medium text-blue-950 outline-none shadow-xs cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="employee">Employee</option>
              <option value="hod">HOD</option>
              <option value="hr">HR Admin</option>
              <option value="admin">System Admin</option>
            </select>
          </div>

          <div className="w-52">
            <select
              value={empUnitFilter}
              onChange={(e) => setEmpUnitFilter(e.target.value)}
              className="w-full rounded-xl border border-blue-900/15 bg-white px-3 py-2 text-xs font-medium text-blue-950 outline-none shadow-xs cursor-pointer"
            >
              <option value="all">All Departments/Units</option>
              {allUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Employee Table */}
        <div className="overflow-x-auto rounded-xl border border-blue-900/10">
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
                    <RefreshCw size={18} className="animate-spin inline mr-2 text-blue-700" />
                    Loading employee directory...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-blue-900/50">
                    No employees matching search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.code} className="hover:bg-blue-50/40 transition">
                    <td className="px-4 py-3 font-mono font-bold text-blue-950">{emp.code}</td>
                    <td className="px-4 py-3 font-medium text-blue-950">
                      <div className="font-bold">{emp.name}</div>
                      {emp.email && <div className="text-[10px] text-slate-400 font-normal">{emp.email}</div>}
                    </td>
                    <td className="px-4 py-3 text-blue-900/80">{unitById(emp.unitId)?.name || emp.unitId}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                          emp.isAdmin || emp.role === "admin"
                            ? "bg-purple-100 text-purple-900 border border-purple-300"
                            : emp.role === "hr"
                            ? "bg-indigo-100 text-indigo-900 border border-indigo-300"
                            : emp.isHOD || emp.role === "hod"
                            ? "bg-blue-100 text-blue-900 border border-blue-300"
                            : "bg-slate-100 text-slate-700 border border-slate-300"
                        }`}
                      >
                        {emp.isAdmin ? "ADMIN" : emp.role}
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
                        className="inline-flex items-center gap-1 rounded-xl border border-blue-900/15 bg-white px-3 py-1.5 text-xs font-semibold text-blue-900 hover:bg-blue-50 transition active:scale-95 shadow-2xs cursor-pointer"
                      >
                        <Edit3 size={13} /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteEmpClick(emp)}
                        className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 transition active:scale-95 shadow-2xs cursor-pointer"
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

      {/* ─── Modals ───────────────────────────────────────────────────────────── */}

      {/* 1. Add Employee Modal */}
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
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {addMsg && (
              <div
                className={`flex items-center gap-2 rounded-xl p-3 text-xs font-medium ${
                  addMsg.type === "success"
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
                  <Label>Work Email</Label>
                  <input
                    type="email"
                    placeholder="e.g. name@mahle.com"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label>Location / Plant</Label>
                  <input
                    type="text"
                    placeholder="e.g. Khandsa / Gurgaon"
                    value={addLocation}
                    onChange={(e) => setAddLocation(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Department / Unit</Label>
                  <select value={addUnitId} onChange={(e) => setAddUnitId(e.target.value)} className={inputCls}>
                    {allUnits.map((u) => (
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

              <div>
                <Label>Gender</Label>
                <select
                  value={addGender}
                  onChange={(e) => setAddGender(e.target.value)}
                  className={inputCls}
                >
                  <option value="">-- Not Specified (NULL) --</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
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
                  <label htmlFor="addIsAdmin" className="text-xs font-semibold text-blue-950 cursor-pointer">
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
                  <label htmlFor="addIsPanelJudge" className="text-xs font-semibold text-blue-950 cursor-pointer">
                    Appoint as Panel Judge (`isPanelJudge: true`)
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSaving}
                  className="rounded-xl bg-[#0A2540] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-900 cursor-pointer"
                >
                  {addSaving ? "Saving..." : "Create Employee Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Employee Modal */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-blue-900/10 bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
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
              <button onClick={() => setEditingEmp(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {editStatusMsg && (
              <div
                className={`flex items-center gap-2 rounded-xl p-3 text-xs font-medium ${
                  editStatusMsg.type === "success"
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
                  <Label>Employee Code / ID</Label>
                  <input
                    type="text"
                    required
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className={inputCls}
                  />
                </div>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Work Email</Label>
                  <input
                    type="email"
                    placeholder="e.g. name@mahle.com"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label>Location / Plant</Label>
                  <input
                    type="text"
                    placeholder="e.g. Gurgaon"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Department / Unit</Label>
                  <select value={editUnitId} onChange={(e) => setEditUnitId(e.target.value)} className={inputCls}>
                    {allUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>System Role</Label>
                  <select
                    value={editIsAdmin ? "admin" : editRole}
                    onChange={(e) => {
                      const val = e.target.value as "employee" | "hod" | "hr" | "admin";
                      setEditRole(val);
                      if (val === "admin") {
                        setEditIsAdmin(true);
                      } else {
                        setEditIsAdmin(false);
                      }
                      if (val === "hod") {
                        setEditIsHOD(true);
                      }
                    }}
                    className={inputCls}
                  >
                    <option value="employee">Employee</option>
                    <option value="hod">HOD (Department Head)</option>
                    <option value="hr">HR Admin</option>
                    <option value="admin">System Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <Label>Gender</Label>
                <select
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
                  className={inputCls}
                >
                  <option value="">-- Not Specified (NULL) --</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <Label>Change Password</Label>
                <input
                  type="password"
                  placeholder={editResetDefault ? "Will reset to default password (Welcome@123)" : "New password (optional)"}
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
                    Reset password to default (<strong>Welcome@123</strong>)
                  </label>
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
                  <label htmlFor="editIsHOD" className="text-xs font-semibold text-blue-950 cursor-pointer">
                    Mark as HOD (Head of Department)
                    <span className="ml-1 font-normal text-blue-900/50">— grants HOD endorsement access</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editIsAdmin"
                    checked={editIsAdmin}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setEditIsAdmin(checked);
                      if (checked) {
                        setEditRole("admin");
                      } else if (editRole === "admin") {
                        setEditRole("employee");
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-purple-700 focus:ring-purple-600"
                  />
                  <label htmlFor="editIsAdmin" className="text-xs font-semibold text-blue-950 cursor-pointer">
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
                  <label htmlFor="editIsPanelJudge" className="text-xs font-semibold text-blue-950 cursor-pointer">
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
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#0A2540] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-900 cursor-pointer"
                >
                  Save Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Edit Confirm Modal */}
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
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedToPasswordAuth}
                className="rounded-xl bg-[#0A2540] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-900 cursor-pointer"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Admin Password Auth Prompt for Edit */}
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
              <button onClick={() => setShowAdminAuthPrompt(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
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
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="rounded-xl bg-[#0A2540] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-900 cursor-pointer"
                >
                  {editSaving ? "Saving..." : "Authorize & Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Delete Confirm Modal */}
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
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedToDeletePasswordAuth}
                className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-red-700 cursor-pointer"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Delete Admin Password Auth Prompt */}
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
              <button onClick={() => setShowDeleteAdminAuthPrompt(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
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
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteSaving}
                  className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-red-700 cursor-pointer"
                >
                  {deleteSaving ? "Deleting..." : "Confirm & Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesView;
