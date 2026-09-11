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
import { Printer, Ticket, QrCode, Clock, ShieldCheck, Activity } from "lucide-react";
import { PatientProfile, OutpatientEncounter, ClinicQueuePatientItem } from "@/lib/satusehat/types";
import { printHtmlElement } from "@/lib/print/print-service";

interface QueueTicketPrintModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientProfile;
  encounter: OutpatientEncounter;
  worklist?: ClinicQueuePatientItem[];
  queueNumber?: string;
  estimatedWaitMinutes?: number;
}

export function QueueTicketPrintModal({
  isOpen,
  onOpenChange,
  patient,
  encounter,
  worklist,
  queueNumber,
  estimatedWaitMinutes = 15,
}: QueueTicketPrintModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  const matchingQueueItem = worklist?.find(
    (w) => w.patient.id === patient.id || w.patient.mrn === patient.mrn
  );

  const effectiveQueueNumber =
    queueNumber || matchingQueueItem?.queueNumber || encounter.queueNumber || "A-001";

  const handlePrint = () => {
    if (printAreaRef.current) {
      printHtmlElement(printAreaRef.current, {
        title: `Karcis-Antrean-${effectiveQueueNumber}-${patient.name.replace(/\s+/g, "_")}`,
        pageType: "thermal",
      });
    }
  };

  const fifoRank =
    worklist && worklist.length > 0
      ? Math.max(
          1,
          [...worklist]
            .sort((a, b) => (a.arrivalTimestamp || 0) - (b.arrivalTimestamp || 0))
            .findIndex((w) => w.patient.id === patient.id || w.patient.mrn === patient.mrn) + 1
        )
      : 1;

  const arrivalTimeDisplay =
    matchingQueueItem?.arrivalTime ||
    new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }) + " WIB";

  const currentDate = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const currentTime = new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-5 sm:p-6 overflow-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800">
        <DialogHeader className="no-print pb-3 border-b border-border/50 text-left pr-10">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Ticket className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>Karcis / Tiket Antrean Poli</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Pratinjau tiket antrean sebelum dicetak ke printer thermal POS.
          </DialogDescription>
        </DialogHeader>

        {/* Thermal Slip Styled Ticket */}
        <div
          ref={printAreaRef}
          className="printable-area flex-1 overflow-y-auto bg-white text-slate-900 p-6 rounded-xl border border-dashed border-slate-300 shadow-sm font-mono space-y-4 text-center print:p-0 print:border-0 print:shadow-none"
        >
          {/* Header */}
          <div className="border-b border-dashed border-slate-300 pb-3">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Activity className="h-4 w-4 text-teal-600" />
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
                {encounter.hospitalName}
              </h3>
            </div>
            <p className="text-[10px] text-slate-500">
              Pelayanan Rawat Jalan Terpadu SATUSEHAT
            </p>
            <p className="text-[9px] text-slate-400">
              {currentDate} • {currentTime} WIB
            </p>
          </div>

          {/* Queue Number Callout */}
          <div className="py-2">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 border border-slate-300 rounded-md text-[10px] font-bold text-slate-700 mb-1">
              <span>Urutan Antrean Masuk #{fifoRank > 0 ? fifoRank : 1}</span>
            </div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
              Nomor Antrean Anda
            </span>
            <div className="text-4xl font-black text-teal-800 tracking-tight my-1">
              {effectiveQueueNumber}
            </div>
            <div className="inline-flex items-center gap-1 px-3 py-1 bg-teal-50 border border-teal-200 rounded-full text-xs font-bold text-teal-700">
              <span>{matchingQueueItem?.department || encounter.clinicDepartment}</span>
            </div>
          </div>

          {/* Details Table */}
          <div className="border-t border-b border-dashed border-slate-300 py-3 text-left text-xs space-y-1.5 font-sans">
            <div className="flex justify-between">
              <span className="text-slate-500 text-[11px]">Nama Pasien:</span>
              <span className="font-bold text-slate-900">{patient.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-[11px]">No. RM:</span>
              <span className="font-bold font-mono text-slate-900">{patient.mrn.replace(/^RM-?/i, "")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-[11px]">DPJP Dokter:</span>
              <span className="font-semibold text-slate-800">{matchingQueueItem?.doctor || encounter.doctorName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-[11px]">Ruang Poli:</span>
              <span className="font-semibold text-slate-800">{matchingQueueItem?.room || "Ruang 204 (Lt. 2)"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-[11px]">Waktu Kedatangan:</span>
              <span className="font-bold text-teal-800 font-mono">{arrivalTimeDisplay}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-[11px]">Jenis Penjamin:</span>
              <span className="font-semibold text-teal-700">{patient.paymentPayer || "BPJS Kesehatan"}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-100">
              <span className="text-slate-500 text-[11px] flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-600" />
                <span>Estimasi Pelayanan:</span>
              </span>
              <span className="font-bold text-amber-700 text-[11px]">~{estimatedWaitMinutes} Menit</span>
            </div>
          </div>

          {/* QR Code and Check-in verification */}
          <div className="pt-2 flex flex-col items-center justify-center space-y-1.5">
            <div className="h-16 w-16 bg-slate-900 text-white rounded-lg flex flex-col items-center justify-center p-1 text-[7px] font-mono text-center">
              <QrCode className="h-9 w-9 text-teal-400" />
              <span>SCAN LOKET</span>
            </div>
            <span className="text-[9px] text-slate-500 block">
              Scan di pintu poli untuk konfirmasi kehadiran
            </span>
            <div className="flex items-center gap-1 text-[9px] text-emerald-700 font-medium">
              <ShieldCheck className="h-3 w-3" />
              <span>IHS ID: {patient.id}</span>
            </div>
          </div>

          <div className="text-[8px] text-slate-400 border-t border-dashed border-slate-200 pt-2">
            Simpan karcis ini hingga pemeriksaan selesai. Terima kasih atas kesabaran Anda.
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
            <span>Cetak Thermal</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
