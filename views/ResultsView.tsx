"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Trophy,
  Award,
  Lock,
  Sparkles,
  CheckCircle2,
  Calendar,
  RotateCcw,
  Mail,
  Send,
  Copy,
  Check,
  Users,
  User,
  X,
  AlertCircle,
  FileText,
  Megaphone,
  HeartHandshake,
} from "lucide-react";
import { catById, unitById } from "../lib/constants";
import { results } from "../lib/helpers";
import { Cycle, Nomination, EmployeeRecord } from "../lib/types";
import Card from "../components/Card";
import Label from "../components/Label";
import Pill from "../components/Pill";

export interface ResultsViewProps {
  cycle: Cycle;
  month?: string;
  setMonth?: (m: string) => void;
  monthOptions?: { value: string; label: string }[];
  currentUser?: any;
  onNavigateToHr?: () => void;
}

export type RecipientAudience = "winners" | "non_winners" | "all_company";

export interface DeclaredWinnerInfo {
  index: number;
  categoryName: string;
  categoryId: string;
  slotLabel: string | null;
  nom: Nomination;
  avg: number | null;
  email: string;
  unitName: string;
  designation: string;
}

export interface NonWinnerParticipantInfo {
  code: string;
  name: string;
  email: string;
  unit: string;
  nominations: Nomination[];
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  cycle,
  month,
  setMonth,
  monthOptions,
  currentUser,
  onNavigateToHr,
}) => {
  const isDeclared = cycle.stage === "announced";
  const res = useMemo(() => results(cycle), [cycle]);

  const monthLabel = new Date(`${cycle.month}-01T00:00:00`).toLocaleDateString(
    "en-IN",
    { month: "long", year: "numeric" }
  );

  // Next cycle month calculation (e.g. 2026-09 -> October 2026)
  const nextMonthLabel = useMemo(() => {
    try {
      const parts = cycle.month.split("-");
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = new Date(y, m, 1);
      return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    } catch {
      return "next month";
    }
  }, [cycle.month]);

  // Employee data from SSMS to resolve Work_Email
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [empLoading, setEmpLoading] = useState(false);

  useEffect(() => {
    async function fetchEmps() {
      setEmpLoading(true);
      try {
        const res = await fetch("/api/employees");
        if (res.ok) {
          const data = await res.json();
          setEmployees(data.employees || []);
        }
      } catch (e) {
        /* ignore fetch error */
      } finally {
        setEmpLoading(false);
      }
    }
    fetchEmps();
  }, []);

  const employeeMap = useMemo(() => {
    const map = new Map<string, EmployeeRecord>();
    employees.forEach((e) => {
      if (e.code) {
        map.set(e.code.trim().toUpperCase(), e);
      }
    });
    return map;
  }, [employees]);

  // 1. Declared winners resolution with verified work email
  const declaredWinners: DeclaredWinnerInfo[] = useMemo(() => {
    const list: DeclaredWinnerInfo[] = [];
    res.forEach((r, idx) => {
      const winner = r.ranked[0];
      if (winner && winner.nom) {
        const emp = employeeMap.get((winner.nom.code || "").trim().toUpperCase());
        const catName = r.slotLabel
          ? `${r.category.name} (${r.slotLabel})`
          : r.category.name;
        list.push({
          index: idx,
          categoryName: catName,
          categoryId: r.category.id,
          slotLabel: r.slotLabel,
          nom: winner.nom,
          avg: winner.avg,
          email: (emp?.email || "").trim(),
          unitName: unitById(winner.nom.unit)?.name || winner.nom.unit,
          designation: emp?.designation || "Staff Member",
        });
      }
    });
    return list;
  }, [res, employeeMap]);

  // 2. Non-winning participants (applied in this cycle, but did not win)
  const nonWinningParticipants: NonWinnerParticipantInfo[] = useMemo(() => {
    const winnerCodes = new Set(
      declaredWinners.map((w) => (w.nom.code || "").trim().toUpperCase())
    );
    const participantMap = new Map<string, NonWinnerParticipantInfo>();

    (cycle?.nominations || []).forEach((nom) => {
      const codeUpper = (nom.code || "").trim().toUpperCase();
      if (!codeUpper || winnerCodes.has(codeUpper)) return;

      const emp = employeeMap.get(codeUpper);
      if (!participantMap.has(codeUpper)) {
        participantMap.set(codeUpper, {
          code: codeUpper,
          name: nom.name,
          email: emp?.email?.trim() || "",
          unit: unitById(nom.unit)?.name || nom.unit,
          nominations: [],
        });
      }
      participantMap.get(codeUpper)!.nominations.push(nom);
    });

    return Array.from(participantMap.values());
  }, [cycle?.nominations, declaredWinners, employeeMap]);

  // 3. All company employees with work emails (Company-wide announcement)
  const allCompanyEmployees = useMemo(() => {
    return employees
      .filter((e) => Boolean(e.email?.trim()))
      .map((e) => ({
        code: e.code,
        name: e.name,
        email: e.email!.trim(),
        unit: unitById(e.unitId)?.name || e.unitId,
      }));
  }, [employees]);

  // Permissions: Admin and HR can send official emails
  const canSendWinnerEmail =
    !currentUser ||
    Boolean(currentUser?.isAdmin) ||
    currentUser?.role === "admin" ||
    currentUser?.role === "hr";

  // Outlook Notification Modal States
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [recipientAudience, setRecipientAudience] = useState<RecipientAudience>("winners");
  const [selectedWinnerIndex, setSelectedWinnerIndex] = useState<number | "all">("all");
  const [selectedParticipantCode, setSelectedParticipantCode] = useState<string | "all">("all");

  const [promptTemplateKey, setPromptTemplateKey] = useState<string>("primary");
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [copiedAction, setCopiedAction] = useState<"outlook" | "emails" | "body" | null>(null);

  // Target winners based on current selection in modal
  const targetWinners: DeclaredWinnerInfo[] = useMemo(() => {
    if (selectedWinnerIndex === "all") {
      return declaredWinners;
    }
    const found = declaredWinners.find((w) => w.index === selectedWinnerIndex);
    return found ? [found] : declaredWinners;
  }, [selectedWinnerIndex, declaredWinners]);

  // Target non-winning participants based on current selection in modal
  const targetParticipants: NonWinnerParticipantInfo[] = useMemo(() => {
    if (selectedParticipantCode === "all") {
      return nonWinningParticipants;
    }
    const found = nonWinningParticipants.find((p) => p.code === selectedParticipantCode);
    return found ? [found] : nonWinningParticipants;
  }, [selectedParticipantCode, nonWinningParticipants]);

  // Target emails depending on the active audience
  const targetEmails: string[] = useMemo(() => {
    if (recipientAudience === "winners") {
      return targetWinners.map((w) => w.email).filter(Boolean);
    }
    if (recipientAudience === "non_winners") {
      return targetParticipants.map((p) => p.email).filter(Boolean);
    }
    // all_company
    return allCompanyEmployees.map((e) => e.email).filter(Boolean);
  }, [
    recipientAudience,
    targetWinners,
    targetParticipants,
    allCompanyEmployees,
  ]);

  // Template Prompt Generator across all three audiences
  const generateTemplateContent = (
    audience: RecipientAudience,
    templateKey: string,
    winnerSubTarget: "all" | DeclaredWinnerInfo,
    participantSubTarget: "all" | NonWinnerParticipantInfo
  ) => {
    const portalUrl =
      typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

    const winnersSummaryList = declaredWinners
      .map(
        (w, i) =>
          `${i + 1}. ${w.nom.name} (${w.nom.code}) — ${w.categoryName} [${w.unitName}]`
      )
      .join("\n");

    // =========================================================================
    // AUDIENCE 1: WINNERS ONLY
    // =========================================================================
    if (audience === "winners") {
      if (winnerSubTarget === "all") {
        if (templateKey === "secondary") {
          return {
            subject: `🏆 Executive Leadership Commendation: Monthly Award Winners — ${monthLabel} (MAHLE Rewards)`,
            body: `Dear MAHLE ANAND Champions,

On behalf of the Executive Leadership and Management at MAHLE ANAND Filter Systems, we extend our heartfelt congratulations to all the official winners of the Corporate Rewards & Recognition cycle for ${monthLabel}!

Your outstanding dedication, problem-solving mindset, and continuous commitment to excellence represent the finest values of our organization.

Official Monthly Winners:
${winnersSummaryList}

Each winner's cumulative points have been credited to the Annual LSIP Rewards Ledger. Official trophies and certificates will be presented at our upcoming Townhall meeting.

Thank you for your immense contributions and for setting a stellar benchmark for the entire team.

With highest appreciation and regards,
Management & HR Leadership
MAHLE ANAND Filter Systems`,
          };
        }
        // Primary template for all winners
        return {
          subject: `🎉 Announcing the Official Monthly Award Winners — MAHLE Rewards (${monthLabel})`,
          body: `Dear Colleagues and Distinguished Winners,

We are extremely proud and delighted to formally announce the official award winners for the ${monthLabel} Corporate Rewards & Recognition evaluation cycle at MAHLE ANAND Filter Systems!

Following thorough review by our HODs and scoring by our independent Evaluation Panel, the following team members have achieved top honors:

${winnersSummaryList}

View full results, citations, and scores on the company rewards portal:
👉 ${portalUrl}

Your passion, resilience, and exemplary work continue to drive MAHLE ANAND forward. Please join us in extending our warmest congratulations to all the winners on their well-deserved success!

Heartiest congratulations!

Warm regards,
MAHLE ANAND Filter Systems
Rewards & Recognition Committee
Human Resources Department`,
        };
      }

      // Individual winner
      const winner = winnerSubTarget;
      if (templateKey === "secondary") {
        return {
          subject: `🌟 Executive Recognition: Winner of ${winner.categoryName} — MAHLE ANAND (${monthLabel})`,
          body: `Dear ${winner.nom.name},

On behalf of the Executive Leadership and Management at MAHLE ANAND Filter Systems, congratulations on being selected as the Winner of the "${winner.categoryName}" Award for ${monthLabel}!

This recognition honors your exceptional work ethic, quality focus, and dedication to living MAHLE ANAND's core values.

Recognition Summary:
• Award Category: ${winner.categoryName}
• Recipient: ${winner.nom.name} (${winner.nom.code})
• Department: ${winner.unitName}
• Cycle: ${monthLabel}
${winner.avg !== null ? `• Panel Average Score: ${winner.avg.toFixed(2)} / 10\n` : ""}
Citation Highlight:
"${winner.nom.citation}"

The official award certificate and trophy presentation will be conducted during our upcoming monthly townhall. Additionally, your award points have been credited to the Annual LSIP Rewards Ledger.

Thank you for your valuable contributions and for inspiring your colleagues across the organization. Keep up the phenomenal work!

With best wishes and appreciation,
Leadership Team & HR
MAHLE ANAND Filter Systems`,
        };
      }

      // Primary template for individual winner
      return {
        subject: `🏆 Congratulations! You have won the ${winner.categoryName} Award — MAHLE Rewards (${monthLabel})`,
        body: `Dear ${winner.nom.name},

We are thrilled to formally inform you that you have won the prestigious "${winner.categoryName}" Award for the ${monthLabel} Corporate Rewards & Recognition cycle at MAHLE ANAND Filter Systems!

Your exceptional performance, proactive initiatives, and high-impact contributions stood out to the evaluation panel and earned you the top score in this category.

Award Summary:
• Award Category: ${winner.categoryName}
• Winner: ${winner.nom.name} (${winner.nom.code})
• Department: ${winner.unitName}
• Recognition Month: ${monthLabel}
${winner.avg !== null ? `• Panel Evaluation Score: ${winner.avg.toFixed(2)} / 10\n` : ""}
Official Nomination Citation:
"${winner.nom.citation}"

Your achievement will be permanently commemorated on the MAHLE ANAND leaderboard and added to your Annual LSIP ledger.

Please accept our heartiest congratulations on this well-deserved recognition!

Warm regards,
MAHLE ANAND Filter Systems
Rewards & Recognition Committee
Human Resources Department`,
      };
    }

    // =========================================================================
    // AUDIENCE 2: NON-WINNING PARTICIPANTS ("Try Again Next Month!")
    // =========================================================================
    if (audience === "non_winners") {
      const recipientName =
        participantSubTarget === "all" ? "Colleague" : participantSubTarget.name;

      if (templateKey === "secondary") {
        return {
          subject: `Recognition Update: ${monthLabel} Evaluation & Future Opportunities — MAHLE Rewards`,
          body: `Dear ${recipientName},

On behalf of the Leadership and Evaluation Panel at MAHLE ANAND Filter Systems, we want to personally thank you for participating in the ${monthLabel} recognition cycle.

Competition was particularly strong this month with numerous stellar contributions across all departments. Although you did not secure the top slot in this cycle, your initiative in putting yourself forward demonstrates the proactive attitude and ownership we value in our team members.

Key Takeaways & Next Steps:
• Continuous Impact: Continue delivering high standards of quality, safety, and teamwork.
• Next Cycle Opportunity: The ${nextMonthLabel} cycle will open shortly.
• Refine & Reapply: You can submit new achievements or build upon your previous citation.

Don't let this hold you back — keep up the fantastic momentum, and we strongly encourage you to submit your nomination again next month!

Best wishes and continued success,
Management & HR Leadership
MAHLE ANAND Filter Systems`,
        };
      }

      // Primary "Try Again Next Month" Template
      return {
        subject: `Thank You for Your Nomination (${monthLabel}) — Keep Striving & Try Again in ${nextMonthLabel}!`,
        body: `Dear ${recipientName},

Thank you for submitting your self-nomination for the ${monthLabel} Corporate Rewards & Recognition cycle at MAHLE ANAND Filter Systems.

The evaluation committee and HODs reviewed many outstanding initiatives this month. While your nomination was not selected as a final category winner for this cycle, your hard work, innovation, and positive impact on your department are deeply appreciated.

Remember: Recognition is an ongoing journey! Every month brings a brand-new opportunity to highlight your accomplishments.

👉 Please try again next month! 
The nomination window for ${nextMonthLabel} will open shortly on the rewards portal:
${portalUrl}

Keep documenting your achievements, safety improvements, customer service milestones, cost savings, and collaborative efforts. Your dedication is what drives MAHLE ANAND forward!

We look forward to seeing your submission in the upcoming cycle.

Warm regards,
MAHLE ANAND Filter Systems
Rewards & Recognition Committee
Human Resources Department`,
      };
    }

    // =========================================================================
    // AUDIENCE 3: COMPANY-WIDE / ALL EMPLOYEES (General Announcement)
    // =========================================================================
    if (templateKey === "secondary") {
      return {
        subject: `🏆 Celebrating Our ${monthLabel} Award Winners & Townhall Presentation Schedule`,
        body: `Dear Colleagues,

We are pleased to publish the official results of the ${monthLabel} Rewards & Recognition program at MAHLE ANAND Filter Systems.

Congratulations to our distinguished monthly winners:
${winnersSummaryList}

Official trophies, certificates, and LSIP points recognition will be presented during our upcoming monthly Townhall meeting.

To all participants who took the initiative to submit nominations:
We applaud your passion and commitment. Every contribution counts toward our shared success. Next month's nomination cycle will open shortly — take the time to document your achievements and apply again!

Explore full citations and scores on the company rewards dashboard:
👉 ${portalUrl}

Best regards,
Executive Leadership & HR Team
MAHLE ANAND Filter Systems`,
      };
    }

    // Primary Company-Wide Announcement
    return {
      subject: `📢 Official Announcement: Monthly Award Winners (${monthLabel}) & Next Cycle Invitation — MAHLE Rewards`,
      body: `Dear MAHLE ANAND Team,

We are delighted to officially announce the winners of the Corporate Rewards & Recognition evaluation cycle for ${monthLabel}!

Please join us in extending our warmest congratulations to our official monthly champions:

${winnersSummaryList}

To all employees who submitted self-nominations this cycle:
Thank you for your enthusiastic participation and for demonstrating excellence on the job every single day. A great organization thrives on the dedication of all its people. If your nomination was not selected this month, please do not be discouraged — continue your great work and be sure to try again in ${nextMonthLabel}!

📅 Next Cycle Details:
Self-nominations for the ${nextMonthLabel} cycle will open soon on the rewards portal:
👉 ${portalUrl}

Let us all celebrate our winners and inspire each other towards greater heights!

Warm regards,
MAHLE ANAND Filter Systems
Human Resources & Recognition Committee`,
    };
  };

  // Open Email Modal
  const handleOpenEmailModal = (
    audience: RecipientAudience = "winners",
    winnerTarget: number | "all" = "all",
    participantTarget: string | "all" = "all"
  ) => {
    setRecipientAudience(audience);
    setSelectedWinnerIndex(winnerTarget);
    setSelectedParticipantCode(participantTarget);

    const initialKey = "primary";
    setPromptTemplateKey(initialKey);

    const winnerObj =
      winnerTarget === "all"
        ? "all"
        : declaredWinners.find((w) => w.index === winnerTarget) || "all";
    const participantObj =
      participantTarget === "all"
        ? "all"
        : nonWinningParticipants.find((p) => p.code === participantTarget) || "all";

    const generated = generateTemplateContent(
      audience,
      initialKey,
      winnerObj,
      participantObj
    );
    setCustomSubject(generated.subject);
    setCustomBody(generated.body);
    setCopiedAction(null);
    setShowEmailModal(true);
  };

  // Switch Audience Tab
  const handleSwitchAudience = (newAudience: RecipientAudience) => {
    setRecipientAudience(newAudience);
    const initialKey = "primary";
    setPromptTemplateKey(initialKey);

    const winnerObj =
      selectedWinnerIndex === "all"
        ? "all"
        : declaredWinners.find((w) => w.index === selectedWinnerIndex) || "all";
    const participantObj =
      selectedParticipantCode === "all"
        ? "all"
        : nonWinningParticipants.find((p) => p.code === selectedParticipantCode) || "all";

    const generated = generateTemplateContent(
      newAudience,
      initialKey,
      winnerObj,
      participantObj
    );
    setCustomSubject(generated.subject);
    setCustomBody(generated.body);
  };

  // Switch Prompt Template
  const handleSelectTemplateKey = (key: string) => {
    setPromptTemplateKey(key);
    if (key !== "custom") {
      const winnerObj =
        selectedWinnerIndex === "all"
          ? "all"
          : declaredWinners.find((w) => w.index === selectedWinnerIndex) || "all";
      const participantObj =
        selectedParticipantCode === "all"
          ? "all"
          : nonWinningParticipants.find((p) => p.code === selectedParticipantCode) || "all";

      const generated = generateTemplateContent(
        recipientAudience,
        key,
        winnerObj,
        participantObj
      );
      setCustomSubject(generated.subject);
      setCustomBody(generated.body);
    }
  };

  // Change Target Winner inside modal dropdown
  const handleChangeSelectedWinner = (newTarget: number | "all") => {
    setSelectedWinnerIndex(newTarget);
    if (promptTemplateKey !== "custom") {
      const winnerObj =
        newTarget === "all"
          ? "all"
          : declaredWinners.find((w) => w.index === newTarget) || "all";
      const participantObj =
        selectedParticipantCode === "all"
          ? "all"
          : nonWinningParticipants.find((p) => p.code === selectedParticipantCode) || "all";

      const generated = generateTemplateContent(
        recipientAudience,
        promptTemplateKey,
        winnerObj,
        participantObj
      );
      setCustomSubject(generated.subject);
      setCustomBody(generated.body);
    }
  };

  // Change Target Participant inside modal dropdown
  const handleChangeSelectedParticipant = (newTarget: string | "all") => {
    setSelectedParticipantCode(newTarget);
    if (promptTemplateKey !== "custom") {
      const winnerObj =
        selectedWinnerIndex === "all"
          ? "all"
          : declaredWinners.find((w) => w.index === selectedWinnerIndex) || "all";
      const participantObj =
        newTarget === "all"
          ? "all"
          : nonWinningParticipants.find((p) => p.code === newTarget) || "all";

      const generated = generateTemplateContent(
        recipientAudience,
        promptTemplateKey,
        winnerObj,
        participantObj
      );
      setCustomSubject(generated.subject);
      setCustomBody(generated.body);
    }
  };

  // One-Click Action: Launch Microsoft Outlook / Mail Client
  const handleOpenOutlook = () => {
    if (targetEmails.length === 0) {
      alert(
        "No work email address was found in the database for the selected recipient(s). You can still copy the subject and body using the 'Copy Email Body' button below."
      );
      return;
    }

    if (targetEmails.length > 30) {
      navigator.clipboard.writeText(targetEmails.join("; "));
      setCopiedAction("outlook");
      setTimeout(() => setCopiedAction(null), 7000);
      window.location.href = `mailto:?subject=${encodeURIComponent(
        customSubject
      )}&body=${encodeURIComponent(customBody)}`;
    } else if (targetEmails.length === 1) {
      window.location.href = `mailto:${encodeURIComponent(
        targetEmails[0]
      )}?subject=${encodeURIComponent(customSubject)}&body=${encodeURIComponent(
        customBody
      )}`;
    } else {
      window.location.href = `mailto:?bcc=${encodeURIComponent(
        targetEmails.join("; ")
      )}&subject=${encodeURIComponent(customSubject)}&body=${encodeURIComponent(
        customBody
      )}`;
    }
  };

  // Copy Emails to Clipboard
  const handleCopyEmails = () => {
    if (targetEmails.length === 0) return;
    navigator.clipboard.writeText(targetEmails.join("; "));
    setCopiedAction("emails");
    setTimeout(() => setCopiedAction(null), 4000);
  };

  // Copy Email Body to Clipboard
  const handleCopyBody = () => {
    const fullText = `Subject: ${customSubject}\n\n${customBody}`;
    navigator.clipboard.writeText(fullText);
    setCopiedAction("body");
    setTimeout(() => setCopiedAction(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-900/10 text-blue-900">
              <Trophy size={24} className="text-amber-500" />
            </div>
            <div>
              <Label>Rewards &amp; Recognition Results</Label>
              <h2 className="text-lg font-bold tracking-tight text-blue-950">
                Official Monthly Winners — {monthLabel}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {monthOptions && setMonth && (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-xs">
                <Calendar size={14} className="text-slate-400 shrink-0" />
                <select
                  value={month || cycle.month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-blue-950 outline-none cursor-pointer"
                >
                  {monthOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Email Action Buttons for Admin/HR */}
            {isDeclared && canSendWinnerEmail && (
              <div className="flex items-center gap-2">
                {/* 1. Email Winners */}
                {declaredWinners.length > 0 && (
                  <button
                    onClick={() => handleOpenEmailModal("winners", "all")}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0A2540] hover:bg-blue-900 text-white px-3.5 py-2 text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer"
                    title="Send official award congratulation emails to winners via Outlook"
                  >
                    <Trophy size={14} className="text-amber-400" />
                    <span>Email Winners</span>
                    <span className="ml-0.5 rounded-full bg-amber-400/20 px-1.5 py-0.2 text-[10px] font-extrabold text-amber-300">
                      {declaredWinners.length}
                    </span>
                  </button>
                )}

                {/* 2. Email Participants & All Employees */}
                <button
                  onClick={() =>
                    handleOpenEmailModal(
                      nonWinningParticipants.length > 0 ? "non_winners" : "all_company"
                    )
                  }
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-950 px-3.5 py-2 text-xs font-bold uppercase tracking-wider shadow-2xs active:scale-95 transition-all cursor-pointer"
                  title="Send encouragement emails to non-winning participants or broadcast results company-wide"
                >
                  <Mail size={14} className="text-blue-700" />
                  <span>Email Center (Outlook)</span>
                </button>
              </div>
            )}

            <div>
              {isDeclared ? (
                <Pill tone="good">
                  <CheckCircle2 size={12} className="mr-1 inline" /> Results Published by Admin
                </Pill>
              ) : (
                <Pill tone="warn">
                  <Lock size={12} className="mr-1 inline" /> Result Pending Admin Declaration
                </Pill>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Admin Quick Action Banner if Declared */}
      {isDeclared &&
        (currentUser?.role === "admin" ||
          currentUser?.role === "hr" ||
          currentUser?.isAdmin) &&
        onNavigateToHr && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 text-xs text-amber-950 shadow-xs">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-600 shrink-0" />
              <span>
                <strong>Admin Notice:</strong> Official results for{" "}
                <strong>{monthLabel}</strong> are published. To adjust scores or revert
                to normal evaluation, use the HR console controls.
              </span>
            </div>
            <button
              onClick={onNavigateToHr}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3.5 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-50 transition shadow-xs shrink-0 active:scale-95 cursor-pointer"
            >
              <RotateCcw size={13} className="text-rose-600" />
              Revert Declared Result (HR Console)
            </button>
          </div>
        )}

      {/* Closed State: Result Yet to Be Declared */}
      {!isDeclared ? (
        <Card className="p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Lock size={28} />
          </div>
          <h3 className="mt-4 text-lg font-bold text-blue-950">
            Result Yet to Be Declared
          </h3>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-blue-900/60">
            The monthly Rewards &amp; Recognition results for <strong>{monthLabel}</strong>{" "}
            are currently closed and pending evaluation &amp; declaration by Admin.
            Please check back once Admin publishes the official winners.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-xs font-semibold text-amber-900">
            <Sparkles size={14} className="text-amber-600" /> Standby for Official Announcement
          </div>
        </Card>
      ) : (
        /* Opened State: Winners Showcase */
        <div className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            {res.map((r, i) => {
              const winner = r.ranked[0]; // Top scored candidate
              const catName = r.slotLabel
                ? `${r.category.name} (${r.slotLabel})`
                : r.category.name;
              const winnerEmp = winner?.nom?.code
                ? employeeMap.get((winner.nom.code || "").toUpperCase())
                : undefined;

              return (
                <Card
                  key={`${r.category.id}-${r.slotLabel || i}`}
                  className="relative overflow-hidden p-5 shadow-sm border border-blue-900/10"
                >
                  <div className="mb-3 flex items-center justify-between border-b border-blue-900/10 pb-3">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-900/50">
                        Award Category
                      </span>
                      <h3 className="text-base font-bold text-blue-950">{catName}</h3>
                    </div>
                    <Award size={22} className="text-amber-500 shrink-0" />
                  </div>

                  {winner && winner.nom ? (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-extrabold text-blue-950">
                            {winner.nom.name}
                          </p>
                          <p className="text-xs font-medium text-blue-900/60">
                            Code: <span className="font-mono">{winner.nom.code}</span> ·{" "}
                            {unitById(winner.nom.unit)?.name || winner.nom.unit}
                            {winnerEmp?.email && (
                              <span className="ml-2 font-normal text-sky-700">
                                · {winnerEmp.email}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                            🏆 Winner
                          </span>
                          {canSendWinnerEmail && (
                            <button
                              onClick={() => handleOpenEmailModal("winners", i)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-950 px-2.5 py-1 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
                              title={`Send winner notification to ${winner.nom.name} via Outlook`}
                            >
                              <Mail size={13} className="text-blue-700" />
                              <span>Email (Outlook)</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="rounded bg-blue-900/5 p-3 text-xs leading-relaxed text-blue-900/80 italic">
                        &ldquo;{winner.nom.citation}&rdquo;
                      </p>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-blue-900/50">
                      No winner declared for this slot in current cycle.
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Outlook Notification & Multi-Audience Customizer Modal    */}
      {/* ========================================================= */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4.5 bg-[#0A2540] text-white shrink-0 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-amber-400">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
                    Results Email Center (Microsoft Outlook)
                  </h3>
                  <p className="text-xs text-sky-200/80">
                    Notify winners, encourage non-winning participants, or broadcast results company-wide.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Live Toast Notice for Copy / Outlook actions */}
              {copiedAction && (
                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-900 animate-in fade-in">
                  <Check size={16} className="text-emerald-600 shrink-0" />
                  <span>
                    {copiedAction === "outlook" &&
                      "Outlook launched! Long recipient list copied to your clipboard automatically."}
                    {copiedAction === "emails" &&
                      "Recipient email address(es) copied to clipboard!"}
                    {copiedAction === "body" &&
                      "Subject and email message body copied to clipboard!"}
                  </span>
                </div>
              )}

              {/* 1. Audience Selector Tabs */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
                  <Users size={14} className="text-blue-700" />
                  Step 1: Choose Target Audience
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Tab 1: Winners Only */}
                  <button
                    type="button"
                    onClick={() => handleSwitchAudience("winners")}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 text-center cursor-pointer ${
                      recipientAudience === "winners"
                        ? "border-blue-700 bg-blue-50 text-blue-950 shadow-xs ring-1 ring-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Trophy
                      size={16}
                      className={
                        recipientAudience === "winners"
                          ? "text-blue-700"
                          : "text-slate-400"
                      }
                    />
                    <span>Declared Winners</span>
                    <span className="text-[10px] font-normal text-slate-500">
                      ({declaredWinners.length} winners)
                    </span>
                  </button>

                  {/* Tab 2: Non-Winning Participants */}
                  <button
                    type="button"
                    onClick={() => handleSwitchAudience("non_winners")}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 text-center cursor-pointer ${
                      recipientAudience === "non_winners"
                        ? "border-blue-700 bg-blue-50 text-blue-950 shadow-xs ring-1 ring-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <HeartHandshake
                      size={16}
                      className={
                        recipientAudience === "non_winners"
                          ? "text-blue-700"
                          : "text-slate-400"
                      }
                    />
                    <span>Non-Winners (Try Again)</span>
                    <span className="text-[10px] font-normal text-slate-500">
                      ({nonWinningParticipants.length} participants)
                    </span>
                  </button>

                  {/* Tab 3: Company-Wide / All Employees */}
                  <button
                    type="button"
                    onClick={() => handleSwitchAudience("all_company")}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 text-center cursor-pointer ${
                      recipientAudience === "all_company"
                        ? "border-blue-700 bg-blue-50 text-blue-950 shadow-xs ring-1 ring-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Megaphone
                      size={16}
                      className={
                        recipientAudience === "all_company"
                          ? "text-blue-700"
                          : "text-slate-400"
                      }
                    />
                    <span>All Employees</span>
                    <span className="text-[10px] font-normal text-slate-500">
                      ({allCompanyEmployees.length} staff)
                    </span>
                  </button>
                </div>
              </div>

              {/* 2. Recipient Filter / Sub-Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
                    <User size={14} className="text-blue-700" />
                    Step 2: Specific Recipients
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {targetEmails.length} valid email(s) found
                  </span>
                </div>

                {/* Sub-selector for Winners */}
                {recipientAudience === "winners" && (
                  <select
                    value={selectedWinnerIndex}
                    onChange={(e) => {
                      const val =
                        e.target.value === "all" ? "all" : parseInt(e.target.value, 10);
                      handleChangeSelectedWinner(val);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-blue-950 shadow-2xs outline-none focus:border-blue-700 focus:bg-white cursor-pointer"
                  >
                    <option value="all">
                      🌟 All Declared Winners ({declaredWinners.length} recipients)
                    </option>
                    {declaredWinners.map((w) => (
                      <option key={w.index} value={w.index}>
                        🏆 {w.nom.name} ({w.nom.code}) — {w.categoryName}{" "}
                        {w.email ? `[${w.email}]` : "[No Email]"}
                      </option>
                    ))}
                  </select>
                )}

                {/* Sub-selector for Non-Winning Participants */}
                {recipientAudience === "non_winners" && (
                  <>
                    {nonWinningParticipants.length === 0 ? (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                        No other self-nominations were recorded for this cycle outside of the declared winners.
                      </div>
                    ) : (
                      <select
                        value={selectedParticipantCode}
                        onChange={(e) => {
                          handleChangeSelectedParticipant(e.target.value);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-blue-950 shadow-2xs outline-none focus:border-blue-700 focus:bg-white cursor-pointer"
                      >
                        <option value="all">
                          👏 All Non-Winning Participants ({nonWinningParticipants.length} recipients)
                        </option>
                        {nonWinningParticipants.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.name} ({p.code}) — {p.unit}{" "}
                            {p.email ? `[${p.email}]` : "[No Email]"}
                          </option>
                        ))}
                      </select>
                    )}
                  </>
                )}

                {/* Info banner for All Employees */}
                {recipientAudience === "all_company" && (
                  <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-xs text-blue-950 flex items-center gap-2">
                    <Megaphone size={16} className="text-sky-700 shrink-0" />
                    <span>
                      Company-wide broadcast to all <strong>{allCompanyEmployees.length} employees</strong> registered with work emails. (Emails will be sent via Outlook BCC to protect privacy).
                    </span>
                  </div>
                )}

                {/* Recipient Chips Preview */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 max-h-24 overflow-y-auto flex flex-wrap gap-1.5 items-center">
                  {recipientAudience === "winners" &&
                    targetWinners.map((w, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border ${
                          w.email
                            ? "bg-sky-50 text-blue-950 border-sky-200"
                            : "bg-amber-50 text-amber-900 border-amber-200"
                        }`}
                      >
                        <User
                          size={11}
                          className={w.email ? "text-blue-600" : "text-amber-600"}
                        />
                        <strong>{w.nom.name}</strong>
                        {w.email ? (
                          <span className="text-slate-500 font-mono text-[10px]">
                            ({w.email})
                          </span>
                        ) : (
                          <span className="text-amber-700 font-bold text-[10px]">
                            (No email)
                          </span>
                        )}
                      </span>
                    ))}

                  {recipientAudience === "non_winners" &&
                    targetParticipants.map((p, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border ${
                          p.email
                            ? "bg-sky-50 text-blue-950 border-sky-200"
                            : "bg-amber-50 text-amber-900 border-amber-200"
                        }`}
                      >
                        <User
                          size={11}
                          className={p.email ? "text-blue-600" : "text-amber-600"}
                        />
                        <strong>{p.name}</strong>
                        {p.email ? (
                          <span className="text-slate-500 font-mono text-[10px]">
                            ({p.email})
                          </span>
                        ) : (
                          <span className="text-amber-700 font-bold text-[10px]">
                            (No email)
                          </span>
                        )}
                      </span>
                    ))}

                  {recipientAudience === "all_company" && (
                    <span className="text-xs text-slate-500 italic">
                      {allCompanyEmployees.length} total staff emails loaded across all departments
                    </span>
                  )}
                </div>
              </div>

              {/* 3. Prompt Template Selector */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  Step 3: Select Message Prompt
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Template 1 */}
                  <button
                    type="button"
                    onClick={() => handleSelectTemplateKey("primary")}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 text-center cursor-pointer ${
                      promptTemplateKey === "primary"
                        ? "border-blue-700 bg-blue-50 text-blue-950 shadow-xs ring-1 ring-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {recipientAudience === "winners" && (
                      <>
                        <Trophy size={16} className="text-blue-700" />
                        <span>Formal Winner Award</span>
                      </>
                    )}
                    {recipientAudience === "non_winners" && (
                      <>
                        <HeartHandshake size={16} className="text-emerald-700" />
                        <span>Try Again Next Month!</span>
                      </>
                    )}
                    {recipientAudience === "all_company" && (
                      <>
                        <Megaphone size={16} className="text-blue-700" />
                        <span>Company Announcement</span>
                      </>
                    )}
                  </button>

                  {/* Template 2 */}
                  <button
                    type="button"
                    onClick={() => handleSelectTemplateKey("secondary")}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 text-center cursor-pointer ${
                      promptTemplateKey === "secondary"
                        ? "border-blue-700 bg-blue-50 text-blue-950 shadow-xs ring-1 ring-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {recipientAudience === "winners" && (
                      <>
                        <Award size={16} className="text-blue-700" />
                        <span>Executive Praise</span>
                      </>
                    )}
                    {recipientAudience === "non_winners" && (
                      <>
                        <Sparkles size={16} className="text-amber-600" />
                        <span>Motivational Note</span>
                      </>
                    )}
                    {recipientAudience === "all_company" && (
                      <>
                        <Award size={16} className="text-blue-700" />
                        <span>Townhall Celebration</span>
                      </>
                    )}
                  </button>

                  {/* Template 3: Custom */}
                  <button
                    type="button"
                    onClick={() => handleSelectTemplateKey("custom")}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 text-center cursor-pointer ${
                      promptTemplateKey === "custom"
                        ? "border-blue-700 bg-blue-50 text-blue-950 shadow-xs ring-1 ring-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <FileText size={16} className="text-blue-700" />
                    <span>Custom Message</span>
                  </button>
                </div>
              </div>

              {/* 4. Subject Line Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-blue-950">
                  Email Subject:
                </label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-blue-950 shadow-2xs outline-none focus:border-blue-700"
                />
              </div>

              {/* 5. Message Body Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-blue-950">
                    Email Message Body:
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Freely editable before launching Outlook
                  </span>
                </div>
                <textarea
                  rows={9}
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-xs font-mono text-slate-800 shadow-2xs outline-none focus:border-blue-700 leading-relaxed"
                />
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyEmails}
                  disabled={targetEmails.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer shadow-2xs"
                  title="Copy email addresses to clipboard"
                >
                  <Copy size={13} /> Copy Emails
                </button>
                <button
                  type="button"
                  onClick={handleCopyBody}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
                  title="Copy subject and body to clipboard"
                >
                  <Copy size={13} /> Copy Message
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleOpenOutlook}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white px-5 py-2 text-xs font-extrabold uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  <Send size={14} className="text-amber-400" />
                  <span>Open in Outlook</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsView;
