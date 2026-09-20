import { NextRequest, NextResponse } from "next/server";
import { MasterDataRepository } from "@/lib/db/repositories/master-data-repo";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "icd10"; // "icd10" | "icd9"
    const query = searchParams.get("q") || searchParams.get("query") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (type === "icd9") {
      const procedures = await MasterDataRepository.getIcd9({
        query,
        limit: isNaN(limit) ? 50 : limit,
      });

      return NextResponse.json({
        success: true,
        type: "icd9",
        data: procedures,
        total: procedures.length,
      });
    }

    const diagnoses = await MasterDataRepository.getIcd10({
      query,
      limit: isNaN(limit) ? 50 : limit,
    });

    return NextResponse.json({
      success: true,
      type: "icd10",
      data: diagnoses,
      total: diagnoses.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengambil kamus master diagnosa/tindakan ICD.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
