import {
  AuthApiResponse,
  AuthSession,
  FhirOrganization,
  OrgVerifyApiResponse,
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

// Server-side In-memory Token Cache
interface CachedToken {
  session: AuthSession;
  expiresAt: number;
}

const tokenCache = new Map<string, CachedToken>();

function getCacheKey(env: string, clientId: string): string {
  return `${env}:${clientId}`;
}

export class SatusehatClient {
  /**
   * Automatically resolve or fetch OAuth token from server environment variables / cache
   */
  public static async getOrFetchToken(
    targetEnv?: SatusehatEnvironment,
    options: { forceRefresh?: boolean } = {}
  ): Promise<AuthApiResponse> {
    const env: SatusehatEnvironment =
      targetEnv || (process.env.SATUSEHAT_ENV as SatusehatEnvironment) || "staging";
    const clientId = process.env.SATUSEHAT_CLIENT_ID || "SAMPLE_CLIENT_ID_KEMENKES";
    const clientSecret = process.env.SATUSEHAT_CLIENT_SECRET || "SAMPLE_CLIENT_SECRET_987654321";
    const orgId = process.env.SATUSEHAT_ORG_ID || "b15a7ae7-f366-4a84-8385-0b8196c05002";

    return this.authenticate(
      {
        clientId,
        clientSecret,
        env,
        orgId,
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
