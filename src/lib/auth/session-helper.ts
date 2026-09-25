import { NextRequest } from "next/server";
import { verifySessionToken } from "./jwt";

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
  const sessionCookie = req.cookies.get("medixia_simrs_session")?.value;
  if (sessionCookie) {
    const session = verifySessionToken(sessionCookie);
    if (session?.facilityId && session.facilityId.trim()) {
      return session.facilityId.trim();
    }
  }

  return null;
}
