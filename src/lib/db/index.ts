import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import fs from "node:fs";
import path from "node:path";
import {
  MOCK_PATIENT,
  SAMPLE_PATIENTS,
  MOCK_ENCOUNTERS,
  ALL_SAMPLE_ENCOUNTERS,
  INITIAL_WORKLIST,
} from "@/lib/satusehat/mock-data";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "simrs_rme.db");

// Initialize Better-SQLite3 Database connection
const sqlite = new Database(DB_PATH);

// Enable WAL mode, NORMAL synchronous, Memory Mapping, and In-Memory Temp Store for maximum performance
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("synchronous = NORMAL");
sqlite.pragma("cache_size = -64000"); // 64 MB Page Cache in RAM
sqlite.pragma("mmap_size = 268435456"); // 256 MB Memory-Mapped I/O (zero-copy reads)
sqlite.pragma("temp_store = MEMORY"); // In-memory temp tables and sorts
sqlite.pragma("busy_timeout = 5000"); // Prevent SQLITE_BUSY under concurrency
sqlite.pragma("foreign_keys = ON");

// Initialize Drizzle ORM
export const db = drizzle(sqlite, { schema });

// Auto-migrate tables on boot
function initTables() {
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

    -- Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
    CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
    CREATE INDEX IF NOT EXISTS idx_patients_updated_at ON patients(updated_at);

    CREATE INDEX IF NOT EXISTS idx_encounters_patient_id ON encounters(patient_id);
    CREATE INDEX IF NOT EXISTS idx_encounters_visit_date ON encounters(visit_date);
    CREATE INDEX IF NOT EXISTS idx_encounters_queue_number ON encounters(queue_number);
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
    CREATE INDEX IF NOT EXISTS idx_queue_items_dept_date ON queue_items(department, queue_date);
    CREATE INDEX IF NOT EXISTS idx_queue_items_status ON queue_items(status);

    CREATE INDEX IF NOT EXISTS idx_sync_logs_encounter_id ON satusehat_sync_logs(encounter_id);
    CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON satusehat_sync_logs(status);
  `);
}

// Seed initial hospital dataset if empty or upgrade missing patient encounters
function seedIfEmpty() {
  // 1. Seed Patients (MOCK_PATIENT + SAMPLE_PATIENTS)
  const allPatients = [MOCK_PATIENT, ...SAMPLE_PATIENTS.filter((p) => p.id !== MOCK_PATIENT.id)];
  const insertPatient = sqlite.prepare(`
    INSERT OR IGNORE INTO patients (
      id, nik, mrn, name, gender, birth_date, phone, address, blood_type,
      allergies, emergency_contact_name, emergency_contact_relation, emergency_contact_phone,
      payment_payer, last_visit_date, last_visit_department, last_visit_doctor, last_visit_diagnosis,
      total_visits_count, satusehat_consent
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?
    )
  `);

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
  }

  // 2. Seed Encounters
  const insertEncounter = sqlite.prepare(`
    INSERT OR IGNORE INTO encounters (
      id, patient_id, satusehat_encounter_id, visit_date, clinic_department,
      doctor_name, doctor_sip, doctor_ihs_id, hospital_name, hospital_org_id,
      chief_complaint, anamnesis, follow_up_instruction, next_visit_date, referred_to,
      discharge_disposition, encounter_status, queue_number, consent_status,
      sync_status, synced_at, is_locked, locked_at, locked_by
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `);

  const insertVitals = sqlite.prepare(`
    INSERT OR REPLACE INTO vitals (
      id, encounter_id, systolic, diastolic, heart_rate, temperature,
      respiratory_rate, oxygen_saturation, weight_kg, height_cm, bmi, physical_exam_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDiagnosis = sqlite.prepare(`
    INSERT OR IGNORE INTO diagnoses (
      id, encounter_id, type, code, display, patient_friendly_name, system, clinical_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertProcedure = sqlite.prepare(`
    INSERT OR IGNORE INTO procedures (
      id, encounter_id, code, display, category, notes
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertPrescription = sqlite.prepare(`
    INSERT OR IGNORE INTO prescriptions (
      id, encounter_id, kfa_code, medication_name, form, dosage, frequency, timing,
      morning, afternoon, evening, night, quantity, unit, duration_days, instructions
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDiagnosticOrder = sqlite.prepare(`
    INSERT OR IGNORE INTO diagnostic_orders (
      id, encounter_id, test_code, test_name, category, status, priority, order_date, doctor_name, clinical_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLabResult = sqlite.prepare(`
    INSERT OR IGNORE INTO lab_results (
      id, encounter_id, test_code, test_name, category, value, unit, reference_range, flag, result_date, performer, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertRadiologyResult = sqlite.prepare(`
    INSERT OR IGNORE INTO radiology_results (
      id, encounter_id, exam_code, exam_name, modality, findings, conclusion, radiologist_name, result_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSyncLog = sqlite.prepare(`
    INSERT OR IGNORE INTO satusehat_sync_logs (
      id, encounter_id, resource_type, label, category, standard, status, http_status, fhir_id, error_message, retry_count, last_attempt, details
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

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
    }

    // Diagnoses
    if (enc.diagnoses) {
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
      });
    }

    // Procedures
    if (enc.procedures) {
      enc.procedures.forEach((p, idx) => {
        insertProcedure.run(
          p.id || `proc-${enc.id}-${idx}`,
          enc.id,
          p.code,
          p.display,
          p.category,
          p.notes || null
        );
      });
    }

    // Prescriptions
    if (enc.prescriptions) {
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
      });
    }

    // Diagnostic Orders
    if (enc.diagnosticOrders) {
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
      });
    }

    // Lab Results
    if (enc.labResults) {
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
      });
    }

    // Radiology Results
    if (enc.radiologyResults) {
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
      });
    }

    // Sync Breakdown Logs
    if (enc.syncBreakdown) {
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
      });
    }
  }

  // 3. Seed Queue Items
  const insertQueue = sqlite.prepare(`
    INSERT OR IGNORE INTO queue_items (
      id, queue_number, patient_id, department, doctor, room,
      arrival_time, arrival_timestamp, chief_complaint, status,
      satusehat_status, satusehat_consent, triage_priority, queue_date
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  const todayStr = new Date().toISOString().split("T")[0];

  for (const q of INITIAL_WORKLIST) {
    // Ensure patient exists in DB
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
  }
}

// Execute Table Initialization & Seeding
initTables();
seedIfEmpty();
