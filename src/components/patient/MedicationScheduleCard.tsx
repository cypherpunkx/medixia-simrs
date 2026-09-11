"use client";

import React from "react";
import {
  Pill,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Info,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { PrescriptionItem } from "@/lib/satusehat/types";

interface MedicationScheduleCardProps {
  prescriptions: PrescriptionItem[];
}

export function MedicationScheduleCard({
  prescriptions,
}: MedicationScheduleCardProps) {
  return (
    <div className="ehr-card p-5 space-y-4">
      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
            <Pill className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">
              Resep Obat & Terapi Pulang
            </h3>
            <p className="text-[11px] text-slate-500">
              Standar Kamus Farmasi dan Alat Kesehatan (KFA) Kemenkes RI
            </p>
          </div>
        </div>

        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
          {prescriptions.length} Resep Terdaftar
        </span>
      </div>

      {/* Prescription Items */}
      {prescriptions.length === 0 ? (
        <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-1.5 bg-slate-50/50">
          <Pill className="h-7 w-7 text-slate-400 mx-auto" />
          <p className="text-xs font-semibold text-slate-700">
            Belum Ada Terapi Obat / Resep Pulang
          </p>
          <p className="text-[11px] text-slate-400">
            Resep obat KFA yang diresepkan oleh dokter DPJP pada kunjungan ini akan tampil di sini.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {prescriptions.map((med, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 transition-all hover:bg-slate-50/90"
            >
            {/* Medication Info Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 border border-teal-200 mt-0.5">
                  <Pill className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    {med.medicationName}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 font-mono mt-0.5">
                    <span>Dosis: <strong className="text-slate-800">{med.dosage}</strong></span>
                    <span>•</span>
                    <span>Bentuk: {med.form}</span>
                    <span>•</span>
                    <span>Jumlah: {med.quantity} {med.unit}</span>
                  </div>
                </div>
              </div>

              <span className="font-mono text-[11px] font-bold text-teal-800 bg-teal-100/80 px-2.5 py-1 rounded-md border border-teal-200 self-start sm:self-auto">
                KFA: {med.kfaCode}
              </span>
            </div>

            {/* Dosage Instructions & Daily Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
              {/* Frequency / Instructions */}
              <div className="rounded-xl bg-white p-3 border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  Aturan Pakai & Waktu
                </span>
                <div className="font-extrabold text-teal-800 text-xs">
                  {med.frequency}
                </div>
                <div className="text-[11px] text-slate-600">
                  Waktu: <strong className="text-slate-800 font-semibold">{med.timing}</strong>
                </div>
              </div>

              {/* Responsive 4-Time Pill Grid */}
              <div className="rounded-xl bg-white p-3 border border-slate-200 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    Jadwal Harian
                  </span>
                  <Clock className="h-3 w-3 text-slate-400" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
                  {/* Pagi - Sky Dawn */}
                  <div
                    className={`flex items-center justify-center gap-1.5 py-1 px-1.5 rounded-lg text-[11px] border transition-all ${
                      med.schedule.morning
                        ? "bg-sky-50 text-sky-900 font-bold border-sky-200 shadow-2xs"
                        : "bg-slate-50 text-slate-400 font-medium border-slate-200/80 opacity-60"
                    }`}
                  >
                    <Sunrise className={`h-3 w-3 shrink-0 ${med.schedule.morning ? "text-sky-600" : "text-slate-300"}`} />
                    <span>Pagi</span>
                  </div>

                  {/* Siang - Amber Sun */}
                  <div
                    className={`flex items-center justify-center gap-1.5 py-1 px-1.5 rounded-lg text-[11px] border transition-all ${
                      med.schedule.afternoon
                        ? "bg-amber-50 text-amber-900 font-bold border-amber-200 shadow-2xs"
                        : "bg-slate-50 text-slate-400 font-medium border-slate-200/80 opacity-60"
                    }`}
                  >
                    <Sun className={`h-3 w-3 shrink-0 ${med.schedule.afternoon ? "text-amber-600" : "text-slate-300"}`} />
                    <span>Siang</span>
                  </div>

                  {/* Sore - Sunset Orange */}
                  <div
                    className={`flex items-center justify-center gap-1.5 py-1 px-1.5 rounded-lg text-[11px] border transition-all ${
                      med.schedule.evening
                        ? "bg-orange-50 text-orange-900 font-bold border-orange-200 shadow-2xs"
                        : "bg-slate-50 text-slate-400 font-medium border-slate-200/80 opacity-60"
                    }`}
                  >
                    <Sunset className={`h-3 w-3 shrink-0 ${med.schedule.evening ? "text-orange-600" : "text-slate-300"}`} />
                    <span>Sore</span>
                  </div>

                  {/* Malam - Indigo Night */}
                  <div
                    className={`flex items-center justify-center gap-1.5 py-1 px-1.5 rounded-lg text-[11px] border transition-all ${
                      med.schedule.night
                        ? "bg-indigo-50 text-indigo-900 font-bold border-indigo-200 shadow-2xs"
                        : "bg-slate-50 text-slate-400 font-medium border-slate-200/80 opacity-60"
                    }`}
                  >
                    <Moon className={`h-3 w-3 shrink-0 ${med.schedule.night ? "text-indigo-600" : "text-slate-300"}`} />
                    <span>Malam</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Instruction / Catatan Farmasi */}
            {med.instructions && (
              <div className="rounded-xl bg-teal-50/70 border border-teal-200 p-2.5 text-xs text-slate-700 flex items-start gap-2">
                <Info className="h-3.5 w-3.5 text-teal-700 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-relaxed">
                  <strong className="text-teal-950 font-bold">Catatan Farmasi: </strong>
                  {med.instructions}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

