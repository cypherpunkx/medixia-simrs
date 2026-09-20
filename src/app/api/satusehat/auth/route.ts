import { NextRequest, NextResponse } from "next/server";
import { SatusehatClient } from "@/lib/satusehat/client";
import { SatusehatEnvironment } from "@/lib/satusehat/types";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const serverDefaultEnv = (process.env.SATUSEHAT_ENV as SatusehatEnvironment) || "staging";
    const env = (searchParams.get("env") as SatusehatEnvironment) || serverDefaultEnv;
    const forceRefresh = searchParams.get("forceRefresh") === "true";

    const result = await SatusehatClient.getOrFetchToken(env, { forceRefresh });
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

    // Fallback to server-side credentials seamlessly if empty or requested
    clientId = clientId?.trim() || process.env.SATUSEHAT_CLIENT_ID || "SAMPLE_CLIENT_ID_KEMENKES";
    clientSecret = clientSecret?.trim() || process.env.SATUSEHAT_CLIENT_SECRET || "SAMPLE_CLIENT_SECRET_987654321";
    env = (process.env.SATUSEHAT_ENV as SatusehatEnvironment) || env;
    orgId = orgId?.trim() || process.env.SATUSEHAT_ORG_ID || "b15a7ae7-f366-4a84-8385-0b8196c05002";

    const result = await SatusehatClient.authenticate(
      {
        clientId,
        clientSecret,
        env,
        orgId,
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
