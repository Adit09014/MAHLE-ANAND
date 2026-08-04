import React from "react";

export type PillTone = "muted" | "good" | "warn" | "gold";

export interface PillProps {
  children: React.ReactNode;
  tone?: PillTone;
}

export const Pill: React.FC<PillProps> = ({ children, tone = "muted" }) => {
  const tones: Record<PillTone, string> = {
    muted: "bg-blue-900/5 text-blue-900/70",
    good: "bg-blue-700/10 text-blue-800",
    warn: "bg-amber-500/15 text-amber-800",
    gold: "bg-amber-400/25 text-amber-900",
  };
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  );
};

export default Pill;
