"use client";

import React from "react";
import { Building2 } from "lucide-react";

export function ClinicalSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans animate-pulse">
      {/* 1. Header Skeleton */}
      <header className="sticky top-0 z-50 h-16 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shadow-2xs gap-3">
        {/* Left: Brand Placeholder */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600/80 text-white shadow-xs shrink-0">
            <Building2 className="h-4.5 w-4.5 opacity-80" />
          </div>
          <div className="space-y-1.5">
            <div className="h-4 w-36 bg-slate-200 rounded-md" />
            <div className="h-2.5 w-28 bg-slate-100 rounded-md" />
          </div>
        </div>

        {/* Center: Search Bar Placeholder */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-xl mx-2">
          <div className="w-full h-9 bg-slate-100 border border-slate-200 rounded-full" />
          <div className="h-9 w-28 bg-slate-100 border border-slate-200 rounded-xl hidden sm:block" />
        </div>

        {/* Right: Actions Placeholder */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-24 bg-slate-100 border border-slate-200 rounded-lg hidden md:block" />
          <div className="h-9 w-9 bg-slate-100 border border-slate-200 rounded-xl" />
          <div className="h-9 w-28 bg-teal-100/60 rounded-xl hidden sm:block" />
        </div>
      </header>

      {/* 2. Holy Grail Body Skeleton (Left Sidebar + Center Canvas + Right Panel) */}
      <div className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar Skeleton (280px) */}
        <aside className="w-full lg:w-72 shrink-0 space-y-4">
          <div className="ehr-card p-4 space-y-3">
            <div className="h-3.5 w-24 bg-slate-200 rounded" />
            <div className="space-y-2">
              <div className="h-9 w-full bg-teal-50/80 rounded-xl border border-teal-100" />
              <div className="h-9 w-full bg-slate-50 rounded-xl" />
              <div className="h-9 w-full bg-slate-50 rounded-xl" />
              <div className="h-9 w-full bg-slate-50 rounded-xl" />
              <div className="h-9 w-full bg-slate-50 rounded-xl" />
            </div>
          </div>

          <div className="ehr-card p-4 space-y-3">
            <div className="h-3 w-28 bg-slate-200 rounded" />
            <div className="space-y-2">
              <div className="h-7 w-full bg-slate-100 rounded-lg" />
              <div className="h-7 w-full bg-slate-100 rounded-lg" />
            </div>
          </div>
        </aside>

        {/* Center Main Clinical Canvas Skeleton (Fluid) */}
        <main className="flex-1 min-w-0 space-y-5">
          {/* Shift Bar Placeholder */}
          <div className="ehr-card p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-teal-100/70 rounded-full" />
              <div className="space-y-1.5">
                <div className="h-4 w-40 bg-slate-200 rounded" />
                <div className="h-3 w-28 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-24 bg-slate-100 rounded-lg" />
              <div className="h-8 w-32 bg-teal-600/30 rounded-lg" />
            </div>
          </div>

          {/* Patient Profile Banner Placeholder */}
          <div className="ehr-card p-5 space-y-4 border-l-4 border-l-teal-500/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="h-14 w-14 rounded-2xl bg-teal-100/80 flex-shrink-0" />
                <div className="space-y-2">
                  <div className="h-5 w-48 bg-slate-200 rounded-md" />
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-24 bg-slate-100 rounded" />
                    <div className="h-3.5 w-28 bg-slate-100 rounded" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-20 bg-emerald-100/60 rounded-full" />
                <div className="h-6 w-24 bg-teal-100/60 rounded-full" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
              <div className="space-y-1">
                <div className="h-2.5 w-16 bg-slate-200 rounded" />
                <div className="h-3.5 w-24 bg-slate-100 rounded" />
              </div>
              <div className="space-y-1">
                <div className="h-2.5 w-16 bg-slate-200 rounded" />
                <div className="h-3.5 w-24 bg-slate-100 rounded" />
              </div>
              <div className="space-y-1">
                <div className="h-2.5 w-16 bg-slate-200 rounded" />
                <div className="h-3.5 w-20 bg-slate-100 rounded" />
              </div>
              <div className="space-y-1">
                <div className="h-2.5 w-16 bg-slate-200 rounded" />
                <div className="h-3.5 w-28 bg-slate-100 rounded" />
              </div>
            </div>
          </div>

          {/* Timeline Strip Placeholder */}
          <div className="ehr-card p-3 flex items-center gap-2">
            <div className="h-3 w-28 bg-slate-200 rounded mr-2" />
            <div className="h-7 w-36 bg-teal-600/30 rounded-lg" />
            <div className="h-7 w-28 bg-slate-100 rounded-lg" />
            <div className="h-7 w-28 bg-slate-100 rounded-lg hidden sm:block" />
          </div>

          {/* Vitals Card Placeholder */}
          <div className="ehr-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-4 w-40 bg-slate-200 rounded" />
              <div className="h-3 w-24 bg-slate-100 rounded" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="h-24 bg-slate-50 rounded-xl border border-slate-100 p-3 space-y-2">
                <div className="h-3 w-16 bg-slate-200 rounded" />
                <div className="h-6 w-20 bg-slate-200 rounded" />
              </div>
              <div className="h-24 bg-slate-50 rounded-xl border border-slate-100 p-3 space-y-2">
                <div className="h-3 w-16 bg-slate-200 rounded" />
                <div className="h-6 w-16 bg-slate-200 rounded" />
              </div>
              <div className="h-24 bg-slate-50 rounded-xl border border-slate-100 p-3 space-y-2">
                <div className="h-3 w-16 bg-slate-200 rounded" />
                <div className="h-6 w-16 bg-slate-200 rounded" />
              </div>
              <div className="h-24 bg-slate-50 rounded-xl border border-slate-100 p-3 space-y-2">
                <div className="h-3 w-16 bg-slate-200 rounded" />
                <div className="h-6 w-16 bg-slate-200 rounded" />
              </div>
            </div>
          </div>
        </main>

        {/* Right Action Panel Skeleton (320px) */}
        <aside className="w-full lg:w-80 shrink-0 space-y-4">
          <div className="ehr-card p-4 space-y-3">
            <div className="h-3 w-28 bg-slate-200 rounded" />
            <div className="h-9 w-full bg-teal-600/30 rounded-lg" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-8 bg-slate-100 rounded-lg" />
              <div className="h-8 bg-slate-100 rounded-lg" />
            </div>
          </div>

          <div className="ehr-card p-4 space-y-3">
            <div className="h-3 w-32 bg-slate-200 rounded" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-14 bg-slate-50 rounded-lg border border-slate-100" />
              <div className="h-14 bg-slate-50 rounded-lg border border-slate-100" />
              <div className="h-14 bg-slate-50 rounded-lg border border-slate-100" />
              <div className="h-14 bg-slate-50 rounded-lg border border-slate-100" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
