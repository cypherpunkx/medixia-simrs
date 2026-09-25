import crypto from "crypto";

// Standar Enkripsi Kriptografi Kemenkes & Industri Finansial/Kesehatan: AES-256-GCM
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128-bit initialization vector
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

/**
 * Mengambil daftar calon kunci enkripsi (kunci aktif saat ini + fallback historis)
 */
function getEncryptionCandidateKeys(): Buffer[] {
  const candidates: string[] = [];

  if (process.env.APP_ENCRYPTION_KEY && process.env.APP_ENCRYPTION_KEY.trim()) {
    candidates.push(process.env.APP_ENCRYPTION_KEY.trim());
  }
  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.trim()) {
    candidates.push(process.env.NEXTAUTH_SECRET.trim());
  }

  // Kunci master historis / seeder bawaan
  candidates.push("medixia-simrs-master-encryption-key-2026-secret-secure-32b");
  candidates.push("medixia-simrs-local-development-encryption-key-32b");

  // Hapus duplikasi dan ubah menjadi SHA-256 Buffer (32 bytes)
  const uniqueKeys = Array.from(new Set(candidates));
  return uniqueKeys.map((k) => crypto.createHash("sha256").update(k).digest());
}

/**
 * Mengambil master key enkripsi utama untuk mengenkripsi data baru
 */
function getPrimaryEncryptionKey(): Buffer {
  const masterKey =
    process.env.APP_ENCRYPTION_KEY ||
    process.env.NEXTAUTH_SECRET ||
    "medixia-simrs-master-encryption-key-2026-secret-secure-32b";

  return crypto.createHash("sha256").update(masterKey).digest();
}

/**
 * Enkripsi string sensitif (misal SATUSEHAT Client Secret) menggunakan AES-256-GCM
 * Format hasil: iv_hex:authTag_hex:encrypted_hex
 */
export function encryptSecret(plainText: string): string {
  if (!plainText || plainText.trim().length === 0) return "";

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getPrimaryEncryptionKey(), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Dekripsi string yang telah dienkripsi dengan AES-256-GCM.
 * Mendukung rotasi kunci dengan mencoba calon kunci yang valid.
 */
export function decryptSecret(encryptedPayload: string): string {
  if (!encryptedPayload || encryptedPayload.trim().length === 0) return "";

  const parts = encryptedPayload.split(":");
  if (parts.length !== 3) {
    // Jika data legacy belum terenkripsi, kembalikan apa adanya
    return encryptedPayload;
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  let iv: Buffer;
  let authTag: Buffer;

  try {
    iv = Buffer.from(ivHex, "hex");
    authTag = Buffer.from(authTagHex, "hex");
  } catch {
    return "";
  }

  const candidateKeys = getEncryptionCandidateKeys();

  for (const key of candidateKeys) {
    try {
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH,
      });
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedHex, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch {
      // Coba calon kunci berikutnya
      continue;
    }
  }

  // Jika semua kunci gagal didekripsi
  return "";
}

/**
 * Menyamarkan string rahasia untuk preview di UI (misal: sec_••••••••1234)
 */
export function maskClientSecret(secret: string): string {
  if (!secret) return "-";
  if (secret.length <= 8) return "••••••••";
  return `${secret.slice(0, 4)}••••••••${secret.slice(-4)}`;
}
