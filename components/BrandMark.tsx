"use client";

import React, { useState, useEffect } from "react";

export interface BrandMarkProps {
  url?: string;
  className?: string;
  bgWhite?: boolean;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ url, className, bgWhite }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);

  const logoSrc = url && !failed ? url : "/MAHLE-Logo.png";

  const imgElement = (
    <img
      src={logoSrc}
      alt="MAHLE ANAND"
      onError={() => setFailed(true)}
      className={`h-14 sm:h-16 lg:h-20 w-30 max-w-[280px] object-contain ${className || ""}`}
    />
  );

  if (bgWhite) {
    return (
      <div className="inline-flex items-center justify-center rounded-xl bg-white px-1.5 py-0.5 shadow-sm border border-slate-200/50">
        {imgElement}
      </div>
    );
  }

  return imgElement;
};

export default BrandMark;
