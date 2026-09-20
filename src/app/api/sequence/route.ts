import { NextRequest, NextResponse } from "next/server";
import { getNextRegistrationNumber, getNextMRN } from "@/lib/db/sequence";
import { applyRateLimit } from "@/lib/middleware/rate-limiter";

/**
 * GET /api/sequence?type=registration|mrn&prefix=RJ|RI|IGD
 * Endpoint atomic PostgreSQL sequence untuk penomoran loket admisi pendaftaran faskes
 */
export async function GET(req: NextRequest) {
  const rateLimitRes = applyRateLimit(req);
  if (rateLimitRes) return rateLimitRes;

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "registration";
    const prefix = (searchParams.get("prefix") as "RJ" | "RI" | "IGD") || "RJ";

    if (type === "mrn") {
      const mrn = await getNextMRN();
      return NextResponse.json({ success: true, data: { mrn } });
    }

    const registrationNumber = await getNextRegistrationNumber(new Date(), prefix);
    return NextResponse.json({ success: true, data: { registrationNumber } });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengambil sequence dari database.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
