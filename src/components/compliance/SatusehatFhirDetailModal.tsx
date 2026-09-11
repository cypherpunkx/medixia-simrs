"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Layers,
  KeyRound,
  FileCode,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Clock,
  Zap,
  Info,
  ArrowRight,
  WifiOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AuthSession,
  OutpatientEncounter,
  ResourceSyncItem,
} from "@/lib/satusehat/types";
import { toast } from "sonner";

interface SatusehatFhirDetailModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  encounter: OutpatientEncounter;
  session: AuthSession | null;
  onOpenCodeSnippet?: () => void;
  onRefreshToken?: () => void;
  isRefreshing?: boolean;
  onSelectiveRetry?: (targetTypes?: string[]) => Promise<void> | void;
  onSimulatePartialDrop?: () => void;
  isRetrying?: boolean;
}

export function SatusehatFhirDetailModal({
  isOpen,
  onOpenChange,
  encounter,
  session,
  onOpenCodeSnippet,
  onRefreshToken,
  isRefreshing = false,
  onSelectiveRetry,
  onSimulatePartialDrop,
  isRetrying = false,
}: SatusehatFhirDetailModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [retryingSingleType, setRetryingSingleType] = useState<string | null>(
    null
  );

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success(`${label} berhasil disalin`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isOptOut = encounter.consentStatus === "opt-out";
  const isEncounterSynced = encounter.syncStatus === "synced";
  const isEncounterPartialFailed = encounter.syncStatus === "partial_failed";
  const isEncounterPending = !isEncounterSynced && !isEncounterPartialFailed;

  // Build default breakdown based on truthful encounter sync state
  const defaultBreakdown: ResourceSyncItem[] = [
    {
      resourceType: "Consent",
      label: isOptOut ? "Persetujuan Pasien (Opt-Out)" : "Persetujuan Pasien (Opt-In)",
      standard: "HL7 FHIR R4 (IDS)",
      category: "Legal & Privasi Pasien (UU PDP)",
      status: isEncounterSynced ? "synced" : "pending",
      httpStatus: isEncounterSynced ? (isOptOut ? 200 : 201) : undefined,
      fhirId: isEncounterSynced
        ? (isOptOut ? `ss-con-optout-${encounter.id}` : `ss-con-${encounter.id}`)
        : undefined,
    },
    {
      resourceType: "Encounter",
      label: "Kunjungan Rawat Jalan (AMB)",
      standard: "HL7 FHIR R4",
      category: "Administrasi Kunjungan",
      status: isEncounterSynced ? "synced" : "pending",
      httpStatus: isEncounterSynced ? 201 : undefined,
      fhirId: encounter.satusehatEncounterId || (isEncounterSynced ? `ss-enc-${encounter.id}` : undefined),
    },
    {
      resourceType: "Observation",
      label: `TTV & Antropometri (${encounter.vitals ? "8 items" : "Pemeriksaan Fisik"})`,
      standard: "LOINC",
      category: "Pemeriksaan Fisik",
      status: isEncounterSynced ? "synced" : "pending",
      httpStatus: isEncounterSynced ? 201 : undefined,
      fhirId: isEncounterSynced ? `ss-obs-${encounter.id}` : undefined,
    },
    {
      resourceType: "Condition",
      label: `Diagnosis ICD-10 (${encounter.diagnoses?.length || 0} items)`,
      standard: "ICD-10 (WHO/Kemenkes)",
      category: "Penegakan Diagnostik",
      status: isEncounterSynced ? "synced" : "pending",
      httpStatus: isEncounterSynced ? 201 : undefined,
      fhirId: isEncounterSynced ? `ss-cnd-${encounter.id}` : undefined,
    },
    {
      resourceType: "Procedure",
      label: `Tindakan ICD-9-CM (${encounter.procedures?.length || 0} items)`,
      standard: "ICD-9-CM",
      category: "Intervensi Klinis",
      status: isEncounterSynced ? "synced" : "pending",
      httpStatus: isEncounterSynced ? 201 : undefined,
      fhirId: isEncounterSynced ? `ss-prc-${encounter.id}` : undefined,
    },
    {
      resourceType: "AllergyIntolerance",
      label: "Riwayat Alergi Obat",
      standard: "SNOMED-CT",
      category: "Patient Safety",
      status: isEncounterSynced ? "synced" : "pending",
      httpStatus: isEncounterSynced ? 201 : undefined,
      fhirId: isEncounterSynced ? `ss-alg-${encounter.id}` : undefined,
    },
    {
      resourceType: "MedicationRequest",
      label: `Resep Elektronik KFA (${encounter.prescriptions?.length || 0} items)`,
      standard: "KFA (Kemenkes)",
      category: "Terapi Farmasi",
      status: isEncounterPartialFailed ? "failed" : isEncounterSynced ? "synced" : "pending",
      httpStatus: isEncounterPartialFailed ? 504 : isEncounterSynced ? 201 : undefined,
      errorMessage:
        isEncounterPartialFailed
          ? "504 Gateway Timeout: Gangguan koneksi ke gateway SATUSEHAT."
          : undefined,
      fhirId: isEncounterSynced ? `ss-med-${encounter.id}` : undefined,
    },
    {
      resourceType: "CarePlan",
      label: "Rencana Kontrol & Edukasi",
      standard: "SNOMED-CT",
      category: "Instruksi Tindak Lanjut",
      status: isEncounterSynced ? "synced" : "pending",
      httpStatus: isEncounterSynced ? 201 : undefined,
      fhirId: isEncounterSynced ? `ss-pln-${encounter.id}` : undefined,
    },
    {
      resourceType: "Composition",
      label: "Resume Medis Rawat Jalan LOINC 88645-7",
      standard: "LOINC 88645-7",
      category: "Agregasi Resume Medis",
      status: isEncounterPartialFailed ? "failed" : isEncounterSynced ? "synced" : "pending",
      httpStatus: isEncounterPartialFailed ? 504 : isEncounterSynced ? 201 : undefined,
      errorMessage:
        isEncounterPartialFailed
          ? "504 Gateway Timeout: Transmisi dokumen resume medis terputus."
          : undefined,
      fhirId: isEncounterSynced ? `ss-cmp-${encounter.id}` : undefined,
    },
  ];

  const items: ResourceSyncItem[] =
    encounter.syncBreakdown && encounter.syncBreakdown.length > 0
      ? encounter.syncBreakdown
      : defaultBreakdown;

  const failedItems = items.filter((i) => i.status === "failed");
  const pendingItems = items.filter((i) => i.status === "pending");
  const syncedItems = items.filter((i) => i.status === "synced");
  const totalItemsCount = items.length;

  const hasFailedOrPending = failedItems.length > 0 || pendingItems.length > 0;

  const handleRetrySingle = async (resourceType: string) => {
    if (!onSelectiveRetry) return;
    setRetryingSingleType(resourceType);
    try {
      await onSelectiveRetry([resourceType]);
    } finally {
      setRetryingSingleType(null);
    }
  };

  const handleRetryAllFailed = async () => {
    if (!onSelectiveRetry) return;
    const targetTypes = [...failedItems, ...pendingItems].map(
      (i) => i.resourceType
    );
    await onSelectiveRetry(targetTypes);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-5 sm:p-6 overflow-hidden bg-white text-slate-900 border-slate-200 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-slate-100 pr-10">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Detail Interoperabilitas SATUSEHAT (FHIR R4)</span>
                {isEncounterPartialFailed ? (
                  <span className="inline-flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                ) : isEncounterSynced ? (
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                ) : (
                  <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" />
                )}
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Rincian transmisi rekam medis elektronik &amp; integrasi cloud SATUSEHAT
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1 py-2">
          {/* Top Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {/* OAuth Status Card */}
            <div className="p-3 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 min-w-0">
                  <KeyRound className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                  <span className="truncate">Koneksi Gateway SATUSEHAT</span>
                </span>
                <Badge
                  variant="outline"
                  className={
                    session
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[9px] font-bold px-2 py-0.5 shrink-0 whitespace-nowrap"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/40 text-[9px] font-bold px-2 py-0.5 shrink-0 whitespace-nowrap"
                  }
                >
                  {session ? "Koneksi Aktif" : "Menunggu Kredensial"}
                </Badge>
              </div>
              <div className="text-[11px] font-mono text-teal-200 truncate">
                {session?.accessToken
                  ? `Bearer eyJhbGciOi...${session.accessToken.slice(-8)}`
                  : "Token akses belum diterbitkan"}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>
                  Lingkungan: <strong className="text-slate-200">{session?.env === "production" ? "Mode Produksi" : "Mode Uji Coba (Sandbox)"}</strong>
                </span>
                {onRefreshToken && session && (
                  <button
                    type="button"
                    onClick={onRefreshToken}
                    disabled={isRefreshing}
                    className="text-[10px] text-teal-300 hover:text-white underline cursor-pointer"
                  >
                    {isRefreshing ? "Memperbarui..." : "Refresh Token"}
                  </button>
                )}
              </div>
            </div>

            {/* Encounter ID Card */}
            <div className="p-3 rounded-xl bg-teal-50/80 border border-teal-200 text-teal-950 space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-teal-600" />
                  <span>SATUSEHAT Encounter ID</span>
                </span>
                {encounter.satusehatEncounterId ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        encounter.satusehatEncounterId || "",
                        "Encounter ID"
                      )
                    }
                    className="text-[10px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded border border-teal-200 hover:bg-teal-100 transition-colors"
                  >
                    {copiedKey === "Encounter ID" ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>Salin ID</span>
                  </button>
                ) : (
                  <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">
                    Draft
                  </Badge>
                )}
              </div>
              <div className="text-xs font-mono font-bold text-teal-950 truncate">
                {encounter.satusehatEncounterId ? (
                  encounter.satusehatEncounterId
                ) : (
                  <span className="text-slate-500 font-normal italic">
                    (Belum Diterbitkan - Menunggu Pengiriman)
                  </span>
                )}
              </div>
              <div className="text-[10px] text-teal-800">
                Fasilitas Kesehatan:{" "}
                <span className="font-semibold text-teal-950">
                  {encounter.hospitalName} ({encounter.hospitalOrgId})
                </span>
              </div>
            </div>
          </div>

          {/* Conditional Status Banners */}
          {isEncounterPartialFailed ? (
            <div className="p-3.5 rounded-xl bg-rose-50/90 border border-rose-200 text-rose-950 space-y-2.5 animate-fadeIn shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <div className="p-1 rounded-md bg-rose-100 text-rose-700 mt-0.5 shrink-0">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-rose-900">
                      Gangguan Jaringan Terdeteksi ({failedItems.length} Resource Gagal / {pendingItems.length} Pending)
                    </h5>
                    <p className="text-[11px] text-rose-800 mt-0.5">
                      Koneksi gateway Kemenkes sempat terputus saat transmisi. Root{" "}
                      <strong className="font-mono text-rose-950">
                        Encounter ID ({encounter.satusehatEncounterId || "ss-enc-..."})
                      </strong>{" "}
                      sudah tersimpan aman dan tidak akan diduplikasi.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRetryAllFailed}
                  disabled={isRetrying}
                  className="h-8 text-xs font-bold gap-1.5 shadow-sm bg-rose-600 hover:bg-rose-700 text-white cursor-pointer btn-press transition-all duration-150 hover:shadow-md"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : "transition-transform duration-200 group-hover:rotate-180"}`}
                  />
                  <span>
                    {isRetrying
                      ? "Mengirim Ulang..."
                      : `Kirim Ulang ${failedItems.length + pendingItems.length} Resource Gagal (Selective Retry)`}
                  </span>
                </Button>
              </div>
            </div>
          ) : isEncounterSynced ? (
            <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 flex items-center justify-between text-xs shadow-2xs animate-fade-in-up">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Status Terkirim:</strong> Seluruh {totalItemsCount}/{totalItemsCount} resource FHIR telah tersinkronisasi 100% ke cloud SATUSEHAT Kemenkes RI.
                </span>
              </div>
              {onSimulatePartialDrop && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onSimulatePartialDrop}
                  className="h-7 text-[10px] font-semibold bg-white border-emerald-300 text-emerald-800 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 gap-1 shrink-0 btn-press transition-all duration-150 cursor-pointer"
                  title="Simulasikan gangguan jaringan pada 2 resource untuk menguji fitur Selective Retry"
                >
                  <WifiOff className="h-3 w-3" />
                  <span>Simulasi Putus Jaringan</span>
                </Button>
              )}
            </div>
          ) : isOptOut ? (
            <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 space-y-1 shadow-2xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-700 shrink-0" />
                <span className="font-bold text-xs text-slate-900">
                  Status: Hak Privasi Pasien (Opt-Out) Aktif
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed pl-6">
                Pasien memilih untuk tidak meneruskan rekam medis ke platform SATUSEHAT (Sesuai UU PDP No. 27/2022). Data rekam medis tersimpan aman di basis data SIMRS internal.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 space-y-1 shadow-2xs">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="font-bold text-xs text-amber-900">
                  Status: Menunggu Pemeriksaan &amp; Pengiriman DPJP (Draft)
                </span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed pl-6">
                Data klinis kunjungan ini belum ditransmisikan ke SATUSEHAT Cloud Kemenkes. Pengiriman 9 resource FHIR akan diproses saat dokter menyelesaikan formulir SOAP dan menekan tombol <strong>Simpan &amp; Kirim ke SATUSEHAT</strong>.
              </p>
            </div>
          )}

          {/* Granular Resource Sync Breakdown Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileCode className="h-4 w-4 text-teal-600" />
                <span>Rincian Status Sinkronisasi Berkas Klinis (Standar FHIR)</span>
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors duration-200 ${
                  isEncounterSynced
                    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                    : isEncounterPartialFailed
                    ? "text-rose-700 bg-rose-50 border-rose-200"
                    : "text-amber-800 bg-amber-50 border-amber-200"
                }`}
              >
                {isEncounterSynced
                  ? `${syncedItems.length}/${totalItemsCount} Terkirim`
                  : isEncounterPartialFailed
                  ? `${syncedItems.length}/${totalItemsCount} Terkirim (${failedItems.length} Gagal)`
                  : `0/${totalItemsCount} Terkirim (Draft)`}
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white divide-y divide-slate-100 text-xs shadow-2xs">
              {items.map((item, idx) => {
                const isItemFailed = item.status === "failed";
                const isItemSynced = item.status === "synced";
                const isItemPending = !isItemSynced && !isItemFailed;
                const isThisSingleRetrying =
                  retryingSingleType === item.resourceType;

                return (
                  <div
                    key={idx}
                    className={`p-2.5 sm:px-3.5 flex flex-col gap-1.5 transition-all duration-150 ${
                      isItemFailed
                        ? "bg-rose-50/40 hover:bg-rose-50/80"
                        : isItemSynced
                        ? "hover:bg-slate-50/90"
                        : "bg-slate-50/30 hover:bg-slate-50/70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        {isItemSynced && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5 transition-transform duration-200 hover:scale-110" />
                        )}
                        {isItemFailed && (
                          <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5 animate-pulse" />
                        )}
                        {isItemPending && (
                          <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900">
                              {item.resourceType}
                            </span>
                            <span className="text-[11px] text-slate-600 font-medium">
                              ({item.label})
                            </span>
                            {item.retryCount && item.retryCount > 0 ? (
                              <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 animate-fade-in-up">
                                Retry #{item.retryCount}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {item.category || "Resource"} •{" "}
                            <span className="font-mono text-[10px] text-slate-500">
                              {item.standard}
                            </span>
                            {item.fhirId ? (
                              <span className="font-mono text-[10px] text-teal-700 ml-1.5">
                                [ID: {item.fhirId}]
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic ml-1.5">
                                [Belum Terkirim]
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={`font-mono text-[10px] font-bold transition-colors duration-150 ${
                            isItemSynced
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : isItemFailed
                              ? "bg-rose-50 text-rose-700 border-rose-300"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {isItemSynced
                            ? `${item.httpStatus || 201} Terkirim`
                            : isItemFailed
                            ? `${item.httpStatus || 504} Gagal`
                            : "Belum Dikirim"}
                        </Badge>

                        {/* Individual Retry Button for failed items only */}
                        {isItemFailed && onSelectiveRetry && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetrySingle(item.resourceType)}
                            disabled={isRetrying || isThisSingleRetrying}
                            className="h-6 px-2 text-[10px] font-bold text-rose-700 border-rose-200 hover:bg-rose-100 hover:text-rose-900 cursor-pointer btn-press transition-all duration-150"
                            title="Kirim ulang resource ini saja"
                          >
                            <RefreshCw
                              className={`h-2.5 w-2.5 mr-1 ${
                                isThisSingleRetrying ? "animate-spin" : ""
                              }`}
                            />
                            <span>Retry</span>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Detailed Error message if failed */}
                    {isItemFailed && item.errorMessage && (
                      <div className="ml-6.5 p-1.5 px-2 rounded-md bg-rose-100/80 border border-rose-200 text-[10px] font-mono text-rose-900 flex items-start gap-1.5">
                        <WifiOff className="h-3 w-3 text-rose-600 shrink-0 mt-0.5" />
                        <span>{item.errorMessage}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Compliance Footer Note */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-600 shrink-0" />
              <span>
                Format data tervalidasi sesuai standar Kepmenkes No. HK.01.07/MENKES/1423/2022
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-7 text-xs font-semibold shrink-0 bg-white border-slate-200"
            >
              Tutup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

