import React from "react";

interface LabelProps {
  children: React.ReactNode;
}

export const Label: React.FC<LabelProps> = ({ children }) => (
  <span className="block text-xs font-semibold uppercase tracking-widest text-blue-900/50 mb-1.5">
    {children}
  </span>
);

export default Label;
