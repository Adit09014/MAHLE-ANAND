import { Cycle, Nomination, PanelScoreResult, CategoryResult, CycleTimeline, PhaseTimeline } from "./types";
import { CATEGORIES } from "./constants";

export function getDefaultTimeline(month: string): CycleTimeline {
  const [year, mStr] = month.split("-");
  const y = Number(year) || 2026;
  const m = Number(mStr) || 8;
  const pad = (n: number) => String(n).padStart(2, "0");

  return {
    nomination: {
      startDate: `${y}-${pad(m)}-01`,
      endDate: `${y}-${pad(m)}-07`,
      isExtended: false,
    },
    hodEndorsement: {
      startDate: `${y}-${pad(m)}-01`,
      endDate: `${y}-${pad(m)}-09`,
      isExtended: false,
    },
    panelScoring: {
      startDate: `${y}-${pad(m)}-10`,
      endDate: `${y}-${pad(m)}-12`,
      isExtended: false,
    },
  };
}

export function getCycleTimeline(cycle: Cycle): CycleTimeline {
  const def = getDefaultTimeline(cycle.month);
  if (!cycle.timeline) return def;
  return {
    nomination: { ...def.nomination, ...(cycle.timeline.nomination || {}) },
    hodEndorsement: { ...def.hodEndorsement, ...(cycle.timeline.hodEndorsement || {}) },
    panelScoring: { ...def.panelScoring, ...(cycle.timeline.panelScoring || {}) },
  };
}

export function getEffectiveEndDate(phase: PhaseTimeline): string {
  if (phase.isExtended && phase.extendedUntil) {
    return phase.extendedUntil;
  }
  return phase.endDate;
}

export function addDaysToDateStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDatePretty(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const month = d.toLocaleDateString("en-IN", { month: "short" });
  const suffix =
    day === 1 || day === 21 || day === 31
      ? "st"
      : day === 2 || day === 22
      ? "nd"
      : day === 3 || day === 23
      ? "rd"
      : "th";
  return `${day}${suffix} ${month}`;
}

export function emptyCycle(month: string): Cycle {
  return {
    month,
    stage: "nomination",
    judges: [
      { id: "j1", name: "" },
      { id: "j2", name: "" },
      { id: "j3", name: "" },
    ],
    nominations: [],
    endorsed: {},
    scores: {},
    announcedAt: null,
    timeline: getDefaultTimeline(month),
  };
}

export function panelScore(cycle: Cycle, nomId: string): PanelScoreResult {
  const s = cycle.scores[nomId] || {};
  const vals = Object.values(s).filter((v): v is number => typeof v === "number");
  if (!vals.length) return { avg: null, count: 0, vals };
  return {
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    count: vals.length,
    vals,
  };
}

export function endorsedList(cycle: Cycle): Nomination[] {
  const ids: string[] = [];
  if (cycle?.endorsed) {
    Object.values(cycle.endorsed).forEach((byCat) =>
      Object.values(byCat || {}).forEach((id) => id && ids.push(id))
    );
  }
  return (cycle?.nominations || []).filter((n) => ids.includes(n.id));
}

export function results(cycle: Cycle): CategoryResult[] {
  const out: CategoryResult[] = [];
  CATEGORIES.forEach((cat) => {
    const pool = endorsedList(cycle).filter((n) => n.category === cat.id);
    const slots: Array<{ label: string | null; filter: (n: Nomination) => boolean }> = cat.splitByGender
      ? [
          { label: "Male", filter: (n: Nomination) => n.gender === "Male" },
          { label: "Female", filter: (n: Nomination) => n.gender === "Female" },
        ]
      : [{ label: null, filter: () => true }];

    slots.forEach((slot) => {
      const ranked = pool
        .filter(slot.filter)
        .map((n) => ({ nom: n, ...panelScore(cycle, n.id) }))
        .sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));
      out.push({ category: cat, slotLabel: slot.label, ranked });
    });
  });
  return out;
}
