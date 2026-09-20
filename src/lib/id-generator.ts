/**
 * SIMRS & SATUSEHAT Standard Identifier Generator
 * Implements:
 * 1. UUID v7 (RFC 9562) - Time-ordered high-performance UUID
 * 2. Prefixed TypeID (e.g. fac_..., usr_..., enc_...) - Monotonic entity-scoped IDs
 * 3. Clinical & Business Codes (MRN, Queue Number, Encounter Code, Rx Code)
 */

export type EntityPrefix =
  | "fac_"
  | "dept_"
  | "usr_"
  | "pat_"
  | "enc_"
  | "q_"
  | "vit_"
  | "diag_"
  | "proc_"
  | "rx_"
  | "ord_"
  | "lab_"
  | "rad_"
  | "sync_"
  | "add_"
  | "obx_";

/**
 * Generates an RFC 9562 compliant UUID v7 (Time-Ordered Monotonic UUID)
 */
export function generateUUIDv7(): string {
  const now = Date.now();

  // 1. Get 16 random bytes
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Fallback if crypto is unavailable
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // 2. Timestamp (48 bits = 6 bytes)
  bytes[0] = Math.floor(now / 0x10000000000) & 0xff;
  bytes[1] = Math.floor(now / 0x100000000) & 0xff;
  bytes[2] = Math.floor(now / 0x1000000) & 0xff;
  bytes[3] = Math.floor(now / 0x10000) & 0xff;
  bytes[4] = Math.floor(now / 0x100) & 0xff;
  bytes[5] = now & 0xff;

  // 3. Set Version to 7 (bits 4-7 of byte 6 = 0111)
  bytes[6] = (bytes[6] & 0x0f) | 0x70;

  // 4. Set Variant to 2 (bits 6-7 of byte 8 = 10)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  // 5. Convert to standard UUID hex string
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Generates an entity-scoped Prefixed Time-Ordered ID
 * Example: generatePrefixedId("enc_") -> "enc_0191eb45-8f0a-7abc-9def-1234567890ab"
 */
export function generatePrefixedId(prefix: EntityPrefix): string {
  return `${prefix}${generateUUIDv7()}`;
}

/**
 * Generates a human-readable Medical Record Number (MRN)
 * Format: 6-digit grouped (e.g. "01-44-82")
 */
export function generateMRN(seqNumber?: number): string {
  const num = seqNumber !== undefined ? seqNumber : Math.floor(100000 + Math.random() * 900000);
  const str = String(num).padStart(6, "0");
  return `${str.slice(0, 2)}-${str.slice(2, 4)}-${str.slice(4, 6)}`;
}

/**
 * Generates a human-readable Encounter Document Code for printouts & barcodes
 * Format: "ENC-YYYYMMDD-XXXX" (e.g. "ENC-20260913-0001")
 */
export function generateEncounterCode(date?: Date | string, sequence: number = 1): string {
  const d = date ? new Date(date) : new Date();
  const yyyymmdd = d.toISOString().split("T")[0].replace(/-/g, "");
  const seqStr = String(sequence).padStart(4, "0");
  return `ENC-${yyyymmdd}-${seqStr}`;
}

/**
 * Generates a standard Hospital Outpatient Registration Number (No. Registrasi / No. Rawat)
 * Format: "RJ-YYYYMMDD-XXXX" (e.g. "RJ-20260913-0001")
 */
export function generateRegistrationNumber(
  date?: Date | string,
  sequence: number = 1,
  prefix: "RJ" | "RI" | "IGD" = "RJ"
): string {
  const d = date ? new Date(date) : new Date();
  const yyyymmdd = d.toISOString().split("T")[0].replace(/-/g, "");
  const seqStr = String(sequence).padStart(4, "0");
  return `${prefix}-${yyyymmdd}-${seqStr}`;
}

/**
 * Generates a clinic queue display number
 * Format: "[Poli Code]-[3 digit number]" (e.g. "A-001", "B-012")
 */
export function generateQueueNumber(department: string, sequence: number = 1): string {
  const prefixMap: Record<string, string> = {
    "Poli Penyakit Dalam": "A",
    "Poli Umum": "B",
    "Poli Anak (Pediatri)": "C",
    "Poli Gigi & Mulut": "D",
    "Poli Jantung & Pembuluh Darah": "E",
    "Poli Mata": "F",
    "Poli KIA / KB": "G",
  };

  const prefix = prefixMap[department] || "A";
  const seqStr = String(sequence).padStart(3, "0");
  return `${prefix}-${seqStr}`;
}

/**
 * Generates a Diagnostic Order Code
 * Format: "ORD-LAB-YYYYMMDD-XXXX" or "ORD-RAD-YYYYMMDD-XXXX"
 */
export function generateDiagnosticOrderCode(type: "lab" | "rad", date?: Date | string, seq: number = 1): string {
  const d = date ? new Date(date) : new Date();
  const yyyymmdd = d.toISOString().split("T")[0].replace(/-/g, "");
  const seqStr = String(seq).padStart(4, "0");
  return `ORD-${type.toUpperCase()}-${yyyymmdd}-${seqStr}`;
}

/**
 * Generates an Electronic Prescription (CPOE) Code
 * Format: "RX-YYYYMMDD-XXXX" (e.g. "RX-20260913-0001")
 */
export function generatePrescriptionCode(date?: Date | string, seq: number = 1): string {
  const d = date ? new Date(date) : new Date();
  const yyyymmdd = d.toISOString().split("T")[0].replace(/-/g, "");
  const seqStr = String(seq).padStart(4, "0");
  return `RX-${yyyymmdd}-${seqStr}`;
}
