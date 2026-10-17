import { NextRequest, NextResponse } from "next/server";
import { PharmacyRepository } from "@/lib/db/repositories/pharmacy-repo";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") as any;
    const search = searchParams.get("search") || undefined;

    const data = await PharmacyRepository.getWorklist({
      status: statusParam || undefined,
      search,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[GET /api/pharmacy/worklist Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengambil data antrean resep farmasi.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
