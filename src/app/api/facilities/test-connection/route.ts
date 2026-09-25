import { NextRequest, NextResponse } from "next/server";
import { SatusehatClient } from "@/lib/satusehat/client";
import { FacilityRepository } from "@/lib/db/repositories/facility-repo";
import { SatusehatEnvironment } from "@/lib/satusehat/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { facilityId, clientId, clientSecret, env, orgId } = body;

    let targetClientId = clientId;
    let targetClientSecret = clientSecret;
    let targetEnv: SatusehatEnvironment = env || "staging";
    let targetOrgId = orgId || "b15a7ae7-f366-4a84-8385-0b8196c05002";

    // 1. Jika diberikan facilityId, muat kredensial tersimpan dan didekripsi dari database
    if (facilityId) {
      const creds = await FacilityRepository.getDecryptedCredentials(facilityId);
      if (!creds || !creds.clientId || !creds.clientSecret) {
        return NextResponse.json(
          {
            success: false,
            error: "Faskes ini belum memiliki Client ID atau Client Secret SATUSEHAT tersimpan.",
          },
          { status: 400 }
        );
      }
      targetClientId = creds.clientId;
      targetClientSecret = creds.clientSecret;
      targetEnv = creds.env;
      targetOrgId = creds.orgId;
    }

    if (!targetClientId || !targetClientSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "Client ID dan Client Secret wajib diisi untuk pengujian koneksi.",
        },
        { status: 400 }
      );
    }

    // 2. Lakukan live handshake & token request ke SATUSEHAT Kemenkes Gateway
    const authResult = await SatusehatClient.authenticate(
      {
        clientId: targetClientId,
        clientSecret: targetClientSecret,
        env: targetEnv,
        orgId: targetOrgId,
      },
      { forceRefresh: true }
    );

    // 3. Jika facilityId ada, simpan status pengujian ke database
    if (facilityId) {
      await FacilityRepository.updateSatusehatStatus(
        facilityId,
        authResult.success ? "connected" : "error"
      );
    }

    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error?.message || "Gagal terhubung ke SATUSEHAT Kemenkes.",
          code: authResult.error?.code,
          suggestions: authResult.error?.suggestions,
          telemetry: authResult.telemetry,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message: "Koneksi ke SATUSEHAT Kemenkes berhasil!",
        tokenExpiresIn: authResult.data?.expiresIn,
        tokenType: authResult.data?.tokenType,
        environment: targetEnv,
        organizationId: targetOrgId,
        telemetry: authResult.telemetry,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kesalahan internal saat menguji koneksi SATUSEHAT.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
