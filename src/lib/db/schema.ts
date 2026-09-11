import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

// 1. Master Data Pasien (Patient Profile)
export const patients = sqliteTable(
  "patients",
  {
    id: text("id").primaryKey(), // SATUSEHAT Patient ID or Local ID (e.g. "P-10002891902")
    nik: text("nik").notNull().unique(), // NIK KTP (16 digit)
    mrn: text("mrn").notNull().unique(), // No. Rekam Medis RS
    name: text("name").notNull(),
    gender: text("gender").notNull(), // "male" | "female"
    birthDate: text("birth_date").notNull(), // YYYY-MM-DD
    phone: text("phone").notNull(),
    address: text("address").notNull(),
    bloodType: text("blood_type").notNull(), // "A" | "B" | "AB" | "O"
    allergies: text("allergies").notNull().default("[]"), // JSON string array
    emergencyContactName: text("emergency_contact_name").notNull(),
    emergencyContactRelation: text("emergency_contact_relation").notNull(),
    emergencyContactPhone: text("emergency_contact_phone").notNull(),
    paymentPayer: text("payment_payer").default("BPJS Kesehatan"),
    lastVisitDate: text("last_visit_date"),
    lastVisitDepartment: text("last_visit_department"),
    lastVisitDoctor: text("last_visit_doctor"),
    lastVisitDiagnosis: text("last_visit_diagnosis"),
    totalVisitsCount: integer("total_visits_count").default(1),
    satusehatConsent: text("satusehat_consent").default("opt-in"), // "opt-in" | "opt-out"
    createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
    updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
  },
  (table) => [
    index("idx_patients_name").on(table.name),
    index("idx_patients_phone").on(table.phone),
    index("idx_patients_updated_at").on(table.updatedAt),
  ]
);

// 2. Kunjungan Rawat Jalan (Outpatient Encounter)
export const encounters = sqliteTable(
  "encounters",
  {
    id: text("id").primaryKey(), // Local Encounter ID (e.g. "ENC-2026-0901")
    patientId: text("patient_id").notNull().references(() => patients.id),
    satusehatEncounterId: text("satusehat_encounter_id"), // ID dari SATUSEHAT (e.g. "ss-enc-89210-9941a")
    visitDate: text("visit_date").notNull(), // ISO String
    clinicDepartment: text("clinic_department").notNull(),
    doctorName: text("doctor_name").notNull(),
    doctorSip: text("doctor_sip").notNull(),
    doctorIhsId: text("doctor_ihs_id").default("N10009841"),
    hospitalName: text("hospital_name").notNull().default("RS Umum Daerah Sehat Sejahtera"),
    hospitalOrgId: text("hospital_org_id").notNull().default("10000004"),
    chiefComplaint: text("chief_complaint").notNull(),
    anamnesis: text("anamnesis").notNull(),
    followUpInstruction: text("follow_up_instruction").notNull(),
    nextVisitDate: text("next_visit_date"),
    referredTo: text("referred_to"),
    dischargeDisposition: text("discharge_disposition").default("Pulang Berobat Jalan"),
    encounterStatus: text("encounter_status").default("finished"), // "arrived" | "in-progress" | "finished" | "cancelled"
    queueNumber: text("queue_number"),
    consentStatus: text("consent_status").default("opt-in"), // "opt-in" | "opt-out"
    syncStatus: text("sync_status").default("synced"), // "synced" | "draft" | "pending" | "partial_failed"
    syncedAt: text("synced_at"),
    isLocked: integer("is_locked", { mode: "boolean" }).default(false),
    lockedAt: text("locked_at"),
    lockedBy: text("locked_by"),
    createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
    updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
  },
  (table) => [
    index("idx_encounters_patient_id").on(table.patientId),
    index("idx_encounters_visit_date").on(table.visitDate),
    index("idx_encounters_queue_number").on(table.queueNumber),
    index("idx_encounters_status").on(table.encounterStatus),
    index("idx_encounters_sync_status").on(table.syncStatus),
  ]
);

// 3. Tanda-Tanda Vital & Pemeriksaan Fisik (Vital Signs & Antropometri)
export const vitals = sqliteTable(
  "vitals",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id").notNull().references(() => encounters.id),
    systolic: integer("systolic").notNull(),
    diastolic: integer("diastolic").notNull(),
    heartRate: integer("heart_rate").notNull(),
    temperature: real("temperature").notNull(),
    respiratoryRate: integer("respiratory_rate").notNull(),
    oxygenSaturation: integer("oxygen_saturation").notNull(),
    weightKg: real("weight_kg").notNull(),
    heightCm: real("height_cm").notNull(),
    bmi: real("bmi"),
    physicalExamNotes: text("physical_exam_notes"),
  },
  (table) => [
    index("idx_vitals_encounter_id").on(table.encounterId),
  ]
);

// 4. Diagnosis Medis ICD-10 (Diagnoses)
export const diagnoses = sqliteTable(
  "diagnoses",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id").notNull().references(() => encounters.id),
    type: text("type").notNull(), // "primary" | "secondary"
    code: text("code").notNull(), // ICD-10 (e.g. "I10")
    display: text("display").notNull(),
    patientFriendlyName: text("patient_friendly_name").notNull(),
    system: text("system").default("http://hl7.org/fhir/sid/icd-10"),
    clinicalStatus: text("clinical_status").default("active"),
  },
  (table) => [
    index("idx_diagnoses_encounter_id").on(table.encounterId),
    index("idx_diagnoses_code").on(table.code),
  ]
);

// 5. Tindakan & Prosedur Medis ICD-9-CM (Procedures)
export const procedures = sqliteTable(
  "procedures",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id").notNull().references(() => encounters.id),
    code: text("code").notNull(), // ICD-9-CM (e.g. "89.07")
    display: text("display").notNull(),
    category: text("category").notNull(),
    notes: text("notes"),
  },
  (table) => [
    index("idx_procedures_encounter_id").on(table.encounterId),
  ]
);

// 6. Resep Obat Elektronik KFA (Prescriptions / CPOE)
export const prescriptions = sqliteTable(
  "prescriptions",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id").notNull().references(() => encounters.id),
    kfaCode: text("kfa_code").notNull(), // KFA Code (e.g. "93000182")
    medicationName: text("medication_name").notNull(),
    form: text("form").notNull(),
    dosage: text("dosage").notNull(),
    frequency: text("frequency").notNull(),
    timing: text("timing").notNull(), // "Sebelum Makan" | "Sesudah Makan" | dll
    morning: integer("morning", { mode: "boolean" }).default(false),
    afternoon: integer("afternoon", { mode: "boolean" }).default(false),
    evening: integer("evening", { mode: "boolean" }).default(false),
    night: integer("night", { mode: "boolean" }).default(false),
    quantity: integer("quantity").notNull(),
    unit: text("unit").notNull(),
    durationDays: integer("duration_days").notNull(),
    instructions: text("instructions").notNull(),
  },
  (table) => [
    index("idx_prescriptions_encounter_id").on(table.encounterId),
    index("idx_prescriptions_kfa_code").on(table.kfaCode),
  ]
);

// 7. Order Penunjang Diagnostik Lab & Radiologi (Diagnostic Orders)
export const diagnosticOrders = sqliteTable(
  "diagnostic_orders",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id").notNull().references(() => encounters.id),
    testCode: text("test_code").notNull(), // LOINC
    testName: text("test_name").notNull(),
    category: text("category").notNull(), // "laboratory" | "radiology"
    status: text("status").notNull().default("ordered"), // "ordered" | "in-progress" | "completed" | "cancelled"
    priority: text("priority").notNull().default("routine"), // "routine" | "urgent" | "stat"
    orderDate: text("order_date").notNull(),
    doctorName: text("doctor_name").notNull(),
    clinicalNotes: text("clinical_notes"),
  },
  (table) => [
    index("idx_diagnostic_orders_encounter_id").on(table.encounterId),
  ]
);

// 8. Hasil Pemeriksaan Laboratorium (Lab Results)
export const labResults = sqliteTable(
  "lab_results",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id").notNull().references(() => encounters.id),
    testCode: text("test_code").notNull(),
    testName: text("test_name").notNull(),
    category: text("category").notNull(),
    value: text("value").notNull(),
    unit: text("unit").notNull(),
    referenceRange: text("reference_range").notNull(),
    flag: text("flag").notNull(), // "normal" | "high" | "low" | "critical"
    resultDate: text("result_date").notNull(),
    performer: text("performer").notNull(),
    notes: text("notes"),
  },
  (table) => [
    index("idx_lab_results_encounter_id").on(table.encounterId),
  ]
);

// 9. Hasil Pemeriksaan Radiologi (Radiology Results)
export const radiologyResults = sqliteTable(
  "radiology_results",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id").notNull().references(() => encounters.id),
    examCode: text("exam_code").notNull(),
    examName: text("exam_name").notNull(),
    modality: text("modality").notNull(),
    findings: text("findings").notNull(),
    conclusion: text("conclusion").notNull(),
    radiologistName: text("radiologist_name").notNull(),
    resultDate: text("result_date").notNull(),
  },
  (table) => [
    index("idx_radiology_results_encounter_id").on(table.encounterId),
  ]
);

// 10. Catatan Tambahan Rekam Medis (Medical Addendums)
export const medicalAddendums = sqliteTable(
  "medical_addendums",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id").notNull().references(() => encounters.id),
    timestamp: text("timestamp").notNull(),
    authorName: text("author_name").notNull(),
    authorRole: text("author_role").notNull(),
    noteText: text("note_text").notNull(),
  },
  (table) => [
    index("idx_medical_addendums_encounter_id").on(table.encounterId),
  ]
);

// 11. Antrean Poliklinik Hari Ini (Queue Items)
export const queueItems = sqliteTable(
  "queue_items",
  {
    id: text("id").primaryKey(),
    queueNumber: text("queue_number").notNull(),
    patientId: text("patient_id").notNull().references(() => patients.id),
    department: text("department").notNull(),
    doctor: text("doctor").notNull(),
    room: text("room").notNull(),
    arrivalTime: text("arrival_time").notNull(),
    arrivalTimestamp: integer("arrival_timestamp"),
    chiefComplaint: text("chief_complaint").notNull(),
    status: text("status").notNull().default("arrived"), // "arrived" | "in-progress" | "finished"
    satusehatStatus: text("satusehat_status").notNull().default("synced"),
    satusehatConsent: text("satusehat_consent").default("opt-in"),
    triagePriority: text("triage_priority").default("regular"),
    calledAt: text("called_at"),
    callCount: integer("call_count").default(0),
    queueDate: text("queue_date").notNull(), // YYYY-MM-DD
  },
  (table) => [
    index("idx_queue_items_queue_date").on(table.queueDate),
    index("idx_queue_items_patient_id").on(table.patientId),
    index("idx_queue_items_dept_date").on(table.department, table.queueDate),
    index("idx_queue_items_status").on(table.status),
  ]
);

// 12. Audit Sinkronisasi FHIR SATUSEHAT (Granular Resource Sync Logs)
export const satusehatSyncLogs = sqliteTable(
  "satusehat_sync_logs",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id").notNull().references(() => encounters.id),
    resourceType: text("resource_type").notNull(),
    label: text("label").notNull(),
    category: text("category"),
    standard: text("standard").notNull(),
    status: text("status").notNull(), // "synced" | "failed" | "pending"
    httpStatus: integer("http_status"),
    fhirId: text("fhir_id"),
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").default(0),
    lastAttempt: text("last_attempt"),
    details: text("details"), // JSON string
  },
  (table) => [
    index("idx_sync_logs_encounter_id").on(table.encounterId),
    index("idx_sync_logs_status").on(table.status),
  ]
);
