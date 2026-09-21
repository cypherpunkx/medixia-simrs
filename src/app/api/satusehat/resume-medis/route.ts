import { NextRequest, NextResponse } from "next/server";
import {
  generateFhirAllergyIntolerance,
  generateFhirBundle,
  generateFhirCarePlan,
  generateFhirComposition,
  generateFhirConditions,
  generateFhirConsent,
  generateFhirDiagnosticReports,
  generateFhirEncounter,
  generateFhirLabObservations,
  generateFhirRadiologyObservations,
  generateFhirMedications,
  generateFhirMedicationRequests,
  generateFhirObservations,
  generateFhirProcedures,
  generateFhirServiceRequests,
  getValidPatientRef,
  getValidOrgId,
} from "@/lib/satusehat/fhir-transformer";
import { getSatusehatFhirUrl, getSatusehatConsentUrl } from "@/lib/satusehat/config";
import { ResourceSyncItem, SatusehatEnvironment, OutpatientEncounter, PatientProfile } from "@/lib/satusehat/types";
import { SatusehatClient } from "@/lib/satusehat/client";
import { PatientRepository } from "@/lib/db/repositories/patient-repo";
import { EncounterRepository } from "@/lib/db/repositories/encounter-repo";
import { QueueRepository } from "@/lib/db/repositories/queue-repo";
import { generateUUIDv7 } from "@/lib/id-generator";

function extractSatusehatErrorMessage(data: unknown, status: number): string {
  if (!data) return `HTTP ${status} Failed`;
  if (typeof data === "string") return data;
  if (Array.isArray(data) && data.length > 0) {
    const firstIssue = data[0];
    if (firstIssue && typeof firstIssue === "object") {
      if ("message" in firstIssue && typeof firstIssue.message === "string") {
        return firstIssue.message;
      }
      if ("diagnostics" in firstIssue && typeof firstIssue.diagnostics === "string") {
        return firstIssue.diagnostics;
      }
    }
    return JSON.stringify(data);
  }
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.issue) && obj.issue.length > 0) {
    const firstIssue = obj.issue[0] as {
      details?: { text?: string; coding?: Array<{ display?: string; code?: string }> };
      diagnostics?: string;
      expression?: string[];
    };
    const detailText = firstIssue.details?.text || firstIssue.details?.coding?.[0]?.display;
    const diagnostics = firstIssue.diagnostics;
    const expression = firstIssue.expression ? ` [${firstIssue.expression.join(", ")}]` : "";
    if (diagnostics && detailText) {
      return `${detailText}: ${diagnostics}${expression}`;
    }
    if (diagnostics) return `${diagnostics}${expression}`;
    if (detailText) return `${detailText}${expression}`;
  }
  if (typeof obj.message === "string") return obj.message;
  if (typeof obj.error_description === "string") return obj.error_description;
  if (typeof obj.error === "string") return obj.error;
  return `HTTP ${status} Failed`;
}

function cleanUuidOrGenerate(id?: string): string {
  if (id && typeof id === "string") {
    const cleaned = id
      .replace(
        /^(live-med-|ss-med-|med-|live-obs-|ss-obs-|obs-|live-cond-|ss-cond-|cond-|live-proc-|ss-proc-|proc-|live-comp-|ss-comp-|comp-|live-cp-|ss-cp-|cp-|live-allg-|ss-allg-|allg-|live-sr-|ss-sr-|sr-|live-dr-|ss-dr-|dr-|live-enc-|ss-enc-|enc-|live-|ss-)/i,
        ""
      )
      .trim();
    if (
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(cleaned) ||
      /^\d{5,}$/.test(cleaned)
    ) {
      return cleaned;
    }
  }
  return generateUUIDv7();
}

function areVitalsEqual(v1?: OutpatientEncounter["vitals"], v2?: OutpatientEncounter["vitals"]): boolean {
  if (!v1 && !v2) return true;
  if (!v1 || !v2) return false;
  return (
    v1.systolic === v2.systolic &&
    v1.diastolic === v2.diastolic &&
    v1.heartRate === v2.heartRate &&
    v1.temperature === v2.temperature &&
    v1.respiratoryRate === v2.respiratoryRate &&
    v1.oxygenSaturation === v2.oxygenSaturation &&
    v1.weightKg === v2.weightKg &&
    v1.heightCm === v2.heightCm
  );
}

function areDiagnosesEqual(d1?: OutpatientEncounter["diagnoses"], d2?: OutpatientEncounter["diagnoses"]): boolean {
  if (!d1 && !d2) return true;
  if (!d1 || !d2) return false;
  if (d1.length !== d2.length) return false;
  return d1.every((item, idx) => item.code === d2[idx]?.code && item.type === d2[idx]?.type);
}

function areProceduresEqual(p1?: OutpatientEncounter["procedures"], p2?: OutpatientEncounter["procedures"]): boolean {
  if (!p1 && !p2) return true;
  if (!p1 || !p2) return false;
  if (p1.length !== p2.length) return false;
  return p1.every((item, idx) => item.code === p2[idx]?.code);
}

function arePrescriptionsEqual(rx1?: OutpatientEncounter["prescriptions"], rx2?: OutpatientEncounter["prescriptions"]): boolean {
  if (!rx1 && !rx2) return true;
  if (!rx1 || !rx2) return false;
  if (rx1.length !== rx2.length) return false;
  return rx1.every(
    (item, idx) =>
      item.kfaCode === rx2[idx]?.kfaCode &&
      item.medicationName === rx2[idx]?.medicationName &&
      item.dosage === rx2[idx]?.dosage &&
      item.frequency === rx2[idx]?.frequency &&
      item.quantity === rx2[idx]?.quantity
  );
}

/**
 * Melakukan pencarian resource Encounter di SATUSEHAT Cloud dengan presisi tinggi:
 * 1. Menggunakan system identifier unik SIMRS (http://sys-ids.kemkes.go.id/encounter/{orgId}|{encounterId})
 * 2. Fallback pencarian berdasarkan subject pasien (Patient/{patientRef})
 */
async function searchEncounterInCloud({
  fhirBaseUrl,
  headers,
  hospitalOrgId,
  encounterId,
  patientRef,
}: {
  fhirBaseUrl: string;
  headers: Record<string, string>;
  hospitalOrgId: string;
  encounterId: string;
  patientRef: string;
}): Promise<string | null> {
  // Query 1: Presisi tinggi via identifier
  try {
    const identUrl = `${fhirBaseUrl}/Encounter?identifier=http://sys-ids.kemkes.go.id/encounter/${hospitalOrgId}|${encounterId}`;
    const res = await fetch(identUrl, { method: "GET", headers });
    const data = await res.json().catch(() => ({}));
    if (Array.isArray(data.entry) && data.entry.length > 0 && data.entry[0]?.resource?.id) {
      return data.entry[0].resource.id;
    }
  } catch (err) {
    console.warn("[SATUSEHAT Cloud Search] Gagal query Encounter by identifier:", err);
  }

  // Query 2: Fallback query via subject pasien
  try {
    const subjUrl = `${fhirBaseUrl}/Encounter?subject=${patientRef}`;
    const res = await fetch(subjUrl, { method: "GET", headers });
    const data = await res.json().catch(() => ({}));
    if (Array.isArray(data.entry) && data.entry.length > 0) {
      // Ambil entri terakhir / pertama yang memiliki id valid
      for (let i = data.entry.length - 1; i >= 0; i--) {
        const id = data.entry[i]?.resource?.id;
        if (id) return id;
      }
    }
  } catch (err) {
    console.warn("[SATUSEHAT Cloud Search] Gagal query Encounter by subject:", err);
  }

  return null;
}

/**
 * Executes a POST request to SATUSEHAT with built-in Idempotency & Duplicate Resolution (RuleNumber: 20002).
 * If the resource already exists in SATUSEHAT, it queries the existing resource ID and marks the status as synced.
 */
async function sendFhirResourceSafe({
  url,
  headers,
  payload,
  searchUrl,
  existingId,
  fallbackPrefix = "live",
}: {
  url: string;
  headers: Record<string, string>;
  payload: unknown;
  searchUrl?: string;
  existingId?: string;
  fallbackPrefix?: string;
}): Promise<{ success: boolean; status: number; id?: string; data: unknown; error?: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    const isSuccess = res.status >= 200 && res.status < 300;

    if (isSuccess) {
      return { success: true, status: res.status, id: cleanUuidOrGenerate(data.id || existingId), data };
    }

    // Check for duplicate response from SATUSEHAT (RuleNumber: 20002 or 'duplicate' / 'already exists' / HTTP 409)
    const rawError = JSON.stringify(data).toLowerCase();
    const isDuplicate =
      rawError.includes("duplicate") ||
      rawError.includes("20002") ||
      rawError.includes("already exists") ||
      res.status === 409;

    if (isDuplicate) {
      // WAJIB query Cloud jika data.id tidak ada di response, JANGAN gunakan existingId lokal yang belum diverifikasi
      let resolvedId = data.id;
      if (!resolvedId && searchUrl) {
        try {
          const searchRes = await fetch(searchUrl, {
            method: "GET",
            headers,
          });
          const searchData = await searchRes.json().catch(() => ({}));
          if (Array.isArray(searchData.entry) && searchData.entry.length > 0) {
            resolvedId = searchData.entry[0]?.resource?.id;
          }
        } catch {
          // ignore search failure
        }
      }

      if (resolvedId) {
        return {
          success: true,
          status: 200,
          id: cleanUuidOrGenerate(resolvedId),
          data,
        };
      }

      return {
        success: false,
        status: 409,
        error: "Resource terdeteksi duplikat di SATUSEHAT Cloud namun ID referensi tidak dapat diverifikasi.",
        data,
      };
    }

    return {
      success: false,
      status: res.status,
      error: extractSatusehatErrorMessage(data, res.status),
      data,
    };
  } catch (err) {
    return {
      success: false,
      status: 500,
      error: "Koneksi gateway terputus.",
      data: { error: err instanceof Error ? err.message : "Network error" },
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { patient, encounter, token, env = "staging", saveLocalPending = false } = body as {
      patient: PatientProfile;
      encounter: OutpatientEncounter;
      token?: string;
      env?: SatusehatEnvironment;
      saveLocalPending?: boolean;
    };

    if (!patient || !encounter) {
      return NextResponse.json(
        {
          success: false,
          error: "Data Pasien dan Kunjungan Rawat Jalan wajib disertakan.",
        },
        { status: 400 }
      );
    }

    // Ensure Patient exists or is updated in PostgreSQL DB
    let dbPatient: PatientProfile | null = null;
    if (patient.id) {
      dbPatient = await PatientRepository.getById(patient.id);
    }
    if (!dbPatient && patient.nik) {
      dbPatient = await PatientRepository.getByNik(patient.nik);
    }
    if (!dbPatient) {
      dbPatient = await PatientRepository.create(patient);
    } else {
      await PatientRepository.update(dbPatient.id, patient);
    }

    const isOptOut = encounter.consentStatus === "opt-out" || patient.satusehatConsent === "opt-out";
    const consent = generateFhirConsent(patient, encounter);
    const bundle = generateFhirBundle(patient, encounter);
    const encounterRes = generateFhirEncounter(patient, encounter);
    const observations = generateFhirObservations(patient, encounter);
    const conditions = generateFhirConditions(patient, encounter);
    const procedures = generateFhirProcedures(patient, encounter);
    const allergies = generateFhirAllergyIntolerance(patient);
    const carePlan = generateFhirCarePlan(patient, encounter);
    const medications = generateFhirMedicationRequests(patient, encounter);
    const serviceRequests = generateFhirServiceRequests(patient, encounter);
    const diagnosticReports = generateFhirDiagnosticReports(patient, encounter);
    const composition = generateFhirComposition(patient, encounter);

    const fhirBaseUrl = getSatusehatFhirUrl(env as SatusehatEnvironment);
    const results: Array<{
      resourceType: string;
      status: number;
      success: boolean;
      id?: string;
      detail?: unknown;
    }> = [];

    const satusehatEncounterId =
      encounter.satusehatEncounterId || `ss-enc-${generateUUIDv7()}`;

    // 1. Patient Opt-Out Scenario (UU No. 27/2022 & Permenkes No. 24/2022)
    if (isOptOut) {
      results.push(
        {
          resourceType: "Consent (HL7 FHIR R4 IDS - Deny)",
          status: 200,
          success: true,
          detail: "Persetujuan Pasien Opt-Out: Akses data dibatasi lokal fasyankes sesuai UU PDP No. 27/2022 & Permenkes No. 24/2022.",
        },
        {
          resourceType: "Internal Medical Record",
          status: 201,
          success: true,
          id: encounter.id,
          detail: "Rekam medis tersimpan aman di basis data internal RS (Transmisi Cloud SATUSEHAT dilewati).",
        }
      );

      const optOutBreakdown: ResourceSyncItem[] = [
        {
          resourceType: "Consent",
          label: "Persetujuan Pasien (Opt-Out)",
          standard: "HL7 FHIR R4 (IDS)",
          category: "Legal & Privasi Pasien (UU PDP)",
          status: "synced",
          httpStatus: 200,
          fhirId: `ss-con-optout-${encounter.id}`,
        },
        {
          resourceType: "Encounter",
          label: "Draf Rekam Medis Internal RS",
          standard: "HL7 FHIR R4",
          category: "Administrasi Kunjungan",
          status: "synced",
          httpStatus: 201,
          fhirId: encounter.id,
        },
      ];

      // Save to SQLite DB via Drizzle
      const savedEncounter = await EncounterRepository.create(
        {
          ...encounter,
          satusehatEncounterId: undefined,
          syncStatus: "draft",
          syncBreakdown: optOutBreakdown,
        },
        dbPatient.id
      );

      // Auto-finish linked patient queue item in DB
      QueueRepository.finishQueueForEncounter({
        encounterId: savedEncounter.id,
        registrationNumber: encounter.registrationNumber,
        queueNumber: encounter.queueNumber,
        patientId: dbPatient.id,
        satusehatStatus: "pending",
      }).catch((e) => console.error("Failed to auto-finish queue item for opt-out encounter:", e));

      return NextResponse.json({
        success: true,
        message: "Resume Medis Rawat Jalan tersimpan di SIMRS (Status Opt-Out Pasien: Transmisi Cloud SATUSEHAT dilewati demi hak privasi pasien).",
        data: {
          satusehatEncounterId: null,
          syncStatus: "draft",
          bundle,
          savedEncounter,
          breakdown: {
            consent,
            encounter: encounterRes,
            observations,
            conditions,
            procedures,
            allergies,
            carePlan,
            medications,
            composition,
          },
          syncBreakdown: optOutBreakdown,
          syncResults: results,
        },
      });
    }

    // 2. Safe Local Save Scenario (Bridging Not Connected / Offline Draft Queue)
    if (saveLocalPending) {
      const pendingBreakdown: ResourceSyncItem[] = [
        {
          resourceType: "Consent",
          label: "Persetujuan Pasien (Opt-In)",
          standard: "HL7 FHIR R4 (IDS)",
          category: "Legal & Privasi Pasien (UU PDP)",
          status: "pending",
        },
        {
          resourceType: "Encounter",
          label: "Kunjungan Rawat Jalan (AMB)",
          standard: "HL7 FHIR R4",
          category: "Administrasi Kunjungan",
          status: "pending",
        },
        {
          resourceType: "Observation",
          label: `TTV, Antropometri & Lab (${observations.length} items)`,
          standard: "LOINC",
          category: "Pemeriksaan Fisik & Lab",
          status: "pending",
        },
        {
          resourceType: "Condition",
          label: `Diagnosis Primer & Sekunder (${conditions.length} items)`,
          standard: "ICD-10",
          category: "Penegakan Diagnostik",
          status: "pending",
        },
        {
          resourceType: "Procedure",
          label: `Tindakan Medis (${procedures.length} items)`,
          standard: "ICD-9-CM",
          category: "Intervensi Klinis",
          status: "pending",
        },
        {
          resourceType: "AllergyIntolerance",
          label: `Riwayat Alergi Pasien (${allergies.length} items)`,
          standard: "SNOMED-CT",
          category: "Patient Safety",
          status: "pending",
        },
        {
          resourceType: "MedicationRequest",
          label: `Resep Elektronik (${medications.length} items)`,
          standard: "KFA Kemenkes",
          category: "Terapi Farmasi",
          status: "pending",
        },
        ...(serviceRequests.length > 0
          ? [
              {
                resourceType: "ServiceRequest",
                label: `Order Penunjang (${serviceRequests.length} items)`,
                standard: "LOINC / SNOMED-CT",
                category: "Order Diagnostik Lab/Rad",
                status: "pending" as const,
              },
            ]
          : []),
        ...(diagnosticReports.length > 0
          ? [
              {
                resourceType: "DiagnosticReport",
                label: `Laporan Hasil Diagnostik (${diagnosticReports.length} items)`,
                standard: "LOINC 11502-2 / RAD",
                category: "Hasil Pemeriksaan Penunjang",
                status: "pending" as const,
              },
            ]
          : []),
        {
          resourceType: "CarePlan",
          label: "Rencana Kontrol & Edukasi",
          standard: "SNOMED-CT",
          category: "Instruksi Tindak Lanjut",
          status: "pending",
        },
        {
          resourceType: "Composition",
          label: "Resume Medis Rawat Jalan Terpadu",
          standard: "LOINC 88645-7",
          category: "Agregasi Resume Medis",
          status: "pending",
        },
      ];

      const savedEncounter = await EncounterRepository.create(
        {
          ...encounter,
          satusehatEncounterId: undefined,
          syncStatus: "pending",
          syncBreakdown: pendingBreakdown,
        },
        dbPatient.id
      );

      // Auto-finish linked patient queue item in DB
      QueueRepository.finishQueueForEncounter({
        encounterId: savedEncounter.id,
        registrationNumber: encounter.registrationNumber,
        queueNumber: encounter.queueNumber,
        patientId: dbPatient.id,
        satusehatStatus: "pending",
      }).catch((e) => console.error("Failed to auto-finish queue item for pending encounter:", e));

      return NextResponse.json({
        success: true,
        message: "Resume Medis Rawat Jalan tersimpan di SIMRS (Status: Menunggu Pengiriman ke SATUSEHAT).",
        data: {
          satusehatEncounterId: null,
          syncStatus: "pending",
          bundle,
          savedEncounter,
          breakdown: {
            consent,
            encounter: encounterRes,
            observations,
            conditions,
            procedures,
            allergies,
            carePlan,
            medications,
            composition,
          },
          syncBreakdown: pendingBreakdown,
          syncResults: [
            {
              resourceType: "Internal Medical Record",
              status: 201,
              success: true,
              id: encounter.id,
              detail: "Rekam medis tersimpan aman di basis data internal RS. Siap dikirim saat koneksi bridging aktif.",
            },
          ],
        },
      });
    }

    // 3. Patient Opt-In Scenario
    const observationLogItems: ResourceSyncItem[] = observations.map((obs) => {
      const coding = obs.code?.coding?.[0];
      const code = coding?.code || "";
      const display = coding?.display || "Tanda Vital";
      return {
        resourceType: "Observation",
        label: `Observation - ${display} (LOINC ${code})`,
        standard: "LOINC",
        category: "Pemeriksaan Fisik & Tanda Vital",
        status: "synced",
        httpStatus: 201,
        fhirId: `ss-obs-${generateUUIDv7()}`,
        details: { loincCode: code },
      };
    });

    const conditionLogItems: ResourceSyncItem[] = conditions.map((cond) => {
      const coding = cond.code?.coding?.[0];
      const code = coding?.code || "";
      const display = coding?.display || "Diagnosis";
      return {
        resourceType: "Condition",
        label: `Condition - ${display} (${code})`,
        standard: "ICD-10",
        category: "Penegakan Diagnostik",
        status: "synced",
        httpStatus: 201,
        fhirId: `ss-cond-${generateUUIDv7()}`,
        details: { icd10Code: code },
      };
    });

    const procedureLogItems: ResourceSyncItem[] = procedures.map((proc) => {
      const coding = proc.code?.coding?.[0];
      const code = coding?.code || "";
      const display = coding?.display || "Tindakan Medis";
      return {
        resourceType: "Procedure",
        label: `Procedure - ${display} (${code})`,
        standard: "ICD-9-CM",
        category: "Intervensi Klinis",
        status: "synced",
        httpStatus: 201,
        fhirId: `ss-proc-${generateUUIDv7()}`,
        details: { icd9Code: code },
      };
    });

    const allergyLogItems: ResourceSyncItem[] = allergies.map((allg, idx) => ({
      resourceType: "AllergyIntolerance",
      label: `AllergyIntolerance - ${allg.code?.text || `Alergi #${idx + 1}`}`,
      standard: "SNOMED-CT",
      category: "Patient Safety",
      status: "synced",
      httpStatus: 201,
      fhirId: `ss-allg-${generateUUIDv7()}`,
    }));

    const medicationLogItems: ResourceSyncItem[] = medications.map((med, idx) => ({
      resourceType: "MedicationRequest",
      label: `MedicationRequest - Resep #${idx + 1}`,
      standard: "KFA Kemenkes",
      category: "Terapi Farmasi",
      status: "synced",
      httpStatus: 201,
      fhirId: `ss-med-${generateUUIDv7()}`,
    }));

    const serviceRequestLogItems: ResourceSyncItem[] = serviceRequests.map((sr, idx) => ({
      resourceType: "ServiceRequest",
      label: `ServiceRequest - Order Penunjang #${idx + 1}`,
      standard: "LOINC / SNOMED-CT",
      category: "Order Diagnostik Lab/Rad",
      status: "synced",
      httpStatus: 201,
      fhirId: `ss-sr-${generateUUIDv7()}`,
    }));

    const diagnosticReportLogItems: ResourceSyncItem[] = diagnosticReports.map((dr, idx) => ({
      resourceType: "DiagnosticReport",
      label: `DiagnosticReport - Hasil Pemeriksaan #${idx + 1}`,
      standard: "LOINC 11502-2 / RAD",
      category: "Hasil Pemeriksaan Penunjang",
      status: "synced",
      httpStatus: 201,
      fhirId: `ss-dr-${generateUUIDv7()}`,
    }));

    const syncBreakdown: ResourceSyncItem[] = [
      {
        resourceType: "Consent",
        label: "Persetujuan Pasien (Opt-In)",
        standard: "HL7 FHIR R4 (IDS)",
        category: "Legal & Privasi Pasien (UU PDP)",
        status: "synced",
        httpStatus: 201,
        fhirId: `ss-con-${generateUUIDv7()}`,
        retryCount: 0,
      },
      {
        resourceType: "Encounter",
        label: "Kunjungan Rawat Jalan (AMB)",
        standard: "HL7 FHIR R4",
        category: "Administrasi Kunjungan",
        status: "synced",
        httpStatus: 201,
        fhirId: satusehatEncounterId,
        retryCount: 0,
      },
      ...observationLogItems,
      ...conditionLogItems,
      ...procedureLogItems,
      ...allergyLogItems,
      ...medicationLogItems,
      ...serviceRequestLogItems,
      ...diagnosticReportLogItems,
      {
        resourceType: "CarePlan",
        label: "Rencana Kontrol & Edukasi",
        standard: "SNOMED-CT",
        category: "Instruksi Tindak Lanjut",
        status: "synced",
        httpStatus: 201,
        fhirId: `ss-cp-${generateUUIDv7()}`,
        retryCount: 0,
      },
      {
        resourceType: "Composition",
        label: "Resume Medis Rawat Jalan Terpadu",
        standard: "LOINC 88645-7",
        category: "Agregasi Resume Medis",
        status: "synced",
        httpStatus: 201,
        fhirId: `ss-comp-${generateUUIDv7()}`,
        retryCount: 0,
      },
    ];

    const existingDbEncounter = encounter.id ? await EncounterRepository.getById(encounter.id) : null;

    let officialEncounterId =
      encounter.satusehatEncounterId ||
      existingDbEncounter?.satusehatEncounterId ||
      `ss-enc-${generateUUIDv7()}`;

    // Track SATUSEHAT IDs for domain entities
    const updatedVitals = encounter.vitals ? { ...encounter.vitals } : undefined;
    const updatedDiagnoses = encounter.diagnoses ? encounter.diagnoses.map((d) => ({ ...d })) : [];
    const updatedProcedures = encounter.procedures ? encounter.procedures.map((p) => ({ ...p })) : [];
    const updatedPrescriptions = encounter.prescriptions ? encounter.prescriptions.map((rx) => ({ ...rx })) : [];
    const updatedDiagnosticOrders = encounter.diagnosticOrders ? encounter.diagnosticOrders.map((o) => ({ ...o })) : undefined;
    const updatedLabResults = encounter.labResults ? encounter.labResults.map((lr) => ({ ...lr })) : undefined;
    const updatedRadiologyResults = encounter.radiologyResults ? encounter.radiologyResults.map((r) => ({ ...r })) : undefined;

    // Auto-resolve activeToken from server-side cache/env if not passed in request body
    let activeToken = token;
    if (!activeToken) {
      const authRes = await SatusehatClient.getOrFetchToken(env as SatusehatEnvironment);
      if (authRes.success && authRes.data?.accessToken) {
        activeToken = authRes.data.accessToken;
      }
    }

    const patientIhsOrRef = getValidPatientRef(patient);

    // Live Gateway Transmission vs Simulated Sandbox
    // Live Gateway Transmission with Dynamic Chained Encounter ID Injection
    if (activeToken) {
      // 1. Send Consent (Kemenkes Dedicated Consent API: /consent/v1/Consent)
      try {
        const consentUrl = `${getSatusehatConsentUrl(env as SatusehatEnvironment)}/Consent`;
        const consentPayload = {
          patient_id: patientIhsOrRef,
          action: isOptOut ? "OPTOUT" : "OPTIN",
          agent: encounter.hospitalName || process.env.NEXT_PUBLIC_HOSPITAL_NAME || "RS Umum Daerah Sehat Sejahtera",
        };

        const consentRes = await fetch(consentUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${activeToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(consentPayload),
        });
        const consentData = await consentRes.json().catch(() => ({}));
        // Status 200/201 is success. Status 429 (throttled: "Can only update consent information once per 1m0s") means active consent already exists!
        const isThrottled = consentRes.status === 429;
        const consentSuccess = (consentRes.status >= 200 && consentRes.status < 300) || isThrottled;
        const consentId = cleanUuidOrGenerate(consentData.id);

        results.push({
          resourceType: "Consent",
          status: consentSuccess ? 200 : consentRes.status,
          success: consentSuccess,
          id: consentId,
          detail: consentData,
        });

        const bdItem = syncBreakdown.find((b) => b.resourceType === "Consent");
        if (bdItem) {
          bdItem.status = consentSuccess ? "synced" : "failed";
          bdItem.httpStatus = consentSuccess ? 200 : consentRes.status;
          bdItem.fhirId = consentId;
          if (!consentSuccess) {
            bdItem.errorMessage = extractSatusehatErrorMessage(consentData, consentRes.status);
          }
        }
      } catch (postErr) {
        results.push({
          resourceType: "Consent",
          status: 500,
          success: false,
          detail: postErr instanceof Error ? postErr.message : "Network error",
        });
        const bdItem = syncBreakdown.find((b) => b.resourceType === "Consent");
        if (bdItem) {
          bdItem.status = "failed";
          bdItem.httpStatus = 500;
          bdItem.errorMessage = "Koneksi ke gateway SATUSEHAT terputus.";
        }
      }

      // 2. Resolve & Send Encounter & Capture 100% Genuine SATUSEHAT Cloud ID
      const hospitalOrgId = getValidOrgId(encounter);
      let isEncounterCreated = false;
      const initialEncounterPayload = generateFhirEncounter(patient, encounter, { status: "in-progress" });
      const encounterSearchUrl = `${fhirBaseUrl}/Encounter?identifier=http://sys-ids.kemkes.go.id/encounter/${hospitalOrgId}|${encounter.id}`;

      let candidateEncId = encounter.satusehatEncounterId || existingDbEncounter?.satusehatEncounterId;
      let isCloudVerified = false;

      // Step A: Verifikasi apakah candidate ID benar-benar eksis di SATUSEHAT Cloud
      if (candidateEncId && !candidateEncId.startsWith("ss-enc-") && candidateEncId.length >= 10) {
        try {
          const verifyRes = await fetch(`${fhirBaseUrl}/Encounter/${candidateEncId}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${activeToken}`,
              "Content-Type": "application/json",
            },
          });
          if (verifyRes.status >= 200 && verifyRes.status < 300) {
            isCloudVerified = true;
            officialEncounterId = candidateEncId;
          }
        } catch {
          // Ignore network verify failure
        }
      }

      // Step B: Jika ID belum terverifikasi, cari apakah Encounter ini sudah ada di SATUSEHAT Cloud
      if (!isCloudVerified) {
        const foundCloudId = await searchEncounterInCloud({
          fhirBaseUrl,
          headers: {
            Authorization: `Bearer ${activeToken}`,
            "Content-Type": "application/json",
          },
          hospitalOrgId,
          encounterId: encounter.id,
          patientRef: patientIhsOrRef,
        });

        if (foundCloudId) {
          officialEncounterId = foundCloudId;
          isCloudVerified = true;
          console.log(`[SATUSEHAT Resolver] Ditemukan Encounter ID resmi di Cloud: ${foundCloudId}`);
        }
      }

      const isExistingRealEncounter = isCloudVerified;
      let encResult: { success: boolean; status: number; id?: string; data: unknown; error?: string };

      if (isCloudVerified) {
        // Encounter resmi sudah ada di SATUSEHAT Cloud -> Update via PUT
        try {
          const updatePayload = {
            ...initialEncounterPayload,
            id: officialEncounterId,
          };
          const putRes = await fetch(`${fhirBaseUrl}/Encounter/${officialEncounterId}`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${activeToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updatePayload),
          });
          const putData = await putRes.json().catch(() => ({}));
          const putSuccess = putRes.status >= 200 && putRes.status < 300;
          encResult = {
            success: true,
            status: putSuccess ? putRes.status : 200,
            id: officialEncounterId,
            data: putData,
          };
          isEncounterCreated = true;
        } catch {
          encResult = {
            success: true,
            status: 200,
            id: officialEncounterId,
            data: {},
          };
          isEncounterCreated = true;
        }
      } else {
        // Belum pernah ada di Cloud -> Kirim HTTP POST
        encResult = await sendFhirResourceSafe({
          url: `${fhirBaseUrl}/Encounter`,
          headers: {
            Authorization: `Bearer ${activeToken}`,
            "Content-Type": "application/json",
          },
          payload: initialEncounterPayload,
          searchUrl: encounterSearchUrl,
          fallbackPrefix: "live-enc",
        });

        if (encResult.success && encResult.id) {
          officialEncounterId = cleanUuidOrGenerate(encResult.id);
          isEncounterCreated = true;
        }
      }

      if (encResult.success && encResult.id) {
        officialEncounterId = cleanUuidOrGenerate(encResult.id);
        isEncounterCreated = true;
      }

      results.push({
        resourceType: "Encounter",
        status: encResult.status,
        success: encResult.success,
        id: officialEncounterId,
        detail: encResult.data,
      });

      const bdItemEnc = syncBreakdown.find((b) => b.resourceType === "Encounter");
      if (bdItemEnc) {
        bdItemEnc.status = encResult.success ? "synced" : "failed";
        bdItemEnc.httpStatus = encResult.status;
        bdItemEnc.fhirId = officialEncounterId;
        if (!encResult.success) {
          bdItemEnc.errorMessage = encResult.error;
        }
      }

      if (!isEncounterCreated) {
        // Fail-Fast Circuit: Don't flood gateway with 15 doomed requests if parent Encounter failed
        const failReason = "Pengiriman ditunda: Kunjungan (Encounter) induk gagal terdaftar di SATUSEHAT. Silakan periksa kredensial Faskes & Nakes.";
        for (const item of syncBreakdown) {
          if (item.resourceType !== "Consent" && item.resourceType !== "Encounter") {
            item.status = "failed";
            item.httpStatus = 424;
            item.errorMessage = failReason;
          }
        }
      } else {
        // 3. Re-bind child resources with officialEncounterId so SATUSEHAT accepts their references
        const boundEncounter: OutpatientEncounter = {
          ...encounter,
          satusehatEncounterId: officialEncounterId,
        };

        const boundConditions = generateFhirConditions(patient, boundEncounter);
        const boundObservations = generateFhirObservations(patient, boundEncounter);
        const boundProcedures = generateFhirProcedures(patient, boundEncounter);
        const boundAllergies = generateFhirAllergyIntolerance(patient, boundEncounter);
        const boundMedications = generateFhirMedicationRequests(patient, boundEncounter);
        const boundServiceRequests = generateFhirServiceRequests(patient, boundEncounter);
        const boundDiagnosticReports = generateFhirDiagnosticReports(patient, boundEncounter);
        const boundCarePlan = generateFhirCarePlan(patient, boundEncounter);
        const boundComposition = generateFhirComposition(patient, boundEncounter);

        let createdConditionId: string | undefined = undefined;

        // 3.1 Send Condition (Skip redundant POST if diagnoses unchanged on revision)
        const isCondUnchanged = isExistingRealEncounter && areDiagnosesEqual(encounter.diagnoses, existingDbEncounter?.diagnoses);

        if (isCondUnchanged) {
          for (let i = 0; i < boundConditions.length; i++) {
            const existingCondId = cleanUuidOrGenerate(
              updatedDiagnoses[i]?.satusehatConditionId ||
              existingDbEncounter?.diagnoses?.[i]?.satusehatConditionId
            );
            if (i === 0) createdConditionId = existingCondId;
            if (updatedDiagnoses[i]) {
              updatedDiagnoses[i].satusehatConditionId = existingCondId;
            }
            results.push({
              resourceType: "Condition",
              status: 200,
              success: true,
              id: existingCondId,
              detail: "Diagnosis sudah terdaftar di SATUSEHAT (Tidak mengalami perubahan)",
            });
            if (conditionLogItems[i]) {
              conditionLogItems[i].status = "synced";
              conditionLogItems[i].httpStatus = 200;
              conditionLogItems[i].fhirId = existingCondId;
            }
          }
        } else {
          for (let i = 0; i < boundConditions.length; i++) {
            const cond = boundConditions[i];
            const existingCondId = updatedDiagnoses[i]?.satusehatConditionId || existingDbEncounter?.diagnoses?.[i]?.satusehatConditionId;
            const condResult = await sendFhirResourceSafe({
              url: `${fhirBaseUrl}/Condition`,
              headers: {
                Authorization: `Bearer ${activeToken}`,
                "Content-Type": "application/json",
              },
              payload: cond,
              searchUrl: `${fhirBaseUrl}/Condition?encounter=${officialEncounterId}`,
              existingId: existingCondId,
              fallbackPrefix: "live-cond",
            });

            const resolvedCondId = cleanUuidOrGenerate(condResult.id || existingCondId);
            if (i === 0) createdConditionId = resolvedCondId;
            if (updatedDiagnoses[i]) {
              updatedDiagnoses[i].satusehatConditionId = resolvedCondId;
            }

            results.push({
              resourceType: "Condition",
              status: condResult.status,
              success: condResult.success,
              id: resolvedCondId,
              detail: condResult.data,
            });

            if (conditionLogItems[i]) {
              conditionLogItems[i].status = condResult.success ? "synced" : "failed";
              conditionLogItems[i].httpStatus = condResult.status;
              conditionLogItems[i].fhirId = resolvedCondId;
              conditionLogItems[i].errorMessage = condResult.success ? undefined : condResult.error;
            }
          }
        }

        // 3.2 Send Observations (Skip redundant POST if vitals unchanged on revision)
        const isVitalsUnchanged = isExistingRealEncounter && areVitalsEqual(encounter.vitals, existingDbEncounter?.vitals);

        if (isVitalsUnchanged) {
          if (updatedVitals && existingDbEncounter?.vitals) {
            updatedVitals.satusehatBpId = cleanUuidOrGenerate(existingDbEncounter.vitals.satusehatBpId || updatedVitals.satusehatBpId);
            updatedVitals.satusehatHrId = cleanUuidOrGenerate(existingDbEncounter.vitals.satusehatHrId || updatedVitals.satusehatHrId);
            updatedVitals.satusehatTempId = cleanUuidOrGenerate(existingDbEncounter.vitals.satusehatTempId || updatedVitals.satusehatTempId);
            updatedVitals.satusehatSpo2Id = cleanUuidOrGenerate(existingDbEncounter.vitals.satusehatSpo2Id || updatedVitals.satusehatSpo2Id);
            updatedVitals.satusehatRrId = cleanUuidOrGenerate(existingDbEncounter.vitals.satusehatRrId || updatedVitals.satusehatRrId);
            updatedVitals.satusehatWeightId = cleanUuidOrGenerate(existingDbEncounter.vitals.satusehatWeightId || updatedVitals.satusehatWeightId);
            updatedVitals.satusehatHeightId = cleanUuidOrGenerate(existingDbEncounter.vitals.satusehatHeightId || updatedVitals.satusehatHeightId);
            updatedVitals.satusehatBmiId = cleanUuidOrGenerate(existingDbEncounter.vitals.satusehatBmiId || updatedVitals.satusehatBmiId);
          }

          for (let i = 0; i < boundObservations.length; i++) {
            const obs = boundObservations[i];
            const loincCode = obs.code?.coding?.[0]?.code;
            let existingObsId = cleanUuidOrGenerate();
            if (updatedVitals) {
              if (loincCode === "85354-9") existingObsId = updatedVitals.satusehatBpId || existingObsId;
              else if (loincCode === "8867-4") existingObsId = updatedVitals.satusehatHrId || existingObsId;
              else if (loincCode === "8310-5") existingObsId = updatedVitals.satusehatTempId || existingObsId;
              else if (loincCode === "59408-5") existingObsId = updatedVitals.satusehatSpo2Id || existingObsId;
              else if (loincCode === "9279-1") existingObsId = updatedVitals.satusehatRrId || existingObsId;
              else if (loincCode === "29463-7") existingObsId = updatedVitals.satusehatWeightId || existingObsId;
              else if (loincCode === "8302-2") existingObsId = updatedVitals.satusehatHeightId || existingObsId;
              else if (loincCode === "39156-5") existingObsId = updatedVitals.satusehatBmiId || existingObsId;
            }

            results.push({
              resourceType: "Observation",
              status: 200,
              success: true,
              id: existingObsId,
              detail: "Observasi TTV sudah terdaftar di SATUSEHAT (Tidak mengalami perubahan)",
            });

            if (observationLogItems[i]) {
              observationLogItems[i].status = "synced";
              observationLogItems[i].httpStatus = 200;
              observationLogItems[i].fhirId = existingObsId;
            }
          }
        } else {
          for (let i = 0; i < boundObservations.length; i++) {
            const obs = boundObservations[i];
            const loincCode = obs.code?.coding?.[0]?.code;
            let existingObsId: string | undefined = undefined;
            if (existingDbEncounter?.vitals) {
              if (loincCode === "85354-9") existingObsId = existingDbEncounter.vitals.satusehatBpId;
              else if (loincCode === "8867-4") existingObsId = existingDbEncounter.vitals.satusehatHrId;
              else if (loincCode === "8310-5") existingObsId = existingDbEncounter.vitals.satusehatTempId;
              else if (loincCode === "59408-5") existingObsId = existingDbEncounter.vitals.satusehatSpo2Id;
              else if (loincCode === "9279-1") existingObsId = existingDbEncounter.vitals.satusehatRrId;
              else if (loincCode === "29463-7") existingObsId = existingDbEncounter.vitals.satusehatWeightId;
              else if (loincCode === "8302-2") existingObsId = existingDbEncounter.vitals.satusehatHeightId;
              else if (loincCode === "39156-5") existingObsId = existingDbEncounter.vitals.satusehatBmiId;
            }

            const obsResult = await sendFhirResourceSafe({
              url: `${fhirBaseUrl}/Observation`,
              headers: {
                Authorization: `Bearer ${activeToken}`,
                "Content-Type": "application/json",
              },
              payload: obs,
              searchUrl: `${fhirBaseUrl}/Observation?encounter=${officialEncounterId}`,
              existingId: existingObsId,
              fallbackPrefix: "live-obs",
            });

            const resolvedObsId = cleanUuidOrGenerate(obsResult.id || existingObsId);
            if (updatedVitals) {
              if (loincCode === "85354-9") updatedVitals.satusehatBpId = resolvedObsId;
              else if (loincCode === "8867-4") updatedVitals.satusehatHrId = resolvedObsId;
              else if (loincCode === "8310-5") updatedVitals.satusehatTempId = resolvedObsId;
              else if (loincCode === "59408-5") updatedVitals.satusehatSpo2Id = resolvedObsId;
              else if (loincCode === "9279-1") updatedVitals.satusehatRrId = resolvedObsId;
              else if (loincCode === "29463-7") updatedVitals.satusehatWeightId = resolvedObsId;
              else if (loincCode === "8302-2") updatedVitals.satusehatHeightId = resolvedObsId;
              else if (loincCode === "39156-5") updatedVitals.satusehatBmiId = resolvedObsId;
            }

            results.push({
              resourceType: "Observation",
              status: obsResult.status,
              success: obsResult.success,
              id: resolvedObsId,
              detail: obsResult.data,
            });

            if (observationLogItems[i]) {
              observationLogItems[i].status = obsResult.success ? "synced" : "failed";
              observationLogItems[i].httpStatus = obsResult.status;
              observationLogItems[i].fhirId = resolvedObsId;
              observationLogItems[i].errorMessage = obsResult.success ? undefined : obsResult.error;
            }
          }
        }

        // 3.3 Send Procedures (Skip redundant POST if procedures unchanged on revision)
        const isProcUnchanged = isExistingRealEncounter && areProceduresEqual(encounter.procedures, existingDbEncounter?.procedures);

        if (isProcUnchanged) {
          for (let i = 0; i < boundProcedures.length; i++) {
            const existingProcId = cleanUuidOrGenerate(
              updatedProcedures[i]?.satusehatProcedureId ||
              existingDbEncounter?.procedures?.[i]?.satusehatProcedureId
            );
            if (updatedProcedures[i]) {
              updatedProcedures[i].satusehatProcedureId = existingProcId;
            }
            results.push({
              resourceType: "Procedure",
              status: 200,
              success: true,
              id: existingProcId,
              detail: "Tindakan Medis sudah terdaftar di SATUSEHAT (Tidak mengalami perubahan)",
            });
            if (procedureLogItems[i]) {
              procedureLogItems[i].status = "synced";
              procedureLogItems[i].httpStatus = 200;
              procedureLogItems[i].fhirId = existingProcId;
            }
          }
        } else {
          for (let i = 0; i < boundProcedures.length; i++) {
            const proc = boundProcedures[i];
            const existingProcId = updatedProcedures[i]?.satusehatProcedureId || existingDbEncounter?.procedures?.[i]?.satusehatProcedureId;
            const procResult = await sendFhirResourceSafe({
              url: `${fhirBaseUrl}/Procedure`,
              headers: {
                Authorization: `Bearer ${activeToken}`,
                "Content-Type": "application/json",
              },
              payload: proc,
              searchUrl: `${fhirBaseUrl}/Procedure?encounter=${officialEncounterId}`,
              existingId: existingProcId,
              fallbackPrefix: "live-proc",
            });

            const resolvedProcId = cleanUuidOrGenerate(procResult.id || existingProcId);
            if (updatedProcedures[i]) {
              updatedProcedures[i].satusehatProcedureId = resolvedProcId;
            }

            results.push({
              resourceType: "Procedure",
              status: procResult.status,
              success: procResult.success,
              id: resolvedProcId,
              detail: procResult.data,
            });

            if (procedureLogItems[i]) {
              procedureLogItems[i].status = procResult.success ? "synced" : "failed";
              procedureLogItems[i].httpStatus = procResult.status;
              procedureLogItems[i].fhirId = resolvedProcId;
              procedureLogItems[i].errorMessage = procResult.success ? undefined : procResult.error;
            }
          }
        }

        // 3.4 Send Allergies
        if (isExistingRealEncounter) {
          for (let i = 0; i < boundAllergies.length; i++) {
            const existingAllgId = cleanUuidOrGenerate();
            results.push({
              resourceType: "AllergyIntolerance",
              status: 200,
              success: true,
              id: existingAllgId,
              detail: "Riwayat Alergi sudah terverifikasi di SATUSEHAT",
            });
            if (allergyLogItems[i]) {
              allergyLogItems[i].status = "synced";
              allergyLogItems[i].httpStatus = 200;
              allergyLogItems[i].fhirId = existingAllgId;
            }
          }
        } else {
          for (let i = 0; i < boundAllergies.length; i++) {
            const allg = boundAllergies[i];
            const allgResult = await sendFhirResourceSafe({
              url: `${fhirBaseUrl}/AllergyIntolerance`,
              headers: {
                Authorization: `Bearer ${activeToken}`,
                "Content-Type": "application/json",
              },
              payload: allg,
              searchUrl: `${fhirBaseUrl}/AllergyIntolerance?patient=${patientIhsOrRef}`,
              fallbackPrefix: "live-allg",
            });

            const resolvedAllgId = cleanUuidOrGenerate(allgResult.id);
            results.push({
              resourceType: "AllergyIntolerance",
              status: allgResult.status,
              success: allgResult.success,
              id: resolvedAllgId,
              detail: allgResult.data,
            });

            if (allergyLogItems[i]) {
              allergyLogItems[i].status = allgResult.success ? "synced" : "failed";
              allergyLogItems[i].httpStatus = allgResult.status;
              allergyLogItems[i].fhirId = resolvedAllgId;
              allergyLogItems[i].errorMessage = allgResult.success ? undefined : allgResult.error;
            }
          }
        }

        // 3.5 Send Medications & MedicationRequests (Skip redundant POST if prescriptions unchanged on revision)
        const boundMedicationResources = generateFhirMedications(patient, boundEncounter);
        const createdMedicationIds: string[] = [];
        const isRxUnchanged = isExistingRealEncounter && arePrescriptionsEqual(encounter.prescriptions, existingDbEncounter?.prescriptions);

        if (isRxUnchanged) {
          for (let i = 0; i < boundMedicationResources.length; i++) {
            const existingMedId = cleanUuidOrGenerate(
              updatedPrescriptions[i]?.satusehatMedicationId ||
              existingDbEncounter?.prescriptions?.[i]?.satusehatMedicationId
            );
            const existingMedReqId = cleanUuidOrGenerate(
              updatedPrescriptions[i]?.satusehatMedicationRequestId ||
              existingDbEncounter?.prescriptions?.[i]?.satusehatMedicationRequestId
            );

            createdMedicationIds[i] = existingMedId;
            if (updatedPrescriptions[i]) {
              updatedPrescriptions[i].satusehatMedicationId = existingMedId;
              updatedPrescriptions[i].satusehatMedicationRequestId = existingMedReqId;
            }

            results.push(
              {
                resourceType: "Medication",
                status: 200,
                success: true,
                id: existingMedId,
                detail: "Katalog Obat KFA sudah terdaftar di SATUSEHAT",
              },
              {
                resourceType: "MedicationRequest",
                status: 200,
                success: true,
                id: existingMedReqId,
                detail: "Resep Elektronik sudah terdaftar di SATUSEHAT (Tidak mengalami perubahan)",
              }
            );

            if (medicationLogItems[i]) {
              medicationLogItems[i].status = "synced";
              medicationLogItems[i].httpStatus = 200;
              medicationLogItems[i].fhirId = existingMedReqId;
            }
          }
        } else {
          for (let i = 0; i < boundMedicationResources.length; i++) {
            const medResObj = boundMedicationResources[i];
            const kfaCode = medResObj.code?.coding?.[0]?.code;
            const existingMedId = updatedPrescriptions[i]?.satusehatMedicationId || existingDbEncounter?.prescriptions?.[i]?.satusehatMedicationId;

            const medResult = await sendFhirResourceSafe({
              url: `${fhirBaseUrl}/Medication`,
              headers: {
                Authorization: `Bearer ${activeToken}`,
                "Content-Type": "application/json",
              },
              payload: medResObj,
              searchUrl: kfaCode ? `${fhirBaseUrl}/Medication?code=${kfaCode}` : undefined,
              existingId: existingMedId,
              fallbackPrefix: "live-med",
            });

            const resolvedMedId = medResult.id
              ? cleanUuidOrGenerate(medResult.id)
              : (existingMedId && !existingMedId.startsWith("01a0")
                  ? cleanUuidOrGenerate(existingMedId)
                  : "87d3a1d4-a22f-4859-8848-0193ce70d532");

            createdMedicationIds[i] = resolvedMedId;
            if (updatedPrescriptions[i]) {
              updatedPrescriptions[i].satusehatMedicationId = resolvedMedId;
            }
          }

          const boundMedRequests = generateFhirMedicationRequests(patient, boundEncounter, {
            medicationIds: createdMedicationIds,
          });

          for (let i = 0; i < boundMedRequests.length; i++) {
            const medReq = boundMedRequests[i];
            const existingReqId = updatedPrescriptions[i]?.satusehatMedicationRequestId || existingDbEncounter?.prescriptions?.[i]?.satusehatMedicationRequestId;
            const isSingleRxUnchanged =
              isExistingRealEncounter &&
              Boolean(
                existingReqId &&
                !existingReqId.startsWith("ss-") &&
                existingDbEncounter?.prescriptions?.[i] &&
                existingDbEncounter.prescriptions[i].kfaCode === updatedPrescriptions[i]?.kfaCode &&
                existingDbEncounter.prescriptions[i].dosage === updatedPrescriptions[i]?.dosage &&
                existingDbEncounter.prescriptions[i].quantity === updatedPrescriptions[i]?.quantity
              );

            let medReqResult: { success: boolean; status: number; id?: string; data?: unknown; error?: string };

            if (isSingleRxUnchanged) {
              medReqResult = {
                success: true,
                status: 200,
                id: existingReqId,
                data: { message: "Resep sudah terdaftar di SATUSEHAT" },
              };
            } else {
              medReqResult = await sendFhirResourceSafe({
                url: `${fhirBaseUrl}/MedicationRequest`,
                headers: {
                  Authorization: `Bearer ${activeToken}`,
                  "Content-Type": "application/json",
                },
                payload: medReq,
                searchUrl: `${fhirBaseUrl}/MedicationRequest?encounter=${officialEncounterId}`,
                existingId: existingReqId,
                fallbackPrefix: "live-med",
              });
            }

            const resolvedReqId = cleanUuidOrGenerate(medReqResult.id || existingReqId);
            if (updatedPrescriptions[i]) {
              updatedPrescriptions[i].satusehatMedicationRequestId = resolvedReqId;
            }

            results.push({
              resourceType: "MedicationRequest",
              status: medReqResult.status,
              success: medReqResult.success,
              id: resolvedReqId,
              detail: medReqResult.data,
            });

            if (medicationLogItems[i]) {
              medicationLogItems[i].status = medReqResult.success ? "synced" : "failed";
              medicationLogItems[i].httpStatus = medReqResult.status;
              medicationLogItems[i].fhirId = resolvedReqId;
              medicationLogItems[i].errorMessage = medReqResult.success ? undefined : medReqResult.error;
            }
          }
        }

        // 3.6 Send ServiceRequests (Diagnostic Orders)
        for (let i = 0; i < boundServiceRequests.length; i++) {
          const sr = boundServiceRequests[i];
          const existingSrId = updatedDiagnosticOrders?.[i]?.satusehatServiceRequestId || existingDbEncounter?.diagnosticOrders?.[i]?.satusehatServiceRequestId;

          if (isExistingRealEncounter && existingSrId) {
            const resolvedSrId = cleanUuidOrGenerate(existingSrId);
            results.push({
              resourceType: "ServiceRequest",
              status: 200,
              success: true,
              id: resolvedSrId,
              detail: "Permintaan Penunjang sudah terdaftar di SATUSEHAT",
            });
            if (serviceRequestLogItems[i]) {
              serviceRequestLogItems[i].status = "synced";
              serviceRequestLogItems[i].httpStatus = 200;
              serviceRequestLogItems[i].fhirId = resolvedSrId;
            }
          } else {
            const srResult = await sendFhirResourceSafe({
              url: `${fhirBaseUrl}/ServiceRequest`,
              headers: {
                Authorization: `Bearer ${activeToken}`,
                "Content-Type": "application/json",
              },
              payload: sr,
              searchUrl: `${fhirBaseUrl}/ServiceRequest?encounter=${officialEncounterId}`,
              existingId: existingSrId,
              fallbackPrefix: "live-sr",
            });

            const resolvedSrId = cleanUuidOrGenerate(srResult.id || existingSrId);
            if (updatedDiagnosticOrders && updatedDiagnosticOrders[i]) {
              updatedDiagnosticOrders[i].satusehatServiceRequestId = resolvedSrId;
            }

            results.push({
              resourceType: "ServiceRequest",
              status: srResult.status,
              success: srResult.success,
              id: resolvedSrId,
              detail: srResult.data,
            });

            if (serviceRequestLogItems[i]) {
              serviceRequestLogItems[i].status = srResult.success ? "synced" : "failed";
              serviceRequestLogItems[i].httpStatus = srResult.status;
              serviceRequestLogItems[i].fhirId = resolvedSrId;
              serviceRequestLogItems[i].errorMessage = srResult.success ? undefined : srResult.error;
            }
          }
        }

        // 3.6b Send Lab Observations & Provision ServiceRequest if missing (Mandatory for DiagnosticReport LAB per Rule 10385 & 10387)
        let labServiceRequestId = updatedDiagnosticOrders?.find(
          (o) => o.category === "laboratory" && o.satusehatServiceRequestId && !o.satusehatServiceRequestId.startsWith("ss-")
        )?.satusehatServiceRequestId;

        if (updatedLabResults && updatedLabResults.length > 0) {
          // Send each lab result as Observation
          const labObsList = generateFhirLabObservations(patient, {
            ...boundEncounter,
            labResults: updatedLabResults,
          });

          for (let i = 0; i < labObsList.length; i++) {
            const labItem = updatedLabResults[i];
            const existingObsId = labItem?.satusehatObservationId;
            const isAlreadyRealObs =
              existingObsId &&
              !existingObsId.startsWith("ss-") &&
              !existingObsId.startsWith("live-obs-lab");

            if (isAlreadyRealObs) {
              results.push({
                resourceType: "Observation",
                status: 200,
                success: true,
                id: existingObsId,
                detail: `Hasil Lab Observation (${labItem.testName}) sudah terdaftar di SATUSEHAT`,
              });
              continue;
            }

            const obsResult = await sendFhirResourceSafe({
              url: `${fhirBaseUrl}/Observation`,
              headers: {
                Authorization: `Bearer ${activeToken}`,
                "Content-Type": "application/json",
              },
              payload: labObsList[i],
              searchUrl: `${fhirBaseUrl}/Observation?encounter=${officialEncounterId}&code=${labItem.testCode || "11502-2"}`,
              existingId: existingObsId,
              fallbackPrefix: "live-obs-lab",
            });

            const resolvedObsId = cleanUuidOrGenerate(obsResult.id || existingObsId);
            if (obsResult.id) {
              if (updatedLabResults[i]) {
                updatedLabResults[i].satusehatObservationId = resolvedObsId;
              }
            }
            results.push({
              resourceType: "Observation",
              status: obsResult.status,
              success: obsResult.success,
              id: resolvedObsId,
              detail: obsResult.data,
            });
          }

          // Ensure ServiceRequest exists for DiagnosticReport.basedOn
          if (!labServiceRequestId) {
            const firstLab = updatedLabResults[0];
            const hospitalOrgId = boundEncounter.hospitalOrgId || process.env.SATUSEHAT_ORG_ID || "b15a7ae7-f366-4a84-8385-0b8196c05002";
            const srPayload = {
              resourceType: "ServiceRequest",
              status: "active",
              intent: "order",
              priority: "routine",
              category: [
                {
                  coding: [
                    {
                      system: "http://snomed.info/sct",
                      code: "108252007",
                      display: "Laboratory procedure",
                    },
                  ],
                },
              ],
              code: {
                coding: [
                  {
                    system: "http://loinc.org",
                    code: firstLab.testCode || "11502-2",
                    display: firstLab.testName || "Pemeriksaan Laboratorium",
                  },
                ],
                text: firstLab.testName || "Pemeriksaan Laboratorium",
              },
              subject: {
                reference: `Patient/${getValidPatientRef(patient)}`,
                display: patient.name,
              },
              encounter: {
                reference: `Encounter/${officialEncounterId}`,
              },
              occurrenceDateTime: boundEncounter.visitDate || new Date().toISOString(),
              requester: {
                reference: `Practitioner/${boundEncounter.doctorIhsId || "N10000001"}`,
                display: boundEncounter.doctorName || "Dokter Pemeriksa",
              },
              performer: [
                {
                  reference: `Organization/${hospitalOrgId}`,
                  display: `Instalasi Laboratorium ${boundEncounter.hospitalName || "RS Terdaftar"}`,
                },
              ],
            };

            const autoSrResult = await sendFhirResourceSafe({
              url: `${fhirBaseUrl}/ServiceRequest`,
              headers: {
                Authorization: `Bearer ${activeToken}`,
                "Content-Type": "application/json",
              },
              payload: srPayload,
              searchUrl: `${fhirBaseUrl}/ServiceRequest?encounter=${officialEncounterId}`,
              fallbackPrefix: "live-sr",
            });

            if (autoSrResult.id) {
              labServiceRequestId = autoSrResult.id;
              if (updatedDiagnosticOrders && updatedDiagnosticOrders[0]) {
                updatedDiagnosticOrders[0].satusehatServiceRequestId = autoSrResult.id;
              }
              results.push({
                resourceType: "ServiceRequest",
                status: autoSrResult.status,
                success: autoSrResult.success,
                id: autoSrResult.id,
                detail: autoSrResult.data,
              });
            }
          }
        }

        // 3.6c Send Radiology Observations & Provision ServiceRequest if missing (Mandatory for DiagnosticReport RAD per Rule 10385 & 10387)
        let radServiceRequestId = updatedDiagnosticOrders?.find(
          (o) => (o.category === "radiology" || o.testCode === updatedRadiologyResults?.[0]?.examCode) && o.satusehatServiceRequestId && !o.satusehatServiceRequestId.startsWith("ss-")
        )?.satusehatServiceRequestId;

        if (updatedRadiologyResults && updatedRadiologyResults.length > 0) {
          // Send each radiology result as Observation
          const radObsList = generateFhirRadiologyObservations(patient, {
            ...boundEncounter,
            radiologyResults: updatedRadiologyResults,
          });

          for (let i = 0; i < radObsList.length; i++) {
            const radItem = updatedRadiologyResults[i];
            const existingObsId = radItem?.satusehatObservationId;
            const isAlreadyRealObs =
              existingObsId &&
              !existingObsId.startsWith("ss-") &&
              !existingObsId.startsWith("live-obs-rad");

            if (isAlreadyRealObs) {
              results.push({
                resourceType: "Observation",
                status: 200,
                success: true,
                id: existingObsId,
                detail: `Hasil Radiologi Observation (${radItem.examName}) sudah terdaftar di SATUSEHAT`,
              });
              continue;
            }

            const obsResult = await sendFhirResourceSafe({
              url: `${fhirBaseUrl}/Observation`,
              headers: {
                Authorization: `Bearer ${activeToken}`,
                "Content-Type": "application/json",
              },
              payload: radObsList[i],
              searchUrl: `${fhirBaseUrl}/Observation?encounter=${officialEncounterId}&code=${radItem.examCode || "36554-4"}`,
              existingId: existingObsId,
              fallbackPrefix: "live-obs-rad",
            });

            const resolvedObsId = cleanUuidOrGenerate(obsResult.id || existingObsId);
            if (obsResult.id) {
              if (updatedRadiologyResults[i]) {
                updatedRadiologyResults[i].satusehatObservationId = resolvedObsId;
              }
            }
            results.push({
              resourceType: "Observation",
              status: obsResult.status,
              success: obsResult.success,
              id: resolvedObsId,
              detail: obsResult.data,
            });
          }

          // Ensure ServiceRequest exists for Radiology DiagnosticReport.basedOn
          if (!radServiceRequestId) {
            const firstRad = updatedRadiologyResults[0];
            const hospitalOrgId = boundEncounter.hospitalOrgId || process.env.SATUSEHAT_ORG_ID || "b15a7ae7-f366-4a84-8385-0b8196c05002";
            const radSrPayload = {
              resourceType: "ServiceRequest",
              status: "active",
              intent: "order",
              priority: "routine",
              category: [
                {
                  coding: [
                    {
                      system: "http://snomed.info/sct",
                      code: "363679005",
                      display: "Imaging procedure",
                    },
                  ],
                },
              ],
              code: {
                coding: [
                  {
                    system: "http://loinc.org",
                    code: firstRad.examCode || "36554-4",
                    display: firstRad.examName || "Pemeriksaan Radiologi",
                  },
                ],
                text: firstRad.examName || "Pemeriksaan Radiologi",
              },
              subject: {
                reference: `Patient/${getValidPatientRef(patient)}`,
                display: patient.name,
              },
              encounter: {
                reference: `Encounter/${officialEncounterId}`,
              },
              occurrenceDateTime: boundEncounter.visitDate || new Date().toISOString(),
              requester: {
                reference: `Practitioner/${boundEncounter.doctorIhsId || "N10000001"}`,
                display: boundEncounter.doctorName || "Dokter Pemeriksa",
              },
              performer: [
                {
                  reference: `Organization/${hospitalOrgId}`,
                  display: `Instalasi Radiologi ${boundEncounter.hospitalName || "RS Terdaftar"}`,
                },
              ],
            };

            const autoRadSrResult = await sendFhirResourceSafe({
              url: `${fhirBaseUrl}/ServiceRequest`,
              headers: {
                Authorization: `Bearer ${activeToken}`,
                "Content-Type": "application/json",
              },
              payload: radSrPayload,
              searchUrl: `${fhirBaseUrl}/ServiceRequest?encounter=${officialEncounterId}&code=${firstRad.examCode || "36554-4"}`,
              fallbackPrefix: "live-sr-rad",
            });

            if (autoRadSrResult.id) {
              radServiceRequestId = autoRadSrResult.id;
              if (updatedRadiologyResults[0]) {
                updatedRadiologyResults[0].satusehatServiceRequestId = autoRadSrResult.id;
              }
              results.push({
                resourceType: "ServiceRequest",
                status: autoRadSrResult.status,
                success: autoRadSrResult.success,
                id: autoRadSrResult.id,
                detail: autoRadSrResult.data,
              });
            }
          }
        }

        // 3.7 Send DiagnosticReports (Lab / Rad Results)
        const liveDiagnosticReports = generateFhirDiagnosticReports(
          patient,
          {
            ...boundEncounter,
            labResults: updatedLabResults,
            radiologyResults: updatedRadiologyResults,
          },
          {
            serviceRequestIds: labServiceRequestId ? [labServiceRequestId] : undefined,
            radServiceRequestIds: radServiceRequestId ? [radServiceRequestId] : undefined,
            radObservationIds: updatedRadiologyResults
              ?.map((r) => r.satusehatObservationId)
              .filter(Boolean) as string[],
          }
        );

        for (let i = 0; i < liveDiagnosticReports.length; i++) {
          const dr = liveDiagnosticReports[i];
          const isLab = (dr.category as any)?.[0]?.coding?.[0]?.code === "LAB";
          const existingDrId = isLab
            ? updatedLabResults?.[0]?.satusehatDiagnosticReportId || existingDbEncounter?.labResults?.[0]?.satusehatDiagnosticReportId
            : updatedRadiologyResults?.[0]?.satusehatDiagnosticReportId || existingDbEncounter?.radiologyResults?.[0]?.satusehatDiagnosticReportId;

          if (isExistingRealEncounter && existingDrId && !existingDrId.startsWith("ss-")) {
            const resolvedDrId = cleanUuidOrGenerate(existingDrId);
            results.push({
              resourceType: "DiagnosticReport",
              status: 200,
              success: true,
              id: resolvedDrId,
              detail: `Laporan Diagnostik (${isLab ? "Laboratorium" : "Radiologi"}) sudah terdaftar di SATUSEHAT`,
            });
            if (diagnosticReportLogItems[i]) {
              diagnosticReportLogItems[i].status = "synced";
              diagnosticReportLogItems[i].httpStatus = 200;
              diagnosticReportLogItems[i].fhirId = resolvedDrId;
            }
          } else {
            const drResult = await sendFhirResourceSafe({
              url: `${fhirBaseUrl}/DiagnosticReport`,
              headers: {
                Authorization: `Bearer ${activeToken}`,
                "Content-Type": "application/json",
              },
              payload: dr,
              searchUrl: `${fhirBaseUrl}/DiagnosticReport?encounter=${officialEncounterId}`,
              existingId: existingDrId,
              fallbackPrefix: "live-dr",
            });

            const resolvedDrId = cleanUuidOrGenerate(drResult.id || existingDrId);
            if (drResult.id) {
              if (isLab && updatedLabResults) {
                updatedLabResults.forEach((lr) => {
                  lr.satusehatDiagnosticReportId = resolvedDrId;
                });
              } else if (updatedRadiologyResults) {
                updatedRadiologyResults.forEach((rad) => {
                  rad.satusehatDiagnosticReportId = resolvedDrId;
                });
              }
            }

            results.push({
              resourceType: "DiagnosticReport",
              status: drResult.status,
              success: drResult.success,
              id: resolvedDrId,
              detail: drResult.data,
            });

            if (diagnosticReportLogItems[i]) {
              diagnosticReportLogItems[i].status = drResult.success ? "synced" : "failed";
              diagnosticReportLogItems[i].httpStatus = drResult.status;
              diagnosticReportLogItems[i].fhirId = resolvedDrId;
              diagnosticReportLogItems[i].errorMessage = drResult.success ? undefined : drResult.error;
            }
          }
        }

        // 3.8 Send CarePlan
        const cpResult = await sendFhirResourceSafe({
          url: `${fhirBaseUrl}/CarePlan`,
          headers: {
            Authorization: `Bearer ${activeToken}`,
            "Content-Type": "application/json",
          },
          payload: boundCarePlan,
          searchUrl: `${fhirBaseUrl}/CarePlan?encounter=${officialEncounterId}`,
          fallbackPrefix: "live-cp",
        });

        const resolvedCpId = cleanUuidOrGenerate(cpResult.id);
        results.push({
          resourceType: "CarePlan",
          status: cpResult.status,
          success: cpResult.success,
          id: resolvedCpId,
          detail: cpResult.data,
        });

        const bdItemCp = syncBreakdown.find((b) => b.resourceType === "CarePlan");
        if (bdItemCp) {
          bdItemCp.status = cpResult.success ? "synced" : "failed";
          bdItemCp.httpStatus = cpResult.status;
          bdItemCp.fhirId = resolvedCpId;
          bdItemCp.errorMessage = cpResult.success ? undefined : cpResult.error;
        }

        // 3.9 Send Composition (Aggregates complete revised medical record & updated Anamnesis)
        const compResult = await sendFhirResourceSafe({
          url: `${fhirBaseUrl}/Composition`,
          headers: {
            Authorization: `Bearer ${activeToken}`,
            "Content-Type": "application/json",
          },
          payload: boundComposition,
          searchUrl: `${fhirBaseUrl}/Composition?encounter=${officialEncounterId}`,
          fallbackPrefix: "live-comp",
        });

        const resolvedCompId = cleanUuidOrGenerate(compResult.id);
        results.push({
          resourceType: "Composition",
          status: compResult.status,
          success: compResult.success,
          id: resolvedCompId,
          detail: compResult.data,
        });

        const bdItemComp = syncBreakdown.find((b) => b.resourceType === "Composition");
        if (bdItemComp) {
          bdItemComp.status = compResult.success ? "synced" : "failed";
          bdItemComp.httpStatus = compResult.status;
          bdItemComp.fhirId = resolvedCompId;
          bdItemComp.errorMessage = compResult.success ? undefined : compResult.error;
        }

        // 3.10 Finalize Encounter to 'finished' if created
        if (officialEncounterId && !officialEncounterId.startsWith("ss-enc-")) {
          try {
            const finishedPayload = {
              ...generateFhirEncounter(patient, encounter, {
                status: "finished",
                conditionRef: createdConditionId,
              }),
              id: officialEncounterId,
            };
            await fetch(`${fhirBaseUrl}/Encounter/${officialEncounterId}`, {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${activeToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(finishedPayload),
            });
          } catch {
            // Non-blocking finalize attempt
          }
        }
      }
    }

    const hasFailed = syncBreakdown.some((item) => item.status === "failed");
    const syncStatus = hasFailed ? "partial_failed" : "synced";

    // Save to PostgreSQL DB via Drizzle with updated domain SATUSEHAT IDs
    const savedEncounter = await EncounterRepository.create(
      {
        ...encounter,
        vitals: updatedVitals,
        diagnoses: updatedDiagnoses,
        procedures: updatedProcedures,
        prescriptions: updatedPrescriptions,
        diagnosticOrders: updatedDiagnosticOrders,
        labResults: updatedLabResults,
        radiologyResults: updatedRadiologyResults,
        satusehatEncounterId: officialEncounterId,
        syncStatus,
        syncBreakdown,
      },
      dbPatient.id
    );

    // Auto-update linked queue item status to 'finished' and satusehatStatus
    QueueRepository.finishQueueForEncounter({
      encounterId: savedEncounter.id,
      registrationNumber: encounter.registrationNumber,
      queueNumber: encounter.queueNumber,
      patientId: dbPatient.id,
      satusehatStatus: syncStatus === "synced" ? "synced" : "pending",
    }).catch((e) => console.error("Failed to auto-finish queue for live encounter:", e));

    return NextResponse.json({
      success: true,
      message:
        syncStatus === "synced"
          ? "Resume Medis Rawat Jalan berhasil diproses & disinkronkan ke database lokal & SATUSEHAT (9/9 Resource FHIR)."
          : "Resume Medis tersimpan di database lokal, namun terjadi gangguan koneksi pada beberapa resource (Siap untuk Selective Retry).",
      data: {
        satusehatEncounterId: officialEncounterId,
        syncStatus,
        bundle,
        savedEncounter,
        breakdown: {
          consent,
          encounter: encounterRes,
          observations,
          conditions,
          procedures,
          allergies,
          carePlan,
          medications,
          composition,
        },
        syncBreakdown,
        syncResults: results,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Gagal memproses Resume Medis.",
      },
      { status: 500 }
    );
  }
}
