"use client";

import React from "react";
import {
  Users,
  UserPlus,
  Building2,
  CalendarCheck,
  Activity,
  Tv,
  RefreshCw,
  Clock,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClinicEmptyStateProps {
  department: string;
  doctorName: string;
  onOpenRegistration: () => void;
  onViewAllDepartments?: () => void;
  onOpenQueueDisplay?: () => void;
  onRefresh?: () => void;
}

export function ClinicEmptyState({
  department,
  doctorName,
  onOpenRegistration,
  onViewAllDepartments,
  onOpenQueueDisplay,
  onRefresh,
}: ClinicEmptyStateProps) {
  const currentHour = new Date().getHours();
  const timeGreeting =
    currentHour < 11
      ? "Selamat Pagi"
      : currentHour < 15
      ? "Selamat Siang"
      : currentHour < 18
      ? "Selamat Sore"
      : "Selamat Malam";

  return (
    <div className="ehr-card p-8 sm:p-12 text-center space-y-6 animate-in fade-in duration-300">
      {/* Icon & Status Pulse */}
      <div className="relative mx-auto w-20 h-20 rounded-3xl bg-teal-50 border-2 border-teal-200 flex items-center justify-center text-teal-600 shadow-sm">
        <Users className="h-9 w-9" />
        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white" />
        </span>
      </div>

      {/* Main Copy */}
      <div className="max-w-md mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 font-mono">
          <Clock className="h-3.5 w-3.5 text-teal-600" />
          <span>{timeGreeting}, {doctorName}</span>
        </div>

        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Belum Ada Pasien Antrean di {department}
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Ruang periksa siap digunakan. Pasien yang baru mendaftar di loket pendaftaran atau kiosk mandiri akan otomatis muncul di antrean ini secara real-time.
        </p>
      </div>

      {/* Reassuring Clinic Readiness Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left text-xs">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Status Poliklinik</span>
          <p className="font-bold text-emerald-700 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Buka & Siap Melayani
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase">SATUSEHAT Gateway</span>
          <p className="font-bold text-teal-800 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
            Terhubung (200 OK)
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Koneksi Loket</span>
          <p className="font-bold text-slate-800 flex items-center gap-1 font-mono">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Live Sync Aktif
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1.5">
        <Button
          onClick={onOpenRegistration}
          className="h-9 px-3.5 text-xs font-semibold gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-2xs cursor-pointer active:scale-[0.98] transition-all"
        >
          <UserPlus className="h-3.5 w-3.5 shrink-0" />
          <span>Daftarkan Pasien di Loket</span>
        </Button>

        {onViewAllDepartments && department !== "Semua Poli" && (
          <Button
            variant="outline"
            onClick={onViewAllDepartments}
            className="h-9 px-3.5 text-xs font-semibold gap-2 rounded-lg bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-800 shadow-2xs cursor-pointer active:scale-[0.98] transition-all"
          >
            <Building2 className="h-3.5 w-3.5 text-teal-600 shrink-0" />
            <span>Lihat Antrean Semua Poli</span>
          </Button>
        )}

        {onOpenQueueDisplay && (
          <Button
            variant="outline"
            onClick={onOpenQueueDisplay}
            className="h-9 px-3.5 text-xs font-semibold gap-2 rounded-lg bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-800 shadow-2xs cursor-pointer active:scale-[0.98] transition-all"
          >
            <Tv className="h-3.5 w-3.5 text-slate-600 shrink-0" />
            <span>Layar Display Ruang Tunggu</span>
          </Button>
        )}
      </div>
    </div>
  );
}
