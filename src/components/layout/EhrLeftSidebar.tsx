"use client";

import React from "react";
import {
  FileText,
  Activity,
  Pill,
  History,
  Stethoscope,
  KeyRound,
  UserPlus,
  FlaskConical,
  Tv,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/auth-context";

export type EhrModule =
  | "resume"
  | "registration"
  | "vitals"
  | "prescriptions"
  | "diagnostic"
  | "history"
  | "entry"
  | "auth";

interface EhrLeftSidebarProps {
  activeModule: EhrModule;
  onModuleChange: (mod: EhrModule) => void;
  onOpenQueueDisplay?: () => void;
  waitingCount?: number;
}

export function EhrLeftSidebar({
  activeModule,
  onModuleChange,
  onOpenQueueDisplay,
  waitingCount,
}: EhrLeftSidebarProps) {
  const { user } = useAuth();
  const isDoctor = user?.role === "doctor";

  // 1. Loket & Antrean
  const queueNavItems: Array<{
    id: EhrModule;
    label: string;
    sublabel: string;
    icon: React.ElementType;
    badge?: string;
  }> = [
    {
      id: "registration",
      label: "Pendaftaran & Antrean",
      sublabel: "Registrasi & Antrean Poli",
      icon: UserPlus,
      badge:
        typeof waitingCount === "number" && waitingCount > 0
          ? `${waitingCount} Menunggu`
          : undefined,
    },
  ];

  // 2. Pelayanan Medis (Klinis)
  const clinicalCareNavItems: Array<{
    id: EhrModule;
    label: string;
    sublabel: string;
    icon: React.ElementType;
    badge?: string;
  }> = [
    {
      id: "entry",
      label: "Pemeriksaan Dokter (SOAP)",
      sublabel: isDoctor ? "Pemeriksaan, Diagnosis & Terapi" : "Tinjau Catatan Medis (DPJP)",
      icon: Stethoscope,
    },
    {
      id: "vitals",
      label: "Pemeriksaan Fisik & TTV",
      sublabel: "Tensi, Nadi, Suhu, SpO2",
      icon: Activity,
    },
    {
      id: "diagnostic",
      label: "Penunjang Lab & Radiologi",
      sublabel: "Order & Hasil Diagnostik",
      icon: FlaskConical,
    },
    {
      id: "prescriptions",
      label: "Resep & Terapi Farmasi",
      sublabel: "E-Resep Obat Standar KFA",
      icon: Pill,
    },
  ];

  // 3. Ringkasan & Histori
  const summaryNavItems: Array<{
    id: EhrModule;
    label: string;
    sublabel: string;
    icon: React.ElementType;
    badge?: string;
  }> = [
    {
      id: "resume",
      label: "Resume Medis Rawat Jalan",
      sublabel: "Ringkasan Klinis Terpadu",
      icon: FileText,
    },
    {
      id: "history",
      label: "Riwayat Kunjungan Poli",
      sublabel: "Timeline Rekam Medis",
      icon: History,
    },
  ];

  // 4. Integrasi SATUSEHAT
  const systemNavItems: Array<{
    id: EhrModule;
    label: string;
    sublabel: string;
    icon: React.ElementType;
    badge?: string;
  }> = [
    {
      id: "auth",
      label: "Bridging SATUSEHAT",
      sublabel: "Koneksi Gateway Kemenkes",
      icon: KeyRound,
    },
  ];

  return (
    <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-3">
      {/* Navigation Tree */}
      <nav className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-2 space-y-3">
        {/* Section 1: Loket & Antrean */}
        <div className="space-y-1">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Loket & Antrean
          </div>

          {queueNavItems.map((item) => {
            const isActive = activeModule === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onModuleChange(item.id)}
                className={`w-full flex items-center justify-between gap-2 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  isActive
                    ? "bg-teal-600 text-white font-semibold shadow-xs"
                    : "hover:bg-slate-50 text-slate-700 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold block truncate leading-tight">
                      {item.label}
                    </span>
                    <span
                      className={`text-[10px] block truncate leading-tight mt-0.5 ${
                        isActive ? "text-teal-100" : "text-slate-400"
                      }`}
                    >
                      {item.sublabel}
                    </span>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase whitespace-nowrap ${
                      isActive
                        ? "bg-white/25 text-white"
                        : "bg-teal-50 text-teal-800 border border-teal-200"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Section 2: Pelayanan Medis DPJP */}
        <div className="pt-2 border-t border-slate-100 space-y-1">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Pelayanan Medis
          </div>

          {clinicalCareNavItems.map((item) => {
            const isActive = activeModule === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onModuleChange(item.id)}
                className={`w-full flex items-center justify-between gap-2 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  isActive
                    ? "bg-teal-600 text-white font-semibold shadow-xs"
                    : "hover:bg-slate-50 text-slate-700 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold block truncate leading-tight">
                      {item.label}
                    </span>
                    <span
                      className={`text-[10px] block truncate leading-tight mt-0.5 ${
                        isActive ? "text-teal-100" : "text-slate-400"
                      }`}
                    >
                      {item.sublabel}
                    </span>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase whitespace-nowrap ${
                      isActive
                        ? "bg-white/25 text-white"
                        : "bg-teal-50 text-teal-800 border border-teal-200"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Section 3: Ringkasan & Histori Rekam Medis */}
        <div className="pt-2 border-t border-slate-100 space-y-1">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Rekam Medis
          </div>

          {summaryNavItems.map((item) => {
            const isActive = activeModule === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onModuleChange(item.id)}
                className={`w-full flex items-center justify-between gap-2 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  isActive
                    ? "bg-teal-600 text-white font-semibold shadow-xs"
                    : "hover:bg-slate-50 text-slate-700 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold block truncate leading-tight">
                      {item.label}
                    </span>
                    <span
                      className={`text-[10px] block truncate leading-tight mt-0.5 ${
                        isActive ? "text-teal-100" : "text-slate-400"
                      }`}
                    >
                      {item.sublabel}
                    </span>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase whitespace-nowrap ${
                      isActive
                        ? "bg-white/25 text-white"
                        : "bg-teal-50 text-teal-800 border border-teal-200"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Section 4: Bridging SATUSEHAT */}
        <div className="pt-2 border-t border-slate-100 space-y-1">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Integrasi Kemenkes
          </div>

          {systemNavItems.map((item) => {
            const isActive = activeModule === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onModuleChange(item.id)}
                className={`w-full flex items-center justify-between gap-2 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  isActive
                    ? "bg-teal-600 text-white font-semibold shadow-xs"
                    : "hover:bg-slate-50 text-slate-700 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold block truncate leading-tight">
                      {item.label}
                    </span>
                    <span
                      className={`text-[10px] block truncate leading-tight mt-0.5 ${
                        isActive ? "text-teal-100" : "text-slate-400"
                      }`}
                    >
                      {item.sublabel}
                    </span>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase whitespace-nowrap ${
                      isActive
                        ? "bg-white/25 text-white"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Quick Antrean TV Display Shortcut */}
      {onOpenQueueDisplay && (
        <button
          type="button"
          onClick={onOpenQueueDisplay}
          className="w-full p-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200/80 shadow-2xs flex items-center justify-between transition-colors text-xs cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Tv className="h-4 w-4 text-teal-600" />
            <span>Display TV Antrean</span>
          </div>
          <Badge
            variant="outline"
            className="text-[9px] bg-teal-50 text-teal-700 border-teal-200 font-semibold"
          >
            Live Monitor
          </Badge>
        </button>
      )}
    </aside>
  );
}
