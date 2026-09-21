import { NextRequest, NextResponse } from "next/server";
import { EncounterRepository } from "@/lib/db/repositories/encounter-repo";
import { PatientRepository } from "@/lib/db/repositories/patient-repo";
import { OutpatientEncounter } from "@/lib/satusehat/types";

import { applyRateLimit } from "@/lib/middleware/rate-limiter";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const rateLimitResponse = applyRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  const startTime = performance.now();

  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");

    let data: OutpatientEncounter[];
    if (patientId) {
      data = await EncounterRepository.getByPatientId(patientId);
    } else {
      data = await EncounterRepository.getAll();
    }

    const durationMs = Number((performance.now() - startTime).toFixed(2));

    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          "Server-Timing": `db;dur=${durationMs}`,
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengambil data kunjungan dari database.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { encounter: OutpatientEncounter; patientId: string };

    if (!body.encounter || !body.patientId) {
      return NextResponse.json(
        {
          success: false,
          error: "Data encounter dan patientId wajib disertakan.",
        },
        { status: 400 }
      );
    }

    const patient = await PatientRepository.getById(body.patientId);
    if (!patient) {
      return NextResponse.json(
        {
          success: false,
          error: `Pasien dengan ID '${body.patientId}' tidak ditemukan di database.`,
        },
        { status: 404 }
      );
    }

    const { encounter, patientId } = body;

    // 1. Mandatory fields validation
    if (!encounter.chiefComplaint || !encounter.chiefComplaint.trim()) {
      return NextResponse.json(
        { success: false, error: "Keluhan utama pasien wajib diisi sesuai Permenkes No. 24/2022." },
        { status: 400 }
      );
    }

    // 2. Vital signs physiological validation
    if (encounter.vitals) {
      const { systolic, diastolic } = encounter.vitals;
      if (systolic !== undefined && diastolic !== undefined && systolic <= diastolic) {
        return NextResponse.json(
          { success: false, error: "Validasi tanda vital gagal: Tekanan darah sistolik harus lebih besar dari diastolik." },
          { status: 400 }
        );
      }
    }

    // 3. Primary diagnosis validation (wajib hanya jika kunjungan telah selesai/difinalisasi oleh dokter DPJP)
    const isFinished = encounter.encounterStatus === "finished";
    if (isFinished) {
      if (!encounter.diagnoses || encounter.diagnoses.length === 0 || !encounter.diagnoses.some((d) => d.type === "primary")) {
        return NextResponse.json(
          { success: false, error: "Rekam medis yang telah difinalisasi wajib memiliki minimal 1 diagnosis utama (Primary Diagnosis) berstandar ICD-10." },
          { status: 400 }
        );
      }
    }

    // Duplication check for ICD-10 diagnoses (jika diagnosis diisi)
    if (encounter.diagnoses && encounter.diagnoses.length > 0) {
      const diagCodes = encounter.diagnoses.map((d) => (d.code || "").trim().toUpperCase());
      const hasDuplicate = diagCodes.some((c, idx) => c && diagCodes.indexOf(c) !== idx);
      if (hasDuplicate) {
        return NextResponse.json(
          { success: false, error: "Terdapat duplikasi kode diagnosis ICD-10 pada kunjungan yang sama." },
          { status: 400 }
        );
      }
    }

    // 4. Clinical disposition & follow-up plan validation (hanya jika kunjungan selesai)
    if (isFinished) {
      if (encounter.dischargeDisposition === "Kontrol Kembali") {
        const nextDate = encounter.followUpPlan?.nextVisitDate;
        if (!nextDate) {
          return NextResponse.json(
            { success: false, error: "Tanggal kontrol wajib diisi untuk pasien dengan disposisi 'Kontrol Kembali'." },
            { status: 400 }
          );
        }
        const today = new Date().toISOString().split("T")[0];
        if (nextDate < today) {
          return NextResponse.json(
            { success: false, error: "Tanggal rencana kontrol ulang tidak boleh merupakan tanggal lampau." },
            { status: 400 }
          );
        }
      }

      if (
        encounter.dischargeDisposition === "Dirujuk ke RS Lain" ||
        encounter.dischargeDisposition === "Konsul Internal Poli Lain"
      ) {
        const refTo = encounter.followUpPlan?.referredTo;
        if (!refTo || !refTo.trim()) {
          return NextResponse.json(
            { success: false, error: "Tujuan faskes rujukan atau poliklinik konsul wajib diisi." },
            { status: 400 }
          );
        }
      }
    }

    // 5. Prescription items validation
    if (encounter.prescriptions && encounter.prescriptions.length > 0) {
      for (const rx of encounter.prescriptions) {
        if (!rx.quantity || rx.quantity <= 0 || !rx.durationDays || rx.durationDays <= 0) {
          return NextResponse.json(
            {
              success: false,
              error: `Item resep "${rx.medicationName || "Obat"}" tidak valid: jumlah dan durasi hari harus lebih dari 0.`,
            },
            { status: 400 }
          );
        }
      }
    }

    const created = await EncounterRepository.create(encounter, patientId);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal menyimpan rekam medis kunjungan ke database.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
