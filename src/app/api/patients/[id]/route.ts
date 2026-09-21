import { NextRequest, NextResponse } from "next/server";
import { PatientRepository } from "@/lib/db/repositories/patient-repo";
import { PatientProfile } from "@/lib/satusehat/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const patient = await PatientRepository.getById(id);

    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Pasien tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: patient });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengambil data pasien.",
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
    const body = (await req.json()) as Partial<PatientProfile>;

    const updated = await PatientRepository.update(id, body);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Pasien tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal memperbarui data pasien.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export const PATCH = PUT;

