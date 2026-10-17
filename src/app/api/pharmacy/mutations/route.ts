import { NextRequest, NextResponse } from "next/server";
import { PharmacyRepository } from "@/lib/db/repositories/pharmacy-repo";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const kfaCode = searchParams.get("kfaCode") || undefined;

    const data = await PharmacyRepository.getStockMutations(kfaCode);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[GET /api/pharmacy/mutations Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengambil data mutasi stok farmasi.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
