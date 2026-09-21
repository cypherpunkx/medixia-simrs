import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function maskSecret(secret: string): string {
  if (!secret || secret.length <= 8) return "••••••••";
  return secret.slice(0, 4) + "••••••••" + secret.slice(-4);
}

/**
 * Menghitung umur pasien secara akurat berdasarkan tanggal lahir.
 * Mencegah hasil NaN dan mendukung format ISO (YYYY-MM-DD), format lokal (DD/MM/YYYY atau DD-MM-YYYY).
 */
export function calculatePatientAge(birthDate?: string | Date | null): number {
  if (!birthDate) return 0;
  try {
    let dateObj: Date;
    if (birthDate instanceof Date) {
      dateObj = birthDate;
    } else {
      const cleanStr = String(birthDate).trim();
      if (!cleanStr) return 0;
      // Mendukung format DD/MM/YYYY atau DD-MM-YYYY
      if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(cleanStr)) {
        const parts = cleanStr.split(/[/-]/);
        dateObj = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      } else {
        dateObj = new Date(cleanStr);
      }
    }
    if (isNaN(dateObj.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - dateObj.getFullYear();
    const m = today.getMonth() - dateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dateObj.getDate())) {
      age--;
    }
    return Math.max(0, isNaN(age) ? 0 : age);
  } catch {
    return 0;
  }
}
