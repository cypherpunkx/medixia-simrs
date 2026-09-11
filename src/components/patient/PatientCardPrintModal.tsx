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
import { Printer, CreditCard, QrCode, ShieldCheck, Activity, HeartPulse } from "lucide-react";
import { PatientProfile } from "@/lib/satusehat/types";
import { printHtmlElement } from "@/lib/print/print-service";

interface PatientCardPrintModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientProfile;
  hospitalName?: string;
}

export function PatientCardPrintModal({
  isOpen,
  onOpenChange,
  patient,
  hospitalName = "RSUD Sehat Sejahtera",
}: PatientCardPrintModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (printAreaRef.current) {
      printHtmlElement(printAreaRef.current, {
        title: `Kartu-Pasien-${patient.mrn}-${patient.name.replace(/\s+/g, "_")}`,
        pageType: "card",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-5 sm:p-6 overflow-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800">
        <DialogHeader className="no-print pb-3 border-b border-border/50 text-left pr-10">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <CreditCard className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>Kartu Identitas Pasien & Stiker Barcode</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Pratinjau kartu berobat fisik dan stiker barcode spesimen laboratorium.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={printAreaRef}
          className="printable-area space-y-6 overflow-y-auto max-h-[75vh] p-2 print:p-0 print:border-0 print:shadow-none"
        >
          {/* Section 1: Physical Patient Smart Card (Depan & Belakang) */}
          <div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
              1. Kartu Berobat Fisik (Standard ID Card Size)
            </span>
            <div className="w-full max-w-md mx-auto aspect-[1.586/1] bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 text-white rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between border border-teal-700/50">
              {/* Background decorative watermark */}
              <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
                <HeartPulse className="h-48 w-48 text-white" />
              </div>

              {/* Card Top */}
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-teal-500/20 backdrop-blur-md border border-teal-400/30 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-teal-300" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-tight text-teal-100">
                      {hospitalName}
                    </h4>
                    <span className="text-[9px] text-teal-300/80 font-medium block">
                      KARTU IDENTITAS PASIEN RAWAT JALAN
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-teal-500/20 px-2 py-0.5 rounded-full border border-teal-400/30 text-[9px] font-bold text-teal-200">
                  <ShieldCheck className="h-3 w-3" />
                  <span>IHS TERVERIFIKASI</span>
                </div>
              </div>

              {/* Patient Core Info */}
              <div className="space-y-1 relative z-10 my-auto">
                <span className="text-[9px] text-teal-300/70 uppercase tracking-widest block font-medium">
                  Nama Lengkap Pasien
                </span>
                <h3 className="text-lg font-extrabold tracking-wide text-white drop-shadow-sm">
                  {patient.name}
                </h3>
                <div className="grid grid-cols-3 gap-2 pt-1 text-[10px]">
                  <div>
                    <span className="text-teal-300/60 block text-[8px]">NO. REKAM MEDIS</span>
                    <strong className="font-mono text-teal-200 text-xs">{patient.mrn}</strong>
                  </div>
                  <div>
                    <span className="text-teal-300/60 block text-[8px]">NIK KTP</span>
                    <strong className="font-mono text-slate-100">{patient.nik}</strong>
                  </div>
                  <div>
                    <span className="text-teal-300/60 block text-[8px]">TGL LAHIR / GOL</span>
                    <span className="text-slate-100 font-semibold">
                      {patient.birthDate} ({patient.bloodType})
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer with SATUSEHAT ID & QR Code */}
              <div className="flex items-end justify-between border-t border-teal-700/50 pt-3 relative z-10">
                <div>
                  <span className="text-[8px] text-teal-300/60 block uppercase font-mono">
                    SATUSEHAT NATIONAL CITIZEN ID
                  </span>
                  <span className="text-xs font-mono font-bold text-teal-300 tracking-wider">
                    {patient.id}
                  </span>
                </div>

                <div className="h-10 w-10 bg-white p-1 rounded-lg shadow-sm flex items-center justify-center">
                  <QrCode className="h-8 w-8 text-slate-900" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Stiker Barcode Pasien (Label Map / Tabung Darah) */}
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              2. Stiker Barcode & Label Pasien (Format Kemenkes)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2].map((idx) => (
                <div
                  key={idx}
                  className="bg-white p-3 rounded-lg border-2 border-slate-300 shadow-sm flex items-center justify-between text-slate-900 font-sans"
                >
                  <div className="space-y-0.5 text-[11px]">
                    <div className="font-extrabold text-xs text-slate-900 leading-tight">
                      {patient.name}
                    </div>
                    <div className="font-mono font-bold text-teal-800 text-[11px]">
                      No. RM {patient.mrn.replace(/^RM-?/i, "")}
                    </div>
                    <div className="text-[10px] text-slate-600">
                      {patient.birthDate} ({patient.gender === "male" ? "L" : "P"}) • {patient.bloodType}
                    </div>
                    <div className="text-[9px] font-mono text-slate-500">
                      NIK: {patient.nik}
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="h-12 w-12 bg-slate-900 text-white p-1 rounded flex items-center justify-center">
                      <QrCode className="h-10 w-10 text-white" />
                    </div>
                    <span className="text-[8px] font-mono text-slate-500 mt-0.5">
                      {patient.id.slice(0, 10)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 italic">
              Label stiker tahan air untuk ditempel pada lembar berkas fisik, gelang pasien, atau tabung sampel laboratorium.
            </p>
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
            <span>Cetak Kartu & Label</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
