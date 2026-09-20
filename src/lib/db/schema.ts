import { pgTable, text, integer, real, boolean, bigint, index } from "drizzle-orm/pg-core";

// 0. Profil Faskes (Klinik Pratama / Utama / Rumah Sakit / Puskesmas)
export const facilities = pgTable(
  "facilities",
  {
    id: text("id").primaryKey(), // e.g. "fac-rsud-01", "fac-klinik-01"
    name: text("name").notNull(),
    type: text("type").notNull().default("rumah_sakit"), // "rumah_sakit" | "klinik_pratama" | "klinik_utama" | "puskesmas"
    satusehatOrgId: text("satusehat_org_id").notNull().default("b15a7ae7-f366-4a84-8385-0b8196c05002"),
    address: text("address").default(""),
    phone: text("phone").default(""),
    licenseNumber: text("license_number").default(""),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
    updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
  },
  (table) => [
    index("idx_facilities_type").on(table.type),
    index("idx_facilities_active").on(table.isActive),
  ]
);

// 0.1 Master Poliklinik / Unit Layanan Faskes
export const departments = pgTable(
  "departments",
  {
    id: text("id").primaryKey(), // e.g. "dept-rs-01"
    facilityId: text("facility_id").notNull().references(() => facilities.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g. "Poli Penyakit Dalam", "Poli Umum"
    room: text("room").notNull(), // e.g. "Ruang 204 (Lt. 2)"
    quota: integer("quota").notNull().default(30),
    defaultDoctorName: text("default_doctor_name"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  },
  (table) => [
    index("idx_departments_facility_id").on(table.facilityId),
    index("idx_departments_active").on(table.isActive),
  ]
);

// 0.2 Pengguna & Nakes (User Accounts & Role-Based Access Control)
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(), // e.g. "usr-dr-rian"
    facilityId: text("facility_id").references(() => facilities.id, { onDelete: "set null" }),
    departmentId: text("department_id").references(() => departments.id, { onDelete: "set null" }),
    username: text("username").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    role: text("role").notNull(), // "doctor" | "nurse" | "registration" | "admin" | "pharmacy"
    sip: text("sip"),
    ihsPractitionerId: text("ihs_practitioner_id"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  },
  (table) => [
    index("idx_users_username").on(table.username),
    index("idx_users_role").on(table.role),
    index("idx_users_facility_id").on(table.facilityId),
  ]
);

// 1. Master Data Pasien (Patient Profile)
export const patients = pgTable(
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
export const encounters = pgTable(
  "encounters",
  {
    id: text("id").primaryKey(), // Local Encounter ID (e.g. "ENC-20260902-0001")
    patientId: text("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    facilityId: text("facility_id").references(() => facilities.id, { onDelete: "set null" }),
    departmentId: text("department_id").references(() => departments.id, { onDelete: "set null" }),
    doctorId: text("doctor_id").references(() => users.id, { onDelete: "set null" }),
    satusehatEncounterId: text("satusehat_encounter_id"), // ID dari SATUSEHAT (e.g. "ss-enc-89210-9941a")
    visitDate: text("visit_date").notNull(), // ISO String
    clinicDepartment: text("clinic_department").notNull(),
    doctorName: text("doctor_name").notNull(),
    doctorSip: text("doctor_sip").notNull(),
    doctorIhsId: text("doctor_ihs_id").default("N10000001"),
    chiefComplaint: text("chief_complaint").notNull(),
    anamnesis: text("anamnesis").notNull(),
    followUpInstruction: text("follow_up_instruction").notNull(),
    nextVisitDate: text("next_visit_date"),
    referredTo: text("referred_to"),
    dischargeDisposition: text("discharge_disposition").default("Pulang Berobat Jalan"),
    encounterStatus: text("encounter_status").default("finished"), // "arrived" | "in-progress" | "finished" | "cancelled"
    queueNumber: text("queue_number"),
    registrationNumber: text("registration_number"), // e.g. "RJ-20260913-0001"
    consentStatus: text("consent_status").default("opt-in"), // "opt-in" | "opt-out"
    syncStatus: text("sync_status").default("synced"), // "synced" | "draft" | "pending" | "partial_failed"
    syncedAt: text("synced_at"),
    isLocked: boolean("is_locked").default(false),
    lockedAt: text("locked_at"),
    lockedBy: text("locked_by"),
    createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
    updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
  },
  (table) => [
    index("idx_encounters_patient_id").on(table.patientId),
    index("idx_encounters_facility_id").on(table.facilityId),
    index("idx_encounters_department_id").on(table.departmentId),
    index("idx_encounters_doctor_id").on(table.doctorId),
    index("idx_encounters_visit_date").on(table.visitDate),
    index("idx_encounters_queue_number").on(table.queueNumber),
    index("idx_encounters_reg_number").on(table.registrationNumber),
    index("idx_encounters_status").on(table.encounterStatus),
    index("idx_encounters_sync_status").on(table.syncStatus),
  ]
);

// 3. Tanda-Tanda Vital & Pemeriksaan Fisik (Vital Signs & Antropometri)
export const vitals = pgTable(
  "vitals",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id").notNull().references(() => encounters.id, { onDelete: "cascade" }),
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
    // Granular SATUSEHAT FHIR Observation IDs
    satusehatBpId: text("satusehat_bp_id"), // LOINC 85354-9 (Blood Pressure Panel)
    satusehatHrId: text("satusehat_hr_id"), // LOINC 8867-4 (Heart Rate)
    satusehatTempId: text("satusehat_temp_id"), // LOINC 8310-5 (Body Temperature)
    satusehatRrId: text("satusehat_rr_id"), // LOINC 9279-1 (Respiratory Rate)
    satusehatSpo2Id: text("satusehat_spo2_id"), // LOINC 59408-5 (Oxygen Saturation)
    satusehatWeightId: text("satusehat_weight_id"), // LOINC 29463-7 (Body Weight)
    satusehatHeightId: text("satusehat_height_id"), // LOINC 8302-2 (Body Height)
    satusehatBmiId: text("satusehat_bmi_id"), // LOINC 39156-5 (Body Mass Index)
  },
  (table) => [
    index("idx_vitals_encounter_id").on(table.encounterId),
    index("idx_vitals_satusehat_bp").on(table.satusehatBpId),
  ]
);

// 4. Diagnosis Medis ICD-10 (Diagnoses)
export const diagnoses = pgTable(
  "diagnoses",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id").notNull().references(() => encounters.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // "primary" | "secondary"
    code: text("code").notNull(), // ICD-10 (e.g. "I10")
    display: text("display").notNull(),
    patientFriendlyName: text("patient_friendly_name").notNull(),
    system: text("system").default("http://hl7.org/fhir/sid/icd-10"),
    clinicalStatus: text("clinical_status").default("active"),
    satusehatConditionId: text("satusehat_condition_id"), // SATUSEHAT FHIR Condition ID
  },
  (table) => [
    index("idx_diagnoses_encounter_id").on(table.encounterId),
    index("idx_diagnoses_code").on(table.code),
    index("idx_diagnoses_satusehat_id").on(table.satusehatConditionId),
  ]
);

// 5. Tindakan & Prosedur Medis ICD-9-CM (Procedures)
export const procedures = pgTable(
  "procedures",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id").notNull().references(() => encounters.id, { onDelete: "cascade" }),
    code: text("code").notNull(), // ICD-9-CM (e.g. "89.07")
    display: text("display").notNull(),
    category: text("category").notNull(),
    notes: text("notes"),
    satusehatProcedureId: text("satusehat_procedure_id"), // SATUSEHAT FHIR Procedure ID
  },
  (table) => [
    index("idx_procedures_encounter_id").on(table.encounterId),
    index("idx_procedures_satusehat_id").on(table.satusehatProcedureId),
  ]
);

// 6. Resep Obat Elektronik KFA (Prescriptions / CPOE)
export const prescriptions = pgTable(
  "prescriptions",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id").notNull().references(() => encounters.id, { onDelete: "cascade" }),
    kfaCode: text("kfa_code").notNull(), // KFA Code (e.g. "93000182")
    medicationName: text("medication_name").notNull(),
    form: text("form").notNull(),
    dosage: text("dosage").notNull(),
    frequency: text("frequency").notNull(),
    timing: text("timing").notNull(), // "Sebelum Makan" | "Sesudah Makan" | dll
    morning: boolean("morning").default(false),
    afternoon: boolean("afternoon").default(false),
    evening: boolean("evening").default(false),
    night: boolean("night").default(false),
    quantity: integer("quantity").notNull(),
    unit: text("unit").notNull(),
    durationDays: integer("duration_days").notNull(),
    instructions: text("instructions").notNull(),
    satusehatMedicationRequestId: text("satusehat_medication_request_id"), // SATUSEHAT FHIR MedicationRequest ID
    satusehatMedicationId: text("satusehat_medication_id"), // SATUSEHAT FHIR Medication ID
  },
  (table) => [
    index("idx_prescriptions_encounter_id").on(table.encounterId),
    index("idx_prescriptions_kfa_code").on(table.kfaCode),
    index("idx_prescriptions_satusehat_req_id").on(table.satusehatMedicationRequestId),
  ]
);

// 7. Order Penunjang Diagnostik Lab & Radiologi (Diagnostic Orders)
export const diagnosticOrders = pgTable(
  "diagnostic_orders",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id").notNull().references(() => encounters.id, { onDelete: "cascade" }),
    testCode: text("test_code").notNull(), // LOINC
    testName: text("test_name").notNull(),
    category: text("category").notNull(), // "laboratory" | "radiology"
    status: text("status").notNull().default("ordered"), // "ordered" | "in-progress" | "completed" | "cancelled"
    priority: text("priority").notNull().default("routine"), // "routine" | "urgent" | "stat"
    orderDate: text("order_date").notNull(),
    doctorName: text("doctor_name").notNull(),
    clinicalNotes: text("clinical_notes"),
    satusehatServiceRequestId: text("satusehat_service_request_id"), // SATUSEHAT FHIR ServiceRequest ID
  },
  (table) => [
    index("idx_diagnostic_orders_encounter_id").on(table.encounterId),
    index("idx_diagnostic_orders_satusehat_id").on(table.satusehatServiceRequestId),
  ]
);

// 8. Hasil Pemeriksaan Laboratorium (Lab Results)
export const labResults = pgTable(
  "lab_results",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id").notNull().references(() => encounters.id, { onDelete: "cascade" }),
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
    satusehatObservationId: text("satusehat_observation_id"), // SATUSEHAT FHIR Observation Lab ID
    satusehatDiagnosticReportId: text("satusehat_diagnostic_report_id"), // SATUSEHAT FHIR DiagnosticReport Lab ID
  },
  (table) => [
    index("idx_lab_results_encounter_id").on(table.encounterId),
    index("idx_lab_results_satusehat_obs_id").on(table.satusehatObservationId),
  ]
);

// 9. Hasil Pemeriksaan Radiologi (Radiology Results)
export const radiologyResults = pgTable(
  "radiology_results",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id").notNull().references(() => encounters.id, { onDelete: "cascade" }),
    examCode: text("exam_code").notNull(),
    examName: text("exam_name").notNull(),
    modality: text("modality").notNull(),
    findings: text("findings").notNull(),
    conclusion: text("conclusion").notNull(),
    radiologistName: text("radiologist_name").notNull(),
    resultDate: text("result_date").notNull(),
    satusehatObservationId: text("satusehat_observation_id"), // SATUSEHAT FHIR Observation Rad ID
    satusehatDiagnosticReportId: text("satusehat_diagnostic_report_id"), // SATUSEHAT FHIR DiagnosticReport Rad ID
  },
  (table) => [
    index("idx_radiology_results_encounter_id").on(table.encounterId),
    index("idx_radiology_results_satusehat_id").on(table.satusehatDiagnosticReportId),
    index("idx_radiology_results_satusehat_obs_id").on(table.satusehatObservationId),
  ]
);

// 10. Catatan Tambahan Rekam Medis (Medical Addendums)
export const medicalAddendums = pgTable(
  "medical_addendums",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id").notNull().references(() => encounters.id, { onDelete: "cascade" }),
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
export const queueItems = pgTable(
  "queue_items",
  {
    id: text("id").primaryKey(),
    queueNumber: text("queue_number").notNull(),
    registrationNumber: text("registration_number"), // e.g. "RJ-20260913-0001"
    patientId: text("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    departmentId: text("department_id").references(() => departments.id, { onDelete: "set null" }),
    doctorId: text("doctor_id").references(() => users.id, { onDelete: "set null" }),
    encounterId: text("encounter_id").references(() => encounters.id, { onDelete: "set null" }),
    department: text("department").notNull(),
    doctor: text("doctor").notNull(),
    room: text("room").notNull(),
    arrivalTime: text("arrival_time").notNull(),
    arrivalTimestamp: bigint("arrival_timestamp", { mode: "number" }),
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
    index("idx_queue_items_dept_id").on(table.departmentId),
    index("idx_queue_items_doctor_id").on(table.doctorId),
    index("idx_queue_items_enc_id").on(table.encounterId),
    index("idx_queue_items_dept_date").on(table.department, table.queueDate),
    index("idx_queue_items_status").on(table.status),
    index("idx_queue_items_reg_number").on(table.registrationNumber),
  ]
);

// 12. Audit Sinkronisasi FHIR SATUSEHAT (Granular Resource Sync Logs)
export const satusehatSyncLogs = pgTable(
  "satusehat_sync_logs",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id").notNull().references(() => encounters.id, { onDelete: "cascade" }),
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

// 13. Antrean Outbox SATUSEHAT Resiliensi Otomatis (Outbox Pattern & Retry Worker)
export const satusehatOutbox = pgTable(
  "satusehat_outbox",
  {
    id: text("id").primaryKey(),
    encounterId: text("encounter_id").notNull().references(() => encounters.id, { onDelete: "cascade" }),
    resourceType: text("resource_type").notNull(), // "encounter_bundle" | "Encounter" | "Condition" | etc.
    payload: text("payload").notNull(), // JSON string of the sync request
    status: text("status").notNull().default("pending"), // "pending" | "processing" | "synced" | "failed"
    retryCount: integer("retry_count").notNull().default(0),
    maxRetries: integer("max_retries").notNull().default(5),
    nextRetryAt: text("next_retry_at").notNull(), // ISO timestamp
    errorMessage: text("error_message"),
    createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
    updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
  },
  (table) => [
    index("idx_outbox_status_next_retry").on(table.status, table.nextRetryAt),
    index("idx_outbox_encounter_id").on(table.encounterId),
  ]
);

// 14. Master Data Obat & Alkes KFA (Kamus Farmasi & Alat Kesehatan Kemenkes)
export const masterMedications = pgTable(
  "master_medications",
  {
    id: text("id").primaryKey(), // e.g. "med-kfa-93001028"
    kfaCode: text("kfa_code").notNull().unique(), // Kode KFA 8-digit Kemenkes
    name: text("name").notNull(), // e.g. "Paracetamol 500 mg Tablet"
    genericName: text("generic_name").notNull(), // e.g. "Paracetamol"
    form: text("form").notNull(), // e.g. "Tablet", "Sirup", "Kapsul"
    strength: text("strength").notNull(), // e.g. "500 mg"
    route: text("route").notNull().default("Oral"), // "Oral" | "Injeksi" | "Topikal"
    category: text("category").notNull(), // e.g. "Analgesik & Antipiretik"
    unit: text("unit").notNull().default("Tablet"), // e.g. "Tablet", "Botol", "Ampul"
    defaultDosage: text("default_dosage"), // e.g. "500 mg"
    defaultFrequency: text("default_frequency"), // e.g. "3x sehari 1 tablet"
    defaultTiming: text("default_timing"), // e.g. "Sesudah makan"
    stock: integer("stock").notNull().default(100), // Stok fisik farmasi
    price: integer("price").notNull().default(0), // Harga satuan faskes (Rp)
    isActive: boolean("is_active").notNull().default(true),
    createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
    updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
  },
  (table) => [
    index("idx_master_med_kfa_code").on(table.kfaCode),
    index("idx_master_med_name").on(table.name),
    index("idx_master_med_generic").on(table.genericName),
    index("idx_master_med_category").on(table.category),
    index("idx_master_med_active").on(table.isActive),
  ]
);

// 15. Master Kamus Diagnosa Medis ICD-10 (WHO / Kemenkes RI)
export const masterIcd10 = pgTable(
  "master_icd10",
  {
    id: text("id").primaryKey(), // e.g. "icd10-I10"
    code: text("code").notNull().unique(), // e.g. "I10", "E11.9"
    display: text("display").notNull(), // e.g. "Essential (primary) hypertension"
    patientFriendlyName: text("patient_friendly_name").notNull(), // e.g. "Hipertensi Primer"
    category: text("category").default("Umum"), // Bab ICD-10
    isActive: boolean("is_active").notNull().default(true),
    createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  },
  (table) => [
    index("idx_master_icd10_code").on(table.code),
    index("idx_master_icd10_display").on(table.display),
    index("idx_master_icd10_active").on(table.isActive),
  ]
);

// 16. Master Kamus Tindakan Medis ICD-9-CM (Procedures & Interventions)
export const masterIcd9 = pgTable(
  "master_icd9",
  {
    id: text("id").primaryKey(), // e.g. "icd9-89.07"
    code: text("code").notNull().unique(), // e.g. "89.07", "89.52"
    display: text("display").notNull(), // e.g. "General medical consultation"
    category: text("category").notNull(), // e.g. "Konsultasi & Pemeriksaan Fisik"
    isActive: boolean("is_active").notNull().default(true),
    createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  },
  (table) => [
    index("idx_master_icd9_code").on(table.code),
    index("idx_master_icd9_category").on(table.category),
    index("idx_master_icd9_active").on(table.isActive),
  ]
);


