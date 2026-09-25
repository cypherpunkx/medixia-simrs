"use client";

import React from "react";
import {
  Calendar,
  Building2,
  Stethoscope,
  FileCheck,
  CheckCircle2,
  Activity,
  HeartPulse,
  ShieldCheck,
  ChevronRight,
  ClipboardList,
  FlaskConical,
  Radio,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OutpatientEncounter } from "@/lib/satusehat/types";

interface OutpatientTimelineProps {
  encounters: OutpatientEncounter[];
  selectedEncounterId: string;
  onSelectEncounter: (id: string) => void;
}

export function OutpatientTimeline({
  encounters,
  selectedEncounterId,
  onSelectEncounter,
}: OutpatientTimelineProps) {
  // Deduplicate and filter out redundant drafts if real encounter exists
  const uniqueEncounters = React.useMemo(() => {
    if (!encounters || encounters.length === 0) return [];

    const hasReal = encounters.some((e) => !e.id.includes("-DRAFT"));
    const map = new Map<string, OutpatientEncounter>();

    for (const enc of encounters) {
      if (hasReal && enc.id.includes("-DRAFT")) {
        continue;
      }
      if (!map.has(enc.id)) {
        map.set(enc.id, enc);
      }
    }
    return Array.from(map.values());
  }, [encounters]);

  if (uniqueEncounters.length === 0) {
    return (
      <div className="ehr-card p-6 text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
          <Calendar className="h-6 w-6" />
        </div>
        <div className="max-w-sm mx-auto space-y-1">
          <h4 className="font-bold text-sm text-slate-800">
            Kunjungan Perdana (Belum Ada Riwayat Poli)
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Ini adalah kunjungan pertama pasien di faskes ini. Rekam medis akan tersimpan secara otomatis setelah dokter DPJP menyelesaikan pemeriksaan.
          </p>
        </div>
      </div>
    );
  }

  const current =
    uniqueEncounters.find((e) => e.id === selectedEncounterId) || uniqueEncounters[0];

  return (
    <div className="space-y-4">
      {/* Encounter Switcher Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-bold text-slate-500 shrink-0 flex items-center gap-1 mr-1">
          <Calendar className="h-3.5 w-3.5 text-teal-600" />
          <span>Riwayat Kunjungan:</span>
        </span>
        {uniqueEncounters.map((enc) => {
          const isSelected = enc.id === selectedEncounterId;
          const formattedDate = new Date(enc.visitDate).toLocaleDateString(
            "id-ID",
            {
              day: "numeric",
              month: "short",
              year: "numeric",
            }
          );

          return (
            <button
              key={enc.id}
              type="button"
              onClick={() => onSelectEncounter(enc.id)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all shrink-0 border ${
                isSelected
                  ? "bg-teal-600 text-white border-teal-600 shadow-xs font-bold"
                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    enc.encounterStatus === "finished"
                      ? "bg-emerald-400"
                      : enc.encounterStatus === "in-progress"
                      ? "bg-blue-400 animate-ping"
                      : "bg-amber-400"
                  }`}
                />
                <span>{enc.clinicDepartment}</span>
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                  isSelected
                    ? "bg-teal-800 text-teal-100"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {formattedDate}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Encounter Detailed Card (Clean White) */}
      {current && (
        <div className="ehr-card overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  {current.clinicDepartment}
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700 border border-teal-200">
                  <ShieldCheck className="h-3 w-3 text-teal-600" />
                  <span>Rawat Jalan (AMB)</span>
                </span>
                {current.encounterStatus === "finished" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>Selesai (Discharged)</span>
                  </span>
                )}
                {current.encounterStatus === "in-progress" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-300 animate-pulse">
                    <Activity className="h-3 w-3 text-blue-600" />
                    <span>Sedang Diperiksa (In-Progress)</span>
                  </span>
                )}
                {current.encounterStatus === "arrived" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                    <span>🟡 Menunggu di Poli</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{current.hospitalName}</span>
              </div>
            </div>

            <div className="flex flex-col sm:items-end text-xs">
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <Stethoscope className="h-3.5 w-3.5 text-teal-600" />
                <span>{current.doctorName}</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {current.doctorSip}
              </span>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-5 space-y-4">
            {/* 1. Anamnesis / Keluhan Pasien */}
            <div className="rounded-xl bg-teal-50/50 border border-teal-200 p-4 space-y-1.5">
              <span className="text-[11px] font-extrabold text-teal-900 uppercase tracking-wide flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-teal-700" />
                <span>Keluhan Utama & Anamnesis Pasien</span>
              </span>
              <p className="text-slate-900 text-xs font-bold leading-relaxed">
                "{current.chiefComplaint}"
              </p>
              <p className="text-slate-600 text-xs leading-relaxed pt-1 border-t border-teal-200/60">
                {current.anamnesis}
              </p>
            </div>

            {/* 2. Diagnosis Medis (ICD-10) */}
            <div className="space-y-2">
              <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                <FileCheck className="h-4 w-4 text-teal-600" />
                <span>Diagnosis Medis</span>
              </span>

              {current.diagnoses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center space-y-1">
                  <p className="text-xs font-semibold text-slate-700">
                    Belum Ada Diagnosis Medis
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Diagnosis ICD-10 akan tercatat setelah dokter DPJP melakukan asesmen klinis pada formulir SOAP.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {current.diagnoses.map((diag, idx) => (
                    <div
                      key={idx}
                      className={`rounded-xl p-3.5 border transition-all ${
                        diag.type === "primary"
                          ? "bg-teal-50/30 border-teal-200"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            diag.type === "primary"
                              ? "bg-teal-600 text-white"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {diag.type === "primary" ? "Diagnosis Utama" : "Diagnosis Sekunder"}
                        </span>
                        <span className="font-mono text-xs font-extrabold text-teal-800 bg-teal-100 px-2 py-0.5 rounded border border-teal-200">
                          ICD-10: {diag.code}
                        </span>
                      </div>
                      <h5 className="font-bold text-xs text-slate-900 mt-1">
                        {diag.patientFriendlyName}
                      </h5>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {diag.display}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Prosedur Medis (ICD-9-CM) */}
            {current.procedures.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <HeartPulse className="h-4 w-4 text-sky-600" />
                  <span>Tindakan &amp; Prosedur Medis</span>
                </span>

                <div className="space-y-1.5">
                  {current.procedures.map((proc, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 flex items-center justify-between text-xs gap-2"
                    >
                      <div>
                        <span className="font-bold text-slate-800 block">
                          {proc.display}
                        </span>
                        {proc.notes && (
                          <span className="text-[11px] text-slate-500 block">
                            {proc.notes}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded border border-sky-200 shrink-0">
                        ICD-9: {proc.code}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Pemeriksaan Penunjang (Laboratorium & Radiologi) */}
            {((current.labResults && current.labResults.length > 0) ||
              (current.radiologyResults && current.radiologyResults.length > 0) ||
              (current.diagnosticOrders && current.diagnosticOrders.length > 0)) && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                    <FlaskConical className="h-4 w-4 text-teal-600" />
                    <span>Pemeriksaan Penunjang (Laboratorium & Radiologi)</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {current.labResults && current.labResults.length > 0 && (
                      <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {current.labResults.length} Hasil Lab
                      </span>
                    )}
                    {current.radiologyResults && current.radiologyResults.length > 0 && (
                      <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {current.radiologyResults.length} Ekspertise Rad
                      </span>
                    )}
                  </div>
                </div>

                {/* Sub-block: Hasil Lab */}
                {current.labResults && current.labResults.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                    <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FlaskConical className="h-3.5 w-3.5 text-teal-600" />
                        <span>Hasil Pemeriksaan Laboratorium (LOINC)</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Standar Nilai Rujukan Patologi
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {current.labResults.map((lr) => (
                        <div
                          key={lr.id}
                          className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/60 transition-colors"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900">
                                {lr.testName}
                              </span>
                              <span className="text-[9px] font-mono font-bold text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                                {lr.testCode}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span>Kategori: {lr.category}</span>
                              <span>•</span>
                              <span>Rujukan: {lr.referenceRange} {lr.unit}</span>
                              {lr.performer && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-400">Oleh: {lr.performer}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                            <div className="text-right">
                              <span className="font-mono text-sm font-extrabold text-slate-900 block leading-tight">
                                {lr.value} <span className="text-xs font-normal text-slate-500">{lr.unit}</span>
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 border ${
                                lr.flag === "normal"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : lr.flag === "high"
                                  ? "bg-amber-50 text-amber-900 border-amber-300"
                                  : lr.flag === "low"
                                  ? "bg-blue-50 text-blue-900 border-blue-300"
                                  : "bg-rose-50 text-rose-900 border-rose-300 animate-pulse font-extrabold"
                              }`}
                            >
                              {lr.flag === "normal" ? "Normal" : lr.flag === "high" ? "High (Tinggi)" : lr.flag === "low" ? "Low (Rendah)" : "Critical (Kritis)"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub-block: Hasil Radiologi */}
                {current.radiologyResults && current.radiologyResults.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                    <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Radio className="h-3.5 w-3.5 text-blue-600" />
                        <span>Ekspertise Radiologi & Pencitraan Medis</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Hasil Baca Dokter Spesialis Radiologi
                      </span>
                    </div>
                    <div className="p-3.5 space-y-3 divide-y divide-slate-100">
                      {current.radiologyResults.map((rad, idx) => (
                        <div key={rad.id} className={idx > 0 ? "pt-3" : ""}>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase">
                                {rad.modality}
                              </span>
                              <h5 className="font-bold text-xs text-slate-900">
                                {rad.examName}
                              </h5>
                            </div>
                            <span className="text-[10px] font-medium text-slate-500">
                              {rad.radiologistName}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                                Deskripsi Temuan Klinis:
                              </span>
                              <p className="text-slate-700 leading-relaxed">
                                {rad.findings}
                              </p>
                            </div>

                            <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-200/80">
                              <span className="text-[10px] font-bold text-blue-900 uppercase block mb-0.5">
                                Kesimpulan Radiologis:
                              </span>
                              <p className="text-slate-900 font-semibold leading-relaxed">
                                {rad.conclusion}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. Rencana Tindak Lanjut & Jadwal Kontrol */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5 text-teal-600" />
                  <span>Rencana Tindak Lanjut & Edukasi Pasien</span>
                </span>
                {current.followUpPlan?.nextVisitDate && (
                  <span className="font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded border border-teal-200 text-[10px]">
                    Jadwal Kontrol:{" "}
                    {new Date(
                      current.followUpPlan.nextVisitDate
                    ).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>

              <p className="text-slate-800 leading-relaxed font-medium">
                {current.followUpPlan?.instruction || "Menunggu instruksi rencana tindak lanjut dari dokter DPJP."}
              </p>
            </div>

            {/* SATUSEHAT & SIMRS ID Interoperability Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
              <div className="flex flex-wrap items-center gap-3">
                {current.satusehatEncounterId ? (
                  <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                    <img
                      src="/satusehat-default-logo.svg"
                      alt="SATUSEHAT"
                      className="h-3.5 w-3.5 object-contain shrink-0"
                    />
                    <span>
                      SATUSEHAT ID:{" "}
                      <strong className="text-teal-700 font-bold font-mono">
                        {current.satusehatEncounterId}
                      </strong>
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-amber-800">
                    <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>
                      SATUSEHAT:{" "}
                      <span className="font-sans font-bold bg-amber-100/80 text-amber-900 px-2 py-0.5 rounded text-[10px] border border-amber-200">
                        Draf Internal (Belum Terkirim ke Kemenkes)
                      </span>
                    </span>
                  </div>
                )}

                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="text-slate-600">
                  ID Kunjungan: <strong className="text-slate-900 font-bold">{current.id}</strong>
                </span>
              </div>

              <span className="text-slate-600">
                Disposisi:{" "}
                <strong className="text-slate-800">
                  {current.encounterStatus === "finished" &&
                  (!current.dischargeDisposition || current.dischargeDisposition === "Menunggu Pelayanan Poli")
                    ? "Pulang Berobat Jalan"
                    : current.dischargeDisposition || "Dalam Pelayanan Poli"}
                </strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
