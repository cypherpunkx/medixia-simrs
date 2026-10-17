import postgres from "postgres";

// ============================================================================
// SIMRS MEDIXIA & SATUSEHAT - RE-ENGINEERED DATABASE MIGRATION RUNNER
// Standar Kemenkes RI, Permenkes No. 24/2022, HL7 FHIR R4, ICD-10, ICD-9-CM & KFA
// Sinkronisasi 17 Tabel Relasional PostgreSQL & Atomic Sequences
// ============================================================================

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:admin@localhost:5432/medixia_simrs";

console.log("\n==========================================================");
console.log("🛠️  MEDIXIA SIMRS & SATUSEHAT DATABASE MIGRATION RUNNER");
console.log(`🔌 Target DB: ${connectionString.replace(/:[^:@]+@/, ":****@")}`);
console.log("==========================================================\n");

const client = postgres(connectionString, {
  max: 1,
  idle_timeout: 10,
  prepare: false,
  onnotice: () => {}, // Filter PostgreSQL notices agar terminal tetap bersih
});

export async function runMigrations(): Promise<void> {
  const startTime = Date.now();

  try {
    console.log("📦 1. Menerapkan DDL Skema 17 Tabel Relasional PostgreSQL...");

    await client.unsafe(`
      -- 1. Profil Faskes Multi-Tenant (Facilities)
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

      -- 2. Master Poliklinik & Ruang Pelayanan (Departments)
      CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY,
        facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE RESTRICT,
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

      -- 3. Akun Pengguna, Nakes, & RBAC (Users)
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

      -- 4. Master Profil Pasien (Patients / MPI)
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
        total_visits_count INTEGER DEFAULT 0,
        patient_status TEXT DEFAULT 'outpatient',
        inpatient_details TEXT,
        satusehat_consent TEXT DEFAULT 'opt-in',
        is_deleted BOOLEAN NOT NULL DEFAULT false,
        deleted_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- 5. Kunjungan Rawat Jalan / Rekam Medis (Encounters)
      CREATE TABLE IF NOT EXISTS encounters (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
        facility_id TEXT REFERENCES facilities(id) ON DELETE SET NULL,
        department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
        doctor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        satusehat_encounter_id TEXT,
        visit_date TEXT NOT NULL,
        clinic_department TEXT NOT NULL,
        doctor_name TEXT NOT NULL,
        doctor_sip TEXT NOT NULL,
        doctor_ihs_id TEXT DEFAULT '10001354453',
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
        is_deleted BOOLEAN NOT NULL DEFAULT false,
        deleted_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- 6. Tanda-Tanda Vital & Antropometri (Vitals)
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

      -- 7. Diagnosis Medis ICD-10 (Diagnoses)
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

      -- 8. Tindakan & Prosedur Medis ICD-9-CM (Procedures)
      CREATE TABLE IF NOT EXISTS procedures (
        id TEXT PRIMARY KEY,
        encounter_id TEXT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
        code TEXT NOT NULL,
        display TEXT NOT NULL,
        category TEXT NOT NULL,
        notes TEXT,
        satusehat_procedure_id TEXT
      );

      -- 9. Resep Obat Elektronik KFA & Telaah Farmasi (Prescriptions)
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
        satusehat_medication_id TEXT,
        dispense_status TEXT DEFAULT 'pending_review',
        reviewed_by TEXT,
        reviewed_at TEXT,
        prepared_by TEXT,
        prepared_at TEXT,
        dispensed_by TEXT,
        dispensed_at TEXT,
        satusehat_medication_dispense_id TEXT,
        etiquette_type TEXT DEFAULT 'white',
        batch_number TEXT,
        expiry_date TEXT,
        counseling_notes TEXT
      );

      -- 10. Order Penunjang Diagnostik Lab & Radiologi (Diagnostic Orders)
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

      -- 11. Hasil Pemeriksaan Laboratorium (Lab Results)
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

      -- 12. Hasil Pemeriksaan Radiologi & EKG (Radiology Results)
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

      -- 13. Catatan Tambahan Rekam Medis / CPPT (Medical Addendums)
      CREATE TABLE IF NOT EXISTS medical_addendums (
        id TEXT PRIMARY KEY,
        encounter_id TEXT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
        timestamp TEXT NOT NULL,
        author_name TEXT NOT NULL,
        author_role TEXT NOT NULL,
        note_text TEXT NOT NULL
      );

      -- 14. Antrean Poliklinik Hari Ini (Queue Items)
      CREATE TABLE IF NOT EXISTS queue_items (
        id TEXT PRIMARY KEY,
        queue_number TEXT NOT NULL,
        registration_number TEXT,
        patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
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
        payment_payer TEXT,
        called_at TEXT,
        call_count INTEGER DEFAULT 0,
        queue_date TEXT NOT NULL,
        is_sequential_multi_clinic BOOLEAN DEFAULT false,
        paused_reason TEXT
      );

      -- 15. Log Audit Sinkronisasi FHIR SATUSEHAT (Satusehat Sync Logs)
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

      -- 16. Antrean Outbox SATUSEHAT Resiliensi (Satusehat Outbox)
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

      -- 17. Master Kamus Farmasi & Alkes KFA Kemenkes (Master Medications)
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

      -- 18. Master Kamus Diagnosa ICD-10 Standar WHO / Kemenkes RI (Master ICD10)
      CREATE TABLE IF NOT EXISTS master_icd10 (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        display TEXT NOT NULL,
        patient_friendly_name TEXT NOT NULL,
        category TEXT DEFAULT 'Umum',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- 19. Master Kamus Tindakan ICD-9-CM Standar WHO / Kemenkes RI (Master ICD9)
      CREATE TABLE IF NOT EXISTS master_icd9 (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        display TEXT NOT NULL,
        category TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- 20. Kartu Mutasi Stok Farmasi (Stock Mutations & Audit Log)
      CREATE TABLE IF NOT EXISTS stock_mutations (
        id TEXT PRIMARY KEY,
        medication_id TEXT NOT NULL REFERENCES master_medications(id) ON DELETE RESTRICT,
        kfa_code TEXT NOT NULL,
        type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        stock_before INTEGER NOT NULL,
        stock_after INTEGER NOT NULL,
        reference_type TEXT DEFAULT 'prescription',
        reference_id TEXT,
        notes TEXT,
        created_by TEXT NOT NULL DEFAULT 'Apoteker',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ------------------------------------------------------------------------
    // Mutasi Skema Idempoten (Backward Compatibility untuk DB yang Sudah Berjalan)
    // ------------------------------------------------------------------------
    console.log("🔄 2. Menjalankan mutasi kolom skema secara idempoten...");
    await client.unsafe(`
      -- Users
      ALTER TABLE users ADD COLUMN IF NOT EXISTS nik TEXT UNIQUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS sip TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS ihs_practitioner_id TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

      -- Facilities
      ALTER TABLE facilities ADD COLUMN IF NOT EXISTS satusehat_client_id TEXT;
      ALTER TABLE facilities ADD COLUMN IF NOT EXISTS satusehat_client_secret_enc TEXT;
      ALTER TABLE facilities ADD COLUMN IF NOT EXISTS satusehat_env TEXT NOT NULL DEFAULT 'staging';
      ALTER TABLE facilities ADD COLUMN IF NOT EXISTS satusehat_status TEXT NOT NULL DEFAULT 'unverified';
      ALTER TABLE facilities ADD COLUMN IF NOT EXISTS satusehat_last_tested_at TEXT;

      -- Departments
      ALTER TABLE departments ADD COLUMN IF NOT EXISTS code TEXT DEFAULT '';
      ALTER TABLE departments ADD COLUMN IF NOT EXISTS queue_prefix TEXT DEFAULT 'A';
      ALTER TABLE departments ADD COLUMN IF NOT EXISTS satusehat_location_id TEXT;

      -- Patients
      ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_status TEXT DEFAULT 'outpatient';
      ALTER TABLE patients ADD COLUMN IF NOT EXISTS inpatient_details TEXT;
      ALTER TABLE patients ADD COLUMN IF NOT EXISTS ihs_number TEXT;
      ALTER TABLE patients ADD COLUMN IF NOT EXISTS payment_payer TEXT DEFAULT 'BPJS Kesehatan';
      ALTER TABLE patients ADD COLUMN IF NOT EXISTS satusehat_consent TEXT DEFAULT 'opt-in';

      -- Encounters
      ALTER TABLE encounters ADD COLUMN IF NOT EXISTS registration_number TEXT;
      ALTER TABLE encounters ADD COLUMN IF NOT EXISTS queue_number TEXT;
      ALTER TABLE encounters ADD COLUMN IF NOT EXISTS consent_status TEXT DEFAULT 'opt-in';
      ALTER TABLE encounters ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced';
      ALTER TABLE encounters ADD COLUMN IF NOT EXISTS synced_at TEXT;
      ALTER TABLE encounters ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
      ALTER TABLE encounters ADD COLUMN IF NOT EXISTS locked_at TEXT;
      ALTER TABLE encounters ADD COLUMN IF NOT EXISTS locked_by TEXT;
      ALTER TABLE encounters ADD COLUMN IF NOT EXISTS facility_id TEXT REFERENCES facilities(id) ON DELETE SET NULL;
      ALTER TABLE encounters ADD COLUMN IF NOT EXISTS department_id TEXT REFERENCES departments(id) ON DELETE SET NULL;
      ALTER TABLE encounters ADD COLUMN IF NOT EXISTS doctor_id TEXT REFERENCES users(id) ON DELETE SET NULL;

      -- Queue Items
      ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS registration_number TEXT;
      ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS triage_priority TEXT DEFAULT 'regular';
      ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS payment_payer TEXT;
      ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS is_sequential_multi_clinic BOOLEAN DEFAULT false;
      ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS paused_reason TEXT;
      ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS satusehat_consent TEXT DEFAULT 'opt-in';
      ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS satusehat_status TEXT NOT NULL DEFAULT 'synced';
      ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS called_at TEXT;
      ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS call_count INTEGER DEFAULT 0;

      -- Vitals
      ALTER TABLE vitals ADD COLUMN IF NOT EXISTS satusehat_bp_id TEXT;
      ALTER TABLE vitals ADD COLUMN IF NOT EXISTS satusehat_hr_id TEXT;
      ALTER TABLE vitals ADD COLUMN IF NOT EXISTS satusehat_temp_id TEXT;
      ALTER TABLE vitals ADD COLUMN IF NOT EXISTS satusehat_rr_id TEXT;
      ALTER TABLE vitals ADD COLUMN IF NOT EXISTS satusehat_spo2_id TEXT;
      ALTER TABLE vitals ADD COLUMN IF NOT EXISTS satusehat_weight_id TEXT;
      ALTER TABLE vitals ADD COLUMN IF NOT EXISTS satusehat_height_id TEXT;
      ALTER TABLE vitals ADD COLUMN IF NOT EXISTS satusehat_bmi_id TEXT;

      -- Diagnoses & Procedures
      ALTER TABLE diagnoses ADD COLUMN IF NOT EXISTS satusehat_condition_id TEXT;
      ALTER TABLE procedures ADD COLUMN IF NOT EXISTS satusehat_procedure_id TEXT;

      -- Prescriptions
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS satusehat_medication_request_id TEXT;
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS satusehat_medication_id TEXT;
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS satusehat_medication_dispense_id TEXT;
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS dispense_status TEXT DEFAULT 'pending_review';
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS reviewed_at TEXT;
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS prepared_by TEXT;
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS prepared_at TEXT;
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS dispensed_by TEXT;
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS dispensed_at TEXT;
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS etiquette_type TEXT DEFAULT 'white';
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS batch_number TEXT;
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS expiry_date TEXT;
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS counseling_notes TEXT;

      -- Diagnostic Orders, Lab & Rad
      ALTER TABLE diagnostic_orders ADD COLUMN IF NOT EXISTS satusehat_service_request_id TEXT;
      ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS satusehat_observation_id TEXT;
      ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS satusehat_diagnostic_report_id TEXT;
      ALTER TABLE radiology_results ADD COLUMN IF NOT EXISTS satusehat_observation_id TEXT;
      ALTER TABLE radiology_results ADD COLUMN IF NOT EXISTS satusehat_diagnostic_report_id TEXT;
    `);

    // ------------------------------------------------------------------------
    // Pembuatan Indeks Kinerja Query (B-Tree Query Optimizer)
    // ------------------------------------------------------------------------
    console.log("⚡ 3. Membangun indeks kinerja query (Query Optimization Indexes)...");
    await client.unsafe(`
      -- Facilities & Departments
      CREATE INDEX IF NOT EXISTS idx_facilities_type ON facilities(type);
      CREATE INDEX IF NOT EXISTS idx_facilities_active ON facilities(is_active);
      CREATE INDEX IF NOT EXISTS idx_facilities_satusehat_org ON facilities(satusehat_org_id);
      CREATE INDEX IF NOT EXISTS idx_departments_facility_id ON departments(facility_id);
      CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(is_active);
      CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(code);

      -- Users
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_nik ON users(nik);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_facility_id ON users(facility_id);

      -- Patients
      CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
      CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
      CREATE INDEX IF NOT EXISTS idx_patients_ihs_number ON patients(ihs_number);
      CREATE INDEX IF NOT EXISTS idx_patients_updated_at ON patients(updated_at);

      -- Encounters
      CREATE INDEX IF NOT EXISTS idx_encounters_patient_id ON encounters(patient_id);
      CREATE INDEX IF NOT EXISTS idx_encounters_facility_id ON encounters(facility_id);
      CREATE INDEX IF NOT EXISTS idx_encounters_department_id ON encounters(department_id);
      CREATE INDEX IF NOT EXISTS idx_encounters_doctor_id ON encounters(doctor_id);
      CREATE INDEX IF NOT EXISTS idx_encounters_visit_date ON encounters(visit_date);
      CREATE INDEX IF NOT EXISTS idx_encounters_queue_number ON encounters(queue_number);
      CREATE INDEX IF NOT EXISTS idx_encounters_reg_number ON encounters(registration_number);
      CREATE INDEX IF NOT EXISTS idx_encounters_status ON encounters(encounter_status);
      CREATE INDEX IF NOT EXISTS idx_encounters_sync_status ON encounters(sync_status);

      -- Vitals
      CREATE INDEX IF NOT EXISTS idx_vitals_encounter_id ON vitals(encounter_id);
      CREATE INDEX IF NOT EXISTS idx_vitals_satusehat_bp ON vitals(satusehat_bp_id);

      -- Diagnoses & Procedures
      CREATE INDEX IF NOT EXISTS idx_diagnoses_encounter_id ON diagnoses(encounter_id);
      CREATE INDEX IF NOT EXISTS idx_diagnoses_code ON diagnoses(code);
      CREATE INDEX IF NOT EXISTS idx_diagnoses_satusehat_id ON diagnoses(satusehat_condition_id);
      CREATE INDEX IF NOT EXISTS idx_procedures_encounter_id ON procedures(encounter_id);
      CREATE INDEX IF NOT EXISTS idx_procedures_satusehat_id ON procedures(satusehat_procedure_id);

      -- Prescriptions
      CREATE INDEX IF NOT EXISTS idx_prescriptions_encounter_id ON prescriptions(encounter_id);
      CREATE INDEX IF NOT EXISTS idx_prescriptions_kfa_code ON prescriptions(kfa_code);
      CREATE INDEX IF NOT EXISTS idx_prescriptions_satusehat_req_id ON prescriptions(satusehat_medication_request_id);
      CREATE INDEX IF NOT EXISTS idx_prescriptions_dispense_status ON prescriptions(dispense_status);

      -- Orders & Results
      CREATE INDEX IF NOT EXISTS idx_diagnostic_orders_encounter_id ON diagnostic_orders(encounter_id);
      CREATE INDEX IF NOT EXISTS idx_diagnostic_orders_satusehat_id ON diagnostic_orders(satusehat_service_request_id);
      CREATE INDEX IF NOT EXISTS idx_lab_results_encounter_id ON lab_results(encounter_id);
      CREATE INDEX IF NOT EXISTS idx_lab_results_satusehat_obs_id ON lab_results(satusehat_observation_id);
      CREATE INDEX IF NOT EXISTS idx_radiology_results_encounter_id ON radiology_results(encounter_id);
      CREATE INDEX IF NOT EXISTS idx_radiology_results_satusehat_id ON radiology_results(satusehat_diagnostic_report_id);
      CREATE INDEX IF NOT EXISTS idx_radiology_results_satusehat_obs_id ON radiology_results(satusehat_observation_id);
      CREATE INDEX IF NOT EXISTS idx_medical_addendums_encounter_id ON medical_addendums(encounter_id);

      -- Queue Items
      CREATE INDEX IF NOT EXISTS idx_queue_items_queue_date ON queue_items(queue_date);
      CREATE INDEX IF NOT EXISTS idx_queue_items_patient_id ON queue_items(patient_id);
      CREATE INDEX IF NOT EXISTS idx_queue_items_dept_id ON queue_items(department_id);
      CREATE INDEX IF NOT EXISTS idx_queue_items_doctor_id ON queue_items(doctor_id);
      CREATE INDEX IF NOT EXISTS idx_queue_items_enc_id ON queue_items(encounter_id);
      CREATE INDEX IF NOT EXISTS idx_queue_items_dept_date ON queue_items(department, queue_date);
      CREATE INDEX IF NOT EXISTS idx_queue_items_status ON queue_items(status);
      CREATE INDEX IF NOT EXISTS idx_queue_items_reg_number ON queue_items(registration_number);

      -- SATUSEHAT Logs & Outbox
      CREATE INDEX IF NOT EXISTS idx_sync_logs_encounter_id ON satusehat_sync_logs(encounter_id);
      CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON satusehat_sync_logs(status);
      CREATE INDEX IF NOT EXISTS idx_outbox_status_next_retry ON satusehat_outbox(status, next_retry_at);
      CREATE INDEX IF NOT EXISTS idx_outbox_encounter_id ON satusehat_outbox(encounter_id);

      -- Master Data & Stock Mutations
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

      CREATE INDEX IF NOT EXISTS idx_stock_mut_med_id ON stock_mutations(medication_id);
      CREATE INDEX IF NOT EXISTS idx_stock_mut_kfa ON stock_mutations(kfa_code);
      CREATE INDEX IF NOT EXISTS idx_stock_mut_created_at ON stock_mutations(created_at);
      CREATE INDEX IF NOT EXISTS idx_stock_mut_ref_id ON stock_mutations(reference_id);

      -- Soft Delete Columns & Resilient Indices Migration
      ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE patients ADD COLUMN IF NOT EXISTS deleted_at TEXT;
      CREATE INDEX IF NOT EXISTS idx_patients_is_deleted ON patients(is_deleted);

      ALTER TABLE encounters ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE encounters ADD COLUMN IF NOT EXISTS deleted_at TEXT;
      CREATE INDEX IF NOT EXISTS idx_encounters_is_deleted ON encounters(is_deleted);
    `);

    // ------------------------------------------------------------------------
    // Sequences Bisnis (Nomor Registrasi & Nomor Rekam Medis)
    // ------------------------------------------------------------------------
    console.log("🔢 4. Memverifikasi atomic sequences bisnis...");
    await client.unsafe(`
      CREATE SEQUENCE IF NOT EXISTS reg_number_seq START WITH 1 INCREMENT BY 1 CYCLE;
      CREATE SEQUENCE IF NOT EXISTS mrn_seq START WITH 100001 INCREMENT BY 1;
    `);

    const elapsed = Date.now() - startTime;
    console.log(`\n==========================================================`);
    console.log(`✅ MIGRASI DATABASE POSTGRESQL BERHASIL SELESAI (${elapsed}ms)!`);
    console.log(`🏛️  Total Tabel Terdefinisi : 20 tabel relasional`);
    console.log(`⚡ Total Indeks Terpasang   : 46 query indexes`);
    console.log(`🔢 Sequences Atomik         : reg_number_seq, mrn_seq`);
    console.log(`==========================================================\n`);
  } catch (err) {
    console.error("\n❌ Terjadi kesalahan saat migrasi database PostgreSQL:", err);
    throw err;
  } finally {
    await client.end();
  }
}

// Eksekusi bila dipanggil langsung via CLI
if (require.main === module || process.argv[1]?.includes("migrate")) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
