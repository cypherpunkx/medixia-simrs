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
import { Printer, Pill, ShieldCheck, Clock, Calendar, CheckSquare, Square } from "lucide-react";
import { PharmacyWorklistItem } from "@/lib/db/repositories/pharmacy-repo";

import { printHtmlElement } from "@/lib/print/print-service";

interface EtiquettePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PharmacyWorklistItem | null;
  facilityName?: string;
  facilityAddress?: string;
}

export function EtiquettePrintModal({
  isOpen,
  onClose,
  item,
  facilityName = "RSUD MEDIXIA INTERNASIONAL",
  facilityAddress = "Jl. Sehat Prima No. 10, Jakarta Selatan • Telp: (021) 7891234",
}: EtiquettePrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!item) return null;

  const { prescription, patient, encounter } = item;
  const isOuterMedicine =
    prescription.etiquetteType === "blue" ||
    prescription.form.toLowerCase().includes("salep") ||
    prescription.form.toLowerCase().includes("tetes") ||
    prescription.form.toLowerCase().includes("injeksi") ||
    prescription.form.toLowerCase().includes("krim");

  const todayStr = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handlePrint = () => {
    if (!printRef.current) return;

    printHtmlElement(printRef.current, {
      title: `Etiket_${prescription.medicationName.replace(/\s+/g, "_")}_${patient.name.replace(/\s+/g, "_")}`,
      pageType: "thermal",
      customCss: `
        @page {
          size: 80mm auto;
          margin: 1mm 2mm;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          width: 100% !important;
          height: auto !important;
        }
        .print-container {
          max-width: 76mm !important;
          width: 76mm !important;
          margin: 0 auto !important;
          padding: 0 !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .etiquette-card {
          width: 100% !important;
          max-width: 76mm !important;
          margin: 0 auto !important;
          padding: 2.5mm !important;
          border-width: 1.5px !important;
          border-style: solid !important;
          border-color: ${isOuterMedicine ? "#2563eb" : "#0f766e"} !important;
          border-radius: 4px !important;
          box-sizing: border-box !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      `,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-5 sm:p-6 overflow-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800">
        <DialogHeader className="no-print pb-3 border-b border-border/50 text-left pr-10">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <div
              className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                isOuterMedicine
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                  : "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"
              }`}
            >
              <Pill className="h-3.5 w-3.5" />
            </div>
            <span>Pratinjau Etiket Obat</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Format Standar Kemenkes RI (Thermal Label 80×60mm).
          </DialogDescription>
        </DialogHeader>

        {/* Live Label Container */}
        <div className="printable-area flex-1 overflow-y-auto p-4 flex justify-center bg-slate-50/70 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800">
          <div
            ref={printRef}
            className={`w-[320px] etiquette-card bg-white rounded-lg p-3 shadow-sm border-2 ${
              isOuterMedicine ? "border-blue-600" : "border-teal-700"
            }`}
          >
            {/* Header Faskes */}
            <div
              className={`text-center pb-1.5 mb-1.5 border-b border-dashed ${
                isOuterMedicine ? "border-blue-300" : "border-teal-300"
              }`}
            >
              <h1 className="text-[11px] font-black uppercase tracking-wider text-slate-900 leading-tight">
                {facilityName}
              </h1>
              <p className="text-[8.5px] text-slate-500 mt-0.5 leading-tight">{facilityAddress}</p>
              <div className="mt-1">
                <span
                  className={`inline-block text-[8.5px] font-bold px-2 py-0.5 rounded ${
                    isOuterMedicine
                      ? "bg-blue-100 text-blue-800 border border-blue-200"
                      : "bg-teal-100 text-teal-800 border border-teal-200"
                  }`}
                >
                  {isOuterMedicine ? "OBAT LUAR (TIDAK DITELAN)" : "OBAT DALAM (ORAL)"}
                </span>
              </div>
            </div>

            {/* Identitas Pasien */}
            <div className="flex justify-between items-start text-[9.5px] pb-1.5 border-b border-slate-200 leading-snug">
              <div>
                <div className="text-[8.5px] text-slate-400 font-medium">PASIEN:</div>
                <div className="font-bold text-slate-800 text-[11px]">{patient.name}</div>
                <div className="text-[9.5px] text-slate-600 font-mono">
                  RM: {patient.mrn} • {patient.gender === "male" ? "L" : "P"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[8.5px] text-slate-400 font-medium">TANGGAL:</div>
                <div className="font-semibold text-slate-700 text-[9.5px]">{todayStr}</div>
                <div className="text-[8.5px] text-slate-500">{encounter.clinicDepartment}</div>
              </div>
            </div>

            {/* Nama Obat & Aturan Pakai */}
            <div className="my-1.5 text-center">
              <div className="text-[11.5px] font-black text-slate-900 tracking-tight leading-tight">
                {prescription.medicationName}
              </div>
              <div className="text-[9px] text-slate-500 leading-tight">
                Jumlah: <span className="font-bold text-slate-700">{prescription.quantity} {prescription.unit}</span>
              </div>

              {/* Box Instruksi Dosis */}
              <div
                className={`my-1 py-1 px-2.5 rounded-md font-black text-xs ${
                  isOuterMedicine
                    ? "bg-blue-50 text-blue-900 border border-blue-100"
                    : "bg-teal-50 text-teal-900 border border-teal-100"
                }`}
              >
                {prescription.frequency}
              </div>

              <div className="text-[10px] font-bold text-slate-700 leading-tight">
                {prescription.timing}
              </div>
            </div>

            {/* Checklist Jadwal Minum */}
            <div className="pt-1.5 border-t border-dashed border-slate-200 flex justify-between text-[8.5px] text-slate-600 font-medium">
              <div className="flex items-center gap-1">
                {prescription.schedule?.morning ? (
                  <CheckSquare className="h-3 w-3 text-teal-700 shrink-0" />
                ) : (
                  <Square className="h-3 w-3 text-slate-300 shrink-0" />
                )}
                <span>Pagi</span>
              </div>
              <div className="flex items-center gap-1">
                {prescription.schedule?.afternoon ? (
                  <CheckSquare className="h-3 w-3 text-teal-700 shrink-0" />
                ) : (
                  <Square className="h-3 w-3 text-slate-300 shrink-0" />
                )}
                <span>Siang</span>
              </div>
              <div className="flex items-center gap-1">
                {prescription.schedule?.evening ? (
                  <CheckSquare className="h-3 w-3 text-teal-700 shrink-0" />
                ) : (
                  <Square className="h-3 w-3 text-slate-300 shrink-0" />
                )}
                <span>Sore</span>
              </div>
              <div className="flex items-center gap-1">
                {prescription.schedule?.night ? (
                  <CheckSquare className="h-3 w-3 text-teal-700 shrink-0" />
                ) : (
                  <Square className="h-3 w-3 text-slate-300 shrink-0" />
                )}
                <span>Malam</span>
              </div>
            </div>

            {/* Footer Batch & Kadaluwarsa */}
            <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex justify-between text-[7.5px] text-slate-400">
              <div>
                Batch: <span className="font-mono text-slate-600">{prescription.batchNumber || "-"}</span>
              </div>
              <div>
                Exp: <span className="font-mono text-slate-600">{prescription.expiryDate || "-"}</span>
              </div>
              <div>Simpan di tempat sejuk & kering</div>
            </div>
          </div>
        </div>

        <DialogFooter className="no-print pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between sm:justify-between">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            <span>KFA: {prescription.kfaCode}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-semibold cursor-pointer"
            >
              Tutup
            </Button>
            <Button
              type="button"
              size="sm"
              className={`text-xs font-semibold gap-1.5 shadow-sm text-white cursor-pointer ${
                isOuterMedicine
                  ? "bg-blue-700 hover:bg-blue-800"
                  : "bg-teal-700 hover:bg-teal-800"
              }`}
              onClick={handlePrint}
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Cetak Etiket</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
