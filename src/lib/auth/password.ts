import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hash kata sandi pengguna menggunakan algoritma bcrypt (salt rounds: 10)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
}

/**
 * Verifikasi kecocokan kata sandi dengan hash bcrypt
 * Mendukung deteksi format hash bcrypt ($2a$, $2b$, $2y$)
 */
export async function verifyPassword(
  plainTextPassword: string,
  storedHash: string
): Promise<boolean> {
  if (!plainTextPassword || !storedHash) {
    return false;
  }

  // Jika hash tersimpan adalah format bcrypt yang sah
  const isBcryptHash =
    storedHash.startsWith("$2a$") ||
    storedHash.startsWith("$2b$") ||
    storedHash.startsWith("$2y$");

  if (isBcryptHash) {
    try {
      return await bcrypt.compare(plainTextPassword, storedHash);
    } catch {
      return false;
    }
  }

  // Fallback aman untuk transisi database lokal bila terdapat data legacy yang belum di-hash
  return plainTextPassword === storedHash;
}
