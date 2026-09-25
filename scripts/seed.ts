import postgres from "postgres";
import {
  MOCK_PATIENT,
  SAMPLE_PATIENTS,
  ALL_SAMPLE_ENCOUNTERS,
  INITIAL_WORKLIST,
} from "../src/lib/satusehat/mock-data";
import {
  PatientProfile,
  OutpatientEncounter,
  ClinicQueuePatientItem,
} from "../src/lib/satusehat/types";
import { hashPassword } from "../src/lib/auth/password";
import { encryptSecret } from "../src/lib/auth/encryption";
import { KFA_MEDICATIONS_DATABASE } from "../src/lib/satusehat/kfa-database";

// ============================================================================
// SIMRS & SATUSEHAT RME COMPREHENSIVE POSTGRESQL DATABASE SEEDER
// Standar Kemenkes RI, FHIR HL7 R4, ICD-10, ICD-9-CM, & KFA
// ============================================================================

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:admin@localhost:5432/medixia_simrs";

const isFresh =
  process.argv.includes("--fresh") ||
  process.argv.includes("--reset") ||
  process.argv.includes("-f");

console.log("\n==========================================================");
console.log("🏥 SIMRS & SATUSEHAT RME POSTGRESQL DATABASE SEEDER");
console.log(
  `🔌 URL Database: ${connectionString.replace(/:[^:@]+@/, ":****@")}`,
);
console.log(`⚙️  Mode: ${isFresh ? "FRESH RESET (--fresh)" : "UPSERT & SYNC"}`);
console.log("==========================================================\n");

const sql = postgres(connectionString, {
  max: 5,
  idle_timeout: 10,
  prepare: false,
  onnotice: () => {},
});

// 1. Table Schema Definitions (15 Relational Tables in PostgreSQL)
async function createTables() {
  if (isFresh) {
    console.log("🧹 Membersihkan tabel-tabel lama (Drop Tables CASCADE)...");
    await sql.unsafe(`
      DROP TABLE IF EXISTS satusehat_outbox CASCADE;
      DROP TABLE IF EXISTS master_medications CASCADE;
      DROP TABLE IF EXISTS master_icd10 CASCADE;
      DROP TABLE IF EXISTS master_icd9 CASCADE;
      DROP TABLE IF EXISTS satusehat_sync_logs CASCADE;
      DROP TABLE IF EXISTS queue_items CASCADE;
      DROP TABLE IF EXISTS medical_addendums CASCADE;
      DROP TABLE IF EXISTS radiology_results CASCADE;
      DROP TABLE IF EXISTS lab_results CASCADE;
      DROP TABLE IF EXISTS diagnostic_orders CASCADE;
      DROP TABLE IF EXISTS prescriptions CASCADE;
      DROP TABLE IF EXISTS procedures CASCADE;
      DROP TABLE IF EXISTS diagnoses CASCADE;
      DROP TABLE IF EXISTS vitals CASCADE;
      DROP TABLE IF EXISTS encounters CASCADE;
      DROP TABLE IF EXISTS patients CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS departments CASCADE;
      DROP TABLE IF EXISTS facilities CASCADE;
    `);
  }

  console.log("🛠️  Membuat skema 15 tabel relasional PostgreSQL...");
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

    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      nik TEXT NOT NULL UNIQUE,
      mrn TEXT NOT NULL UNIQUE,
      ihs_number TEXT,
      name TEXT NOT NULL,
      gender TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      blood_type TEXT NOT NULL,
      allergies TEXT NOT NULL DEFAULT '[]',
      emergency_contact_name TEXT NOT NULL,
      emergency_contact_relation TEXT NOT NULL,
      emergency_contact_phone TEXT NOT NULL,
      payment_payer TEXT DEFAULT 'BPJS Kesehatan',
      last_visit_date TEXT,
      last_visit_department TEXT,
      last_visit_doctor TEXT,
      last_visit_diagnosis TEXT,
      total_visits_count INTEGER DEFAULT 1,
      patient_status TEXT DEFAULT 'outpatient',
      inpatient_details TEXT,
      satusehat_consent TEXT DEFAULT 'opt-in',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS encounters (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      facility_id TEXT REFERENCES facilities(id) ON DELETE SET NULL,
      department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
      doctor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      satusehat_encounter_id TEXT,
      visit_date TEXT NOT NULL,
      clinic_department TEXT NOT NULL,
      doctor_name TEXT NOT NULL,
      doctor_sip TEXT NOT NULL,
      doctor_ihs_id TEXT DEFAULT 'N10000001',
      chief_complaint TEXT NOT NULL,
      anamnesis TEXT NOT NULL,
      follow_up_instruction TEXT NOT NULL,
      next_visit_date TEXT,
      referred_to TEXT,
      discharge_disposition TEXT DEFAULT 'Pulang Berobat Jalan',
      encounter_status TEXT DEFAULT 'finished',
      queue_number TEXT,
      registration_number TEXT,
      consent_status TEXT DEFAULT 'opt-in',
      sync_status TEXT DEFAULT 'synced',
      synced_at TEXT,
      is_locked BOOLEAN DEFAULT false,
      locked_at TEXT,
      locked_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vitals (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
      systolic INTEGER NOT NULL,
      diastolic INTEGER NOT NULL,
      heart_rate INTEGER NOT NULL,
      temperature REAL NOT NULL,
      respiratory_rate INTEGER NOT NULL,
      oxygen_saturation INTEGER NOT NULL,
      weight_kg REAL NOT NULL,
      height_cm REAL NOT NULL,
      bmi REAL,
      physical_exam_notes TEXT,
      satusehat_bp_id TEXT,
      satusehat_hr_id TEXT,
      satusehat_temp_id TEXT,
      satusehat_rr_id TEXT,
      satusehat_spo2_id TEXT,
      satusehat_weight_id TEXT,
      satusehat_height_id TEXT,
      satusehat_bmi_id TEXT
    );

    CREATE TABLE IF NOT EXISTS diagnoses (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      code TEXT NOT NULL,
      display TEXT NOT NULL,
      patient_friendly_name TEXT NOT NULL,
      system TEXT DEFAULT 'http://hl7.org/fhir/sid/icd-10',
      clinical_status TEXT DEFAULT 'active',
      satusehat_condition_id TEXT
    );

    CREATE TABLE IF NOT EXISTS procedures (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      display TEXT NOT NULL,
      category TEXT NOT NULL,
      notes TEXT,
      satusehat_procedure_id TEXT
    );

    CREATE TABLE IF NOT EXISTS prescriptions (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
      kfa_code TEXT NOT NULL,
      medication_name TEXT NOT NULL,
      form TEXT NOT NULL,
      dosage TEXT NOT NULL,
      frequency TEXT NOT NULL,
      timing TEXT NOT NULL,
      morning BOOLEAN DEFAULT false,
      afternoon BOOLEAN DEFAULT false,
      evening BOOLEAN DEFAULT false,
      night BOOLEAN DEFAULT false,
      quantity INTEGER NOT NULL,
      unit TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      instructions TEXT NOT NULL,
      satusehat_medication_request_id TEXT,
      satusehat_medication_id TEXT
    );

    CREATE TABLE IF NOT EXISTS diagnostic_orders (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
      test_code TEXT NOT NULL,
      test_name TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ordered',
      priority TEXT NOT NULL DEFAULT 'routine',
      order_date TEXT NOT NULL,
      doctor_name TEXT NOT NULL,
      clinical_notes TEXT,
      satusehat_service_request_id TEXT
    );

    CREATE TABLE IF NOT EXISTS lab_results (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
      test_code TEXT NOT NULL,
      test_name TEXT NOT NULL,
      category TEXT NOT NULL,
      value TEXT NOT NULL,
      unit TEXT NOT NULL,
      reference_range TEXT NOT NULL,
      flag TEXT NOT NULL,
      result_date TEXT NOT NULL,
      performer TEXT NOT NULL,
      notes TEXT,
      satusehat_observation_id TEXT,
      satusehat_diagnostic_report_id TEXT
    );

    CREATE TABLE IF NOT EXISTS radiology_results (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
      exam_code TEXT NOT NULL,
      exam_name TEXT NOT NULL,
      modality TEXT NOT NULL,
      findings TEXT NOT NULL,
      conclusion TEXT NOT NULL,
      radiologist_name TEXT NOT NULL,
      result_date TEXT NOT NULL,
      satusehat_observation_id TEXT,
      satusehat_diagnostic_report_id TEXT
    );

    CREATE TABLE IF NOT EXISTS medical_addendums (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
      timestamp TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_role TEXT NOT NULL,
      note_text TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS queue_items (
      id TEXT PRIMARY KEY,
      queue_number TEXT NOT NULL,
      registration_number TEXT,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
      doctor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      encounter_id TEXT REFERENCES encounters(id) ON DELETE SET NULL,
      department TEXT NOT NULL,
      doctor TEXT NOT NULL,
      room TEXT NOT NULL,
      arrival_time TEXT NOT NULL,
      arrival_timestamp BIGINT,
      chief_complaint TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'arrived',
      satusehat_status TEXT NOT NULL DEFAULT 'synced',
      satusehat_consent TEXT DEFAULT 'opt-in',
      triage_priority TEXT DEFAULT 'regular',
      called_at TEXT,
      call_count INTEGER DEFAULT 0,
      queue_date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS satusehat_sync_logs (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
      resource_type TEXT NOT NULL,
      label TEXT NOT NULL,
      category TEXT,
      standard TEXT NOT NULL,
      status TEXT NOT NULL,
      http_status INTEGER,
      fhir_id TEXT,
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      last_attempt TEXT,
      details TEXT
    );

    -- Tabel Antrean Outbox SATUSEHAT (Outbox Pattern & Resiliensi Worker)
    CREATE TABLE IF NOT EXISTS satusehat_outbox (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
      resource_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 5,
      next_retry_at TEXT NOT NULL,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Master Data Obat & Alkes KFA Kemenkes
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

    -- Master Kamus Diagnosa Medis ICD-10
    CREATE TABLE IF NOT EXISTS master_icd10 (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      display TEXT NOT NULL,
      patient_friendly_name TEXT NOT NULL,
      category TEXT DEFAULT 'Umum',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Master Kamus Tindakan Medis ICD-9-CM
    CREATE TABLE IF NOT EXISTS master_icd9 (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      display TEXT NOT NULL,
      category TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Auto Migrations for existing DB instances
    ALTER TABLE encounters ADD COLUMN IF NOT EXISTS facility_id TEXT REFERENCES facilities(id) ON DELETE SET NULL;
    ALTER TABLE encounters ADD COLUMN IF NOT EXISTS department_id TEXT REFERENCES departments(id) ON DELETE SET NULL;
    ALTER TABLE encounters ADD COLUMN IF NOT EXISTS doctor_id TEXT REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE encounters ADD COLUMN IF NOT EXISTS registration_number TEXT;
    ALTER TABLE encounters ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
    ALTER TABLE encounters ADD COLUMN IF NOT EXISTS locked_at TEXT;
    ALTER TABLE encounters ADD COLUMN IF NOT EXISTS locked_by TEXT;
    ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS department_id TEXT REFERENCES departments(id) ON DELETE SET NULL;
    ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS doctor_id TEXT REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS encounter_id TEXT REFERENCES encounters(id) ON DELETE SET NULL;
    ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS registration_number TEXT;
    ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS triage_priority TEXT DEFAULT 'regular';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS nik TEXT UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_users_nik ON users(nik);

    -- Multi-tenant SATUSEHAT Credentials per Facility
    ALTER TABLE facilities ADD COLUMN IF NOT EXISTS satusehat_client_id TEXT;
    ALTER TABLE facilities ADD COLUMN IF NOT EXISTS satusehat_client_secret_enc TEXT;
    ALTER TABLE facilities ADD COLUMN IF NOT EXISTS satusehat_env TEXT NOT NULL DEFAULT 'staging';
    ALTER TABLE facilities ADD COLUMN IF NOT EXISTS satusehat_status TEXT NOT NULL DEFAULT 'unverified';
    ALTER TABLE facilities ADD COLUMN IF NOT EXISTS satusehat_last_tested_at TEXT;
    CREATE INDEX IF NOT EXISTS idx_facilities_satusehat_org ON facilities(satusehat_org_id);

    -- Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
    CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
    CREATE INDEX IF NOT EXISTS idx_patients_updated_at ON patients(updated_at);

    CREATE INDEX IF NOT EXISTS idx_encounters_patient_id ON encounters(patient_id);
    CREATE INDEX IF NOT EXISTS idx_encounters_facility_id ON encounters(facility_id);
    CREATE INDEX IF NOT EXISTS idx_encounters_department_id ON encounters(department_id);
    CREATE INDEX IF NOT EXISTS idx_encounters_doctor_id ON encounters(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_encounters_visit_date ON encounters(visit_date);
    CREATE INDEX IF NOT EXISTS idx_encounters_queue_number ON encounters(queue_number);
    CREATE INDEX IF NOT EXISTS idx_encounters_reg_number ON encounters(registration_number);
    CREATE INDEX IF NOT EXISTS idx_encounters_status ON encounters(encounter_status);
    CREATE INDEX IF NOT EXISTS idx_encounters_sync_status ON encounters(sync_status);

    CREATE INDEX IF NOT EXISTS idx_vitals_encounter_id ON vitals(encounter_id);
    CREATE INDEX IF NOT EXISTS idx_diagnoses_encounter_id ON diagnoses(encounter_id);
    CREATE INDEX IF NOT EXISTS idx_diagnoses_code ON diagnoses(code);
    CREATE INDEX IF NOT EXISTS idx_procedures_encounter_id ON procedures(encounter_id);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_encounter_id ON prescriptions(encounter_id);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_kfa_code ON prescriptions(kfa_code);
    CREATE INDEX IF NOT EXISTS idx_diagnostic_orders_encounter_id ON diagnostic_orders(encounter_id);
    CREATE INDEX IF NOT EXISTS idx_lab_results_encounter_id ON lab_results(encounter_id);
    CREATE INDEX IF NOT EXISTS idx_radiology_results_encounter_id ON radiology_results(encounter_id);
    CREATE INDEX IF NOT EXISTS idx_medical_addendums_encounter_id ON medical_addendums(encounter_id);

    CREATE INDEX IF NOT EXISTS idx_queue_items_queue_date ON queue_items(queue_date);
    CREATE INDEX IF NOT EXISTS idx_queue_items_patient_id ON queue_items(patient_id);
    CREATE INDEX IF NOT EXISTS idx_queue_items_dept_id ON queue_items(department_id);
    CREATE INDEX IF NOT EXISTS idx_queue_items_doctor_id ON queue_items(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_queue_items_enc_id ON queue_items(encounter_id);
    CREATE INDEX IF NOT EXISTS idx_queue_items_dept_date ON queue_items(department, queue_date);
    CREATE INDEX IF NOT EXISTS idx_queue_items_status ON queue_items(status);
    CREATE INDEX IF NOT EXISTS idx_queue_items_reg_number ON queue_items(registration_number);

    CREATE INDEX IF NOT EXISTS idx_sync_logs_encounter_id ON satusehat_sync_logs(encounter_id);
    CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON satusehat_sync_logs(status);

    CREATE INDEX IF NOT EXISTS idx_outbox_status_next_retry ON satusehat_outbox(status, next_retry_at);
    CREATE INDEX IF NOT EXISTS idx_outbox_encounter_id ON satusehat_outbox(encounter_id);

    CREATE INDEX IF NOT EXISTS idx_master_med_kfa_code ON master_medications(kfa_code);
    CREATE INDEX IF NOT EXISTS idx_master_med_name ON master_medications(name);
    CREATE INDEX IF NOT EXISTS idx_master_med_generic ON master_medications(generic_name);
    CREATE INDEX IF NOT EXISTS idx_master_med_category ON master_medications(category);
    CREATE INDEX IF NOT EXISTS idx_master_med_active ON master_medications(is_active);

    CREATE INDEX IF NOT EXISTS idx_master_icd10_code ON master_icd10(code);
    CREATE INDEX IF NOT EXISTS idx_master_icd10_display ON master_icd10(display);
    CREATE INDEX IF NOT EXISTS idx_master_icd10_active ON master_icd10(is_active);

    CREATE INDEX IF NOT EXISTS idx_master_icd9_code ON master_icd9(code);
    CREATE INDEX IF NOT EXISTS idx_master_icd9_category ON master_icd9(category);
    CREATE INDEX IF NOT EXISTS idx_master_icd9_active ON master_icd9(is_active);

    -- Sequences untuk Penomoran Bisnis Berkecepatan Tinggi (Atomic & Anti-Collision di Concurrency Tinggi)
    CREATE SEQUENCE IF NOT EXISTS reg_number_seq START WITH 1 INCREMENT BY 1 CYCLE;
    CREATE SEQUENCE IF NOT EXISTS mrn_seq START WITH 100001 INCREMENT BY 1;
  `);
}

// 2. Main Seeder Execution
async function seedDatabase() {
  const startTime = Date.now();
  await createTables();

  console.log(
    "⏳ Memulai pengisian data faskes, user, dan data klinis SIMRS ke PostgreSQL...\n",
  );

  // Seed Facilities (Multi-Tenant dengan Kredensial SATUSEHAT Terenkripsi AES-256-GCM)
  const defaultRsSecretEnc = encryptSecret(process.env.SATUSEHAT_CLIENT_SECRET || "SAMPLE_CLIENT_SECRET_987654321");
  const defaultRsClientId = process.env.SATUSEHAT_CLIENT_ID || "SAMPLE_CLIENT_ID_KEMENKES";
  const defaultKlinikSecretEnc = encryptSecret("KLINIK_PRATAMA_SECRET_KEY_987654");
  const defaultKlinikClientId = "KLINIK_PRATAMA_CLIENT_ID_KEMENKES";
  const nowIso = new Date().toISOString();

  await sql`
    INSERT INTO facilities (id, name, type, satusehat_org_id, satusehat_client_id, satusehat_client_secret_enc, satusehat_env, satusehat_status, satusehat_last_tested_at, address, phone, license_number, is_active)
    VALUES
      ('fac-rsud-01', 'RS Umum Daerah Sehat Sejahtera', 'rumah_sakit', 'b15a7ae7-f366-4a84-8385-0b8196c05002', ${defaultRsClientId}, ${defaultRsSecretEnc}, 'staging', 'connected', ${nowIso}, 'Jl. Kesehatan Medika No. 45, Jakarta Pusat', '021-5550199', '440/012/Dinkes/RS-B/2024', true),
      ('fac-klinik-01', 'Klinik Pratama Medixia Medika', 'klinik_pratama', '10000004', ${defaultKlinikClientId}, ${defaultKlinikSecretEnc}, 'staging', 'connected', ${nowIso}, 'Jl. Sudirman No. 88, Jakarta Selatan', '021-7788990', '445/008/Klinik-P/2025', true)
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
      is_active = EXCLUDED.is_active;
  `;

  // Seed Departments (Disinkronkan dengan UUID Lokasi Resmi SATUSEHAT Kemenkes)
  await sql`
    INSERT INTO departments (id, facility_id, name, room, quota, default_doctor_name, code, queue_prefix, satusehat_location_id, is_active)
    VALUES
      ('dept-rs-01', 'fac-rsud-01', 'Poli Penyakit Dalam', 'Ruang 204 (Lt. 2)', 35, 'dr. Syarifuddin, Sp.PD', 'INT', 'A', '3362d984-af65-43ac-8e5c-7db2b3be3f8b', true),
      ('dept-rs-02', 'fac-rsud-01', 'Poli Umum', 'Ruang 101 (Lt. 1)', 50, 'dr. Alexander', 'UMU', 'B', '79e96b97-b551-41bd-aadc-cb856a8ab332', true),
      ('dept-rs-03', 'fac-rsud-01', 'Poli Anak', 'Ruang 208 (Lt. 2)', 30, 'dr. Yoga Yandika, Sp.A', 'ANA', 'C', 'b017aa54-f1df-4429-b472-3e029619854e', true),
      ('dept-rs-04', 'fac-rsud-01', 'Poli Gigi & Mulut', 'Ruang 105 (Lt. 1)', 25, 'drg. Kevin Tanuwidjaja', 'GIG', 'D', '311defd2-ac8d-489b-a577-3703847b42b4', true),
      ('dept-rs-05', 'fac-rsud-01', 'Poli Jantung & Pembuluh Darah', 'Ruang 301 (Lt. 3)', 20, 'dr. Nicholas Evan, Sp.B', 'JAN', 'E', '4f17bb54-f1df-4429-b472-3e029619854f', true),
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

  // Purge legacy alias users if any
  await sql`DELETE FROM users WHERE id IN ('usr-admin-alias', 'usr-nurse-alias', 'usr-reg-alias', 'usr-pharm-alias');`;

  // Seed Users & Practitioners (Super Admin Vendor RME + Faskes Admins & Nakes)
  const hashedAdminPass = await hashPassword("admin123");
  const defaultPass = await hashPassword("password123");

  await sql`
    INSERT INTO users (id, facility_id, department_id, username, password_hash, name, role, sip, nik, ihs_practitioner_id, is_active)
    VALUES
      ('usr-superadmin', NULL, NULL, 'superadmin', ${hashedAdminPass}, 'Vendor RME Platform Super Admin', 'super_admin', NULL, NULL, NULL, true),
      ('usr-admin', 'fac-rsud-01', NULL, 'admin', ${hashedAdminPass}, 'Administrator RSUD Sehat Sejahtera', 'admin', NULL, NULL, NULL, true),
      ('usr-admin-klinik', 'fac-klinik-01', NULL, 'admin.klinik', ${hashedAdminPass}, 'Administrator Klinik Pratama', 'admin', NULL, NULL, NULL, true),
      ('usr-dr-rian', 'fac-rsud-01', 'dept-rs-01', 'dr.rian', ${defaultPass}, 'dr. Syarifuddin, Sp.PD', 'doctor', 'SIP.446/089/DS/Dinkes/2026', '3171071609900003', '10001354453', true),
      ('usr-nurse-siti', 'fac-rsud-01', 'dept-rs-01', 'ns.siti', ${defaultPass}, 'Sheila Annisa, S.Kep', 'nurse', 'SIP.446/102/SKEP/Dinkes/2026', '3313096403900009', '10014058550', true),
      ('usr-dr-alexander', 'fac-rsud-01', 'dept-rs-02', 'dr.alexander', ${defaultPass}, 'dr. Alexander', 'doctor', 'SIP.446/012/DU/Dinkes/2026', '7209061211900001', '10009880728', true),
      ('usr-dr-yoga', 'fac-rsud-01', 'dept-rs-03', 'dr.yoga', ${defaultPass}, 'dr. Yoga Yandika, Sp.A', 'doctor', 'SIP.446/033/SPA/Dinkes/2026', '3322071302900002', '10006926841', true),
      ('usr-dr-nicholas', 'fac-rsud-01', 'dept-rs-05', 'dr.nicholas', ${defaultPass}, 'dr. Nicholas Evan, Sp.B', 'doctor', 'SIP.446/044/SPB/Dinkes/2026', '3207192310600004', '10010910332', true),
      ('usr-dr-dito', 'fac-rsud-01', 'dept-rs-06', 'dr.dito', ${defaultPass}, 'dr. Dito Arifin, Sp.M', 'doctor', 'SIP.446/055/SPM/Dinkes/2026', '6408130207800005', '10018180913', true),
      ('usr-dr-olivia', 'fac-rsud-01', 'dept-rs-01', 'dr.olivia', ${defaultPass}, 'dr. Olivia Kirana, Sp.OG', 'doctor', 'SIP.446/066/SPOG/Dinkes/2026', '3217040109800006', '10002074224', true),
      ('usr-dr-alicia', 'fac-rsud-01', 'dept-rs-01', 'dr.alicia', ${defaultPass}, 'dr. Alicia Chrissy, Sp.N', 'doctor', 'SIP.446/077/SPN/Dinkes/2026', '3519111703800007', '10012572188', true),
      ('usr-dr-nathalie', 'fac-rsud-01', 'dept-rs-01', 'dr.nathalie', ${defaultPass}, 'dr. Nathalie Tan, Sp.PK', 'doctor', 'SIP.446/088/SPPK/Dinkes/2026', '5271002009700008', '10018452434', true),
      ('usr-apt-aditya', 'fac-rsud-01', 'dept-rs-01', 'apt.aditya', ${defaultPass}, 'apt. Aditya Pradhana, S.Farm.', 'pharmacy', 'SIPA.446/011/SIPA/Dinkes/2026', '3578083008700010', '10001915884', true)
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

  // 1.1 Seed Master Kamus Obat & Alkes KFA Kemenkes
  let medicationCount = 0;
  for (const med of KFA_MEDICATIONS_DATABASE) {
    const medId = `med-kfa-${med.kfaCode}`;
    await sql`
      INSERT INTO master_medications (
        id, kfa_code, name, generic_name, form, strength, route, category, unit,
        default_dosage, default_frequency, default_timing, stock, price, is_active
      ) VALUES (
        ${medId}, ${med.kfaCode}, ${med.name}, ${med.genericName}, ${med.form}, ${med.strength}, ${med.route || "Oral"}, ${med.category}, ${med.unit || "Tablet"},
        ${med.defaultDosage || null}, ${med.defaultFrequency || null}, ${med.defaultTiming || null}, 100, 0, true
      )
      ON CONFLICT (kfa_code) DO UPDATE SET
        name = EXCLUDED.name,
        generic_name = EXCLUDED.generic_name,
        form = EXCLUDED.form,
        strength = EXCLUDED.strength,
        category = EXCLUDED.category,
        updated_at = CURRENT_TIMESTAMP
    `;
    medicationCount++;
  }

  // 1.2 Seed Master Kamus Diagnosa ICD-10 Standar Kemenkes RI
  const COMMON_ICD10_LIST = [
    { code: "I10", display: "Essential (primary) hypertension", patientFriendlyName: "Hipertensi Primer", category: "Sistem Sirkulasi" },
    { code: "E11.9", display: "Type 2 diabetes mellitus without complications", patientFriendlyName: "Diabetes Melitus Tipe 2", category: "Endokrin & Metabolik" },
    { code: "J00", display: "Acute nasopharyngitis [common cold]", patientFriendlyName: "Nasofaringitis Akut (Flu/Batuk Pilek)", category: "Sistem Pernapasan" },
    { code: "J06.9", display: "Acute upper respiratory infection, unspecified", patientFriendlyName: "ISPA (Infeksi Saluran Pernapasan Akut)", category: "Sistem Pernapasan" },
    { code: "J02.9", display: "Acute pharyngitis, unspecified", patientFriendlyName: "Faringitis Akut (Radang Tenggorokan)", category: "Sistem Pernapasan" },
    { code: "K29.7", display: "Gastritis, unspecified", patientFriendlyName: "Gastritis (Maag)", category: "Sistem Pencernaan" },
    { code: "K30", display: "Functional dyspepsia", patientFriendlyName: "Dispepsia Fungsional", category: "Sistem Pencernaan" },
    { code: "K21.9", display: "Gastro-esophageal reflux disease without esophagitis", patientFriendlyName: "GERD (Penyakit Asam Lambung)", category: "Sistem Pencernaan" },
    { code: "M54.5", display: "Low back pain", patientFriendlyName: "Nyeri Punggung Bawah (LBP)", category: "Muskuloskeletal" },
    { code: "M79.1", display: "Myalgia", patientFriendlyName: "Nyeri Otot (Myalgia)", category: "Muskuloskeletal" },
    { code: "M17.9", display: "Osteoarthritis of knee, unspecified", patientFriendlyName: "Osteoartritis Lutut", category: "Muskuloskeletal" },
    { code: "R50.9", display: "Fever, unspecified", patientFriendlyName: "Demam Tanpa Penyebab Khusus", category: "Gejala & Tanda Klinis" },
    { code: "R53.83", display: "Other fatigue", patientFriendlyName: "Kelelahan Fisik Ringan", category: "Gejala & Tanda Klinis" },
    { code: "R51", display: "Headache", patientFriendlyName: "Sakit Kepala", category: "Gejala & Tanda Klinis" },
    { code: "A09", display: "Infectious gastroenteritis and colitis, unspecified", patientFriendlyName: "Diare dan Gastroenteritis Akut", category: "Penyakit Infeksi" },
    { code: "J45.9", display: "Other and unspecified asthma", patientFriendlyName: "Asma Bronkial", category: "Sistem Pernapasan" },
    { code: "E78.0", display: "Pure hypercholesterolaemia", patientFriendlyName: "Hiperkolesterolemia (Kolesterol Tinggi)", category: "Endokrin & Metabolik" },
    { code: "N39.0", display: "Urinary tract infection, site not specified", patientFriendlyName: "Infeksi Saluran Kemih (ISK)", category: "Sistem Genitourinaria" },
    { code: "N40", display: "Hyperplasia of prostate", patientFriendlyName: "BPH (Pembesaran Prostat Jinak)", category: "Sistem Genitourinaria" },
    { code: "L20.9", display: "Atopic dermatitis, unspecified", patientFriendlyName: "Dermatitis Atopik (Eksim Alergi)", category: "Penyakit Kulit" },
    { code: "B35.4", display: "Tinea corporis", patientFriendlyName: "Infeksi Jamur Kulit (Kurap)", category: "Penyakit Infeksi" },
    { code: "H52.1", display: "Myopia", patientFriendlyName: "Miopia (Rabun Jauh)", category: "Penyakit Mata" },
    { code: "K04.0", display: "Pulpitis", patientFriendlyName: "Pulpitis Gigi", category: "Kesehatan Gigi & Mulut" },
    { code: "I20.0", display: "Unstable angina", patientFriendlyName: "Angina Pektoris Tidak Stabil", category: "Sistem Sirkulasi" },
    { code: "Z00.0", display: "General medical examination", patientFriendlyName: "Pemeriksaan Kesehatan Umum (Medical Check-Up)", category: "Faktor Status Kesehatan" },
    { code: "Z38.0", display: "Single liveborn infant, born in hospital", patientFriendlyName: "Bayi Baru Lahir Tunggal di Rumah Sakit", category: "Perinatal & Bayi Baru Lahir" },
  ];

  let icd10Count = 0;
  for (const item of COMMON_ICD10_LIST) {
    await sql`
      INSERT INTO master_icd10 (id, code, display, patient_friendly_name, category, is_active)
      VALUES (${`icd10-${item.code.replace(".", "-")}`}, ${item.code}, ${item.display}, ${item.patientFriendlyName}, ${item.category}, true)
      ON CONFLICT (code) DO UPDATE SET
        display = EXCLUDED.display,
        patient_friendly_name = EXCLUDED.patient_friendly_name,
        category = EXCLUDED.category
    `;
    icd10Count++;
  }

  // 1.3 Seed Master Kamus Tindakan ICD-9-CM Standar Kemenkes RI
  const COMMON_ICD9_LIST = [
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
    { code: "96.54", display: "Dental scaling and prophylaxis", category: "Tindakan Gigi & Mulut" },
    { code: "95.02", display: "Comprehensive eye examination", category: "Pemeriksaan Kesehatan Mata" },
    { code: "99.55", display: "Prophylactic vaccination against other diseases", category: "Imunisasi & Vaksinasi" },
  ];

  let icd9Count = 0;
  for (const item of COMMON_ICD9_LIST) {
    await sql`
      INSERT INTO master_icd9 (id, code, display, category, is_active)
      VALUES (${`icd9-${item.code.replace(".", "-")}`}, ${item.code}, ${item.display}, ${item.category}, true)
      ON CONFLICT (code) DO UPDATE SET
        display = EXCLUDED.display,
        category = EXCLUDED.category
    `;
    icd9Count++;
  }

  // Lepaskan sementara konflik unique constraint MRN & NIK dari record pasien dummy lama
  await sql`UPDATE patients SET mrn = mrn || '-legacy', nik = nik || '-legacy' WHERE id LIKE 'P-%' AND NOT (mrn LIKE '%-legacy')`;

  const allPatients: PatientProfile[] = [
    MOCK_PATIENT,
    ...SAMPLE_PATIENTS.filter((p) => p.id !== MOCK_PATIENT.id),
  ];

  let patientCount = 0;
  for (const p of allPatients) {
    await sql`
      INSERT INTO patients (
        id, nik, mrn, ihs_number, name, gender, birth_date, phone, address, blood_type,
        allergies, emergency_contact_name, emergency_contact_relation, emergency_contact_phone,
        payment_payer, last_visit_date, last_visit_department, last_visit_doctor, last_visit_diagnosis,
        total_visits_count, satusehat_consent
      ) VALUES (
        ${p.id}, ${p.nik}, ${p.mrn}, ${p.ihsNumber || (p.id.startsWith("P") ? p.id : null)}, ${p.name}, ${p.gender}, ${p.birthDate}, ${p.phone}, ${p.address}, ${p.bloodType},
        ${JSON.stringify(p.allergies || [])}, ${p.emergencyContact?.name || "-"}, ${p.emergencyContact?.relation || "-"}, ${p.emergencyContact?.phone || "-"},
        ${p.paymentPayer || "BPJS Kesehatan"}, ${p.lastVisitDate || null}, ${p.lastVisitDepartment || null}, ${p.lastVisitDoctor || null}, ${p.lastVisitDiagnosis || null},
        ${p.totalVisitsCount || 1}, ${p.satusehatConsent || "opt-in"}
      )
      ON CONFLICT (id) DO UPDATE SET
        nik = EXCLUDED.nik,
        mrn = EXCLUDED.mrn,
        name = EXCLUDED.name,
        gender = EXCLUDED.gender,
        birth_date = EXCLUDED.birth_date,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        blood_type = EXCLUDED.blood_type,
        allergies = EXCLUDED.allergies,
        ihs_number = EXCLUDED.ihs_number,
        payment_payer = EXCLUDED.payment_payer,
        last_visit_date = EXCLUDED.last_visit_date,
        last_visit_department = EXCLUDED.last_visit_department,
        last_visit_doctor = EXCLUDED.last_visit_doctor,
        last_visit_diagnosis = EXCLUDED.last_visit_diagnosis,
        total_visits_count = EXCLUDED.total_visits_count,
        satusehat_consent = EXCLUDED.satusehat_consent,
        updated_at = CURRENT_TIMESTAMP
    `;
    patientCount++;
  }

  // Migrasikan relasi data encounters & queue_items lama ke pasien utama yang baru dan bersihkan record legacy
  await sql`UPDATE encounters SET patient_id = 'P02478375538' WHERE patient_id LIKE 'P-%'`;
  await sql`UPDATE queue_items SET patient_id = 'P02478375538' WHERE patient_id LIKE 'P-%'`;
  await sql`DELETE FROM patients WHERE id LIKE 'P-%'`;

  let encounterCount = 0;
  let vitalsCount = 0;
  let diagnosisCount = 0;
  let procedureCount = 0;
  let prescriptionCount = 0;
  let diagnosticOrderCount = 0;
  let labCount = 0;
  let radiologyCount = 0;
  let addendumCount = 0;
  let syncLogCount = 0;

  const validPatientIds = new Set(allPatients.map((p) => p.id));
  const fallbackPatientId = MOCK_PATIENT.id;

  for (const enc of ALL_SAMPLE_ENCOUNTERS) {
    const patientId = (enc.patientId && validPatientIds.has(enc.patientId))
      ? enc.patientId
      : fallbackPatientId;
    const facilityId = enc.facilityId || "fac-rsud-01";
    const deptId = enc.departmentId || (
      enc.clinicDepartment.includes("Penyakit Dalam") ? "dept-rs-01" :
      enc.clinicDepartment.includes("Umum") ? "dept-rs-02" :
      enc.clinicDepartment.includes("Anak") ? "dept-rs-03" :
      enc.clinicDepartment.includes("Gigi") ? "dept-rs-04" :
      enc.clinicDepartment.includes("Jantung") ? "dept-rs-05" :
      enc.clinicDepartment.includes("Mata") ? "dept-rs-06" : "dept-rs-02"
    );
    const doctorId = "usr-dr-rian";
    const isFinished = (enc.encounterStatus || "finished") === "finished";
    const isLocked = enc.isLocked !== undefined ? enc.isLocked : isFinished;
    const lockedAt = isLocked ? (enc.lockedAt || enc.visitDate) : null;
    const lockedBy = isLocked ? (enc.lockedBy || enc.doctorName) : null;

    await sql`
      INSERT INTO encounters (
        id, patient_id, facility_id, department_id, doctor_id, satusehat_encounter_id, visit_date, clinic_department,
        doctor_name, doctor_sip, doctor_ihs_id,
        chief_complaint, anamnesis, follow_up_instruction, next_visit_date, referred_to,
        discharge_disposition, encounter_status, queue_number, registration_number, consent_status,
        sync_status, synced_at, is_locked, locked_at, locked_by
      ) VALUES (
        ${enc.id}, ${patientId}, ${facilityId}, ${deptId}, ${doctorId}, ${enc.satusehatEncounterId || null}, ${enc.visitDate}, ${enc.clinicDepartment},
        ${enc.doctorName}, ${enc.doctorSip}, ${enc.doctorIhsId || "10001354453"},
        ${enc.chiefComplaint}, ${enc.anamnesis}, ${enc.followUpPlan?.instruction || "Kontrol rutin bila keluhan berlanjut."}, ${enc.followUpPlan?.nextVisitDate || null}, ${enc.followUpPlan?.referredTo || null},
        ${enc.dischargeDisposition || "Pulang Berobat Jalan"}, ${enc.encounterStatus || "finished"}, ${enc.queueNumber || null}, ${enc.registrationNumber || null}, ${enc.consentStatus || "opt-in"},
        ${enc.syncStatus || "synced"}, ${enc.syncedAt || enc.visitDate}, ${isLocked}, ${lockedAt}, ${lockedBy}
      )
      ON CONFLICT (id) DO UPDATE SET
        facility_id = EXCLUDED.facility_id,
        department_id = EXCLUDED.department_id,
        doctor_id = EXCLUDED.doctor_id,
        satusehat_encounter_id = EXCLUDED.satusehat_encounter_id,
        encounter_status = EXCLUDED.encounter_status,
        sync_status = EXCLUDED.sync_status,
        synced_at = EXCLUDED.synced_at,
        is_locked = EXCLUDED.is_locked,
        locked_at = EXCLUDED.locked_at,
        locked_by = EXCLUDED.locked_by,
        updated_at = CURRENT_TIMESTAMP
    `;
    encounterCount++;

    // Vitals
    if (enc.vitals) {
      await sql`
        INSERT INTO vitals (
          id, encounter_id, systolic, diastolic, heart_rate, temperature,
          respiratory_rate, oxygen_saturation, weight_kg, height_cm, bmi, physical_exam_notes
        ) VALUES (
          ${`vit-${enc.id}`}, ${enc.id}, ${enc.vitals.systolic}, ${enc.vitals.diastolic}, ${enc.vitals.heartRate}, ${enc.vitals.temperature},
          ${enc.vitals.respiratoryRate}, ${enc.vitals.oxygenSaturation}, ${enc.vitals.weightKg}, ${enc.vitals.heightCm}, ${enc.vitals.bmi || null}, ${enc.vitals.physicalExamNotes || null}
        )
        ON CONFLICT (id) DO UPDATE SET
          systolic = EXCLUDED.systolic,
          diastolic = EXCLUDED.diastolic,
          heart_rate = EXCLUDED.heart_rate,
          temperature = EXCLUDED.temperature
      `;
      vitalsCount++;
    }

    // Diagnoses
    if (enc.diagnoses && enc.diagnoses.length > 0) {
      for (let i = 0; i < enc.diagnoses.length; i++) {
        const d = enc.diagnoses[i];
        await sql`
          INSERT INTO diagnoses (
            id, encounter_id, type, code, display, patient_friendly_name, system, clinical_status
          ) VALUES (
            ${d.id || `diag-${enc.id}-${i}`}, ${enc.id}, ${d.type}, ${d.code}, ${d.display}, ${d.patientFriendlyName}, ${d.system || "http://hl7.org/fhir/sid/icd-10"}, ${d.clinicalStatus || "active"}
          ) ON CONFLICT (id) DO NOTHING
        `;
        diagnosisCount++;
      }
    }

    // Procedures
    if (enc.procedures && enc.procedures.length > 0) {
      for (let i = 0; i < enc.procedures.length; i++) {
        const p = enc.procedures[i];
        await sql`
          INSERT INTO procedures (
            id, encounter_id, code, display, category, notes
          ) VALUES (
            ${p.id || `proc-${enc.id}-${i}`}, ${enc.id}, ${p.code}, ${p.display}, ${p.category}, ${p.notes || null}
          ) ON CONFLICT (id) DO NOTHING
        `;
        procedureCount++;
      }
    }

    // Prescriptions
    if (enc.prescriptions && enc.prescriptions.length > 0) {
      for (let i = 0; i < enc.prescriptions.length; i++) {
        const m = enc.prescriptions[i];
        await sql`
          INSERT INTO prescriptions (
            id, encounter_id, kfa_code, medication_name, form, dosage, frequency, timing,
            morning, afternoon, evening, night, quantity, unit, duration_days, instructions
          ) VALUES (
            ${m.id || `rx-${enc.id}-${i}`}, ${enc.id}, ${m.kfaCode}, ${m.medicationName}, ${m.form}, ${m.dosage}, ${m.frequency}, ${m.timing},
            ${Boolean(m.schedule?.morning)}, ${Boolean(m.schedule?.afternoon)}, ${Boolean(m.schedule?.evening)}, ${Boolean(m.schedule?.night)},
            ${m.quantity}, ${m.unit}, ${m.durationDays}, ${m.instructions}
          ) ON CONFLICT (id) DO NOTHING
        `;
        prescriptionCount++;
      }
    }

    // Diagnostic Orders
    if (enc.diagnosticOrders && enc.diagnosticOrders.length > 0) {
      for (let i = 0; i < enc.diagnosticOrders.length; i++) {
        const o = enc.diagnosticOrders[i];
        await sql`
          INSERT INTO diagnostic_orders (
            id, encounter_id, test_code, test_name, category, status, priority, order_date, doctor_name, clinical_notes
          ) VALUES (
            ${o.id || `ord-${enc.id}-${i}`}, ${enc.id}, ${o.testCode}, ${o.testName}, ${o.category}, ${o.status}, ${o.priority}, ${o.orderDate}, ${o.doctorName}, ${o.clinicalNotes || null}
          ) ON CONFLICT (id) DO NOTHING
        `;
        diagnosticOrderCount++;
      }
    }

    // Lab Results
    if (enc.labResults && enc.labResults.length > 0) {
      for (let i = 0; i < enc.labResults.length; i++) {
        const lr = enc.labResults[i];
        await sql`
          INSERT INTO lab_results (
            id, encounter_id, test_code, test_name, category, value, unit, reference_range, flag, result_date, performer, notes
          ) VALUES (
            ${lr.id || `lab-${enc.id}-${i}`}, ${enc.id}, ${lr.testCode}, ${lr.testName}, ${lr.category}, ${String(lr.value)}, ${lr.unit}, ${lr.referenceRange}, ${lr.flag}, ${lr.resultDate}, ${lr.performer}, ${lr.notes || null}
          ) ON CONFLICT (id) DO NOTHING
        `;
        labCount++;
      }
    }

    // Radiology Results
    if (enc.radiologyResults && enc.radiologyResults.length > 0) {
      for (let i = 0; i < enc.radiologyResults.length; i++) {
        const rad = enc.radiologyResults[i];
        await sql`
          INSERT INTO radiology_results (
            id, encounter_id, exam_code, exam_name, modality, findings, conclusion, radiologist_name, result_date
          ) VALUES (
            ${rad.id || `rad-${enc.id}-${i}`}, ${enc.id}, ${rad.examCode}, ${rad.examName}, ${rad.modality}, ${rad.findings}, ${rad.conclusion}, ${rad.radiologistName}, ${rad.resultDate}
          ) ON CONFLICT (id) DO NOTHING
        `;
        radiologyCount++;
      }
    }

    // Addendums
    if (enc.addendums && enc.addendums.length > 0) {
      for (let i = 0; i < enc.addendums.length; i++) {
        const add = enc.addendums[i];
        await sql`
          INSERT INTO medical_addendums (
            id, encounter_id, timestamp, author_name, author_role, note_text
          ) VALUES (
            ${add.id || `add-${enc.id}-${i}`}, ${enc.id}, ${add.timestamp}, ${add.authorName}, ${add.authorRole}, ${add.noteText}
          ) ON CONFLICT (id) DO NOTHING
        `;
        addendumCount++;
      }
    }

    // Sync Logs
    if (enc.syncBreakdown && enc.syncBreakdown.length > 0) {
      for (let i = 0; i < enc.syncBreakdown.length; i++) {
        const sb = enc.syncBreakdown[i];
        await sql`
          INSERT INTO satusehat_sync_logs (
            id, encounter_id, resource_type, label, category, standard, status, http_status, fhir_id, error_message, retry_count, last_attempt, details
          ) VALUES (
            ${`sync-${enc.id}-${i}`}, ${enc.id}, ${sb.resourceType}, ${sb.label}, ${sb.category || null}, ${sb.standard}, ${sb.status}, ${sb.httpStatus || 201}, ${sb.fhirId || null}, ${sb.errorMessage || null}, ${sb.retryCount || 0}, ${sb.lastAttempt || enc.visitDate}, ${sb.details ? JSON.stringify(sb.details) : null}
          ) ON CONFLICT (id) DO NOTHING
        `;
        syncLogCount++;
      }
    }
  }

  // 3. Seed Queue Items
  let queueCount = 0;
  const todayStr = new Date().toISOString().split("T")[0];

  for (const q of INITIAL_WORKLIST) {
    // Ensure patient exists
    await sql`
      INSERT INTO patients (
        id, nik, mrn, ihs_number, name, gender, birth_date, phone, address, blood_type,
        allergies, emergency_contact_name, emergency_contact_relation, emergency_contact_phone,
        payment_payer, last_visit_date, last_visit_department, last_visit_doctor, last_visit_diagnosis,
        total_visits_count, satusehat_consent
      ) VALUES (
        ${q.patient.id}, ${q.patient.nik}, ${q.patient.mrn}, ${q.patient.ihsNumber || (q.patient.id.startsWith("P") ? q.patient.id : null)}, ${q.patient.name}, ${q.patient.gender}, ${q.patient.birthDate}, ${q.patient.phone}, ${q.patient.address}, ${q.patient.bloodType},
        ${JSON.stringify(q.patient.allergies || [])}, ${q.patient.emergencyContact?.name || "-"}, ${q.patient.emergencyContact?.relation || "-"}, ${q.patient.emergencyContact?.phone || "-"},
        ${q.patient.paymentPayer || "BPJS Kesehatan"}, ${q.patient.lastVisitDate || null}, ${q.patient.lastVisitDepartment || null}, ${q.patient.lastVisitDoctor || null}, ${q.patient.lastVisitDiagnosis || null},
        ${q.patient.totalVisitsCount || 1}, ${q.patient.satusehatConsent || "opt-in"}
      ) ON CONFLICT (id) DO UPDATE SET
        ihs_number = EXCLUDED.ihs_number,
        name = EXCLUDED.name
    `;

    const deptId = q.departmentId || (
      q.department.includes("Penyakit Dalam") ? "dept-rs-01" :
      q.department.includes("Umum") ? "dept-rs-02" :
      q.department.includes("Anak") ? "dept-rs-03" :
      q.department.includes("Gigi") ? "dept-rs-04" :
      q.department.includes("Jantung") ? "dept-rs-05" :
      q.department.includes("Mata") ? "dept-rs-06" : "dept-rs-02"
    );
    const doctorId = "usr-dr-rian";

    await sql`
      INSERT INTO queue_items (
        id, queue_number, registration_number, patient_id, department_id, doctor_id, encounter_id, department, doctor, room,
        arrival_time, arrival_timestamp, chief_complaint, status,
        satusehat_status, satusehat_consent, triage_priority, queue_date
      ) VALUES (
        ${q.id}, ${q.queueNumber}, ${q.registrationNumber || null}, ${q.patient.id}, ${deptId}, ${doctorId}, ${q.encounterId || null}, ${q.department}, ${q.doctor}, ${q.room},
        ${q.arrivalTime}, ${q.arrivalTimestamp || Date.now()}, ${q.chiefComplaint}, ${q.status},
        ${q.satusehatStatus}, ${q.satusehatConsent || "opt-in"}, ${q.triagePriority || "regular"}, ${todayStr}
      )
      ON CONFLICT (id) DO UPDATE SET
        department_id = EXCLUDED.department_id,
        doctor_id = EXCLUDED.doctor_id,
        encounter_id = EXCLUDED.encounter_id,
        status = EXCLUDED.status,
        satusehat_status = EXCLUDED.satusehat_status
    `;
    queueCount++;
  }

  const elapsed = Date.now() - startTime;

  console.log("==========================================================");
  console.log("✅ SEEDING POSTGRESQL BERHASIL SELESAI!");
  console.log(`⏱️  Waktu Eksekusi: ${elapsed} ms`);
  console.log("----------------------------------------------------------");
  console.log(`💊 Master Obat & Alkes KFA       : ${medicationCount} baris`);
  console.log(`📚 Master Kamus ICD-10           : ${icd10Count} baris`);
  console.log(`🩺 Master Kamus ICD-9-CM         : ${icd9Count} baris`);
  console.log(`👤 Pasien (Master Patient Index) : ${patientCount} baris`);
  console.log(`📋 Kunjungan RME (Encounters)    : ${encounterCount} baris`);
  console.log(`❤️  Tanda Vital (Vitals)          : ${vitalsCount} baris`);
  console.log(`🩺 Diagnosis ICD-10              : ${diagnosisCount} baris`);
  console.log(`🔪 Tindakan ICD-9-CM             : ${procedureCount} baris`);
  console.log(`💊 Resep Obat Elektronik (KFA)   : ${prescriptionCount} baris`);
  console.log(
    `🧪 Order Penunjang Diagnostik    : ${diagnosticOrderCount} baris`,
  );
  console.log(`🔬 Hasil Laboratorium (LOINC)    : ${labCount} baris`);
  console.log(`🩻 Hasil Radiologi & EKG         : ${radiologyCount} baris`);
  console.log(`📝 Catatan Addendum Rekam Medis  : ${addendumCount} baris`);
  console.log(`☁️  Log Audit FHIR SATUSEHAT     : ${syncLogCount} baris`);
  console.log(`🎟️  Antrean Poliklinik Hari Ini   : ${queueCount} baris`);
  console.log("==========================================================\n");
}

seedDatabase()
  .then(() => sql.end())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Gagal melakukan seeding database PostgreSQL:", err);
    sql.end().finally(() => process.exit(1));
  });
