"use client";

import React from "react";
import {
  Sparkles,
  Stethoscope,
  Building2,
  Users,
  Volume2,
  ChevronRight,
  UserCheck,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClinicQueuePatientItem } from "@/lib/satusehat/types";

interface ClinicalShiftBarProps {
  doctorName: string;
  department: string;
  roomName?: string;
  worklist: ClinicQueuePatientItem[];
  currentPatientName?: string;
  onCallNextPatient?: () => void;
  onOpenWorklist?: () => void;
}

export function ClinicalShiftBar({
  doctorName,
  department,
  roomName = "Ruang Pelayanan",
  worklist,
  currentPatientName,
  onCallNextPatient,
  onOpenWorklist,
}: ClinicalShiftBarProps) {
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 11
      ? "Selamat Pagi"
      : currentHour < 15
      ? "Selamat Siang"
      : currentHour < 18
      ? "Selamat Sore"
      : "Selamat Malam";

  const departmentWorklist =
    department === "Semua Poli"
      ? worklist
      : worklist.filter((w) => w.department === department);

  const waitingCount = departmentWorklist.filter((w) => w.status === "arrived").length;
  const inProgressCount = departmentWorklist.filter((w) => w.status === "in-progress").length;
  const finishedCount = departmentWorklist.filter((w) => w.status === "finished").length;

  const nextWaitingPatient = departmentWorklist.find((w) => w.status === "arrived");

  return (
    <div className="rounded-2xl border border-teal-200/90 bg-gradient-to-r from-teal-50/60 via-white to-slate-50 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fade-in-up card-interactive">
      {/* Left: Doctor Shift Greeting & Location */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 hover:scale-105">
          <Stethoscope className="h-5 w-5" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-extrabold text-slate-900 tracking-tight">
              {greeting}, {doctorName}
            </span>
            <span className="relative inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-600"></span>
              </span>
              <span>DPJP Aktif</span>
            </span>
          </div>
          <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono">
            <span className="font-semibold text-teal-800 shrink-0">{department}</span>
            <span className="text-slate-400 shrink-0">•</span>
            <span className="text-slate-600 font-medium shrink-0">{roomName}</span>
          </div>
        </div>
      </div>

      {/* Right: Real-time Shift Summary & Quick Call Action */}
      <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-auto">
        {/* Queue Metrics Chip */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs text-slate-700 transition-colors duration-200 hover:border-teal-300">
          <Users className="h-3.5 w-3.5 text-teal-700 shrink-0" />
          <span className="font-semibold text-xs">
            {waitingCount > 0 ? (
              <>
                <strong className="text-amber-800 font-extrabold font-mono text-sm transition-all duration-300">{waitingCount}</strong>{" "}
                <span className="text-slate-700">Menunggu</span>
              </>
            ) : inProgressCount > 0 ? (
              <>
                <strong className="text-teal-800 font-bold">{inProgressCount}</strong>{" "}
                <span className="text-slate-700">Sedang Diperiksa</span>
              </>
            ) : finishedCount > 0 ? (
              <span className="text-emerald-700 font-bold">Semua Selesai ({finishedCount})</span>
            ) : (
              <span className="text-slate-500 font-medium">0 Antrean</span>
            )}
          </span>
        </div>

        {/* Quick Call Next Button */}
        {nextWaitingPatient && onCallNextPatient && (
          <Button
            size="sm"
            onClick={onCallNextPatient}
            className="h-9 px-3.5 text-xs font-bold gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-xs cursor-pointer btn-press transition-all duration-200 hover:shadow-sm"
          >
            <Volume2 className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110" />
            <span>Panggil Antrean {nextWaitingPatient.queueNumber}</span>
          </Button>
        )}

        {/* View Worklist Button */}
        {onOpenWorklist && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenWorklist}
            className="h-9 px-3 text-xs font-semibold gap-1 bg-white border-slate-200 text-slate-700 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-200 cursor-pointer btn-press transition-all duration-200"
          >
            <span>Daftar Antrean</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
