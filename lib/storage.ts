import { Cycle, Branding, PointsState } from "./types";
import { emptyCycle } from "./helpers";

export const cycleKey = (m: string) => `rr:cycle:${m}`;
export const POINTS_KEY = "rr:points";
export const BRAND_KEY = "rr:branding";

export async function loadCycle(month: string): Promise<Cycle> {
  try {
    const res = await fetch(`/api/cycles/${month}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.found && data.cycle) {
        return { ...emptyCycle(month), ...data.cycle };
      }
    }
  } catch (e) {
    /* fallback to local storage if API route fails */
  }

  // Fallback to localStorage
  try {
    if (typeof window !== "undefined") {
      const val = window.localStorage.getItem(cycleKey(month));
      if (val) return { ...emptyCycle(month), ...JSON.parse(val) };
    }
  } catch (e) {
    /* fallback error */
  }

  return emptyCycle(month);
}

export async function saveCycle(cycle: Cycle): Promise<void> {
  // Save to MongoDB API
  try {
    await fetch(`/api/cycles/${cycle.month}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cycle),
    });
  } catch (e) {
    /* network fallback */
  }

  // Also save to localStorage
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(cycleKey(cycle.month), JSON.stringify(cycle));
    } catch (e) {
      /* ignore */
    }
  }
}

export async function loadBranding(): Promise<Branding> {
  try {
    const res = await fetch("/api/branding", { cache: "no-store" });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    /* network fallback */
  }

  try {
    if (typeof window !== "undefined") {
      const val = window.localStorage.getItem(BRAND_KEY);
      if (val) return JSON.parse(val);
    }
  } catch (e) {
    /* ignore */
  }
  return { logoUrl: "" };
}

export async function saveBranding(branding: Branding): Promise<void> {
  try {
    await fetch("/api/branding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(branding),
    });
  } catch (e) {
    /* network fallback */
  }

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(BRAND_KEY, JSON.stringify(branding));
    } catch (e) {
      /* ignore */
    }
  }
}

export async function loadPoints(): Promise<PointsState> {
  try {
    const res = await fetch("/api/points", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      return data.points || {};
    }
  } catch (e) {
    /* network fallback */
  }

  try {
    if (typeof window !== "undefined") {
      const val = window.localStorage.getItem(POINTS_KEY);
      if (val) return JSON.parse(val);
    }
  } catch (e) {
    /* ignore */
  }
  return {};
}

export async function savePoints(points: PointsState): Promise<void> {
  try {
    await fetch("/api/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(points),
    });
  } catch (e) {
    /* network fallback */
  }

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(POINTS_KEY, JSON.stringify(points));
    } catch (e) {
      /* ignore */
    }
  }
}
