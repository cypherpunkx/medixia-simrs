"use client";

import React from "react";
import {
  FileText,
  Activity,
  Pill,
  History,
  Stethoscope,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  User,
  Users,
  Heart,
  AlertTriangle,
  QrCode,
  Building,
  CheckCircle2,
  ChevronRight,
  UserPlus,
  FlaskConical,
  Tv,
  CreditCard,
  Ticket,
  Lock,
  Printer,
  UserCheck,
} from "lucide-react";
import { PatientProfile } from "@/lib/satusehat/types";
import { Badge } from "@/components/ui/badge";

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
  patient: PatientProfile;
  activeModule: EhrModule;
  onModuleChange: (mod: EhrModule) => void;
  onOpenQrModal: () => void;
  onOpenQueueDisplay?: () => void;
  onOpenQueueTicket?: () => void;
  onOpenPatientCard?: () => void;
  onOpenPrescriptionPrint?: () => void;
  onOpenLockModal?: () => void;
  waitingCount?: number;
  currentStatus?: "arrived" | "in-progress" | "finished" | "none";
  hasActivePatient?: boolean;
  activeDepartment?: string;
  queueNumber?: string;
  isBridgingActive?: boolean;
  onCallNextPatient?: () => void;
  onOpenRegistration?: () => void;
}

export function EhrLeftSidebar({
  patient,
  activeModule,
  onModuleChange,
  onOpenQrModal,
  onOpenQueueDisplay,
  onOpenQueueTicket,
  onOpenPatientCard,
  onOpenPrescriptionPrint,
  onOpenLockModal,
  waitingCount,
  currentStatus = "in-progress",
  hasActivePatient = true,
  activeDepartment,
  queueNumber,
  isBridgingActive = false,
  onCallNextPatient,
  onOpenRegistration,
}: EhrLeftSidebarProps) {
  const birthYear = new Date(patient.birthDate).getFullYear();
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;

  // 1. Loket & Antrean (Front Desk & Triage)
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
      sublabel: "Registrasi & Antrean Live",
      icon: UserPlus,
      badge: typeof waitingCount === "number" ? `${waitingCount} Antrean` : "Loket",
    },
  ];

  // 2. Asuhan Klinis & DPJP (Pemeriksaan & Tindakan Medis)
  const clinicalCareNavItems: Array<{
    id: EhrModule;
    label: string;
    sublabel: string;
    icon: React.ElementType;
    badge?: string;
  }> = [
    {
      id: "entry",
      label: "Input Rekam Medis (SOAP)",
      sublabel: "Pemeriksaan, Diagnosis & Tindakan",
      icon: Stethoscope,
      badge: "DPJP",
    },
    {
      id: "vitals",
      label: "Pemeriksaan Fisik & TTV",
      sublabel: "Tensi, Nadi, Suhu, Pernapasan",
      icon: Activity,
    },
    {
      id: "diagnostic",
      label: "Penunjang Lab & Radiologi",
      sublabel: "Order & Hasil Pemeriksaan",
      icon: FlaskConical,
      badge: "Lab/Rad",
    },
    {
      id: "prescriptions",
      label: "Resep & Terapi Farmasi",
      sublabel: "E-Resep & Terapi Pulang",
      icon: Pill,
    },
  ];

  // 3. Ringkasan & Histori Rekam Medis (Review & Arsip)
  const summaryNavItems: Array<{
    id: EhrModule;
    label: string;
    sublabel: string;
    icon: React.ElementType;
    badge?: string;
  }> = [
    {
      id: "resume",
      label: "Resume Medis Pasien",
      sublabel: "Ringkasan Terintegrasi 1 Layar",
      icon: FileText,
      badge: "Utama",
    },
    {
      id: "history",
      label: "Riwayat Kunjungan Poli",
      sublabel: "Timeline Rekam Medis",
      icon: History,
    },
  ];

  // 4. Pengaturan & Bridging Faskes
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
      sublabel: "Koneksi Sistem SATUSEHAT",
      icon: KeyRound,
      badge: "Admin / IT",
    },
  ];

  return (
    <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
      {/* 1. Patient Mini Snapshot Card with Dynamic States */}
      {!hasActivePatient || !patient?.id ? (
        /* STATE 1: Belum Ada Pasien Aktif / Antrean Kosong */
        <div className="ehr-card p-4 space-y-3 bg-gradient-to-b from-slate-50/90 to-slate-100/60 border border-dashed border-slate-300">
          <div className="flex items-start gap-3">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-500 font-bold text-base shadow-inner">
              <Users className="h-6 w-6 text-slate-400" />
              <div
                className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white"
                title="Poli Siap Melayani"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              </div>
            </div>

            <div className="space-y-0.5 overflow-hidden flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
                  Poli Standby
                </span>
              </div>
              <h3 className="font-bold text-sm text-slate-800 truncate">
                Belum Ada Pasien Aktif
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                {activeDepartment || "Poli Rawat Jalan"}
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-white/80 border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
            <p className="leading-snug">
              Ruang periksa siap melayani pasien. Silakan panggil dari antrean loket atau daftarkan pasien baru.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenRegistration || (() => onModuleChange("registration"))}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Buka Antrean / Loket</span>
          </button>
        </div>
      ) : currentStatus === "none" ? (
        /* STATE 1B: Pasien Terdaftar Tapi Belum Masuk Antrean Hari Ini */
        <div className="ehr-card p-4 space-y-3 bg-white border border-slate-200 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white font-bold text-base shadow-sm">
              {patient.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
              <div
                className="absolute -bottom-1 -right-1 h-4.5 w-4.5 rounded-full bg-slate-500 border-2 border-white flex items-center justify-center text-white"
                title="Pasien Terdaftar"
              >
                <UserCheck className="h-3 w-3" />
              </div>
            </div>

            <div className="space-y-0.5 overflow-hidden flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 uppercase tracking-wide flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                  Belum Masuk Antrean
                </span>
              </div>
              <h3 className="font-bold text-sm text-slate-900 truncate">
                {patient.name}
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                <span>No. RM:</span>
                <strong className="text-slate-800">{patient.mrn.replace(/^RM-?/i, "")}</strong>
              </div>
            </div>
          </div>

          {/* Patient Key Bio */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
            <div className="bg-slate-50 p-2 rounded border border-slate-200/70">
              <span className="text-[9px] text-slate-400 uppercase font-semibold block">
                Usia / Gender
              </span>
              <span className="font-bold text-slate-800">
                {age} Thn ({patient.gender === "male" ? "L" : "P"})
              </span>
            </div>

            <div className="bg-slate-50 p-2 rounded border border-slate-200/70">
              <span className="text-[9px] text-slate-400 uppercase font-semibold block">
                Gol. Darah
              </span>
              <span className="font-bold text-red-600">Tipe {patient.bloodType}+</span>
            </div>
          </div>

          {/* Action to add into queue */}
          <div className="space-y-1.5 pt-1">
            <button
              type="button"
              onClick={onOpenRegistration || (() => onModuleChange("registration"))}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Daftarkan ke Antrean Poli</span>
            </button>

            <div className="flex items-center gap-1.5">
              {onOpenPatientCard && (
                <button
                  type="button"
                  onClick={onOpenPatientCard}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                >
                  <CreditCard className="h-3.5 w-3.5 text-teal-600" />
                  <span>Kartu Pasien</span>
                </button>
              )}
              <button
                type="button"
                onClick={onOpenQrModal}
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                title="Lihat QR Code Pasien"
              >
                <QrCode className="h-3.5 w-3.5 text-teal-600" />
              </button>
            </div>
          </div>
        </div>
      ) : currentStatus === "finished" ? (
        /* STATE 3: Pasien Selesai Ditangani / Finished */
        <div className="ehr-card p-4 space-y-3 bg-white border border-emerald-200 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white font-bold text-base shadow-sm">
              {patient.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
              <div
                className="absolute -bottom-1 -right-1 h-4.5 w-4.5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white"
                title="Selesai Diperiksa"
              >
                <CheckCircle2 className="h-3 w-3" />
              </div>
            </div>

            <div className="space-y-0.5 overflow-hidden flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-wide flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  Selesai Berobat • Final
                </span>
              </div>
              <h3 className="font-bold text-sm text-slate-900 truncate">
                {patient.name}
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                <span>No. RM:</span>
                <strong className="text-slate-800">{patient.mrn.replace(/^RM-?/i, "")}</strong>
              </div>
            </div>
          </div>

          {/* Patient Key Bio */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
            <div className="bg-slate-50 p-2 rounded border border-slate-200/70">
              <span className="text-[9px] text-slate-400 uppercase font-semibold block">
                Usia / Gender
              </span>
              <span className="font-bold text-slate-800">
                {age} Thn ({patient.gender === "male" ? "L" : "P"})
              </span>
            </div>

            <div className="bg-slate-50 p-2 rounded border border-slate-200/70">
              <span className="text-[9px] text-slate-400 uppercase font-semibold block">
                Gol. Darah
              </span>
              <span className="font-bold text-red-600">Tipe {patient.bloodType}+</span>
            </div>
          </div>

          {/* Finished CTA Actions */}
          <div className="space-y-1.5 pt-1">
            {onCallNextPatient && (
              <button
                type="button"
                onClick={onCallNextPatient}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                <span>Panggil Antrean Berikutnya</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onModuleChange("resume")}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
              >
                <FileText className="h-3.5 w-3.5 text-teal-600" />
                <span>Resume Medis</span>
              </button>
              <button
                type="button"
                onClick={onOpenQrModal}
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                title="Lihat QR Code Pasien"
              >
                <QrCode className="h-3.5 w-3.5 text-teal-600" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* STATE 2: Pasien Sedang Diperiksa / Menunggu */
        <div className="ehr-card p-4 space-y-3 bg-white">
          <div className="flex items-start gap-3">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white font-bold text-base shadow-sm">
              {patient.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
              {isBridgingActive ? (
                <div
                  className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white"
                  title="SATUSEHAT Terverifikasi (Live)"
                >
                  <ShieldCheck className="h-2.5 w-2.5" />
                </div>
              ) : (
                <div
                  className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center text-white"
                  title="Belum Terverifikasi SATUSEHAT"
                >
                  <ShieldAlert className="h-2.5 w-2.5" />
                </div>
              )}
            </div>

            <div className="space-y-0.5 overflow-hidden flex-1">
              <div className="flex items-center gap-1.5">
                {currentStatus === "in-progress" ? (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Sedang Diperiksa
                  </span>
                ) : (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wide flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Menunggu
                  </span>
                )}
                {queueNumber && (
                  <span className="text-[9px] font-bold font-mono px-1 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {queueNumber}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-sm text-slate-900 truncate">
                {patient.name}
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                <span>No. RM:</span>
                <strong className="text-slate-800">{patient.mrn.replace(/^RM-?/i, "")}</strong>
              </div>
              {isBridgingActive ? (
                <div className="flex items-center gap-1.5 text-[10px] text-teal-700 font-semibold">
                  <CheckCircle2 className="h-3 w-3 text-teal-600" />
                  <span>SATUSEHAT ID Terhubung (Live)</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onModuleChange("auth")}
                  className="flex items-center gap-1.5 text-[10px] text-amber-800 hover:text-amber-950 font-semibold cursor-pointer text-left group"
                  title="Pasien belum terverifikasi ke server SATUSEHAT. Klik untuk membuka menu Bridging."
                >
                  <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0 group-hover:animate-ping" />
                  <span className="underline decoration-amber-300 underline-offset-2">Belum Terverifikasi SATUSEHAT</span>
                </button>
              )}
            </div>
          </div>

          {/* Patient Key Bio */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
            <div className="bg-slate-50 p-2 rounded border border-slate-200/70">
              <span className="text-[9px] text-slate-400 uppercase font-semibold block">
                Usia / Gender
              </span>
              <span className="font-bold text-slate-800">
                {age} Thn ({patient.gender === "male" ? "L" : "P"})
              </span>
            </div>

            <div className="bg-slate-50 p-2 rounded border border-slate-200/70">
              <span className="text-[9px] text-slate-400 uppercase font-semibold block">
                Gol. Darah
              </span>
              <span className="font-bold text-red-600">Tipe {patient.bloodType}+</span>
            </div>
          </div>

          {/* Allergy Warning */}
          {patient.allergies.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-900 flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <div className="overflow-hidden">
                <strong className="font-bold block text-amber-950">Alergi Obat:</strong>
                <span className="text-[10px] leading-tight block truncate">
                  {patient.allergies.join(", ")}
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenQrModal}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
          >
            <QrCode className="h-3.5 w-3.5 text-teal-600" />
            <span>Lihat QR Code Pasien</span>
          </button>
        </div>
      )}

      {/* 2. Clinical & System Navigation Tree */}
      <nav className="ehr-card p-2 space-y-2">
        {/* Section 1: Loket & Antrean */}
        <div className="space-y-0.5">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Loket & Antrean</span>
            <span className="text-[9px] text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200 font-bold">
              Loket
            </span>
          </div>

          {queueNavItems.map((item) => {
            const isActive = activeModule === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onModuleChange(item.id)}
                className={`w-full flex items-center justify-between gap-2 p-2 rounded-xl text-left transition-all cursor-pointer ${
                  isActive
                    ? "bg-teal-600 text-white font-semibold shadow-xs"
                    : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
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

        {/* Section 2: Asuhan Klinis & DPJP */}
        <div className="pt-2 border-t border-slate-100 space-y-0.5">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Pelayanan Medis DPJP</span>
            <span className="text-[9px] text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200 font-bold">
              Klinis
            </span>
          </div>

          {clinicalCareNavItems.map((item) => {
            const isActive = activeModule === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onModuleChange(item.id)}
                className={`w-full flex items-center justify-between gap-2 p-2 rounded-xl text-left transition-all cursor-pointer ${
                  isActive
                    ? "bg-teal-600 text-white font-semibold shadow-xs"
                    : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
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
        <div className="pt-2 border-t border-slate-100 space-y-0.5">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Ringkasan & Histori</span>
            <span className="text-[9px] text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200 font-bold">
              Rekam Medis
            </span>
          </div>

          {summaryNavItems.map((item) => {
            const isActive = activeModule === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onModuleChange(item.id)}
                className={`w-full flex items-center justify-between gap-2 p-2 rounded-xl text-left transition-all cursor-pointer ${
                  isActive
                    ? "bg-teal-600 text-white font-semibold shadow-xs"
                    : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
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

        {/* Section 4: Pengaturan & Bridging Faskes */}
        <div className="pt-2 border-t border-slate-100 space-y-0.5">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Sistem & Bridging</span>
            <span className="text-[9px] text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 font-semibold">
              Faskes
            </span>
          </div>

          {systemNavItems.map((item) => {
            const isActive = activeModule === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onModuleChange(item.id)}
                className={`w-full flex items-center justify-between gap-2 p-2 rounded-xl text-left transition-all cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-teal-300 font-semibold shadow-xs"
                    : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      isActive
                        ? "bg-teal-500/20 text-teal-300"
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
                        isActive ? "text-slate-400" : "text-slate-400"
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
                        ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
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

      {/* 3. Quick Utility Shortcuts (Print & Queue TV) */}
      <div className="ehr-card p-3 space-y-2">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>Pintasan Operasional</span>
          <Printer className="h-3.5 w-3.5 text-slate-400" />
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-xs">
          {onOpenQueueDisplay && (
            <button
              type="button"
              onClick={onOpenQueueDisplay}
              className="col-span-2 p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-teal-300 font-bold flex items-center justify-between transition-colors text-[11px]"
            >
              <div className="flex items-center gap-1.5">
                <Tv className="h-3.5 w-3.5 text-teal-400" />
                <span>Display Antrean TV</span>
              </div>
              <Badge variant="outline" className="text-[8px] bg-teal-500/20 text-teal-300 border-teal-500/40 font-mono">
                SUARA
              </Badge>
            </button>
          )}

          {onOpenQueueTicket && (
            <button
              type="button"
              onClick={onOpenQueueTicket}
              className="p-2 rounded-lg bg-slate-50 hover:bg-teal-50 hover:text-teal-700 text-slate-700 font-semibold border border-slate-200 transition-colors flex items-center gap-1.5 text-[11px]"
            >
              <Ticket className="h-3.5 w-3.5 text-teal-600 shrink-0" />
              <span className="truncate">Karcis Antrean</span>
            </button>
          )}

          {onOpenPatientCard && (
            <button
              type="button"
              onClick={onOpenPatientCard}
              className="p-2 rounded-lg bg-slate-50 hover:bg-teal-50 hover:text-teal-700 text-slate-700 font-semibold border border-slate-200 transition-colors flex items-center gap-1.5 text-[11px]"
            >
              <CreditCard className="h-3.5 w-3.5 text-teal-600 shrink-0" />
              <span className="truncate">Kartu Pasien</span>
            </button>
          )}

          {onOpenPrescriptionPrint && (
            <button
              type="button"
              onClick={onOpenPrescriptionPrint}
              className="p-2 rounded-lg bg-slate-50 hover:bg-teal-50 hover:text-teal-700 text-slate-700 font-semibold border border-slate-200 transition-colors flex items-center gap-1.5 text-[11px]"
            >
              <Pill className="h-3.5 w-3.5 text-teal-600 shrink-0" />
              <span className="truncate">Cetak E-Resep</span>
            </button>
          )}

          {onOpenLockModal && (
            <button
              type="button"
              onClick={onOpenLockModal}
              className="p-2 rounded-lg bg-slate-50 hover:bg-teal-50 hover:text-teal-700 text-slate-700 font-semibold border border-slate-200 transition-colors flex items-center gap-1.5 text-[11px]"
            >
              <Lock className="h-3.5 w-3.5 text-teal-600 shrink-0" />
              <span className="truncate">Lock & Addendum</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. System Info & Compliance Footer */}
      <div className="ehr-card p-3 space-y-1 text-[11px] text-slate-500 bg-slate-50/50">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
          <ShieldCheck className="h-4 w-4 text-teal-600" />
          <span>Interoperabilitas Kemenkes</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Sesuai Permenkes No. 24/2022 tentang Rekam Medis Elektronik & FHIR HL7 R4.
        </p>
      </div>
    </aside>
  );
}
