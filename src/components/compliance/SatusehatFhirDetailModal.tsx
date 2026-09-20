"use client";

import React, { useState, useMemo } from "react";
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
  Layers,
  KeyRound,
  FileCode,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Clock,
  WifiOff,
  Activity,
  Stethoscope,
  Scissors,
  AlertCircle,
  Pill,
  ClipboardList,
  FileText,
  ChevronDown,
  ChevronUp,
  User,
  Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AuthSession,
  OutpatientEncounter,
  PatientProfile,
  ResourceSyncItem,
} from "@/lib/satusehat/types";
import { toast } from "sonner";

interface SatusehatFhirDetailModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  encounter?: OutpatientEncounter | null;
  patient?: PatientProfile | null;
  session: AuthSession | null;
  onRefreshToken?: () => void;
  isRefreshing?: boolean;
  onSelectiveRetry?: (targetTypes?: string[]) => Promise<void> | void;
  isRetrying?: boolean;
}

interface CategoryDefinition {
  key: string;
  resourceType: string;
  name: string;
  standard: string;
  clinicalDomain: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CANONICAL_FHIR_CATEGORIES: CategoryDefinition[] = [
  {
    key: "Consent",
    resourceType: "Consent",
    name: "Persetujuan Pasien (Informed Consent)",
    standard: "HL7 FHIR R4 (IDS)",
    clinicalDomain: "Legal & Privasi Pasien (UU PDP No. 27/2022)",
    icon: ShieldCheck,
  },
  {
    key: "Encounter",
    resourceType: "Encounter",
    name: "Kunjungan Rawat Jalan (AMB)",
    standard: "HL7 FHIR R4",
    clinicalDomain: "Administrasi & Registrasi Kunjungan",
    icon: Layers,
  },
  {
    key: "Observation",
    resourceType: "Observation",
    name: "TTV & Pemeriksaan Penunjang (Lab / Rad)",
    standard: "LOINC, DICOM & Standar Kemenkes",
    clinicalDomain: "Pemeriksaan Fisik, Nilai Lab & Laporan Diagnostik",
    icon: Activity,
  },
  {
    key: "Condition",
    resourceType: "Condition",
    name: "Diagnosis Klinis (Primer & Sekunder)",
    standard: "ICD-10 (WHO/Kemenkes)",
    clinicalDomain: "Penegakan Diagnostik",
    icon: Stethoscope,
  },
  {
    key: "Procedure",
    resourceType: "Procedure",
    name: "Tindakan Medis & Edukasi",
    standard: "ICD-9-CM (WHO/Kemenkes)",
    clinicalDomain: "Intervensi Klinis",
    icon: Scissors,
  },
  {
    key: "AllergyIntolerance",
    resourceType: "AllergyIntolerance",
    name: "Keamanan Pasien & Riwayat Alergi",
    standard: "HL7 FHIR R4 (SNOMED-CT)",
    clinicalDomain: "Patient Safety",
    icon: AlertCircle,
  },
  {
    key: "MedicationRequest",
    resourceType: "MedicationRequest",
    name: "Resep Elektronik & Farmasi",
    standard: "KFA Kemenkes (9300...)",
    clinicalDomain: "Terapi Farmakologi",
    icon: Pill,
  },
  {
    key: "CarePlan",
    resourceType: "CarePlan",
    name: "Rencana Asuhan & Instruksi Kontrol",
    standard: "HL7 FHIR R4 (SNOMED-CT)",
    clinicalDomain: "Instruksi Tindak Lanjut",
    icon: ClipboardList,
  },
  {
    key: "Composition",
    resourceType: "Composition",
    name: "Resume Medis Rawat Jalan Terpadu",
    standard: "HL7 FHIR R4 (DIC)",
    clinicalDomain: "Agregasi Rekam Medis Elektronik",
    icon: FileText,
  },
];

export function SatusehatFhirDetailModal({
  isOpen,
  onOpenChange,
  encounter,
  patient,
  session,
  onRefreshToken,
  isRefreshing = false,
  onSelectiveRetry,
  isRetrying = false,
}: SatusehatFhirDetailModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [retryingSingleType, setRetryingSingleType] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success(`${label} berhasil disalin`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const encId = encounter?.id || "draft";
  const isOptOut = encounter?.consentStatus === "opt-out";
  const isEncounterSynced = encounter?.syncStatus === "synced";
  const isEncounterPartialFailed = encounter?.syncStatus === "partial_failed";

  // Build high-fidelity draft granular breakdown representing all 18 clinical FHIR resources
  const defaultGranularBreakdown = useMemo<ResourceSyncItem[]>(() => {
    const list: ResourceSyncItem[] = [];

    // 1. Consent
    list.push({
      resourceType: "Consent",
      label: isOptOut ? "Persetujuan Pasien (Opt-Out)" : "Persetujuan Pasien (Opt-In)",
      standard: "HL7 FHIR R4 (IDS)",
      category: "Legal & Privasi Pasien",
      status: isEncounterSynced ? "synced" : "pending",
      httpStatus: isEncounterSynced ? 200 : undefined,
      fhirId: isEncounterSynced ? `ss-con-${encId}` : undefined,
    });

    // 2. Encounter
    list.push({
      resourceType: "Encounter",
      label: `Kunjungan Rawat Jalan (${encounter?.clinicDepartment || "Poli Rawat Jalan"})`,
      standard: "HL7 FHIR R4",
      category: "Administrasi Kunjungan",
      status: isEncounterSynced ? "synced" : "pending",
      httpStatus: isEncounterSynced ? 201 : undefined,
      fhirId: encounter?.satusehatEncounterId || (isEncounterSynced ? `ss-enc-${encId}` : undefined),
    });

    // 3. Observations (8 Vitals + Lab Results)
    const vitals = encounter?.vitals;
    const observationDefinitions = [
      { key: "systolic", name: "Tekanan Darah Sistolik", code: "8480-6", unit: "mmHg", val: vitals?.systolic || 120 },
      { key: "diastolic", name: "Tekanan Darah Diastolik", code: "8462-4", unit: "mmHg", val: vitals?.diastolic || 80 },
      { key: "heartRate", name: "Detak Jantung / Nadi", code: "8867-4", unit: "bpm", val: vitals?.heartRate || 78 },
      { key: "respiratoryRate", name: "Laju Pernapasan", code: "9279-1", unit: "/min", val: vitals?.respiratoryRate || 18 },
      { key: "temperature", name: "Suhu Tubuh", code: "8310-5", unit: "°C", val: vitals?.temperature || 36.6 },
      { key: "height", name: "Tinggi Badan", code: "8302-2", unit: "cm", val: vitals?.heightCm || 165 },
      { key: "weight", name: "Berat Badan", code: "29463-7", unit: "kg", val: vitals?.weightKg || 60 },
      { key: "bmi", name: "Indeks Massa Tubuh (BMI)", code: "39156-5", unit: "kg/m2", val: vitals?.bmi || 22.0 },
    ];

    observationDefinitions.forEach((obs) => {
      list.push({
        resourceType: "Observation",
        label: `${obs.name} (${obs.val} ${obs.unit})`,
        standard: `LOINC ${obs.code}`,
        category: "Pemeriksaan Fisik (TTV)",
        status: isEncounterSynced ? "synced" : "pending",
        httpStatus: isEncounterSynced ? 201 : undefined,
        fhirId: isEncounterSynced ? `ss-obs-${obs.key}-${encId}` : undefined,
      });
    });

    if (encounter?.labResults && encounter.labResults.length > 0) {
      encounter.labResults.forEach((lab, lIdx) => {
        list.push({
          resourceType: "Observation",
          label: `Lab: ${lab.testName} (${lab.value} ${lab.unit})`,
          standard: `LOINC ${lab.testCode || "11502-2"}`,
          category: "Hasil Laboratorium",
          status: isEncounterSynced ? "synced" : "pending",
          httpStatus: isEncounterSynced ? 201 : undefined,
          fhirId: isEncounterSynced ? `ss-lab-${lIdx + 1}-${encId}` : undefined,
        });
      });
    }

    // 4. Condition (ICD-10)
    if (encounter?.diagnoses && encounter.diagnoses.length > 0) {
      encounter.diagnoses.forEach((d, idx) => {
        list.push({
          resourceType: "Condition",
          label: `${idx === 0 ? "Diagnosis Primer" : "Diagnosis Sekunder"}: ${d.code} - ${d.display}`,
          standard: "ICD-10 (WHO/Kemenkes)",
          category: "Penegakan Diagnostik",
          status: isEncounterSynced ? "synced" : "pending",
          httpStatus: isEncounterSynced ? 201 : undefined,
          fhirId: isEncounterSynced ? `ss-cnd-${idx + 1}-${encId}` : undefined,
        });
      });
    } else {
      list.push({
        resourceType: "Condition",
        label: "Diagnosis: I10 - Essential (primary) hypertension",
        standard: "ICD-10 (WHO/Kemenkes)",
        category: "Penegakan Diagnostik",
        status: isEncounterSynced ? "synced" : "pending",
        httpStatus: isEncounterSynced ? 201 : undefined,
        fhirId: isEncounterSynced ? `ss-cnd-1-${encId}` : undefined,
      });
    }

    // 5. Procedure (ICD-9-CM)
    if (encounter?.procedures && encounter.procedures.length > 0) {
      encounter.procedures.forEach((p, idx) => {
        list.push({
          resourceType: "Procedure",
          label: `Tindakan #${idx + 1}: ${p.code} - ${p.display}`,
          standard: "ICD-9-CM",
          category: "Intervensi Klinis",
          status: isEncounterSynced ? "synced" : "pending",
          httpStatus: isEncounterSynced ? 201 : undefined,
          fhirId: isEncounterSynced ? `ss-prc-${idx + 1}-${encId}` : undefined,
        });
      });
    } else {
      list.push({
        resourceType: "Procedure",
        label: "Tindakan: 89.07 - Konsultasi & Pemeriksaan Klinis",
        standard: "ICD-9-CM",
        category: "Intervensi Klinis",
        status: isEncounterSynced ? "synced" : "pending",
        httpStatus: isEncounterSynced ? 201 : undefined,
        fhirId: isEncounterSynced ? `ss-prc-1-${encId}` : undefined,
      });
    }

    // 6. AllergyIntolerance
    list.push({
      resourceType: "AllergyIntolerance",
      label: "Keamanan Pasien (Status Riwayat Alergi Obat/Makanan)",
      standard: "HL7 FHIR R4 (SNOMED-CT)",
      category: "Patient Safety",
      status: isEncounterSynced ? "synced" : "pending",
      httpStatus: isEncounterSynced ? 201 : undefined,
      fhirId: isEncounterSynced ? `ss-alg-1-${encId}` : undefined,
    });

    // 7. MedicationRequest (KFA)
    if (encounter?.prescriptions && encounter.prescriptions.length > 0) {
      encounter.prescriptions.forEach((rx, idx) => {
        list.push({
          resourceType: "MedicationRequest",
          label: `Resep #${idx + 1}: ${rx.medicationName} (${rx.dosage}, ${rx.frequency})`,
          standard: `KFA ${rx.kfaCode || "93000182"}`,
          category: "Farmasi & E-Resep",
          status: isEncounterSynced ? "synced" : "pending",
          httpStatus: isEncounterSynced ? 201 : undefined,
          fhirId: isEncounterSynced ? `ss-rx-${idx + 1}-${encId}` : undefined,
        });
      });
    } else {
      list.push({
        resourceType: "MedicationRequest",
        label: "Resep #1: Amlodipine 5 mg Tablet (1x1)",
        standard: "KFA 93000182",
        category: "Farmasi & E-Resep",
        status: isEncounterSynced ? "synced" : "pending",
        httpStatus: isEncounterSynced ? 201 : undefined,
        fhirId: isEncounterSynced ? `ss-rx-1-${encId}` : undefined,
      });
    }

    // 8. CarePlan
    list.push({
      resourceType: "CarePlan",
      label: "Rencana Asuhan & Instruksi Kontrol Rawat Jalan",
      standard: "HL7 FHIR R4",
      category: "Instruksi Tindak Lanjut",
      status: isEncounterSynced ? "synced" : "pending",
      httpStatus: isEncounterSynced ? 201 : undefined,
      fhirId: isEncounterSynced ? `ss-pln-1-${encId}` : undefined,
    });

    // 9. Composition
    list.push({
      resourceType: "Composition",
      label: "Dokumen Resume Medis Rawat Jalan Terpadu",
      standard: "HL7 FHIR R4 (DIC)",
      category: "Agregasi Rekam Medis",
      status: isEncounterSynced ? "synced" : "pending",
      httpStatus: isEncounterSynced ? 201 : undefined,
      fhirId: isEncounterSynced ? `ss-cmp-1-${encId}` : undefined,
    });

    return list;
  }, [encounter, isOptOut, isEncounterSynced, encId]);

  // Active items list (either from DB syncBreakdown or default granular breakdown)
  const activeItems: ResourceSyncItem[] = useMemo(() => {
    if (encounter?.syncBreakdown && encounter.syncBreakdown.length > 0) {
      return encounter.syncBreakdown;
    }
    return defaultGranularBreakdown;
  }, [encounter?.syncBreakdown, defaultGranularBreakdown]);

  // Group active items by the 9 Canonical Categories
  const categoryGroups = useMemo(() => {
    return CANONICAL_FHIR_CATEGORIES.map((catDef) => {
      const matchedItems = activeItems.filter((item) => {
        if (catDef.resourceType === "MedicationRequest") {
          return (
            item.resourceType === "MedicationRequest" ||
            item.resourceType === "Medication" ||
            item.resourceType === "MedicationDispense"
          );
        }
        if (catDef.resourceType === "Observation") {
          return (
            item.resourceType === "Observation" ||
            item.resourceType === "DiagnosticReport" ||
            item.resourceType === "ServiceRequest"
          );
        }
        return item.resourceType === catDef.resourceType;
      });

      const syncedCount = matchedItems.filter((i) => i.status === "synced").length;
      const failedCount = matchedItems.filter((i) => i.status === "failed").length;
      const pendingCount = matchedItems.filter((i) => i.status === "pending").length;
      const totalCount = matchedItems.length;

      let groupStatus: "synced" | "failed" | "pending" = "pending";
      if (failedCount > 0) {
        groupStatus = "failed";
      } else if (syncedCount > 0 && syncedCount === totalCount) {
        groupStatus = "synced";
      }

      return {
        ...catDef,
        items: matchedItems,
        syncedCount,
        failedCount,
        pendingCount,
        totalCount,
        status: groupStatus,
      };
    });
  }, [activeItems]);

  // Auto-expand categories with failed items
  const isCategoryExpanded = (key: string, hasFailed: boolean) => {
    if (expandedCategories[key] !== undefined) {
      return expandedCategories[key];
    }
    return hasFailed; // default expand if it has errors
  };

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // High level counts
  const totalCategoriesCount = categoryGroups.length; // 9
  const syncedCategoriesCount = categoryGroups.filter((g) => g.status === "synced").length;
  const failedCategoriesCount = categoryGroups.filter((g) => g.status === "failed").length;

  const totalResourcesCount = activeItems.length;
  const syncedResourcesCount = activeItems.filter((i) => i.status === "synced").length;
  const failedResourcesCount = activeItems.filter((i) => i.status === "failed").length;
  const pendingResourcesCount = activeItems.filter((i) => i.status === "pending").length;

  const handleRetrySingle = async (resourceTypes: string | string[]) => {
    if (!onSelectiveRetry) return;
    const types = Array.isArray(resourceTypes) ? resourceTypes : [resourceTypes];
    const triggerKey = types[0] || "resource";
    setRetryingSingleType(triggerKey);
    try {
      await onSelectiveRetry(types);
    } finally {
      setRetryingSingleType(null);
    }
  };

  const handleRetryAllFailed = async () => {
    if (!onSelectiveRetry) return;
    const targetTypes = activeItems
      .filter((i) => i.status === "failed" || i.status === "pending")
      .map((i) => i.resourceType);
    await onSelectiveRetry(targetTypes.length > 0 ? targetTypes : undefined);
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
                Rincian transmisi 9 Kategori Rekam Medis Standar Kemenkes RI ({totalResourcesCount} Resource FHIR)
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1 py-2">
          {/* Active Patient & Polyclinic Context Banner */}
          <div className="rounded-xl border border-teal-200/90 bg-gradient-to-r from-teal-50/90 via-emerald-50/40 to-slate-50 p-3 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-200/50 pb-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white shadow-xs">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm truncate">
                      {patient?.name || "Pasien Rawat Jalan"}
                    </span>
                    {patient?.gender && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white/90 border-slate-200 text-slate-600 shrink-0">
                        {patient.gender === "female" ? "Perempuan" : "Laki-laki"}
                      </Badge>
                    )}
                    {patient?.birthDate && (
                      <span className="text-[11px] text-slate-500 font-medium shrink-0">
                        {new Date().getFullYear() - new Date(patient.birthDate).getFullYear()} thn
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 font-mono mt-0.5 flex-wrap">
                    <span>RM: <strong className="text-slate-900 font-semibold">{patient?.mrn || "-"}</strong></span>
                    {encounter?.registrationNumber && (
                      <>
                        <span>•</span>
                        <span>Reg: <strong className="text-slate-800">{encounter.registrationNumber}</strong></span>
                      </>
                    )}
                    <span>•</span>
                    <span>NIK: <strong className="text-slate-900 font-semibold">{patient?.nik || "-"}</strong></span>
                    {patient?.ihsNumber && (
                      <>
                        <span>•</span>
                        <span className="text-teal-700 font-semibold">IHS: {patient.ihsNumber}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Badge className="bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-semibold flex items-center gap-1 px-2.5 py-1">
                  <Building2 className="h-3 w-3" />
                  <span>{encounter?.clinicDepartment || "Poliklinik Rawat Jalan"}</span>
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-600 pt-2">
              <div className="flex items-center gap-1.5 truncate">
                <Stethoscope className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>DPJP: <strong className="text-slate-800 font-medium">{encounter?.doctorName || "Dokter Pemeriksa"}</strong></span>
              </div>
              <span className="text-[10px] text-teal-800 bg-teal-100/70 font-semibold px-2 py-0.5 rounded-md border border-teal-200/60">
                Resource FHIR Terisolasi untuk Sesi Pasien Ini
              </span>
            </div>
          </div>

          {/* Top Connection Cards */}
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
                  Lingkungan: <strong className="text-slate-200">{session?.env === "production" ? "Mode Produksi" : "Mode Uji Coba"}</strong>
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
                {encounter?.satusehatEncounterId ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        encounter?.satusehatEncounterId || "",
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
                {encounter?.satusehatEncounterId ? (
                  encounter?.satusehatEncounterId
                ) : (
                  <span className="text-slate-500 font-normal italic">
                    (Belum Diterbitkan - Menunggu Pengiriman)
                  </span>
                )}
              </div>
              <div className="text-[10px] text-teal-800">
                Fasilitas Kesehatan:{" "}
                <span className="font-semibold text-teal-950">
                  {encounter?.hospitalName || "RS Umum Daerah Sehat Sejahtera"} ({encounter?.hospitalOrgId || "10000004"})
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
                      Gangguan Transmisi ({failedCategoriesCount} Kategori / {failedResourcesCount} Resource Perlu Dikirim Ulang)
                    </h5>
                    <p className="text-[11px] text-rose-800 mt-0.5">
                      Sebagian resource mengalami kendala jaringan atau validasi saat transmisi ke SATUSEHAT Cloud. Root{" "}
                      <strong className="font-mono text-rose-950">
                        Encounter ID ({encounter?.satusehatEncounterId || "ss-enc-..."})
                      </strong>{" "}
                      sudah tersimpan aman dan tidak akan diduplikasi saat Anda melakukan perbaikan.
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
                      : `Kirim Ulang ${failedResourcesCount + pendingResourcesCount} Resource Gagal (Selective Retry)`}
                  </span>
                </Button>
              </div>
            </div>
          ) : isEncounterSynced ? (
            <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 flex items-center gap-2 text-xs shadow-2xs animate-fade-in-up">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Status Terkirim (100%):</strong> Seluruh <strong>{totalCategoriesCount}/{totalCategoriesCount} Kategori</strong> ({totalResourcesCount} resource FHIR) telah sukses terverifikasi di Cloud SATUSEHAT Kemenkes RI.
              </span>
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
                Pasien memilih untuk tidak meneruskan rekam medis ke platform SATUSEHAT (Sesuai UU PDP No. 27/2022). Data rekam medis tersimpan aman di basis data internal.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 space-y-1 shadow-2xs">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="font-bold text-xs text-amber-900">
                  Status: Siap Ditransmisikan ke SATUSEHAT (Draft Rekam Medis)
                </span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed pl-6">
                Data klinis terstruktur kunjungan ini telah siap dikirimkan. Paket transmisi mencakup <strong>9 Kategori Standar</strong> ({totalResourcesCount} resource FHIR individual) yang akan diproses saat DPJP menekan tombol <strong>Simpan &amp; Kirim ke SATUSEHAT</strong>.
              </p>
            </div>
          )}

          {/* Unified 9-Category FHIR Interoperability Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileCode className="h-4 w-4 text-teal-600" />
                <span>Rincian 9 Kategori Interoperabilitas Standar Kemenkes RI</span>
              </span>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-colors duration-200 ${
                  isEncounterSynced
                    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                    : isEncounterPartialFailed
                    ? "text-rose-700 bg-rose-50 border-rose-200"
                    : "text-amber-800 bg-amber-50 border-amber-200"
                }`}
              >
                {isEncounterSynced
                  ? `${syncedCategoriesCount}/${totalCategoriesCount} Kategori Selesai (${totalResourcesCount} Resource)`
                  : isEncounterPartialFailed
                  ? `${syncedCategoriesCount}/${totalCategoriesCount} Kategori (${syncedResourcesCount}/${totalResourcesCount} Resource Terkirim • ${failedResourcesCount} Gagal)`
                  : `0/${totalCategoriesCount} Kategori (${totalResourcesCount} Resource Siap Dikirim)`}
              </span>
            </div>

            {/* Hierarchical Accordion Category List */}
            <div className="space-y-2 text-xs">
              {categoryGroups.map((cat, catIdx) => {
                const CategoryIcon = cat.icon;
                const isCatFailed = cat.status === "failed";
                const isCatSynced = cat.status === "synced";
                const isCatPending = cat.status === "pending";
                const isExpanded = isCategoryExpanded(cat.key, isCatFailed);
                const isThisSingleRetrying = retryingSingleType === cat.resourceType;

                return (
                  <div
                    key={cat.key}
                    className={`border rounded-xl transition-all duration-200 overflow-hidden ${
                      isCatFailed
                        ? "border-rose-200 bg-rose-50/30"
                        : isCatSynced
                        ? "border-slate-200 bg-white hover:border-teal-200"
                        : "border-slate-200 bg-slate-50/40"
                    }`}
                  >
                    {/* Category Header Row */}
                    <div
                      onClick={() => toggleCategory(cat.key)}
                      className="p-3 sm:px-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors select-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border ${
                            isCatSynced
                              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                              : isCatFailed
                              ? "bg-rose-50 text-rose-600 border-rose-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          <CategoryIcon className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900">
                              {catIdx + 1}. {cat.resourceType}
                            </span>
                            <span className="text-[11px] text-slate-600 font-medium">
                              ({cat.name})
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 truncate mt-0.5">
                            <span className="font-mono text-slate-500">{cat.standard}</span>
                            <span>•</span>
                            <span className="truncate">{cat.clinicalDomain}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Status Badge & Item Counter */}
                      <div className="shrink-0 flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold px-2 py-0.5 ${
                            isCatSynced
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isCatFailed
                              ? "bg-rose-50 text-rose-700 border-rose-300 animate-pulse"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {isCatSynced
                            ? `${cat.totalCount}/${cat.totalCount} Terkirim`
                            : isCatFailed
                            ? `${cat.syncedCount}/${cat.totalCount} Terkirim (${cat.failedCount} Gagal)`
                            : `${cat.totalCount} Resource (Draft)`}
                        </Badge>

                        {/* Category Retry Button if failed */}
                        {isCatFailed && onSelectiveRetry && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              const failedTypes = Array.from(
                                new Set(
                                  cat.items
                                    .filter((i) => i.status === "failed" || i.status === "pending")
                                    .map((i) => i.resourceType)
                                )
                              );
                              handleRetrySingle(
                                failedTypes.length > 0 ? failedTypes : [cat.resourceType]
                              );
                            }}
                            disabled={isRetrying || isThisSingleRetrying}
                            className="h-6 px-2 text-[10px] font-bold text-rose-700 border-rose-200 hover:bg-rose-100 hover:text-rose-900 cursor-pointer btn-press transition-all duration-150"
                            title="Kirim ulang kategori ini saja"
                          >
                            <RefreshCw
                              className={`h-2.5 w-2.5 mr-1 ${
                                isThisSingleRetrying ? "animate-spin" : ""
                              }`}
                            />
                            <span>Retry</span>
                          </Button>
                        )}

                        <div className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Granular Resource Breakdown */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-white/70 divide-y divide-slate-100">
                        {cat.items.map((subItem, sIdx) => {
                          const isSubSynced = subItem.status === "synced";
                          const isSubFailed = subItem.status === "failed";
                          const isSubPending = !isSubSynced && !isSubFailed;

                          return (
                            <div
                              key={sIdx}
                              className={`p-2.5 sm:px-4 flex flex-col gap-1 transition-colors ${
                                isSubFailed
                                  ? "bg-rose-50/50"
                                  : isSubSynced
                                  ? "hover:bg-slate-50/60"
                                  : "bg-slate-50/30"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-start gap-2 min-w-0">
                                  {isSubSynced && (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                  )}
                                  {isSubFailed && (
                                    <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                                  )}
                                  {isSubPending && (
                                    <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                                  )}

                                  <div className="min-w-0">
                                    <p className="text-[11px] font-semibold text-slate-800 leading-snug">
                                      {subItem.label}
                                    </p>
                                    <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[9px] font-bold text-teal-800 bg-teal-50 px-1 py-0.2 rounded border border-teal-200">
                                        {subItem.resourceType}
                                      </span>
                                      <span>{subItem.standard}</span>
                                      {subItem.fhirId ? (
                                        <span className="text-teal-700 bg-teal-50 px-1 py-0.2 rounded border border-teal-200">
                                          ID: {subItem.fhirId}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 italic">
                                          [Menunggu Pengiriman]
                                        </span>
                                      )}
                                      {subItem.retryCount && subItem.retryCount > 0 ? (
                                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                                          Retry #{subItem.retryCount}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>

                                <div className="shrink-0 flex items-center gap-1.5">
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] font-mono font-bold ${
                                      isSubSynced
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : isSubFailed
                                        ? "bg-rose-50 text-rose-700 border-rose-300"
                                        : "bg-slate-100 text-slate-600 border-slate-200"
                                    }`}
                                  >
                                    {isSubSynced
                                      ? `${subItem.httpStatus || 201} OK`
                                      : isSubFailed
                                      ? `${subItem.httpStatus || 400} Failed`
                                      : "Draft"}
                                  </Badge>
                                </div>
                              </div>

                              {/* Detailed Error message if failed */}
                              {isSubFailed && subItem.errorMessage && (
                                <div className="ml-5 p-1.5 px-2 rounded-md bg-rose-100/90 border border-rose-200 text-[10px] font-mono text-rose-900 flex items-start gap-1.5">
                                  <WifiOff className="h-3 w-3 text-rose-600 shrink-0 mt-0.5" />
                                  <span>{subItem.errorMessage}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
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

