import { NextRequest, NextResponse } from "next/server";
import { EncounterRepository } from "@/lib/db/repositories/encounter-repo";
import { PatientRepository } from "@/lib/db/repositories/patient-repo";
import { OutpatientEncounter } from "@/lib/satusehat/types";

import { applyRateLimit } from "@/lib/middleware/rate-limiter";

export async function GET(req: NextRequest) {
  const rateLimitResponse = applyRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  const startTime = performance.now();

  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");

    let data: OutpatientEncounter[];
    if (patientId) {
      data = EncounterRepository.getByPatientId(patientId);
    } else {
      data = EncounterRepository.getAll();
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

    const patient = PatientRepository.getById(body.patientId);
    if (!patient) {
      return NextResponse.json(
        {
          success: false,
          error: `Pasien dengan ID '${body.patientId}' tidak ditemukan di database.`,
        },
        { status: 404 }
      );
    }

    const created = EncounterRepository.create(body.encounter, body.patientId);
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
