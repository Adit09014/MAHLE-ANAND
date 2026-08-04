import { Cycle, Nomination, PanelScoreResult, CategoryResult } from "./types";
import { CATEGORIES } from "./constants";

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
  };
}

export function panelScore(cycle: Cycle, nomId: string): PanelScoreResult {
  const s = cycle.scores[nomId] || {};
  const vals = cycle.judges
    .map((j) => s[j.id])
    .filter((v): v is number => typeof v === "number");
  if (!vals.length) return { avg: null, count: 0, vals };
  return {
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    count: vals.length,
    vals,
  };
}

export function endorsedList(cycle: Cycle): Nomination[] {
  const ids: string[] = [];
  Object.values(cycle.endorsed).forEach((byCat) =>
    Object.values(byCat || {}).forEach((id) => id && ids.push(id))
  );
  return cycle.nominations.filter((n) => ids.includes(n.id));
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
