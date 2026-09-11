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
  generateFhirMedicationRequests,
  generateFhirObservations,
  generateFhirProcedures,
  generateFhirServiceRequests,
} from "@/lib/satusehat/fhir-transformer";
import { getSatusehatFhirUrl } from "@/lib/satusehat/config";
import { ResourceSyncItem, SatusehatEnvironment, OutpatientEncounter, PatientProfile } from "@/lib/satusehat/types";
import { PatientRepository } from "@/lib/db/repositories/patient-repo";
import { EncounterRepository } from "@/lib/db/repositories/encounter-repo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { patient, encounter, token, env = "staging", simulate = false, saveLocalPending = false } = body as {
      patient: PatientProfile;
      encounter: OutpatientEncounter;
      token?: string;
      env?: SatusehatEnvironment;
      simulate?: boolean;
      saveLocalPending?: boolean;
      simulatePartialDrop?: boolean;
      simulateDropTypes?: string[];
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

    // Ensure Patient exists or is updated in SQLite DB
    let dbPatient: PatientProfile | null = null;
    if (patient.id) {
      dbPatient = PatientRepository.getById(patient.id);
    }
    if (!dbPatient && patient.nik) {
      dbPatient = PatientRepository.getByNik(patient.nik);
    }
    if (!dbPatient) {
      dbPatient = PatientRepository.create(patient);
    } else {
      PatientRepository.update(dbPatient.id, patient);
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
      encounter.satusehatEncounterId || `ss-enc-${Date.now().toString(36)}`;

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
          resourceType: "SIMRS Local Medical Record",
          status: 201,
          success: true,
          id: encounter.id,
          detail: "Rekam medis tersimpan aman di basis data lokal RS (Transmisi Cloud SATUSEHAT dilewati).",
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
          label: "Draf Rekam Medis Lokal SIMRS",
          standard: "HL7 FHIR R4",
          category: "Administrasi Kunjungan",
          status: "synced",
          httpStatus: 201,
          fhirId: encounter.id,
        },
      ];

      // Save to SQLite DB via Drizzle
      const savedEncounter = EncounterRepository.create(
        {
          ...encounter,
          satusehatEncounterId: undefined,
          syncStatus: "draft",
          syncBreakdown: optOutBreakdown,
        },
        dbPatient.id
      );

      return NextResponse.json({
        success: true,
        message: "Resume Medis Rawat Jalan disimpan secara lokal di SIMRS (Status Opt-Out Pasien: Transmisi Cloud SATUSEHAT dilewati demi hak privasi pasien).",
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

      const savedEncounter = EncounterRepository.create(
        {
          ...encounter,
          satusehatEncounterId: undefined,
          syncStatus: "pending",
          syncBreakdown: pendingBreakdown,
        },
        dbPatient.id
      );

      return NextResponse.json({
        success: true,
        message: "Resume Medis Rawat Jalan disimpan secara lokal di SIMRS (Status: Menunggu Pengiriman ke SATUSEHAT).",
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
              resourceType: "SIMRS Local Medical Record",
              status: 201,
              success: true,
              id: encounter.id,
              detail: "Rekam medis tersimpan aman di database lokal RS. Siap dikirim saat koneksi bridging aktif.",
            },
          ],
        },
      });
    }

    // 3. Patient Opt-In Scenario (Live / Simulation)
    const { simulatePartialDrop = false, simulateDropTypes = [] } = body;

    const syncBreakdown: ResourceSyncItem[] = [
      {
        resourceType: "Consent",
        label: "Persetujuan Pasien (Opt-In)",
        standard: "HL7 FHIR R4 (IDS)",
        category: "Legal & Privasi Pasien (UU PDP)",
        status: "synced",
        httpStatus: 201,
        fhirId: `ss-con-${Date.now().toString(36)}`,
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
      {
        resourceType: "Observation",
        label: `TTV, Antropometri & Lab (${observations.length} items)`,
        standard: "LOINC",
        category: "Pemeriksaan Fisik & Lab",
        status: "synced",
        httpStatus: 201,
        fhirId: `ss-obs-${Date.now().toString(36)}`,
        retryCount: 0,
      },
      {
        resourceType: "Condition",
        label: `Diagnosis Primer & Sekunder (${conditions.length} items)`,
        standard: "ICD-10",
        category: "Penegakan Diagnostik",
        status: "synced",
        httpStatus: 201,
        fhirId: `ss-cond-${Date.now().toString(36)}`,
        retryCount: 0,
      },
      {
        resourceType: "Procedure",
        label: `Tindakan Medis (${procedures.length} items)`,
        standard: "ICD-9-CM",
        category: "Intervensi Klinis",
        status: "synced",
        httpStatus: 201,
        fhirId: `ss-proc-${Date.now().toString(36)}`,
        retryCount: 0,
      },
      {
        resourceType: "AllergyIntolerance",
        label: `Riwayat Alergi Pasien (${allergies.length} items)`,
        standard: "SNOMED-CT",
        category: "Patient Safety",
        status: "synced",
        httpStatus: 201,
        fhirId: `ss-allg-${Date.now().toString(36)}`,
        retryCount: 0,
      },
      {
        resourceType: "MedicationRequest",
        label: `Resep Elektronik (${medications.length} items)`,
        standard: "KFA Kemenkes",
        category: "Terapi Farmasi",
        status: "synced",
        httpStatus: 201,
        fhirId: `ss-med-${Date.now().toString(36)}`,
        retryCount: 0,
      },
      ...(serviceRequests.length > 0
        ? [
            {
              resourceType: "ServiceRequest",
              label: `Order Penunjang (${serviceRequests.length} items)`,
              standard: "LOINC / SNOMED-CT",
              category: "Order Diagnostik Lab/Rad",
              status: "synced" as const,
              httpStatus: 201,
              fhirId: `ss-sr-${Date.now().toString(36)}`,
              retryCount: 0,
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
              status: "synced" as const,
              httpStatus: 201,
              fhirId: `ss-dr-${Date.now().toString(36)}`,
              retryCount: 0,
            },
          ]
        : []),
      {
        resourceType: "CarePlan",
        label: "Rencana Kontrol & Edukasi",
        standard: "SNOMED-CT",
        category: "Instruksi Tindak Lanjut",
        status: "synced",
        httpStatus: 201,
        fhirId: `ss-cp-${Date.now().toString(36)}`,
        retryCount: 0,
      },
      {
        resourceType: "Composition",
        label: "Resume Medis Rawat Jalan Terpadu",
        standard: "LOINC 88645-7",
        category: "Agregasi Resume Medis",
        status: "synced",
        httpStatus: 201,
        fhirId: `ss-comp-${Date.now().toString(36)}`,
        retryCount: 0,
      },
    ];

    // Live Gateway Transmission vs Simulated Sandbox
    if (token && !simulate) {
      const liveResources = [
        { type: "Consent", payload: consent },
        { type: "Encounter", payload: encounterRes },
        ...observations.map((obs) => ({ type: "Observation", payload: obs })),
        ...conditions.map((cond) => ({ type: "Condition", payload: cond })),
        ...procedures.map((proc) => ({ type: "Procedure", payload: proc })),
        ...allergies.map((allg) => ({ type: "AllergyIntolerance", payload: allg })),
        ...medications.map((med) => ({ type: "MedicationRequest", payload: med })),
        ...serviceRequests.map((sr) => ({ type: "ServiceRequest", payload: sr })),
        ...diagnosticReports.map((dr) => ({ type: "DiagnosticReport", payload: dr })),
        { type: "CarePlan", payload: carePlan },
        { type: "Composition", payload: composition },
      ];

      for (const item of liveResources) {
        try {
          const response = await fetch(`${fhirBaseUrl}/${item.type}`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(item.payload),
          });

          const data = await response.json().catch(() => ({}));
          const isSuccess = response.status >= 200 && response.status < 300;

          results.push({
            resourceType: item.type,
            status: response.status,
            success: isSuccess,
            id: data.id || `live-${item.type.toLowerCase()}-${Date.now().toString(36)}`,
            detail: data,
          });

          const bdItem = syncBreakdown.find((b) => b.resourceType === item.type);
          if (bdItem) {
            bdItem.status = isSuccess ? "synced" : "failed";
            bdItem.httpStatus = response.status;
            bdItem.fhirId = data.id || bdItem.fhirId;
            if (!isSuccess) {
              bdItem.errorMessage = data.issue?.[0]?.diagnostics || `HTTP ${response.status} Failed`;
            }
          }
        } catch (postErr) {
          results.push({
            resourceType: item.type,
            status: 500,
            success: false,
            detail: postErr instanceof Error ? postErr.message : "Network error",
          });

          const bdItem = syncBreakdown.find((b) => b.resourceType === item.type);
          if (bdItem) {
            bdItem.status = "failed";
            bdItem.httpStatus = 500;
            bdItem.errorMessage = "Koneksi ke gateway SATUSEHAT terputus.";
          }
        }
      }
    } else {
      // Sandbox / Offline Simulation
      if (simulatePartialDrop) {
        const dropSet = new Set(
          simulateDropTypes.length > 0 ? simulateDropTypes : ["MedicationRequest", "Composition"]
        );
        for (const item of syncBreakdown) {
          if (dropSet.has(item.resourceType)) {
            item.status = "failed";
            item.httpStatus = 504;
            item.errorMessage = "504 Gateway Timeout: Transmisi ke gateway SATUSEHAT terputus di tengah pengiriman.";
          }
        }
      }
    }

    const hasFailed = syncBreakdown.some((item) => item.status === "failed");
    const syncStatus = hasFailed ? "partial_failed" : "synced";

    // Save to SQLite DB via Drizzle
    const savedEncounter = EncounterRepository.create(
      {
        ...encounter,
        satusehatEncounterId,
        syncStatus,
        syncBreakdown,
      },
      dbPatient.id
    );

    return NextResponse.json({
      success: true,
      message:
        syncStatus === "synced"
          ? "Resume Medis Rawat Jalan berhasil diproses & disinkronkan ke database lokal & SATUSEHAT (9/9 Resource FHIR)."
          : "Resume Medis tersimpan di database lokal, namun terjadi gangguan koneksi pada beberapa resource (Siap untuk Selective Retry).",
      data: {
        satusehatEncounterId,
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
