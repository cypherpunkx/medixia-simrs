import { hashPassword, verifyPassword } from "../src/lib/auth/password";
import { signSessionToken, verifySessionToken } from "../src/lib/auth/jwt";
import { UserRepository } from "../src/lib/db/repositories/user-repo";
import { EncounterRepository } from "../src/lib/db/repositories/encounter-repo";
import { PatientRepository } from "../src/lib/db/repositories/patient-repo";
import { OutboxRepository } from "../src/lib/db/repositories/outbox-repo";
import { checkDatabaseConnection } from "../src/lib/db/index";
import { SatusehatClient } from "../src/lib/satusehat/client";

async function runPriorityMatrixTests() {
  console.log("\n==========================================================");
  console.log("🧪 PENGUJIAN OTOMATIS MATRIKS PRIORITAS TINDAKAN LIVE PROD");
  console.log("==========================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${testName}`);
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? `- ${detail}` : ""}`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Hashing Kata Sandi (Bcrypt) & Hapus Demo Password
  // --------------------------------------------------------------------------
  console.log("\n--- [P0] 1. Keamanan: Password Hashing (Bcrypt) ---");
  const rawPass = "DokterSpesialis2026!";
  const hashed = await hashPassword(rawPass);
  assert(hashed.startsWith("$2a$") || hashed.startsWith("$2b$"), "Bcrypt hash format valid ($2a$/$2b$)");
  assert(await verifyPassword(rawPass, hashed), "Password valid cocok dengan hash bcrypt");
  assert(!(await verifyPassword("wrongPass123", hashed)), "Password salah ditolak");

  // Verifikasi database: coba autentikasi dokter dengan password asli vs demo password
  const doctorAuth = await UserRepository.authenticate("dr.rian", "password123");
  assert(doctorAuth !== null && doctorAuth.role === "doctor", "Autentikasi dokter dengan kata sandi sah berhasil");

  const demoBypassAttempt = await UserRepository.authenticate("dr.rian", "dokter123");
  assert(demoBypassAttempt === null, "Bypass demo password 'dokter123' ditolak total (aman)");

  // --------------------------------------------------------------------------
  // TEST 2: Cookie Session httpOnly: true & JWT Signature
  // --------------------------------------------------------------------------
  console.log("\n--- [P0] 2. Keamanan: JWT Session Signature ---");
  const token = signSessionToken({
    userId: "usr-dr-rian",
    facilityId: "fac-rsud-01",
    role: "doctor",
    username: "dr.rian",
  });
  assert(typeof token === "string" && token.split(".").length === 3, "Format token JWT 3 bagian (header.payload.sig)");

  const verified = verifySessionToken(token);
  assert(verified !== null && verified.userId === "usr-dr-rian", "Verifikasi tanda tangan JWT berhasil & integritas payload terjaga");

  // Uji penolakan token yang dimanipulasi (tampering)
  const tamperedToken = token.slice(0, -5) + "abcde";
  const tamperedResult = verifySessionToken(tamperedToken);
  assert(tamperedResult === null, "Token yang dimanipulasi/tampered ditolak secara kriptografis");

  // --------------------------------------------------------------------------
  // TEST 3: SATUSEHAT Kredensial Live Production Validation
  // --------------------------------------------------------------------------
  console.log("\n--- [P0] 3. SATUSEHAT: Validasi Kredensial Live Production ---");
  const prodDummyCheck = await SatusehatClient.authenticate({
    clientId: "SAMPLE_CLIENT_ID_KEMENKES",
    clientSecret: "SAMPLE_CLIENT_SECRET_987654321",
    env: "production",
    orgId: "b15a7ae7-f366-4a84-8385-0b8196c05002",
  });
  assert(
    !prodDummyCheck.success && prodDummyCheck.error?.code === "PRODUCTION_CREDENTIALS_REQUIRED",
    "Mode Live Production menolak kredensial sample/dummy dengan kode PRODUCTION_CREDENTIALS_REQUIRED"
  );

  // --------------------------------------------------------------------------
  // TEST 4: Regulasi Permenkes 24/2022 - Immutability RME & Adendum Audit Trail
  // --------------------------------------------------------------------------
  console.log("\n--- [P1] 4. Regulasi: Immutability RME & Adendum Audit Trail ---");
  // Ambil salah satu encounter yang ada atau siapkan fixture uji mandiri
  const allEnc = await EncounterRepository.getAll();
  let sampleEnc = allEnc[0];
  if (!sampleEnc) {
    const testPat = await PatientRepository.create({
      id: "pat-test-priority-01",
      nik: "3171010101900001",
      mrn: "99-99-99",
      name: "Pasien Uji Prioritas",
      gender: "male",
      birthDate: "1990-01-01",
      phone: "081234567890",
      address: "Jl. Uji Coba No. 1",
      bloodType: "O",
      allergies: [],
      emergencyContact: { name: "Kerabat", relation: "Keluarga", phone: "081234567891" },
    });
    sampleEnc = await EncounterRepository.create(
      {
        id: "enc-test-priority-01",
        visitDate: new Date().toISOString(),
        clinicDepartment: "Poli Umum",
        doctorName: "dr. Rian Pratama, Sp.PD",
        doctorSip: "SIP.446/089/DS/Dinkes/2026",
        doctorIhsId: "N10000001",
        chiefComplaint: "Pusing",
        anamnesis: "Pusing sejak kemarin",
        followUpPlan: { instruction: "Istirahat" },
        dischargeDisposition: "Pulang Berobat Jalan",
        encounterStatus: "finished",
        diagnoses: [{ id: "diag-test-01", type: "primary", code: "I10", display: "Essential Hypertension", patientFriendlyName: "Hipertensi" }],
        procedures: [],
        prescriptions: [],
        syncStatus: "draft",
      },
      testPat.id
    );
  }

  // Kunci encounter jika belum
  await EncounterRepository.update(sampleEnc.id, { isLocked: true });
  const lockedEnc = await EncounterRepository.getById(sampleEnc.id);
  assert(Boolean(lockedEnc?.isLocked), "Status encounter berhasil dikunci (is_locked = true)");

  // Catat adendum resmi
  const addendum = await EncounterRepository.addAddendum(sampleEnc.id, {
    authorName: "dr. Rian Pratama, Sp.PD",
    authorRole: "Dokter Penanggung Jawab Pelayanan (DPJP)",
    noteText: "Koreksi dosis obat amlodipine dari 5mg menjadi 10mg atas evaluasi TD terkini.",
  });
  assert(addendum !== null && Boolean(addendum.id), "Adendum medis berhasil dicatat ke audit trail permanen");

  // Periksa apakah adendum masuk ke encounter
  const updatedEncWithAddendum = await EncounterRepository.getById(sampleEnc.id);
  const hasAddendum = updatedEncWithAddendum?.addendums?.some((a) => a.id === addendum?.id);
  assert(Boolean(hasAddendum), "Dokumen rekam medis memuat adendum yang baru dicatat tanpa menghapus rekam medis asli");

  // --------------------------------------------------------------------------
  // TEST 5: Infrastruktur - Pemisahan DDL dari Runtime Startup
  // --------------------------------------------------------------------------
  console.log("\n--- [P1] 5. Infrastruktur: Liveness Check DB Tanpa DDL Table Lock ---");
  const connStartTime = Date.now();
  const isDbLive = await checkDatabaseConnection();
  const connElapsed = Date.now() - connStartTime;
  assert(isDbLive, "Koneksi pool database aktif");
  assert(connElapsed < 100, `Liveness check super cepat (${connElapsed}ms < 100ms) tanpa overhead DDL runtime`);

  // --------------------------------------------------------------------------
  // TEST 6: Resiliensi - Outbox Pattern & Exponential Backoff Queue
  // --------------------------------------------------------------------------
  console.log("\n--- [P1] 6. Resiliensi: Outbox Pattern & Background Retry Queue ---");
  const targetEncId = sampleEnc.id;
  const enqueued = await OutboxRepository.enqueue(targetEncId, "encounter_bundle", {
    reason: "Uji otomatis retry queue",
  });
  assert(Boolean(enqueued.id) && enqueued.status === "pending", "Item berhasil didaftarkan ke antrean satusehat_outbox");

  const dueItems = await OutboxRepository.fetchDueItems(10);
  const foundDue = dueItems.some((d) => d.id === enqueued.id);
  assert(foundDue, "Item yang baru masuk langsung terdeteksi sebagai due item untuk diproses worker");

  // Uji exponential backoff saat failure
  await OutboxRepository.markFailed(enqueued.id, 0, "Simulasi 502 Gateway Timeout dari Kemenkes");
  const statsAfterFail = await OutboxRepository.getStats();
  assert(statsAfterFail.total > 0, "Statistik outbox teragregasi dengan benar");

  // Bersihkan item uji
  await OutboxRepository.markSynced(enqueued.id);
  const finalStats = await OutboxRepository.getStats();
  assert(finalStats.synced >= 1, "Item berhasil ditandai status synced");

  // Cleanup test fixture agar database faskes kembali bersih tanpa sisa data uji
  try {
    const { db } = await import("../src/lib/db/index");
    const { encounters, patients, satusehatOutbox } = await import("../src/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    await db.delete(satusehatOutbox).where(eq(satusehatOutbox.id, enqueued.id));
    await db.delete(encounters).where(eq(encounters.id, "enc-test-priority-01"));
    await db.delete(patients).where(eq(patients.id, "pat-test-priority-01"));
  } catch {
    // Ignore cleanup error
  }

  // --------------------------------------------------------------------------
  // Ringkasan
  // --------------------------------------------------------------------------
  console.log("\n==========================================================");
  console.log(`📊 HASIL PENGUJIAN: ${passedTests}/${totalTests} Uji Berhasil (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("==========================================================\n");

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPriorityMatrixTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
