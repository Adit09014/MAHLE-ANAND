import React from "react";

export interface EmptyProps {
  title: string;
  hint: string;
}

export const Empty: React.FC<EmptyProps> = ({ title, hint }) => (
  <div className="rounded-lg border border-dashed border-blue-900/20 px-5 py-10 text-center">
    <p className="text-sm font-medium text-blue-950">{title}</p>
    <p className="mt-1 text-xs text-blue-900/60">{hint}</p>
  </div>
);

export default Empty;
