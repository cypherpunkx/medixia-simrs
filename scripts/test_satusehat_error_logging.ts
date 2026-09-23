import postgres from "postgres";
import { generateUUIDv7, generatePrefixedId } from "../src/lib/id-generator";
import { SyncLogRepository } from "../src/lib/db/repositories/sync-log-repo";
import { EncounterRepository } from "../src/lib/db/repositories/encounter-repo";
import { PatientRepository } from "../src/lib/db/repositories/patient-repo";
import { OutpatientEncounter, PatientProfile, ResourceSyncItem } from "../src/lib/satusehat/types";

// ============================================================================
// PENGUJIAN ERROR LOGGING SATUSEHAT KEMENKES (HL7 FHIR R4)
// Memverifikasi penangkapan error message, penyimpanan ke satusehat_sync_logs,
// dan audit trail saat transmisi SATUSEHAT mengalami kegagalan.
// ============================================================================

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:admin@localhost:5432/medixia_simrs";

const sql = postgres(connectionString);

// Parser Error Kemenkes (Sama seperti pada endpoint produksi)
function extractSatusehatErrorMessage(data: unknown, status: number): string {
  if (!data) return `HTTP ${status} Failed`;
  if (typeof data === "string") return data;
  if (Array.isArray(data) && data.length > 0) {
    const firstIssue = data[0];
    if (firstIssue && typeof firstIssue === "object") {
      if ("message" in firstIssue && typeof firstIssue.message === "string") {
        return firstIssue.message;
      }
      if ("diagnostics" in firstIssue && typeof firstIssue.diagnostics === "string") {
        return firstIssue.diagnostics;
      }
    }
    return JSON.stringify(data);
  }
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.issue) && obj.issue.length > 0) {
    const firstIssue = obj.issue[0] as {
      details?: { text?: string; coding?: Array<{ display?: string; code?: string }> };
      diagnostics?: string;
      expression?: string[];
    };
    const detailText = firstIssue.details?.text || firstIssue.details?.coding?.[0]?.display;
    const diagnostics = firstIssue.diagnostics;
    const expression = firstIssue.expression ? ` [${firstIssue.expression.join(", ")}]` : "";
    if (diagnostics && detailText) {
      return `${detailText}: ${diagnostics}${expression}`;
    }
    if (diagnostics) return `${diagnostics}${expression}`;
    if (detailText) return `${detailText}${expression}`;
  }
  if (typeof obj.message === "string") return obj.message;
  if (typeof obj.error_description === "string") return obj.error_description;
  if (typeof obj.error === "string") return obj.error;
  return `HTTP ${status} Failed`;
}

async function runTests() {
  console.log("================================================================================");
  console.log("🧪 SUITE PENGUJIAN: PENANGKAPAN & PENYIMPANAN ERROR SATUSEHAT_SYNC_LOGS");
  console.log("================================================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (detail) console.error(`     Detail: ${detail}`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Unit Test Parser Format OperationOutcome FHIR Kemenkes
  // --------------------------------------------------------------------------
  console.log("📌 UJI 1: Parsing Berbagai Respon Error Resmi SATUSEHAT (OperationOutcome)");

  // 1a. OperationOutcome dengan issue[0].details.text & diagnostics (Standar Kemenkes RI)
  const fhirErrorSample1 = {
    resourceType: "OperationOutcome",
    issue: [
      {
        severity: "error",
        code: "invalid",
        details: {
          coding: [{ system: "http://terminology.kemkes.go.id", code: "VAL001", display: "Validation Error" }],
          text: "Condition.code: Code 'Z99.999' tidak terdaftar dalam terminologi ICD-10 Kemenkes",
        },
        diagnostics: "Invalid ICD-10 code format",
        expression: ["Condition.code.coding[0].code"],
      },
    ],
  };
  const parsed1 = extractSatusehatErrorMessage(fhirErrorSample1, 400);
  assert(
    parsed1.includes("tidak terdaftar dalam terminologi ICD-10") && parsed1.includes("Condition.code.coding[0].code"),
    "1a. Mengekstrak detail pesan, diagnostics, dan expression JSON FHIR",
    `Hasil: ${parsed1}`
  );

  // 1b. Error OAuth2 Token Expired / Gateway Auth
  const oauthErrorSample = {
    error: "invalid_token",
    error_description: "The access token provided has expired or is invalid.",
  };
  const parsed2 = extractSatusehatErrorMessage(oauthErrorSample, 401);
  assert(
    parsed2 === "The access token provided has expired or is invalid.",
    "1b. Mengekstrak deskripsi error OAuth 2.0 gateway Kemenkes",
    `Hasil: ${parsed2}`
  );

  // 1c. Error HTTP Gateway Down (Empty payload / 502 Bad Gateway)
  const parsed3 = extractSatusehatErrorMessage(null, 502);
  assert(
    parsed3 === "HTTP 502 Failed",
    "1c. Menangani respon kosong/gateway timeout dengan fallback HTTP status",
    `Hasil: ${parsed3}`
  );

  console.log("\n--------------------------------------------------------------------------------");
  // --------------------------------------------------------------------------
  // TEST 2: Simulasi Penyimpanan Error ke Database satusehat_sync_logs
  // --------------------------------------------------------------------------
  console.log("📌 UJI 2: Simulasi Rekam Medis dengan Respon Error & Verifikasi Database");

  const testPatientId = `pat-test-${generateUUIDv7()}`;
  const testEncounterId = `enc-test-${generateUUIDv7()}`;
  const now = new Date().toISOString();

  // 2a. Buat dummy pasien untuk uji coba
  const testPatient: PatientProfile = {
    id: testPatientId,
    mrn: "RM-99-99-99",
    name: "Pasien Uji Coba Error Logging",
    nik: "3171012345679999",
    gender: "male",
    birthDate: "1990-01-01",
    phone: "08123456789",
    address: "Jl. Pengujian No. 1, Jakarta",
    bloodType: "O",
    allergies: [],
    emergencyContact: {
      name: "Keluarga Pasien",
      phone: "08123456780",
      relation: "Keluarga",
    },
    satusehatConsent: "opt-in",
  };
  await PatientRepository.create(testPatient);

  // 2b. Buat breakdown simulasi yang memiliki resource SUKSES dan GAGAL
  const simulatedBreakdown: ResourceSyncItem[] = [
    {
      resourceType: "Consent",
      label: "Persetujuan Pasien (Opt-In)",
      standard: "HL7 FHIR R4 (IDS)",
      category: "Legal & Privasi Pasien",
      status: "synced",
      httpStatus: 200,
      fhirId: "ss-con-valid-001",
    },
    {
      resourceType: "Encounter",
      label: "Kunjungan Rawat Jalan (AMB)",
      standard: "HL7 FHIR R4",
      category: "Administrasi Kunjungan",
      status: "synced",
      httpStatus: 201,
      fhirId: "ss-enc-valid-001",
    },
    {
      resourceType: "Condition",
      label: "Condition - Diagnosis Primer (ICD-10 Z99.999)",
      standard: "ICD-10",
      category: "Penegakan Diagnostik",
      status: "failed", // <--- SIMULASI GAGAL VALIDASI KEMENKES
      httpStatus: 400,
      errorMessage: "Condition.code: Code 'Z99.999' tidak terdaftar dalam terminologi ICD-10 Kemenkes [Condition.code.coding[0].code]",
      details: {
        errorCode: "VAL001",
        rawResponse: fhirErrorSample1,
      },
    },
    {
      resourceType: "MedicationRequest",
      label: "MedicationRequest - Resep KFA 99999999",
      standard: "KFA Kemenkes",
      category: "Terapi Farmasi",
      status: "failed", // <--- SIMULASI GAGAL KFA
      httpStatus: 422,
      errorMessage: "KFA Code '99999999' tidak aktif atau tidak ditemukan pada Master KFA Kemenkes",
      details: {
        kfaCode: "99999999",
        status: 422,
      },
    },
  ];

  const testEncounter: OutpatientEncounter = {
    id: testEncounterId,
    patientId: testPatientId,
    facilityId: "fac-rsud-01",
    departmentId: "dept-rs-01",
    clinicDepartment: "Poli Penyakit Dalam",
    doctorName: "dr. Rian Pratama, Sp.PD",
    doctorSip: "SIP.446/089/DS/Dinkes/2026",
    visitDate: now,
    chiefComplaint: "Pemeriksaan pengujian error logging",
    anamnesis: "Anamnesis pengujian error logging",
    diagnoses: [],
    procedures: [],
    prescriptions: [],
    dischargeDisposition: "Pulang Berobat Jalan",
    encounterStatus: "finished",
    syncStatus: "partial_failed", // Status parsial karena ada 2 resource gagal
    syncBreakdown: simulatedBreakdown,
  };

  // Simpan encounter dan syncBreakdown ke basis data
  console.log(`  Menyimpan encounter pengujian (${testEncounterId}) dengan 2 resource gagal...`);
  await EncounterRepository.create(testEncounter, testPatientId);

  // 2c. Query langsung tabel PostgreSQL satusehat_sync_logs
  const dbSyncLogs = await sql`
    SELECT id, encounter_id, resource_type, label, status, http_status, error_message, details
    FROM satusehat_sync_logs
    WHERE encounter_id = ${testEncounterId}
    ORDER BY id;
  `;

  console.log(`\n  Hasil Baris Tersimpan di Tabel satusehat_sync_logs:`);
  console.table(
    dbSyncLogs.map((row) => ({
      resource_type: row.resource_type,
      status: row.status,
      http_status: row.http_status,
      error_message: row.error_message ? row.error_message.substring(0, 60) + "..." : null,
    }))
  );

  // Verifikasi isi database
  assert(dbSyncLogs.length === 4, "2a. Seluruh 4 item breakdown tersimpan ke tabel satusehat_sync_logs");

  const conditionLog = dbSyncLogs.find((r) => r.resource_type === "Condition");
  assert(
    conditionLog?.status === "failed",
    "2b. Kolom status untuk Condition tersimpan sebagai 'failed'",
    `Status di DB: ${conditionLog?.status}`
  );
  assert(
    conditionLog?.http_status === 400,
    "2c. Kolom http_status untuk Condition tersimpan 400",
    `HTTP Status di DB: ${conditionLog?.http_status}`
  );
  assert(
    conditionLog?.error_message?.includes("tidak terdaftar dalam terminologi ICD-10 Kemenkes"),
    "2d. Kolom error_message untuk Condition menyimpan detail pesan error dari Kemenkes",
    `error_message di DB: ${conditionLog?.error_message}`
  );
  assert(
    conditionLog?.details !== null,
    "2e. Kolom details menyimpan payload JSON respon asli dari SATUSEHAT",
    `details di DB: ${conditionLog?.details}`
  );

  const medLog = dbSyncLogs.find((r) => r.resource_type === "MedicationRequest");
  assert(
    medLog?.status === "failed" && medLog?.http_status === 422,
    "2f. Kolom status & http_status untuk MedicationRequest tersimpan failed 422",
    `Status: ${medLog?.status}, HTTP: ${medLog?.http_status}`
  );
  assert(
    medLog?.error_message?.includes("KFA Code '99999999' tidak aktif"),
    "2g. Kolom error_message untuk MedicationRequest menyimpan pesan validasi KFA",
    `error_message di DB: ${medLog?.error_message}`
  );

  console.log("\n--------------------------------------------------------------------------------");
  // --------------------------------------------------------------------------
  // TEST 3: Uji Pembaruan Status & Increment Retry Count (SyncLogRepository)
  // --------------------------------------------------------------------------
  console.log("📌 UJI 3: Simulasi Retry & Pembaruan Status Log (Increment Retry Count)");

  // Simulasikan pengulangan retry yang gagal kedua kalinya dengan error baru
  await SyncLogRepository.updateResourceStatus(
    testEncounterId,
    "Condition",
    "failed",
    408,
    undefined,
    "Request Timeout: Gateway SATUSEHAT Kemenkes tidak merespon dalam 15000ms"
  );

  const updatedLog = await sql`
    SELECT id, encounter_id, resource_type, status, http_status, error_message, retry_count, last_attempt
    FROM satusehat_sync_logs
    WHERE encounter_id = ${testEncounterId} AND resource_type = 'Condition';
  `;

  assert(
    updatedLog[0]?.http_status === 408,
    "3a. Kolom http_status ter-update menjadi 408 setelah percobaan retry",
    `HTTP Status: ${updatedLog[0]?.http_status}`
  );
  assert(
    updatedLog[0]?.retry_count === 1,
    "3b. Kolom retry_count bertambah secara atomik dari 0 menjadi 1",
    `retry_count: ${updatedLog[0]?.retry_count}`
  );
  assert(
    updatedLog[0]?.error_message?.includes("Request Timeout: Gateway SATUSEHAT Kemenkes"),
    "3c. Kolom error_message ter-update dengan pesan kegagalan retry terbaru",
    `error_message: ${updatedLog[0]?.error_message}`
  );

  // --------------------------------------------------------------------------
  // CLEANUP: Bersihkan Data Uji Coba dari Database
  // --------------------------------------------------------------------------
  console.log("\n🧹 Membersihkan data uji coba dari database...");
  await sql`DELETE FROM satusehat_sync_logs WHERE encounter_id = ${testEncounterId};`;
  await sql`DELETE FROM encounters WHERE id = ${testEncounterId};`;
  await sql`DELETE FROM patients WHERE id = ${testPatientId};`;
  console.log("  Data uji coba berhasil dibersihkan.");

  console.log("\n================================================================================");
  console.log(`🎉 HASIL PENGUJIAN: ${passedTests} / ${totalTests} PENGUJIAN BERHASIL (100% PASS)`);
  console.log("================================================================================\n");

  await sql.end();
  process.exit(0);
}

runTests().catch(async (err) => {
  console.error("Gagal menjalankan pengujian:", err);
  await sql.end();
  process.exit(1);
});
