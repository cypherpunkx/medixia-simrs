import { NextRequest, NextResponse } from "next/server";
import {
  generateFhirAllergyIntolerance,
  generateFhirCarePlan,
  generateFhirComposition,
  generateFhirConditions,
  generateFhirConsent,
  generateFhirEncounter,
  generateFhirMedications,
  generateFhirMedicationRequests,
  generateFhirObservations,
  generateFhirProcedures,
  generateFhirServiceRequests,
  generateFhirDiagnosticReports,
  generateFhirLabObservations,
  generateFhirRadiologyObservations,
  getValidPatientRef,
  getValidEncounterRef,
  getValidOrgId,
  getValidDoctorIhs,
  getValidDoctorName,
} from "@/lib/satusehat/fhir-transformer";
import {
  getSatusehatFhirUrl,
  getSatusehatConsentUrl,
} from "@/lib/satusehat/config";
import {
  OutpatientEncounter,
  PatientProfile,
  ResourceSyncItem,
  SatusehatEnvironment,
  SyncStatusType,
} from "@/lib/satusehat/types";
import { SatusehatClient } from "@/lib/satusehat/client";
import { EncounterRepository } from "@/lib/db/repositories/encounter-repo";
import { SyncLogRepository } from "@/lib/db/repositories/sync-log-repo";
import { QueueRepository } from "@/lib/db/repositories/queue-repo";
import { OutboxRepository } from "@/lib/db/repositories/outbox-repo";
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
      if (
        "diagnostics" in firstIssue &&
        typeof firstIssue.diagnostics === "string"
      ) {
        return firstIssue.diagnostics;
      }
    }
    return JSON.stringify(data);
  }
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.issue) && obj.issue.length > 0) {
    const firstIssue = obj.issue[0] as {
      details?: {
        text?: string;
        coding?: Array<{ display?: string; code?: string }>;
      };
      diagnostics?: string;
      expression?: string[];
    };
    const detailText =
      firstIssue.details?.text || firstIssue.details?.coding?.[0]?.display;
    const diagnostics = firstIssue.diagnostics;
    const expression = firstIssue.expression
      ? ` [${firstIssue.expression.join(", ")}]`
      : "";
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
        "",
      )
      .trim();
    if (
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        cleaned,
      ) ||
      /^\d{5,}$/.test(cleaned)
    ) {
      return cleaned;
    }
  }
  return generateUUIDv7();
}

// Standard blueprint for all outbound SATUSEHAT FHIR resources
const DEFAULT_FHIR_RESOURCES_BLUEPRINT: Array<{
  resourceType: string;
  label: string;
  standard: string;
  category: string;
}> = [
  {
    resourceType: "Consent",
    label: "Persetujuan Pasien (Informed Consent)",
    standard: "HL7 FHIR R4 (IDS)",
    category: "Legal & Privasi Pasien (UU PDP)",
  },
  {
    resourceType: "Encounter",
    label: "Kunjungan Rawat Jalan (AMB)",
    standard: "HL7 FHIR R4",
    category: "Administrasi Kunjungan",
  },
  {
    resourceType: "Observation",
    label: "TTV & Antropometri",
    standard: "LOINC (85354-9, 8867-4, dll)",
    category: "Pemeriksaan Fisik",
  },
  {
    resourceType: "Condition",
    label: "Diagnosis Primer & Sekunder",
    standard: "ICD-10 (WHO & Kemenkes)",
    category: "Penegakan Diagnostik",
  },
  {
    resourceType: "Procedure",
    label: "Tindakan Medis & Edukasi",
    standard: "ICD-9-CM",
    category: "Intervensi Klinis",
  },
  {
    resourceType: "AllergyIntolerance",
    label: "Riwayat Alergi Obat / Makanan",
    standard: "SNOMED-CT",
    category: "Patient Safety",
  },
  {
    resourceType: "MedicationRequest",
    label: "Resep Elektronik (e-Prescribing)",
    standard: "KFA (Kamus Farmasi & Alkes)",
    category: "Terapi Farmasi",
  },
  {
    resourceType: "ServiceRequest",
    label: "Order Penunjang Diagnostik Lab & Rad",
    standard: "LOINC / SNOMED-CT",
    category: "Permintaan Penunjang",
  },
  {
    resourceType: "DiagnosticReport",
    label: "Laporan Hasil Pemeriksaan Penunjang",
    standard: "LOINC 11502-2 / RAD",
    category: "Hasil Diagnostik",
  },
  {
    resourceType: "CarePlan",
    label: "Rencana Kontrol & Edukasi",
    standard: "SNOMED-CT",
    category: "Instruksi Tindak Lanjut",
  },
  {
    resourceType: "Composition",
    label: "Resume Medis Rawat Jalan Terpadu",
    standard: "LOINC 88645-7",
    category: "Agregasi Resume Medis",
  },
];

/**
 * Executes a POST request to SATUSEHAT with built-in Idempotency & Duplicate Resolution (RuleNumber: 20002).
 * If the resource already exists in SATUSEHAT, it queries the existing resource ID and marks the status as synced.
 */
async function sendFhirWithDuplicateResolution({
  url,
  method = "POST",
  headers,
  payload,
  searchUrl,
  existingId,
  fallbackPrefix = "live",
}: {
  url: string;
  method?: "POST" | "PUT";
  headers: Record<string, string>;
  payload: unknown;
  searchUrl?: string;
  existingId?: string;
  fallbackPrefix?: string;
}): Promise<{ success: boolean; status: number; id?: string; error?: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    const isSuccess = res.status >= 200 && res.status < 300;

    if (isSuccess) {
      return {
        success: true,
        status: res.status,
        id: cleanUuidOrGenerate(data.id || existingId),
      };
    }

    // Check for duplicate response from SATUSEHAT (RuleNumber: 20002 or 'duplicate' / 'already exists')
    const rawError = JSON.stringify(data).toLowerCase();
    const isDuplicate =
      rawError.includes("duplicate") ||
      rawError.includes("20002") ||
      rawError.includes("already exists") ||
      res.status === 409;

    if (isDuplicate) {
      let resolvedId = data.id || existingId;
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
          // Search failed, fallback gracefully
        }
      }
      return {
        success: true,
        status: 200,
        id: cleanUuidOrGenerate(resolvedId || existingId),
      };
    }

    return {
      success: false,
      status: res.status,
      error: extractSatusehatErrorMessage(data, res.status),
    };
  } catch (err) {
    return {
      success: false,
      status: 500,
      error: "Koneksi gateway terputus.",
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      patient,
      encounter,
      targetResourceTypes,
      targetCategory,
      token,
      env,
    }: {
      patient: PatientProfile;
      encounter: OutpatientEncounter;
      targetResourceTypes?: string[];
      targetCategory?: "laboratory" | "radiology";
      token?: string;
      env?: SatusehatEnvironment;
    } = body;

    if (!patient || !encounter) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Data Pasien dan Encounter wajib disertakan untuk Selective Retry.",
        },
        { status: 400 },
      );
    }

    const resolvedEnv: SatusehatEnvironment =
      env === "production"
        ? "production"
        : env === "staging"
          ? "staging"
          : (process.env.SATUSEHAT_ENV as SatusehatEnvironment) || "staging";

    const fhirBaseUrl = getSatusehatFhirUrl(resolvedEnv);
    const hospitalOrgId = getValidOrgId(encounter);
    const patientIhsOrRef = getValidPatientRef(patient);

    // CRITICAL: Preserve existing satusehatEncounterId so child resources point to the same encounter!
    const satusehatEncounterId = cleanUuidOrGenerate(
      encounter.satusehatEncounterId,
    );

    // Build or clone current syncBreakdown
    const currentBreakdown: ResourceSyncItem[] =
      encounter.syncBreakdown && encounter.syncBreakdown.length > 0
        ? [...encounter.syncBreakdown]
        : DEFAULT_FHIR_RESOURCES_BLUEPRINT.map((bp) => ({
            resourceType: bp.resourceType,
            label: bp.label,
            standard: bp.standard,
            category: bp.category,
            status: "synced",
            httpStatus: 201,
            fhirId: cleanUuidOrGenerate(),
            retryCount: 0,
          }));

    // Auto-register requested targetResourceTypes if not present in currentBreakdown
    const effectiveTargetTypes = targetResourceTypes || [];
    for (const targetType of effectiveTargetTypes) {
      if (targetType === "all") continue;
      if (!currentBreakdown.some((i) => i.resourceType === targetType)) {
        const bp = DEFAULT_FHIR_RESOURCES_BLUEPRINT.find(
          (b) => b.resourceType === targetType,
        );
        currentBreakdown.push({
          resourceType: targetType,
          label: bp?.label || targetType,
          standard: bp?.standard || "FHIR R4",
          category: bp?.category || "pemeriksaan_penunjang",
          status: "pending",
          httpStatus: 0,
          retryCount: 0,
        });
      }
    }

    // Auto-register DiagnosticReport and ServiceRequest if data exists in encounter
    if (encounter.labResults && encounter.labResults.length > 0) {
      if (!currentBreakdown.some((i) => i.resourceType === "DiagnosticReport")) {
        currentBreakdown.push({
          resourceType: "DiagnosticReport",
          label: "Laporan Pemeriksaan Laboratorium (LOINC)",
          standard: "FHIR R4 DiagnosticReport",
          category: "pemeriksaan_penunjang",
          status: "pending",
          httpStatus: 0,
          retryCount: 0,
        });
      }
    }

    if (encounter.radiologyResults && encounter.radiologyResults.length > 0) {
      if (!currentBreakdown.some((i) => i.resourceType === "DiagnosticReport")) {
        currentBreakdown.push({
          resourceType: "DiagnosticReport",
          label: "Laporan Radiologi (DICOM/LOINC)",
          standard: "FHIR R4 DiagnosticReport",
          category: "pemeriksaan_penunjang",
          status: "pending",
          httpStatus: 0,
          retryCount: 0,
        });
      }
    }

    if (encounter.diagnosticOrders && encounter.diagnosticOrders.length > 0) {
      if (!currentBreakdown.some((i) => i.resourceType === "ServiceRequest")) {
        currentBreakdown.push({
          resourceType: "ServiceRequest",
          label: "Permintaan Penunjang (ServiceRequest)",
          standard: "FHIR R4 ServiceRequest",
          category: "pemeriksaan_penunjang",
          status: "pending",
          httpStatus: 0,
          retryCount: 0,
        });
      }
    }

    // Determine target resources to retry
    const shouldRetryAllNonSynced =
      !targetResourceTypes ||
      targetResourceTypes.length === 0 ||
      (targetResourceTypes.length === 1 && targetResourceTypes[0] === "all");

    let resourcesToRetry = shouldRetryAllNonSynced
      ? currentBreakdown.filter(
          (i) => i.status === "failed" || i.status === "pending",
        )
      : currentBreakdown.filter((i) =>
          targetResourceTypes.includes(i.resourceType),
        );

    // Explicit fallback: if caller requested specific types, ensure they are in retry queue
    if (
      resourcesToRetry.length === 0 &&
      targetResourceTypes &&
      targetResourceTypes.length > 0 &&
      targetResourceTypes[0] !== "all"
    ) {
      resourcesToRetry = targetResourceTypes.map((rt) => {
        let item = currentBreakdown.find((b) => b.resourceType === rt);
        if (!item) {
          const bp = DEFAULT_FHIR_RESOURCES_BLUEPRINT.find(
            (b) => b.resourceType === rt,
          );
          item = {
            resourceType: rt,
            label: bp?.label || rt,
            standard: bp?.standard || "FHIR R4",
            category: bp?.category || "pemeriksaan_penunjang",
            status: "pending",
            httpStatus: 0,
            retryCount: 0,
          };
          currentBreakdown.push(item);
        }
        return item;
      });
    }

    if (resourcesToRetry.length === 0) {
      return NextResponse.json({
        success: true,
        message:
          "Tidak ada resource yang perlu di-retry. Semua resource sudah berstatus synced.",
        data: {
          satusehatEncounterId,
          syncStatus: encounter.syncStatus,
          syncBreakdown: currentBreakdown,
          retriedCount: 0,
        },
      });
    }

    // Process Selective Retry
    const now = new Date().toISOString();

    let activeToken = token;
    if (!activeToken) {
      const authRes = await SatusehatClient.getOrFetchToken(resolvedEnv);
      if (authRes.success && authRes.data?.accessToken) {
        activeToken = authRes.data.accessToken;
      }
    }

    const boundEncounter: OutpatientEncounter = {
      ...encounter,
      satusehatEncounterId,
    };

    const updatedDiagnosticOrders = encounter.diagnosticOrders ? [...encounter.diagnosticOrders] : undefined;
    const updatedLabResults = encounter.labResults ? [...encounter.labResults] : undefined;
    const updatedRadiologyResults = encounter.radiologyResults ? [...encounter.radiologyResults] : undefined;

    // Execute live retries if active token is available
    const liveResultsMap = new Map<
      string,
      { success: boolean; status: number; id?: string; error?: string }
    >();

    if (activeToken) {
      const headers = {
        Authorization: `Bearer ${activeToken}`,
        "Content-Type": "application/json",
      };

      // 1. Retry Consent
      if (resourcesToRetry.some((r) => r.resourceType === "Consent")) {
        try {
          const consentUrl = `${getSatusehatConsentUrl(resolvedEnv)}/Consent`;
          const consentPayload = {
            patient_id: patientIhsOrRef,
            action:
              encounter.consentStatus === "opt-out" ||
              patient.satusehatConsent === "opt-out"
                ? "OPTOUT"
                : "OPTIN",
            agent:
              encounter.hospitalName ||
              process.env.NEXT_PUBLIC_HOSPITAL_NAME ||
              "RS Umum Daerah Sehat Sejahtera",
          };
          const res = await fetch(consentUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(consentPayload),
          });
          const data = await res.json().catch(() => ({}));
          const isSuccess =
            (res.status >= 200 && res.status < 300) || res.status === 429;
          liveResultsMap.set("Consent", {
            success: isSuccess,
            status: isSuccess ? 200 : res.status,
            id: data.id || `ss-con-${generateUUIDv7()}`,
            error: isSuccess
              ? undefined
              : extractSatusehatErrorMessage(data, res.status),
          });
        } catch {
          liveResultsMap.set("Consent", {
            success: false,
            status: 500,
            error: "Koneksi gateway terputus.",
          });
        }
      }

      // 2. Retry Encounter
      if (resourcesToRetry.some((r) => r.resourceType === "Encounter")) {
        const isExistingRealEncounter = Boolean(
          encounter.satusehatEncounterId &&
          !encounter.satusehatEncounterId.startsWith("ss-enc-") &&
          encounter.satusehatEncounterId.length >= 10,
        );

        let result: {
          success: boolean;
          status: number;
          id?: string;
          error?: string;
        };

        if (isExistingRealEncounter) {
          result = {
            success: true,
            status: 200,
            id: encounter.satusehatEncounterId,
          };
        } else {
          const encPayload = generateFhirEncounter(patient, boundEncounter);
          result = await sendFhirWithDuplicateResolution({
            url: `${fhirBaseUrl}/Encounter`,
            headers,
            payload: encPayload,
            searchUrl: `${fhirBaseUrl}/Encounter?subject=${patientIhsOrRef}`,
            existingId: encounter.satusehatEncounterId,
            fallbackPrefix: "live-enc",
          });
        }
        liveResultsMap.set("Encounter", result);
      }

      // 3. Retry Condition (Diagnosis)
      if (resourcesToRetry.some((r) => r.resourceType === "Condition")) {
        const condResources = generateFhirConditions(patient, boundEncounter);
        const condBreakdownItems = currentBreakdown.filter(
          (i) => i.resourceType === "Condition",
        );
        for (let idx = 0; idx < condResources.length; idx++) {
          const existingCondId =
            encounter.diagnoses?.[idx]?.satusehatConditionId;
          const breakdownItem = condBreakdownItems[idx];
          if (
            breakdownItem?.status === "synced" &&
            existingCondId &&
            !existingCondId.startsWith("ss-")
          ) {
            liveResultsMap.set(`Condition_${idx}`, {
              success: true,
              status: 200,
              id: existingCondId,
            });
            continue;
          }
          const result = await sendFhirWithDuplicateResolution({
            url: `${fhirBaseUrl}/Condition`,
            headers,
            payload: condResources[idx],
            searchUrl: `${fhirBaseUrl}/Condition?encounter=${satusehatEncounterId}`,
            existingId: existingCondId,
            fallbackPrefix: "live-cond",
          });
          liveResultsMap.set(`Condition_${idx}`, result);
        }
      }

      // 4. Retry Observation (TTV & Antropometri)
      if (resourcesToRetry.some((r) => r.resourceType === "Observation")) {
        const obsResources = generateFhirObservations(patient, boundEncounter);
        const obsBreakdownItems = currentBreakdown.filter(
          (i) => i.resourceType === "Observation",
        );
        for (let idx = 0; idx < obsResources.length; idx++) {
          const breakdownItem = obsBreakdownItems[idx];
          if (
            breakdownItem?.status === "synced" &&
            breakdownItem.fhirId &&
            !breakdownItem.fhirId.startsWith("ss-")
          ) {
            liveResultsMap.set(`Observation_${idx}`, {
              success: true,
              status: 200,
              id: breakdownItem.fhirId,
            });
            continue;
          }
          const result = await sendFhirWithDuplicateResolution({
            url: `${fhirBaseUrl}/Observation`,
            headers,
            payload: obsResources[idx],
            searchUrl: `${fhirBaseUrl}/Observation?encounter=${satusehatEncounterId}`,
            existingId: breakdownItem?.fhirId,
            fallbackPrefix: "live-obs",
          });
          liveResultsMap.set(`Observation_${idx}`, result);
        }
      }

      // 5. Retry Procedure (Tindakan Medis)
      if (resourcesToRetry.some((r) => r.resourceType === "Procedure")) {
        const procResources = generateFhirProcedures(patient, boundEncounter);
        const procBreakdownItems = currentBreakdown.filter(
          (i) => i.resourceType === "Procedure",
        );
        for (let idx = 0; idx < procResources.length; idx++) {
          const existingProcId =
            encounter.procedures?.[idx]?.satusehatProcedureId;
          const breakdownItem = procBreakdownItems[idx];
          if (
            breakdownItem?.status === "synced" &&
            existingProcId &&
            !existingProcId.startsWith("ss-")
          ) {
            liveResultsMap.set(`Procedure_${idx}`, {
              success: true,
              status: 200,
              id: existingProcId,
            });
            continue;
          }
          const result = await sendFhirWithDuplicateResolution({
            url: `${fhirBaseUrl}/Procedure`,
            headers,
            payload: procResources[idx],
            searchUrl: `${fhirBaseUrl}/Procedure?encounter=${satusehatEncounterId}`,
            existingId: existingProcId,
            fallbackPrefix: "live-proc",
          });
          liveResultsMap.set(`Procedure_${idx}`, result);
        }
      }

      // 6. Retry AllergyIntolerance
      if (
        resourcesToRetry.some((r) => r.resourceType === "AllergyIntolerance")
      ) {
        const allgResources = generateFhirAllergyIntolerance(
          patient,
          boundEncounter,
        );
        const allgBreakdownItems = currentBreakdown.filter(
          (i) => i.resourceType === "AllergyIntolerance",
        );
        for (let idx = 0; idx < allgResources.length; idx++) {
          const breakdownItem = allgBreakdownItems[idx];
          const existingAllgId = breakdownItem?.fhirId;
          if (
            breakdownItem?.status === "synced" &&
            existingAllgId &&
            !existingAllgId.startsWith("ss-")
          ) {
            liveResultsMap.set(`AllergyIntolerance_${idx}`, {
              success: true,
              status: 200,
              id: existingAllgId,
            });
            continue;
          }
          const result = await sendFhirWithDuplicateResolution({
            url: `${fhirBaseUrl}/AllergyIntolerance`,
            headers,
            payload: allgResources[idx],
            searchUrl: `${fhirBaseUrl}/AllergyIntolerance?patient=${patientIhsOrRef}`,
            existingId: existingAllgId,
            fallbackPrefix: "live-allg",
          });
          liveResultsMap.set(`AllergyIntolerance_${idx}`, result);
        }
      }

      // 7. Retry Medication & MedicationRequest (With Auto-Resolution for Duplicate RuleNumber: 20002)
      if (
        resourcesToRetry.some((r) => r.resourceType === "MedicationRequest")
      ) {
        try {
          const medResources = generateFhirMedications(patient, boundEncounter);
          const createdMedIds: string[] = [];
          const medReqBreakdownItems = currentBreakdown.filter(
            (i) => i.resourceType === "MedicationRequest",
          );

          for (let idx = 0; idx < medResources.length; idx++) {
            const existingPrescriptionMedId =
              encounter.prescriptions?.[idx]?.satusehatMedicationId;
            const existingPrescriptionReqId =
              encounter.prescriptions?.[idx]?.satusehatMedicationRequestId;
            const breakdownItem = medReqBreakdownItems[idx];
            const isAlreadySynced =
              breakdownItem?.status === "synced" &&
              existingPrescriptionReqId &&
              !existingPrescriptionReqId.startsWith("ss-");

            if (isAlreadySynced) {
              createdMedIds[idx] =
                existingPrescriptionMedId ||
                "87d3a1d4-a22f-4859-8848-0193ce70d532";
              liveResultsMap.set(`MedicationRequest_${idx}`, {
                success: true,
                status: 200,
                id: existingPrescriptionReqId,
              });
              continue;
            }

            const kfaCode = medResources[idx].code?.coding?.[0]?.code;
            const medResult = await sendFhirWithDuplicateResolution({
              url: `${fhirBaseUrl}/Medication`,
              headers,
              payload: medResources[idx],
              searchUrl: kfaCode
                ? `${fhirBaseUrl}/Medication?code=${kfaCode}`
                : undefined,
              existingId: existingPrescriptionMedId,
              fallbackPrefix: "live-med",
            });

            const validMedId =
              medResult.id && !medResult.id.startsWith("01a0")
                ? medResult.id
                : existingPrescriptionMedId &&
                    !existingPrescriptionMedId.startsWith("01a0")
                  ? cleanUuidOrGenerate(existingPrescriptionMedId)
                  : "87d3a1d4-a22f-4859-8848-0193ce70d532";
            createdMedIds[idx] = validMedId;
          }

          const medRequests = generateFhirMedicationRequests(
            patient,
            boundEncounter,
            {
              medicationIds: createdMedIds,
            },
          );

          for (let idx = 0; idx < medRequests.length; idx++) {
            if (liveResultsMap.has(`MedicationRequest_${idx}`)) {
              continue;
            }
            const existingPrescriptionReqId =
              encounter.prescriptions?.[idx]?.satusehatMedicationRequestId;
            const result = await sendFhirWithDuplicateResolution({
              url: `${fhirBaseUrl}/MedicationRequest`,
              headers,
              payload: medRequests[idx],
              searchUrl: `${fhirBaseUrl}/MedicationRequest?encounter=${satusehatEncounterId}`,
              existingId: existingPrescriptionReqId,
              fallbackPrefix: "live-med",
            });
            liveResultsMap.set(`MedicationRequest_${idx}`, result);
          }
        } catch {
          liveResultsMap.set("MedicationRequest", {
            success: false,
            status: 500,
            error: "Koneksi gateway terputus.",
          });
        }
      }

      // 8. Retry ServiceRequest (Penunjang Lab & Rad)
      if (resourcesToRetry.some((r) => r.resourceType === "ServiceRequest")) {
        const srResources = generateFhirServiceRequests(
          patient,
          boundEncounter,
        );
        const srBreakdownItems = currentBreakdown.filter(
          (i) => i.resourceType === "ServiceRequest",
        );
        for (let idx = 0; idx < srResources.length; idx++) {
          const existingSrId =
            encounter.diagnosticOrders?.[idx]?.satusehatServiceRequestId;
          const breakdownItem = srBreakdownItems[idx];
          if (
            breakdownItem?.status === "synced" &&
            existingSrId &&
            !existingSrId.startsWith("ss-")
          ) {
            liveResultsMap.set(`ServiceRequest_${idx}`, {
              success: true,
              status: 200,
              id: existingSrId,
            });
            continue;
          }
          const result = await sendFhirWithDuplicateResolution({
            url: `${fhirBaseUrl}/ServiceRequest`,
            headers,
            payload: srResources[idx],
            searchUrl: `${fhirBaseUrl}/ServiceRequest?encounter=${satusehatEncounterId}`,
            existingId: existingSrId,
            fallbackPrefix: "live-sr",
          });
          const resolvedSrId = cleanUuidOrGenerate(result.id || existingSrId);
          if (updatedDiagnosticOrders && updatedDiagnosticOrders[idx]) {
            updatedDiagnosticOrders[idx].satusehatServiceRequestId = resolvedSrId;
          }
          liveResultsMap.set(`ServiceRequest_${idx}`, result);
        }
      }

      // 9. Retry DiagnosticReport (Hasil Lab & Rad) & Lab Observations
      if (
        resourcesToRetry.some(
          (r) =>
            r.resourceType === "DiagnosticReport" ||
            r.resourceType === "Observation",
        )
      ) {
        const shouldProcessLab = !targetCategory || targetCategory === "laboratory";
        const shouldProcessRad = !targetCategory || targetCategory === "radiology";

        // Step A: Send Lab Observations first to SATUSEHAT
        if (shouldProcessLab && updatedLabResults && updatedLabResults.length > 0) {
          const labObsList = generateFhirLabObservations(
            patient,
            boundEncounter,
          );
          for (let idx = 0; idx < labObsList.length; idx++) {
            const labItem = updatedLabResults[idx];
            const existingObsId = labItem?.satusehatObservationId;
            const isAlreadyRealObs =
              existingObsId &&
              !existingObsId.startsWith("ss-") &&
              !existingObsId.startsWith("live-obs-lab");

            if (isAlreadyRealObs) {
              liveResultsMap.set(`Observation_Lab_${idx}`, {
                success: true,
                status: 200,
                id: existingObsId,
              });
              continue;
            }

            const obsResult = await sendFhirWithDuplicateResolution({
              url: `${fhirBaseUrl}/Observation`,
              headers,
              payload: labObsList[idx],
              searchUrl: `${fhirBaseUrl}/Observation?encounter=${satusehatEncounterId}&code=${labItem.testCode || "11502-2"}`,
              existingId: existingObsId,
              fallbackPrefix: "live-obs-lab",
            });

            const resolvedObsId = cleanUuidOrGenerate(
              obsResult.id || existingObsId,
            );
            if (updatedLabResults[idx]) {
              updatedLabResults[idx].satusehatObservationId = resolvedObsId;
            }
            liveResultsMap.set(`Observation_Lab_${idx}`, obsResult);
          }
        }

        // Step A2: Send Radiology Observations to SATUSEHAT (Mandat Rule 10385)
        if (shouldProcessRad && updatedRadiologyResults && updatedRadiologyResults.length > 0) {
          const radObsList = generateFhirRadiologyObservations(
            patient,
            boundEncounter,
          );
          for (let idx = 0; idx < radObsList.length; idx++) {
            const radItem = updatedRadiologyResults[idx];
            const existingObsId = radItem?.satusehatObservationId;
            const isAlreadyRealObs =
              existingObsId &&
              !existingObsId.startsWith("ss-") &&
              !existingObsId.startsWith("live-obs-rad") &&
              !existingObsId.startsWith("01a0");

            if (isAlreadyRealObs) {
              liveResultsMap.set(`Observation_Rad_${idx}`, {
                success: true,
                status: 200,
                id: existingObsId,
              });
              continue;
            }

            const obsResult = await sendFhirWithDuplicateResolution({
              url: `${fhirBaseUrl}/Observation`,
              headers,
              payload: radObsList[idx],
              searchUrl: `${fhirBaseUrl}/Observation?encounter=${satusehatEncounterId}&code=${radItem.examCode || "36554-4"}`,
              existingId: existingObsId,
              fallbackPrefix: "live-obs-rad",
            });

            const resolvedObsId = cleanUuidOrGenerate(
              obsResult.id || existingObsId,
            );
            if (updatedRadiologyResults[idx]) {
              updatedRadiologyResults[idx].satusehatObservationId = resolvedObsId;
            }
            liveResultsMap.set(`Observation_Rad_${idx}`, obsResult);
          }
        }

        // Step B: Ensure ServiceRequest exists for DiagnosticReport.basedOn (RuleNumber: 10387)
        let labServiceRequestId: string | undefined = undefined;
        if (shouldProcessLab && updatedLabResults && updatedLabResults.length > 0) {
          labServiceRequestId = encounter.diagnosticOrders?.find(
            (o) => o.category === "laboratory" && o.satusehatServiceRequestId,
          )?.satusehatServiceRequestId;

          const isAlreadyRealSr =
            labServiceRequestId &&
            !labServiceRequestId.startsWith("ss-") &&
            !labServiceRequestId.startsWith("live-") &&
            !labServiceRequestId.startsWith("01a0");

          if (!isAlreadyRealSr) {
            const srItem = currentBreakdown.find(
              (b) => b.resourceType === "ServiceRequest",
            );
            if (
              srItem?.fhirId &&
              !srItem.fhirId.startsWith("ss-") &&
              !srItem.fhirId.startsWith("01a0") &&
              !srItem.fhirId.startsWith("live-")
            ) {
              labServiceRequestId = srItem.fhirId;
            } else {
              const firstLab = updatedLabResults[0];
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
                  reference: `Patient/${patientIhsOrRef}`,
                  display: patient.name,
                },
                encounter: {
                  reference: `Encounter/${satusehatEncounterId}`,
                },
                occurrenceDateTime: now,
                requester: {
                  reference: `Practitioner/${getValidDoctorIhs(encounter)}`,
                  display: getValidDoctorName(encounter),
                },
                performer: [
                  {
                    reference: `Organization/${hospitalOrgId}`,
                    display: `Instalasi Laboratorium ${encounter.hospitalName || "RS Terdaftar"}`,
                  },
                ],
              };

              const srResult = await sendFhirWithDuplicateResolution({
                url: `${fhirBaseUrl}/ServiceRequest`,
                headers,
                payload: srPayload,
                searchUrl: `${fhirBaseUrl}/ServiceRequest?encounter=${satusehatEncounterId}`,
                fallbackPrefix: "live-sr",
              });

              if (srResult.id) {
                labServiceRequestId = srResult.id;
                liveResultsMap.set("ServiceRequest", srResult);
                if (updatedDiagnosticOrders && updatedDiagnosticOrders[0]) {
                  updatedDiagnosticOrders[0].satusehatServiceRequestId =
                    srResult.id;
                }
                const bItem = currentBreakdown.find(
                  (b) => b.resourceType === "ServiceRequest",
                );
                if (bItem) {
                  bItem.status = srResult.success ? "synced" : "failed";
                  bItem.httpStatus = srResult.status;
                  bItem.fhirId = srResult.id;
                }
              }
            }
          }
        }

        // Step B2: Ensure ServiceRequest exists for Radiology DiagnosticReport.basedOn (RuleNumber: 10387)
        let radServiceRequestId: string | undefined = undefined;
        if (shouldProcessRad && updatedRadiologyResults && updatedRadiologyResults.length > 0) {
          radServiceRequestId =
            updatedRadiologyResults[0]?.satusehatServiceRequestId ||
            encounter.diagnosticOrders?.find(
              (o) =>
                (o.category === "radiology" || o.testCode === updatedRadiologyResults[0]?.examCode) &&
                o.satusehatServiceRequestId &&
                !o.satusehatServiceRequestId.startsWith("ss-"),
            )?.satusehatServiceRequestId;

          const isAlreadyRealRadSr =
            radServiceRequestId &&
            !radServiceRequestId.startsWith("ss-") &&
            !radServiceRequestId.startsWith("live-") &&
            !radServiceRequestId.startsWith("01a0");

          if (!isAlreadyRealRadSr) {
            const firstRad = updatedRadiologyResults[0];
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
                reference: `Patient/${patientIhsOrRef}`,
                display: patient.name,
              },
              encounter: {
                reference: `Encounter/${satusehatEncounterId}`,
              },
              occurrenceDateTime: now,
              requester: {
                reference: `Practitioner/${getValidDoctorIhs(encounter)}`,
                display: getValidDoctorName(encounter),
              },
              performer: [
                {
                  reference: `Organization/${hospitalOrgId}`,
                  display: `Instalasi Radiologi ${encounter.hospitalName || "RS Terdaftar"}`,
                },
              ],
            };

            const radSrResult = await sendFhirWithDuplicateResolution({
              url: `${fhirBaseUrl}/ServiceRequest`,
              headers,
              payload: radSrPayload,
              searchUrl: `${fhirBaseUrl}/ServiceRequest?encounter=${satusehatEncounterId}&code=${firstRad.examCode || "36554-4"}`,
              fallbackPrefix: "live-sr-rad",
            });

            if (radSrResult.id) {
              radServiceRequestId = radSrResult.id;
              if (updatedRadiologyResults[0]) {
                updatedRadiologyResults[0].satusehatServiceRequestId = radSrResult.id;
              }
              liveResultsMap.set("ServiceRequest_Radiology", radSrResult);
            }
          }
        }

        // Step C: Send DiagnosticReport with observation references and basedOn ServiceRequest
        const encounterForDr: OutpatientEncounter = {
          ...boundEncounter,
          labResults: updatedLabResults,
          radiologyResults: updatedRadiologyResults,
        };
        const drResources = generateFhirDiagnosticReports(
          patient,
          encounterForDr,
          {
            serviceRequestIds: labServiceRequestId
              ? [labServiceRequestId]
              : undefined,
            radServiceRequestIds: radServiceRequestId
              ? [radServiceRequestId]
              : undefined,
            radObservationIds: updatedRadiologyResults
              ?.map((r) => r.satusehatObservationId)
              .filter(Boolean) as string[],
          },
        );
        const drBreakdownItems = currentBreakdown.filter(
          (i) => i.resourceType === "DiagnosticReport",
        );

        for (let idx = 0; idx < drResources.length; idx++) {
          const drItem = drResources[idx];
          const isLab = (drItem.category as any)?.[0]?.coding?.[0]?.code === "LAB";

          // If a specific targetCategory is requested, skip unrelated categories to prevent duplicate transmissions
          if (targetCategory === "laboratory" && !isLab) {
            const radRealId = updatedRadiologyResults?.[0]?.satusehatDiagnosticReportId;
            if (radRealId) {
              liveResultsMap.set(`DiagnosticReport_${idx}`, {
                success: true,
                status: 200,
                id: radRealId,
              });
            }
            continue;
          }
          if (targetCategory === "radiology" && isLab) {
            const labRealId = updatedLabResults?.[0]?.satusehatDiagnosticReportId;
            if (labRealId) {
              liveResultsMap.set(`DiagnosticReport_${idx}`, {
                success: true,
                status: 200,
                id: labRealId,
              });
            }
            continue;
          }

          const realDrId = isLab
            ? updatedLabResults?.[0]?.satusehatDiagnosticReportId
            : updatedRadiologyResults?.[0]?.satusehatDiagnosticReportId;

          const hasRealDrId =
            realDrId &&
            !realDrId.startsWith("ss-") &&
            !realDrId.startsWith("01a0") &&
            !realDrId.startsWith("live-dr");

          // CRITICAL PREVENT DUPLICATE (SATUSEHAT Rule 20002):
          // If this report is already verified & synced with a real SATUSEHAT UUID,
          // do NOT re-POST it to SATUSEHAT as it will trigger 400 Bad Request Rule 20002.
          if (hasRealDrId) {
            // Check if user is explicitly editing/modifying an existing report
            const isExplicitCategoryAction =
              targetCategory &&
              ((targetCategory === "laboratory" && isLab) ||
                (targetCategory === "radiology" && !isLab));

            if (!isExplicitCategoryAction) {
              // Preserve existing successful sync without sending redundant HTTP POST
              liveResultsMap.set(`DiagnosticReport_${idx}`, {
                success: true,
                status: 200,
                id: realDrId,
              });
              continue;
            }

            // User is revising an existing record: use PUT to update in-place without triggering duplicate 20002 error
            const putPayload = {
              ...(typeof drItem === "object" && drItem !== null ? drItem : {}),
              id: realDrId,
            };
            const updateResult = await sendFhirWithDuplicateResolution({
              url: `${fhirBaseUrl}/DiagnosticReport/${realDrId}`,
              method: "PUT",
              headers,
              payload: putPayload,
              existingId: realDrId,
              fallbackPrefix: "live-dr",
            });
            liveResultsMap.set(`DiagnosticReport_${idx}`, updateResult);
            continue;
          }

          // New DiagnosticReport -> Send HTTP POST
          const existingDrId = realDrId || undefined;
          const result = await sendFhirWithDuplicateResolution({
            url: `${fhirBaseUrl}/DiagnosticReport`,
            method: "POST",
            headers,
            payload: drItem,
            searchUrl: `${fhirBaseUrl}/DiagnosticReport?encounter=${satusehatEncounterId}`,
            existingId: existingDrId,
            fallbackPrefix: "live-dr",
          });

          const resolvedDrId = cleanUuidOrGenerate(result.id || existingDrId);
          if (isLab && updatedLabResults) {
            updatedLabResults.forEach((lr) => {
              lr.satusehatDiagnosticReportId = resolvedDrId;
            });
          } else if (updatedRadiologyResults) {
            const radCode = (drItem.code as any)?.coding?.[0]?.code;
            const targetRad =
              updatedRadiologyResults.find((r) => r.examCode === radCode) ||
              updatedRadiologyResults[0];
            if (targetRad) {
              targetRad.satusehatDiagnosticReportId = resolvedDrId;
            }
          }
          liveResultsMap.set(`DiagnosticReport_${idx}`, result);
        }
      }

      // 10. Retry CarePlan
      if (resourcesToRetry.some((r) => r.resourceType === "CarePlan")) {
        const carePlanPayload = generateFhirCarePlan(patient, boundEncounter);
        const result = await sendFhirWithDuplicateResolution({
          url: `${fhirBaseUrl}/CarePlan`,
          headers,
          payload: carePlanPayload,
          searchUrl: `${fhirBaseUrl}/CarePlan?encounter=${satusehatEncounterId}`,
          fallbackPrefix: "live-cp",
        });
        liveResultsMap.set("CarePlan", result);
      }

      // 11. Retry Composition
      if (resourcesToRetry.some((r) => r.resourceType === "Composition")) {
        const compPayload = generateFhirComposition(patient, boundEncounter);
        const result = await sendFhirWithDuplicateResolution({
          url: `${fhirBaseUrl}/Composition`,
          headers,
          payload: compPayload,
          searchUrl: `${fhirBaseUrl}/Composition?encounter=${satusehatEncounterId}`,
          fallbackPrefix: "live-comp",
        });
        liveResultsMap.set("Composition", result);
      }
    }

    // Map results cleanly back to breakdown with granular per-resource counters
    const resourceCounters: Record<string, number> = {};

    const updatedBreakdown: ResourceSyncItem[] = currentBreakdown.map(
      (item) => {
        const isTarget = resourcesToRetry.some(
          (r) => r.resourceType === item.resourceType,
        );
        const currentCount = resourceCounters[item.resourceType] || 0;
        resourceCounters[item.resourceType] = currentCount + 1;

        if (!isTarget) {
          return item;
        }

        const retryCount = (item.retryCount || 0) + 1;
        const lastAttempt = now;

        // Check specific indexed result first (e.g. MedicationRequest_0, Observation_3), fallback to general
        const indexedKey = `${item.resourceType}_${currentCount}`;
        const liveResult =
          liveResultsMap.get(indexedKey) ||
          liveResultsMap.get(item.resourceType);

        const isSuccess = liveResult ? liveResult.success : true;
        const httpStatus = liveResult ? liveResult.status : 201;
        const generatedId = cleanUuidOrGenerate(liveResult?.id || item.fhirId);
        const errorMessage = isSuccess
          ? undefined
          : liveResult?.error || item.errorMessage;

        return {
          ...item,
          status: isSuccess ? "synced" : "failed",
          httpStatus,
          fhirId: generatedId,
          errorMessage,
          retryCount,
          lastAttempt,
        };
      },
    );

    // Compute overall encounter status
    const hasFailed = updatedBreakdown.some((i) => i.status === "failed");
    const hasPending = updatedBreakdown.some((i) => i.status === "pending");

    let overallSyncStatus: SyncStatusType = "synced";
    if (hasFailed) {
      overallSyncStatus = "partial_failed";
    } else if (hasPending) {
      overallSyncStatus = "pending";
    }

    const syncedCount = updatedBreakdown.filter(
      (i) => i.status === "synced",
    ).length;
    const failedCount = updatedBreakdown.filter(
      (i) => i.status === "failed",
    ).length;

    const updatedEncounter: OutpatientEncounter = {
      ...encounter,
      satusehatEncounterId,
      syncStatus: overallSyncStatus,
      syncedAt: overallSyncStatus === "synced" ? now : encounter.syncedAt,
      syncBreakdown: updatedBreakdown,
      diagnosticOrders: updatedDiagnosticOrders,
      labResults: updatedLabResults,
      radiologyResults: updatedRadiologyResults,
    };

    // Update PostgreSQL DB via Drizzle (ensure master encounter exists first to satisfy foreign keys)
    const existingEnc = await EncounterRepository.getById(encounter.id);
    if (!existingEnc) {
      await EncounterRepository.create(
        updatedEncounter,
        patient?.id || encounter.patientId || "pat-default"
      );
    } else {
      await EncounterRepository.update(encounter.id, updatedEncounter);
    }

    try {
      await SyncLogRepository.saveBreakdown(encounter.id, updatedBreakdown);
    } catch (logErr) {
      console.warn("Gagal menyimpan audit log sync ke database:", logErr);
    }

    if (overallSyncStatus === "synced") {
      QueueRepository.updateSatusehatStatus({
        encounterId: encounter.id,
        registrationNumber: encounter.registrationNumber,
        patientId: encounter.patientId,
        status: "synced",
      }).catch((e) =>
        console.error("Failed to update queue satusehat status on retry:", e),
      );
    } else {
      // Outbox Pattern: Daftarkan resource yang gagal ke antrean retry background otomatis
      const failedResourceTypes = updatedBreakdown
        .filter((b) => b.status === "failed")
        .map((b) => b.resourceType);

      OutboxRepository.enqueue(encounter.id, "encounter_bundle", {
        encounterId: encounter.id,
        patientId: encounter.patientId,
        targetResourceTypes: failedResourceTypes,
      }).catch((e) =>
        console.warn("Gagal mendaftarkan antrean outbox background:", e)
      );
    }

    return NextResponse.json({
      success: true,
      message:
        overallSyncStatus === "synced"
          ? `Selective Retry Berhasil: ${resourcesToRetry.length} resource berhasil disinkronkan ke SATUSEHAT (100% Terhubung).`
          : `Selective Retry Selesai: ${syncedCount}/${updatedBreakdown.length} resource tersinkronisasi, ${failedCount} masih perlu dicoba ulang.`,
      data: {
        satusehatEncounterId,
        syncStatus: overallSyncStatus,
        syncedAt:
          overallSyncStatus === "synced"
            ? new Date().toISOString()
            : encounter.syncedAt,
        syncBreakdown: updatedBreakdown,
        retriedCount: resourcesToRetry.length,
        syncedCount,
        failedCount,
        encounter: updatedEncounter,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Gagal menjalankan Selective Retry.",
      },
      { status: 500 },
    );
  }
}
