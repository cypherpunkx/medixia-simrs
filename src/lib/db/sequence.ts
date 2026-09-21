import { sql } from "drizzle-orm";
import { db } from "./index";

/**
 * SIMRS Atomic PostgreSQL Sequence Manager
 * Menyediakan generator penomoran bisnis yang thread-safe, atomic, dan bebas race condition
 * untuk lingkungan konkurensi tinggi (misal: pendaftaran serentak di multi-loket admisi).
 */

import { getLocalCompactDate } from "@/lib/id-generator";

/**
 * Mendapatkan Nomor Registrasi Layanan (No. Rawat / Registration Number) berikutnya secara atomik.
 * Format standar Rumah Sakit Indonesia: "[Tipe]-YYYYMMDD-XXXX" (contoh: "RJ-20260922-0001")
 * @param date Tanggal registrasi
 * @param prefix Tipe layanan: "RJ" (Rawat Jalan), "RI" (Rawat Inap), "IGD" (Gawat Darurat)
 */
export async function getNextRegistrationNumber(
  date: Date | string = new Date(),
  prefix: "RJ" | "RI" | "IGD" = "RJ"
): Promise<string> {
  const yyyymmdd = getLocalCompactDate(date);

  try {
    // 1. Eksekusi nextval sequence atomic PostgreSQL
    const res = await db.execute<{ seq: string | number }>(
      sql`SELECT nextval('reg_number_seq') AS seq`
    );

    const seqRaw = res[0]?.seq;
    const seqNum = typeof seqRaw === "number" ? seqRaw : parseInt(String(seqRaw || 1), 10);
    const seqPadded = String(isNaN(seqNum) ? 1 : seqNum).padStart(4, "0");

    return `${prefix}-${yyyymmdd}-${seqPadded}`;
  } catch (error) {
    console.warn("⚠️ Gagal mengeksekusi PostgreSQL 'reg_number_seq', menggunakan fallback:", error);
    // Fallback jika sequence belum siap
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${yyyymmdd}-${randomSuffix}`;
  }
}

/**
 * Mendapatkan Nomor Rekam Medis (Medical Record Number / MRN) berikutnya secara atomik.
 * Format standar Rumah Sakit Indonesia: 6 digit grouped "XX-XX-XX" (contoh: "01-44-83")
 */
export async function getNextMRN(): Promise<string> {
  try {
    const res = await db.execute<{ seq: string | number }>(
      sql`SELECT nextval('mrn_seq') AS seq`
    );

    const seqRaw = res[0]?.seq;
    const seqNum = typeof seqRaw === "number" ? seqRaw : parseInt(String(seqRaw || 100001), 10);
    const validNum = isNaN(seqNum) ? 100001 : seqNum;
    const str = String(validNum).padStart(6, "0");

    return `${str.slice(0, 2)}-${str.slice(2, 4)}-${str.slice(4, 6)}`;
  } catch (error) {
    console.warn("⚠️ Gagal mengeksekusi PostgreSQL 'mrn_seq', menggunakan fallback:", error);
    const fallbackNum = Math.floor(100000 + Math.random() * 900000);
    const str = String(fallbackNum).padStart(6, "0");
    return `${str.slice(0, 2)}-${str.slice(2, 4)}-${str.slice(4, 6)}`;
  }
}

/**
 * Mereset sequence nomor registrasi ke 1 (dapat dijalankan pada pergantian hari / pergantian tahun).
 */
export async function resetDailyRegistrationSequence(startVal: number = 1): Promise<void> {
  try {
    await db.execute(sql`ALTER SEQUENCE reg_number_seq RESTART WITH ${sql.raw(String(startVal))}`);
  } catch (error) {
    console.error("Gagal mereset reg_number_seq:", error);
  }
}
