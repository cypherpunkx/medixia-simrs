"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Database,
  Lock,
  HeartPulse,
  Layers,
  FileCheck,
} from "lucide-react";
import { PatientProfile, OutpatientEncounter } from "@/lib/satusehat/types";

interface SatusehatSyncLoadingModalProps {
  isOpen: boolean;
  patient?: PatientProfile | null;
  encounter?: OutpatientEncounter | null;
  doctorName?: string;
  department?: string;
  isOptOut?: boolean;
  isLocalOnly?: boolean;
  isCorrectionMode?: boolean;
  onContinueInBackground?: () => void;
}

const SATUSEHAT_SYNC_STAGES = [
  {
    title: "Menyusun Bundle HL7 FHIR R4",
    desc: "Validasi kepatuhan data klinis SOAP sesuai Permenkes No. 24/2022",
    icon: Layers,
  },
  {
    title: "Autentikasi Gateway Kemenkes RI",
    desc: "Handshake enkripsi TLS 1.3 & validasi token OAuth 2.0 fasyankes",
    icon: ShieldCheck,
  },
  {
    title: "Sinkronisasi Data Klinis",
    desc: "Mengirim Encounter, Diagnosis ICD-10, Tindakan ICD-9, Obat KFA & TTV",
    icon: HeartPulse,
  },
  {
    title: "Verifikasi Respon & Rekam Medis",
    desc: "Menyimpan Composition & mengesahkan status kunjungan selesai",
    icon: FileCheck,
  },
];

const LOCAL_SAVE_STAGES = [
  {
    title: "Validasi Kelengkapan Rekam Medis",
    desc: "Memeriksa kelengkapan format SOAP dan diagnosa utama DPJP",
    icon: Layers,
  },
  {
    title: "Proteksi Hak Privasi Pasien (UU PDP)",
    desc: "Menerapkan preferensi privasi pasien (Opt-Out)",
    icon: Lock,
  },
  {
    title: "Penyimpanan Database Rekam Medis",
    desc: "Menyimpan seluruh catatan medis pasien ke basis data internal terenkripsi",
    icon: Database,
  },
  {
    title: "Finalisasi Resume Medis",
    desc: "Menyelesaikan status pelayanan rawat jalan pasien",
    icon: FileCheck,
  },
];

export function SatusehatSyncLoadingModal({
  isOpen,
  patient,
  encounter,
  doctorName,
  department,
  isOptOut = false,
  isLocalOnly = false,
  isCorrectionMode = false,
  onContinueInBackground,
}: SatusehatSyncLoadingModalProps) {
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const stages = isOptOut || isLocalOnly ? LOCAL_SAVE_STAGES : SATUSEHAT_SYNC_STAGES;

  // Dynamic progress stage progression animation
  useEffect(() => {
    if (!isOpen) {
      setActiveStageIndex(0);
      setElapsedSeconds(0);
      return;
    }

    const timerInterval = setInterval(() => {
      setElapsedSeconds((prev) => Math.round((prev + 0.1) * 10) / 10);
    }, 100);

    const stageInterval = setInterval(() => {
      setActiveStageIndex((prev) => (prev < stages.length - 1 ? prev + 1 : prev));
    }, 700);

    return () => {
      clearInterval(timerInterval);
      clearInterval(stageInterval);
    };
  }, [isOpen, stages.length]);

  if (!isOpen) return null;

  const currentPatientName = patient?.name || "Pasien";
  const currentMrn = patient?.mrn?.replace(/^RM-?/i, "") || "-";
  const currentDoctor = doctorName || encounter?.doctorName || "Dokter DPJP";
  const currentDept = department || encounter?.clinicDepartment || "Poliklinik Rawat Jalan";

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md w-[95vw] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-3xl animate-in fade-in zoom-in-95 duration-200"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Top Glowing Header (Compact & Sleek) */}
        <div
          className={`p-4 pb-3.5 text-center relative overflow-hidden shrink-0 ${
            isOptOut
              ? "bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white"
              : isCorrectionMode
              ? "bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 text-white"
              : "bg-gradient-to-b from-teal-700 via-teal-800 to-teal-900 text-white"
          }`}
        >
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          {/* Central Animated Holographic Orb */}
          <div className="relative mx-auto w-14 h-14 mb-2 flex items-center justify-center">
            {/* Outer Pulsing Waves */}
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-35 animate-ping ${
                isOptOut ? "bg-amber-400" : isCorrectionMode ? "bg-amber-300" : "bg-teal-300"
              }`}
            />
            {/* Rotating Outer Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/40 animate-[spin_6s_linear_infinite]" />
            <div className="absolute inset-1 rounded-full border border-white/20 animate-[spin_3s_linear_infinite_reverse]" />

            {/* Inner Core */}
            <div className="relative h-10 w-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/40 shadow-inner flex items-center justify-center text-white">
              {isOptOut ? (
                <Lock className="h-5 w-5 text-amber-300 animate-pulse" />
              ) : isCorrectionMode ? (
                <RefreshCw className="h-5 w-5 text-amber-200 animate-spin" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-emerald-300 animate-pulse" />
              )}
            </div>
          </div>

          {/* Title & Badge */}
          <div className="space-y-0.5 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-[9px] font-extrabold tracking-wider uppercase backdrop-blur-xs text-teal-100">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
              </span>
              <span>
                {isOptOut
                  ? "Penyimpanan Internal (UU PDP)"
                  : isCorrectionMode
                  ? "Pembaruan Rekam Medis"
                  : "Sinkronisasi SATUSEHAT"}
              </span>
            </div>

            <h3 className="text-sm font-extrabold tracking-tight text-white drop-shadow-xs">
              {isOptOut
                ? "Menyimpan Rekam Medis Internal..."
                : isCorrectionMode
                ? "Memperbarui Data & Sinkronisasi..."
                : "Menyinkronkan ke SATUSEHAT..."}
            </h3>

            <p className="text-[11px] text-white/80 font-medium max-w-xs mx-auto">
              {isOptOut
                ? "Menyimpan resume medis ke database internal"
                : "Mengirimkan resume medis ke SATUSEHAT"}
            </p>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {/* Patient Info Snippet */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-teal-100/70 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0 border border-teal-200">
                {currentPatientName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-slate-900 truncate text-xs">
                  {currentPatientName}
                </p>
                <p className="text-[10px] text-slate-500 font-mono truncate">
                  No. RM: <strong className="text-slate-700">{currentMrn}</strong> • {currentDept}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
                DPJP
              </span>
              <span className="text-[10px] font-bold text-slate-700 max-w-[110px] truncate block">
                {currentDoctor.split(",")[0]}
              </span>
            </div>
          </div>

          {/* Stepper Pipeline */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Progres Sinkronisasi</span>
              <span className="font-mono text-teal-700 font-bold">
                {elapsedSeconds.toFixed(1)} dtk
              </span>
            </div>

            {/* Stepper Items */}
            <div className="space-y-1.5">
              {stages.map((stg, idx) => {
                const isCompleted = idx < activeStageIndex;
                const isCurrent = idx === activeStageIndex;

                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 p-2 rounded-xl border transition-all duration-300 ${
                      isCurrent
                        ? "bg-teal-50/70 border-teal-300 shadow-2xs translate-x-0.5"
                        : isCompleted
                        ? "bg-slate-50/60 border-slate-200 text-slate-700"
                        : "bg-white border-transparent opacity-40 text-slate-400"
                    }`}
                  >
                    {/* Status Bullet */}
                    <div className="shrink-0 mt-0.5">
                      {isCompleted ? (
                        <div className="h-4.5 w-4.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                          <CheckCircle2 className="h-3 w-3" />
                        </div>
                      ) : isCurrent ? (
                        <div className="h-4.5 w-4.5 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-xs animate-pulse">
                          <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                        </div>
                      ) : (
                        <div className="h-4.5 w-4.5 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center text-[9px] font-bold">
                          {idx + 1}
                        </div>
                      )}
                    </div>

                    {/* Step Description */}
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-xs font-bold leading-tight ${
                            isCurrent
                              ? "text-teal-950"
                              : isCompleted
                              ? "text-slate-800"
                              : "text-slate-400"
                          }`}
                        >
                          {stg.title}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] font-extrabold text-teal-800 bg-teal-100 px-1.5 py-0.2 rounded-full shrink-0">
                            Memproses...
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 leading-snug">
                        {stg.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Animated Gradient Bar */}
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                isOptOut
                  ? "from-amber-400 via-amber-500 to-amber-600"
                  : "from-teal-500 via-emerald-500 to-teal-600"
              }`}
              style={{
                width: `${Math.min(100, Math.max(15, ((activeStageIndex + 1) / stages.length) * 100))}%`,
              }}
            />
          </div>

          {/* Non-Blocking Background Option for Fast Clinical Flow */}
          {onContinueInBackground && (
            <div className="pt-1 pb-1 text-center">
              <button
                type="button"
                onClick={onContinueInBackground}
                className="text-[11px] font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer hover:opacity-80 transition-opacity"
              >
                Lanjutkan Pelayanan Pasien Lainnya (Proses di Latar Belakang) &rarr;
              </button>
            </div>
          )}

          {/* Footer Security Badges */}
          <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100">
            <span className="flex items-center gap-1 font-semibold text-slate-500">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span>HL7 FHIR R4 Certified</span>
            </span>
            <span className="font-mono text-[9px] text-slate-400">
              TLS 1.3 • OAuth 2.0 Kemenkes
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
