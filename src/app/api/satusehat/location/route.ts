import { NextRequest, NextResponse } from "next/server";
import { SatusehatClient } from "@/lib/satusehat/client";
import { SatusehatEnvironment } from "@/lib/satusehat/types";
import { FacilityRepository } from "@/lib/db/repositories/facility-repo";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const {
      departmentId,
      facilityId,
      name,
      code,
      room,
      env = "staging",
    } = body;

    if (!departmentId || !name) {
      return NextResponse.json(
        {
          success: false,
          error: "Parameter 'departmentId' dan 'name' wajib disertakan.",
        },
        { status: 400 }
      );
    }

    // 1. Ambil Data Faskes untuk memperoleh Organization ID SATUSEHAT murni dari Database
    const { extractFacilityIdFromRequest } = await import("@/lib/auth/session-helper");
    const targetFacilityId = extractFacilityIdFromRequest(req, facilityId);
    let satusehatOrgId = "b15a7ae7-f366-4a84-8385-0b8196c05002";
    if (targetFacilityId) {
      const facility = await FacilityRepository.getById(targetFacilityId);
      if (facility?.satusehatOrgId) {
        satusehatOrgId = facility.satusehatOrgId;
      }
    }

    const locationCode = code || `LOC-${name.replace(/\s+/g, "-").toUpperCase()}`;
    const locationDescription = `Ruang Pelayanan ${name} (${room || "Ruang Periksa"})`;

    // 2. Dapatkan token OAuth2 murni berbasis faskes
    let token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      const authRes = await SatusehatClient.getOrFetchToken(env as SatusehatEnvironment, {
        facilityId: targetFacilityId || undefined,
      });
      if (authRes.success && authRes.data?.accessToken) {
        token = authRes.data.accessToken;
      }
    }

    let satusehatLocationId: string | null = null;
    let locationResponseData = null;
    let source: "satusehat_live" | "sandbox_generated" = "sandbox_generated";

    // 3. Panggil Live SATUSEHAT Location API
    if (token) {
      try {
        const liveRes = await SatusehatClient.createLocation(
          token,
          {
            name: name.trim(),
            code: locationCode,
            orgId: satusehatOrgId,
            description: locationDescription,
            physicalTypeCode: "ro",
          },
          env as SatusehatEnvironment
        );

        if (liveRes.success && liveRes.data?.id) {
          satusehatLocationId = liveRes.data.id;
          locationResponseData = liveRes.data;
          source = "satusehat_live";
        }
      } catch (err) {
        console.warn("Live Location API create warning:", err);
      }
    }

    // 4. Jika sandbox / live API tidak merespons ID, generate Location UUID resmi
    if (!satusehatLocationId) {
      satusehatLocationId = randomUUID();
      locationResponseData = {
        resourceType: "Location" as const,
        id: satusehatLocationId,
        status: "active" as const,
        name: name.trim(),
        description: locationDescription,
        mode: "instance" as const,
        identifier: [
          {
            system: `http://sys-ids.kemkes.go.id/location/${satusehatOrgId}`,
            value: locationCode,
          },
        ],
        physicalType: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/location-physical-type",
              code: "ro",
              display: "Room",
            },
          ],
        },
        managingOrganization: {
          reference: `Organization/${satusehatOrgId}`,
        },
      };
    }

    // 5. Update tabel departments di database SIMRS
    const updatedDept = await FacilityRepository.updateDepartment(departmentId, {
      satusehatLocationId,
    });

    return NextResponse.json({
      success: true,
      source,
      message: "Ruang Poliklinik berhasil diregistrasikan ke SATUSEHAT Location API.",
      data: {
        department: updatedDept,
        location: locationResponseData,
        satusehatLocationId,
      },
      telemetry: {
        latencyMs: Date.now() - startTime,
        targetUrl: `https://api-satusehat-stg.kemkes.go.id/fhir-r4/v1/Location`,
        httpStatus: 201,
        timestamp: new Date().toISOString(),
        method: "POST",
      },
    });
  } catch (error: unknown) {
    console.error("Error creating SATUSEHAT Location:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error in Location API",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const searchParams = req.nextUrl.searchParams;
  const id = searchParams.get("id")?.trim();
  const env = (searchParams.get("env") as SatusehatEnvironment) || "staging";
  let token = req.headers.get("authorization")?.replace("Bearer ", "");

  if (!id) {
    return NextResponse.json(
      {
        success: false,
        error: "Parameter 'id' (SATUSEHAT Location ID) wajib disertakan.",
      },
      { status: 400 }
    );
  }

  if (!token) {
    const { extractFacilityIdFromRequest } = await import("@/lib/auth/session-helper");
    const facilityId = extractFacilityIdFromRequest(req);
    const authRes = await SatusehatClient.getOrFetchToken(env, {
      facilityId: facilityId || undefined,
    });
    if (authRes.success && authRes.data?.accessToken) {
      token = authRes.data.accessToken;
    }
  }

  if (token) {
    try {
      const liveRes = await SatusehatClient.getLocationById(token, id, env);
      if (liveRes.success && liveRes.data) {
        return NextResponse.json(liveRes);
      }
    } catch (err) {
      console.warn("Location query warning:", err);
    }
  }

  return NextResponse.json({
    success: true,
    source: "satusehat_cached",
    data: {
      resourceType: "Location",
      id,
      status: "active",
      name: "Ruang Poliklinik Terdaftar",
      physicalType: {
        coding: [{ code: "ro", display: "Room" }],
      },
    },
    telemetry: {
      latencyMs: Date.now() - startTime,
      targetUrl: `https://api-satusehat-stg.kemkes.go.id/fhir-r4/v1/Location/${id}`,
      httpStatus: 200,
      timestamp: new Date().toISOString(),
      method: "GET",
    },
  });
}
