import {
  AuthApiResponse,
  AuthSession,
  FhirLocation,
  FhirOrganization,
  FhirPractitioner,
  LocationApiResponse,
  OrgVerifyApiResponse,
  PractitionerApiResponse,
  SatusehatAuthCredentials,
  SatusehatEnvironment,
  SatusehatRawTokenResponse,
  TelemetryData,
} from "./types";
import {
  getSatusehatAuthUrl,
  getSatusehatFhirUrl,
  SATUSEHAT_CONFIG,
} from "./config";
import { maskSecret } from "../utils";

// Server-side In-memory Token Cache with globalThis persistence across hot-reloads
interface CachedToken {
  session: AuthSession;
  expiresAt: number;
}

const globalForSatusehat = globalThis as unknown as {
  satusehatTokenCache?: Map<string, CachedToken>;
  satusehatPendingAuth?: Map<string, Promise<AuthApiResponse>>;
};

const tokenCache =
  globalForSatusehat.satusehatTokenCache ?? new Map<string, CachedToken>();
const pendingAuthPromises =
  globalForSatusehat.satusehatPendingAuth ?? new Map<string, Promise<AuthApiResponse>>();

if (process.env.NODE_ENV !== "production") {
  globalForSatusehat.satusehatTokenCache = tokenCache;
  globalForSatusehat.satusehatPendingAuth = pendingAuthPromises;
}

function getCacheKey(env: string, clientId: string): string {
  return `${env}:${clientId}`;
}

export class SatusehatClient {
  /**
   * Mengambil token OAuth 2.0 SATUSEHAT berbasis faskes secara murni dari Database PostgreSQL.
   * Kredensial (Client ID, Client Secret, Org ID) TIDAK PERNAH membaca .env agar satu deployment/Docker
   * dapat melayani puluhan faskes/klinik berbeda secara independen dan terisolasi.
   */
  public static async getOrFetchToken(
    targetEnv?: SatusehatEnvironment,
    options: { forceRefresh?: boolean; facilityId?: string } = {}
  ): Promise<AuthApiResponse> {
    const { FacilityRepository } = await import("@/lib/db/repositories/facility-repo");

    let targetFacilityId = options.facilityId;

    // Jika facilityId tidak diberikan eksplisit, cari faskes aktif pertama di database
    if (!targetFacilityId) {
      try {
        const allFacilities = await FacilityRepository.getAll();
        if (allFacilities.length > 0) {
          targetFacilityId = allFacilities[0].id;
        }
      } catch (err) {
        console.error("[SatusehatClient] Gagal mencari faskes default di database:", err);
      }
    }

    if (!targetFacilityId) {
      return {
        success: false,
        error: {
          message: "ID Faskes (facilityId) wajib disertakan untuk otentikasi SATUSEHAT multi-tenant.",
          code: "FACILITY_ID_REQUIRED",
          suggestions: [
            "Pilih salah satu faskes terdaftar di konsol SIMRS.",
            "Pastikan parameter 'facilityId' disertakan pada request API.",
          ],
        },
      };
    }

    // Ambil kredensial terdekripsi AES-256 murni dari database faskes tersebut
    const creds = await FacilityRepository.getDecryptedCredentials(targetFacilityId);

    if (!creds || !creds.clientId || !creds.clientSecret) {
      return {
        success: false,
        error: {
          message: `Kredensial SATUSEHAT untuk faskes (${targetFacilityId}) belum dikonfigurasi di database.`,
          code: "FACILITY_CREDENTIALS_MISSING",
          suggestions: [
            "Buka menu Konsol Manajemen Faskes / Edit Faskes.",
            "Lengkapi Client ID dan Client Secret resmi SATUSEHAT Kemenkes untuk faskes ini.",
            "Sistem tidak menggunakan fallback .env server agar data antar-klinik tidak bercampur.",
          ],
        },
      };
    }

    const env: SatusehatEnvironment = targetEnv || creds.env || "staging";

    return this.authenticate(
      {
        clientId: creds.clientId,
        clientSecret: creds.clientSecret,
        env,
        orgId: creds.orgId,
      },
      options
    );
  }

  /**
   * Request OAuth 2.0 Access Token from SATUSEHAT Gateway
   */
  public static async authenticate(
    credentials: SatusehatAuthCredentials,
    options: { forceRefresh?: boolean } = {},
  ): Promise<AuthApiResponse> {
    const { clientId, clientSecret, env, orgId } = credentials;

    if (!clientId || !clientSecret) {
      return {
        success: false,
        error: {
          message: "Client ID dan Client Secret wajib diisi.",
          code: "MISSING_CREDENTIALS",
          suggestions: [
            "Periksa kembali Client ID dan Client Secret dari Portal Pengembang SATUSEHAT.",
            "Pastikan Anda telah mendaftarkan aplikasi di platform SATUSEHAT Kemenkes.",
          ],
        },
      };
    }

    if (env === "production") {
      const isPlaceholder =
        clientId.includes("SAMPLE_") ||
        clientId.includes("your_client_id") ||
        clientSecret.includes("SAMPLE_") ||
        clientSecret.includes("your_client_secret");

      if (isPlaceholder) {
        return {
          success: false,
          error: {
            message:
              "Mode Live Production SATUSEHAT aktif, namun kredensial resmi Kemenkes belum dikonfigurasi.",
            code: "PRODUCTION_CREDENTIALS_REQUIRED",
            suggestions: [
              "Buka Portal SATUSEHAT Kemenkes (https://satusehat.kemkes.go.id/platform).",
              "Salin Client ID, Client Secret, dan Organization ID resmi faskes Anda.",
              "Masukkan nilai tersebut ke dalam environment file (.env.local atau environment hosting produksi).",
            ],
          },
        };
      }
    }

    const cacheKey = getCacheKey(env, clientId);
    const now = Date.now();

    // Check token cache if not forcing refresh
    if (!options.forceRefresh && tokenCache.has(cacheKey)) {
      const cached = tokenCache.get(cacheKey)!;
      const remainingSeconds = Math.floor((cached.expiresAt - now) / 1000);

      // Return cached token if still valid beyond buffer
      if (remainingSeconds > SATUSEHAT_CONFIG.tokenBufferSeconds) {
        return {
          success: true,
          data: {
            ...cached.session,
            expiresIn: remainingSeconds,
          },
          telemetry: {
            latencyMs: 0,
            targetUrl: getSatusehatAuthUrl(env),
            timestamp: new Date().toISOString(),
            httpStatus: 200,
            method: "CACHE_HIT",
          },
        };
      }
    }

    // 2. Request Coalescing (Thundering Herd Protection):
    // Jika sedang ada request token yang terbang untuk key yang sama, tunggu promise yang sama
    // Mencegah tembakan paralel ke Kemenkes yang memicu HTTP 429 Too Many Requests
    if (!options.forceRefresh && pendingAuthPromises.has(cacheKey)) {
      return pendingAuthPromises.get(cacheKey)!;
    }

    const targetUrl = getSatusehatAuthUrl(env);
    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        SATUSEHAT_CONFIG.timeoutMs,
      );

      // SATUSEHAT requires application/x-www-form-urlencoded
      const formData = new URLSearchParams();
      formData.append("client_id", clientId.trim());
      formData.append("client_secret", clientSecret.trim());

      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - startTime);

      const rawJson = (await response.json().catch(() => null)) as
        | SatusehatRawTokenResponse
        | Record<string, unknown>
        | null;

      const telemetry: TelemetryData = {
        latencyMs,
        targetUrl,
        timestamp: new Date().toISOString(),
        httpStatus: response.status,
        method: "POST",
      };

      // Fallback cerdas untuk HTTP 429: Jika Kemenkes melempar 429 (Rate Limit) dan kita memiliki token cache yang masih belum expired
      if (response.status === 429 && tokenCache.has(cacheKey)) {
        const cached = tokenCache.get(cacheKey)!;
        const remainingSeconds = Math.floor((cached.expiresAt - now) / 1000);
        if (remainingSeconds > 0) {
          console.warn(
            `[SatusehatClient] HTTP 429 Rate Limit dari Kemenkes. Menggunakan token cache yang masih berlaku (${remainingSeconds} detik).`
          );
          return {
            success: true,
            data: {
              ...cached.session,
              expiresIn: remainingSeconds,
            },
            telemetry: {
              ...telemetry,
              httpStatus: 200,
              method: "CACHE_FALLBACK_ON_429",
            },
          };
        }
      }

      if (!response.ok || !rawJson || !("access_token" in rawJson)) {
        const errorDetail = rawJson || {};
        const suggestions: string[] = [];

        if (response.status === 400 || response.status === 401) {
          suggestions.push(
            "Periksa kembali apakah Client ID & Client Secret sesuai dengan environment yang dipilih (Staging vs Production).",
            "Pastikan tidak ada spasi tambahan di awal/akhir Client ID atau Client Secret.",
          );
        } else if (response.status === 403) {
          suggestions.push(
            "Akses ditolak (Forbidden). Pastikan akun SATUSEHAT Anda memiliki izin akses API OAuth.",
            "Periksa apakah terdapat IP Whitelist yang dikonfigurasi pada portal SATUSEHAT.",
          );
        } else if (response.status === 429) {
          suggestions.push(
            "Permintaan token terlalu sering (Rate Limited oleh Kemenkes). Sistem otomatis menggunakan cache lokal.",
            "Tunggu beberapa saat sebelum melakukan refresh token.",
          );
        } else if (response.status >= 500) {
          suggestions.push(
            "Server SATUSEHAT Kemenkes sedang mengalami kendala internal atau maintenance.",
            "Coba kembali beberapa saat lagi atau cek status portal SATUSEHAT.",
          );
        }

        return {
          success: false,
          error: {
            message:
              (errorDetail as { message?: string; error_description?: string })
                ?.message ||
              (errorDetail as { message?: string; error_description?: string })
                ?.error_description ||
              `Autentikasi gagal dengan status HTTP ${response.status}`,
            code: `HTTP_${response.status}`,
            detail: errorDetail,
            suggestions,
          },
          telemetry,
        };
      }

      // Success
      const rawToken = rawJson as SatusehatRawTokenResponse;
      const expiresInSec =
        typeof rawToken.expires_in === "number"
          ? rawToken.expires_in
          : parseInt(rawToken.expires_in, 10) || 1800;

      const expiresAt = now + expiresInSec * 1000;

      const session: AuthSession = {
        accessToken: rawToken.access_token,
        tokenType: rawToken.token_type || "Bearer",
        expiresAt,
        expiresIn: expiresInSec,
        issuedAt: now,
        env,
        orgId: orgId?.trim(),
        clientIdMasked: maskSecret(clientId),
        rawResponse: rawToken,
      };

      // Save to memory cache
      tokenCache.set(cacheKey, { session, expiresAt });

      return {
        success: true,
        data: session,
        telemetry,
      };
    } catch (err: unknown) {
      const latencyMs = Math.round(performance.now() - startTime);
      const isAbort =
        err instanceof Error &&
        (err.name === "AbortError" || err.message.includes("abort"));

      return {
        success: false,
        error: {
          message: isAbort
            ? "Koneksi ke SATUSEHAT Timeout (melebihi 15 detik)."
            : err instanceof Error
              ? err.message
              : "Terjadi kesalahan jaringan yang tidak diketahui.",
          code: isAbort ? "TIMEOUT" : "NETWORK_ERROR",
          suggestions: [
            "Pastikan server memiliki koneksi internet aktif.",
            "Periksa apakah firewall atau DNS memblokir domain SATUSEHAT Kemenkes.",
          ],
        },
        telemetry: {
          latencyMs,
          targetUrl,
          timestamp: new Date().toISOString(),
          httpStatus: 0,
          method: "POST",
        },
      };
    }
  }

  /**
   * Verify and retrieve Organization FHIR resource using Bearer Token
   */
  public static async verifyOrganization(
    token: string,
    orgId: string,
    env: SatusehatEnvironment,
  ): Promise<OrgVerifyApiResponse> {
    if (!token) {
      return {
        success: false,
        error: {
          message: "Access Token diperlukan untuk verifikasi organisasi.",
        },
      };
    }

    if (!orgId) {
      return {
        success: false,
        error: {
          message: "ID Organisasi Rumah Sakit/Faskes wajib diisi.",
        },
      };
    }

    const baseFhirUrl = getSatusehatFhirUrl(env);
    const targetUrl = `${baseFhirUrl}/Organization/${orgId.trim()}`;
    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        SATUSEHAT_CONFIG.timeoutMs,
      );

      const response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - startTime);
      const telemetry: TelemetryData = {
        latencyMs,
        targetUrl,
        timestamp: new Date().toISOString(),
        httpStatus: response.status,
        method: "GET",
      };

      const result = await response.json().catch(() => null);

      if (!response.ok || !result || result.resourceType !== "Organization") {
        return {
          success: false,
          error: {
            message:
              result?.issue?.[0]?.diagnostics ||
              result?.message ||
              `Gagal mengambil data Organisasi (${response.status})`,
            status: response.status,
            detail: result,
          },
          telemetry,
        };
      }

      return {
        success: true,
        data: result as FhirOrganization,
        telemetry,
      };
    } catch (err: unknown) {
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        success: false,
        error: {
          message:
            err instanceof Error
              ? err.message
              : "Gagal memverifikasi Organisasi",
        },
        telemetry: {
          latencyMs,
          targetUrl,
          timestamp: new Date().toISOString(),
          httpStatus: 0,
          method: "GET",
        },
      };
    }
  }

  /**
   * Cari Practitioner Tenaga Kesehatan di SATUSEHAT/SISDMK berdasarkan NIK KTP
   * GET /Practitioner?identifier=https://fhir.kemkes.go.id/id/nik|{nik}
   */
  public static async getPractitionerByNik(
    token: string,
    nik: string,
    env: SatusehatEnvironment = "staging"
  ): Promise<PractitionerApiResponse> {
    if (!token) {
      return {
        success: false,
        error: { message: "Access Token diperlukan untuk verifikasi nakes." },
      };
    }

    const cleanNik = nik.trim();
    if (!cleanNik || cleanNik.length !== 16) {
      return {
        success: false,
        error: { message: "NIK Tenaga Kesehatan harus 16 digit." },
      };
    }

    const baseFhirUrl = getSatusehatFhirUrl(env);
    const targetUrl = `${baseFhirUrl}/Practitioner?identifier=https://fhir.kemkes.go.id/id/nik|${cleanNik}`;
    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SATUSEHAT_CONFIG.timeoutMs);

      const response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - startTime);
      const telemetry: TelemetryData = {
        latencyMs,
        targetUrl,
        timestamp: new Date().toISOString(),
        httpStatus: response.status,
        method: "GET",
      };

      const result = await response.json().catch(() => null);

      if (response.ok && result?.entry?.length > 0) {
        const practitioner = result.entry[0].resource as FhirPractitioner;
        const nameText =
          practitioner.name?.[0]?.text ||
          `${practitioner.name?.[0]?.prefix?.join(" ") || ""} ${practitioner.name?.[0]?.given?.join(" ") || ""} ${practitioner.name?.[0]?.family || ""}`.trim();

        // Extract SIP / STR if available
        let sipNumber: string | undefined;
        let strNumber: string | undefined;

        if (practitioner.qualification && practitioner.qualification.length > 0) {
          for (const q of practitioner.qualification) {
            const system = q.identifier?.[0]?.system || "";
            const val = q.identifier?.[0]?.value || "";
            if (system.includes("sip") || q.code?.text?.toLowerCase().includes("sip")) {
              sipNumber = val;
            } else if (system.includes("str") || q.code?.text?.toLowerCase().includes("str")) {
              strNumber = val;
            }
          }
        }

        return {
          success: true,
          source: "satusehat_live",
          data: {
            id: practitioner.id,
            nik: cleanNik,
            name: nameText || "dr. Tenaga Medis Terdaftar",
            gender: practitioner.gender,
            birthDate: practitioner.birthDate,
            sip: sipNumber,
            str: strNumber,
          },
          telemetry,
        };
      }

      return {
        success: false,
        error: {
          message: result?.issue?.[0]?.diagnostics || "Tenaga Kesehatan tidak ditemukan di basis data SATUSEHAT / SISDMK.",
          status: response.status,
          detail: result,
        },
        telemetry,
      };
    } catch (err: unknown) {
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        success: false,
        error: {
          message: err instanceof Error ? err.message : "Gagal menghubungi layanan Practitioner SATUSEHAT.",
        },
        telemetry: {
          latencyMs,
          targetUrl,
          timestamp: new Date().toISOString(),
          httpStatus: 0,
          method: "GET",
        },
      };
    }
  }

  /**
   * Ambil data Practitioner Tenaga Kesehatan di SATUSEHAT berdasarkan IHS Practitioner ID
   * GET /Practitioner/{id}
   */
  public static async getPractitionerById(
    token: string,
    id: string,
    env: SatusehatEnvironment = "staging"
  ): Promise<PractitionerApiResponse> {
    if (!token) {
      return {
        success: false,
        error: { message: "Access Token diperlukan untuk verifikasi nakes." },
      };
    }

    const cleanId = id.trim();
    const baseFhirUrl = getSatusehatFhirUrl(env);
    const targetUrl = `${baseFhirUrl}/Practitioner/${cleanId}`;
    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SATUSEHAT_CONFIG.timeoutMs);

      const response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - startTime);
      const telemetry: TelemetryData = {
        latencyMs,
        targetUrl,
        timestamp: new Date().toISOString(),
        httpStatus: response.status,
        method: "GET",
      };

      const result = await response.json().catch(() => null);

      if (response.ok && result?.resourceType === "Practitioner") {
        const practitioner = result as FhirPractitioner;
        const nameText =
          practitioner.name?.[0]?.text ||
          `${practitioner.name?.[0]?.prefix?.join(" ") || ""} ${practitioner.name?.[0]?.given?.join(" ") || ""} ${practitioner.name?.[0]?.family || ""}`.trim();

        const nikId = practitioner.identifier?.find((i) => i.system?.includes("nik"))?.value || "";

        return {
          success: true,
          source: "satusehat_live",
          data: {
            id: practitioner.id,
            nik: nikId,
            name: nameText || "dr. Tenaga Medis Terdaftar",
            gender: practitioner.gender,
            birthDate: practitioner.birthDate,
          },
          telemetry,
        };
      }

      return {
        success: false,
        error: {
          message: result?.issue?.[0]?.diagnostics || "ID IHS Practitioner tidak ditemukan di SATUSEHAT.",
          status: response.status,
          detail: result,
        },
        telemetry,
      };
    } catch (err: unknown) {
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        success: false,
        error: {
          message: err instanceof Error ? err.message : "Gagal menghubungi layanan Practitioner SATUSEHAT.",
        },
        telemetry: {
          latencyMs,
          targetUrl,
          timestamp: new Date().toISOString(),
          httpStatus: 0,
          method: "GET",
        },
      };
    }
  }

  /**
   * Registrasi Ruang Fisik / Poliklinik / Kamar ke SATUSEHAT (Location API)
   * POST /Location
   */
  public static async createLocation(
    token: string,
    locationData: {
      name: string;
      code: string;
      orgId: string;
      description?: string;
      physicalTypeCode?: "ro" | "bu" | "wi" | "ve" | "ho"; // default: 'ro' (Room)
    },
    env: SatusehatEnvironment = "staging"
  ): Promise<LocationApiResponse> {
    if (!token) {
      return {
        success: false,
        error: { message: "Access Token diperlukan untuk mendaftarkan Location." },
      };
    }

    const { name, code, orgId, description, physicalTypeCode = "ro" } = locationData;
    const baseFhirUrl = getSatusehatFhirUrl(env);
    const targetUrl = `${baseFhirUrl}/Location`;
    const startTime = performance.now();

    const payload: FhirLocation = {
      resourceType: "Location",
      status: "active",
      name: name.trim(),
      description: description?.trim() || `Ruang Pelayanan ${name.trim()} - Faskes ID ${orgId}`,
      mode: "instance",
      identifier: [
        {
          system: `http://sys-ids.kemkes.go.id/location/${orgId}`,
          value: code.trim(),
        },
      ],
      physicalType: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/location-physical-type",
            code: physicalTypeCode,
            display: physicalTypeCode === "ro" ? "Room" : physicalTypeCode === "bu" ? "Building" : "Wing",
          },
        ],
      },
      managingOrganization: {
        reference: `Organization/${orgId}`,
      },
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SATUSEHAT_CONFIG.timeoutMs);

      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - startTime);
      const telemetry: TelemetryData = {
        latencyMs,
        targetUrl,
        timestamp: new Date().toISOString(),
        httpStatus: response.status,
        method: "POST",
      };

      const result = await response.json().catch(() => null);

      if ((response.ok || response.status === 201) && result?.resourceType === "Location") {
        return {
          success: true,
          data: result as FhirLocation,
          telemetry,
        };
      }

      return {
        success: false,
        error: {
          message:
            result?.issue?.[0]?.diagnostics ||
            result?.message ||
            `Gagal mendaftarkan Location ke SATUSEHAT (${response.status})`,
          status: response.status,
          detail: result,
        },
        telemetry,
      };
    } catch (err: unknown) {
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        success: false,
        error: {
          message: err instanceof Error ? err.message : "Gagal menghubungkan ke Location API SATUSEHAT.",
        },
        telemetry: {
          latencyMs,
          targetUrl,
          timestamp: new Date().toISOString(),
          httpStatus: 0,
          method: "POST",
        },
      };
    }
  }

  /**
   * Verifikasi atau Ambil Data Ruang / Poliklinik dari SATUSEHAT
   * GET /Location/{id}
   */
  public static async getLocationById(
    token: string,
    locationId: string,
    env: SatusehatEnvironment = "staging"
  ): Promise<LocationApiResponse> {
    if (!token) {
      return {
        success: false,
        error: { message: "Access Token diperlukan untuk mengambil data Location." },
      };
    }

    const baseFhirUrl = getSatusehatFhirUrl(env);
    const targetUrl = `${baseFhirUrl}/Location/${locationId.trim()}`;
    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SATUSEHAT_CONFIG.timeoutMs);

      const response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - startTime);
      const telemetry: TelemetryData = {
        latencyMs,
        targetUrl,
        timestamp: new Date().toISOString(),
        httpStatus: response.status,
        method: "GET",
      };

      const result = await response.json().catch(() => null);

      if (response.ok && result?.resourceType === "Location") {
        return {
          success: true,
          data: result as FhirLocation,
          telemetry,
        };
      }

      return {
        success: false,
        error: {
          message: result?.issue?.[0]?.diagnostics || `Data Location ID ${locationId} tidak ditemukan.`,
          status: response.status,
          detail: result,
        },
        telemetry,
      };
    } catch (err: unknown) {
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        success: false,
        error: {
          message: err instanceof Error ? err.message : "Gagal mengambil data Location.",
        },
        telemetry: {
          latencyMs,
          targetUrl,
          timestamp: new Date().toISOString(),
          httpStatus: 0,
          method: "GET",
        },
      };
    }
  }

  /**
   * Ping SATUSEHAT Gateway to measure server latency and check reachability
   */
  public static async pingGateway(env: SatusehatEnvironment): Promise<{
    reachable: boolean;
    latencyMs: number;
    url: string;
  }> {
    const url =
      env === "production"
        ? SATUSEHAT_CONFIG.endpoints.production.auth
        : SATUSEHAT_CONFIG.endpoints.staging.auth;

    const start = performance.now();
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(id);

      const latencyMs = Math.round(performance.now() - start);
      return {
        reachable: res !== null,
        latencyMs,
        url,
      };
    } catch {
      return {
        reachable: false,
        latencyMs: Math.round(performance.now() - start),
        url,
      };
    }
  }
}
