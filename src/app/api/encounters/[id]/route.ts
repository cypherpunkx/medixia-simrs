import { NextRequest, NextResponse } from "next/server";
import { EncounterRepository } from "@/lib/db/repositories/encounter-repo";
import { OutpatientEncounter } from "@/lib/satusehat/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const encounter = await EncounterRepository.getById(id);

    if (!encounter) {
      return NextResponse.json(
        { success: false, error: "Rekam medis kunjungan tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: encounter });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengambil data kunjungan.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Partial<OutpatientEncounter>;

    // Regulatory validation: Pastikan data yang sudah tersinkronisasi ke SATUSEHAT tidak dihapus secara sepihak
    const existing = await EncounterRepository.getById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Rekam medis kunjungan tidak ditemukan." },
        { status: 404 }
      );
    }

    // 0. Penegakan Immutability RME Sesuai Permenkes No. 24/2022
    if (existing.isLocked) {
      const isUnlocking = body.isLocked === false;
      const isAlteringClinical =
        (body.chiefComplaint && body.chiefComplaint !== existing.chiefComplaint) ||
        (body.anamnesis && body.anamnesis !== existing.anamnesis) ||
        (body.vitals && JSON.stringify(body.vitals) !== JSON.stringify(existing.vitals)) ||
        (body.diagnoses && JSON.stringify(body.diagnoses) !== JSON.stringify(existing.diagnoses)) ||
        (body.procedures && JSON.stringify(body.procedures) !== JSON.stringify(existing.procedures)) ||
        (body.prescriptions && JSON.stringify(body.prescriptions) !== JSON.stringify(existing.prescriptions));

      if (!isUnlocking && isAlteringClinical) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Pelanggaran Regulasi Permenkes No. 24/2022: Rekam Medis Elektronik berstatus Terkunci Sah (is_locked = true). Data klinis primer bersifat kekal (immutable) dan tidak dapat dimodifikasi langsung. Segala perubahan atau perbaikan data wajib dicatat melalui Adendum Rekam Medis ber-audit trail.",
            code: "MEDICAL_RECORD_LOCKED",
          },
          { status: 423 }
        );
      }
    }

    // 1. Validasi proteksi Order Lab yang sudah punya satusehatServiceRequestId
    if (body.diagnosticOrders && existing.diagnosticOrders) {
      const removedSyncedOrder = existing.diagnosticOrders.find(
        (existingOrd) =>
          existingOrd.satusehatServiceRequestId &&
          !body.diagnosticOrders?.some((bOrd) => bOrd.id === existingOrd.id)
      );
      if (removedSyncedOrder) {
        return NextResponse.json(
          {
            success: false,
            error: `Pelanggaran Regulasi Permenkes No. 24/2022: Order pemeriksaan "${removedSyncedOrder.testName}" telah terbit di SATUSEHAT (ID: ${removedSyncedOrder.satusehatServiceRequestId}) dan tidak dapat dihapus permanen.`,
            code: "CANNOT_DELETE_SYNCED_RESOURCE",
          },
          { status: 422 }
        );
      }
    }

    // 2. Validasi proteksi Hasil Lab yang sudah punya satusehatDiagnosticReportId
    if (body.labResults && existing.labResults) {
      const removedSyncedLab = existing.labResults.find(
        (existingLab) =>
          existingLab.satusehatDiagnosticReportId &&
          !body.labResults?.some((bLab) => bLab.id === existingLab.id)
      );
      if (removedSyncedLab) {
        return NextResponse.json(
          {
            success: false,
            error: `Pelanggaran Regulasi Permenkes No. 24/2022: Hasil laboratorium "${removedSyncedLab.testName}" telah terdaftar di SATUSEHAT (ID: ${removedSyncedLab.satusehatDiagnosticReportId}) dan tidak dapat dihapus permanen.`,
            code: "CANNOT_DELETE_SYNCED_RESOURCE",
          },
          { status: 422 }
        );
      }
    }

    // 3. Validasi proteksi Hasil Radiologi yang sudah punya satusehatDiagnosticReportId
    if (body.radiologyResults && existing.radiologyResults) {
      const removedSyncedRad = existing.radiologyResults.find(
        (existingRad) =>
          existingRad.satusehatDiagnosticReportId &&
          !body.radiologyResults?.some((bRad) => bRad.id === existingRad.id)
      );
      if (removedSyncedRad) {
        return NextResponse.json(
          {
            success: false,
            error: `Pelanggaran Regulasi Permenkes No. 24/2022: Hasil radiologi "${removedSyncedRad.examName}" telah terdaftar di SATUSEHAT (ID: ${removedSyncedRad.satusehatDiagnosticReportId}) dan tidak dapat dihapus permanen.`,
            code: "CANNOT_DELETE_SYNCED_RESOURCE",
          },
          { status: 422 }
        );
      }
    }

    const updated = await EncounterRepository.update(id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal memperbarui data kunjungan.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(req, { params });
}
