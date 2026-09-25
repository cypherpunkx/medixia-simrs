import { NextRequest, NextResponse } from "next/server";
import { UserRepository } from "@/lib/db/repositories/user-repo";
import { FacilityRepository } from "@/lib/db/repositories/facility-repo";
import { verifySessionToken, SessionPayload } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("medixia_simrs_session")?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "Sesi tidak ditemukan. Silakan login terlebih dahulu.",
        },
        { status: 401 }
      );
    }

    try {
      // 1. Verifikasi tanda tangan JWT
      let session: SessionPayload | null = verifySessionToken(sessionCookie);

      // Fallback transisi jika cookie lama masih berformat raw JSON
      if (!session) {
        try {
          const raw = JSON.parse(sessionCookie);
          if (raw && typeof raw.userId === "string") {
            session = { userId: raw.userId, facilityId: raw.facilityId };
          }
        } catch {
          // not json
        }
      }

      if (!session || !session.userId) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: "Sesi tidak valid atau telah kedaluwarsa.",
          },
          { status: 401 }
        );
      }

      const user = await UserRepository.getById(session.userId);
      if (!user) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: "Pengguna tidak ditemukan atau telah dinonaktifkan.",
          },
          { status: 401 }
        );
      }

      const facility = await FacilityRepository.getById(session.facilityId || user.facilityId || "fac-rsud-01");

      const enrichedUser = {
        ...user,
        facilityId: facility?.id || user.facilityId,
        facilityName: facility?.name || user.facilityName,
        facilityType: facility?.type || user.facilityType,
      };

      return NextResponse.json({
        success: true,
        authenticated: true,
        user: enrichedUser,
        facility,
        data: {
          user: enrichedUser,
          facility,
        },
      });
    } catch {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "Sesi tidak valid.",
        },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengambil sesi pengguna.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
