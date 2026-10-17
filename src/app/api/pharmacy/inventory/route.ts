import { NextRequest, NextResponse } from "next/server";
import { PharmacyRepository } from "@/lib/db/repositories/pharmacy-repo";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;

    const items = await PharmacyRepository.getAllInventory(search);
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error("[GET /api/pharmacy/inventory Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengambil data katalog stok obat farmasi.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "restock") {
      const { kfaCode, quantity, creatorName, notes } = body;
      const numQty = Number(quantity);

      if (!kfaCode || typeof kfaCode !== "string") {
        return NextResponse.json(
          { success: false, error: "Kode KFA obat wajib disertakan." },
          { status: 400 }
        );
      }
      if (isNaN(numQty) || numQty <= 0) {
        return NextResponse.json(
          { success: false, error: "Jumlah restock harus berupa angka positif lebih dari 0." },
          { status: 400 }
        );
      }

      const res = await PharmacyRepository.restock({
        kfaCode: kfaCode.trim(),
        quantity: numQty,
        creatorName: creatorName ? String(creatorName).trim() : "Apoteker Farmasi",
        notes: notes ? String(notes).trim() : undefined,
      });
      return NextResponse.json({
        success: true,
        data: res,
        message: "Stok obat berhasil ditambahkan.",
      });
    }

    if (action === "adjustment") {
      const { kfaCode, newStock, reason, creatorName } = body;
      const numStock = Number(newStock);

      if (!kfaCode || typeof kfaCode !== "string") {
        return NextResponse.json(
          { success: false, error: "Kode KFA obat wajib disertakan." },
          { status: 400 }
        );
      }
      if (isNaN(numStock) || numStock < 0) {
        return NextResponse.json(
          { success: false, error: "Hasil perhitungan stok opname tidak boleh bernilai negatif." },
          { status: 400 }
        );
      }

      const res = await PharmacyRepository.adjustStock({
        kfaCode: kfaCode.trim(),
        newStock: numStock,
        reason: reason ? String(reason).trim() : "Stock Opname Rutin",
        creatorName: creatorName ? String(creatorName).trim() : "Apoteker Farmasi",
      });
      return NextResponse.json({
        success: true,
        data: res,
        message: "Penyesuaian stok opname berhasil disimpan.",
      });
    }

    if (action === "create") {
      const {
        kfaCode,
        name,
        genericName,
        form,
        strength,
        route,
        category,
        unit,
        stock,
        price,
        defaultDosage,
        defaultFrequency,
        defaultTiming,
        creatorName,
      } = body;

      const trimmedKfa = typeof kfaCode === "string" ? kfaCode.trim() : "";
      const trimmedName = typeof name === "string" ? name.trim() : "";
      const trimmedForm = typeof form === "string" ? form.trim() : "";
      const trimmedStrength = typeof strength === "string" ? strength.trim() : "";
      const trimmedCategory = typeof category === "string" ? category.trim() : "";
      const numStock = Number(stock) || 0;
      const numPrice = Number(price) || 0;

      // 1. Validasi Keberadaan Field Wajib
      if (!trimmedKfa || !trimmedName || !trimmedForm || !trimmedStrength || !trimmedCategory) {
        return NextResponse.json(
          {
            success: false,
            error: "Data wajib belum lengkap (Kode KFA, Nama Obat, Bentuk Sediaan, Dosis, dan Kategori).",
          },
          { status: 400 }
        );
      }

      // 2. Validasi Format Kode KFA Kemenkes (numerik 6 - 12 digit)
      if (!/^\d{6,12}$/.test(trimmedKfa)) {
        return NextResponse.json(
          {
            success: false,
            error: "Format Kode KFA tidak valid. Kode resmi KFA Kemenkes harus berupa angka 6-12 digit (contoh: 93000115).",
          },
          { status: 400 }
        );
      }

      // 3. Validasi Panjang Nama
      if (trimmedName.length < 3) {
        return NextResponse.json(
          { success: false, error: "Nama obat terlalu pendek (minimal 3 karakter)." },
          { status: 400 }
        );
      }

      // 4. Validasi Nilai Finansial & Fisik
      if (numPrice < 0) {
        return NextResponse.json(
          { success: false, error: "Harga satuan obat tidak boleh bernilai negatif." },
          { status: 400 }
        );
      }
      if (numStock < 0) {
        return NextResponse.json(
          { success: false, error: "Stok awal fisik tidak boleh bernilai negatif." },
          { status: 400 }
        );
      }

      const res = await PharmacyRepository.createMedication({
        kfaCode: trimmedKfa,
        name: trimmedName,
        genericName: genericName ? String(genericName).trim() : trimmedName,
        form: trimmedForm,
        strength: trimmedStrength,
        route: route ? String(route).trim() : "Oral",
        category: trimmedCategory,
        unit: unit ? String(unit).trim() : "Tablet",
        stock: numStock,
        price: numPrice,
        defaultDosage: defaultDosage ? String(defaultDosage).trim() : undefined,
        defaultFrequency: defaultFrequency ? String(defaultFrequency).trim() : undefined,
        defaultTiming: defaultTiming ? String(defaultTiming).trim() : undefined,
        creatorName: creatorName ? String(creatorName).trim() : "Apoteker Farmasi",
      });

      return NextResponse.json({
        success: true,
        data: res,
        message: res.isExisting
          ? `Obat ${res.name} (KFA: ${res.kfaCode}) sudah terdaftar di formularium faskes. Data katalog dan harga berhasil diperbarui.`
          : `Master obat KFA ${res.name} berhasil ditambahkan ke formularium faskes.`,
      });
    }

    if (action === "update") {
      const { id, name, category, price, unit, defaultDosage, defaultFrequency, defaultTiming } = body;
      if (!id || typeof id !== "string") {
        return NextResponse.json(
          { success: false, error: "ID obat wajib disertakan." },
          { status: 400 }
        );
      }

      const numPrice = price !== undefined ? Number(price) : undefined;
      if (numPrice !== undefined && (isNaN(numPrice) || numPrice < 0)) {
        return NextResponse.json(
          { success: false, error: "Harga satuan obat tidak boleh bernilai negatif." },
          { status: 400 }
        );
      }

      const res = await PharmacyRepository.updateMedication({
        id: id.trim(),
        name: name ? String(name).trim() : undefined,
        category: category ? String(category).trim() : undefined,
        price: numPrice,
        unit: unit ? String(unit).trim() : undefined,
        defaultDosage: defaultDosage ? String(defaultDosage).trim() : undefined,
        defaultFrequency: defaultFrequency ? String(defaultFrequency).trim() : undefined,
        defaultTiming: defaultTiming ? String(defaultTiming).trim() : undefined,
      });

      return NextResponse.json({
        success: true,
        data: res,
        message: "Data master obat berhasil diperbarui.",
      });
    }

    if (action === "toggle_active") {
      const { id, active } = body;
      if (!id) {
        return NextResponse.json(
          { success: false, error: "ID obat wajib disertakan." },
          { status: 400 }
        );
      }

      const res = await PharmacyRepository.toggleMedicationActive(
        id,
        typeof active === "boolean" ? active : undefined
      );

      return NextResponse.json({
        success: true,
        data: res,
        message: res.isActive
          ? "Obat berhasil diaktifkan kembali ke formularium peresepan."
          : "Obat berhasil dinonaktifkan (diarsipkan dari peresepan CPOE).",
      });
    }

    return NextResponse.json(
      { success: false, error: "Aksi tidak dikenali." },
      { status: 400 }
    );
  } catch (error) {
    console.error("[POST /api/pharmacy/inventory Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal memperbarui stok obat.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
