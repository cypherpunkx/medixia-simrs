import { NextRequest, NextResponse } from "next/server";
import { FacilityRepository } from "@/lib/db/repositories/facility-repo";

export async function GET() {
  try {
    const list = await FacilityRepository.getAll();
    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengambil daftar faskes.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, type, satusehatOrgId, address, phone, licenseNumber, departments, adminUser } = body;

    if (!name || !type || !satusehatOrgId) {
      return NextResponse.json(
        { success: false, error: "Nama Faskes, Tipe Faskes, dan Kode Org SATUSEHAT wajib diisi." },
        { status: 400 }
      );
    }

    const created = await FacilityRepository.create({
      name,
      type,
      satusehatOrgId,
      address: address || "",
      phone: phone || "",
      licenseNumber: licenseNumber || "",
      isActive: true,
      departments: departments || [],
      adminUser: adminUser || undefined,
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mendaftarkan faskes baru.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID Faskes wajib disertakan." },
        { status: 400 }
      );
    }

    const updated = await FacilityRepository.update(id, updateData);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal memperbarui data faskes.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
