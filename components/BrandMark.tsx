"use client";

import React, { useState, useEffect } from "react";

export interface BrandMarkProps {
  url?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ url }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);

  if (url && !failed) {
    return (
      <img
        src={url}
        alt="MAHLE"
        onError={() => setFailed(true)}
        className="h-10 w-auto rounded bg-white p-1.5"
      />
    );
  }

  return (
    <div className="flex items-center rounded bg-white px-3.5 py-2">
      <span
        className="text-xl font-bold uppercase leading-none"
        style={{ color: "#00A03C", letterSpacing: "0.02em" }}
      >
        MAHLE
      </span>
    </div>
  );
};

export default BrandMark;
