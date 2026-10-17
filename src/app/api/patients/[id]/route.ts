import { NextRequest, NextResponse } from "next/server";
import { PatientRepository } from "@/lib/db/repositories/patient-repo";
import { PatientProfile } from "@/lib/satusehat/types";
import { requireAuth } from "@/lib/auth/session-helper";

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
    const auth = requireAuth(req, ["registration", "nurse", "doctor", "admin"]);
    if (auth instanceof NextResponse) return auth;

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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(req, ["registration", "admin"]);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const deleted = await PatientRepository.softDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Pasien tidak ditemukan atau sudah dinonaktifkan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Data pasien berhasil dinonaktifkan secara aman (Soft Delete).",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal menonaktifkan data pasien.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

