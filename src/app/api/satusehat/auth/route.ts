import { NextRequest, NextResponse } from "next/server";
import { SatusehatClient } from "@/lib/satusehat/client";
import { SatusehatEnvironment } from "@/lib/satusehat/types";
import { extractFacilityIdFromRequest } from "@/lib/auth/session-helper";
import { FacilityRepository } from "@/lib/db/repositories/facility-repo";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const env = (searchParams.get("env") as SatusehatEnvironment) || "staging";
    const forceRefresh = searchParams.get("forceRefresh") === "true";
    const facilityId = extractFacilityIdFromRequest(req);

    const result = await SatusehatClient.getOrFetchToken(env, {
      forceRefresh,
      facilityId: facilityId || undefined,
    });
    const status = result.success ? 200 : result.telemetry?.httpStatus || 400;
    return NextResponse.json(result, { status });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message:
            error instanceof Error
              ? error.message
              : "Internal server error during authentication check",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    let clientId = body.clientId;
    let clientSecret = body.clientSecret;
    let env: SatusehatEnvironment = body.env || "staging";
    let orgId = body.orgId;
    const forceRefresh = Boolean(body.forceRefresh);
    const facilityId = extractFacilityIdFromRequest(req, body.facilityId);

    // Jika facilityId tersedia dan tidak ada raw clientId/secret di payload, muat dari database
    if (facilityId && (!clientId || !clientSecret)) {
      const creds = await FacilityRepository.getDecryptedCredentials(facilityId);
      if (creds && creds.clientId && creds.clientSecret) {
        clientId = creds.clientId;
        clientSecret = creds.clientSecret;
        orgId = orgId || creds.orgId;
        env = creds.env || env;
      }
    }

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Client ID dan Client Secret wajib diisi atau pilih faskes yang telah terdaftar.",
            code: "MISSING_CREDENTIALS",
            suggestions: [
              "Sertakan 'facilityId' atau 'clientId' & 'clientSecret' dalam body permintaan.",
              "Kredensial faskes kini murni dikelola di database PostgreSQL, bukan dari environment .env.",
            ],
          },
        },
        { status: 400 }
      );
    }

    const result = await SatusehatClient.authenticate(
      {
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        env,
        orgId: orgId?.trim() || "b15a7ae7-f366-4a84-8385-0b8196c05002",
      },
      { forceRefresh }
    );

    const status = result.success ? 200 : result.telemetry?.httpStatus || 400;
    return NextResponse.json(result, { status });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message:
            error instanceof Error
              ? error.message
              : "Internal server error during authentication",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
