import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SessionPayload } from "./jwt";

/**
 * Mengekstrak payload sesi dari permintaan HTTP (Cookie atau Bearer token)
 */
export function extractSessionFromRequest(req: NextRequest): SessionPayload | null {
  // 1. Periksa Authorization header (Bearer token)
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.substring(7).trim();
    const session = verifySessionToken(token);
    if (session) return session;
  }

  // 2. Periksa Cookie Sesi Pengguna
  const sessionCookie = req.cookies.get("medixia_simrs_session")?.value;
  if (sessionCookie) {
    const session = verifySessionToken(sessionCookie);
    if (session) return session;

    // Fallback transisi jika cookie lama masih berformat raw JSON
    try {
      const raw = JSON.parse(sessionCookie);
      if (raw && typeof raw.userId === "string") {
        return {
          userId: raw.userId,
          facilityId: raw.facilityId,
          role: raw.role,
          username: raw.username,
        };
      }
    } catch {
      // not raw json
    }
  }

  return null;
}

/**
 * Guard Autentikasi dan Otorisasi Berbasis Peran (RBAC) pada API Route Next.js
 * Mengembalikan session jika valid, atau NextResponse (401 / 403) jika ditolak.
 */
export function requireAuth(
  req: NextRequest,
  allowedRoles?: string[]
): { session: SessionPayload } | NextResponse {
  const session = extractSessionFromRequest(req);

  if (!session || !session.userId) {
    return NextResponse.json(
      {
        success: false,
        error: "Akses Ditolak: Anda belum terautentikasi. Sesi tidak ditemukan atau telah kedaluwarsa.",
        code: "UNAUTHORIZED",
      },
      { status: 401 }
    );
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = session.role || "";
    // Admin sistem selalu memiliki akses ke seluruh modul
    const isAllowed = allowedRoles.includes(userRole) || userRole === "admin";
    if (!isAllowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Akses Terbatas: Peran Anda ('${userRole}') tidak memiliki wewenang untuk tindakan ini. Diperlukan peran: [${allowedRoles.join(", ")}].`,
          code: "FORBIDDEN",
        },
        { status: 403 }
      );
    }
  }

  return { session };
}

/**
 * Mengekstrak ID Faskes (facilityId) dari permintaan HTTP Next.js:
 * 1. Parameter eksplisit (argumen fungsi)
 * 2. Header `x-facility-id`
 * 3. Query string `?facilityId=...`
 * 4. Token sesi JWT di cookie `medixia_simrs_session`
 */
export function extractFacilityIdFromRequest(
  req: NextRequest,
  explicitId?: string | null
): string | null {
  if (explicitId && explicitId.trim()) {
    return explicitId.trim();
  }

  // 1. Header kustom x-facility-id
  const headerId = req.headers.get("x-facility-id");
  if (headerId && headerId.trim()) {
    return headerId.trim();
  }

  // 2. Query parameter ?facilityId=...
  const queryId = req.nextUrl.searchParams.get("facilityId");
  if (queryId && queryId.trim()) {
    return queryId.trim();
  }

  // 3. Cookie Sesi Pengguna
  const session = extractSessionFromRequest(req);
  if (session?.facilityId && session.facilityId.trim()) {
    return session.facilityId.trim();
  }

  return null;
}
