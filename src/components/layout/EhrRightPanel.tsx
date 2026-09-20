"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Printer,
  RefreshCw,
  AlertTriangle,
  Lock,
  Layers,
  ChevronRight,
  Pill,
  User,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AuthSession,
  OutpatientEncounter,
  PatientProfile,
  VitalSigns,
} from "@/lib/satusehat/types";
import { SatusehatFhirDetailModal } from "@/components/compliance/SatusehatFhirDetailModal";

interface EhrRightPanelProps {
  vitals?: VitalSigns;
  encounter?: OutpatientEncounter | null;
  session: AuthSession | null;
  patient?: PatientProfile | null;
  onOpenPrintModal: () => void;
  onOpenPrescriptionPrint?: () => void;
  onOpenLockModal?: () => void;
  onRefreshToken?: () => void;
  isRefreshing?: boolean;
  onSelectiveRetry?: (targetTypes?: string[]) => Promise<void> | void;
  isRetrying?: boolean;
}

export function EhrRightPanel({
  vitals,
  encounter,
  session,
  patient,
  onOpenPrintModal,
  onOpenPrescriptionPrint,
  onOpenLockModal,
  onRefreshToken,
  isRefreshing = false,
  onSelectiveRetry,
  isRetrying = false,
}: EhrRightPanelProps) {
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const isBpWarning = Boolean(
    vitals?.systolic &&
      vitals?.diastolic &&
      (vitals.systolic >= 130 || vitals.diastolic >= 85)
  );

  const hasSelectedPatient = Boolean(patient && patient.id);
  const hasSelectedEncounter = Boolean(encounter && encounter.id);

  const handlePrintResumeMedis = () => {
    if (!hasSelectedPatient) {
      toast.warning("Belum Ada Pasien Terpilih", {
        description:
          "Silakan pilih pasien dari daftar antrean terlebih dahulu untuk melihat dan mencetak lembar resume medis rawat jalan.",
        duration: 4500,
      });
      return;
    }
    if (!hasSelectedEncounter) {
      toast.warning("Belum Ada Rekam Medis Kunjungan", {
        description:
          "Pasien ini belum memiliki data pemeriksaan kunjungan aktif untuk dicetak sebagai resume medis.",
        duration: 4500,
      });
      return;
    }
    onOpenPrintModal();
  };

  const handlePrintPrescription = () => {
    if (!hasSelectedPatient) {
      toast.warning("Belum Ada Pasien Terpilih", {
        description:
          "Silakan pilih pasien dari daftar antrean terlebih dahulu untuk mencetak lembar e-resep farmasi.",
        duration: 4500,
      });
      return;
    }
    if (
      !hasSelectedEncounter ||
      !encounter?.prescriptions ||
      encounter.prescriptions.length === 0
    ) {
      toast.warning("Resep Obat Masih Kosong", {
        description:
          "Belum ada item obat yang diresepkan dokter pada rekam medis kunjungan pasien ini.",
        duration: 4500,
      });
      return;
    }
    if (onOpenPrescriptionPrint) {
      onOpenPrescriptionPrint();
    }
  };

  const handleOpenLockModal = () => {
    if (!hasSelectedPatient) {
      toast.warning("Belum Ada Pasien Terpilih", {
        description:
          "Silakan pilih pasien dari antrean terlebih dahulu untuk mengunci atau mencatat addendum rekam medis.",
        duration: 4500,
      });
      return;
    }
    if (!hasSelectedEncounter) {
      toast.warning("Belum Ada Rekam Medis Kunjungan", {
        description:
          "Pilih kunjungan pasien terlebih dahulu untuk mengunci atau mencatat addendum rekam medis.",
        duration: 4500,
      });
      return;
    }
    if (onOpenLockModal) {
      onOpenLockModal();
    }
  };

  const isSynced = encounter?.syncStatus === "synced";
  const isPartialFailed = encounter?.syncStatus === "partial_failed";
  const isOptOut = encounter?.consentStatus === "opt-out";

  const totalBreakdown = encounter?.syncBreakdown || [];
  const totalResources = totalBreakdown.length > 0 ? totalBreakdown.length : 18;
  const syncedResources = totalBreakdown.filter((i) => i.status === "synced").length || (isSynced ? 18 : 0);
  const failedResources = totalBreakdown.filter((i) => i.status === "failed").length || (isPartialFailed ? 2 : 0);

  // 9 Canonical Categories calculation
  const canonicalTypes = [
    "Consent",
    "Encounter",
    "Observation",
    "Condition",
    "Procedure",
    "AllergyIntolerance",
    "MedicationRequest",
    "CarePlan",
    "Composition",
  ];
  const failedCategoriesCount =
    totalBreakdown.length > 0
      ? canonicalTypes.filter((t) => {
          const matched = totalBreakdown.filter((i) => {
            if (t === "MedicationRequest") {
              return (
                i.resourceType === "MedicationRequest" ||
                i.resourceType === "Medication" ||
                i.resourceType === "MedicationDispense"
              );
            }
            if (t === "Observation") {
              return (
                i.resourceType === "Observation" ||
                i.resourceType === "DiagnosticReport" ||
                i.resourceType === "ServiceRequest"
              );
            }
            return i.resourceType === t;
          });
          return matched.some((i) => i.status === "failed");
        }).length
      : isPartialFailed
      ? 1
      : 0;

  const syncedCategoriesCount = isSynced
    ? 9
    : isPartialFailed
    ? Math.max(0, 9 - failedCategoriesCount)
    : 0;

  const handleQuickRetry = async () => {
    if (!onSelectiveRetry) return;
    const failedTypes = totalBreakdown
      .filter((i) => i.status === "failed" || i.status === "pending")
      .map((i) => i.resourceType);
    await onSelectiveRetry(failedTypes.length > 0 ? failedTypes : undefined);
  };

  return (
    <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
      {/* 1. Quick Actions Panel (Clinical Focus for DPJP) */}
      <div className="ehr-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
            Aksi Cepat Pelayanan
          </h4>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${
              hasSelectedPatient
                ? "text-teal-700 bg-teal-50 border-teal-200"
                : "text-slate-500 bg-slate-100 border-slate-200"
            }`}
          >
            {hasSelectedPatient ? "Klinik DPJP" : "Pilih Pasien"}
          </span>
        </div>

        <div className="space-y-2">
          <Button
            type="button"
            variant="medical"
            onClick={handlePrintResumeMedis}
            className={`w-full justify-center text-xs font-bold gap-2 h-9 shadow-sm btn-press transition-all duration-200 hover:shadow-md cursor-pointer ${
              !hasSelectedPatient ? "opacity-90 hover:opacity-100" : ""
            }`}
            title={
              !hasSelectedPatient
                ? "Pilih pasien terlebih dahulu dari antrean untuk mencetak resume medis"
                : "Cetak Lembar Resume Medis"
            }
          >
            <Printer className="h-4 w-4 transition-transform duration-200 group-hover:scale-105" />
            <span>Cetak Lembar Resume Medis</span>
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrintPrescription}
              className={`text-[11px] font-semibold h-8 bg-white border-slate-200 hover:bg-teal-50 hover:text-teal-700 gap-1.5 btn-press transition-all duration-150 cursor-pointer ${
                !hasSelectedPatient ? "opacity-90" : ""
              }`}
              title={
                !hasSelectedPatient
                  ? "Pilih pasien terlebih dahulu untuk mencetak e-resep"
                  : "Cetak E-Resep"
              }
            >
              <Pill className="h-3.5 w-3.5 text-teal-600" />
              <span>Cetak E-Resep</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenLockModal}
              className={`text-[11px] font-semibold h-8 bg-white border-slate-200 hover:bg-slate-100 gap-1.5 btn-press transition-all duration-150 cursor-pointer ${
                !hasSelectedPatient ? "opacity-90" : ""
              }`}
              title={
                !hasSelectedPatient
                  ? "Pilih pasien terlebih dahulu untuk mengunci rekam medis"
                  : "Kunci / Addendum"
              }
            >
              <Lock className="h-3.5 w-3.5 text-slate-700" />
              <span>Kunci / Addendum</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Clinical Alert (Only displayed when abnormal vitals or alerts exist) */}
      {isBpWarning && (
        <div className="ehr-card p-3.5 space-y-2 border-amber-200 bg-amber-50/50 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>Peringatan Klinis TTV</span>
            </div>
            <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
              Perhatian
            </span>
          </div>
          <p className="text-[11px] text-amber-900 leading-relaxed">
            Tekanan darah sistolik di atas batas optimal ({vitals?.systolic}/{vitals?.diastolic} mmHg). Disarankan evaluasi sebelum tindakan.
          </p>
        </div>
      )}

      {/* 4. SATUSEHAT Cloud Integration Summary (State-Aware & Clear Patient Context) */}
      <div className="ehr-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            <span>Integrasi SATUSEHAT</span>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors duration-200 ${
              isSynced
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : isPartialFailed
                ? "bg-rose-50 text-rose-700 border-rose-300"
                : isOptOut
                ? "bg-slate-100 text-slate-700 border-slate-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}
          >
            <span className="relative flex h-2 w-2">
              {isSynced && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              {isPartialFailed && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isSynced
                    ? "bg-emerald-500"
                    : isPartialFailed
                    ? "bg-rose-500"
                    : isOptOut
                    ? "bg-slate-400"
                    : "bg-blue-500"
                }`}
              />
            </span>
            <span>
              {isSynced
                ? "Tersinkron 100%"
                : isPartialFailed
                ? "Perlu Kirim Ulang"
                : isOptOut
                ? "Internal (Opt-Out)"
                : "Konsultasi Berlangsung"}
            </span>
          </span>
        </div>

        {/* Konteks Identitas Pasien & Poliklinik Aktif */}
        {patient ? (
          <div className="p-2.5 rounded-lg bg-teal-50/70 border border-teal-200/80 space-y-1">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <User className="h-3.5 w-3.5 text-teal-700 shrink-0" />
                <span className="text-xs font-black text-slate-900 truncate">
                  {patient.name}
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 shrink-0">
                RM: {patient.mrn.replace(/^RM-?/i, "")}
              </span>
            </div>
            <div className="text-[11px] text-teal-800 font-medium truncate flex items-center gap-1">
              <Building2 className="h-3 w-3 text-teal-600 shrink-0" />
              <span className="truncate">{encounter?.clinicDepartment || "Poli Rawat Jalan"}</span>
              {encounter?.doctorName && (
                <>
                  <span className="text-teal-400">•</span>
                  <span className="text-slate-600 truncate">{encounter.doctorName}</span>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 italic">
            Pilih salah satu pasien di antrean untuk mengelola data SATUSEHAT.
          </div>
        )}

        {/* State-Aware Content Box */}
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-700">
              Dokumen Rekam Medis:
            </span>
            <span
              className={`text-[11px] font-bold transition-all duration-300 ${
                isPartialFailed
                  ? "text-rose-700"
                  : isSynced
                  ? "text-emerald-700"
                  : "text-blue-700"
              }`}
            >
              {isPartialFailed
                ? `${syncedCategoriesCount}/9 Kategori (${syncedResources}/${totalResources} Resource)`
                : isSynced
                ? `9/9 Kategori Lengkap`
                : isOptOut
                ? "Disimpan Internal"
                : "9 Kategori Disiapkan"}
            </span>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed">
            {isSynced
              ? "Seluruh resume medis dan intervensi telah tervalidasi di SATUSEHAT Kemenkes."
              : isPartialFailed
              ? `${failedResources} resource tertunda. Sistem akan mengulang pengiriman otomatis via Outbox Queue.`
              : isOptOut
              ? "Pasien memilih tidak membagikan data ke platform nasional. Rekam medis tersimpan aman di sistem faskes."
              : "Data pemeriksaan otomatis dikonversi ke standar Kemenkes saat tombol Selesaikan ditekan."}
          </p>

          <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>ID Kunjungan Kemenkes:</span>
            <span className="font-bold text-slate-700 truncate max-w-[140px]">
              {encounter?.satusehatEncounterId || "Terbit Saat Finalisasi"}
            </span>
          </div>
        </div>

        {/* Quick Selective Retry Button if partial failure exists */}
        {isPartialFailed && onSelectiveRetry && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleQuickRetry}
            disabled={isRetrying}
            className="w-full text-xs font-bold h-8 gap-1.5 bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer btn-press transition-all duration-200"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : "transition-transform duration-200 group-hover:rotate-180"}`}
            />
            <span>{isRetrying ? "Mengirim Ulang..." : `Kirim Ulang ${failedResources} Resource Gagal`}</span>
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsDetailModalOpen(true)}
          className="w-full text-xs font-semibold h-8 bg-white border-slate-200 hover:bg-slate-50 text-teal-700 hover:text-teal-800 justify-between px-3 btn-press transition-all duration-150 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-teal-600" />
            <span>Rincian Rekam Medis Kemenkes (FHIR)</span>
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5" />
        </Button>
      </div>

      {/* Interoperability FHIR Detail Modal */}
      <SatusehatFhirDetailModal
        isOpen={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        encounter={encounter}
        patient={patient}
        session={session}
        onRefreshToken={onRefreshToken}
        isRefreshing={isRefreshing}
        onSelectiveRetry={onSelectiveRetry}
        isRetrying={isRetrying}
      />
    </aside>
  );
}

