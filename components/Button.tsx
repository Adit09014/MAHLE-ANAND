import React from "react";

export type ButtonTone = "solid" | "quiet" | "danger";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone;
}

export const Button: React.FC<ButtonProps> = ({
  tone = "solid",
  className = "",
  ...props
}) => {
  const tones: Record<ButtonTone, string> = {
    solid:
      "bg-gradient-to-r from-blue-800 to-blue-900 text-white hover:from-blue-900 hover:to-blue-950 shadow-sm hover:shadow-md shadow-blue-900/20 active:scale-[0.98] disabled:opacity-40 disabled:scale-100",
    quiet:
      "bg-white text-blue-950 border border-blue-900/15 hover:border-blue-700 hover:bg-blue-50/50 shadow-sm active:scale-[0.98] disabled:opacity-40 disabled:scale-100",
    danger:
      "bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-sm hover:shadow-md shadow-red-700/20 active:scale-[0.98] disabled:opacity-40 disabled:scale-100",
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-150 disabled:cursor-not-allowed ${tones[tone]} ${className}`}
    />
  );
};

export default Button;
