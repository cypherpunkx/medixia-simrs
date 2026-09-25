import { NextRequest, NextResponse } from "next/server";
import { FacilityRepository } from "@/lib/db/repositories/facility-repo";
import { SatusehatEnvironment, FacilityType } from "@/lib/satusehat/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const facility = await FacilityRepository.getById(id);

    if (!facility) {
      return NextResponse.json(
        { success: false, error: "Faskes tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: facility });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengambil data faskes.",
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
    const existing = await FacilityRepository.getById(id);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Faskes tidak ditemukan." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      name,
      type,
      licenseNumber,
      address,
      phone,
      satusehatOrgId,
      satusehatClientId,
      satusehatClientSecret,
      satusehatEnv,
      satusehatStatus,
    } = body;

    if (!name || !type || !satusehatOrgId) {
      return NextResponse.json(
        {
          success: false,
          error: "Nama Faskes, Tipe Faskes, dan Organization ID SATUSEHAT wajib diisi.",
        },
        { status: 400 }
      );
    }

    const updateData: Parameters<typeof FacilityRepository.update>[1] = {
      name: name.trim(),
      type: type as FacilityType,
      licenseNumber: licenseNumber ? licenseNumber.trim() : "",
      address: address ? address.trim() : "",
      phone: phone ? phone.trim() : "",
      satusehatOrgId: satusehatOrgId.trim(),
      satusehatClientId: satusehatClientId ? satusehatClientId.trim() : "",
      satusehatEnv: (satusehatEnv as SatusehatEnvironment) || "staging",
    };

    // Jika admin menginput Client Secret baru, update & enkripsi
    if (satusehatClientSecret && typeof satusehatClientSecret === "string" && satusehatClientSecret.trim().length > 0) {
      updateData.satusehatClientSecret = satusehatClientSecret.trim();
      updateData.satusehatStatus = "connected";
      updateData.satusehatLastTestedAt = new Date().toISOString();
    } else if (satusehatStatus) {
      updateData.satusehatStatus = satusehatStatus;
    }

    const updated = await FacilityRepository.update(id, updateData);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Gagal memperbarui data faskes di database." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Profil & kredensial ${updated.name} berhasil diperbarui.`,
      data: updated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal menyimpan perubahan faskes.",
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
  try {
    const { id } = await params;
    const existing = await FacilityRepository.getById(id);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Faskes tidak ditemukan." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { isActive } = body;

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Status 'isActive' harus berupa boolean (true/false)." },
        { status: 400 }
      );
    }

    const updated = await FacilityRepository.update(id, { isActive });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Gagal mengubah status aktif faskes." },
        { status: 500 }
      );
    }

    const statusText = isActive ? "diaktifkan kembali" : "dinonaktifkan (diarsipkan)";
    return NextResponse.json({
      success: true,
      message: `Faskes ${updated.name} berhasil ${statusText}.`,
      data: updated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengubah status faskes.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
