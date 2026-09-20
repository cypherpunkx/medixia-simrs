export type SatusehatEnvironment = "staging" | "production";

// ==========================================
// Multi-Faskes & Role-Based Access Control
// ==========================================
export type FacilityType = "rumah_sakit" | "klinik_pratama" | "klinik_utama" | "puskesmas";

export interface FacilityProfile {
  id: string;
  name: string;
  type: FacilityType;
  satusehatOrgId: string;
  satusehatClientId?: string;
  satusehatClientSecret?: string;
  address: string;
  phone: string;
  licenseNumber: string;
  isActive: boolean;
  departments?: DepartmentItem[];
}

export interface DepartmentItem {
  id: string;
  facilityId: string;
  name: string;
  room: string;
  quota: number;
  defaultDoctorName?: string;
  isActive: boolean;
}

export type UserRole = "doctor" | "nurse" | "registration" | "admin" | "pharmacy";

export interface UserProfile {
  id: string;
  facilityId?: string;
  departmentId?: string;
  username: string;
  name: string;
  role: UserRole;
  sip?: string;
  ihsPractitionerId?: string;
  department?: string;
  facilityName?: string;
  facilityType?: FacilityType;
  isActive: boolean;
}

export interface SatusehatAuthCredentials {
  clientId: string;
  clientSecret: string;
  env: SatusehatEnvironment;
  orgId?: string;
}

export interface SatusehatRawTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: string | number;
  issued_at?: string;
  status?: string;
  developer_email?: string;
  application_name?: string;
  client_id?: string;
  organization_id?: string;
  [key: string]: unknown;
}

export interface AuthSession {
  accessToken: string;
  tokenType: string;
  expiresAt: number; // Unix timestamp in ms
  expiresIn: number; // Seconds
  issuedAt: number; // Unix timestamp in ms
  env: SatusehatEnvironment;
  orgId?: string;
  clientIdMasked: string;
  rawResponse: SatusehatRawTokenResponse;
}

export interface TelemetryData {
  latencyMs: number;
  targetUrl: string;
  timestamp: string;
  httpStatus: number;
  method: string;
}

export interface AuthApiResponse {
  success: boolean;
  data?: AuthSession;
  error?: {
    message: string;
    code?: string;
    detail?: unknown;
    suggestions?: string[];
  };
  telemetry?: TelemetryData;
}

export interface FhirOrganization {
  resourceType: "Organization";
  id: string;
  identifier?: Array<{
    use?: string;
    system?: string;
    value?: string;
  }>;
  active?: boolean;
  type?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  }>;
  name: string;
  alias?: string[];
  telecom?: Array<{
    system?: string;
    value?: string;
    use?: string;
  }>;
  address?: Array<{
    use?: string;
    line?: string[];
    city?: string;
    postalCode?: string;
    country?: string;
  }>;
}

export interface OrgVerifyApiResponse {
  success: boolean;
  data?: FhirOrganization;
  error?: {
    message: string;
    status?: number;
    detail?: unknown;
  };
  telemetry?: TelemetryData;
}

// ==========================================
// RESUME MEDIS RAWAT JALAN DATA MODELS
// Standar Kemenkes RI & FHIR HL7 R4
// ==========================================

export interface PatientProfile {
  id: string; // SATUSEHAT Patient ID
  nik: string; // NIK KTP (16 digits)
  mrn: string; // Nomor Rekam Medis RS
  name: string;
  ihsNumber?: string; // Nomor IHS Kemenkes SATUSEHAT (misal P01234567890)
  gender: "male" | "female";
  birthDate: string; // YYYY-MM-DD
  phone: string;
  address: string;
  bloodType: "A" | "B" | "AB" | "O";
  allergies: string[];
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
  paymentPayer?: string; // BPJS Kesehatan / Mandiri / Asuransi Swasta
  lastVisitDate?: string; // e.g. "2026-08-28"
  lastVisitDepartment?: string; // e.g. "Poli Penyakit Dalam"
  lastVisitDoctor?: string; // e.g. "dr. Rian Pratama, Sp.PD"
  lastVisitDiagnosis?: string; // e.g. "Hipertensi Primer (I10)"
  totalVisitsCount?: number; // Total riwayat kunjungan pasien
  satusehatConsent?: "opt-in" | "opt-out"; // Persetujuan Berbagi Data SATUSEHAT (Informed Consent UU PDP)
}

export interface DiagnosticOrder {
  id: string;
  testCode: string; // LOINC or ICD-9-CM
  testName: string;
  category: "laboratory" | "radiology";
  status: "ordered" | "in-progress" | "completed" | "cancelled";
  priority: "routine" | "urgent" | "stat";
  orderDate: string;
  doctorName: string;
  clinicalNotes?: string;
  satusehatServiceRequestId?: string;
}

export interface LabResult {
  id: string;
  testCode: string; // LOINC code
  testName: string;
  category: string; // Hematologi, Kimia Darah, Urinalisis
  value: string | number;
  unit: string;
  referenceRange: string;
  flag: "normal" | "high" | "low" | "critical";
  resultDate: string;
  performer: string;
  notes?: string;
  satusehatObservationId?: string;
  satusehatDiagnosticReportId?: string;
}

export interface RadiologyResult {
  id: string;
  examCode: string; // LOINC code
  examName: string;
  modality: "X-Ray" | "CT-Scan" | "USG" | "MRI" | "EKG";
  findings: string;
  conclusion: string;
  radiologistName: string;
  resultDate: string;
  satusehatObservationId?: string;
  satusehatServiceRequestId?: string;
  satusehatDiagnosticReportId?: string;
}

export interface MedicalAddendum {
  id: string;
  timestamp: string;
  authorName: string;
  authorRole: string;
  noteText: string;
}

export interface VitalSigns {
  systolic: number; // mmHg (e.g. 120)
  diastolic: number; // mmHg (e.g. 80)
  heartRate: number; // bpm (e.g. 78)
  temperature: number; // Celsius (e.g. 36.6)
  respiratoryRate: number; // breaths/min (e.g. 18)
  oxygenSaturation: number; // % (e.g. 98)
  weightKg: number; // kg (e.g. 68)
  heightCm: number; // cm (e.g. 172)
  bmi?: number;
  physicalExamNotes?: string;
  // Granular SATUSEHAT Observation IDs
  satusehatBpId?: string; // LOINC 85354-9 (Blood Pressure Panel)
  satusehatHrId?: string; // LOINC 8867-4 (Heart Rate)
  satusehatTempId?: string; // LOINC 8310-5 (Body Temperature)
  satusehatRrId?: string; // LOINC 9279-1 (Respiratory Rate)
  satusehatSpo2Id?: string; // LOINC 59408-5 (Oxygen Saturation)
  satusehatWeightId?: string; // LOINC 29463-7 (Body Weight)
  satusehatHeightId?: string; // LOINC 8302-2 (Body Height)
  satusehatBmiId?: string; // LOINC 39156-5 (Body Mass Index)
}

export interface DiagnosisItem {
  id?: string;
  type: "primary" | "secondary";
  code: string; // ICD-10 code (e.g. "I10" or "J00")
  display: string; // Description (e.g. "Essential (primary) hypertension")
  patientFriendlyName: string; // Mudah dimengerti pasien
  system?: string;
  clinicalStatus?: "active" | "recurrence" | "remission" | "resolved";
  satusehatConditionId?: string;
}

export interface ProcedureItem {
  id?: string;
  code: string; // ICD-9-CM code (e.g. "89.07" or "89.52")
  display: string; // Description (e.g. "General medical consultation")
  category: string;
  notes?: string;
  satusehatProcedureId?: string;
}

export interface PrescriptionItem {
  id?: string;
  kfaCode: string; // Kode KFA Kemenkes
  medicationName: string;
  form: string; // e.g. "Tablet", "Kapsul", "Sirup"
  dosage: string; // e.g. "5 mg"
  frequency: string; // e.g. "1 x 1 tablet sehari"
  timing: "Sebelum Makan" | "Sesudah Makan" | "Bersama Makanan" | "Sesuai Kebutuhan";
  schedule: {
    morning?: boolean;
    afternoon?: boolean;
    evening?: boolean;
    night?: boolean;
  };
  quantity: number;
  unit: string;
  durationDays: number;
  instructions: string;
  satusehatMedicationRequestId?: string;
  satusehatMedicationId?: string;
}

export type SyncStatusType = "synced" | "draft" | "pending" | "partial_failed";

export interface ResourceSyncItem {
  resourceType:
    | "Consent"
    | "Encounter"
    | "Observation"
    | "Condition"
    | "Procedure"
    | "AllergyIntolerance"
    | "MedicationRequest"
    | "CarePlan"
    | "Composition"
    | string;
  label: string;
  category?: string;
  standard: string; // e.g. "HL7 FHIR R4", "LOINC", "ICD-10", "KFA"
  status: "synced" | "failed" | "pending";
  httpStatus?: number; // 201, 200, 500, 504, etc.
  fhirId?: string; // ID from SATUSEHAT Cloud (e.g. "ss-obs-8912")
  errorMessage?: string;
  retryCount?: number;
  lastAttempt?: string;
  details?: unknown;
}

export interface OutpatientEncounter {
  id: string; // Local encounter ID
  registrationNumber?: string; // Standard Hospital Registration No. (e.g. "RJ-20260913-0001")
  patientId?: string;
  facilityId?: string;
  departmentId?: string;
  doctorId?: string;
  satusehatEncounterId?: string;
  visitDate: string; // ISO String / YYYY-MM-DD HH:mm
  clinicDepartment: string; // e.g. "Poli Penyakit Dalam", "Poli Umum"
  locationId?: string; // SATUSEHAT Location UUID
  locationName?: string; // e.g. "Ruang Pelayanan Poli Umum"
  doctorName: string;
  doctorSip: string;
  doctorIhsId?: string; // SATUSEHAT Practitioner ID
  hospitalName?: string;
  hospitalOrgId?: string;
  chiefComplaint: string; // Keluhan Utama
  anamnesis: string; // Riwayat Penyakit
  vitals?: VitalSigns;
  diagnoses: DiagnosisItem[];
  procedures: ProcedureItem[];
  prescriptions: PrescriptionItem[];
  diagnosticOrders?: DiagnosticOrder[];
  labResults?: LabResult[];
  radiologyResults?: RadiologyResult[];
  followUpPlan?: {
    instruction: string;
    nextVisitDate?: string;
    referredTo?: string;
  };
  dischargeDisposition: string; // e.g. "Pulang Berobat Jalan"
  encounterStatus?: "arrived" | "in-progress" | "finished" | "cancelled";
  queueNumber?: string;
  consentStatus?: "opt-in" | "opt-out"; // Status Persetujuan Berbagi Data SATUSEHAT Kunjungan Ini
  syncStatus: SyncStatusType;
  syncedAt?: string;
  syncBreakdown?: ResourceSyncItem[];
  isLocked?: boolean;
  lockedAt?: string;
  lockedBy?: string;
  addendums?: MedicalAddendum[];
}

export interface ClinicQueuePatientItem {
  id: string;
  registrationNumber?: string; // Standard Hospital Registration No. (e.g. "RJ-20260913-0001")
  queueNumber: string;
  patient: PatientProfile;
  departmentId?: string;
  doctorId?: string;
  encounterId?: string;
  department: string;
  doctor: string;
  room: string;
  arrivalTime: string;
  arrivalTimestamp?: number;
  chiefComplaint: string;
  status: "arrived" | "in-progress" | "finished";
  satusehatStatus: "synced" | "pending";
  satusehatConsent?: "opt-in" | "opt-out";
  triagePriority?: "regular" | "urgent" | "geriatric" | "pediatric";
}

// ==========================================
// FHIR R4 CONSENT DATA MODEL (SATUSEHAT KEMENKES RI)
// ==========================================

export interface FhirConsent {
  resourceType: "Consent";
  id?: string;
  status: "draft" | "proposed" | "active" | "rejected" | "inactive" | "entered-in-error";
  scope: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  };
  category: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  patient: {
    reference: string;
    display: string;
  };
  dateTime: string;
  performer?: Array<{
    reference: string;
    display: string;
  }>;
  organization?: Array<{
    reference: string;
    display: string;
  }>;
  policy?: Array<{
    uri: string;
  }>;
  provision: {
    type: "permit" | "deny";
    period?: {
      start: string;
      end?: string;
    };
    data?: Array<{
      meaning: "instance" | "related" | "dependents" | "authoredby";
      reference: {
        reference: string;
      };
    }>;
  };
}

/**
 * Format string SIP dokter agar rapi dan tidak duplikat dengan label "SIP:".
 * Contoh: "SIP.446/089/DS/Dinkes/2026" -> "SIP.446/089/DS/Dinkes/2026"
 * Contoh: "446/089" -> "SIP: 446/089"
 */
export function formatDoctorSip(sip?: string | null): string {
  if (!sip) return "";
  const trimmed = sip.trim();
  if (/^SIP[\s.:/]/i.test(trimmed)) {
    return trimmed;
  }
  return `SIP: ${trimmed}`;
}

/**
 * Membersihkan embel-embel SIP dari nama dokter jika ada sisa string gabungan.
 */
export function cleanDoctorName(name?: string | null): string {
  if (!name) return "";
  return name.replace(/\s*\(SIP:?[^)]*\)/gi, "").trim();
}
