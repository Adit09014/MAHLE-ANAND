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
      alt="MAHLE"
      onError={() => setFailed(true)}
      className={`h-11 sm:h-14 w-auto object-contain ${className || ""}`}
    />
  );

  if (bgWhite) {
    return (
      <div className="inline-block rounded-lg bg-white p-2.5 shadow-sm">
        {imgElement}
      </div>
    );
  }

  return imgElement;
};

export default BrandMark;
