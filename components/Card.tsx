import React from "react";

export interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = "" }) => (
  <div
    className={`rounded-lg border border-blue-900/10 bg-white shadow-sm ${className}`}
  >
    {children}
  </div>
);

export default Card;
