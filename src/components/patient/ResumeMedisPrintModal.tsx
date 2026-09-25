"use client";

import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, QrCode, ShieldCheck, Activity } from "lucide-react";
import { OutpatientEncounter, PatientProfile } from "@/lib/satusehat/types";
import { printHtmlElement } from "@/lib/print/print-service";
import { useAuth } from "@/lib/auth/auth-context";

interface ResumeMedisPrintModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: PatientProfile | null;
  encounter?: OutpatientEncounter | null;
}

export function ResumeMedisPrintModal({
  isOpen,
  onOpenChange,
  patient,
  encounter,
}: ResumeMedisPrintModalProps) {
  const { facility, user } = useAuth();
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!patient || !encounter) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md p-6 bg-white rounded-2xl text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200">
            <Printer className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-base font-bold text-slate-900">
              Belum Ada Pasien Terpilih
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 leading-relaxed">
              Silakan pilih atau daftarkan pasien dari antrean poliklinik untuk melihat dan mencetak lembar resume medis rawat jalan.
            </DialogDescription>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs font-semibold px-5"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const activeHospitalName =
    facility?.name || encounter.hospitalName || "RS Umum Daerah Sehat Sejahtera";
  const activeOrgId =
    facility?.satusehatOrgId || encounter.hospitalOrgId || "10000004";
  const activeAddress =
    facility?.address || "Jl. Kesehatan Medika No. 45, Jakarta Pusat";
  const activePhone = facility?.phone || "021-5550199";
  const activeLicense =
    facility?.licenseNumber || "440/012/Dinkes/RS-B/2024";
  const isKlinik =
    facility?.type === "klinik_pratama" ||
    facility?.type === "klinik_utama" ||
    activeHospitalName.toLowerCase().includes("klinik");
  const isPuskesmas =
    facility?.type === "puskesmas" ||
    activeHospitalName.toLowerCase().includes("puskesmas");
  const facilityTypeLabel = isPuskesmas
    ? "PUSKESMAS"
    : isKlinik
    ? (facility?.type === "klinik_utama" ? "KLINIK UTAMA" : "KLINIK PRATAMA")
    : "RUMAH SAKIT UMUM";

  const activeDoctorName =
    encounter.doctorName ||
    (user?.role === "doctor" ? user.name : null) ||
    "Dokter DPJP";
  const activeDoctorSip =
    encounter.doctorSip ||
    (user?.role === "doctor" ? user.sip : null) ||
    "";

  const handlePrint = () => {
    if (printAreaRef.current) {
      printHtmlElement(printAreaRef.current, {
        title: `Resume-Medis-${patient.mrn}-${encounter.id}`,
        pageType: "a4",
      });
    }
  };

  const formattedVisitDate = new Date(encounter.visitDate).toLocaleDateString(
    "id-ID",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-5 sm:p-6 overflow-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800">
        <DialogHeader className="no-print pb-3 border-b border-border/50 text-left pr-10">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Printer className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>Dokumen Resmi Resume Medis Rawat Jalan</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Pratinjau resume medis elektronik terintegrasi standar SATUSEHAT Kemenkes RI.
          </DialogDescription>
        </DialogHeader>

        {/* Printable Paper Canvas */}
        <div
          ref={printAreaRef}
          className="printable-area flex-1 overflow-y-auto pr-2 bg-white text-slate-900 p-6 sm:p-8 rounded-xl border border-slate-200 font-sans space-y-6 print:p-0 print:border-0 print:shadow-none"
        >
          {/* Hospital Letterhead (KOP SURAT DINAMIS) */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`h-14 w-14 rounded-xl ${
                  isKlinik ? "bg-emerald-600" : "bg-teal-600"
                } text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0`}
              >
                <Activity className="h-8 w-8" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">
                    {activeHospitalName}
                  </h2>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      isKlinik
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-blue-100 text-blue-800 border border-blue-300"
                    }`}
                  >
                    {facilityTypeLabel}
                  </span>
                </div>
                <p className="text-[11px] text-slate-700">
                  {activeAddress} • Telp: {activePhone}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-500 font-mono">
                  <span>No. Izin Faskes: {activeLicense}</span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <img src="/satusehat-default-logo.svg" alt="SATUSEHAT" className="h-2.5 w-2.5 object-contain shrink-0" />
                    Kode Org SATUSEHAT: {activeOrgId}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 italic">
                  Pelayanan Rekam Medis Elektronik Terintegrasi SATUSEHAT Kemenkes RI
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded border border-teal-200 uppercase tracking-wider block">
                RESUME RAWAT JALAN
              </span>
              <span className="text-[10px] text-blue-800 font-mono font-bold mt-1 block">
                No. Reg: {encounter.registrationNumber || `RJ-${encounter.visitDate.split("T")[0].replace(/-/g, "")}-0001`}
              </span>
              <span className="text-[9px] text-slate-400 font-mono block">
                ID: {encounter.id}
              </span>
            </div>
          </div>

          {/* Patient Identity Block */}
          <div className="rounded-lg bg-slate-50 p-4 border border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-[10px] text-slate-500 block">Nama Pasien:</span>
              <strong className="text-slate-900 font-bold">{patient.name}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">No. Rekam Medis:</span>
              <strong className="text-slate-900 font-mono font-bold">
                {patient.mrn}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">No. Registrasi:</span>
              <strong className="text-blue-800 font-mono font-bold">
                {encounter.registrationNumber || `RJ-${encounter.visitDate.split("T")[0].replace(/-/g, "")}-0001`}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">NIK KTP:</span>
              <strong className="text-slate-900 font-mono">{patient.nik}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">SATUSEHAT ID:</span>
              <strong className="text-teal-700 font-mono">{patient.id}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Tanggal Lahir / Usia:</span>
              <span className="text-slate-900">
                {patient.birthDate} (
                {patient.gender === "male" ? "Laki-laki" : "Perempuan"})
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Gol. Darah:</span>
              <span className="text-red-700 font-bold">Tipe {patient.bloodType}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Alergi:</span>
              <span className="text-amber-800 font-semibold truncate block" title={patient.allergies.join(", ") || "Tidak ada riwayat alergi"}>
                {patient.allergies.join(", ") || "Tidak ada"}
              </span>
            </div>
          </div>

          {/* Clinical Encounter Summary */}
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-500 block">
                  Tanggal & Poli Pelayanan:
                </span>
                <span className="font-bold text-slate-900">
                  {formattedVisitDate} • {encounter.clinicDepartment}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">
                  Dokter Penanggung Jawab (DPJP):
                </span>
                <span className="font-bold text-slate-900">
                  {activeDoctorName}
                </span>
                <span className="text-[10px] text-slate-500 block font-mono">
                  {activeDoctorSip}
                </span>
              </div>
            </div>

            {/* Anamnesis */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wide text-slate-800 border-b border-slate-200 pb-1 mb-1.5">
                1. Anamnesis & Keluhan Utama
              </h4>
              <p className="text-slate-700 leading-relaxed pl-2 border-l-2 border-teal-500">
                {encounter.chiefComplaint}. {encounter.anamnesis}
              </p>
            </div>

            {/* Vitals Table */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wide text-slate-800 border-b border-slate-200 pb-1 mb-2">
                2. Tanda-Tanda Vital & Pemeriksaan Fisik
              </h4>
              {encounter.vitals && encounter.vitals.systolic ? (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-[11px]">
                  <div className="p-2 rounded bg-slate-100 border border-slate-200">
                    <span className="text-[9px] text-slate-500 block">Tensi (BP)</span>
                    <span className="font-bold font-mono">
                      {encounter.vitals.systolic}/{encounter.vitals.diastolic} mmHg
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-100 border border-slate-200">
                    <span className="text-[9px] text-slate-500 block">Nadi (HR)</span>
                    <span className="font-bold font-mono">
                      {encounter.vitals.heartRate} bpm
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-100 border border-slate-200">
                    <span className="text-[9px] text-slate-500 block">Suhu</span>
                    <span className="font-bold font-mono">
                      {encounter.vitals.temperature} °C
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-100 border border-slate-200">
                    <span className="text-[9px] text-slate-500 block">Napas (RR)</span>
                    <span className="font-bold font-mono">
                      {encounter.vitals.respiratoryRate} x/m
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-100 border border-slate-200">
                    <span className="text-[9px] text-slate-500 block">SpO2</span>
                    <span className="font-bold font-mono">
                      {encounter.vitals.oxygenSaturation} %
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-100 border border-slate-200">
                    <span className="text-[9px] text-slate-500 block">Berat / Tinggi</span>
                    <span className="font-bold font-mono">
                      {encounter.vitals.weightKg}kg / {encounter.vitals.heightCm}cm
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic pl-1">
                  Belum ada observasi tanda-tanda vital yang tercatat.
                </p>
              )}
            </div>

            {/* Diagnosis (ICD-10) */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wide text-slate-800 border-b border-slate-200 pb-1 mb-2">
                3. Diagnosis Medis (ICD-10)
              </h4>
              {encounter.diagnoses && encounter.diagnoses.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1">
                  {encounter.diagnoses.map((d, i) => (
                    <li key={i} className="text-slate-800">
                      <strong className="font-mono text-teal-800">
                        [{d.code}]
                      </strong>{" "}
                      {d.display} (
                      <span className="italic">{d.patientFriendlyName}</span>) -{" "}
                      <span className="font-semibold text-[10px] uppercase text-teal-700">
                        {d.type}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 italic pl-1">
                  Belum ada diagnosis medis ICD-10 yang diinputkan.
                </p>
              )}
            </div>

            {/* Procedures (ICD-9-CM) */}
            {encounter.procedures && encounter.procedures.length > 0 && (
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wide text-slate-800 border-b border-slate-200 pb-1 mb-2">
                  4. Tindakan & Prosedur Medis (ICD-9-CM)
                </h4>
                <ul className="list-disc pl-5 space-y-1">
                  {encounter.procedures.map((p, i) => (
                    <li key={i} className="text-slate-800">
                      <strong className="font-mono text-teal-800">
                        [{p.code}]
                      </strong>{" "}
                      {p.notes || p.display}{" "}
                      <span className="text-[10px] text-slate-500 font-medium">
                        ({p.category})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Diagnostic Support Results (Lab & Radiology) */}
            {((encounter.labResults && encounter.labResults.length > 0) ||
              (encounter.radiologyResults && encounter.radiologyResults.length > 0)) && (
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wide text-slate-800 border-b border-slate-200 pb-1 mb-2">
                  5. Pemeriksaan Penunjang (Laboratorium & Radiologi)
                </h4>

                {/* Lab Table */}
                {encounter.labResults && encounter.labResults.length > 0 && (
                  <div className="mb-2.5">
                    <span className="text-[10px] font-bold text-slate-700 block mb-1">
                      A. Hasil Laboratorium (LOINC):
                    </span>
                    <table className="w-full text-left text-[11px] border border-slate-200">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th className="p-1.5 border-b">Nama Pemeriksaan (LOINC)</th>
                          <th className="p-1.5 border-b">Hasil</th>
                          <th className="p-1.5 border-b">Nilai Rujukan</th>
                          <th className="p-1.5 border-b">Interpretasi Flag</th>
                          <th className="p-1.5 border-b">Pemeriksa / Lab</th>
                        </tr>
                      </thead>
                      <tbody>
                        {encounter.labResults.map((lr, i) => (
                          <tr key={i} className="border-b border-slate-100">
                            <td className="p-1.5 font-medium">
                              {lr.testName}
                              <span className="text-[9px] text-slate-500 block font-mono">
                                LOINC: {lr.testCode} • {lr.category}
                              </span>
                            </td>
                            <td className="p-1.5 font-bold font-mono">
                              {lr.value} {lr.unit}
                            </td>
                            <td className="p-1.5 text-slate-600 font-mono text-[10px]">
                              {lr.referenceRange} {lr.unit}
                            </td>
                            <td className="p-1.5">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                                  lr.flag === "normal"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : lr.flag === "high"
                                    ? "bg-amber-50 text-amber-900 border-amber-300"
                                    : lr.flag === "low"
                                    ? "bg-blue-50 text-blue-900 border-blue-300"
                                    : "bg-rose-50 text-rose-900 border-rose-300 font-extrabold"
                                }`}
                              >
                                {lr.flag === "normal"
                                  ? "Normal"
                                  : lr.flag === "high"
                                  ? "High (Tinggi)"
                                  : lr.flag === "low"
                                  ? "Low (Rendah)"
                                  : "Critical (Kritis)"}
                              </span>
                            </td>
                            <td className="p-1.5 text-[10px] text-slate-600">
                              {lr.performer || "Laboratorium RS"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Radiology Section */}
                {encounter.radiologyResults && encounter.radiologyResults.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-700 block mb-1">
                      B. Ekspertise Radiologi & Pencitraan Medis:
                    </span>
                    {encounter.radiologyResults.map((rad, i) => (
                      <div
                        key={i}
                        className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px] space-y-1"
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>
                            [{rad.modality}] {rad.examName}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {rad.radiologistName}
                          </span>
                        </div>
                        <p className="text-slate-700">
                          <strong>Temuan:</strong> {rad.findings}
                        </p>
                        <p className="text-slate-900 font-semibold bg-white p-1.5 rounded border border-slate-200">
                          <strong>Kesimpulan:</strong> {rad.conclusion}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Prescriptions */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wide text-slate-800 border-b border-slate-200 pb-1 mb-2">
                6. Terapi Obat Pulang (Kamus Farmasi Kemenkes)
              </h4>
              {encounter.prescriptions && encounter.prescriptions.length > 0 ? (
                <table className="w-full text-left text-[11px] border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="p-2 border-b">Nama Obat (KFA)</th>
                      <th className="p-2 border-b">Dosis & Bentuk</th>
                      <th className="p-2 border-b">Aturan Pakai</th>
                      <th className="p-2 border-b">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {encounter.prescriptions.map((m, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="p-2 font-medium">
                          {m.medicationName}
                          <span className="text-[9px] text-slate-400 block font-mono">
                            KFA: {m.kfaCode}
                          </span>
                        </td>
                        <td className="p-2">
                          {m.dosage} ({m.form})
                        </td>
                        <td className="p-2">
                          {m.frequency} - {m.timing}
                        </td>
                        <td className="p-2 font-mono">
                          {m.quantity} {m.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-slate-500 italic pl-1">
                  Tidak ada resep obat / terapi pulang yang diresepkan.
                </p>
              )}
            </div>

            {/* Plan of Care */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wide text-slate-800 border-b border-slate-200 pb-1 mb-1.5">
                7. Anjuran & Rencana Tindak Lanjut
              </h4>
              <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200">
                {encounter.followUpPlan?.instruction || "Menunggu instruksi rencana tindak lanjut dari dokter DPJP."}
                {encounter.followUpPlan?.nextVisitDate && (
                  <span className="block mt-1 font-bold text-teal-800">
                    Jadwal Kontrol Berikutnya:{" "}
                    {encounter.followUpPlan.nextVisitDate}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Signature & Verification Block */}
          <div className="pt-6 border-t border-slate-300 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 bg-slate-900 text-white rounded-lg flex flex-col items-center justify-center p-1 text-[8px] font-mono text-center">
                <QrCode className="h-8 w-8 text-teal-400" />
                <span>SATUSEHAT</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">
                  Verifikasi Rekam Medis Elektronik:
                </span>
                <span className="font-bold text-slate-900 font-mono text-[11px] block">
                  {encounter.satusehatEncounterId}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1.5">
                  <img src="/satusehat-default-logo.svg" alt="SATUSEHAT" className="h-3 w-3 object-contain shrink-0" />
                  <span>Tervalidasi di Platform Kemenkes RI</span>
                </span>
              </div>
            </div>

            <div className="text-center space-y-1">
              <span className="text-[10px] text-slate-500 block">
                Dokter Penanggung Jawab Pelayanan
              </span>
              <div className="h-12 flex items-center justify-center">
                <span className="font-serif italic text-teal-800 text-sm font-bold border-b border-slate-400 px-4">
                  {activeDoctorName}
                </span>
              </div>
              <span className="text-[10px] text-slate-600 block font-mono">
                {activeDoctorSip}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="no-print pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-row items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold cursor-pointer"
          >
            Tutup
          </Button>
          <Button
            type="button"
            variant="medical"
            size="sm"
            onClick={handlePrint}
            className="text-xs font-semibold gap-1.5 shadow-sm cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Cetak / Simpan PDF</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
