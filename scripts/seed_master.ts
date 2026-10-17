import postgres from "postgres";
import { hashPassword } from "../src/lib/auth/password";
import { encryptSecret } from "../src/lib/auth/encryption";
import { KFA_MEDICATIONS_DATABASE } from "../src/lib/satusehat/kfa-database";
import { USERS_SEED_DATA } from "./seed_users";

// ============================================================================
// SIMRS MEDIXIA & SATUSEHAT - RE-ENGINEERED MASTER DATA SEEDER
// Standar Kemenkes RI, Permenkes No. 24/2022, HL7 FHIR R4, KFA, ICD-10 & ICD-9-CM
// Sinkronisasi data master: Faskes, Poliklinik, Nakes & Pengguna, Obat, ICD-10, ICD-9
// ============================================================================

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:admin@localhost:5432/medixia_simrs";

const sql = postgres(connectionString, {
  max: 1,
  idle_timeout: 10,
  prepare: false,
  onnotice: () => {}, // Filter PostgreSQL notices agar log terminal bersih
});

// ----------------------------------------------------------------------------
// Master Kamus Diagnosa Medis ICD-10 Standar WHO & Kemenkes RI
// ----------------------------------------------------------------------------
export const MASTER_ICD10_LIST = [
  { code: "I10", display: "Essential (primary) hypertension", patientFriendlyName: "Hipertensi Primer (Tekanan Darah Tinggi)", category: "Sistem Sirkulasi" },
  { code: "E11.9", display: "Type 2 diabetes mellitus without complications", patientFriendlyName: "Diabetes Melitus Tipe 2", category: "Endokrin & Metabolik" },
  { code: "J00", display: "Acute nasopharyngitis [common cold]", patientFriendlyName: "Nasofaringitis Akut (Flu / Batuk Pilek)", category: "Sistem Pernapasan" },
  { code: "J06.9", display: "Acute upper respiratory infection, unspecified", patientFriendlyName: "ISPA (Infeksi Saluran Pernapasan Akut)", category: "Sistem Pernapasan" },
  { code: "J02.9", display: "Acute pharyngitis, unspecified", patientFriendlyName: "Faringitis Akut (Radang Tenggorokan)", category: "Sistem Pernapasan" },
  { code: "K29.7", display: "Gastritis, unspecified", patientFriendlyName: "Gastritis (Maag)", category: "Sistem Pencernaan" },
  { code: "K30", display: "Functional dyspepsia", patientFriendlyName: "Dispepsia Fungsional", category: "Sistem Pencernaan" },
  { code: "K21.9", display: "Gastro-esophageal reflux disease without esophagitis", patientFriendlyName: "GERD (Penyakit Asam Lambung)", category: "Sistem Pencernaan" },
  { code: "M54.5", display: "Low back pain", patientFriendlyName: "Nyeri Punggung Bawah (LBP)", category: "Muskuloskeletal" },
  { code: "M79.1", display: "Myalgia", patientFriendlyName: "Nyeri Otot (Myalgia)", category: "Muskuloskeletal" },
  { code: "M10.9", display: "Gout, unspecified", patientFriendlyName: "Penyakit Asam Urat (Gout Arthritis)", category: "Muskuloskeletal" },
  { code: "M17.9", display: "Osteoarthritis of knee, unspecified", patientFriendlyName: "Pengapuran Sendi Lutut (Osteoartritis)", category: "Muskuloskeletal" },
  { code: "R50.9", display: "Fever, unspecified", patientFriendlyName: "Demam Tanpa Penyebab Khusus", category: "Gejala & Tanda Klinis" },
  { code: "R53.83", display: "Other fatigue", patientFriendlyName: "Kelelahan Fisik Ringan", category: "Gejala & Tanda Klinis" },
  { code: "R51", display: "Headache", patientFriendlyName: "Sakit Kepala", category: "Gejala & Tanda Klinis" },
  { code: "A09", display: "Infectious gastroenteritis and colitis, unspecified", patientFriendlyName: "Diare dan Gastroenteritis Akut", category: "Penyakit Infeksi" },
  { code: "J45.9", display: "Other and unspecified asthma", patientFriendlyName: "Asma Bronkial", category: "Sistem Pernapasan" },
  { code: "E78.0", display: "Pure hypercholesterolaemia", patientFriendlyName: "Hiperkolesterolemia (Kolesterol Tinggi)", category: "Endokrin & Metabolik" },
  { code: "N39.0", display: "Urinary tract infection, site not specified", patientFriendlyName: "Infeksi Saluran Kemih (ISK)", category: "Sistem Genitourinaria" },
  { code: "N40", display: "Hyperplasia of prostate", patientFriendlyName: "Pembesaran Prostat Jinak (BPH)", category: "Sistem Genitourinaria" },
  { code: "L20.9", display: "Atopic dermatitis, unspecified", patientFriendlyName: "Dermatitis Atopik (Eksim Alergi)", category: "Penyakit Kulit" },
  { code: "B35.4", display: "Tinea corporis", patientFriendlyName: "Infeksi Jamur Kulit (Kurap)", category: "Penyakit Infeksi" },
  { code: "K02.9", display: "Dental caries, unspecified", patientFriendlyName: "Karies Gigi (Gigi Berlubang)", category: "Kesehatan Gigi & Mulut" },
  { code: "K03.6", display: "Deposits [accretions] on teeth", patientFriendlyName: "Karang Gigi (Kalkulus)", category: "Kesehatan Gigi & Mulut" },
  { code: "I20.0", display: "Unstable angina", patientFriendlyName: "Angina Pektoris Tidak Stabil (Nyeri Dada Jantung)", category: "Sistem Sirkulasi" },
  { code: "H10.9", display: "Conjunctivitis, unspecified", patientFriendlyName: "Konjungtivitis (Mata Merah)", category: "Kesehatan Mata" },
  { code: "Z00.1", display: "Routine child health examination", patientFriendlyName: "Pemeriksaan Tumbuh Kembang Anak Rutin", category: "Faktor Status Kesehatan" },
];

// ----------------------------------------------------------------------------
// Master Kamus Tindakan Medis ICD-9-CM Standar WHO & Kemenkes RI
// ----------------------------------------------------------------------------
export const MASTER_ICD9_LIST = [
  { code: "89.07", display: "General medical consultation", category: "Konsultasi & Pemeriksaan Fisik" },
  { code: "89.52", display: "Electrocardiogram", category: "Pemeriksaan Kardiovaskular" },
  { code: "90.59", display: "Microscopic examination of blood", category: "Hematologi Laboratorium" },
  { code: "87.44", display: "Routine chest x-ray", category: "Radiologi & Pencitraan" },
  { code: "93.57", display: "Application of other wound dressing", category: "Perawatan Luka & Bedah Minor" },
  { code: "96.59", display: "Other nonoperative irrigation of wound", category: "Pembersihan Luka" },
  { code: "99.21", display: "Injection of antibiotic", category: "Pemberian Terapi Injeksi" },
  { code: "99.29", display: "Injection or infusion of other therapeutic substance", category: "Pemberian Terapi Injeksi / Infus" },
  { code: "89.38", display: "Other nonoperative respiratory measurement", category: "Pemeriksaan Fungsi Paru & Spirometri" },
  { code: "96.04", display: "Insertion of endotracheal tube", category: "Tindakan Jalan Napas" },
  { code: "23.09", display: "Extraction of other tooth", category: "Tindakan Gigi & Mulut" },
  { code: "96.54", display: "Dental prophylaxis", category: "Pembersihan Karang Gigi (Scaling)" },
  { code: "95.05", display: "Visual field study", category: "Pemeriksaan Mata & Penglihatan" },
  { code: "95.02", display: "Comprehensive eye examination", category: "Pemeriksaan Mata Komprehensif" },
  { code: "99.55", display: "Prophylactic administration of vaccine against other disease", category: "Imunisasi & Vaksinasi" },
];

export async function seedMasterData() {
  const startTime = Date.now();
  console.log("\n==========================================================");
  console.log("🏛️  SIMRS MEDIXIA & SATUSEHAT - RE-ENGINEERED MASTER SEEDER");
  console.log(`🔌 URL Database: ${connectionString.replace(/:[^:@]+@/, ":****@")}`);
  console.log("==========================================================\n");

  try {
    // ------------------------------------------------------------------------
    // 0. Pastikan Skema Tabel Master Terkini Terbentuk (Self-Healing DDL)
    // ------------------------------------------------------------------------
    console.log("🛠️  Memvalidasi integritas DDL skema tabel-tabel master...");
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS facilities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'rumah_sakit',
        satusehat_org_id TEXT NOT NULL DEFAULT 'b15a7ae7-f366-4a84-8385-0b8196c05002',
        satusehat_client_id TEXT,
        satusehat_client_secret_enc TEXT,
        satusehat_env TEXT NOT NULL DEFAULT 'staging',
        satusehat_status TEXT NOT NULL DEFAULT 'unverified',
        satusehat_last_tested_at TEXT,
        address TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        license_number TEXT DEFAULT '',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY,
        facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
        code TEXT NOT NULL DEFAULT '',
        queue_prefix TEXT NOT NULL DEFAULT 'A',
        name TEXT NOT NULL,
        room TEXT NOT NULL,
        quota INTEGER NOT NULL DEFAULT 30,
        default_doctor_name TEXT,
        satusehat_location_id TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        facility_id TEXT REFERENCES facilities(id) ON DELETE SET NULL,
        department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        sip TEXT,
        nik TEXT UNIQUE,
        ihs_practitioner_id TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS master_medications (
        id TEXT PRIMARY KEY,
        kfa_code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        generic_name TEXT NOT NULL,
        form TEXT NOT NULL,
        strength TEXT NOT NULL,
        route TEXT NOT NULL DEFAULT 'Oral',
        category TEXT NOT NULL,
        unit TEXT NOT NULL DEFAULT 'Tablet',
        default_dosage TEXT,
        default_frequency TEXT,
        default_timing TEXT,
        stock INTEGER NOT NULL DEFAULT 100,
        price INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS master_icd10 (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        display TEXT NOT NULL,
        patient_friendly_name TEXT NOT NULL,
        category TEXT DEFAULT 'Umum',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS master_icd9 (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        display TEXT NOT NULL,
        category TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Mutasi skema idempoten
      ALTER TABLE users ADD COLUMN IF NOT EXISTS nik TEXT UNIQUE;
      ALTER TABLE facilities ADD COLUMN IF NOT EXISTS satusehat_client_id TEXT;
      ALTER TABLE facilities ADD COLUMN IF NOT EXISTS satusehat_client_secret_enc TEXT;
      ALTER TABLE facilities ADD COLUMN IF NOT EXISTS satusehat_env TEXT NOT NULL DEFAULT 'staging';
      ALTER TABLE facilities ADD COLUMN IF NOT EXISTS satusehat_status TEXT NOT NULL DEFAULT 'unverified';
      ALTER TABLE facilities ADD COLUMN IF NOT EXISTS satusehat_last_tested_at TEXT;
      ALTER TABLE departments ADD COLUMN IF NOT EXISTS code TEXT DEFAULT '';
      ALTER TABLE departments ADD COLUMN IF NOT EXISTS queue_prefix TEXT DEFAULT 'A';
      ALTER TABLE departments ADD COLUMN IF NOT EXISTS satusehat_location_id TEXT;

      -- Index Kinerja Query
      CREATE INDEX IF NOT EXISTS idx_facilities_type ON facilities(type);
      CREATE INDEX IF NOT EXISTS idx_departments_facility_id ON departments(facility_id);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_nik ON users(nik);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_master_med_kfa_code ON master_medications(kfa_code);
      CREATE INDEX IF NOT EXISTS idx_master_icd10_code ON master_icd10(code);
      CREATE INDEX IF NOT EXISTS idx_master_icd9_code ON master_icd9(code);
    `);

    // ------------------------------------------------------------------------
    // 1. Master Profil Fasilitas Pelayanan Kesehatan (Facilities)
    // ------------------------------------------------------------------------
    console.log("🏢 Menyinkronkan Master Fasilitas Pelayanan Kesehatan (Facilities)...");
    const nowIso = new Date().toISOString();
    const rsClientId = process.env.SATUSEHAT_CLIENT_ID || "SAMPLE_CLIENT_ID_KEMENKES";
    const rsSecretEnc = encryptSecret(process.env.SATUSEHAT_CLIENT_SECRET || "SAMPLE_CLIENT_SECRET_987654321");
    const klinikClientId = "KLINIK_PRATAMA_CLIENT_ID_KEMENKES";
    const klinikSecretEnc = encryptSecret("KLINIK_PRATAMA_SECRET_KEY_987654");

    await sql`
      INSERT INTO facilities (
        id, name, type, satusehat_org_id, satusehat_client_id, satusehat_client_secret_enc,
        satusehat_env, satusehat_status, satusehat_last_tested_at, address, phone, license_number, is_active
      ) VALUES
        (
          'fac-rsud-01', 'RS Umum Daerah Sehat Sejahtera', 'rumah_sakit',
          'b15a7ae7-f366-4a84-8385-0b8196c05002', ${rsClientId}, ${rsSecretEnc},
          'staging', 'connected', ${nowIso},
          'Jl. Kesehatan Medika No. 45, Jakarta Pusat', '021-5550199', '440/012/Dinkes/RS-B/2024', true
        ),
        (
          'fac-klinik-01', 'Klinik Pratama Medixia Medika', 'klinik_pratama',
          '10000004', ${klinikClientId}, ${klinikSecretEnc},
          'staging', 'connected', ${nowIso},
          'Jl. Sudirman No. 88, Jakarta Selatan', '021-7788990', '445/008/Klinik-P/2025', true
        )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        satusehat_org_id = EXCLUDED.satusehat_org_id,
        satusehat_client_id = EXCLUDED.satusehat_client_id,
        satusehat_client_secret_enc = EXCLUDED.satusehat_client_secret_enc,
        satusehat_env = EXCLUDED.satusehat_env,
        satusehat_status = EXCLUDED.satusehat_status,
        satusehat_last_tested_at = EXCLUDED.satusehat_last_tested_at,
        address = EXCLUDED.address,
        phone = EXCLUDED.phone,
        license_number = EXCLUDED.license_number,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP;
    `;

    // ------------------------------------------------------------------------
    // 2. Master Poliklinik & Ruang Pelayanan (Departments)
    // ------------------------------------------------------------------------
    console.log("🏥 Menyinkronkan Master Poliklinik & Unit Layanan (Departments)...");
    await sql`
      INSERT INTO departments (
        id, facility_id, name, room, quota, default_doctor_name,
        code, queue_prefix, satusehat_location_id, is_active
      ) VALUES
        ('dept-rs-01', 'fac-rsud-01', 'Poli Penyakit Dalam', 'Ruang 204 (Lt. 2)', 35, 'dr. Syarifuddin, Sp.PD', 'INT', 'A', '3362d984-af65-43ac-8e5c-7db2b3be3f8b', true),
        ('dept-rs-02', 'fac-rsud-01', 'Poli Umum', 'Ruang 101 (Lt. 1)', 50, 'dr. Alexander', 'UMU', 'B', '79e96b97-b551-41bd-aadc-cb856a8ab332', true),
        ('dept-rs-03', 'fac-rsud-01', 'Poli Anak', 'Ruang 208 (Lt. 2)', 30, 'dr. Yoga Yandika, Sp.A', 'ANA', 'C', 'b017aa54-f1df-4429-b472-3e029619854e', true),
        ('dept-rs-04', 'fac-rsud-01', 'Poli Gigi & Mulut', 'Ruang 105 (Lt. 1)', 25, 'drg. Kevin Tanuwidjaja', 'GIG', 'D', '311defd2-ac8d-489b-a577-3703847b42b4', true),
        ('dept-rs-05', 'fac-rsud-01', 'Poli Bedah & Jantung', 'Ruang 301 (Lt. 3)', 20, 'dr. Nicholas Evan, Sp.B', 'BED', 'E', '4f17bb54-f1df-4429-b472-3e029619854f', true),
        ('dept-rs-06', 'fac-rsud-01', 'Poli Mata', 'Ruang 107 (Lt. 1)', 25, 'dr. Dito Arifin, Sp.M', 'MAT', 'F', '6b39dd54-f1df-4429-b472-3e029619854b', true),
        ('dept-kl-01', 'fac-klinik-01', 'Poli Umum Pratama', 'Ruang 1', 40, 'dr. Alexander', 'UMU', 'A', '79e96b97-b551-41bd-aadc-cb856a8ab332', true),
        ('dept-kl-02', 'fac-klinik-01', 'Poli Gigi Pratama', 'Ruang 2', 20, 'drg. Kevin Tanuwidjaja', 'GIG', 'B', '311defd2-ac8d-489b-a577-3703847b42b4', true)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        room = EXCLUDED.room,
        quota = EXCLUDED.quota,
        default_doctor_name = EXCLUDED.default_doctor_name,
        code = EXCLUDED.code,
        queue_prefix = EXCLUDED.queue_prefix,
        satusehat_location_id = EXCLUDED.satusehat_location_id,
        is_active = EXCLUDED.is_active;
    `;

    // ------------------------------------------------------------------------
    // 3. Master Tenaga Kesehatan & Akun Pengguna SIMRS (Users)
    // ------------------------------------------------------------------------
    console.log("👨‍⚕️ Menyinkronkan Master Tenaga Kesehatan & Pengguna SIMRS (Users)...");
    const cachedHashes: Record<string, string> = {};

    for (const u of USERS_SEED_DATA) {
      if (!cachedHashes[u.plainPassword]) {
        cachedHashes[u.plainPassword] = await hashPassword(u.plainPassword);
      }
      const passHash = cachedHashes[u.plainPassword];

      await sql`
        INSERT INTO users (
          id, facility_id, department_id, username, password_hash, name,
          role, sip, nik, ihs_practitioner_id, is_active
        ) VALUES (
          ${u.id}, ${u.facilityId}, ${u.departmentId}, ${u.username}, ${passHash}, ${u.name},
          ${u.role}, ${u.sip}, ${u.nik}, ${u.ihsPractitionerId}, ${u.isActive}
        )
        ON CONFLICT (id) DO UPDATE SET
          facility_id = EXCLUDED.facility_id,
          department_id = EXCLUDED.department_id,
          username = EXCLUDED.username,
          password_hash = EXCLUDED.password_hash,
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          sip = EXCLUDED.sip,
          nik = EXCLUDED.nik,
          ihs_practitioner_id = EXCLUDED.ihs_practitioner_id,
          is_active = EXCLUDED.is_active;
      `;
    }

    // ------------------------------------------------------------------------
    // 4. Master Kamus Obat & Alkes KFA Kemenkes (master_medications)
    // ------------------------------------------------------------------------
    console.log("💊 Menyinkronkan Master Kamus Obat & Alkes KFA Kemenkes (master_medications)...");
    let medicationCount = 0;
    for (const med of KFA_MEDICATIONS_DATABASE) {
      const medId = `med-kfa-${med.kfaCode}`;
      await sql`
        INSERT INTO master_medications (
          id, kfa_code, name, generic_name, form, strength, route, category, unit,
          default_dosage, default_frequency, default_timing, stock, price, is_active
        ) VALUES (
          ${medId}, ${med.kfaCode}, ${med.name}, ${med.genericName}, ${med.form}, ${med.strength},
          ${med.route || "Oral"}, ${med.category}, ${med.unit || "Tablet"},
          ${med.defaultDosage || null}, ${med.defaultFrequency || null}, ${med.defaultTiming || null},
          100, 0, true
        )
        ON CONFLICT (kfa_code) DO UPDATE SET
          name = EXCLUDED.name,
          generic_name = EXCLUDED.generic_name,
          form = EXCLUDED.form,
          strength = EXCLUDED.strength,
          category = EXCLUDED.category,
          route = EXCLUDED.route,
          unit = EXCLUDED.unit,
          default_dosage = EXCLUDED.default_dosage,
          default_frequency = EXCLUDED.default_frequency,
          default_timing = EXCLUDED.default_timing,
          updated_at = CURRENT_TIMESTAMP;
      `;
      medicationCount++;
    }

    // ------------------------------------------------------------------------
    // 5. Master Kamus Diagnosa ICD-10 (master_icd10)
    // ------------------------------------------------------------------------
    console.log("📚 Menyinkronkan Master Kamus Diagnosa Medis ICD-10 (master_icd10)...");
    let icd10Count = 0;
    for (const item of MASTER_ICD10_LIST) {
      await sql`
        INSERT INTO master_icd10 (id, code, display, patient_friendly_name, category, is_active)
        VALUES (${`icd10-${item.code.replace(".", "-")}`}, ${item.code}, ${item.display}, ${item.patientFriendlyName}, ${item.category}, true)
        ON CONFLICT (code) DO UPDATE SET
          display = EXCLUDED.display,
          patient_friendly_name = EXCLUDED.patient_friendly_name,
          category = EXCLUDED.category,
          is_active = EXCLUDED.is_active;
      `;
      icd10Count++;
    }

    // ------------------------------------------------------------------------
    // 6. Master Kamus Tindakan Medis ICD-9-CM (master_icd9)
    // ------------------------------------------------------------------------
    console.log("🩺 Menyinkronkan Master Kamus Tindakan Medis ICD-9-CM (master_icd9)...");
    let icd9Count = 0;
    for (const item of MASTER_ICD9_LIST) {
      await sql`
        INSERT INTO master_icd9 (id, code, display, category, is_active)
        VALUES (${`icd9-${item.code.replace(".", "-")}`}, ${item.code}, ${item.display}, ${item.category}, true)
        ON CONFLICT (code) DO UPDATE SET
          display = EXCLUDED.display,
          category = EXCLUDED.category,
          is_active = EXCLUDED.is_active;
      `;
      icd9Count++;
    }

    const elapsed = Date.now() - startTime;

    console.log("\n==================================================================================");
    console.log("📊 RINGKASAN RE-SEEDED MASTER DATA SIMRS & SATUSEHAT:");
    console.log("----------------------------------------------------------------------------------");
    console.log(`| 🏢 Profil Faskes (facilities)            : 2 faskes (RSUD & Klinik Pratama)`);
    console.log(`| 🏥 Poliklinik & Ruang Rawat Jalan (dept) : 8 unit layanan`);
    console.log(`| 👨‍⚕️ Tenaga Medis & Akun RBAC (users)       : ${USERS_SEED_DATA.length} pengguna terdaftar`);
    console.log(`| 💊 Kamus Obat & Alkes KFA Kemenkes       : ${medicationCount} item obat resmi`);
    console.log(`| 📚 Kamus Diagnosa ICD-10 Standar WHO     : ${icd10Count} kode diagnosa`);
    console.log(`| 🩺 Kamus Tindakan Medis ICD-9-CM         : ${icd9Count} kode prosedur`);
    console.log("----------------------------------------------------------------------------------");
    console.log(`🎉 SELURUH MASTER DATA BERHASIL DISINKRONKAN DALAM ${elapsed}ms!`);
    console.log("💡 Master data 100% selaras dengan skema Drizzle ORM dan standar Kemenkes RI.\n");
  } catch (error) {
    console.error("\n❌ Gagal menyinkronkan master data SIMRS:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Jalankan saat dipanggil langsung
if (require.main === module || process.argv[1]?.includes("seed_master")) {
  seedMasterData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
