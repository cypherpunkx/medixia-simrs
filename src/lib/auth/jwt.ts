import crypto from "crypto";

export interface SessionPayload {
  userId: string;
  facilityId?: string;
  role?: string;
  username?: string;
  iat?: number;
  exp?: number;
}

const JWT_SECRET =
  process.env.SESSION_SECRET ||
  "medixia_simrs_enterprise_jwt_secret_key_prod_2026_fhir_satusehat";

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString();
}

/**
 * Menandatangani payload sesi menjadi token JWT (HMAC-SHA256)
 * Masa berlaku default: 7 hari
 */
export function signSessionToken(
  payload: Omit<SessionPayload, "iat" | "exp">,
  expiresInSeconds = 60 * 60 * 24 * 7
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const fullPayload: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Memverifikasi keabsahan tanda tangan dan masa berlaku token JWT sesi
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, signature] = parts;

  // 1. Verifikasi tanda tangan kriptografis HMAC-SHA256
  const expectedSignature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  // Constant-time comparison untuk mencegah timing attacks
  const sigBuffer = Buffer.from(signature);
  const expBuffer = Buffer.from(expectedSignature);
  if (
    sigBuffer.length !== expBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expBuffer)
  ) {
    return null;
  }

  // 2. Decode payload dan periksa expiry
  try {
    const payloadStr = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(payloadStr) as SessionPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Token telah kedaluwarsa
    }

    return payload;
  } catch {
    return null;
  }
}
