import { NextRequest, NextResponse } from "next/server";
import { SatusehatClient } from "@/lib/satusehat/client";
import { SatusehatEnvironment } from "@/lib/satusehat/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, orgId, env = "staging" } = body;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Access Token (Bearer) diperlukan untuk memeriksa data Organisasi.",
          },
        },
        { status: 400 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "ID Organisasi Faskes/Rumah Sakit wajib diisi.",
          },
        },
        { status: 400 }
      );
    }

    const result = await SatusehatClient.verifyOrganization(
      token,
      orgId,
      env as SatusehatEnvironment
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
              : "Internal server error during Organization verification",
        },
      },
      { status: 500 }
    );
  }
}
