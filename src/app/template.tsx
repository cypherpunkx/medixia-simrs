"use client";

import React from "react";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-transition min-h-screen w-full">
      {children}
    </div>
  );
}
