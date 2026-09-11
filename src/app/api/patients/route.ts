import { NextRequest, NextResponse } from "next/server";
import { PatientRepository } from "@/lib/db/repositories/patient-repo";
import { PatientProfile } from "@/lib/satusehat/types";

import { applyRateLimit } from "@/lib/middleware/rate-limiter";

export async function GET(req: NextRequest) {
  const rateLimitResponse = applyRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  const startTime = performance.now();

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    const nik = searchParams.get("nik");
    const mrn = searchParams.get("mrn");

    let data: PatientProfile | PatientProfile[] | null;

    if (nik) {
      data = PatientRepository.getByNik(nik);
    } else if (mrn) {
      data = PatientRepository.getByMrn(mrn);
    } else if (q) {
      data = PatientRepository.search(q);
    } else {
      data = PatientRepository.getAll();
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
        error: "Gagal mengambil data pasien dari database.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PatientProfile;

    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Nama Pasien wajib diisi.",
        },
        { status: 400 }
      );
    }

    if (!body.nik || !/^\d{16}$/.test(body.nik.trim())) {
      return NextResponse.json(
        {
          success: false,
          error: "NIK harus terdiri dari 16 digit angka sesuai standar Kemenkes/Dukcapil.",
        },
        { status: 400 }
      );
    }

    // Check duplicate NIK
    const existingNik = PatientRepository.getByNik(body.nik.trim());
    if (existingNik) {
      return NextResponse.json(
        {
          success: false,
          error: `Pasien dengan NIK ${body.nik} sudah terdaftar (${existingNik.name} - No. RM: ${existingNik.mrn}).`,
        },
        { status: 409 }
      );
    }

    // Check duplicate MRN if provided
    if (body.mrn && body.mrn.trim()) {
      const existingMrn = PatientRepository.getByMrn(body.mrn.trim());
      if (existingMrn) {
        return NextResponse.json(
          {
            success: false,
            error: `Nomor Rekam Medis (RM) ${body.mrn} sudah digunakan oleh pasien ${existingMrn.name}.`,
          },
          { status: 409 }
        );
      }
    }

    const created = PatientRepository.create(body);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal menyimpan pasien baru ke database.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
