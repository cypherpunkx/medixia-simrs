import { NextRequest, NextResponse } from "next/server";
import { UserRepository } from "@/lib/db/repositories/user-repo";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const facilityId = searchParams.get("facilityId");

    let list;
    if (facilityId) {
      list = await UserRepository.getByFacilityId(facilityId);
    } else {
      list = await UserRepository.getAll();
    }

    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengambil daftar pengguna nakes.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, name, role, facilityId, departmentId, sip, ihsPractitionerId } = body;

    if (!username || !name || !role || !facilityId) {
      return NextResponse.json(
        { success: false, error: "Username, Nama Lengkap, Peran Nakes, dan ID Faskes wajib diisi." },
        { status: 400 }
      );
    }

    const created = await UserRepository.create({
      username,
      password: password || "password123",
      name,
      role,
      facilityId,
      departmentId,
      sip,
      ihsPractitionerId,
    });

    if (!created) {
      return NextResponse.json(
        { success: false, error: "Gagal menyimpan pengguna baru ke database." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mendaftarkan nakes baru.",
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
        { success: false, error: "ID Pengguna wajib disertakan." },
        { status: 400 }
      );
    }

    const updated = await UserRepository.update(id, updateData);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal memperbarui data pengguna.",
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
        { success: false, error: "ID Pengguna wajib disertakan." },
        { status: 400 }
      );
    }

    const deleted = await UserRepository.delete(id);
    return NextResponse.json({ success: deleted });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal menghapus pengguna.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
