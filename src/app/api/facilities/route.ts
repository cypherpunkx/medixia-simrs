import { NextRequest, NextResponse } from "next/server";
import { FacilityRepository } from "@/lib/db/repositories/facility-repo";
import { verifySessionToken } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryAll = searchParams.get("all") === "true";

    // Jika pemanggil adalah Super Admin Vendor, otomatis sertakan faskes nonaktif/arsip
    const sessionCookie = req.cookies.get("medixia_simrs_session")?.value;
    const session = sessionCookie ? verifySessionToken(sessionCookie) : null;
    const isSuperAdmin = session?.role === "super_admin";

    const includeAll = queryAll || isSuperAdmin;
    const list = await FacilityRepository.getAll(includeAll);
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
    const {
      name,
      type,
      satusehatOrgId,
      satusehatClientId,
      satusehatClientSecret,
      satusehatEnv,
      address,
      phone,
      licenseNumber,
      departments,
      adminUser,
    } = body;

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
      satusehatClientId: satusehatClientId || undefined,
      satusehatClientSecret: satusehatClientSecret || undefined,
      satusehatEnv: satusehatEnv || "staging",
      satusehatStatus: satusehatClientId && satusehatClientSecret ? "connected" : "unverified",
      satusehatLastTestedAt: satusehatClientId && satusehatClientSecret ? new Date().toISOString() : undefined,
      address: address || "",
      phone: phone || "",
      licenseNumber: licenseNumber || "",
      isActive: true,
      departments: departments || [],
      adminUser: adminUser || undefined,
    });

    if (!created) {
      return NextResponse.json(
        { success: false, error: "Gagal membuat fasilitas kesehatan baru." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Gagal mendaftarkan faskes baru.";
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 400 }
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
