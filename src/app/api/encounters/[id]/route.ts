import { NextRequest, NextResponse } from "next/server";
import { EncounterRepository } from "@/lib/db/repositories/encounter-repo";
import { OutpatientEncounter } from "@/lib/satusehat/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const encounter = EncounterRepository.getById(id);

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

    const updated = EncounterRepository.update(id, body);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Rekam medis kunjungan tidak ditemukan." },
        { status: 404 }
      );
    }

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
