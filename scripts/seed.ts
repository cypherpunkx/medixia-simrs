import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import {
  MOCK_PATIENT,
  SAMPLE_PATIENTS,
  MOCK_ENCOUNTERS,
  ALL_SAMPLE_ENCOUNTERS,
  INITIAL_WORKLIST,
} from "../src/lib/satusehat/mock-data";
import {
  PatientProfile,
  OutpatientEncounter,
  ClinicQueuePatientItem,
} from "../src/lib/satusehat/types";

// ============================================================================
// SIMRS & SATUSEHAT RME COMPREHENSIVE DATABASE SEEDER
// Standar Kemenkes RI, FHIR HL7 R4, ICD-10, ICD-9-CM, & KFA
// ============================================================================

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "simrs_rme.db");
const isFresh = process.argv.includes("--fresh") || process.argv.includes("--reset") || process.argv.includes("-f");

console.log("\n==========================================================");
console.log("🏥 SIMRS & SATUSEHAT RME DATABASE SEEDER");
console.log(`📁 Lokasi Database: ${DB_PATH}`);
console.log(`⚙️  Mode: ${isFresh ? "FRESH RESET (--fresh)" : "UPSERT & SYNC"}`);
console.log("==========================================================\n");

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// 1. Table Schema Definitions (12 Relational Tables)
function createTables() {
  if (isFresh) {
    console.log("🧹 Membersihkan tabel-tabel lama (Drop Tables)...");
    sqlite.exec(`
      PRAGMA foreign_keys = OFF;
      DROP TABLE IF EXISTS satusehat_sync_logs;
      DROP TABLE IF EXISTS queue_items;
      DROP TABLE IF EXISTS medical_addendums;
      DROP TABLE IF EXISTS radiology_results;
      DROP TABLE IF EXISTS lab_results;
      DROP TABLE IF EXISTS diagnostic_orders;
      DROP TABLE IF EXISTS prescriptions;
      DROP TABLE IF EXISTS procedures;
      DROP TABLE IF EXISTS diagnoses;
      DROP TABLE IF EXISTS vitals;
      DROP TABLE IF EXISTS encounters;
      DROP TABLE IF EXISTS patients;
      PRAGMA foreign_keys = ON;
    `);
  }

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      nik TEXT NOT NULL UNIQUE,
      mrn TEXT NOT NULL UNIQUE,
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
      satusehat_consent TEXT DEFAULT 'opt-in',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS encounters (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      satusehat_encounter_id TEXT,
      visit_date TEXT NOT NULL,
      clinic_department TEXT NOT NULL,
      doctor_name TEXT NOT NULL,
      doctor_sip TEXT NOT NULL,
      doctor_ihs_id TEXT DEFAULT 'N10009841',
      hospital_name TEXT NOT NULL DEFAULT 'RS Umum Daerah Sehat Sejahtera',
      hospital_org_id TEXT NOT NULL DEFAULT '10000004',
      chief_complaint TEXT NOT NULL,
      anamnesis TEXT NOT NULL,
      follow_up_instruction TEXT NOT NULL,
      next_visit_date TEXT,
      referred_to TEXT,
      discharge_disposition TEXT DEFAULT 'Pulang Berobat Jalan',
      encounter_status TEXT DEFAULT 'finished',
      queue_number TEXT,
      consent_status TEXT DEFAULT 'opt-in',
      sync_status TEXT DEFAULT 'synced',
      synced_at TEXT,
      is_locked INTEGER DEFAULT 0,
      locked_at TEXT,
      locked_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vitals (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL REFERENCES encounters(id),
      systolic INTEGER NOT NULL,
      diastolic INTEGER NOT NULL,
      heart_rate INTEGER NOT NULL,
      temperature REAL NOT NULL,
      respiratory_rate INTEGER NOT NULL,
      oxygen_saturation INTEGER NOT NULL,
      weight_kg REAL NOT NULL,
      height_cm REAL NOT NULL,
      bmi REAL,
      physical_exam_notes TEXT
    );

    CREATE TABLE IF NOT EXISTS diagnoses (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL REFERENCES encounters(id),
      type TEXT NOT NULL,
      code TEXT NOT NULL,
      display TEXT NOT NULL,
      patient_friendly_name TEXT NOT NULL,
      system TEXT DEFAULT 'http://hl7.org/fhir/sid/icd-10',
      clinical_status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS procedures (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL REFERENCES encounters(id),
      code TEXT NOT NULL,
      display TEXT NOT NULL,
      category TEXT NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS prescriptions (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL REFERENCES encounters(id),
      kfa_code TEXT NOT NULL,
      medication_name TEXT NOT NULL,
      form TEXT NOT NULL,
      dosage TEXT NOT NULL,
      frequency TEXT NOT NULL,
      timing TEXT NOT NULL,
      morning INTEGER DEFAULT 0,
      afternoon INTEGER DEFAULT 0,
      evening INTEGER DEFAULT 0,
      night INTEGER DEFAULT 0,
      quantity INTEGER NOT NULL,
      unit TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      instructions TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS diagnostic_orders (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL REFERENCES encounters(id),
      test_code TEXT NOT NULL,
      test_name TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ordered',
      priority TEXT NOT NULL DEFAULT 'routine',
      order_date TEXT NOT NULL,
      doctor_name TEXT NOT NULL,
      clinical_notes TEXT
    );

    CREATE TABLE IF NOT EXISTS lab_results (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL REFERENCES encounters(id),
      test_code TEXT NOT NULL,
      test_name TEXT NOT NULL,
      category TEXT NOT NULL,
      value TEXT NOT NULL,
      unit TEXT NOT NULL,
      reference_range TEXT NOT NULL,
      flag TEXT NOT NULL,
      result_date TEXT NOT NULL,
      performer TEXT NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS radiology_results (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL REFERENCES encounters(id),
      exam_code TEXT NOT NULL,
      exam_name TEXT NOT NULL,
      modality TEXT NOT NULL,
      findings TEXT NOT NULL,
      conclusion TEXT NOT NULL,
      radiologist_name TEXT NOT NULL,
      result_date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS medical_addendums (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL REFERENCES encounters(id),
      timestamp TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_role TEXT NOT NULL,
      note_text TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS queue_items (
      id TEXT PRIMARY KEY,
      queue_number TEXT NOT NULL,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      department TEXT NOT NULL,
      doctor TEXT NOT NULL,
      room TEXT NOT NULL,
      arrival_time TEXT NOT NULL,
      arrival_timestamp INTEGER,
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
      encounter_id TEXT NOT NULL REFERENCES encounters(id),
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
  `);
}

// 2. Main Seeder Execution
function seedDatabase() {
  const startTime = Date.now();
  createTables();

  console.log("⏳ Memulai pengisian data klinis SIMRS & SATUSEHAT...\n");

  const insertPatient = sqlite.prepare(`
    INSERT OR REPLACE INTO patients (
      id, nik, mrn, name, gender, birth_date, phone, address, blood_type,
      allergies, emergency_contact_name, emergency_contact_relation, emergency_contact_phone,
      payment_payer, last_visit_date, last_visit_department, last_visit_doctor, last_visit_diagnosis,
      total_visits_count, satusehat_consent, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, datetime('now'), datetime('now')
    )
  `);

  const insertEncounter = sqlite.prepare(`
    INSERT OR REPLACE INTO encounters (
      id, patient_id, satusehat_encounter_id, visit_date, clinic_department,
      doctor_name, doctor_sip, doctor_ihs_id, hospital_name, hospital_org_id,
      chief_complaint, anamnesis, follow_up_instruction, next_visit_date, referred_to,
      discharge_disposition, encounter_status, queue_number, consent_status,
      sync_status, synced_at, is_locked, locked_at, locked_by, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, datetime('now'), datetime('now')
    )
  `);

  const insertVitals = sqlite.prepare(`
    INSERT OR REPLACE INTO vitals (
      id, encounter_id, systolic, diastolic, heart_rate, temperature,
      respiratory_rate, oxygen_saturation, weight_kg, height_cm, bmi, physical_exam_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDiagnosis = sqlite.prepare(`
    INSERT OR REPLACE INTO diagnoses (
      id, encounter_id, type, code, display, patient_friendly_name, system, clinical_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertProcedure = sqlite.prepare(`
    INSERT OR REPLACE INTO procedures (
      id, encounter_id, code, display, category, notes
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertPrescription = sqlite.prepare(`
    INSERT OR REPLACE INTO prescriptions (
      id, encounter_id, kfa_code, medication_name, form, dosage, frequency, timing,
      morning, afternoon, evening, night, quantity, unit, duration_days, instructions
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDiagnosticOrder = sqlite.prepare(`
    INSERT OR REPLACE INTO diagnostic_orders (
      id, encounter_id, test_code, test_name, category, status, priority, order_date, doctor_name, clinical_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLabResult = sqlite.prepare(`
    INSERT OR REPLACE INTO lab_results (
      id, encounter_id, test_code, test_name, category, value, unit, reference_range, flag, result_date, performer, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertRadiologyResult = sqlite.prepare(`
    INSERT OR REPLACE INTO radiology_results (
      id, encounter_id, exam_code, exam_name, modality, findings, conclusion, radiologist_name, result_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAddendum = sqlite.prepare(`
    INSERT OR REPLACE INTO medical_addendums (
      id, encounter_id, timestamp, author_name, author_role, note_text
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertQueue = sqlite.prepare(`
    INSERT OR REPLACE INTO queue_items (
      id, queue_number, patient_id, department, doctor, room,
      arrival_time, arrival_timestamp, chief_complaint, status,
      satusehat_status, satusehat_consent, triage_priority, queue_date
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  const insertSyncLog = sqlite.prepare(`
    INSERT OR REPLACE INTO satusehat_sync_logs (
      id, encounter_id, resource_type, label, category, standard, status, http_status, fhir_id, error_message, retry_count, last_attempt, details
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Transaction for batch atomicity & high performance
  const seedTransaction = sqlite.transaction(() => {
    // 1. Seed All Master Patients
    const allPatients: PatientProfile[] = [
      MOCK_PATIENT,
      ...SAMPLE_PATIENTS.filter((p) => p.id !== MOCK_PATIENT.id),
    ];

    let patientCount = 0;
    for (const p of allPatients) {
      insertPatient.run(
        p.id,
        p.nik,
        p.mrn,
        p.name,
        p.gender,
        p.birthDate,
        p.phone,
        p.address,
        p.bloodType,
        JSON.stringify(p.allergies || []),
        p.emergencyContact?.name || "-",
        p.emergencyContact?.relation || "-",
        p.emergencyContact?.phone || "-",
        p.paymentPayer || "BPJS Kesehatan",
        p.lastVisitDate || null,
        p.lastVisitDepartment || null,
        p.lastVisitDoctor || null,
        p.lastVisitDiagnosis || null,
        p.totalVisitsCount || 1,
        p.satusehatConsent || "opt-in"
      );
      patientCount++;
    }

    // 2. Seed All Encounters and Clinical Sub-records
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

    for (const enc of ALL_SAMPLE_ENCOUNTERS) {
      const patientId = enc.patientId || MOCK_PATIENT.id;
      insertEncounter.run(
        enc.id,
        patientId,
        enc.satusehatEncounterId || null,
        enc.visitDate,
        enc.clinicDepartment,
        enc.doctorName,
        enc.doctorSip,
        enc.doctorIhsId || "N10009841",
        enc.hospitalName,
        enc.hospitalOrgId,
        enc.chiefComplaint,
        enc.anamnesis,
        enc.followUpPlan?.instruction || "Kontrol rutin bila keluhan berlanjut.",
        enc.followUpPlan?.nextVisitDate || null,
        enc.followUpPlan?.referredTo || null,
        enc.dischargeDisposition || "Pulang Berobat Jalan",
        enc.encounterStatus || "finished",
        enc.queueNumber || null,
        enc.consentStatus || "opt-in",
        enc.syncStatus || "synced",
        enc.syncedAt || enc.visitDate,
        enc.isLocked ? 1 : 0,
        enc.lockedAt || null,
        enc.lockedBy || null
      );
      encounterCount++;

      // Vitals
      if (enc.vitals) {
        insertVitals.run(
          `vit-${enc.id}`,
          enc.id,
          enc.vitals.systolic,
          enc.vitals.diastolic,
          enc.vitals.heartRate,
          enc.vitals.temperature,
          enc.vitals.respiratoryRate,
          enc.vitals.oxygenSaturation,
          enc.vitals.weightKg,
          enc.vitals.heightCm,
          enc.vitals.bmi || null,
          enc.vitals.physicalExamNotes || null
        );
        vitalsCount++;
      }

      // Diagnoses
      if (enc.diagnoses && enc.diagnoses.length > 0) {
        enc.diagnoses.forEach((d, idx) => {
          insertDiagnosis.run(
            d.id || `diag-${enc.id}-${idx}`,
            enc.id,
            d.type,
            d.code,
            d.display,
            d.patientFriendlyName,
            d.system || "http://hl7.org/fhir/sid/icd-10",
            d.clinicalStatus || "active"
          );
          diagnosisCount++;
        });
      }

      // Procedures
      if (enc.procedures && enc.procedures.length > 0) {
        enc.procedures.forEach((p, idx) => {
          insertProcedure.run(
            p.id || `proc-${enc.id}-${idx}`,
            enc.id,
            p.code,
            p.display,
            p.category,
            p.notes || null
          );
          procedureCount++;
        });
      }

      // Prescriptions
      if (enc.prescriptions && enc.prescriptions.length > 0) {
        enc.prescriptions.forEach((m, idx) => {
          insertPrescription.run(
            m.id || `rx-${enc.id}-${idx}`,
            enc.id,
            m.kfaCode,
            m.medicationName,
            m.form,
            m.dosage,
            m.frequency,
            m.timing,
            m.schedule?.morning ? 1 : 0,
            m.schedule?.afternoon ? 1 : 0,
            m.schedule?.evening ? 1 : 0,
            m.schedule?.night ? 1 : 0,
            m.quantity,
            m.unit,
            m.durationDays,
            m.instructions
          );
          prescriptionCount++;
        });
      }

      // Diagnostic Orders
      if (enc.diagnosticOrders && enc.diagnosticOrders.length > 0) {
        enc.diagnosticOrders.forEach((o, idx) => {
          insertDiagnosticOrder.run(
            o.id || `ord-${enc.id}-${idx}`,
            enc.id,
            o.testCode,
            o.testName,
            o.category,
            o.status,
            o.priority,
            o.orderDate,
            o.doctorName,
            o.clinicalNotes || null
          );
          diagnosticOrderCount++;
        });
      }

      // Lab Results
      if (enc.labResults && enc.labResults.length > 0) {
        enc.labResults.forEach((lr, idx) => {
          insertLabResult.run(
            lr.id || `lab-${enc.id}-${idx}`,
            enc.id,
            lr.testCode,
            lr.testName,
            lr.category,
            String(lr.value),
            lr.unit,
            lr.referenceRange,
            lr.flag,
            lr.resultDate,
            lr.performer,
            lr.notes || null
          );
          labCount++;
        });
      }

      // Radiology Results
      if (enc.radiologyResults && enc.radiologyResults.length > 0) {
        enc.radiologyResults.forEach((rad, idx) => {
          insertRadiologyResult.run(
            rad.id || `rad-${enc.id}-${idx}`,
            enc.id,
            rad.examCode,
            rad.examName,
            rad.modality,
            rad.findings,
            rad.conclusion,
            rad.radiologistName,
            rad.resultDate
          );
          radiologyCount++;
        });
      }

      // Addendums
      if (enc.addendums && enc.addendums.length > 0) {
        enc.addendums.forEach((add, idx) => {
          insertAddendum.run(
            add.id || `add-${enc.id}-${idx}`,
            enc.id,
            add.timestamp,
            add.authorName,
            add.authorRole,
            add.noteText
          );
          addendumCount++;
        });
      }

      // Sync Logs
      if (enc.syncBreakdown && enc.syncBreakdown.length > 0) {
        enc.syncBreakdown.forEach((sb, idx) => {
          insertSyncLog.run(
            `sync-${enc.id}-${idx}`,
            enc.id,
            sb.resourceType,
            sb.label,
            sb.category || null,
            sb.standard,
            sb.status,
            sb.httpStatus || 201,
            sb.fhirId || null,
            sb.errorMessage || null,
            sb.retryCount || 0,
            sb.lastAttempt || enc.visitDate,
            sb.details ? JSON.stringify(sb.details) : null
          );
          syncLogCount++;
        });
      }
    }

    // 3. Seed Worklist Queue Items
    let queueCount = 0;
    const todayStr = new Date().toISOString().split("T")[0];

    for (const q of INITIAL_WORKLIST) {
      // Ensure patient is present
      insertPatient.run(
        q.patient.id,
        q.patient.nik,
        q.patient.mrn,
        q.patient.name,
        q.patient.gender,
        q.patient.birthDate,
        q.patient.phone,
        q.patient.address,
        q.patient.bloodType,
        JSON.stringify(q.patient.allergies || []),
        q.patient.emergencyContact?.name || "-",
        q.patient.emergencyContact?.relation || "-",
        q.patient.emergencyContact?.phone || "-",
        q.patient.paymentPayer || "BPJS Kesehatan",
        q.patient.lastVisitDate || null,
        q.patient.lastVisitDepartment || null,
        q.patient.lastVisitDoctor || null,
        q.patient.lastVisitDiagnosis || null,
        q.patient.totalVisitsCount || 1,
        q.patient.satusehatConsent || "opt-in"
      );

      insertQueue.run(
        q.id,
        q.queueNumber,
        q.patient.id,
        q.department,
        q.doctor,
        q.room,
        q.arrivalTime,
        q.arrivalTimestamp || Date.now(),
        q.chiefComplaint,
        q.status,
        q.satusehatStatus,
        q.satusehatConsent || "opt-in",
        q.triagePriority || "regular",
        todayStr
      );
      queueCount++;
    }

    return {
      patientCount,
      encounterCount,
      vitalsCount,
      diagnosisCount,
      procedureCount,
      prescriptionCount,
      diagnosticOrderCount,
      labCount,
      radiologyCount,
      addendumCount,
      syncLogCount,
      queueCount,
    };
  });

  const stats = seedTransaction();
  const elapsed = Date.now() - startTime;

  console.log("==========================================================");
  console.log("✅ SEEDING BERHASIL SELESAI!");
  console.log(`⏱️  Waktu Eksekusi: ${elapsed} ms`);
  console.log("----------------------------------------------------------");
  console.log(`👤 Pasien (Master Patient Index) : ${stats.patientCount} baris`);
  console.log(`📋 Kunjungan RME (Encounters)    : ${stats.encounterCount} baris`);
  console.log(`❤️  Tanda Vital (Vitals)          : ${stats.vitalsCount} baris`);
  console.log(`🩺 Diagnosis ICD-10              : ${stats.diagnosisCount} baris`);
  console.log(`🔪 Tindakan ICD-9-CM             : ${stats.procedureCount} baris`);
  console.log(`💊 Resep Obat Elektronik (KFA)   : ${stats.prescriptionCount} baris`);
  console.log(`🧪 Order Penunjang Diagnostik    : ${stats.diagnosticOrderCount} baris`);
  console.log(`🔬 Hasil Laboratorium (LOINC)    : ${stats.labCount} baris`);
  console.log(`🩻 Hasil Radiologi & EKG         : ${stats.radiologyCount} baris`);
  console.log(`📝 Catatan Addendum Rekam Medis  : ${stats.addendumCount} baris`);
  console.log(`☁️  Log Audit FHIR SATUSEHAT     : ${stats.syncLogCount} baris`);
  console.log(`🎟️  Antrean Poliklinik Hari Ini   : ${stats.queueCount} baris`);
  console.log("==========================================================\n");
}

try {
  seedDatabase();
  sqlite.close();
  process.exit(0);
} catch (err) {
  console.error("\n❌ Gagal melakukan seeding database:", err);
  sqlite.close();
  process.exit(1);
}
