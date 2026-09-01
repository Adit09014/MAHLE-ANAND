import { Cycle, Branding, PointsState } from "./types";
import { emptyCycle } from "./helpers";

/**
 * 100% SQL SERVER (SSMS) STORAGE LAYER
 * ALL application state (cycles, nominations, points, branding) is strictly stored
 * in SQL Server (Rewards database: dbo.Cycles, dbo.Points, dbo.Branding).
 * Zero localStorage is used.
 */

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
    console.error("[loadCycle] Error fetching cycle from SSMS:", e);
  }

  // Always return a clean empty cycle when SSMS has no data
  return emptyCycle(month);
}

export async function saveCycle(cycle: Cycle): Promise<Cycle> {
  try {
    const res = await fetch(`/api/cycles/${cycle.month}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cycle),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.cycle) {
        return data.cycle;
      }
    }
  } catch (e) {
    console.error("[saveCycle] Error saving cycle to SSMS:", e);
  }
  return cycle;
}

export async function loadBranding(): Promise<Branding> {
  try {
    const res = await fetch("/api/branding", { cache: "no-store" });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error("[loadBranding] Error fetching branding from SSMS:", e);
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
    console.error("[saveBranding] Error saving branding to SSMS:", e);
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
    console.error("[loadPoints] Error fetching points from SSMS:", e);
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
    console.error("[savePoints] Error saving points to SSMS:", e);
  }
}
