"use client";

import React, { useState } from "react";
import {
  Stethoscope,
  Activity,
  Pill,
  Send,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  Search,
  Syringe,
  FileText,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Clock,
  Sparkles,
  Lock,
  Shield,
  ShieldCheck,
  Wifi,
  WifiOff,
  Database,
  ExternalLink,
  FlaskConical,
  Radio,
  Eye,
  Edit3,
  RotateCcw,
  Save,
  Star,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomDatePicker } from "@/components/ui/custom-date-picker";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  AuthSession,
  OutpatientEncounter,
  PatientProfile,
  UserProfile,
  DiagnosisItem,
  ProcedureItem,
  PrescriptionItem,
  formatDoctorSip,
  cleanDoctorName,
} from "@/lib/satusehat/types";
import {
  KFA_MEDICATIONS_DATABASE,
  KfaMedication,
} from "@/lib/satusehat/kfa-database";
import {
  evaluateVitalSigns,
  checkDrugAllergyConflict,
  validateEncounterCompletion,
  VitalSignAlert,
} from "@/lib/satusehat/validation";
import { generatePrefixedId } from "@/lib/id-generator";
import { useAuth } from "@/lib/auth/auth-context";
import { ModuleEmptyState } from "@/components/layout/ModuleEmptyState";
import { SatusehatSyncLoadingModal } from "@/components/compliance/SatusehatSyncLoadingModal";
import { toast } from "sonner";

interface OutpatientEntryFormProps {
  patient?: PatientProfile | null;
  activeEncounter?: OutpatientEncounter;
  activeDepartment?: string;
  onEncounterCreated: (newEncounter: OutpatientEncounter) => void;
  token?: string;
  session?: AuthSession | null;
  onNavigateToBridging?: () => void;
  onOpenRegistration?: () => void;
}

type SoapTab = "S" | "O" | "A" | "P";

const COMMON_ICD10_LIST = [
  { code: "I10", display: "Essential (primary) hypertension", name: "Hipertensi Primer" },
  { code: "E11.9", display: "Type 2 diabetes mellitus without complications", name: "Diabetes Melitus Tipe 2" },
  { code: "J00", display: "Acute nasopharyngitis [common cold]", name: "Nasofaringitis Akut (Common Cold)" },
  { code: "J06.9", display: "Acute upper respiratory infection, unspecified", name: "ISPA Akut" },
  { code: "K29.7", display: "Gastritis, unspecified", name: "Gastritis / Dispepsia" },
  { code: "M79.1", display: "Myalgia", name: "Mialgia (Nyeri Otot)" },
  { code: "R51", display: "Headache", name: "Sefalgia (Nyeri Kepala)" },
  { code: "A09", display: "Infectious gastroenteritis and colitis", name: "Gastroenteritis Akut (Diare)" },
  { code: "J45.9", display: "Asthma, unspecified", name: "Asma Bronkial" },
  { code: "L23.9", display: "Allergic contact dermatitis", name: "Dermatitis Alergi" },
];

export const COMMON_ICD9_LIST = [
  { code: "89.07", display: "General medical consultation", name: "Konsultasi & Pemeriksaan Medis Umum/Spesialis", category: "Konsultasi" },
  { code: "89.52", display: "Electrocardiogram", name: "Pemeriksaan Rekam Jantung (EKG 12 Sandapan)", category: "Diagnostik" },
  { code: "93.94", display: "Respiratory medication administered by nebulizer", name: "Terapi Inhalasi / Nebulisasi", category: "Terapi Respirasi" },
  { code: "99.29", display: "Injection or infusion of therapeutic substance", name: "Injeksi Obat Terapi (IM / IV / SC)", category: "Injeksi & Terapi" },
  { code: "99.18", display: "Injection or infusion of electrolytes", name: "Pemasangan Infus & Cairan Elektrolit", category: "Injeksi & Terapi" },
  { code: "93.57", display: "Application of other wound dressing", name: "Perawatan Luka & Ganti Verban (Wound Dressing)", category: "Bedah Minor" },
  { code: "86.59", display: "Suture of skin and subcutaneous tissue", name: "Penjahitan Luka Terbuka (Hecting)", category: "Bedah Minor" },
  { code: "96.54", display: "Dental scaling and polishing", name: "Pembersihan Karang Gigi (Scaling) & Poles", category: "Poli Gigi" },
  { code: "23.09", display: "Extraction of other tooth", name: "Pencabutan Gigi (Ekstraksi Gigi)", category: "Poli Gigi" },
  { code: "23.2", display: "Restoration of tooth by filling", name: "Penambalan Gigi (Restorasi Gigi)", category: "Poli Gigi" },
  { code: "96.52", display: "Irrigation of ear", name: "Irigasi / Cuci Serumen Telinga", category: "THT" },
  { code: "89.38", display: "Other nonoperative examinations", name: "Pemeriksaan Visus Mata / Refraksi", category: "Poli Mata" },
  { code: "95.02", display: "Comprehensive eye examination", name: "Pemeriksaan Mata Komprehensif / Slit Lamp", category: "Poli Mata" },
  { code: "89.7", display: "General physical examination", name: "Pemeriksaan Fisik Lengkap", category: "Pemeriksaan Umum" },
  { code: "99.21", display: "Injection of antibiotic", name: "Injeksi Antibiotik", category: "Injeksi & Terapi" },
  { code: "93.39", display: "Other physical therapy", name: "Fisioterapi & Terapi Latihan", category: "Fisioterapi" },
];

function hasEncounterChanges(
  original: OutpatientEncounter | undefined,
  current: {
    department: string;
    doctorName: string;
    doctorSip: string;
    doctorIhsId: string;
    chiefComplaint: string;
    anamnesis: string;
    pastMedicalHistory: string;
    systolic: string;
    diastolic: string;
    heartRate: string;
    temperature: string;
    respiratoryRate: string;
    oxygenSaturation: string;
    weightKg: string;
    heightCm: string;
    physicalExamNotes: string;
    diagnoses: DiagnosisItem[];
    procedures: ProcedureItem[];
    prescriptions: PrescriptionItem[];
    followUpNotes: string;
    nextVisitDate: string;
    referredToHospital: string;
    dischargeDisposition: string;
    consentStatus: string;
  }
): boolean {
  if (!original) return true;

  // Basic Subjective & Doctor info
  if ((original.clinicDepartment || "").trim() !== current.department.trim()) return true;
  if ((original.doctorName || "").trim() !== current.doctorName.trim()) return true;
  if ((original.doctorSip || "").trim() !== current.doctorSip.trim()) return true;
  if ((original.doctorIhsId || "").trim() !== current.doctorIhsId.trim()) return true;
  if ((original.chiefComplaint || "").trim() !== current.chiefComplaint.trim()) return true;

  const combinedAnamnesis = `${current.anamnesis} ${current.pastMedicalHistory ? `[RPD: ${current.pastMedicalHistory}]` : ""}`.trim();
  if ((original.anamnesis || "").trim() !== combinedAnamnesis) return true;

  // Vitals & Physical Exam
  const origVitals = original.vitals;
  const normalizeNum = (val: string | number | undefined | null) =>
    val != null && val !== "" ? Number(val) : null;

  if (normalizeNum(origVitals?.systolic) !== normalizeNum(current.systolic)) return true;
  if (normalizeNum(origVitals?.diastolic) !== normalizeNum(current.diastolic)) return true;
  if (normalizeNum(origVitals?.heartRate) !== normalizeNum(current.heartRate)) return true;
  if (normalizeNum(origVitals?.temperature) !== normalizeNum(current.temperature)) return true;
  if (normalizeNum(origVitals?.respiratoryRate) !== normalizeNum(current.respiratoryRate)) return true;
  if (normalizeNum(origVitals?.oxygenSaturation) !== normalizeNum(current.oxygenSaturation)) return true;
  if (normalizeNum(origVitals?.weightKg) !== normalizeNum(current.weightKg)) return true;
  if (normalizeNum(origVitals?.heightCm) !== normalizeNum(current.heightCm)) return true;
  if ((origVitals?.physicalExamNotes || "").trim() !== current.physicalExamNotes.trim()) return true;

  // Diagnoses
  const origDiag = original.diagnoses || [];
  if (origDiag.length !== current.diagnoses.length) return true;
  for (let i = 0; i < current.diagnoses.length; i++) {
    const cd = current.diagnoses[i];
    const od = origDiag[i];
    if (!od) return true;
    if (
      cd.code !== od.code ||
      cd.type !== od.type ||
      cd.display !== od.display ||
      cd.clinicalStatus !== od.clinicalStatus
    ) {
      return true;
    }
  }

  // Procedures
  const origProc = original.procedures || [];
  if (origProc.length !== current.procedures.length) return true;
  for (let i = 0; i < current.procedures.length; i++) {
    const cp = current.procedures[i];
    const op = origProc[i];
    if (!op) return true;
    if (
      cp.code !== op.code ||
      cp.notes !== op.notes ||
      cp.display !== op.display ||
      cp.category !== op.category
    ) {
      return true;
    }
  }

  // Prescriptions
  const origPresc = original.prescriptions || [];
  if (origPresc.length !== current.prescriptions.length) return true;
  for (let i = 0; i < current.prescriptions.length; i++) {
    const cp = current.prescriptions[i];
    const op = origPresc[i];
    if (!op) return true;
    if (
      cp.kfaCode !== op.kfaCode ||
      cp.medicationName !== op.medicationName ||
      cp.dosage !== op.dosage ||
      cp.frequency !== op.frequency ||
      cp.timing !== op.timing ||
      cp.quantity !== op.quantity ||
      cp.unit !== op.unit ||
      cp.durationDays !== op.durationDays ||
      cp.instructions !== op.instructions
    ) {
      return true;
    }
  }

  // Follow-up plan
  const origPlan = original.followUpPlan;
  if ((origPlan?.instruction || "").trim() !== current.followUpNotes.trim()) return true;
  if ((origPlan?.nextVisitDate || "").trim() !== current.nextVisitDate.trim()) return true;
  if ((origPlan?.referredTo || "").trim() !== current.referredToHospital.trim()) return true;

  // Disposition & Consent
  const origDisp = original.dischargeDisposition || "Pulang Berobat Jalan";
  if (origDisp !== (current.dischargeDisposition || "Pulang Berobat Jalan")) return true;

  const origConsent = original.consentStatus || "opt-in";
  if (origConsent !== (current.consentStatus || "opt-in")) return true;

  return false;
}

export function OutpatientEntryForm({
  patient,
  activeEncounter,
  activeDepartment,
  onEncounterCreated,
  token,
  session,
  onNavigateToBridging,
  onOpenRegistration,
}: OutpatientEntryFormProps) {
  const { user, facility, departments: authDepartments } = useAuth();

  // Navigation State (SOAP Guided Stepper)
  const [activeSoapTab, setActiveSoapTab] = useState<SoapTab>("S");

  // Bridging Check & Pre-Submit Dialog State
  const [showBridgingWarningModal, setShowBridgingWarningModal] = useState(false);
  const [pendingSubmissionEncounter, setPendingSubmissionEncounter] = useState<OutpatientEncounter | null>(null);

  const isBridgingConnected = Boolean(token || session?.accessToken);

  // Encounter Status & Read-Only / Correction Mode Control
  const isEncounterFinished = activeEncounter?.encounterStatus === "finished";
  const [isCorrectionMode, setIsCorrectionMode] = useState(false);

  React.useEffect(() => {
    setIsCorrectionMode(false);
  }, [activeEncounter?.id, activeEncounter?.encounterStatus, patient?.id]);

  const isReadOnly = isEncounterFinished && !isCorrectionMode;

  // Dynamic Facility Doctors from DB
  const [facilityDoctors, setFacilityDoctors] = useState<UserProfile[]>([]);

  const fetchFacilityDoctors = React.useCallback(async () => {
    try {
      const url = facility?.id ? `/api/users?facilityId=${facility.id}` : "/api/users";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const docs = (json.data as UserProfile[]).filter(
          (u) => u.role === "doctor" && u.isActive !== false
        );
        setFacilityDoctors(docs);
      }
    } catch (err) {
      console.error("Gagal mengambil daftar dokter faskes:", err);
    }
  }, [facility?.id]);

  React.useEffect(() => {
    fetchFacilityDoctors();
  }, [fetchFacilityDoctors]);

  // Tab S: Subjektif
  const [department, setDepartment] = useState(
    activeEncounter?.clinicDepartment ||
    (activeDepartment && activeDepartment !== "Semua Poli" ? activeDepartment : "Poli Umum")
  );
  const [doctorName, setDoctorName] = useState(
    activeEncounter?.doctorName ||
    (user && user.role === "doctor" ? user.name : "dr. Sarah Wijaya, M.Kes")
  );
  const [chiefComplaint, setChiefComplaint] = useState(
    activeEncounter?.chiefComplaint || ""
  );
  const [anamnesis, setAnamnesis] = useState(
    activeEncounter?.anamnesis || ""
  );
  const [pastMedicalHistory, setPastMedicalHistory] = useState("");

  // Tab O: Objektif (TTV & Fisik)
  const [systolic, setSystolic] = useState(
    activeEncounter?.vitals?.systolic ? String(activeEncounter.vitals.systolic) : ""
  );
  const [diastolic, setDiastolic] = useState(
    activeEncounter?.vitals?.diastolic ? String(activeEncounter.vitals.diastolic) : ""
  );
  const [heartRate, setHeartRate] = useState(
    activeEncounter?.vitals?.heartRate ? String(activeEncounter.vitals.heartRate) : ""
  );
  const [temperature, setTemperature] = useState(
    activeEncounter?.vitals?.temperature ? String(activeEncounter.vitals.temperature) : ""
  );
  const [respiratoryRate, setRespiratoryRate] = useState(
    activeEncounter?.vitals?.respiratoryRate ? String(activeEncounter.vitals.respiratoryRate) : ""
  );
  const [oxygenSaturation, setOxygenSaturation] = useState(
    activeEncounter?.vitals?.oxygenSaturation ? String(activeEncounter.vitals.oxygenSaturation) : ""
  );
  const [weightKg, setWeightKg] = useState(
    activeEncounter?.vitals?.weightKg ? String(activeEncounter.vitals.weightKg) : ""
  );
  const [heightCm, setHeightCm] = useState(
    activeEncounter?.vitals?.heightCm ? String(activeEncounter.vitals.heightCm) : ""
  );
  const [physicalExamNotes, setPhysicalExamNotes] = useState(
    activeEncounter?.vitals?.physicalExamNotes || ""
  );

  // Tab A: Asesmen (Diagnosa & Prosedur)
  const [diagnoses, setDiagnoses] = useState<DiagnosisItem[]>(
    activeEncounter?.diagnoses && activeEncounter.diagnoses.length > 0
      ? activeEncounter.diagnoses
      : []
  );
  const [icdSearch, setIcdSearch] = useState("");
  const [showIcdDropdown, setShowIcdDropdown] = useState(false);
  const icdSearchInputRef = React.useRef<HTMLInputElement>(null);
  const kfaSearchInputRef = React.useRef<HTMLInputElement>(null);
  const [lastSubmittedEncounter, setLastSubmittedEncounter] = useState<OutpatientEncounter | null>(null);

  const [procedures, setProcedures] = useState<ProcedureItem[]>(
    activeEncounter?.procedures && activeEncounter.procedures.length > 0
      ? activeEncounter.procedures
      : [
          {
            code: "89.07",
            display: "General medical consultation",
            category: "Konsultasi",
            notes: "Konsultasi & Pemeriksaan Medis",
          },
        ]
  );
  const [icd9Search, setIcd9Search] = useState("");
  const [showIcd9Dropdown, setShowIcd9Dropdown] = useState(false);

  // Tab P: Plan (Resep, Rencana, & Disposisi)
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>(
    activeEncounter?.prescriptions && activeEncounter.prescriptions.length > 0
      ? activeEncounter.prescriptions
      : []
  );
  const [kfaSearch, setKfaSearch] = useState("");
  const [showKfaDropdown, setShowKfaDropdown] = useState(false);
  const [allergyWarning, setAllergyWarning] = useState<string | null>(null);
  const [followUpNotes, setFollowUpNotes] = useState(
    activeEncounter?.followUpPlan?.instruction || ""
  );
  const [doctorSip, setDoctorSip] = useState(
    activeEncounter?.doctorSip || user?.sip || ""
  );
  const [doctorIhsId, setDoctorIhsId] = useState(
    activeEncounter?.doctorIhsId || user?.ihsPractitionerId || ""
  );
  const [dischargeDisposition, setDischargeDisposition] = useState(
    activeEncounter?.dischargeDisposition && activeEncounter.dischargeDisposition !== "Menunggu Pelayanan Poli"
      ? activeEncounter.dischargeDisposition
      : "Pulang Berobat Jalan"
  );
  const [nextVisitDate, setNextVisitDate] = useState(
    activeEncounter?.followUpPlan?.nextVisitDate || ""
  );
  const [referredToHospital, setReferredToHospital] = useState(
    activeEncounter?.followUpPlan?.referredTo || ""
  );
  const [consentStatus, setConsentStatus] = useState<"opt-in" | "opt-out">(
    patient?.satusehatConsent || "opt-in"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // -------------------------------------------------------------
  // Production Feature: Draft Auto-Save & Local Recovery (localStorage)
  // Architecture: Session-bounded, Encounter-scoped, Anti-race-condition
  // -------------------------------------------------------------
  const [savedDraftAvailable, setSavedDraftAvailable] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<string | null>(null);
  const [storedDraft, setStoredDraft] = useState<any | null>(null);
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string | null>(null);
  
  // Unique session ID per form lifecycle to strictly distinguish active edits from previous uncommitted sessions
  const currentSessionIdRef = React.useRef<string>(generatePrefixedId("sess_"));
  const activeTargetRef = React.useRef<{ patientId?: string; encounterId?: string }>({
    patientId: patient?.id,
    encounterId: activeEncounter?.id,
  });

  // Helper to resolve prioritized storage keys (encounter-first, patient-fallback, legacy-safe)
  const getDraftKeys = React.useCallback((patId?: string, encId?: string) => {
    const keys: string[] = [];
    if (encId) keys.push(`medixia_soap_draft_enc_${encId}`);
    if (patId) {
      keys.push(`medixia_soap_draft_pat_${patId}`);
      keys.push(`medixia_soap_draft_${patId}`); // legacy key fallback
    }
    return keys;
  }, []);

  React.useEffect(() => {
    currentSessionIdRef.current = generatePrefixedId("sess_");
    activeTargetRef.current = {
      patientId: patient?.id,
      encounterId: activeEncounter?.id,
    };
    setLastAutoSavedTime(null);
  }, [patient?.id, activeEncounter?.id]);

  // Dynamic Clinic Options for Dropdown
  const clinicOptions = React.useMemo(() => {
    if (authDepartments && authDepartments.length > 0) {
      return authDepartments.map((d) => ({
        value: d.name,
        label: `${d.name}${d.room ? ` (${d.room})` : ""}`,
      }));
    }
    return [
      { value: "Poli Penyakit Dalam", label: "Poli Penyakit Dalam (Lt. 2)" },
      { value: "Poli Umum", label: "Poli Umum (Lt. 1)" },
      { value: "Poli Anak (Pediatri)", label: "Poli Anak / Pediatri (Lt. 1)" },
      { value: "Poli Gigi & Mulut", label: "Poli Gigi & Mulut (Lt. 2)" },
      { value: "Poli Jantung & Pembuluh Darah", label: "Poli Jantung & Pembuluh Darah (Lt. 2)" },
      { value: "Poli Mata", label: "Poli Mata (Lt. 2)" },
    ];
  }, [authDepartments]);

  // Dynamic Doctor Options for Dropdown (Strictly Filtered by Active Clinic)
  const doctorOptions = React.useMemo(() => {
    if (facilityDoctors.length > 0) {
      const clinicDoctors = facilityDoctors.filter(
        (d) =>
          d.department === department ||
          (d.department && department.toLowerCase().includes(d.department.toLowerCase())) ||
          (d.department && department.toLowerCase().includes(d.department.toLowerCase().replace("poli ", "")))
      );
      const listToMap = clinicDoctors.length > 0 ? clinicDoctors : facilityDoctors;
      return listToMap.map((d) => ({
        value: d.name,
        label: `${d.name}${d.sip ? ` (${formatDoctorSip(d.sip)})` : ""}${d.department ? ` — ${d.department}` : ""}`,
      }));
    }

    const fallbackList = [
      { name: "dr. Rian Pratama, Sp.PD", dept: "Poli Penyakit Dalam", sip: "SIP.446/089/DS/Dinkes/2026" },
      { name: "dr. Amanda Putri, M.Biomed", dept: "Poli Umum", sip: "SIP.446/012/DU/Dinkes/2026" },
      { name: "dr. Maya Anggraini, Sp.A", dept: "Poli Anak (Pediatri)", sip: "SIP.446/055/SPA/Dinkes/2026" },
      { name: "drg. Kevin Tanuwidjaja", dept: "Poli Gigi & Mulut", sip: "SIP.446/099/DG/Dinkes/2026" },
      { name: "dr. Rian Hidayat, Sp.JP", dept: "Poli Jantung & Pembuluh Darah", sip: "SIP.446/108/SJP/Dinkes/2026" },
      { name: "dr. Nadia Putri, Sp.M", dept: "Poli Mata", sip: "SIP.446/077/SPM/Dinkes/2026" },
    ];

    const matched = fallbackList.filter(
      (d) =>
        d.dept === department ||
        (department && d.dept.toLowerCase().includes(department.toLowerCase())) ||
        (department && department.toLowerCase().includes(d.dept.toLowerCase()))
    );

    const targetList = matched.length > 0 ? matched : fallbackList;
    return targetList.map((d) => ({
      value: d.name,
      label: `${d.name}${d.sip ? ` (${formatDoctorSip(d.sip)})` : ""} — ${d.dept}`,
    }));
  }, [facilityDoctors, department]);

  // Handler when Poliklinik is changed -> automatically update DPJP & Credentials
  const handleClinicChange = (newClinic: string) => {
    setDepartment(newClinic);
    const matchedDoctor = facilityDoctors.find(
      (d) =>
        d.department === newClinic ||
        (d.department && newClinic.toLowerCase().includes(d.department.toLowerCase())) ||
        (d.department && newClinic.toLowerCase().includes(d.department.toLowerCase().replace("poli ", "")))
    );

    if (matchedDoctor) {
      setDoctorName(matchedDoctor.name);
      setDoctorSip(matchedDoctor.sip || "");
      setDoctorIhsId(matchedDoctor.ihsPractitionerId || "");
    } else {
      const deptInfo = authDepartments?.find((d) => d.name === newClinic);
      if (deptInfo?.defaultDoctorName) {
        setDoctorName(deptInfo.defaultDoctorName);
        const docObj = facilityDoctors.find((d) => d.name === deptInfo.defaultDoctorName);
        if (docObj) {
          setDoctorSip(docObj.sip || "");
          setDoctorIhsId(docObj.ihsPractitionerId || "");
        } else {
          setDoctorSip("");
          setDoctorIhsId("");
        }
      } else if (user?.role === "doctor") {
        setDoctorName(user.name);
        setDoctorSip(user.sip || "");
        setDoctorIhsId(user.ihsPractitionerId || "");
      } else {
        setDoctorName("");
        setDoctorSip("");
        setDoctorIhsId("");
      }
    }
  };

  // Handler when Doctor DPJP is selected -> automatically update SIP & IHS ID
  const handleDoctorChange = (selectedDocName: string) => {
    setDoctorName(selectedDocName);
    const matchedDoctor = facilityDoctors.find(
      (d) => d.name === selectedDocName || selectedDocName.includes(d.name)
    );
    if (matchedDoctor) {
      setDoctorSip(matchedDoctor.sip || "");
      setDoctorIhsId(matchedDoctor.ihsPractitionerId || "");
    }
  };

  // Auto sync doctor credentials on logged-in doctor
  React.useEffect(() => {
    if (user && user.role === "doctor" && !activeEncounter) {
      setDoctorName(user.name);
      if (user.sip) setDoctorSip(user.sip);
      if (user.ihsPractitionerId) setDoctorIhsId(user.ihsPractitionerId);
      if (user.department) setDepartment(user.department);
    }
  }, [user, activeEncounter]);

  // Re-synchronize form when patient, activeEncounter, or activeDepartment changes
  React.useEffect(() => {
    if (activeEncounter) {
      setDepartment(
        activeEncounter.clinicDepartment ||
        (activeDepartment && activeDepartment !== "Semua Poli" ? activeDepartment : "Poli Umum")
      );
      setDoctorName(
        cleanDoctorName(activeEncounter.doctorName) ||
        (user && user.role === "doctor" ? user.name : "")
      );
      setDoctorSip(activeEncounter.doctorSip || user?.sip || "");
      setDoctorIhsId(activeEncounter.doctorIhsId || user?.ihsPractitionerId || "");
      setChiefComplaint(activeEncounter.chiefComplaint || "");
      setAnamnesis(activeEncounter.anamnesis || "");
      if (activeEncounter.vitals) {
        setSystolic(activeEncounter.vitals.systolic ? String(activeEncounter.vitals.systolic) : "");
        setDiastolic(activeEncounter.vitals.diastolic ? String(activeEncounter.vitals.diastolic) : "");
        setHeartRate(activeEncounter.vitals.heartRate ? String(activeEncounter.vitals.heartRate) : "");
        setTemperature(activeEncounter.vitals.temperature ? String(activeEncounter.vitals.temperature) : "");
        setRespiratoryRate(activeEncounter.vitals.respiratoryRate ? String(activeEncounter.vitals.respiratoryRate) : "");
        setOxygenSaturation(activeEncounter.vitals.oxygenSaturation ? String(activeEncounter.vitals.oxygenSaturation) : "");
        setWeightKg(activeEncounter.vitals.weightKg ? String(activeEncounter.vitals.weightKg) : "");
        setHeightCm(activeEncounter.vitals.heightCm ? String(activeEncounter.vitals.heightCm) : "");
        setPhysicalExamNotes(activeEncounter.vitals.physicalExamNotes || "");
      } else {
        setSystolic("");
        setDiastolic("");
        setHeartRate("");
        setTemperature("");
        setRespiratoryRate("");
        setOxygenSaturation("");
        setWeightKg("");
        setHeightCm("");
        setPhysicalExamNotes("");
      }
      setDiagnoses(activeEncounter.diagnoses || []);
      setProcedures(
        activeEncounter.procedures && activeEncounter.procedures.length > 0
          ? activeEncounter.procedures
          : [
              {
                code: "89.07",
                display: "General medical consultation",
                category: "Konsultasi",
                notes: "Konsultasi & Pemeriksaan Medis",
              },
            ]
      );
      setPrescriptions(activeEncounter.prescriptions || []);
      setFollowUpNotes(activeEncounter.followUpPlan?.instruction || "");
      setDischargeDisposition(
        activeEncounter.dischargeDisposition && activeEncounter.dischargeDisposition !== "Menunggu Pelayanan Poli"
          ? activeEncounter.dischargeDisposition
          : "Pulang Berobat Jalan"
      );
      setNextVisitDate(activeEncounter.followUpPlan?.nextVisitDate || "");
      setReferredToHospital(activeEncounter.followUpPlan?.referredTo || "");
      setConsentStatus(activeEncounter.consentStatus || patient?.satusehatConsent || "opt-in");
    } else {
      setDepartment(
        activeDepartment && activeDepartment !== "Semua Poli" ? activeDepartment : "Poli Umum"
      );
      setChiefComplaint("");
      setAnamnesis("");
      setSystolic("");
      setDiastolic("");
      setHeartRate("");
      setTemperature("");
      setRespiratoryRate("");
      setOxygenSaturation("");
      setWeightKg("");
      setHeightCm("");
      setPhysicalExamNotes("");
      setDiagnoses([]);
      setProcedures([
        {
          code: "89.07",
          display: "General medical consultation",
          category: "Konsultasi",
          notes: "Konsultasi & Pemeriksaan Medis",
        },
      ]);
      setPrescriptions([]);
      setFollowUpNotes("");
      setDischargeDisposition("Pulang Berobat Jalan");
      setNextVisitDate("");
      setReferredToHospital("");
      setConsentStatus(patient?.satusehatConsent || "opt-in");
    }
  }, [patient?.id, activeEncounter?.id, activeDepartment]);

  // Check for unsaved draft when patient or encounter changes
  React.useEffect(() => {
    if (typeof window === "undefined" || (!patient?.id && !activeEncounter?.id)) {
      setSavedDraftAvailable(false);
      setStoredDraft(null);
      return;
    }

    // Only look for draft if encounter is NOT already finished
    if (activeEncounter?.encounterStatus === "finished") {
      setSavedDraftAvailable(false);
      setStoredDraft(null);
      return;
    }

    try {
      const keys = getDraftKeys(patient?.id, activeEncounter?.id);
      let raw: string | null = null;
      for (const k of keys) {
        const item = localStorage.getItem(k);
        if (item) {
          raw = item;
          break;
        }
      }

      if (raw) {
        const parsed = JSON.parse(raw);
        // Only trigger recovery notice banner if the draft was created from a PREVIOUS uncommitted session (not the currently active editing session)
        const isFromPreviousSession =
          !parsed.sessionId || parsed.sessionId !== currentSessionIdRef.current;

        if (
          isFromPreviousSession &&
          parsed &&
          (parsed.chiefComplaint ||
            parsed.anamnesis ||
            parsed.systolic ||
            (Array.isArray(parsed.diagnoses) && parsed.diagnoses.length > 0) ||
            (Array.isArray(parsed.prescriptions) && parsed.prescriptions.length > 0))
        ) {
          setStoredDraft(parsed);
          setDraftTimestamp(parsed.savedAtFormatted || "Sesi sebelumnya");
          setSavedDraftAvailable(true);
          return;
        }
      }
    } catch {
      // ignore parse error
    }
    setSavedDraftAvailable(false);
    setStoredDraft(null);
  }, [patient?.id, activeEncounter?.id, activeEncounter?.encounterStatus, getDraftKeys]);

  // Debounced auto-save to localStorage with Session ID and Anti-Race-Condition Guard
  React.useEffect(() => {
    if (typeof window === "undefined" || !patient?.id || isReadOnly || isSubmitting) return;

    // Snapshot target IDs at the moment of trigger
    const targetPatientId = patient.id;
    const targetEncounterId = activeEncounter?.id;

    // Only auto-save if clinical fields have meaningful inputs
    const hasAnyInput = Boolean(
      chiefComplaint.trim() ||
      anamnesis.trim() ||
      systolic ||
      diastolic ||
      heartRate ||
      temperature ||
      diagnoses.length > 0 ||
      prescriptions.length > 0 ||
      followUpNotes.trim()
    );

    if (!hasAnyInput) return;

    const timer = setTimeout(() => {
      // Guard against race conditions when switching active patient or encounter
      if (
        activeTargetRef.current.patientId !== targetPatientId ||
        activeTargetRef.current.encounterId !== targetEncounterId
      ) {
        return;
      }

      try {
        const primaryKey = targetEncounterId
          ? `medixia_soap_draft_enc_${targetEncounterId}`
          : `medixia_soap_draft_pat_${targetPatientId}`;

        const draftTime = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
        const draftPayload = {
          sessionId: currentSessionIdRef.current,
          encounterId: targetEncounterId,
          patientId: targetPatientId,
          savedAt: new Date().toISOString(),
          savedAtFormatted: draftTime,
          department,
          doctorName,
          doctorSip,
          doctorIhsId,
          chiefComplaint,
          anamnesis,
          pastMedicalHistory,
          systolic,
          diastolic,
          heartRate,
          temperature,
          respiratoryRate,
          oxygenSaturation,
          weightKg,
          heightCm,
          physicalExamNotes,
          diagnoses,
          procedures,
          prescriptions,
          followUpNotes,
          nextVisitDate,
          referredToHospital,
          dischargeDisposition,
          consentStatus,
        };
        localStorage.setItem(primaryKey, JSON.stringify(draftPayload));
        setLastAutoSavedTime(draftTime);
      } catch {
        // ignore localStorage quota errors
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [
    patient?.id,
    activeEncounter?.id,
    isReadOnly,
    isSubmitting,
    department,
    doctorName,
    doctorSip,
    doctorIhsId,
    chiefComplaint,
    anamnesis,
    pastMedicalHistory,
    systolic,
    diastolic,
    heartRate,
    temperature,
    respiratoryRate,
    oxygenSaturation,
    weightKg,
    heightCm,
    physicalExamNotes,
    diagnoses,
    procedures,
    prescriptions,
    followUpNotes,
    nextVisitDate,
    referredToHospital,
    dischargeDisposition,
    consentStatus,
  ]);

  const handleRestoreDraft = () => {
    if (!storedDraft) return;
    if (storedDraft.department) setDepartment(storedDraft.department);
    if (storedDraft.doctorName) setDoctorName(storedDraft.doctorName);
    if (storedDraft.doctorSip) setDoctorSip(storedDraft.doctorSip);
    if (storedDraft.doctorIhsId) setDoctorIhsId(storedDraft.doctorIhsId);
    if (storedDraft.chiefComplaint) setChiefComplaint(storedDraft.chiefComplaint);
    if (storedDraft.anamnesis) setAnamnesis(storedDraft.anamnesis);
    if (storedDraft.pastMedicalHistory) setPastMedicalHistory(storedDraft.pastMedicalHistory);
    if (storedDraft.systolic) setSystolic(storedDraft.systolic);
    if (storedDraft.diastolic) setDiastolic(storedDraft.diastolic);
    if (storedDraft.heartRate) setHeartRate(storedDraft.heartRate);
    if (storedDraft.temperature) setTemperature(storedDraft.temperature);
    if (storedDraft.respiratoryRate) setRespiratoryRate(storedDraft.respiratoryRate);
    if (storedDraft.oxygenSaturation) setOxygenSaturation(storedDraft.oxygenSaturation);
    if (storedDraft.weightKg) setWeightKg(storedDraft.weightKg);
    if (storedDraft.heightCm) setHeightCm(storedDraft.heightCm);
    if (storedDraft.physicalExamNotes) setPhysicalExamNotes(storedDraft.physicalExamNotes);
    if (Array.isArray(storedDraft.diagnoses)) setDiagnoses(storedDraft.diagnoses);
    if (Array.isArray(storedDraft.procedures)) setProcedures(storedDraft.procedures);
    if (Array.isArray(storedDraft.prescriptions)) setPrescriptions(storedDraft.prescriptions);
    if (storedDraft.followUpNotes) setFollowUpNotes(storedDraft.followUpNotes);
    if (storedDraft.nextVisitDate) setNextVisitDate(storedDraft.nextVisitDate);
    if (storedDraft.referredToHospital) setReferredToHospital(storedDraft.referredToHospital);
    if (storedDraft.dischargeDisposition) setDischargeDisposition(storedDraft.dischargeDisposition);
    if (storedDraft.consentStatus) setConsentStatus(storedDraft.consentStatus);

    setSavedDraftAvailable(false);
    toast.success("Draf rekam medis berhasil dipulihkan ke formulir");
  };

  const handleDismissDraft = () => {
    if (typeof window !== "undefined") {
      const keys = getDraftKeys(patient?.id, activeEncounter?.id);
      for (const k of keys) {
        try {
          localStorage.removeItem(k);
        } catch {}
      }
    }
    setSavedDraftAvailable(false);
    setStoredDraft(null);
    toast.info("Draf rekam medis sesi sebelumnya telah dibuang");
  };

  // Live Vital Signs Evaluation & BMI
  const vitalsEval = evaluateVitalSigns({
    systolic: systolic ? parseInt(systolic) : undefined,
    diastolic: diastolic ? parseInt(diastolic) : undefined,
    heartRate: heartRate ? parseInt(heartRate) : undefined,
    respiratoryRate: respiratoryRate ? parseInt(respiratoryRate) : undefined,
    temperature: temperature ? parseFloat(temperature) : undefined,
    oxygenSaturation: oxygenSaturation ? parseInt(oxygenSaturation) : undefined,
  });

  const getAlertForField = (field: VitalSignAlert["field"]) => {
    return vitalsEval.alerts.find((a) => a.field === field);
  };

  const calculatedBmi =
    weightKg && heightCm && parseFloat(heightCm) > 0
      ? (parseFloat(weightKg) / Math.pow(parseFloat(heightCm) / 100, 2)).toFixed(1)
      : null;

  const getBmiCategory = (bmiVal: number) => {
    if (bmiVal < 18.5) return { label: "Underweight / Kurang", color: "text-amber-700 bg-amber-50 border-amber-200" };
    if (bmiVal < 23) return { label: "Normal (Asia-Pasifik)", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (bmiVal < 25) return { label: "Overweight / Berlebih", color: "text-amber-700 bg-amber-50 border-amber-200" };
    if (bmiVal < 30) return { label: "Obesitas I", color: "text-orange-700 bg-orange-50 border-orange-200" };
    return { label: "Obesitas II", color: "text-red-700 bg-red-50 border-red-200" };
  };

  // Completion Check for SOAP Tabs
  const isTabSComplete = Boolean(chiefComplaint.trim() && department.trim() && doctorName.trim());
  const isTabOComplete = Boolean(systolic && diastolic && heartRate && temperature);
  const isTabAComplete = diagnoses.some((d) => d.type === "primary");
  const isTabPComplete = prescriptions.length > 0 || Boolean(followUpNotes.trim());

  const completedTabsCount = [isTabSComplete, isTabOComplete, isTabAComplete, isTabPComplete].filter(Boolean).length;

  const handleAddKfaMedication = (med: KfaMedication) => {
    const allergyCheck = checkDrugAllergyConflict(patient?.allergies, med.name);
    if (allergyCheck.hasConflict) {
      setAllergyWarning(allergyCheck.message || null);
      toast.warning("Peringatan Alergi Obat!", {
        description: allergyCheck.message,
        duration: 6000,
      });
    } else {
      setAllergyWarning(null);
    }

    const newItem: PrescriptionItem = {
      kfaCode: med.kfaCode,
      medicationName: med.name,
      form: med.form,
      dosage: med.defaultDosage,
      frequency: med.defaultFrequency,
      timing: "Sesudah Makan",
      schedule: { morning: true, evening: true },
      quantity: 10,
      unit: med.unit,
      durationDays: 5,
      instructions: med.defaultTiming,
    };

    setPrescriptions((prev) => [...prev, newItem]);
    setKfaSearch("");
    setShowKfaDropdown(false);
    toast.success(`Obat ${med.name} ditambahkan ke resep`);
  };

  const handleAddDiagnosis = (item: (typeof COMMON_ICD10_LIST)[0]) => {
    if (diagnoses.some((d) => d.code === item.code)) {
      toast.info(`Diagnosis ${item.code} sudah ada dalam daftar`);
      return;
    }
    const newDiag: DiagnosisItem = {
      type: diagnoses.length === 0 ? "primary" : "secondary",
      code: item.code,
      display: item.display,
      patientFriendlyName: item.name,
      clinicalStatus: "active",
    };
    setDiagnoses((prev) => [...prev, newDiag]);
    setIcdSearch("");
    setShowIcdDropdown(false);
    toast.success(`Diagnosis ${item.code} (${item.name}) ditambahkan`);
  };

  const handleAddCustomDiagnosis = (customText: string) => {
    if (!customText.trim()) return;
    const trimmed = customText.trim();
    const isIcdCode = /^[A-Z][0-9]/i.test(trimmed);
    const newDiag: DiagnosisItem = {
      type: diagnoses.length === 0 ? "primary" : "secondary",
      code: isIcdCode ? trimmed.toUpperCase() : "R69",
      display: trimmed,
      patientFriendlyName: trimmed,
      clinicalStatus: "active",
    };
    setDiagnoses((prev) => [...prev, newDiag]);
    setIcdSearch("");
    setShowIcdDropdown(false);
    toast.success(`Diagnosis "${newDiag.patientFriendlyName}" ditambahkan`);
  };

  const handleRemoveDiagnosis = (code: string) => {
    setDiagnoses((prev) => {
      const remaining = prev.filter((d) => d.code !== code);
      if (remaining.length > 0 && !remaining.some((d) => d.type === "primary")) {
        remaining[0].type = "primary";
      }
      return remaining;
    });
    toast.info("Diagnosis dihapus");
  };

  const handleSetPrimaryDiagnosis = (code: string) => {
    setDiagnoses((prev) =>
      prev.map((d) => ({
        ...d,
        type: d.code === code ? "primary" : "secondary",
      }))
    );
    toast.success(`Diagnosis ${code} dijadikan sebagai diagnosis utama`);
  };

  const handleAddProcedure = (proc: (typeof COMMON_ICD9_LIST)[0]) => {
    if (procedures.some((p) => p.code === proc.code)) {
      toast.info(`Tindakan ${proc.code} (${proc.name}) sudah ada dalam daftar`);
      return;
    }
    setProcedures((prev) => [
      ...prev,
      {
        code: proc.code,
        display: proc.display,
        category: proc.category,
        notes: proc.name,
      },
    ]);
    setIcd9Search("");
    setShowIcdDropdown(false);
    toast.success(`Tindakan ${proc.code} (${proc.name}) ditambahkan`);
  };

  const handleAddCustomProcedure = (customText: string) => {
    if (!customText.trim()) return;
    const trimmed = customText.trim();
    const isIcd9 = /^[0-9]/.test(trimmed);
    const newProc: ProcedureItem = {
      code: isIcd9 ? trimmed : "89.07",
      display: trimmed,
      category: "Tindakan Medis",
      notes: trimmed,
    };
    setProcedures((prev) => [...prev, newProc]);
    setIcd9Search("");
    setShowIcdDropdown(false);
    toast.success(`Tindakan "${newProc.notes}" ditambahkan`);
  };

  const handleRemoveProcedure = (code: string) => {
    if (procedures.length <= 1) {
      toast.warning("Minimal harus ada 1 tindakan/prosedur medis (contoh: 89.07 Konsultasi Umum).");
      return;
    }
    setProcedures((prev) => prev.filter((p) => p.code !== code));
    toast.info(`Tindakan ${code} dihapus`);
  };

  const handleAddCustomMedication = (customName: string) => {
    if (!customName.trim()) return;
    const trimmed = customName.trim();
    const conflict = checkDrugAllergyConflict(patient?.allergies, trimmed);
    if (conflict.hasConflict) {
      setAllergyWarning(conflict.message || null);
      toast.warning("Peringatan Alergi Obat!", {
        description: conflict.message,
        duration: 6000,
      });
    }

    const newItem: PrescriptionItem = {
      kfaCode: `KFA-CUST-${Date.now().toString().slice(-4)}`,
      medicationName: trimmed,
      form: "Tablet",
      dosage: "1 dosis",
      frequency: "3 x 1 sehari",
      timing: "Sesudah Makan",
      schedule: { morning: true, afternoon: true, evening: true },
      quantity: 10,
      unit: "Tablet",
      durationDays: 3,
      instructions: "Diminum sesudah makan sesuai anjuran dokter.",
    };

    setPrescriptions((prev) => [...prev, newItem]);
    setKfaSearch("");
    setShowKfaDropdown(false);
    toast.success(`Obat "${trimmed}" ditambahkan ke resep`);
  };

  const handleUpdatePrescription = (
    idx: number,
    field: keyof PrescriptionItem,
    value: any
  ) => {
    setPrescriptions((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const handleRemovePrescription = (idx: number) => {
    setPrescriptions((prev) => prev.filter((_, i) => i !== idx));
    toast.info("Item resep dihapus");
  };

  // Expanded Clinical Templates
  const handleLoadPreset = (type: "hipertensi" | "ispa" | "gastritis" | "diabetes") => {
    if (type === "hipertensi") {
      setChiefComplaint("Sakit kepala tengkuk dan badan pegal sejak 3 hari");
      setAnamnesis("Pasien rutin konsumsi obat antihipertensi, saat ini obat habis 4 hari. Keluhan pusing melayang saat bangun tidur.");
      setPastMedicalHistory("Hipertensi grade 1 sejak 2021. Alergi: Tidak ada.");
      setSystolic("145");
      setDiastolic("90");
      setHeartRate("78");
      setTemperature("36.6");
      setRespiratoryRate("18");
      setOxygenSaturation("98");
      setWeightKg("68");
      setHeightCm("170");
      setPhysicalExamNotes("Compos Mentis. TD 145/90 mmHg. Cor: S1-S2 murni reguler. Pulmo: Suara napas vesikuler normal. Ekstremitas: Edema pretibial (-).");
      setDiagnoses([
        {
          type: "primary",
          code: "I10",
          display: "Essential (primary) hypertension",
          patientFriendlyName: "Hipertensi Primer",
          clinicalStatus: "active",
        },
      ]);
      setProcedures([
        {
          code: "89.07",
          display: "General medical consultation",
          category: "Konsultasi",
          notes: "Konsultasi & Pemeriksaan Dokter Spesialis",
        },
        {
          code: "89.52",
          display: "Electrocardiogram",
          category: "Diagnostik",
          notes: "Pemeriksaan Rekam Jantung (EKG 12 Sandapan)",
        },
      ]);
      setPrescriptions([
        {
          kfaCode: "93000845",
          medicationName: "Amlodipine 5 mg Tablet",
          form: "Tablet",
          dosage: "5 mg",
          frequency: "1x sehari 1 tablet",
          timing: "Sesudah Makan",
          schedule: { night: true },
          quantity: 30,
          unit: "Tablet",
          durationDays: 30,
          instructions: "Diminum teratur tiap malam sesudah makan.",
        },
      ]);
      setFollowUpNotes("Edukasi pembatasan konsumsi garam (< 5 gram/hari), olahraga teratur 150 menit/minggu, dan kontrol tensi ulang 1 bulan kemudian.");
    } else if (type === "ispa") {
      setChiefComplaint("Batuk pilek, bersin, dan sakit menelan sejak 3 hari");
      setAnamnesis("Demam sumeng hari ke-1 dan 2. Sekret hidung encer bening. Tidak ada sesak napas. Nafsu makan menurun.");
      setPastMedicalHistory("Riwayat asma disangkal. Alergi amoxicillin disangkal.");
      setSystolic("118");
      setDiastolic("76");
      setHeartRate("84");
      setTemperature("37.8");
      setRespiratoryRate("20");
      setOxygenSaturation("99");
      setWeightKg("58");
      setHeightCm("162");
      setPhysicalExamNotes("Faring hiperemis (+), T1-T1 tidak hiperemis, detritus (-). Konka hidung edema ringan. Cor/Pulmo dalam batas normal.");
      setDiagnoses([
        {
          type: "primary",
          code: "J00",
          display: "Acute nasopharyngitis [common cold]",
          patientFriendlyName: "Faringitis Akut / ISPA",
          clinicalStatus: "active",
        },
      ]);
      setProcedures([
        {
          code: "89.07",
          display: "General medical consultation",
          category: "Konsultasi",
          notes: "Konsultasi Medis Umum",
        },
        {
          code: "93.94",
          display: "Respiratory medication administered by nebulizer",
          category: "Terapi Respirasi",
          notes: "Terapi Inhalasi / Nebulisasi",
        },
      ]);
      setPrescriptions([
        {
          kfaCode: "93001028",
          medicationName: "Paracetamol 500 mg Tablet",
          form: "Tablet",
          dosage: "500 mg",
          frequency: "3x sehari 1 tablet",
          timing: "Sesudah Makan",
          schedule: { morning: true, afternoon: true, evening: true },
          quantity: 10,
          unit: "Tablet",
          durationDays: 3,
          instructions: "Diminum tiap 8 jam jika demam atau sakit kepala.",
        },
        {
          kfaCode: "93000412",
          medicationName: "Amoxicillin 500 mg Kapsul",
          form: "Kapsul",
          dosage: "500 mg",
          frequency: "3x sehari 1 kapsul",
          timing: "Sesudah Makan",
          schedule: { morning: true, afternoon: true, evening: true },
          quantity: 15,
          unit: "Kapsul",
          durationDays: 5,
          instructions: "Diminum rutin tiap 8 jam sesudah makan (Wajib dihabiskan).",
        },
      ]);
      setFollowUpNotes("Istirahat cukup, perbanyak minum air hangat, gunakan masker, dan kontrol kembali bila demam menetap > 3 hari.");
    } else if (type === "gastritis") {
      setChiefComplaint("Nyeri ulu hati perih dan mual sejak 2 hari");
      setAnamnesis("Keluhan memberat sesudah makan makanan pedas dan kopi. Terkadang terasa begah dan kembung. BAB warna normal.");
      setPastMedicalHistory("Riwayat maag kronis.");
      setSystolic("122");
      setDiastolic("80");
      setHeartRate("76");
      setTemperature("36.5");
      setRespiratoryRate("18");
      setOxygenSaturation("99");
      setWeightKg("62");
      setHeightCm("165");
      setPhysicalExamNotes("Nyeri tekan epigastrium (+), defans muskuler (-), bising usus 8x/menit normal.");
      setDiagnoses([
        {
          type: "primary",
          code: "K29.7",
          display: "Gastritis, unspecified",
          patientFriendlyName: "Gastritis / Dispepsia",
          clinicalStatus: "active",
        },
      ]);
      setProcedures([
        {
          code: "89.07",
          display: "General medical consultation",
          category: "Konsultasi",
          notes: "Konsultasi Medis Umum/Spesialis",
        },
      ]);
      setPrescriptions([
        {
          kfaCode: "93003012",
          medicationName: "Antasida Doen Tablet Kunyah",
          form: "Tablet Kunyah",
          dosage: "1 tablet",
          frequency: "3x sehari 1 tablet",
          timing: "Sebelum Makan",
          schedule: { morning: true, afternoon: true, evening: true },
          quantity: 15,
          unit: "Tablet Kunyah",
          durationDays: 5,
          instructions: "Dikunyah 1 jam sebelum makan atau saat perut terasa perih/kembung.",
        },
      ]);
      setFollowUpNotes("Hindari makanan pedas, asam, bersantan, dan kopi. Makan dengan porsi kecil tapi sering.");
    } else if (type === "diabetes") {
      setChiefComplaint("Kontrol rutin gula darah dan lemas badan");
      setAnamnesis("Pasien rutin minum obat DM. Akhir-akhir ini sering haus dan sering buang air kecil di malam hari.");
      setPastMedicalHistory("Diabetes Melitus Tipe 2 sejak 2020.");
      setSystolic("128");
      setDiastolic("82");
      setHeartRate("78");
      setTemperature("36.5");
      setRespiratoryRate("18");
      setOxygenSaturation("98");
      setWeightKg("72");
      setHeightCm("168");
      setPhysicalExamNotes("Sensibilitas perifer kaki baik, pulsasi arteri dorsalis pedis teraba kuat, luka/ulkus (-).");
      setDiagnoses([
        {
          type: "primary",
          code: "E11.9",
          display: "Type 2 diabetes mellitus without complications",
          patientFriendlyName: "Diabetes Melitus Tipe 2",
          clinicalStatus: "active",
        },
      ]);
      setProcedures([
        {
          code: "89.07",
          display: "General medical consultation",
          category: "Konsultasi",
          notes: "Konsultasi Dokter Spesialis Penyakit Dalam",
        },
      ]);
      setPrescriptions([
        {
          kfaCode: "93001552",
          medicationName: "Metformin 500 mg Tablet",
          form: "Tablet",
          dosage: "500 mg",
          frequency: "2x sehari 1 tablet",
          timing: "Bersama Makanan",
          schedule: { morning: true, evening: true },
          quantity: 60,
          unit: "Tablet",
          durationDays: 30,
          instructions: "Diminum bersama atau segera sesudah makan.",
        },
      ]);
      setFollowUpNotes("Edukasi diet rendah indeks glikemik, cek HbA1c berkala per 3 bulan, dan rawat kaki harian.");
    }
    const templateLabels: Record<string, string> = {
      ispa: "ISPA",
      hipertensi: "Hipertensi",
      dispepsia: "Dispepsia",
      diabetes: "Diabetes Melitus",
    };
    const templateName = templateLabels[type] || type;
    toast.success(`Template ${templateName} berhasil diterapkan ke formulir SOAP`);
  };

  const filteredIcd9Options = icd9Search.trim()
    ? COMMON_ICD9_LIST.filter(
        (p) =>
          p.name.toLowerCase().includes(icd9Search.toLowerCase()) ||
          p.code.toLowerCase().includes(icd9Search.toLowerCase()) ||
          p.display.toLowerCase().includes(icd9Search.toLowerCase()) ||
          p.category.toLowerCase().includes(icd9Search.toLowerCase())
      )
    : COMMON_ICD9_LIST.slice(0, 8);

  const filteredKfaOptions = kfaSearch.trim()
    ? KFA_MEDICATIONS_DATABASE.filter(
        (m) =>
          m.name.toLowerCase().includes(kfaSearch.toLowerCase()) ||
          m.genericName.toLowerCase().includes(kfaSearch.toLowerCase()) ||
          m.kfaCode.includes(kfaSearch) ||
          (m.category && m.category.toLowerCase().includes(kfaSearch.toLowerCase()))
      )
    : KFA_MEDICATIONS_DATABASE;

  const filteredIcdOptions = icdSearch.trim()
    ? COMMON_ICD10_LIST.filter(
        (c) =>
          c.code.toLowerCase().includes(icdSearch.toLowerCase()) ||
          c.name.toLowerCase().includes(icdSearch.toLowerCase()) ||
          c.display.toLowerCase().includes(icdSearch.toLowerCase())
      )
    : COMMON_ICD10_LIST;

  const executeSubmission = async (
    encounterToSave: OutpatientEncounter,
    saveAsLocalPending: boolean = false
  ) => {
    setIsSubmitting(true);
    const inFlightEncounter: OutpatientEncounter = {
      ...encounterToSave,
      syncStatus: encounterToSave.consentStatus === "opt-out" ? "draft" : "pending",
      satusehatEncounterId:
        encounterToSave.consentStatus === "opt-out" ? undefined : encounterToSave.satusehatEncounterId,
    };
    setLastSubmittedEncounter(inFlightEncounter);
    setShowBridgingWarningModal(false);

    try {
      const res = await fetch("/api/satusehat/resume-medis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient,
          encounter: encounterToSave,
          token: session?.accessToken || token,
          saveLocalPending: saveAsLocalPending,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const dbEncounter = data.data?.savedEncounter as OutpatientEncounter | undefined;
        const finalizedEncounter: OutpatientEncounter = dbEncounter || {
          ...encounterToSave,
          satusehatEncounterId:
            data.data?.satusehatEncounterId ||
            (saveAsLocalPending ? undefined : encounterToSave.satusehatEncounterId),
          syncStatus:
            data.data?.syncStatus ||
            (saveAsLocalPending ? "pending" : encounterToSave.syncStatus),
          syncBreakdown: data.data?.syncBreakdown || encounterToSave.syncBreakdown,
        };

        if (consentStatus === "opt-out") {
          toast.success("Resume medis berhasil disimpan");
        } else if (saveAsLocalPending) {
          toast.info("Resume medis berhasil disimpan (menunggu sinkronisasi)");
        } else if (finalizedEncounter.syncStatus === "partial_failed") {
          toast.warning("Resume medis berhasil disimpan dengan catatan sinkronisasi parsial");
        } else {
          toast.success("Resume medis rawat jalan berhasil disahkan");
        }
        // Smooth grace delay so doctor sees final stage completion checkmark
        await new Promise((resolve) => setTimeout(resolve, 350));
        if (typeof window !== "undefined") {
          const keys = getDraftKeys(patient?.id, activeEncounter?.id);
          for (const k of keys) {
            try {
              localStorage.removeItem(k);
            } catch {}
          }
        }
        setSavedDraftAvailable(false);
        setStoredDraft(null);
        setLastAutoSavedTime(null);
        onEncounterCreated(finalizedEncounter);
      } else {
        toast.error("Gagal menyimpan rekam medis", { description: data.error });
      }
    } catch {
      toast.error("Kendala jaringan saat menyimpan rekam medis");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    // 0. RBAC Role Validation (Permenkes 24/2022)
    if (user && user.role !== "doctor") {
      toast.error("Akses Ditolak: Wewenang Khusus Dokter DPJP", {
        description: `Akun Anda (${user.name}) terdaftar sebagai ${
          user.role === "registration"
            ? "Petugas Pendaftaran"
            : user.role === "nurse"
            ? "Perawat"
            : user.role === "pharmacy"
            ? "Apoteker / Farmasi"
            : "Administrator"
        }. Sesuai Permenkes No. 24/2022, pengisian & finalisasi Rekam Medis Klinis hanya dapat dilakukan oleh Dokter DPJP.`,
        duration: 6000,
      });
      return;
    }

    // 0.5. Dirty Checking / No-Op Protection for Finished Encounters
    // If encounter is finished and no changes have been made, lock back immediately without sending to SATUSEHAT
    if (isEncounterFinished && activeEncounter) {
      const hasChanges = hasEncounterChanges(activeEncounter, {
        department,
        doctorName,
        doctorSip,
        doctorIhsId,
        chiefComplaint,
        anamnesis,
        pastMedicalHistory,
        systolic,
        diastolic,
        heartRate,
        temperature,
        respiratoryRate,
        oxygenSaturation,
        weightKg,
        heightCm,
        physicalExamNotes,
        diagnoses,
        procedures,
        prescriptions,
        followUpNotes,
        nextVisitDate,
        referredToHospital,
        dischargeDisposition,
        consentStatus,
      });

      if (!hasChanges) {
        setIsCorrectionMode(false);
        toast.info("Tidak ada perubahan data");
        return;
      }
    }

    // 1. Validate mandatory clinical fields according to Permenkes 24/2022
    const validation = validateEncounterCompletion({
      hasChiefComplaint: Boolean(chiefComplaint.trim()),
      hasVitalSigns: Boolean(systolic && diastolic && heartRate && temperature),
      hasPrimaryDiagnosis: diagnoses.some((d) => d.type === "primary"),
      hasPractitioner: Boolean(doctorName.trim()),
    });

    if (!validation.canComplete) {
      toast.error("Kelengkapan rekam medis belum terpenuhi", {
        description: `Mohon lengkapi: ${validation.missingRequirements.join(", ")}`,
        duration: 5000,
      });
      // Redirect to the first incomplete tab
      if (!isTabSComplete) setActiveSoapTab("S");
      else if (!isTabOComplete) setActiveSoapTab("O");
      else if (!isTabAComplete) setActiveSoapTab("A");
      return;
    }

    // 2. Physiological logical checks
    if (parseInt(systolic) <= parseInt(diastolic)) {
      toast.error("Validasi tanda vital tidak valid", {
        description: "Tekanan darah sistolik harus lebih tinggi daripada diastolik.",
      });
      setActiveSoapTab("O");
      return;
    }

    // 3. Duplication check for ICD-10 diagnoses
    const diagCodes = diagnoses.map((d) => d.code.trim().toUpperCase());
    const hasDuplicateDiag = diagCodes.some((code, idx) => diagCodes.indexOf(code) !== idx);
    if (hasDuplicateDiag) {
      toast.error("Duplikasi Diagnosis ICD-10", {
        description: "Terdapat kode diagnosis yang dicatat lebih dari satu kali. Mohon hapus duplikat sebelum menyimpan.",
      });
      setActiveSoapTab("A");
      return;
    }

    // 4. Follow-up plan & disposition validation
    if (dischargeDisposition === "Kontrol Kembali") {
      if (!nextVisitDate) {
        toast.error("Tanggal kontrol wajib diisi", {
          description: "Untuk pasien dengan disposisi 'Kontrol Kembali', tentukan tanggal rencana kontrol ulang.",
        });
        setActiveSoapTab("P");
        return;
      }
      const todayStr = new Date().toISOString().split("T")[0];
      if (nextVisitDate < todayStr) {
        toast.error("Tanggal kontrol tidak valid", {
          description: "Tanggal rencana kontrol ulang tidak boleh merupakan tanggal lampau.",
        });
        setActiveSoapTab("P");
        return;
      }
    }

    if (dischargeDisposition === "Dirujuk ke RS Lain" || dischargeDisposition === "Konsul Internal Poli Lain") {
      if (!referredToHospital.trim()) {
        toast.error("Tujuan rujukan/konsul wajib diisi", {
          description: "Mohon isi nama faskes rujukan atau poliklinik/spesialis konsul internal.",
        });
        setActiveSoapTab("P");
        return;
      }
    }

    // 5. Prescription items integrity check
    if (prescriptions.length > 0) {
      const invalidRx = prescriptions.find(
        (rx) => !rx.quantity || rx.quantity <= 0 || !rx.durationDays || rx.durationDays <= 0
      );
      if (invalidRx) {
        toast.error("Data resep obat belum lengkap/valid", {
          description: `Obat "${invalidRx.medicationName || "Item resep"}" harus memiliki jumlah dan durasi konsumsi yang lebih dari 0.`,
        });
        setActiveSoapTab("P");
        return;
      }
    }

    const isOptOut = consentStatus === "opt-out";
    const matchedDept = authDepartments?.find(
      (d) =>
        d.name === department ||
        (department && d.name.toLowerCase() === department.toLowerCase())
    );
    const matchedDoc = facilityDoctors.find(
      (d) =>
        (doctorName && d.name.includes(doctorName.split(" (")[0])) ||
        d.name === doctorName ||
        (user?.role === "doctor" && d.id === user.id)
    );

    const resolvedFacilityId =
      facility?.id || activeEncounter?.facilityId || user?.facilityId || "fac-rsud-01";
    const resolvedDepartmentId =
      activeEncounter?.departmentId || matchedDept?.id;
    const resolvedDoctorId =
      activeEncounter?.doctorId ||
      (user?.role === "doctor" ? user.id : matchedDoc?.id);

    const newEncounter: OutpatientEncounter = {
      id: activeEncounter?.id || generatePrefixedId("enc_"),
      facilityId: resolvedFacilityId,
      departmentId: resolvedDepartmentId,
      doctorId: resolvedDoctorId,
      satusehatEncounterId:
        isOptOut || !isBridgingConnected
          ? undefined
          : activeEncounter?.satusehatEncounterId,
      visitDate: activeEncounter?.visitDate || new Date().toISOString(),
      clinicDepartment: department,
      doctorName: doctorName || (user?.role === "doctor" ? user.name : undefined) || activeEncounter?.doctorName || "",
      doctorSip: doctorSip.trim() || user?.sip || activeEncounter?.doctorSip || "",
      doctorIhsId: doctorIhsId.trim() || user?.ihsPractitionerId || activeEncounter?.doctorIhsId || "",
      hospitalName: facility?.name || activeEncounter?.hospitalName || user?.facilityName || "",
      hospitalOrgId: facility?.satusehatOrgId || activeEncounter?.hospitalOrgId || "",
      chiefComplaint,
      anamnesis: `${anamnesis} ${pastMedicalHistory ? `[RPD: ${pastMedicalHistory}]` : ""}`.trim(),
      vitals: {
        systolic: parseInt(systolic) || 120,
        diastolic: parseInt(diastolic) || 80,
        heartRate: parseInt(heartRate) || 75,
        temperature: parseFloat(temperature) || 36.5,
        respiratoryRate: parseInt(respiratoryRate) || 18,
        oxygenSaturation: parseInt(oxygenSaturation) || 98,
        weightKg: parseFloat(weightKg) || 65,
        heightCm: parseFloat(heightCm) || 170,
        bmi: calculatedBmi ? parseFloat(calculatedBmi) : 22.5,
        physicalExamNotes:
          physicalExamNotes || "Pemeriksaan fisik umum dalam batas normal.",
        satusehatBpId: activeEncounter?.vitals?.satusehatBpId,
        satusehatHrId: activeEncounter?.vitals?.satusehatHrId,
        satusehatTempId: activeEncounter?.vitals?.satusehatTempId,
        satusehatSpo2Id: activeEncounter?.vitals?.satusehatSpo2Id,
        satusehatRrId: activeEncounter?.vitals?.satusehatRrId,
        satusehatWeightId: activeEncounter?.vitals?.satusehatWeightId,
        satusehatHeightId: activeEncounter?.vitals?.satusehatHeightId,
        satusehatBmiId: activeEncounter?.vitals?.satusehatBmiId,
      },
      diagnoses: diagnoses.map((d, idx) => ({
        ...d,
        satusehatConditionId:
          d.satusehatConditionId || activeEncounter?.diagnoses?.[idx]?.satusehatConditionId,
      })),
      procedures: (procedures.length > 0
        ? procedures
        : [
            {
              code: "89.07",
              display: "General medical consultation",
              category: "Konsultasi Medis",
              notes: "Konsultasi dan Pemeriksaan Dokter",
            },
          ]).map((p, idx) => ({
        ...p,
        satusehatProcedureId:
          p.satusehatProcedureId || activeEncounter?.procedures?.[idx]?.satusehatProcedureId,
      })),
      prescriptions: prescriptions.map((rx, idx) => ({
        ...rx,
        satusehatMedicationId:
          rx.satusehatMedicationId || activeEncounter?.prescriptions?.[idx]?.satusehatMedicationId,
        satusehatMedicationRequestId:
          rx.satusehatMedicationRequestId || activeEncounter?.prescriptions?.[idx]?.satusehatMedicationRequestId,
      })),
      diagnosticOrders: activeEncounter?.diagnosticOrders || [],
      labResults: activeEncounter?.labResults || [],
      radiologyResults: activeEncounter?.radiologyResults || [],
      followUpPlan: {
        instruction: followUpNotes,
        nextVisitDate: nextVisitDate.trim() || undefined,
        referredTo: referredToHospital.trim() || undefined,
      },
      dischargeDisposition:
        !dischargeDisposition || dischargeDisposition === "Menunggu Pelayanan Poli"
          ? "Pulang Berobat Jalan"
          : dischargeDisposition,
      consentStatus: consentStatus,
      queueNumber: activeEncounter?.queueNumber,
      registrationNumber: activeEncounter?.registrationNumber,
      patientId: patient?.id || activeEncounter?.patientId || "",
      encounterStatus: "finished",
      syncStatus: isOptOut ? "draft" : "pending",
      syncedAt: isOptOut ? undefined : activeEncounter?.syncedAt,
      syncBreakdown: activeEncounter?.syncBreakdown,
      isLocked: activeEncounter?.isLocked || false,
      addendums: activeEncounter?.addendums || [],
    };

    // 3. Pre-Submit Bridging Validation Check
    // If patient is Opt-In (wants SATUSEHAT) but bridging is not connected
    if (!isOptOut && !isBridgingConnected) {
      setPendingSubmissionEncounter(newEncounter);
      setShowBridgingWarningModal(true);
      return;
    }

    // Direct submit when connected or opt-out
    await executeSubmission(newEncounter, false);
  };

  // Keyboard Shortcuts: Ctrl+Enter (Simpan) & Ctrl+K (Cari Diagnosa/Obat)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (!isReadOnly && !isSubmitting) {
          e.preventDefault();
          handleSubmit();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (activeSoapTab === "A") {
          icdSearchInputRef.current?.focus();
          setShowIcdDropdown(true);
        } else if (activeSoapTab === "P") {
          kfaSearchInputRef.current?.focus();
          setShowKfaDropdown(true);
        } else {
          setActiveSoapTab("A");
          setTimeout(() => {
            icdSearchInputRef.current?.focus();
            setShowIcdDropdown(true);
          }, 60);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isReadOnly, isSubmitting, handleSubmit, activeSoapTab]);

  const bpAlert = getAlertForField("bloodPressure");
  const hrAlert = getAlertForField("heartRate");
  const rrAlert = getAlertForField("respiratoryRate");
  const tempAlert = getAlertForField("temperature");
  const spo2Alert = getAlertForField("oxygenSaturation");

  if (!patient || !patient.id) {
    return (
      <ModuleEmptyState
        icon={Stethoscope}
        title="Belum Ada Pasien yang Dipilih"
        description="Silakan pilih pasien dari daftar antrean poliklinik atau daftarkan pasien baru di loket pendaftaran untuk memulai penginputan formulir Rekam Medis Elektronik (SOAP)."
        actionText="Buka Daftar Antrean Pasien"
        onAction={onOpenRegistration}
      />
    );
  }

  return (
    <div className="ehr-card p-5 space-y-4">
      {/* 1. Header Card with Patient Quick Context & Templates */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs shrink-0">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="space-y-1.5 min-w-0">
            {/* Row 1: Title & Accreditation & Integration Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                Pemeriksaan Rekam Medis SOAP (DPJP)
              </h3>
              <Badge
                variant="outline"
                className="text-[9px] font-bold text-teal-800 bg-teal-50 border-teal-200 py-0.5 px-1.5"
              >
                Permenkes 24/2022
              </Badge>

              {/* Bridging Connection Status Pill */}
              {isBridgingConnected ? (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                  <img
                    src="/satusehat-default-logo.svg"
                    alt="SATUSEHAT"
                    className="h-3.5 w-3.5 object-contain shrink-0"
                  />
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span>SATUSEHAT Terhubung</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                  <span>Mode Internal (Offline)</span>
                  {onNavigateToBridging && (
                    <button
                      type="button"
                      onClick={onNavigateToBridging}
                      className="text-[9px] underline font-extrabold text-amber-950 hover:text-teal-800 cursor-pointer ml-0.5"
                    >
                      Hubungkan &rarr;
                    </button>
                  )}
                </span>
              )}

              {/* Patient Consent Status Badge */}
              {consentStatus === "opt-out" ? (
                <span className="text-[10px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1 shadow-2xs">
                  <Lock className="h-3 w-3 text-amber-700" />
                  <span>Consent: Ditolak (Internal RS)</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold text-teal-900 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-300 flex items-center gap-1.5 shadow-2xs">
                  <img
                    src="/satusehat-default-logo.svg"
                    alt="SATUSEHAT"
                    className="h-3 w-3 object-contain shrink-0"
                  />
                  <span>Consent: Disetujui (Cloud)</span>
                </span>
              )}
            </div>

            {/* Row 2: Structured Patient Metadata Chips (Lega & Presisi) */}
            <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
              <span className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-tight">
                {patient.name}
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>

              <div
                title="Nomor Rekam Medis Pasien"
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100/90 border border-slate-200/90 text-[11px] text-slate-700 shadow-2xs"
              >
                <span className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">
                  No. RM:
                </span>
                <strong className="font-mono font-bold text-slate-900">
                  {patient.mrn.replace(/^RM-?/i, "")}
                </strong>
              </div>

              <div
                title="Nomor Induk Kependudukan (Dukcapil)"
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100/90 border border-slate-200/90 text-[11px] text-slate-700 shadow-2xs"
              >
                <span className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">
                  NIK:
                </span>
                <strong className="font-mono font-bold text-slate-900 tracking-wide">
                  {patient.nik}
                </strong>
              </div>

              {(patient.ihsNumber || patient.id?.startsWith("P-")) ? (
                <div
                  title={`Pasien Terdaftar di SATUSEHAT Kemkes RI (IHS: ${patient.ihsNumber || patient.id})`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-teal-50 border border-teal-200 text-[11px] text-teal-800 shadow-2xs cursor-help"
                >
                  <img
                    src="/satusehat-default-logo.svg"
                    alt="SATUSEHAT"
                    className="h-2.5 w-2.5 object-contain shrink-0"
                  />
                  <span className="text-teal-700 font-medium text-[10px] uppercase tracking-wider">
                    IHS:
                  </span>
                  <strong className="font-mono font-bold text-teal-950 tracking-wide">
                    {patient.ihsNumber || patient.id}
                  </strong>
                </div>
              ) : (
                <div
                  title="Pasien belum memiliki nomor IHS SATUSEHAT"
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-500 shadow-2xs"
                >
                  <span className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">
                    IHS:
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    Belum Terdaftar
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Presets Bar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider flex items-center gap-1 mr-1">
            <Sparkles className="h-3 w-3 text-amber-500" />
            Template:
          </span>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => handleLoadPreset("hipertensi")}
            className="h-7 text-[11px] font-bold px-2.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 shadow-2xs cursor-pointer transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
            title="Terapkan Template SOAP Hipertensi"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
            <span>Hipertensi</span>
          </button>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => handleLoadPreset("ispa")}
            className="h-7 text-[11px] font-bold px-2.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-300 shadow-2xs cursor-pointer transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
            title="Terapkan Template SOAP ISPA"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-sky-600" />
            <span>ISPA</span>
          </button>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => handleLoadPreset("gastritis")}
            className="h-7 text-[11px] font-bold px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs cursor-pointer transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
            title="Terapkan Template SOAP Gastritis"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
            <span>Gastritis</span>
          </button>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => handleLoadPreset("diabetes")}
            className="h-7 text-[11px] font-bold px-2.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs cursor-pointer transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
            title="Terapkan Template SOAP Diabetes"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-purple-600" />
            <span>Diabetes</span>
          </button>
        </div>
      </div>

      {/* Finished Encounter Mode Banner (Read-Only View vs Correction Mode) */}
      {isEncounterFinished && (
        !isCorrectionMode ? (
          <div className="px-3.5 py-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 text-slate-800 flex items-center justify-between gap-3 shadow-2xs animate-fade-in-up">
            <div className="flex items-center gap-2.5 min-w-0">
              <Badge
                variant="outline"
                className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300 font-bold inline-flex items-center gap-1.5 py-0.5 px-2 shrink-0 shadow-2xs"
              >
                <Lock className="h-3 w-3 text-emerald-600 shrink-0" />
                <span>Arsip Terkunci</span>
              </Badge>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-extrabold text-xs text-slate-900 truncate">
                  Rekam Medis Selesai
                </span>
                <span
                  title="Pelayanan kunjungan ini telah selesai dan disahkan. Seluruh kolom formulir terkunci untuk melindungi integritas data medis sesuai Permenkes No. 24/2022."
                  className="hidden sm:inline text-[11px] text-slate-400 font-medium truncate cursor-help"
                >
                  • Dokumen sah terkunci
                </span>
              </div>
            </div>
            {(!user || user.role === "doctor") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCorrectionMode(true)}
                className="h-7.5 text-xs font-bold gap-1.5 bg-white border-slate-200 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 text-slate-700 shrink-0 cursor-pointer shadow-2xs btn-press"
              >
                <Edit3 className="h-3.5 w-3.5 text-teal-600" />
                <span>Buka Koreksi</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="px-3.5 py-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 flex items-center justify-between gap-3 shadow-2xs animate-fade-in-up">
            <div className="flex items-center gap-2.5 min-w-0">
              <Badge
                variant="outline"
                className="text-[10px] bg-amber-100 text-amber-900 border-amber-300 font-bold inline-flex items-center gap-1.5 py-0.5 px-2 shrink-0 shadow-2xs"
              >
                <Edit3 className="h-3 w-3 text-amber-700 shrink-0" />
                <span>Mode Koreksi</span>
              </Badge>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-extrabold text-xs text-amber-950 truncate">
                  Revisi Klinis Aktif
                </span>
                <span
                  title="Anda sedang mengoreksi rekam medis yang telah disahkan. Perubahan akan tercatat sebagai amandemen resmi."
                  className="hidden sm:inline text-[11px] text-amber-800/70 font-medium truncate cursor-help"
                >
                  • Perubahan akan memperbarui data
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCorrectionMode(false)}
              className="h-7.5 text-xs font-bold gap-1.5 bg-white border-amber-300 hover:bg-amber-100 text-amber-900 shrink-0 cursor-pointer shadow-2xs btn-press"
            >
              <RotateCcw className="h-3.5 w-3.5 text-amber-700" />
              <span>Batal Koreksi</span>
            </Button>
          </div>
        )
      )}

      {/* RBAC Role Guard Notice if logged-in user is not a Doctor */}
      {user && user.role !== "doctor" && (
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-start gap-3 shadow-2xs">
          <ShieldCheck className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 tracking-tight">
                Mode Peninjauan Rekam Medis (View-Only) • {user.role === "registration" ? "Petugas Pendaftaran" : user.role === "nurse" ? "Perawat Poli" : user.role === "pharmacy" ? "Apoteker / Farmasi" : "Administrator"}
              </span>
              <span className="text-[9px] font-bold bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.2 rounded">
                Permenkes 24/2022
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Sesuai <strong>Permenkes No. 24 Tahun 2022</strong>, pengisian &amp; penandatanganan berkas SOAP merupakan wewenang <strong>Dokter DPJP</strong>. Anda dapat meninjau data catatan medis ini secara lengkap.
            </p>
          </div>
        </div>
      )}

      {/* Safety Allergen Alert Banner (Persistent & Sticky if patient has allergies) */}
      {patient.allergies && patient.allergies.length > 0 && (
        <div className="sticky top-2 z-20 p-2.5 rounded-xl bg-amber-50/95 backdrop-blur-md border border-amber-300 text-xs flex items-center justify-between gap-2 shadow-xs transition-all">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0" />
            <span className="font-bold text-amber-950">
              Riwayat Alergi Pasien:
            </span>
            <div className="flex flex-wrap gap-1">
              {patient.allergies.map((allg, idx) => (
                <span
                  key={idx}
                  className="px-1.5 py-0.5 rounded bg-amber-200/90 text-amber-950 font-bold text-[10px] border border-amber-300 shadow-2xs"
                >
                  ⚠️ {allg}
                </span>
              ))}
            </div>
          </div>
          <span className="text-[10px] text-amber-800 font-semibold hidden sm:inline">
            Pemeriksaan Otomatis Interaksi &amp; Alergi Obat Aktif
          </span>
        </div>
      )}

      {/* Draft Auto-Save Recovery Notice Banner */}
      {savedDraftAvailable && !isReadOnly && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="h-8.5 w-8.5 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <RotateCcw className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-xs text-amber-950">
                  Ditemukan Draf Rekam Medis Belum Tersimpan
                </span>
                {draftTimestamp && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                    Disimpan Pukul {draftTimestamp}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                Terdapat draf pengisian dari sesi sebelumnya yang belum disahkan. Anda dapat memulihkannya langsung ke formulir.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              onClick={handleRestoreDraft}
              className="h-8 px-3.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-2xs btn-press"
            >
              Pulihkan Draf
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDismissDraft}
              className="h-8 px-3 text-xs font-semibold bg-white border-amber-300 text-amber-900 hover:bg-amber-100 cursor-pointer shadow-2xs"
            >
              Abaikan
            </Button>
          </div>
        </div>
      )}

      {/* Subtle Auto-Save Status Indicator */}
      {lastAutoSavedTime && !isReadOnly && (
        <div className="flex items-center justify-end gap-1.5 text-[11px] text-slate-500 font-medium px-1 animate-fade-in">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Tersimpan otomatis di browser pukul {lastAutoSavedTime}</span>
        </div>
      )}

      {/* 2. SOAP Guided Segmented Stepper / Navigation Tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-slate-100 p-1 rounded-xl gap-1 shadow-2xs border border-slate-200/80">
        {/* Tab S: Subjektif */}
        <button
          type="button"
          onClick={() => setActiveSoapTab("S")}
          className={`flex items-center justify-between p-2 rounded-lg text-left transition-all cursor-pointer select-none ${
            activeSoapTab === "S"
              ? "bg-white text-teal-950 shadow-xs border border-slate-200/90 font-extrabold"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`h-7 w-7 rounded-md flex items-center justify-center text-xs font-black shrink-0 ${
                activeSoapTab === "S"
                  ? "bg-teal-600 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              S
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">1. Subjektif</div>
              <div className="text-[10px] text-slate-400 font-normal truncate">
                Keluhan & Anamnesis
              </div>
            </div>
          </div>
          {isTabSComplete ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 ml-1" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0 ml-1" title="Belum Lengkap" />
          )}
        </button>

        {/* Tab O: Objektif */}
        <button
          type="button"
          onClick={() => setActiveSoapTab("O")}
          className={`flex items-center justify-between p-2 rounded-lg text-left transition-all cursor-pointer select-none ${
            activeSoapTab === "O"
              ? "bg-white text-teal-950 shadow-xs border border-slate-200/90 font-extrabold"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`h-7 w-7 rounded-md flex items-center justify-center text-xs font-black shrink-0 ${
                activeSoapTab === "O"
                  ? "bg-teal-600 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              O
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">2. Objektif</div>
              <div className="text-[10px] text-slate-400 font-normal truncate">
                TTV & Fisik ({vitalsEval.alerts.length > 0 ? "EWS Alert" : "Normal"})
              </div>
            </div>
          </div>
          {isTabOComplete ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 ml-1" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0 ml-1" title="Belum Lengkap" />
          )}
        </button>

        {/* Tab A: Asesmen */}
        <button
          type="button"
          onClick={() => setActiveSoapTab("A")}
          className={`flex items-center justify-between p-2 rounded-lg text-left transition-all cursor-pointer select-none ${
            activeSoapTab === "A"
              ? "bg-white text-teal-950 shadow-xs border border-slate-200/90 font-extrabold"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`h-7 w-7 rounded-md flex items-center justify-center text-xs font-black shrink-0 ${
                activeSoapTab === "A"
                  ? "bg-teal-600 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              A
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">3. Asesmen</div>
              <div className="text-[10px] text-slate-400 font-normal truncate">
                ICD-10 ({diagnoses.length}) & ICD-9 ({procedures.length})
              </div>
            </div>
          </div>
          {isTabAComplete ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 ml-1" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-red-400 shrink-0 ml-1" title="Wajib Diisi" />
          )}
        </button>

        {/* Tab P: Plan */}
        <button
          type="button"
          onClick={() => setActiveSoapTab("P")}
          className={`flex items-center justify-between p-2 rounded-lg text-left transition-all cursor-pointer select-none ${
            activeSoapTab === "P"
              ? "bg-white text-teal-950 shadow-xs border border-slate-200/90 font-extrabold"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`h-7 w-7 rounded-md flex items-center justify-center text-xs font-black shrink-0 ${
                activeSoapTab === "P"
                  ? "bg-teal-600 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              P
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">4. Plan & Terapi</div>
              <div className="text-[10px] text-slate-400 font-normal truncate">
                E-Resep ({prescriptions.length} Obat) & Edukasi
              </div>
            </div>
          </div>
          {isTabPComplete ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 ml-1" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0 ml-1" title="Belum Diisi" />
          )}
        </button>
      </div>

      {/* 3. SOAP TAB CONTENTS */}

      {/* ===================== TAB S: SUBJEKTIF ===================== */}
      {activeSoapTab === "S" && (
        <div className="space-y-4 animate-in fade-in-50 duration-150">
          <div className="p-3.5 rounded-xl bg-teal-50/40 border border-teal-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-teal-950 flex items-center gap-1.5 uppercase tracking-wide">
                <FileText className="h-3.5 w-3.5 text-teal-700" />
                <span>Informasi Kunjungan &amp; Keluhan Pasien</span>
              </span>
              <span className="text-[10px] text-teal-800 font-bold bg-teal-100/80 px-2 py-0.5 rounded-md border border-teal-200/60 shadow-2xs">
                Langkah 1 dari 4
              </span>
            </div>

            {/* Poli Tujuan & DPJP */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Poliklinik / Ruang Pelayanan *</span>
                  {activeEncounter?.encounterStatus === "finished" ? (
                    <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      🔒 Riwayat Selesai
                    </span>
                  ) : activeEncounter?.clinicDepartment ? (
                    <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      🔒 Terdaftar di Loket
                    </span>
                  ) : (
                    <span className="text-[10px] text-teal-700 font-medium">Unit Rawat Jalan</span>
                  )}
                </Label>
                <CustomSelect<string>
                  value={department}
                  options={clinicOptions}
                  onChange={handleClinicChange}
                  placeholder="Pilih Poliklinik..."
                  className="w-full"
                  disabled={Boolean(activeEncounter?.clinicDepartment) || isReadOnly}
                  title={
                    activeEncounter?.clinicDepartment
                      ? "Poliklinik dikunci sesuai data registrasi pendaftaran loket."
                      : undefined
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Dokter Penanggung Jawab (DPJP) *</span>
                  <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    <span>SIP &amp; IHS Terverifikasi</span>
                  </span>
                </Label>
                <CustomSelect<string>
                  value={doctorName}
                  options={doctorOptions}
                  onChange={handleDoctorChange}
                  placeholder="Pilih Dokter DPJP..."
                  className="w-full"
                  disabled={isReadOnly}
                />
              </div>
            </div>

            {/* Keluhan Utama */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-teal-950">
                  Keluhan Utama Pasien *
                </Label>
                {!chiefComplaint.trim() && (
                  <span className="text-[10px] text-red-600 font-bold">Wajib diisi</span>
                )}
              </div>
              <Input
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                disabled={isReadOnly}
                readOnly={isReadOnly}
                placeholder="Contoh: Nyeri kepala tengkuk berdenyut sejak 3 hari"
                className={`h-9 text-xs bg-white rounded-lg ${
                  !chiefComplaint.trim()
                    ? "border-red-400 focus:ring-red-300 ring-1 ring-red-200"
                    : "border-teal-300 focus:border-teal-500"
                } ${isReadOnly ? "bg-slate-50 text-slate-800 cursor-not-allowed border-slate-200" : ""}`}
              />
            </div>

            {/* Riwayat Penyakit Sekarang (Anamnesis) */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Riwayat Penyakit Sekarang (RPS / Anamnesis Rinci)
              </Label>
              <textarea
                value={anamnesis}
                onChange={(e) => setAnamnesis(e.target.value)}
                disabled={isReadOnly}
                readOnly={isReadOnly}
                rows={3}
                placeholder="Jelaskan onset, durasi, lokasi, kualitas nyeri, faktor pemberat/peringan, serta riwayat pengobatan sebelumnya..."
                className={`w-full text-xs p-2.5 rounded-lg border border-teal-200 bg-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 leading-relaxed text-slate-800 ${
                  isReadOnly ? "bg-slate-50 text-slate-800 cursor-not-allowed border-slate-200" : ""
                }`}
              />
            </div>

            {/* Riwayat Penyakit Dahulu & Riwayat Keluarga */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Riwayat Penyakit Dahulu (RPD) &amp; Riwayat Keluarga
              </Label>
              <Input
                value={pastMedicalHistory}
                onChange={(e) => setPastMedicalHistory(e.target.value)}
                disabled={isReadOnly}
                readOnly={isReadOnly}
                placeholder="Contoh: Hipertensi sejak 2021, DM disangkal. Ayah riwayat stroke."
                className={`h-9 text-xs bg-white border-slate-200 focus:border-teal-500 rounded-lg ${
                  isReadOnly ? "bg-slate-50 text-slate-800 cursor-not-allowed border-slate-200" : ""
                }`}
              />
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB O: OBJEKTIF ===================== */}
      {activeSoapTab === "O" && (
        <div className="space-y-4 animate-in fade-in-50 duration-150">
          <div className="p-3.5 rounded-xl bg-teal-50/40 border border-teal-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-teal-950 flex items-center gap-1.5 uppercase tracking-wide">
                <Activity className="h-3.5 w-3.5 text-teal-700" />
                <span>Tanda-Tanda Vital &amp; Pemeriksaan Fisik</span>
              </span>
              <span className="text-[10px] text-teal-800 font-bold bg-teal-100/80 px-2 py-0.5 rounded-md border border-teal-200/60 shadow-2xs">
                Langkah 2 dari 4
              </span>
            </div>

            {/* 8 Parameter TTV Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Sistolik */}
              <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                  Sistolik (mmHg) *
                </span>
                <Input
                  type="number"
                  value={systolic}
                  disabled={isReadOnly}
                  readOnly={isReadOnly}
                  onChange={(e) => setSystolic(e.target.value)}
                  className={`h-8 font-mono text-xs ${isReadOnly ? "bg-slate-50 text-slate-800 cursor-not-allowed" : "bg-slate-50/50"}`}
                />
                {bpAlert ? (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded block truncate ${
                      bpAlert.level === "critical"
                        ? "bg-red-100 text-red-800 border border-red-200"
                        : bpAlert.level === "warning"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                    title={bpAlert.message}
                  >
                    {bpAlert.label}
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-400 block truncate">Normal: 90-120</span>
                )}
              </div>

              {/* Diastolik */}
              <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                  Diastolik (mmHg) *
                </span>
                <Input
                  type="number"
                  value={diastolic}
                  disabled={isReadOnly}
                  readOnly={isReadOnly}
                  onChange={(e) => setDiastolic(e.target.value)}
                  className={`h-8 font-mono text-xs ${isReadOnly ? "bg-slate-50 text-slate-800 cursor-not-allowed" : "bg-slate-50/50"}`}
                />
                <span className="text-[9px] text-slate-400 block truncate">Normal: 60-80</span>
              </div>

              {/* Detak Nadi */}
              <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                  Detak Nadi (bpm) *
                </span>
                <Input
                  type="number"
                  value={heartRate}
                  disabled={isReadOnly}
                  readOnly={isReadOnly}
                  onChange={(e) => setHeartRate(e.target.value)}
                  className={`h-8 font-mono text-xs ${isReadOnly ? "bg-slate-50 text-slate-800 cursor-not-allowed" : "bg-slate-50/50"}`}
                />
                {hrAlert ? (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded block truncate ${
                      hrAlert.level === "critical"
                        ? "bg-red-100 text-red-800"
                        : hrAlert.level === "warning"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {hrAlert.label}
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-400 block truncate">Normal: 60-100</span>
                )}
              </div>

              {/* Suhu Tubuh */}
              <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                  Suhu Tubuh (°C) *
                </span>
                <Input
                  type="number"
                  step="0.1"
                  value={temperature}
                  disabled={isReadOnly}
                  readOnly={isReadOnly}
                  onChange={(e) => setTemperature(e.target.value)}
                  className={`h-8 font-mono text-xs ${isReadOnly ? "bg-slate-50 text-slate-800 cursor-not-allowed" : "bg-slate-50/50"}`}
                />
                {tempAlert ? (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded block truncate ${
                      tempAlert.level === "critical"
                        ? "bg-red-100 text-red-800"
                        : tempAlert.level === "warning"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {tempAlert.label}
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-400 block truncate">Normal: 36.5-37.5</span>
                )}
              </div>
            </div>

            {/* Parameter Lanjutan: RR, SpO2, BB, TB + Kalkulator BMI Otomatis */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                  Laju Napas (x/mnt)
                </span>
                <Input
                  type="number"
                  value={respiratoryRate}
                  disabled={isReadOnly}
                  readOnly={isReadOnly}
                  onChange={(e) => setRespiratoryRate(e.target.value)}
                  className={`h-8 font-mono text-xs ${isReadOnly ? "bg-slate-50 text-slate-800 cursor-not-allowed" : "bg-slate-50/50"}`}
                />
                {rrAlert ? (
                  <span className="text-[9px] font-bold text-slate-600 block truncate">{rrAlert.label}</span>
                ) : (
                  <span className="text-[9px] text-slate-400 block truncate">Normal: 12-20</span>
                )}
              </div>

              <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                  Saturasi SpO2 (%)
                </span>
                <Input
                  type="number"
                  value={oxygenSaturation}
                  disabled={isReadOnly}
                  readOnly={isReadOnly}
                  onChange={(e) => setOxygenSaturation(e.target.value)}
                  className={`h-8 font-mono text-xs ${isReadOnly ? "bg-slate-50 text-slate-800 cursor-not-allowed" : "bg-slate-50/50"}`}
                />
                {spo2Alert ? (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded block truncate ${
                      spo2Alert.level === "critical"
                        ? "bg-red-100 text-red-800"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {spo2Alert.label} ({oxygenSaturation}%)
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-400 block truncate">Normal: ≥ 95%</span>
                )}
              </div>

              <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                  Berat Badan (kg)
                </span>
                <Input
                  type="number"
                  step="0.5"
                  value={weightKg}
                  disabled={isReadOnly}
                  readOnly={isReadOnly}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className={`h-8 font-mono text-xs ${isReadOnly ? "bg-slate-50 text-slate-800 cursor-not-allowed" : "bg-slate-50/50"}`}
                />
                {calculatedBmi && (
                  <span className="text-[9px] font-mono text-slate-500 block truncate">
                    BMI: <strong>{calculatedBmi}</strong>
                  </span>
                )}
              </div>

              <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                  Tinggi Badan (cm)
                </span>
                <Input
                  type="number"
                  value={heightCm}
                  disabled={isReadOnly}
                  readOnly={isReadOnly}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className={`h-8 font-mono text-xs ${isReadOnly ? "bg-slate-50 text-slate-800 cursor-not-allowed" : "bg-slate-50/50"}`}
                />
                {calculatedBmi && (
                  <span
                    className={`text-[9px] font-bold px-1 py-0.5 rounded block truncate border ${
                      getBmiCategory(parseFloat(calculatedBmi)).color
                    }`}
                  >
                    {getBmiCategory(parseFloat(calculatedBmi)).label}
                  </span>
                )}
              </div>
            </div>

            {/* Catatan Pemeriksaan Fisik Head to Toe */}
            <div className="space-y-1 pt-1">
              <Label className="text-xs font-semibold text-slate-700">
                Catatan Pemeriksaan Fisik Lengkap (Head to Toe)
              </Label>
              <textarea
                value={physicalExamNotes}
                onChange={(e) => setPhysicalExamNotes(e.target.value)}
                disabled={isReadOnly}
                readOnly={isReadOnly}
                rows={2}
                placeholder="Mata, THT, Thorax (Cor/Pulmo), Abdomen, Ekstremitas, Status Lokalis..."
                className={`w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 leading-relaxed text-slate-800 font-sans ${
                  isReadOnly ? "bg-slate-50 text-slate-800 cursor-not-allowed" : ""
                }`}
              />
            </div>

            {/* Hasil Penunjang Diagnostik (Lab & Radiologi) Terintegrasi */}
            {((activeEncounter?.labResults && activeEncounter.labResults.length > 0) ||
              (activeEncounter?.radiologyResults && activeEncounter.radiologyResults.length > 0)) && (
              <div className="space-y-2 pt-2 border-t border-teal-200/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-teal-950 flex items-center gap-1.5 uppercase tracking-wide">
                    <FlaskConical className="h-3.5 w-3.5 text-teal-700" />
                    <span>Hasil Penunjang Terintegrasi</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {activeEncounter.labResults && activeEncounter.labResults.length > 0 && (
                      <span className="text-[10px] font-bold text-teal-900 bg-teal-100 px-2 py-0.5 rounded border border-teal-200">
                        {activeEncounter.labResults.length} Lab
                      </span>
                    )}
                    {activeEncounter.radiologyResults && activeEncounter.radiologyResults.length > 0 && (
                      <span className="text-[10px] font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                        {activeEncounter.radiologyResults.length} Rad
                      </span>
                    )}
                  </div>
                </div>

                {/* Lab Results Quick Grid */}
                {activeEncounter.labResults && activeEncounter.labResults.length > 0 && (
                  <div className="rounded-xl border border-teal-200 bg-white p-2.5 space-y-1.5 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-700 uppercase block">
                      Hasil Laboratorium:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {activeEncounter.labResults.map((lr) => (
                        <div
                          key={lr.id}
                          className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs gap-2"
                        >
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate">
                              {lr.testName}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              Ref: {lr.referenceRange} {lr.unit}
                            </span>
                          </div>
                          <div className="text-right shrink-0 flex items-center gap-1.5">
                            <span className="font-mono font-extrabold text-slate-900">
                              {lr.value} {lr.unit}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                                lr.flag === "normal"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : lr.flag === "high"
                                  ? "bg-amber-50 text-amber-900 border-amber-300"
                                  : lr.flag === "low"
                                  ? "bg-blue-50 text-blue-900 border-blue-300"
                                  : "bg-rose-50 text-rose-900 border-rose-300 font-extrabold"
                              }`}
                            >
                              {lr.flag}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Radiology Results Quick Grid */}
                {activeEncounter.radiologyResults && activeEncounter.radiologyResults.length > 0 && (
                  <div className="rounded-xl border border-blue-200 bg-white p-2.5 space-y-1.5 shadow-2xs">
                    <span className="text-[10px] font-bold text-blue-900 uppercase block">
                      Ekspertise Radiologi:
                    </span>
                    <div className="space-y-1.5">
                      {activeEncounter.radiologyResults.map((rad) => (
                        <div
                          key={rad.id}
                          className="p-2 rounded-lg bg-blue-50/40 border border-blue-200 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-blue-950">
                              [{rad.modality}] {rad.examName}
                            </span>
                            <span className="text-[10px] text-slate-500 font-normal">
                              {rad.radiologistName}
                            </span>
                          </div>
                          <p className="text-slate-800 font-medium">
                            <strong>Kesimpulan:</strong> {rad.conclusion}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB A: ASESMEN ===================== */}
      {activeSoapTab === "A" && (
        <div className="space-y-4 animate-in fade-in-50 duration-150">
          {/* 1. Diagnosa ICD-10 */}
          <div className="p-3.5 rounded-xl bg-teal-50/40 border border-teal-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-teal-950 flex items-center gap-1.5 uppercase tracking-wide">
                  <Stethoscope className="h-3.5 w-3.5 text-teal-700" />
                  <span>Diagnosis Medis</span>
                </span>
                {diagnoses.some((d) => d.type === "primary") ? (
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 shadow-2xs">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    Diagnosa Utama Terpenuhi
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-900 font-bold bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="h-3 w-3 text-amber-600" />
                    Wajib 1 Diagnosa Utama
                  </span>
                )}
              </div>
              <span className="text-[10px] text-teal-800 font-bold bg-teal-100/80 px-2 py-0.5 rounded-md border border-teal-200/60 shadow-2xs">
                Langkah 3 dari 4
              </span>
            </div>

            {/* Selected Diagnoses Chips */}
            <div className="flex flex-wrap gap-2">
              {diagnoses.length === 0 ? (
                <div className="p-2.5 text-slate-400 text-xs italic">
                  Belum ada diagnosis medis yang dipilih.
                </div>
              ) : (
                diagnoses.map((d) => (
                  <div
                    key={d.code}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs shadow-2xs ${
                      d.type === "primary"
                        ? "bg-teal-50 border-teal-300 text-teal-950 font-bold ring-1 ring-teal-500/20"
                        : "bg-white border-slate-200 text-slate-800"
                    }`}
                  >
                    <span
                      className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                        d.type === "primary"
                          ? "bg-teal-700 text-white"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {d.code}
                    </span>
                    <span>{d.patientFriendlyName}</span>
                    {d.type === "primary" ? (
                      <span className="text-[9px] text-teal-800 font-extrabold uppercase bg-teal-200/70 px-1 py-0.2 rounded">
                        Utama
                      </span>
                    ) : !isReadOnly ? (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryDiagnosis(d.code)}
                        className="text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-1.5 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                        title="Jadikan Diagnosa Utama"
                      >
                        <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                        <span>Jadikan Utama</span>
                      </button>
                    ) : null}
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDiagnosis(d.code)}
                        className="text-slate-400 hover:text-red-600 p-0.5 rounded transition-colors cursor-pointer ml-1 font-bold"
                        title="Hapus diagnosis"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* ICD-10 Search & Dropdown Selector (Only when not Read-Only) */}
            {!isReadOnly && (
              <div className="relative pt-1">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      ref={icdSearchInputRef}
                      value={icdSearch}
                      onFocus={() => setShowIcdDropdown(true)}
                      onChange={(e) => {
                        setIcdSearch(e.target.value);
                        setShowIcdDropdown(true);
                      }}
                      placeholder="Cari kode atau nama diagnosis (contoh: I10, E11, ISPA, Gastritis, Asma)..."
                      className="h-8.5 text-xs bg-white pl-8 pr-14 border-slate-300 rounded-lg"
                    />
                    <kbd className="absolute right-2.5 top-2 hidden sm:inline-flex items-center text-[9px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                      Ctrl+K
                    </kbd>
                  </div>
                  {showIcdDropdown && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowIcdDropdown(false)}
                      className="h-8.5 text-xs text-slate-500 cursor-pointer"
                    >
                      Tutup
                    </Button>
                  )}
                </div>

                {showIcdDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl z-50 max-h-52 overflow-y-auto divide-y divide-slate-100">
                    {filteredIcdOptions.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => handleAddDiagnosis(item)}
                        className="w-full text-left p-2.5 hover:bg-teal-50 transition-colors flex items-center justify-between text-xs cursor-pointer"
                      >
                        <div>
                          <span className="font-bold text-slate-900">{item.name}</span>
                          <span className="text-[10px] text-slate-500 block">{item.display}</span>
                        </div>
                        <span className="font-mono text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                          {item.code}
                        </span>
                      </button>
                    ))}
                    {icdSearch.trim() && (
                      <button
                        type="button"
                        onClick={() => handleAddCustomDiagnosis(icdSearch)}
                        className="w-full text-left p-2.5 bg-teal-50/80 hover:bg-teal-100 text-teal-950 font-bold text-xs flex items-center justify-between cursor-pointer"
                      >
                        <span>+ Gunakan Diagnosa Kustom: "{icdSearch}"</span>
                        <span className="font-mono text-[10px] bg-white text-teal-800 px-1.5 py-0.5 rounded border border-teal-200">
                          Kustom
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Tindakan / Prosedur Medis ICD-9-CM */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                <Syringe className="h-3.5 w-3.5 text-teal-600" />
                <span>Tindakan &amp; Prosedur Medis</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {procedures.length} Tindakan Dipilih
              </span>
            </div>

            {/* Selected Procedures Chips */}
            <div className="flex flex-wrap gap-2">
              {procedures.length === 0 ? (
                <div className="p-2.5 text-slate-400 text-xs italic">
                  Belum ada tindakan medis yang dipilih.
                </div>
              ) : (
                procedures.map((p) => (
                  <div
                    key={p.code}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs shadow-2xs bg-white border-teal-200 text-slate-800"
                  >
                    <span className="font-mono font-bold px-1.5 py-0.5 rounded text-[10px] bg-teal-700 text-white">
                      {p.code}
                    </span>
                    <span className="font-semibold text-slate-900">{p.notes || p.display}</span>
                    <span className="text-[9px] text-teal-800 font-semibold bg-teal-50 px-1 py-0.5 rounded border border-teal-200">
                      {p.category}
                    </span>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemoveProcedure(p.code)}
                        className="text-slate-400 hover:text-red-600 p-0.5 rounded transition-colors cursor-pointer ml-1 font-bold"
                        title="Hapus tindakan"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Quick Common Presets (Only when not Read-Only) */}
            {!isReadOnly && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] font-bold text-slate-500">Preset Cepat:</span>
                {COMMON_ICD9_LIST.slice(0, 6).map((proc) => (
                  <button
                    key={proc.code}
                    type="button"
                    onClick={() => handleAddProcedure(proc)}
                    className="text-[10px] bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 hover:border-teal-300 px-2 py-0.5 rounded-md transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span className="font-mono font-semibold text-teal-700">{proc.code}</span>
                    <span>{proc.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* ICD-9-CM Search & Dropdown Selector (Only when not Read-Only) */}
            {!isReadOnly && (
              <div className="relative pt-1">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      value={icd9Search}
                      onFocus={() => setShowIcd9Dropdown(true)}
                      onChange={(e) => {
                        setIcd9Search(e.target.value);
                        setShowIcd9Dropdown(true);
                      }}
                      placeholder="Cari kode atau nama tindakan (contoh: 89.52, EKG, Nebulisasi, Injeksi, Rawat Luka)..."
                      className="h-8.5 text-xs bg-white pl-8 border-slate-300 rounded-lg"
                    />
                  </div>
                  {showIcd9Dropdown && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowIcd9Dropdown(false)}
                      className="h-8.5 text-xs text-slate-500 cursor-pointer"
                    >
                      Tutup
                    </Button>
                  )}
                </div>

                {showIcd9Dropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl z-50 max-h-52 overflow-y-auto divide-y divide-slate-100">
                    {filteredIcd9Options.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => handleAddProcedure(item)}
                        className="w-full text-left p-2.5 hover:bg-teal-50 transition-colors flex items-center justify-between text-xs cursor-pointer"
                      >
                        <div>
                          <span className="font-bold text-slate-900">{item.name}</span>
                          <span className="text-[10px] text-slate-500 block">{item.display}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.category}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                            {item.code}
                          </span>
                        </div>
                      </button>
                    ))}
                    {icd9Search.trim() && (
                      <button
                        type="button"
                        onClick={() => handleAddCustomProcedure(icd9Search)}
                        className="w-full text-left p-2.5 bg-teal-50/80 hover:bg-teal-100 text-teal-950 font-bold text-xs flex items-center justify-between cursor-pointer"
                      >
                        <span>+ Gunakan Tindakan Kustom: "{icd9Search}"</span>
                        <span className="font-mono text-[10px] bg-white text-teal-800 px-1.5 py-0.5 rounded border border-teal-200">
                          Kustom
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB P: PLAN & TERAPI ===================== */}
      {activeSoapTab === "P" && (
        <div className="space-y-4 animate-in fade-in-50 duration-150">
          {/* 1. Kamus Farmasi & Alkes (KFA) Medication Selector with CPOE Safety */}
          <div className="p-3.5 rounded-xl bg-teal-50/40 border border-teal-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-teal-950 flex items-center gap-1.5 uppercase tracking-wide">
                  <Pill className="h-3.5 w-3.5 text-teal-700" />
                  <span>Penulisan E-Resep Obat</span>
                </span>
                <span className="text-[10px] text-teal-800/80 font-mono hidden sm:inline">
                  ({prescriptions.length} Item Obat)
                </span>
              </div>
              <span className="text-[10px] text-teal-800 font-bold bg-teal-100/80 px-2 py-0.5 rounded-md border border-teal-200/60 shadow-2xs">
                Langkah 4 dari 4
              </span>
            </div>

            {/* Allergy Warning Alert Banner if conflict detected */}
            {allergyWarning && (
              <div className="p-3 rounded-lg bg-red-50 border-2 border-red-300 text-xs text-red-900 space-y-1 animate-pulse shadow-xs">
                <div className="flex items-center gap-1.5 font-extrabold text-red-800">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>PERINGATAN: PASIEN MEMILIKI RIWAYAT ALERGI OBAT</span>
                </div>
                <p className="text-[11px] leading-relaxed text-red-950 font-medium">
                  {allergyWarning}
                </p>
              </div>
            )}

            {/* Quick Common Presets (Only when not Read-Only) */}
            {!isReadOnly && (
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] font-bold text-slate-500">Preset Cepat:</span>
                {KFA_MEDICATIONS_DATABASE.slice(0, 6).map((med) => (
                  <button
                    key={med.kfaCode}
                    type="button"
                    onClick={() => handleAddKfaMedication(med)}
                    className="text-[10px] bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 hover:border-teal-300 px-2 py-0.5 rounded-md transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span className="font-semibold text-slate-900">{med.name.split(" ")[0]}</span>
                    <span className="text-slate-500 font-mono text-[9px]">{med.strength}</span>
                  </button>
                ))}
              </div>
            )}

            {/* KFA Search Bar (Only when not Read-Only) */}
            {!isReadOnly && (
              <div className="relative pt-1">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      ref={kfaSearchInputRef}
                      value={kfaSearch}
                      onFocus={() => setShowKfaDropdown(true)}
                      onClick={() => setShowKfaDropdown(true)}
                      onChange={(e) => {
                        setKfaSearch(e.target.value);
                        setShowKfaDropdown(true);
                      }}
                      placeholder="Ketik nama obat KFA (Contoh: Paracetamol, Amlodipine, Metformin, Amoxicillin, Omeprazole)..."
                      className="h-8.5 text-xs bg-white pl-8 pr-14 border-slate-300 rounded-lg focus:border-teal-500"
                    />
                    <kbd className="absolute right-2.5 top-2 hidden sm:inline-flex items-center text-[9px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                      Ctrl+K
                    </kbd>
                  </div>
                  {showKfaDropdown && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowKfaDropdown(false)}
                      className="h-8.5 text-xs text-slate-500 cursor-pointer"
                    >
                      Tutup
                    </Button>
                  )}
                </div>

                {showKfaDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                    <div className="p-2 bg-slate-50/90 text-[10px] font-bold text-slate-500 border-b border-slate-100 flex items-center justify-between">
                      <span>DAFTAR OBAT KAMUS FARMASI (KFA)</span>
                      <span>{filteredKfaOptions.length} Obat Tersedia</span>
                    </div>
                    {filteredKfaOptions.map((med) => {
                      const hasAllergyConflict = checkDrugAllergyConflict(
                        patient?.allergies,
                        med.name
                      ).hasConflict;

                      return (
                        <button
                          key={med.kfaCode}
                          type="button"
                          onClick={() => handleAddKfaMedication(med)}
                          className={`w-full text-left p-2.5 transition-colors flex items-center justify-between text-xs cursor-pointer ${
                            hasAllergyConflict
                              ? "bg-red-50/70 hover:bg-red-100/80"
                              : "hover:bg-teal-50/80"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{med.name}</span>
                              {hasAllergyConflict && (
                                <span className="text-[9px] bg-red-600 text-white font-extrabold px-1.5 py-0.2 rounded">
                                  ⚠️ Alergi Pasien
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {med.genericName} • {med.form} • {med.strength}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                              KFA: {med.kfaCode}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                    {kfaSearch.trim() && (
                      <button
                        type="button"
                        onClick={() => handleAddCustomMedication(kfaSearch)}
                        className="w-full text-left p-2.5 bg-teal-50/80 hover:bg-teal-100 text-teal-950 font-bold text-xs flex items-center justify-between cursor-pointer"
                      >
                        <span>+ Tambahkan Obat Kustom: "{kfaSearch}"</span>
                        <span className="font-mono text-[10px] bg-white text-teal-800 px-1.5 py-0.5 rounded border border-teal-200">
                          Kustom
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Safety Guard: Persistent Drug Allergy Conflict Banner */}
            {(() => {
              if (!patient?.allergies || patient.allergies.length === 0 || prescriptions.length === 0) return null;
              const conflicts: { medName: string; conflict: string }[] = [];
              for (const rx of prescriptions) {
                const check = checkDrugAllergyConflict(patient.allergies, rx.medicationName);
                if (check.hasConflict) {
                  conflicts.push({
                    medName: rx.medicationName,
                    conflict: check.conflictingAllergens.join(", ") || (check.message || "Alergi Pasien"),
                  });
                }
              }
              if (conflicts.length === 0) return null;

              return (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-950 space-y-2 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4.5 w-4.5 text-red-600 shrink-0" />
                    <span className="font-extrabold text-xs text-red-900 uppercase tracking-wide">
                      Peringatan Kritis: Potensi Reaksi Alergi Obat Terdeteksi!
                    </span>
                  </div>
                  <p className="text-[11px] text-red-800 leading-relaxed">
                    Satu atau lebih obat dalam resep bertentangan dengan riwayat alergi yang tercatat pada profil pasien:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {conflicts.map((c, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-200/90 text-red-950 font-bold text-[11px] border border-red-300"
                      >
                        ⚠️ <strong>{c.medName}</strong> &rarr; {c.conflict}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Prescribed Items Table with Inline Controls */}
            <div className="space-y-2.5">
              {prescriptions.length === 0 ? (
                <div className="p-4 text-center border border-dashed border-slate-200 rounded-lg bg-white text-xs text-slate-400">
                  Belum ada obat yang diresepkan. Cari obat pada kolom di atas untuk menambahkan.
                </div>
              ) : (
                prescriptions.map((p, idx) => {
                  const conflict = checkDrugAllergyConflict(patient.allergies, p.medicationName);

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border space-y-2.5 text-xs ${
                        conflict.hasConflict
                          ? "bg-red-50/80 border-red-300 ring-1 ring-red-200"
                          : "bg-white border-slate-200 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 text-xs">
                            {p.medicationName}
                          </span>
                          <span className="font-mono text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                            KFA: {p.kfaCode}
                          </span>
                          {conflict.hasConflict && (
                            <span className="text-[9px] bg-red-600 text-white font-extrabold px-1.5 py-0.2 rounded">
                              ⚠️ Alergen Terdeteksi
                            </span>
                          )}
                        </div>

                        {!isReadOnly && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemovePrescription(idx)}
                            className="h-7 w-7 text-slate-400 hover:text-red-600 shrink-0 cursor-pointer"
                            title="Hapus item obat"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* Interactive Dose, Frequency & Timing Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-slate-50/70 p-2.5 rounded-lg border border-slate-200/80">
                        <div>
                          <Label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                            Aturan Pakai:
                          </Label>
                          <Input
                            value={p.frequency}
                            disabled={isReadOnly}
                            readOnly={isReadOnly}
                            onChange={(e) =>
                              handleUpdatePrescription(idx, "frequency", e.target.value)
                            }
                            placeholder="Contoh: 3 x 1 tablet sehari"
                            className={`h-7 text-xs bg-white border-slate-300 ${isReadOnly ? "bg-slate-50 text-slate-800 cursor-not-allowed" : ""}`}
                          />
                        </div>

                        <div>
                          <Label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                            Waktu Minum:
                          </Label>
                          <CustomSelect<string>
                            value={p.timing || "Sesudah Makan"}
                            disabled={isReadOnly}
                            onChange={(val) =>
                              handleUpdatePrescription(idx, "timing", val)
                            }
                            size="sm"
                            className="w-full"
                            buttonClassName={`h-7 text-xs bg-white border-slate-300 font-medium px-2 py-0.5 ${isReadOnly ? "bg-slate-50 text-slate-800 cursor-not-allowed" : ""}`}
                            options={[
                              { value: "Sesudah Makan", label: "Sesudah Makan" },
                              { value: "Sebelum Makan", label: "Sebelum Makan" },
                              { value: "Bersama Makanan", label: "Bersama Makanan" },
                              { value: "Sesuai Kebutuhan", label: "Sesuai Kebutuhan (PRN)" },
                            ]}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <Label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                              Jumlah:
                            </Label>
                            <Input
                              type="number"
                              min="1"
                              value={p.quantity}
                              disabled={isReadOnly}
                              readOnly={isReadOnly}
                              onChange={(e) =>
                                handleUpdatePrescription(
                                  idx,
                                  "quantity",
                                  parseInt(e.target.value) || 1
                                )
                              }
                              className={`h-7 text-xs bg-white border-slate-300 font-bold ${isReadOnly ? "bg-slate-50 text-slate-800 cursor-not-allowed" : ""}`}
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                              Hari:
                            </Label>
                            <Input
                              type="number"
                              min="1"
                              value={p.durationDays}
                              disabled={isReadOnly}
                              readOnly={isReadOnly}
                              onChange={(e) =>
                                handleUpdatePrescription(
                                  idx,
                                  "durationDays",
                                  parseInt(e.target.value) || 1
                                )
                              }
                              className={`h-7 text-xs bg-white border-slate-300 font-bold ${isReadOnly ? "bg-slate-50 text-slate-800 cursor-not-allowed" : ""}`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 2. Disposisi Pasien, Rencana Tindak Lanjut & Kontrol Ulang */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                <Clock className="h-3.5 w-3.5 text-teal-600" />
                <span>Disposisi Kepulangan &amp; Rencana Tindak Lanjut</span>
              </Label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Disposisi Pasien (Cara Keluar Poli):</Label>
                <CustomSelect<string>
                  value={dischargeDisposition}
                  disabled={isReadOnly}
                  onChange={(val) => setDischargeDisposition(val)}
                  size="md"
                  className="w-full"
                  buttonClassName={`h-9 bg-white border-slate-300 rounded-lg ${isReadOnly ? "bg-slate-50 text-slate-800 cursor-not-allowed" : ""}`}
                  options={[
                    { value: "Pulang Berobat Jalan", label: "Pulang Berobat Jalan (Selesai Pelayanan)" },
                    { value: "Kontrol Kembali", label: "Kontrol Kembali (Jadwal Terencana)" },
                    { value: "Rawat Inap", label: "Rawat Inap / Opname (Admisi)" },
                    { value: "Dirujuk ke RS Lain", label: "Dirujuk ke RS / Faskes Lain (Eksternal)" },
                    { value: "Konsul Internal Poli Lain", label: "Konsul Internal Poli Lain" },
                    { value: "Meninggal", label: "Meninggal Dunia" },
                  ]}
                />
              </div>

              {(dischargeDisposition === "Kontrol Kembali" || dischargeDisposition === "Pulang Berobat Jalan") && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <span>Tanggal Rencana Kontrol Ulang:</span>
                    {dischargeDisposition === "Kontrol Kembali" ? (
                      <span className="inline-flex items-center gap-0.5 text-rose-500 font-bold text-2xs bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                        * Wajib Diisi
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal text-2xs">(Opsional)</span>
                    )}
                  </Label>
                  <CustomDatePicker
                    value={nextVisitDate}
                    disabled={isReadOnly}
                    onChange={setNextVisitDate}
                    placeholder="Pilih Tanggal Kontrol Ulang..."
                    minDate={new Date().toISOString().split("T")[0]}
                    size="md"
                    buttonClassName={`w-full h-9 text-xs bg-white border-slate-300 rounded-lg shadow-2xs font-medium ${isReadOnly ? "bg-slate-50 text-slate-800 cursor-not-allowed" : ""}`}
                  />
                </div>
              )}

              {(dischargeDisposition === "Dirujuk ke RS Lain" || dischargeDisposition === "Konsul Internal Poli Lain") && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <span>Tujuan Faskes Rujukan / Spesialis Konsul:</span>
                    <span className="inline-flex items-center gap-0.5 text-rose-500 font-bold text-2xs bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                      * Wajib Diisi
                    </span>
                  </Label>
                  <Input
                    value={referredToHospital}
                    disabled={isReadOnly}
                    readOnly={isReadOnly}
                    onChange={(e) => setReferredToHospital(e.target.value)}
                    placeholder="Contoh: RSUPN Dr. Cipto Mangunkusumo / Poli Jantung"
                    className={`h-9 text-xs bg-white border-slate-300 rounded-lg ${isReadOnly ? "bg-slate-50 text-slate-800 cursor-not-allowed" : ""}`}
                  />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Instruksi Edukasi &amp; Catatan Pulang Pasien:</Label>
              <textarea
                value={followUpNotes}
                disabled={isReadOnly}
                readOnly={isReadOnly}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                rows={2}
                placeholder="Instruksi diet, anjuran istirahat, jadwal minum obat, tanda bahaya yang harus diwaspadai..."
                className={`w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 leading-relaxed text-slate-800 font-sans ${
                  isReadOnly ? "bg-slate-50 text-slate-800 cursor-not-allowed" : ""
                }`}
              />
            </div>
          </div>

          {/* 3. Manajemen Persetujuan Pasien (Patient Consent SATUSEHAT) */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                <img
                  src="/satusehat-default-logo.svg"
                  alt="SATUSEHAT"
                  className="h-3.5 w-3.5 object-contain shrink-0"
                />
                <span>Persetujuan Pertukaran Data SATUSEHAT</span>
              </span>
              <span className="text-[10px] text-teal-700 bg-teal-100/70 font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-teal-600" />
                Otomatis Diwarisi dari Profil Pasien
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
              {/* Option 1: Opt-In */}
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => {
                  if (isReadOnly) return;
                  setConsentStatus("opt-in");
                  toast.success("Persetujuan pasien: Opt-In");
                }}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                  isReadOnly ? "cursor-not-allowed opacity-90" : "cursor-pointer"
                } ${
                  consentStatus === "opt-in"
                    ? "bg-teal-50/80 border-teal-400 ring-2 ring-teal-500/20 shadow-xs"
                    : "bg-white border-slate-200 hover:border-teal-200 hover:bg-slate-50/50"
                }`}
              >
                <div
                  className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    consentStatus === "opt-in"
                      ? "bg-white border border-teal-200 shadow-2xs"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {consentStatus === "opt-in" ? (
                    <img
                      src="/satusehat-default-logo.svg"
                      alt="SATUSEHAT"
                      className="h-4 w-4 object-contain shrink-0"
                    />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                </div>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Opt-In (Diizinkan Pasien)
                    </span>
                    {consentStatus === "opt-in" && (
                      <span className="text-[9px] font-extrabold text-teal-800 bg-teal-200/80 px-1.5 py-0.2 rounded">
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Pertukaran data resume medis ke SATUSEHAT aktif sesuai persetujuan pasien.
                  </p>
                </div>
              </button>

              {/* Option 2: Opt-Out */}
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => {
                  if (isReadOnly) return;
                  setConsentStatus("opt-out");
                  toast.info("Persetujuan pasien: Opt-Out");
                }}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                  isReadOnly ? "cursor-not-allowed opacity-90" : "cursor-pointer"
                } ${
                  consentStatus === "opt-out"
                    ? "bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/20 shadow-xs"
                    : "bg-white border-slate-200 hover:border-amber-200 hover:bg-slate-50/50"
                }`}
              >
                <div
                  className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    consentStatus === "opt-out"
                      ? "bg-amber-600 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Lock className="h-4 w-4" />
                </div>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Opt-Out (Internal RS Saja)
                    </span>
                    {consentStatus === "opt-out" && (
                      <span className="text-[9px] font-extrabold text-amber-900 bg-amber-200/80 px-1.5 py-0.2 rounded">
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Rekam medis disimpan di fasilitas kesehatan tanpa pengiriman ke SATUSEHAT (Opt-Out).
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Bottom Stepper Navigation & Persistent Sync Footer */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100 pt-4">
        {/* Left: Previous Step or Quick Status */}
        <div className="flex items-center gap-2">
          {activeSoapTab !== "S" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeSoapTab === "O") setActiveSoapTab("S");
                else if (activeSoapTab === "A") setActiveSoapTab("O");
                else if (activeSoapTab === "P") setActiveSoapTab("A");
              }}
              className="h-9 px-3 text-xs font-semibold gap-1.5 cursor-pointer bg-white border-slate-200 hover:bg-slate-50"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>
                Sebelumnya (
                {activeSoapTab === "O"
                  ? "S - Subjektif"
                  : activeSoapTab === "A"
                  ? "O - Objektif"
                  : "A - Asesmen"}
                )
              </span>
            </Button>
          )}

          <div className="text-[11px] text-slate-500 font-medium pl-1">
            Kelengkapan SOAP: <strong className="text-teal-900 font-bold">{completedTabsCount}/4 Bagian Selesai</strong>
          </div>
        </div>

        {/* Right: Next Step or Final Sync Button */}
        <div className="flex items-center gap-2">
          {activeSoapTab !== "P" ? (
            <Button
              type="button"
              variant="medical"
              size="sm"
              onClick={() => {
                if (activeSoapTab === "S") setActiveSoapTab("O");
                else if (activeSoapTab === "O") setActiveSoapTab("A");
                else if (activeSoapTab === "A") setActiveSoapTab("P");
              }}
              className="h-9 px-3.5 text-xs font-bold gap-1.5 shadow-xs cursor-pointer"
            >
              <span>
                Lanjut ke{" "}
                {activeSoapTab === "S"
                  ? "O - Objektif"
                  : activeSoapTab === "O"
                  ? "A - Asesmen"
                  : "P - Plan & Terapi"}
              </span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          ) : user && user.role !== "doctor" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={true}
              className="h-9 px-4 text-xs font-semibold gap-1.5 bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed shadow-none"
              title="Sesuai Permenkes 24/2022, finalisasi SOAP hanya dapat dilakukan oleh Dokter DPJP."
            >
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <span>Mode Peninjauan (Wewenang Dokter DPJP)</span>
            </Button>
          ) : isReadOnly ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCorrectionMode(true)}
              className="h-9 px-4 text-xs font-bold gap-1.5 bg-white border-teal-300 hover:bg-teal-50 text-teal-900 shadow-xs cursor-pointer btn-press"
            >
              <Edit3 className="h-3.5 w-3.5 text-teal-600" />
              <span>Buka Mode Koreksi / Edit</span>
            </Button>
          ) : isCorrectionMode ? (
            <Button
              type="button"
              variant="medical"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-9 px-4 text-xs font-bold gap-1.5 shadow-sm cursor-pointer bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Menyimpan Perubahan...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Simpan Perubahan (Ctrl+↵)</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              variant="medical"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`h-9 px-4 text-xs font-bold gap-1.5 shadow-sm cursor-pointer ${
                consentStatus === "opt-out"
                  ? "bg-slate-800 hover:bg-slate-900 text-amber-200 border border-slate-700"
                  : "bg-teal-700 hover:bg-teal-800 text-white"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>
                    {consentStatus === "opt-out"
                      ? "Menyimpan Internal..."
                      : "Menyimpan Resume Medis..."}
                  </span>
                </>
              ) : consentStatus === "opt-out" ? (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span>Simpan Rekam Medis (Ctrl+↵)</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Simpan Resume Medis (Ctrl+↵)</span>
                </>
              )}
            </Button>
          )}

          {/* Quick Direct Sync Button (Available anytime if required fields are met and NOT in read-only mode) */}
          {(!user || user.role === "doctor") && !isReadOnly && activeSoapTab !== "P" && isTabSComplete && isTabOComplete && isTabAComplete && (
            <Button
              type="button"
              variant="medical"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`h-9 px-3.5 text-xs font-bold gap-1.5 cursor-pointer shadow-sm ${
                isCorrectionMode
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : consentStatus === "opt-out"
                  ? "bg-slate-800 hover:bg-slate-900 text-amber-200 border border-slate-700"
                  : "bg-teal-700 hover:bg-teal-800 text-white"
              }`}
              title={
                isCorrectionMode
                  ? "Kelengkapan SOAP terpenuhi. Simpan pembaruan rekam medis."
                  : "Kelengkapan SOAP terpenuhi. Simpan rekam medis."
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="hidden sm:inline">
                    {isCorrectionMode
                      ? "Menyimpan Perubahan..."
                      : consentStatus === "opt-out"
                      ? "Menyimpan Internal..."
                      : "Menyimpan Resume Medis..."}
                  </span>
                </>
              ) : isCorrectionMode ? (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Simpan Pembaruan</span>
                </>
              ) : consentStatus === "opt-out" ? (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Simpan Internal</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Langsung Simpan</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Bridging Connection Warning Dialog (Pre-Submit Check) */}
      <Dialog
        open={showBridgingWarningModal}
        onOpenChange={setShowBridgingWarningModal}
      >
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-white rounded-2xl border-slate-200 shadow-2xl">
          {/* Top Banner */}
          <div className="bg-amber-500/10 border-b border-amber-200/80 p-5 flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <WifiOff className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-extrabold text-sm text-slate-900">
                  Koneksi Bridging SATUSEHAT Belum Aktif
                </h3>
                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shrink-0 whitespace-nowrap">
                  Mode Internal
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Kredensial integrasi SATUSEHAT Kemenkes belum dihubungkan pada menu Bridging fasyankes.
              </p>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-5 space-y-4">
            {/* Zero Data Loss Guarantee Banner */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 leading-relaxed space-y-1">
                <span className="font-bold text-slate-900 block">Jaminan Keamanan Rekam Medis (Zero Data Loss)</span>
                <span>
                  Catatan medis pasien <strong>{patient.name}</strong> tidak akan hilang. Data akan disimpan secara aman pada basis data internal RS dengan status <strong>Menunggu Pengiriman (Draft / Pending)</strong>.
                </span>
              </div>
            </div>

            {/* Comparison of Actions */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Pilih Tindakan DPJP:
              </span>

              {/* Option A: Save Locally (Recommended for Fast Workflow) */}
              <button
                type="button"
                onClick={() => {
                  if (pendingSubmissionEncounter) {
                    executeSubmission(pendingSubmissionEncounter, true);
                  }
                }}
                disabled={isSubmitting}
                className="w-full text-left p-3.5 rounded-xl border border-teal-200 bg-teal-50/50 hover:bg-teal-50 hover:border-teal-400 transition-all cursor-pointer group flex items-start gap-3"
              >
                <div className="h-8 w-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs group-hover:scale-105 transition-transform">
                  <Database className="h-4 w-4" />
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-teal-900 min-w-0">
                      Simpan Rekam Medis
                    </span>
                    <span className="text-[9px] font-extrabold text-teal-800 bg-teal-100 border border-teal-200 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                      Rekomendasi DPJP
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Simpan rekam medis pasien agar pelayanan selesai. Pengiriman ke SATUSEHAT dapat dilakukan saat koneksi aktif.
                  </p>
                </div>
              </button>

              {/* Option B: Open Bridging Menu */}
              {onNavigateToBridging && (
                <button
                  type="button"
                  onClick={() => {
                    setShowBridgingWarningModal(false);
                    onNavigateToBridging();
                    toast.info("Membuka menu Bridging SATUSEHAT...", {
                      description: "Silakan masukkan kredensial API fasyankes untuk mengaktifkan koneksi cloud.",
                    });
                  }}
                  className="w-full text-left p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer group flex items-start gap-3"
                >
                  <div className="h-8 w-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-teal-100 transition-colors">
                    <img
                      src="/satusehat-default-logo.svg"
                      alt="SATUSEHAT"
                      className="h-4 w-4 object-contain shrink-0"
                    />
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        Buka Menu Bridging SATUSEHAT
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Hubungkan kredensial API Organization ID, Client ID, dan Client Secret fasyankes sebelum menyelesaikan rekam medis ini.
                    </p>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 border-t border-slate-100 p-3.5 px-5 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 font-mono">
              Mode: Offline / Pending Sync
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowBridgingWarningModal(false)}
              className="h-8 text-xs font-semibold"
            >
              Batal & Kembali ke Form
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 5. Animated SATUSEHAT Syncing Loading Overlay Modal with Non-Blocking Option */}
      <SatusehatSyncLoadingModal
        isOpen={isSubmitting}
        patient={patient}
        encounter={activeEncounter}
        doctorName={doctorName}
        department={department}
        isOptOut={consentStatus === "opt-out"}
        isCorrectionMode={isCorrectionMode}
        onContinueInBackground={() => {
          setIsSubmitting(false);
          if (lastSubmittedEncounter) {
            onEncounterCreated({
              ...lastSubmittedEncounter,
              syncStatus: lastSubmittedEncounter.consentStatus === "opt-out" ? "draft" : "pending",
            });
          }
          toast.info("Rekam medis disimpan ke antrean lokal", {
            description: "Proses sinkronisasi SATUSEHAT tetap dilanjutkan di latar belakang.",
            duration: 5000,
          });
        }}
      />
    </div>
  );
}
