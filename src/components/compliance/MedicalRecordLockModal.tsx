"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Lock,
  Unlock,
  ShieldCheck,
  FilePlus2,
  Clock,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { OutpatientEncounter, MedicalAddendum } from "@/lib/satusehat/types";
import { toast } from "sonner";

interface MedicalRecordLockModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  encounter: OutpatientEncounter;
  onUpdateEncounter: (updated: OutpatientEncounter) => void;
}

export function MedicalRecordLockModal({
  isOpen,
  onOpenChange,
  encounter,
  onUpdateEncounter,
}: MedicalRecordLockModalProps) {
  const [addendumText, setAddendumText] = useState("");
  const isLocked =
    encounter.isLocked !== undefined
      ? encounter.isLocked
      : encounter.syncStatus === "synced";
  const addendums = encounter.addendums || [];

  const handleToggleLock = () => {
    const nextLocked = !isLocked;
    const now = new Date().toISOString();
    onUpdateEncounter({
      ...encounter,
      isLocked: nextLocked,
      lockedAt: nextLocked ? now : undefined,
      lockedBy: nextLocked ? encounter.doctorName : undefined,
    });

    if (nextLocked) {
      toast.success(
        "Rekam medis berhasil dikunci. Perubahan selanjutnya wajib melalui catatan adendum."
      );
    } else {
      toast.info("Kunci rekam medis berhasil dibuka oleh Dokter DPJP.");
    }
  };

  const handleAddAddendum = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addendumText.trim()) return;

    const newAddendum: MedicalAddendum = {
      id: `ADD-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      authorName: encounter.doctorName,
      authorRole: "Dokter Penanggung Jawab Pelayanan (DPJP)",
      noteText: addendumText.trim(),
    };

    onUpdateEncounter({
      ...encounter,
      addendums: [...addendums, newAddendum],
    });

    setAddendumText("");
    toast.success("Catatan adendum medis berhasil disimpan");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-5 sm:p-6 overflow-hidden bg-white text-slate-900 border-slate-200 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-slate-100 pr-12">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
            <ShieldCheck className="h-5 w-5 text-teal-600" />
            <span>Tata Kelola Integritas RME (Permenkes 24/2022)</span>
          </DialogTitle>
          <p className="text-xs text-slate-600">
            Standar hukum penguncian berkas medis & penambahan catatan medis (Addendum)
          </p>
        </DialogHeader>

        <div className="space-y-5 max-h-[75vh] overflow-y-auto p-1">
          {/* Lock Status Card */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
              isLocked
                ? "bg-slate-900 text-white border-slate-800 shadow-md"
                : "bg-amber-50 text-amber-950 border-amber-300 shadow-xs"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                  isLocked ? "bg-teal-500/20 text-teal-400" : "bg-amber-200 text-amber-900"
                }`}
              >
                {isLocked ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
              </div>
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-sm">
                    {isLocked
                      ? "Rekam Medis Terkunci (Locked & Finalized)"
                      : "Rekam Medis Terbuka (Draft / In-Progress)"}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] font-bold px-2 py-0.5 shrink-0 whitespace-nowrap ${
                      isLocked
                        ? "bg-teal-500/20 text-teal-300 border-teal-500/40"
                        : "bg-amber-100 text-amber-900 border-amber-300"
                    }`}
                  >
                    {isLocked ? "LEGAL ACTIVE" : "DRAFT MODE"}
                  </Badge>
                </div>
                <p
                  className={`text-xs ${
                    isLocked ? "text-slate-300" : "text-amber-900"
                  }`}
                >
                  {isLocked
                    ? `Dikunci oleh ${
                        encounter.lockedBy || encounter.doctorName
                      } pada ${
                        encounter.lockedAt
                          ? new Date(encounter.lockedAt).toLocaleString("id-ID")
                          : "kunjungan saat ini"
                      }`
                    : "Dokter masih dapat mengubah formulir utama secara langsung sebelum penguncian."}
                </p>
              </div>
            </div>

            {/* High-Contrast Action Button */}
            {isLocked ? (
              <button
                type="button"
                onClick={handleToggleLock}
                className="px-3.5 py-2 rounded-lg text-xs font-bold gap-1.5 shrink-0 bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white border border-slate-700 hover:border-teal-400 flex items-center shadow-xs cursor-pointer transition-all active:scale-95"
                title="Buka status kunci untuk memperbolehkan perubahan"
              >
                <Unlock className="h-3.5 w-3.5 text-teal-400" />
                <span>Buka Kunci (Re-open)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleToggleLock}
                className="px-3.5 py-2 rounded-lg text-xs font-bold gap-1.5 shrink-0 bg-teal-600 hover:bg-teal-700 text-white flex items-center shadow-xs cursor-pointer transition-all active:scale-95"
                title="Kunci rekam medis untuk mencegah perubahan langsung"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Kunci Rekam Medis</span>
              </button>
            )}
          </div>

          {/* Addendum Information Banner */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60 text-xs text-teal-950 dark:text-teal-200">
            <ShieldCheck className="h-4 w-4 text-teal-700 dark:text-teal-400 shrink-0" />
            <p className="leading-tight">
              Rekam medis final terkunci. Perubahan atau koreksi dicatat sebagai <strong>Catatan Tambahan (Addendum)</strong>.
            </p>
          </div>

          {/* Addendum History List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center justify-between">
              <span>Riwayat Addendum Catatan Medis</span>
              <span className="text-[11px] font-mono text-slate-700 dark:text-slate-300 font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {addendums.length} Catatan
              </span>
            </h4>

            {addendums.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-100/70 dark:bg-slate-800/40">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Belum ada catatan addendum yang dibubuhkan pada kunjungan ini.
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                  Gunakan formulir di bawah untuk menambahkan catatan tambahan resmi (Permenkes 24/2022).
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {addendums.map((add) => (
                  <div
                    key={add.id}
                    className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px] border-b border-slate-100 dark:border-slate-700 pb-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                        <UserCheck className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                        <span>{add.authorName}</span>
                        <span className="text-slate-500 dark:text-slate-400 font-normal">({add.authorRole})</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-mono text-[10px]">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(add.timestamp).toLocaleString("id-ID")}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed pl-2 border-l-2 border-teal-500">
                      {add.noteText}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Create Addendum */}
          <form
            onSubmit={handleAddAddendum}
            className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3"
          >
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
              <FilePlus2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              <span>Tambahkan Addendum Catatan Medis Baru</span>
            </h4>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Teks Tambahan / Koreksi Klinis:
              </Label>
              <textarea
                value={addendumText}
                onChange={(e) => setAddendumText(e.target.value)}
                rows={3}
                placeholder="Contoh: Pasien melaporkan keluhan tambahan mual ringan setelah mengonsumsi antibiotik. Diberikan edukasi minum obat sesudah makan."
                className="w-full text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <Button
              type="submit"
              disabled={!addendumText.trim()}
              variant="medical"
              size="sm"
              className="w-full text-xs font-bold gap-1.5 shadow-xs"
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              <span>Simpan & Bubuhkan Addendum Resmi</span>
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
