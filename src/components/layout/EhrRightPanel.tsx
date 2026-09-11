"use client";

import React, { useState } from "react";
import {
  Heart,
  Activity,
  Thermometer,
  Percent,
  ShieldCheck,
  CheckCircle2,
  Printer,
  Code2,
  RefreshCw,
  Copy,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  Send,
  Lock,
  AlertCircle,
  Layers,
  ChevronRight,
  Pill,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AuthSession,
  OutpatientEncounter,
  PatientProfile,
  VitalSigns,
} from "@/lib/satusehat/types";
import { toast } from "sonner";
import { SatusehatFhirDetailModal } from "@/components/compliance/SatusehatFhirDetailModal";

interface EhrRightPanelProps {
  vitals?: VitalSigns;
  encounter: OutpatientEncounter;
  session: AuthSession | null;
  patient?: PatientProfile;
  onOpenPrintModal: () => void;
  onOpenPrescriptionPrint?: () => void;
  onOpenLockModal?: () => void;
  onOpenCodeSnippet?: () => void;
  onRefreshToken?: () => void;
  isRefreshing?: boolean;
  onSelectiveRetry?: (targetTypes?: string[]) => Promise<void> | void;
  onSimulatePartialDrop?: () => void;
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
  onOpenCodeSnippet,
  onRefreshToken,
  isRefreshing = false,
  onSelectiveRetry,
  onSimulatePartialDrop,
  isRetrying = false,
}: EhrRightPanelProps) {
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const isBpWarning = Boolean(
    vitals?.systolic &&
      vitals?.diastolic &&
      (vitals.systolic >= 130 || vitals.diastolic >= 85)
  );

  const isSynced = encounter.syncStatus === "synced";
  const isPartialFailed = encounter.syncStatus === "partial_failed";
  const isOptOut = encounter.consentStatus === "opt-out";

  const totalBreakdown = encounter.syncBreakdown || [];
  const syncedCount = totalBreakdown.filter((i) => i.status === "synced").length || (isSynced ? 9 : isOptOut ? 2 : 7);
  const failedCount = totalBreakdown.filter((i) => i.status === "failed").length || (isPartialFailed ? 2 : 0);
  const totalCount = totalBreakdown.length > 0 ? totalBreakdown.length : 9;

  const allergies = patient?.allergies && patient.allergies.length > 0 ? patient.allergies : [];

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
          <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
            Klinik DPJP
          </span>
        </div>

        <div className="space-y-2">
          <Button
            type="button"
            variant="medical"
            onClick={onOpenPrintModal}
            className="w-full justify-center text-xs font-bold gap-2 h-9 shadow-sm btn-press transition-all duration-200 hover:shadow-md cursor-pointer"
          >
            <Printer className="h-4 w-4 transition-transform duration-200 group-hover:scale-105" />
            <span>Cetak Lembar Resume Medis</span>
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenPrescriptionPrint}
              className="text-[11px] font-semibold h-8 bg-white border-slate-200 hover:bg-teal-50 hover:text-teal-700 gap-1.5 btn-press transition-all duration-150 cursor-pointer"
            >
              <Pill className="h-3.5 w-3.5 text-teal-600" />
              <span>Cetak E-Resep</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenLockModal}
              className="text-[11px] font-semibold h-8 bg-white border-slate-200 hover:bg-slate-100 gap-1.5 btn-press transition-all duration-150 cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5 text-slate-700" />
              <span>Kunci / Addendum</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Quick Vitals Summary */}
      <div className="ehr-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
            <Activity className="h-3.5 w-3.5 text-teal-600 animate-heartbeat" />
            <span>Ringkasan TTV Pasien</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Hari Ini</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* BP */}
          <div
            className={`p-2.5 rounded-lg border card-interactive ${
              (vitals?.systolic ?? 0) >= 140 || (vitals?.diastolic ?? 0) >= 90
                ? "bg-rose-50/80 border-rose-200 text-rose-900"
                : isBpWarning
                ? "bg-amber-50/80 border-amber-200 text-amber-900"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <span className="text-[10px] text-slate-500 font-semibold block">
              Tensi (BP)
            </span>
            <span className="text-base font-extrabold font-mono text-slate-900">
              {vitals?.systolic && vitals?.diastolic
                ? `${vitals.systolic}/${vitals.diastolic}`
                : "-"}
            </span>
            <span
              className={`text-[10px] font-bold block mt-0.5 ${
                (vitals?.systolic ?? 0) >= 140 || (vitals?.diastolic ?? 0) >= 90
                  ? "text-rose-800 font-extrabold"
                  : isBpWarning
                  ? "text-amber-800 font-extrabold"
                  : vitals?.systolic
                  ? "text-emerald-700"
                  : "text-slate-400"
              }`}
            >
              {(vitals?.systolic ?? 0) >= 140 || (vitals?.diastolic ?? 0) >= 90
                ? "Hipertensi"
                : isBpWarning
                ? "Pre-Hipertensi"
                : (vitals?.systolic ?? 0) > 0
                ? "Normal / Optimal"
                : "Belum Diukur"}
            </span>
          </div>

          {/* Heart Rate */}
          <div
            className={`p-2.5 rounded-lg border card-interactive ${
              (vitals?.heartRate ?? 0) > 100
                ? "bg-rose-50/80 border-rose-200"
                : (vitals?.heartRate ?? 0) > 0 && (vitals?.heartRate ?? 0) < 60
                ? "bg-amber-50/80 border-amber-200"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <span className="text-[10px] text-slate-500 font-semibold block flex items-center justify-between">
              <span>Nadi (HR)</span>
              <Heart className="h-2.5 w-2.5 text-rose-500 animate-heartbeat" />
            </span>
            <span className="text-base font-extrabold font-mono text-slate-900">
              {vitals?.heartRate || "-"}
            </span>
            <span
              className={`text-[10px] font-bold block mt-0.5 ${
                (vitals?.heartRate ?? 0) > 100
                  ? "text-rose-700 font-extrabold"
                  : (vitals?.heartRate ?? 0) > 0 && (vitals?.heartRate ?? 0) < 60
                  ? "text-amber-800"
                  : vitals?.heartRate
                  ? "text-emerald-700"
                  : "text-slate-400"
              }`}
            >
              {(vitals?.heartRate ?? 0) > 100
                ? "Takikardia"
                : (vitals?.heartRate ?? 0) > 0 && (vitals?.heartRate ?? 0) < 60
                ? "Bradikardia"
                : (vitals?.heartRate ?? 0) > 0
                ? "bpm (Reguler)"
                : "Belum Diukur"}
            </span>
          </div>

          {/* Temp */}
          <div
            className={`p-2.5 rounded-lg border card-interactive ${
              (vitals?.temperature ?? 0) > 37.5
                ? "bg-rose-50/80 border-rose-200"
                : (vitals?.temperature ?? 0) > 0 && (vitals?.temperature ?? 0) < 36.0
                ? "bg-sky-50/80 border-sky-200"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <span className="text-[10px] text-slate-500 font-semibold block">
              Suhu Tubuh
            </span>
            <span className="text-base font-extrabold font-mono text-slate-900">
              {vitals?.temperature ? `${vitals.temperature}°C` : "-"}
            </span>
            <span
              className={`text-[10px] font-bold block mt-0.5 ${
                (vitals?.temperature ?? 0) > 37.5
                  ? "text-rose-700 font-extrabold"
                  : (vitals?.temperature ?? 0) > 0 && (vitals?.temperature ?? 0) < 36.0
                  ? "text-sky-800"
                  : vitals?.temperature
                  ? "text-emerald-700"
                  : "text-slate-400"
              }`}
            >
              {(vitals?.temperature ?? 0) > 37.5
                ? "Febris (Demam)"
                : (vitals?.temperature ?? 0) > 0 && (vitals?.temperature ?? 0) < 36.0
                ? "Hipotermia"
                : (vitals?.temperature ?? 0) > 0
                ? "Afebris (Normal)"
                : "Belum Diukur"}
            </span>
          </div>

          {/* SpO2 */}
          <div
            className={`p-2.5 rounded-lg border card-interactive ${
              (vitals?.oxygenSaturation ?? 0) > 0 && (vitals?.oxygenSaturation ?? 0) < 95
                ? "bg-rose-50/80 border-rose-200"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <span className="text-[10px] text-slate-500 font-semibold block">
              SpO2 Oksigen
            </span>
            <span className="text-base font-extrabold font-mono text-slate-900">
              {vitals?.oxygenSaturation ? `${vitals.oxygenSaturation}%` : "-"}
            </span>
            <span
              className={`text-[10px] font-bold block mt-0.5 ${
                (vitals?.oxygenSaturation ?? 0) > 0 && (vitals?.oxygenSaturation ?? 0) < 95
                  ? "text-rose-700 font-extrabold"
                  : vitals?.oxygenSaturation
                  ? "text-emerald-700"
                  : "text-slate-400"
              }`}
            >
              {(vitals?.oxygenSaturation ?? 0) > 0 && (vitals?.oxygenSaturation ?? 0) < 95
                ? "Hipoksia Ringan"
                : (vitals?.oxygenSaturation ?? 0) >= 95
                ? "Saturasi Baik"
                : "Belum Diukur"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Patient Safety & Clinical Alerts (High Clinical Value for Doctors) */}
      <div className="ehr-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
            <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
            <span>Kewaspadaan & Alergi</span>
          </div>
          <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
            Safety First
          </span>
        </div>

        <div className="space-y-2 text-xs">
          {allergies.length > 0 ? (
            <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-200 space-y-1">
              <span className="text-[10px] font-bold uppercase text-rose-800 tracking-wider block">
                Alergi Terdata:
              </span>
              <div className="flex flex-wrap gap-1">
                {allergies.map((allergy, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="bg-white text-rose-700 border-rose-300 font-bold text-[11px] shadow-2xs transition-transform duration-150 hover:scale-105"
                  >
                    ⚠️ {allergy}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-[11px] flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Tidak ada riwayat alergi obat dilaporkan.</span>
            </div>
          )}

          {isBpWarning && (
            <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2 animate-fade-in-up">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Perhatian:</strong> Tekanan darah sistolik di atas batas optimal (130 mmHg). Disarankan konfirmasi ulang sebelum tindakan.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 4. SATUSEHAT Cloud Integration Summary (With Selective Retry Trigger) */}
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
                : "bg-amber-50 text-amber-700 border-amber-200"
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
                    : "bg-amber-500"
                }`}
              />
            </span>
            <span>
              {isSynced
                ? "Terhubung"
                : isPartialFailed
                ? "Gangguan Parsial"
                : isOptOut
                ? "Opt-Out (Lokal)"
                : "Draf Lokal"}
            </span>
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-700">
              Bundle Resource FHIR:
            </span>
            <span
              className={`text-[11px] font-bold transition-all duration-300 ${
                isPartialFailed
                  ? "text-rose-700"
                  : isSynced
                  ? "text-emerald-700"
                  : "text-amber-700"
              }`}
            >
              {isPartialFailed
                ? `${syncedCount}/${totalCount} Terkirim (${failedCount} Gagal)`
                : isSynced
                ? `${syncedCount}/${totalCount} Terverifikasi`
                : "Draf Rekam Medis"}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono truncate">
            Encounter ID: {encounter.satusehatEncounterId || "ss-enc-89210-9941a"}
          </p>
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
            <span>{isRetrying ? "Mengirim Ulang..." : `Kirim Ulang ${failedCount} Resource Gagal`}</span>
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
            <span>Detail Interoperabilitas FHIR</span>
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5" />
        </Button>
      </div>

      {/* Interoperability FHIR Detail Modal */}
      <SatusehatFhirDetailModal
        isOpen={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        encounter={encounter}
        session={session}
        onOpenCodeSnippet={onOpenCodeSnippet}
        onRefreshToken={onRefreshToken}
        isRefreshing={isRefreshing}
        onSelectiveRetry={onSelectiveRetry}
        onSimulatePartialDrop={onSimulatePartialDrop}
        isRetrying={isRetrying}
      />
    </aside>
  );
}

