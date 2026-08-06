import React from "react";

export interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = "" }) => (
  <div
    className={`rounded-2xl border border-blue-900/10 bg-white shadow-xs text-blue-950 ${className}`}
  >
    {children}
  </div>
);

export default Card;
