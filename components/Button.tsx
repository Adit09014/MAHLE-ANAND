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
      "bg-blue-800 text-white hover:bg-blue-900 disabled:bg-blue-900/25",
    quiet:
      "bg-white text-blue-900 border border-blue-900/20 hover:border-blue-800 disabled:text-blue-900/30",
    danger:
      "bg-white text-red-800 border border-red-800/30 hover:bg-red-50 disabled:text-red-800/30",
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-2 rounded px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition disabled:cursor-not-allowed ${tones[tone]} ${className}`}
    />
  );
};

export default Button;
