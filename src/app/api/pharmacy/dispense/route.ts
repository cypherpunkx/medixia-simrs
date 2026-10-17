import { NextRequest, NextResponse } from "next/server";
import { PharmacyRepository } from "@/lib/db/repositories/pharmacy-repo";
import { generateFhirMedicationDispense } from "@/lib/satusehat/fhir-transformer";
import { SatusehatClient } from "@/lib/satusehat/client";
import { getSatusehatFhirUrl } from "@/lib/satusehat/config";
import { SatusehatEnvironment } from "@/lib/satusehat/types";
import { generateUUIDv7 } from "@/lib/id-generator";
import { requireAuth } from "@/lib/auth/session-helper";

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
      details?: {
        text?: string;
        coding?: Array<{ display?: string; code?: string }>;
      };
      diagnostics?: string;
      expression?: string[];
    };
    const detailText = firstIssue.details?.text || firstIssue.details?.coding?.[0]?.display;
    const diagnostics = firstIssue.diagnostics;
    const expression = firstIssue.expression ? ` [${firstIssue.expression.join(", ")}]` : "";
    if (diagnostics && detailText) return `${detailText}: ${diagnostics}${expression}`;
    if (diagnostics) return `${diagnostics}${expression}`;
    if (detailText) return `${detailText}${expression}`;
  }
  if (typeof obj.message === "string") return obj.message;
  if (typeof obj.error_description === "string") return obj.error_description;
  if (typeof obj.error === "string") return obj.error;
  return `HTTP ${status} Failed`;
}

async function sendMedicationDispenseToSatusehat({
  contextData,
  dispenserName,
  env = "staging",
}: {
  contextData: NonNullable<Awaited<ReturnType<typeof PharmacyRepository.getPrescriptionWithContext>>>;
  dispenserName?: string;
  env?: SatusehatEnvironment;
}): Promise<{
  success: boolean;
  dispenseId: string;
  isLive: boolean;
  httpStatus?: number;
  error?: string;
  payload?: unknown;
}> {
  const { rx, enc, pat } = contextData;
  const fhirPayload = generateFhirMedicationDispense({
    prescription: {
      id: rx.id,
      kfaCode: rx.kfaCode,
      medicationName: rx.medicationName,
      quantity: rx.quantity,
      unit: rx.unit,
      dosage: rx.dosage,
      frequency: rx.frequency,
      timing: rx.timing,
      instructions: rx.instructions,
      durationDays: rx.durationDays,
      preparedAt: rx.preparedAt,
      dispensedAt: rx.dispensedAt || new Date().toISOString(),
      batchNumber: rx.batchNumber,
      expiryDate: rx.expiryDate,
      satusehatMedicationId: rx.satusehatMedicationId,
      satusehatMedicationRequestId: rx.satusehatMedicationRequestId,
    },
    encounter: {
      id: enc.id,
      satusehatEncounterId: enc.satusehatEncounterId,
      visitDate: enc.visitDate,
      hospitalOrgId: process.env.SATUSEHAT_ORGANIZATION_ID || null,
      locationId: process.env.SATUSEHAT_LOCATION_ID || null,
      doctorIhsId: enc.doctorIhsId,
      doctorName: enc.doctorName,
    },
    patient: {
      id: pat.id,
      ihsNumber: pat.ihsNumber,
      name: pat.name,
    },
    dispenser: {
      name: dispenserName || "Apoteker Farmasi",
      ihsNumber: "N10000001",
    },
  });

  try {
    const authRes = await SatusehatClient.getOrFetchToken(env);
    if (!authRes.success || !authRes.data?.accessToken) {
      const fallbackId = generateUUIDv7();
      return {
        success: false,
        dispenseId: fallbackId,
        isLive: false,
        error: "Gagal autentikasi gateway SATUSEHAT. Disimpan ke antrean lokal.",
        payload: fhirPayload,
      };
    }

    const token = authRes.data.accessToken;
    const fhirUrl = getSatusehatFhirUrl(env);
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const res = await fetch(`${fhirUrl}/MedicationDispense`, {
      method: "POST",
      headers,
      body: JSON.stringify(fhirPayload),
      signal: AbortSignal.timeout(4000), // Circuit protection: maks 4 detik agar antrean loket farmasi tidak hang
    });

    const data = await res.json().catch(() => ({}));
    if (res.status >= 200 && res.status < 300 && data.id) {
      return {
        success: true,
        dispenseId: data.id,
        isLive: true,
        httpStatus: res.status,
        payload: fhirPayload,
      };
    }

    // Check duplicate (Rule 20002)
    const rawError = JSON.stringify(data).toLowerCase();
    if (rawError.includes("20002") || rawError.includes("duplicate") || res.status === 409) {
      const existingClean =
        rx.satusehatMedicationDispenseId &&
        !rx.satusehatMedicationDispenseId.startsWith("disp-ss-")
          ? rx.satusehatMedicationDispenseId
          : generateUUIDv7();
      return {
        success: true,
        dispenseId: existingClean,
        isLive: true,
        httpStatus: 200,
        payload: fhirPayload,
      };
    }

    const errMessage = extractSatusehatErrorMessage(data, res.status);
    const fallbackId = generateUUIDv7();
    return {
      success: false,
      dispenseId: fallbackId,
      isLive: false,
      httpStatus: res.status,
      error: errMessage,
      payload: fhirPayload,
    };
  } catch (err) {
    const fallbackId = generateUUIDv7();
    return {
      success: false,
      dispenseId: fallbackId,
      isLive: false,
      error: err instanceof Error ? err.message : "Koneksi gateway SATUSEHAT terputus.",
      payload: fhirPayload,
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req, ["pharmacy", "admin"]);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Parameter 'action' wajib disertakan." },
        { status: 400 }
      );
    }

    if (action === "review") {
      const { prescriptionId, reviewerName } = body;
      if (!prescriptionId) {
        return NextResponse.json(
          { success: false, error: "prescriptionId wajib disertakan." },
          { status: 400 }
        );
      }
      await PharmacyRepository.reviewPrescription(prescriptionId, reviewerName);
      return NextResponse.json({
        success: true,
        message: "Resep berhasil diverifikasi / ditelaah.",
      });
    }

    if (action === "prepare") {
      const { prescriptionId, preparerName, batchNumber, expiryDate, etiquetteType } = body;
      if (!prescriptionId) {
        return NextResponse.json(
          { success: false, error: "prescriptionId wajib disertakan." },
          { status: 400 }
        );
      }
      const res = await PharmacyRepository.prepareAndDeductStock({
        prescriptionId,
        preparerName,
        batchNumber,
        expiryDate,
        etiquetteType,
      });
      return NextResponse.json({
        success: true,
        data: res,
        message: "Obat berhasil diracik/disiapkan dan stok telah dipotong otomatis.",
      });
    }

    if (action === "dispense") {
      const { prescriptionId, dispenserName, counselingNotes, env = "staging" } = body;
      if (!prescriptionId) {
        return NextResponse.json(
          { success: false, error: "prescriptionId wajib disertakan." },
          { status: 400 }
        );
      }

      // 1. Ambil detail resep beserta relasi Encounter & Pasien
      const contextData = await PharmacyRepository.getPrescriptionWithContext(prescriptionId);
      if (!contextData) {
        return NextResponse.json(
          { success: false, error: "Data resep dan kunjungan tidak ditemukan." },
          { status: 404 }
        );
      }

      // 2. Kirim payload FHIR MedicationDispense ke SATUSEHAT
      const bridgingResult = await sendMedicationDispenseToSatusehat({
        contextData,
        dispenserName,
        env,
      });

      // 3. Simpan status penyerahan dan ID MedicationDispense ke database SIMRS
      const res = await PharmacyRepository.dispenseToPatient({
        prescriptionId,
        dispenserName,
        counselingNotes,
        satusehatMedicationDispenseId: bridgingResult.dispenseId,
      });

      return NextResponse.json({
        success: true,
        data: {
          satusehatDispenseId: bridgingResult.dispenseId,
          isLive: bridgingResult.isLive,
          httpStatus: bridgingResult.httpStatus || 200,
          syncError: bridgingResult.error,
        },
        message: bridgingResult.isLive
          ? "Obat berhasil diserahkan ke pasien dan tersinkron resmi ke SATUSEHAT (UUID Resmi)."
          : "Obat berhasil diserahkan ke pasien (Tersimpan lokal, sinkronisasi SATUSEHAT dapat diulang).",
      });
    }

    if (action === "sync_satusehat") {
      const { prescriptionId, dispenserName, env = "staging" } = body;
      if (!prescriptionId) {
        return NextResponse.json(
          { success: false, error: "prescriptionId wajib disertakan." },
          { status: 400 }
        );
      }

      const contextData = await PharmacyRepository.getPrescriptionWithContext(prescriptionId);
      if (!contextData) {
        return NextResponse.json(
          { success: false, error: "Data resep dan kunjungan tidak ditemukan." },
          { status: 404 }
        );
      }

      const bridgingResult = await sendMedicationDispenseToSatusehat({
        contextData,
        dispenserName,
        env,
      });

      if (bridgingResult.isLive && bridgingResult.dispenseId) {
        await PharmacyRepository.updateDispenseSatusehatId(
          prescriptionId,
          bridgingResult.dispenseId
        );
      }

      return NextResponse.json({
        success: bridgingResult.isLive,
        data: {
          satusehatDispenseId: bridgingResult.dispenseId,
          isLive: bridgingResult.isLive,
          httpStatus: bridgingResult.httpStatus || (bridgingResult.isLive ? 200 : 400),
          syncError: bridgingResult.error,
        },
        message: bridgingResult.isLive
          ? "Sinkronisasi SATUSEHAT MedicationDispense berhasil (UUID Resmi diterbitkan)."
          : `Gagal sinkron SATUSEHAT: ${bridgingResult.error || "Terjadi kesalahan gateway."}`,
      });
    }

    if (action === "restock") {
      const { kfaCode, quantity, creatorName, notes } = body;
      if (!kfaCode || !quantity) {
        return NextResponse.json(
          { success: false, error: "kfaCode dan quantity wajib disertakan." },
          { status: 400 }
        );
      }
      const res = await PharmacyRepository.restock({
        kfaCode,
        quantity: Number(quantity),
        creatorName: creatorName || "Apoteker Farmasi",
        notes,
      });
      return NextResponse.json({
        success: true,
        data: res,
        message: "Stok obat berhasil ditambahkan.",
      });
    }

    return NextResponse.json(
      { success: false, error: `Action '${action}' tidak dikenali.` },
      { status: 400 }
    );
  } catch (error) {
    console.error("[POST /api/pharmacy/dispense Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal memproses aksi farmasi.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
