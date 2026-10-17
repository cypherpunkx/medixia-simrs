"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { generatePrefixedId } from "@/lib/id-generator";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";
import { useUIStore } from "@/stores/useUIStore";
import { useClinicalStore } from "@/stores/useClinicalStore";

interface MedicalRecordLockModalProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  encounter?: OutpatientEncounter | null;
  onUpdateEncounter?: (updated: OutpatientEncounter) => void;
}

export function MedicalRecordLockModal({
  isOpen: propIsOpen,
  onOpenChange: propOnOpenChange,
  encounter: propEncounter,
  onUpdateEncounter: propOnUpdateEncounter,
}: MedicalRecordLockModalProps = {}) {
  const storeIsOpen = useUIStore((s) => s.isLockModalOpen);
  const storeSetOpen = (open: boolean) =>
    useUIStore.getState().setModalOpen("isLockModalOpen", open);
  const storeEncounter = useClinicalStore((s) =>
    s.encounters.find((e) => e.id === s.selectedEncounterId) || null
  );
  const storeUpdateEncounter = useClinicalStore((s) => s.updateEncounter);

  const isOpen = propIsOpen !== undefined ? propIsOpen : storeIsOpen;
  const onOpenChange = propOnOpenChange ?? storeSetOpen;
  const encounter = propEncounter !== undefined ? propEncounter : storeEncounter;
  const onUpdateEncounter = propOnUpdateEncounter ?? storeUpdateEncounter;

  const { user } = useAuth();
  const [addendumText, setAddendumText] = useState("");

  if (!encounter) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md p-6 bg-white rounded-2xl text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
            <Lock className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-base font-bold text-slate-900">
              Belum Ada Kunjungan Terpilih
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 leading-relaxed">
              Silakan pilih pasien dan data kunjungan rawat jalan terlebih dahulu untuk mengunci atau mencatat addendum rekam medis.
            </DialogDescription>
          </div>
          <div className="flex justify-center pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs font-semibold px-5"
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const isLocked =
    encounter.isLocked !== undefined
      ? encounter.isLocked
      : encounter.syncStatus === "synced";
  const addendums = encounter.addendums || [];

  const handleToggleLock = () => {
    if (user && user.role !== "doctor" && user.role !== "admin") {
      toast.error("Wewenang Dokter DPJP & Administrator", {
        description: "Penguncian permanen rekam medis hanya dapat dilakukan oleh Dokter DPJP atau Administrator Sistem.",
      });
      return;
    }

    const nextLocked = !isLocked;
    const now = new Date().toISOString();
    const lockerName = user?.name || encounter.doctorName;
    onUpdateEncounter({
      ...encounter,
      isLocked: nextLocked,
      lockedAt: nextLocked ? now : undefined,
      lockedBy: nextLocked ? lockerName : undefined,
    });

    if (nextLocked) {
      toast.success(
        `Rekam medis berhasil dikunci oleh ${lockerName}. Perubahan selanjutnya wajib melalui catatan adendum.`
      );
    } else {
      toast.info(`Kunci rekam medis berhasil dibuka oleh ${lockerName}.`);
    }
  };

  const handleAddAddendum = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addendumText.trim()) return;

    const authorRole =
      user?.role === "doctor"
        ? "Dokter Penanggung Jawab Pelayanan (DPJP)"
        : user?.role === "nurse"
        ? "Perawat Poli"
        : user?.role === "pharmacy"
        ? "Apoteker Farmasi"
        : "Tenaga Kesehatan Terotorisasi";

    const newAddendum: MedicalAddendum = {
      id: generatePrefixedId("add_"),
      timestamp: new Date().toISOString(),
      authorName: user?.name || encounter.doctorName,
      authorRole,
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
          {/* Lock Status Card (Clean, Balanced & High-Compliance) */}
          <div
            className={`p-4 sm:p-4.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
              isLocked
                ? "bg-slate-900 text-white border-slate-800 shadow-md"
                : "bg-amber-50/80 text-amber-950 border-amber-200/90 shadow-2xs"
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div
                className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold shrink-0 shadow-2xs border ${
                  isLocked
                    ? "bg-teal-500/20 text-teal-400 border-teal-500/30"
                    : "bg-amber-100/90 text-amber-800 border-amber-300/80"
                }`}
              >
                {isLocked ? (
                  <Lock className="h-5 w-5" />
                ) : (
                  <Unlock className="h-5 w-5 text-amber-800" />
                )}
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                {/* Baris 1: Status Title + Badge yang Selalu Sejajar Tanpa Wrap */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <span
                    className={`font-extrabold text-sm truncate ${
                      isLocked ? "text-white" : "text-amber-950"
                    }`}
                  >
                    {isLocked
                      ? "Rekam Medis Terkunci"
                      : "Rekam Medis Terbuka"}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] font-extrabold px-2 py-0.5 shrink-0 rounded-full ${
                      isLocked
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                        : "bg-amber-100/90 text-amber-800 border-amber-300/80"
                    }`}
                  >
                    {isLocked ? "LEGAL ACTIVE" : "DRAFT MODE"}
                  </Badge>
                </div>

                {/* Baris 2: Keterangan Status yang Bersih & Rapi */}
                <p
                  className={`text-xs leading-relaxed ${
                    isLocked ? "text-slate-300" : "text-amber-800/90 font-medium"
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

            {/* Action Button yang Selaras & Ergonomis */}
            <div className="shrink-0 flex items-center">
              {isLocked ? (
                <button
                  type="button"
                  onClick={handleToggleLock}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold gap-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white border border-slate-700 hover:border-teal-400 flex items-center shadow-xs cursor-pointer transition-all active:scale-95"
                  title="Buka status kunci untuk memperbolehkan perubahan"
                >
                  <Unlock className="h-3.5 w-3.5 text-teal-400" />
                  <span>Buka Kunci (Re-open)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleToggleLock}
                  className="px-4 py-2 rounded-xl text-xs font-bold gap-1.5 bg-teal-700 hover:bg-teal-800 text-white flex items-center shadow-xs cursor-pointer transition-all active:scale-95 border border-teal-800/30"
                  title="Kunci rekam medis untuk mencegah perubahan langsung"
                >
                  <Lock className="h-3.5 w-3.5 text-white" />
                  <span>Kunci Rekam Medis</span>
                </button>
              )}
            </div>
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
