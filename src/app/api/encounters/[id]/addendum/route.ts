import { NextRequest, NextResponse } from "next/server";
import { EncounterRepository } from "@/lib/db/repositories/encounter-repo";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await EncounterRepository.getById(id);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Rekam medis kunjungan tidak ditemukan." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { authorName, authorRole, noteText } = body;

    if (!noteText || typeof noteText !== "string" || !noteText.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Isi catatan adendum rekam medis tidak boleh kosong.",
        },
        { status: 400 }
      );
    }

    const newAddendum = await EncounterRepository.addAddendum(id, {
      authorName: authorName?.trim() || "Tenaga Medis Terotorisasi",
      authorRole: authorRole?.trim() || "Dokter DPJP / Tenaga Kesehatan",
      noteText: noteText.trim(),
    });

    return NextResponse.json({
      success: true,
      data: newAddendum,
      message: "Catatan adendum rekam medis berhasil dicatat ke audit trail permanen.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal menyimpan adendum rekam medis.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
