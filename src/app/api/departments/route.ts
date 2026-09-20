import { NextRequest, NextResponse } from "next/server";
import { FacilityRepository } from "@/lib/db/repositories/facility-repo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { facilityId, name, room, quota, defaultDoctorName } = body;

    if (!facilityId || !name) {
      return NextResponse.json(
        { success: false, error: "ID Faskes dan Nama Poliklinik wajib diisi." },
        { status: 400 }
      );
    }

    const created = await FacilityRepository.addDepartment(facilityId, {
      name,
      room,
      quota,
      defaultDoctorName,
    });

    if (!created) {
      return NextResponse.json(
        { success: false, error: "Gagal menambahkan poliklinik baru ke database." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal menambahkan poliklinik baru.",
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
        { success: false, error: "ID Poliklinik wajib disertakan." },
        { status: 400 }
      );
    }

    const success = await FacilityRepository.updateDepartment(id, updateData);
    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal memperbarui data poliklinik.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID Poliklinik wajib disertakan." },
        { status: 400 }
      );
    }

    const success = await FacilityRepository.deleteDepartment(id);
    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal menghapus poliklinik.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
