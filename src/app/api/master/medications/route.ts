import { NextRequest, NextResponse } from "next/server";
import { MasterDataRepository } from "@/lib/db/repositories/master-data-repo";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || searchParams.get("query") || undefined;
    const category = searchParams.get("category") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const items = await MasterDataRepository.getMedications({
      query,
      category,
      limit: isNaN(limit) ? 50 : limit,
    });

    return NextResponse.json({
      success: true,
      data: items,
      total: items.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengambil master data obat.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.kfaCode || !body.name || !body.genericName || !body.form || !body.strength || !body.category) {
      return NextResponse.json(
        {
          success: false,
          error: "Field wajib belum lengkap (kfaCode, name, genericName, form, strength, category).",
        },
        { status: 400 }
      );
    }

    const created = await MasterDataRepository.upsertMedication({
      kfaCode: body.kfaCode,
      name: body.name,
      genericName: body.genericName,
      form: body.form,
      strength: body.strength,
      route: body.route || "Oral",
      category: body.category,
      unit: body.unit || "Tablet",
      defaultDosage: body.defaultDosage,
      defaultFrequency: body.defaultFrequency,
      defaultTiming: body.defaultTiming,
      stock: typeof body.stock === "number" ? body.stock : 100,
      price: typeof body.price === "number" ? body.price : 0,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
    });

    return NextResponse.json(
      {
        success: true,
        data: created,
        message: "Master data obat berhasil disimpan.",
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal menyimpan master data obat.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
