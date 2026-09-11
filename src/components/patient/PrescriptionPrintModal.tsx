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
import { Printer, Pill, QrCode, ShieldAlert, Activity } from "lucide-react";
import { PatientProfile, OutpatientEncounter } from "@/lib/satusehat/types";
import { printHtmlElement } from "@/lib/print/print-service";

interface PrescriptionPrintModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientProfile;
  encounter: OutpatientEncounter;
}

export function PrescriptionPrintModal({
  isOpen,
  onOpenChange,
  patient,
  encounter,
}: PrescriptionPrintModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (printAreaRef.current) {
      printHtmlElement(printAreaRef.current, {
        title: `Resep-${patient.mrn}-${encounter.id}`,
        pageType: "a4",
      });
    }
  };

  const currentDate = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-5 sm:p-6 overflow-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800">
        <DialogHeader className="no-print pb-3 border-b border-border/50 text-left pr-10">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Pill className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>Lembar Resep Dokter Resmi (E-Prescription)</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Pratinjau resep obat resmi terintegrasi standar Kamus Farmasi (KFA) SATUSEHAT.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={printAreaRef}
          className="printable-area flex-1 overflow-y-auto bg-white text-slate-900 p-6 sm:p-8 rounded-xl border border-slate-300 font-sans space-y-5 print:p-0 print:border-0 print:shadow-none"
        >
          {/* Letterhead */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-900">
                {encounter.doctorName}
              </h3>
              <p className="text-[11px] text-slate-600 font-mono">
                {encounter.doctorSip}
              </p>
              <p className="text-[10px] text-slate-500">
                {encounter.hospitalName} • {encounter.clinicDepartment}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 uppercase">
                SALINAN RESEP RESMI
              </span>
              <span className="text-[10px] text-slate-500 block mt-1">
                Tanggal: {currentDate}
              </span>
            </div>
          </div>

          {/* Patient Quick Data & Allergy Alert */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-[9px] text-slate-500 block">Nama Pasien:</span>
              <strong className="text-slate-900">{patient.name}</strong>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block">No. Rekam Medis:</span>
              <strong className="font-mono text-slate-900">{patient.mrn}</strong>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block">Tgl Lahir / JK:</span>
              <span>{patient.birthDate} ({patient.gender === "male" ? "L" : "P"})</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block">Penjamin:</span>
              <span className="font-semibold text-teal-700">{patient.paymentPayer || "BPJS Kesehatan"}</span>
            </div>
          </div>

          {/* Allergy Alert Warning */}
          {patient.allergies && patient.allergies.length > 0 && (
            <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-300 rounded text-amber-900 text-xs font-medium">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                <strong>PERHATIAN ALERGI PASIEN:</strong> {patient.allergies.join(", ")}
              </span>
            </div>
          )}

          {/* Classical Recipe / Prescription Items (R/) */}
          <div className="space-y-4 py-2">
            {encounter.prescriptions.map((p, idx) => (
              <div key={idx} className="border-b border-slate-200 pb-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-serif font-black text-slate-900 italic">
                    R/
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-slate-900 text-sm">
                        {p.medicationName} ({p.dosage})
                      </span>
                      <span className="font-mono font-bold text-xs text-slate-800">
                        No. {p.quantity} ({p.unit})
                      </span>
                    </div>
                    <div className="text-xs text-slate-700 italic pl-3 mt-0.5">
                      S. {p.frequency} - {p.timing}
                    </div>
                    <div className="text-[9px] font-mono text-slate-400 pl-3">
                      Kode KFA Kemenkes: {p.kfaCode}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Signature */}
          <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="h-12 w-12 bg-slate-900 text-white rounded p-1 flex items-center justify-center">
                <QrCode className="h-9 w-9 text-teal-400" />
              </div>
              <div className="text-[10px] text-slate-500">
                <span className="block font-semibold text-slate-800">
                  E-Prescription Tervalidasi
                </span>
                <span className="font-mono">
                  IHS-MED-{encounter.satusehatEncounterId ? encounter.satusehatEncounterId.slice(0, 8) : encounter.id}
                </span>
              </div>
            </div>

            <div className="text-center space-y-0.5">
              <span className="text-[10px] text-slate-500 block">
                Tanda Tangan Dokter Pemeriksa
              </span>
              <div className="h-10 flex items-center justify-center">
                <span className="font-serif italic text-teal-900 text-xs font-bold px-3 border-b border-slate-400">
                  {encounter.doctorName}
                </span>
              </div>
              <span className="text-[9px] text-slate-500 block font-mono">
                {encounter.doctorSip}
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
            <span>Cetak Resep</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
