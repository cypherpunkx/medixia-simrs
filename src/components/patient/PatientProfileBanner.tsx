"use client";

import React, { useState } from "react";
import {
  User,
  QrCode,
  ShieldCheck,
  AlertTriangle,
  Phone,
  MapPin,
  Calendar,
  Heart,
  FileText,
  Printer,
  CheckCircle2,
  Share2,
  Lock,
  Unlock,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PatientProfile, OutpatientEncounter } from "@/lib/satusehat/types";
import { calculatePatientAge } from "@/lib/utils";
import { useClinicalStore } from "@/stores/useClinicalStore";
import { useUIStore } from "@/stores/useUIStore";
import {
  useSatusehatStore,
  selectIsBridgingActive,
} from "@/stores/useSatusehatStore";

interface PatientProfileBannerProps {
  patient?: PatientProfile | null;
  encounter?: OutpatientEncounter | null;
  onOpenPrintModal?: () => void;
  isBridgingActive?: boolean;
}

export function PatientProfileBanner({
  patient: propPatient,
  encounter: propEncounter,
  onOpenPrintModal: propOnOpenPrintModal,
  isBridgingActive: propIsBridgingActive,
}: PatientProfileBannerProps = {}) {
  // Zustand Store Fallbacks
  const storePatient = useClinicalStore((s) => s.patient);
  const storeEncounter = useClinicalStore(
    (s) => s.encounters.find((e) => e.id === s.selectedEncounterId) || null,
  );
  const storeOpenPrintModal = () =>
    useUIStore.getState().setModalOpen("isPrintModalOpen", true);
  const storeIsBridgingActive = useSatusehatStore(selectIsBridgingActive);

  const patient = propPatient !== undefined ? propPatient : storePatient;
  const encounter =
    propEncounter !== undefined ? propEncounter : storeEncounter;
  const onOpenPrintModal = propOnOpenPrintModal ?? storeOpenPrintModal;
  const isBridgingActive =
    propIsBridgingActive !== undefined
      ? propIsBridgingActive
      : storeIsBridgingActive;

  const matchingQueue = useClinicalStore((s) =>
    s.worklist.find(
      (w) =>
        (encounter?.id &&
          (w.encounterId === encounter.id || w.id === encounter.id)) ||
        (encounter?.registrationNumber &&
          w.registrationNumber === encounter.registrationNumber) ||
        (patient?.id && w.patient?.id === patient.id),
    ),
  );

  const displayRegNumber =
    encounter?.registrationNumber ||
    matchingQueue?.registrationNumber ||
    (encounter?.id && !encounter.id.startsWith("ENC-")
      ? encounter.id
      : undefined) ||
    encounter?.id ||
    "-";

  const [showQrModal, setShowQrModal] = useState(false);

  if (!patient || !patient.id) return null;

  const age = calculatePatientAge(patient.birthDate);

  const hasIhs = Boolean(
    patient.ihsNumber ||
    (patient.id &&
      patient.id.startsWith("P") &&
      !patient.id.startsWith("pat_")),
  );
  const displayIhs = patient.ihsNumber || (hasIhs ? patient.id : null);

  return (
    <div className="ehr-card p-5 space-y-3.5">
      {/* 1. Header: Patient Identity, Verified Status, Queue & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 rounded-xl bg-teal-600 text-white flex items-center justify-center font-extrabold text-base shadow-xs shrink-0">
            {patient.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight truncate">
                {patient.name}
              </h2>
              {patient.satusehatConsent === "opt-out" ? (
                <span
                  className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300 shrink-0 transition-all duration-150 hover:bg-amber-100/80"
                  title="Pasien memilih Opt-Out: Rekam medis disimpan internal RS, tidak dikirimkan ke cloud SATUSEHAT sesuai UU No. 27/2022"
                >
                  <Lock className="h-3 w-3 text-amber-700 shrink-0" />
                  <span>SATUSEHAT • Opt-Out (Internal)</span>
                </span>
              ) : isBridgingActive ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300 shrink-0 transition-all duration-150 hover:bg-emerald-100/80"
                  title="SATUSEHAT Terverifikasi & Pasien menyetujui Opt-In Cloud Kemenkes RI (Sesi Live Terhubung)"
                >
                  <img
                    src="/satusehat-default-logo.svg"
                    alt="SATUSEHAT"
                    className="h-3 w-3 object-contain shrink-0"
                  />
                  <span>SATUSEHAT</span>
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300 shrink-0 transition-all duration-150 hover:bg-amber-100/80"
                  title="Pasien belum terverifikasi ke server SATUSEHAT Kemenkes RI. Bridging belum aktif."
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                  <span>Belum Terverifikasi SATUSEHAT</span>
                </span>
              )}
              {encounter?.queueNumber && (
                <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-extrabold text-teal-900 border border-teal-200 font-mono shrink-0">
                  <span>Antrean {encounter.queueNumber}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons in Top Header */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQrModal(true)}
            className="h-8 text-xs font-semibold gap-1.5 bg-white border-slate-200 hover:bg-slate-50 btn-press transition-all duration-150 cursor-pointer"
          >
            <QrCode className="h-3.5 w-3.5 text-teal-600" />
            <span>QR Pasien</span>
          </Button>

          <Button
            variant="medical"
            size="sm"
            onClick={onOpenPrintModal}
            className="h-8 text-xs font-bold gap-1.5 shadow-sm btn-press transition-all duration-150 hover:shadow-md cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Cetak Resume</span>
          </Button>
        </div>
      </div>

      {/* 2. Structured Demographics & Clinical Context Bar (Super Bersih & Rapi) */}
      <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 space-y-2.5 shadow-2xs">
        {/* Uniform Metadata Grid Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {/* Tile 1: No. Reg */}
          <div
            title="Nomor Registrasi Kunjungan Poliklinik"
            className="bg-white border border-slate-200/90 rounded-lg px-2.5 py-1.5 shadow-2xs flex flex-col justify-center min-w-0"
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              No. Registrasi
            </span>
            <span className="font-mono font-bold text-xs text-teal-900 truncate">
              {displayRegNumber}
            </span>
          </div>

          {/* Tile 2: No. RM */}
          <div
            title="Nomor Rekam Medis Pasien"
            className="bg-white border border-slate-200/90 rounded-lg px-2.5 py-1.5 shadow-2xs flex flex-col justify-center min-w-0"
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              No. Rekam Medis
            </span>
            <span className="font-mono font-bold text-slate-900 truncate">
              {patient.mrn.replace(/^RM-?/i, "")}
            </span>
          </div>

          {/* Tile 3: NIK */}
          <div
            title="Nomor Induk Kependudukan (Dukcapil)"
            className="bg-white border border-slate-200/90 rounded-lg px-2.5 py-1.5 shadow-2xs flex flex-col justify-center min-w-0"
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              NIK KTP
            </span>
            <span className="font-mono font-bold text-xs text-slate-800 truncate">
              {patient.nik}
            </span>
          </div>

          {/* Tile 4: IHS SATUSEHAT */}
          <div
            title={
              hasIhs
                ? `Pasien Terdaftar di SATUSEHAT Kemkes RI (Nomor IHS: ${displayIhs})`
                : "Pasien belum memiliki nomor IHS SATUSEHAT. Silakan lakukan Verifikasi NIK."
            }
            className="bg-white border border-slate-200/90 rounded-lg px-2.5 py-1.5 shadow-2xs flex flex-col justify-center min-w-0"
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <img
                src="/satusehat-default-logo.svg"
                alt="SATUSEHAT"
                className="h-2.5 w-2.5 object-contain shrink-0"
              />
              <span>IHS SATUSEHAT</span>
            </span>
            <span className="font-mono font-bold text-xs text-slate-900 truncate">
              {displayIhs || "Belum Terdaftar"}
            </span>
          </div>

          {/* Tile 5: Usia & Gender */}
          <div
            title="Usia dan Jenis Kelamin Pasien"
            className="bg-white border border-slate-200/90 rounded-lg px-2.5 py-1.5 shadow-2xs flex flex-col justify-center min-w-0 col-span-2 sm:col-span-1"
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Usia & Gender
            </span>
            <span className="font-bold text-xs text-slate-900 truncate">
              {age} Tahun <span className="font-medium text-slate-500 text-[11px]">({patient.gender === "male" ? "Laki-laki" : "Perempuan"})</span>
            </span>
          </div>
        </div>

        {/* Status Alur Klinis & Kunci Medis Baris Bawah */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/70 text-xs flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {encounter?.encounterStatus === "in-progress" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                <span>Sedang Diperiksa</span>
              </span>
            )}
            {encounter?.encounterStatus === "finished" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span>Selesai Pelayanan</span>
              </span>
            )}
            {encounter?.encounterStatus === "arrived" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span>Menunggu Antrean</span>
              </span>
            )}
            {encounter?.isLocked ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-900 text-teal-300 px-2 py-0.5 text-[10px] font-bold border border-slate-700 shadow-2xs">
                <Lock className="h-3 w-3 text-teal-400" />
                <span>Terkunci (Final)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 text-amber-900 px-2 py-0.5 text-[10px] font-bold border border-amber-300 shadow-2xs">
                <Unlock className="h-3 w-3 text-amber-700" />
                <span>Terbuka (Draft)</span>
              </span>
            )}
            {((encounter?.labResults && encounter.labResults.length > 0) ||
              (encounter?.radiologyResults &&
                encounter.radiologyResults.length > 0)) && (
              <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 text-teal-900 px-2 py-0.5 text-[10px] font-bold border border-teal-200 shadow-2xs">
                <FlaskConical className="h-3 w-3 text-teal-600" />
                <span>
                  {encounter?.labResults?.length
                    ? `${encounter.labResults.length} Lab`
                    : ""}
                  {encounter?.labResults?.length &&
                  encounter?.radiologyResults?.length
                    ? " • "
                    : ""}
                  {encounter?.radiologyResults?.length
                    ? `${encounter.radiologyResults.length} Rad`
                    : ""}
                </span>
              </span>
            )}
          </div>

          {patient.paymentPayer && (
            <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded shadow-2xs">
              Penjamin: {patient.paymentPayer}
            </span>
          )}
        </div>
      </div>

      {/* Patient Key Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
        <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Golongan Darah
          </span>
          <div className="mt-0.5">
            <span className="font-extrabold text-red-600 text-sm block leading-tight">
              Tipe {patient.bloodType || "-"}
            </span>
            <span className="text-[10px] text-slate-500 font-medium block">
              Rhesus Positif (+)
            </span>
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Tanggal Lahir
          </span>
          <div className="mt-0.5">
            <span className="font-bold text-slate-900 text-xs block truncate">
              {new Date(patient.birthDate).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span className="text-[10px] text-slate-500 font-medium block">
              Usia {age} Tahun ({patient.gender === "male" ? "L" : "P"})
            </span>
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Kontak Darurat
            </span>
            {patient.emergencyContact?.relation && (
              <span className="text-[9px] font-semibold text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded shrink-0">
                {patient.emergencyContact.relation}
              </span>
            )}
          </div>
          <div className="min-w-0 mt-0.5">
            <span
              className="font-bold text-slate-900 text-xs truncate block"
              title={patient.emergencyContact?.name}
            >
              {patient.emergencyContact?.name || "-"}
            </span>
            {patient.emergencyContact?.phone ? (
              <div className="flex items-center gap-1.5 text-teal-700 font-mono font-bold text-[11px] mt-0.5">
                <Phone className="h-2.5 w-2.5 text-teal-600 shrink-0" />
                <span className="tracking-tight">
                  {patient.emergencyContact.phone}
                </span>
              </div>
            ) : (
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                Tidak ada no. telp
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Kunjungan & Poli Terakhir */}
        <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
              Kunjungan
            </span>
            <span className="text-[9px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded shrink-0">
              {patient.totalVisitsCount ? `${patient.totalVisitsCount}x Datang` : "Pasien Baru"}
            </span>
          </div>
          <div className="mt-0.5 min-w-0">
            <span
              className="font-bold text-slate-900 text-xs block truncate"
              title={patient.lastVisitDepartment || patient.lastVisitDiagnosis || "Poli Rawat Jalan"}
            >
              {patient.lastVisitDepartment || patient.lastVisitDiagnosis || "Poli Rawat Jalan"}
            </span>
            <span className="text-[10px] text-slate-500 font-medium block truncate">
              {patient.lastVisitDate
                ? (() => {
                    const d = new Date(patient.lastVisitDate);
                    return isNaN(d.getTime())
                      ? `Tgl: ${patient.lastVisitDate}`
                      : `Tgl: ${d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`;
                  })()
                : "Pemeriksaan Hari Ini"}
            </span>
          </div>
        </div>
      </div>

      {/* Allergy Alert */}
      {patient.allergies.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 flex items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2 text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong className="font-bold">Peringatan Alergi Obat: </strong>
              {patient.allergies.join(", ")}
            </span>
          </div>
          <span className="text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-900 shrink-0">
            Perhatian Khusus
          </span>
        </div>
      )}

      {/* QR Code Dialog */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="max-w-sm text-center p-6">
          <DialogHeader>
            <DialogTitle className="text-center text-base font-bold text-slate-900">
              QR Code Identitas SATUSEHAT
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-3 py-3">
            <div className="h-44 w-44 rounded-2xl bg-white p-3 border-2 border-slate-200 shadow-md flex items-center justify-center">
              <div className="h-full w-full bg-slate-900 rounded-xl flex flex-col items-center justify-center text-white text-[10px] font-mono p-2">
                <QrCode className="h-20 w-20 text-teal-400 mb-1" />
                <span>{patient.id}</span>
                <span className="text-[8px] text-slate-400">KEMENKES RI</span>
              </div>
            </div>
            <div className="space-y-0.5">
              <p className="font-bold text-sm text-slate-900">{patient.name}</p>
              <p className="text-xs text-slate-500 font-mono">
                NIK: {patient.nik}
              </p>
            </div>
            <p className="text-[11px] text-slate-500">
              Pindai QR ini pada mesin kiosk pendaftaran rumah sakit untuk
              verifikasi otomatis.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
