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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomDatePicker } from "@/components/ui/custom-date-picker";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  AuthSession,
  DiagnosisItem,
  OutpatientEncounter,
  PatientProfile,
  PrescriptionItem,
  ProcedureItem,
} from "@/lib/satusehat/types";
import { KFA_MEDICATIONS_DATABASE, KfaMedication } from "@/lib/satusehat/kfa-database";
import {
  evaluateVitalSigns,
  checkDrugAllergyConflict,
  validateEncounterCompletion,
  VitalSignAlert,
} from "@/lib/satusehat/validation";
import { toast } from "sonner";

interface OutpatientEntryFormProps {
  patient: PatientProfile;
  activeEncounter?: OutpatientEncounter;
  activeDepartment?: string;
  onEncounterCreated: (newEncounter: OutpatientEncounter) => void;
  token?: string;
  session?: AuthSession | null;
  onNavigateToBridging?: () => void;
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

export function OutpatientEntryForm({
  patient,
  activeEncounter,
  activeDepartment,
  onEncounterCreated,
  token,
  session,
  onNavigateToBridging,
}: OutpatientEntryFormProps) {
  // Navigation State (SOAP Guided Stepper)
  const [activeSoapTab, setActiveSoapTab] = useState<SoapTab>("S");

  // Bridging Check & Pre-Submit Dialog State
  const [showBridgingWarningModal, setShowBridgingWarningModal] = useState(false);
  const [pendingSubmissionEncounter, setPendingSubmissionEncounter] = useState<OutpatientEncounter | null>(null);

  const isBridgingConnected = Boolean(token || session?.accessToken);

  // Tab S: Subjektif
  const [department, setDepartment] = useState(
    activeDepartment && activeDepartment !== "Semua Poli"
      ? activeDepartment
      : activeEncounter?.clinicDepartment || "Poli Penyakit Dalam"
  );
  const [doctorName, setDoctorName] = useState(
    activeEncounter?.doctorName || "dr. Rian Pratama, Sp.PD"
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
  const [allergyWarning, setAllergyWarning] = useState<string | null>(null);
  const [followUpNotes, setFollowUpNotes] = useState(
    activeEncounter?.followUpPlan?.instruction || ""
  );
  const [doctorSip, setDoctorSip] = useState(
    activeEncounter?.doctorSip || "SIP.446/089/DS/Dinkes/2026"
  );
  const [doctorIhsId, setDoctorIhsId] = useState(
    activeEncounter?.doctorIhsId || "N10009841"
  );
  const [dischargeDisposition, setDischargeDisposition] = useState(
    activeEncounter?.dischargeDisposition || "Pulang Berobat Jalan"
  );
  const [nextVisitDate, setNextVisitDate] = useState(
    activeEncounter?.followUpPlan?.nextVisitDate || ""
  );
  const [referredToHospital, setReferredToHospital] = useState(
    activeEncounter?.followUpPlan?.referredTo || ""
  );
  const [consentStatus, setConsentStatus] = useState<"opt-in" | "opt-out">(
    patient.satusehatConsent || "opt-in"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Re-synchronize form when patient, activeEncounter, or activeDepartment changes
  React.useEffect(() => {
    if (activeEncounter) {
      setDepartment(
        activeEncounter.clinicDepartment ||
        (activeDepartment && activeDepartment !== "Semua Poli" ? activeDepartment : "Poli Umum")
      );
      setDoctorName(activeEncounter.doctorName || "dr. Rian Pratama, Sp.PD");
      setDoctorSip(activeEncounter.doctorSip || "SIP.446/089/DS/Dinkes/2026");
      setDoctorIhsId(activeEncounter.doctorIhsId || "N10009841");
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
      setDischargeDisposition(activeEncounter.dischargeDisposition || "Pulang Berobat Jalan");
      setNextVisitDate(activeEncounter.followUpPlan?.nextVisitDate || "");
      setReferredToHospital(activeEncounter.followUpPlan?.referredTo || "");
      setConsentStatus(activeEncounter.consentStatus || patient.satusehatConsent || "opt-in");
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
      setConsentStatus(patient.satusehatConsent || "opt-in");
    }
  }, [patient.id, activeEncounter?.id, activeDepartment]);

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
    const allergyCheck = checkDrugAllergyConflict(patient.allergies, med.name);
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
    const conflict = checkDrugAllergyConflict(patient.allergies, trimmed);
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
      setDepartment("Poli Penyakit Dalam");
      setDoctorName("dr. Rian Pratama, Sp.PD");
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
      setDepartment("Poli Umum");
      setDoctorName("dr. Siti Rahmawati");
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
          kfaCode: "93001027",
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
      setDepartment("Poli Penyakit Dalam");
      setDoctorName("dr. Rian Pratama, Sp.PD");
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
          kfaCode: "93000912",
          medicationName: "Omeprazole 20 mg Kapsul",
          form: "Kapsul",
          dosage: "20 mg",
          frequency: "2x sehari 1 kapsul",
          timing: "Sebelum Makan",
          schedule: { morning: true, evening: true },
          quantity: 14,
          unit: "Kapsul",
          durationDays: 7,
          instructions: "Diminum 30 menit sebelum makan pagi dan malam.",
        },
      ]);
      setFollowUpNotes("Hindari makanan pedas, asam, bersantan, dan kopi. Makan dengan porsi kecil tapi sering.");
    } else if (type === "diabetes") {
      setDepartment("Poli Penyakit Dalam");
      setDoctorName("dr. Rian Pratama, Sp.PD");
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
          kfaCode: "93000780",
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
    toast.success(`Template klinis ${type.toUpperCase()} berhasil diterapkan ke formulir SOAP`);
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
          m.kfaCode.includes(kfaSearch)
      )
    : [];

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
    setShowBridgingWarningModal(false);

    try {
      const res = await fetch("/api/satusehat/resume-medis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient,
          encounter: encounterToSave,
          token: session?.accessToken || token,
          simulate: false,
          saveLocalPending: saveAsLocalPending,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const finalizedEncounter: OutpatientEncounter = {
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
          toast.success("Resume medis berhasil disimpan di SIMRS lokal", {
            description:
              "Sesuai pilihan pasien (Opt-Out), transmisi cloud SATUSEHAT dilewati demi hak privasi pasien.",
            duration: 5000,
          });
        } else if (saveAsLocalPending) {
          toast.info("Resume medis disimpan di SIMRS lokal", {
            description:
              "Status: Menunggu Pengiriman ke SATUSEHAT (Pending). Data tersimpan aman dan siap disinkronkan saat bridging aktif.",
            duration: 6000,
          });
        } else if (finalizedEncounter.syncStatus === "partial_failed") {
          toast.warning(
            "Resume medis disimpan dengan catatan sinkronisasi parsial",
            {
              description:
                "Beberapa resource FHIR gagal dikirim. Silakan gunakan tombol Sinkronisasi Ulang di panel SATUSEHAT.",
              duration: 6000,
            }
          );
        } else {
          toast.success(
            "Resume medis rawat jalan berhasil disimpan & disinkronkan ke SATUSEHAT",
            {
              description:
                "Data Kunjungan, TTV, Diagnosis, Tindakan, Resep Obat & Persetujuan berhasil disinkronkan ke Kemenkes.",
              duration: 5000,
            }
          );
        }
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

    const isOptOut = consentStatus === "opt-out";
    const newEncounter: OutpatientEncounter = {
      id: activeEncounter?.id || `ENC-${Date.now().toString().slice(-6)}`,
      satusehatEncounterId:
        isOptOut || !isBridgingConnected
          ? undefined
          : activeEncounter?.satusehatEncounterId ||
            `ss-enc-${Math.random().toString(36).substring(2, 10)}`,
      visitDate: activeEncounter?.visitDate || new Date().toISOString(),
      clinicDepartment: department,
      doctorName: doctorName,
      doctorSip:
        doctorSip.trim() || activeEncounter?.doctorSip || "SIP.446/089/DS/Dinkes/2026",
      doctorIhsId:
        doctorIhsId.trim() || activeEncounter?.doctorIhsId || "N10009841",
      hospitalName:
        activeEncounter?.hospitalName || "RS Umum Daerah Sehat Sejahtera",
      hospitalOrgId: activeEncounter?.hospitalOrgId || "10000004",
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
      },
      diagnoses,
      procedures:
        procedures.length > 0
          ? procedures
          : [
              {
                code: "89.07",
                display: "General medical consultation",
                category: "Konsultasi Medis",
                notes: "Konsultasi dan Pemeriksaan Dokter",
              },
            ],
      prescriptions,
      diagnosticOrders: activeEncounter?.diagnosticOrders || [],
      labResults: activeEncounter?.labResults || [],
      radiologyResults: activeEncounter?.radiologyResults || [],
      followUpPlan: {
        instruction: followUpNotes,
        nextVisitDate: nextVisitDate.trim() || undefined,
        referredTo: referredToHospital.trim() || undefined,
      },
      dischargeDisposition: dischargeDisposition,
      consentStatus: consentStatus,
      syncStatus: isOptOut ? "draft" : isBridgingConnected ? "synced" : "pending",
      syncedAt: isOptOut || !isBridgingConnected ? undefined : new Date().toISOString(),
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

  const bpAlert = getAlertForField("bloodPressure");
  const hrAlert = getAlertForField("heartRate");
  const rrAlert = getAlertForField("respiratoryRate");
  const tempAlert = getAlertForField("temperature");
  const spo2Alert = getAlertForField("oxygenSaturation");

  return (
    <div className="ehr-card p-5 space-y-4">
      {/* 1. Header Card with Patient Quick Context & Templates */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs shrink-0">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-extrabold text-sm text-slate-900">
                Formulir Input Rekam Medis SOAP (DPJP)
              </h3>
              <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded-md border border-teal-200">
                Permenkes 24/2022
              </span>
              {/* Bridging Connection Status Pill */}
              {isBridgingConnected ? (
                <span className="text-[10px] font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>SATUSEHAT Live</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                  <span>Mode Lokal (Offline)</span>
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
              {consentStatus === "opt-out" ? (
                <span className="text-[10px] font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                  <Lock className="h-3 w-3 text-amber-700" />
                  <span>Opt-Out (Lokal)</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold text-teal-900 bg-teal-50 px-1.5 py-0.5 rounded-full border border-teal-300 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-teal-700" />
                  <span>Opt-In (Cloud)</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Pasien: <strong className="text-slate-800">{patient.name}</strong> • No. RM:{" "}
              <strong className="font-mono text-slate-700">{patient.mrn.replace(/^RM-?/i, "")}</strong> • NIK:{" "}
              <strong className="font-mono text-slate-700">{patient.nik}</strong>
            </p>
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
            onClick={() => handleLoadPreset("hipertensi")}
            className="h-7 text-[11px] font-bold px-2.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 shadow-2xs cursor-pointer transition-all flex items-center gap-1 active:scale-95"
            title="Terapkan Template SOAP Hipertensi"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
            <span>Hipertensi</span>
          </button>
          <button
            type="button"
            onClick={() => handleLoadPreset("ispa")}
            className="h-7 text-[11px] font-bold px-2.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-300 shadow-2xs cursor-pointer transition-all flex items-center gap-1 active:scale-95"
            title="Terapkan Template SOAP ISPA"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-sky-600" />
            <span>ISPA</span>
          </button>
          <button
            type="button"
            onClick={() => handleLoadPreset("gastritis")}
            className="h-7 text-[11px] font-bold px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs cursor-pointer transition-all flex items-center gap-1 active:scale-95"
            title="Terapkan Template SOAP Gastritis"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
            <span>Gastritis</span>
          </button>
          <button
            type="button"
            onClick={() => handleLoadPreset("diabetes")}
            className="h-7 text-[11px] font-bold px-2.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs cursor-pointer transition-all flex items-center gap-1 active:scale-95"
            title="Terapkan Template SOAP Diabetes"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-purple-600" />
            <span>Diabetes</span>
          </button>
        </div>
      </div>

      {/* Safety Allergen Alert Banner (Persistent if patient has allergies) */}
      {patient.allergies && patient.allergies.length > 0 && (
        <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-300 text-xs flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0" />
            <span className="font-bold text-amber-950">
              Riwayat Alergi Pasien:
            </span>
            <div className="flex flex-wrap gap-1">
              {patient.allergies.map((allg, idx) => (
                <span
                  key={idx}
                  className="px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-950 font-bold text-[10px] border border-amber-300"
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
                <span>Informasi Kunjungan & Keluhan Pasien (Subjective)</span>
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
                </Label>
                <Input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Contoh: Poli Penyakit Dalam"
                  className="h-9 text-xs bg-white border-slate-200 focus:border-teal-500 rounded-lg shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Dokter Penanggung Jawab (DPJP) *</span>
                </Label>
                <Input
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="Contoh: dr. Rian Pratama, Sp.PD"
                  className="h-9 text-xs bg-white border-slate-200 focus:border-teal-500 rounded-lg shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Nomor Surat Izin Praktik (SIP)</span>
                </Label>
                <Input
                  value={doctorSip}
                  onChange={(e) => setDoctorSip(e.target.value)}
                  placeholder="SIP.446/089/DS/Dinkes/2026"
                  className="h-9 text-xs bg-white border-slate-200 focus:border-teal-500 rounded-lg font-mono text-[11px] shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>ID IHS Praktisi SATUSEHAT</span>
                </Label>
                <Input
                  value={doctorIhsId}
                  onChange={(e) => setDoctorIhsId(e.target.value)}
                  placeholder="N10009841"
                  className="h-9 text-xs bg-white border-slate-200 focus:border-teal-500 rounded-lg font-mono text-[11px] shadow-2xs"
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
                placeholder="Contoh: Nyeri kepala tengkuk berdenyut sejak 3 hari"
                className={`h-9 text-xs bg-white rounded-lg ${
                  !chiefComplaint.trim()
                    ? "border-red-400 focus:ring-red-300 ring-1 ring-red-200"
                    : "border-teal-300 focus:border-teal-500"
                }`}
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
                rows={3}
                placeholder="Jelaskan onset, durasi, lokasi, kualitas nyeri, faktor pemberat/peringan, serta riwayat pengobatan sebelumnya..."
                className="w-full text-xs p-2.5 rounded-lg border border-teal-200 bg-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 leading-relaxed text-slate-800"
              />
            </div>

            {/* Riwayat Penyakit Dahulu & Riwayat Keluarga */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Riwayat Penyakit Dahulu (RPD) & Riwayat Keluarga
              </Label>
              <Input
                value={pastMedicalHistory}
                onChange={(e) => setPastMedicalHistory(e.target.value)}
                placeholder="Contoh: Hipertensi sejak 2021, DM disangkal. Ayah riwayat stroke."
                className="h-9 text-xs bg-white border-slate-200 focus:border-teal-500 rounded-lg"
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
                <span>Tanda-Tanda Vital & Pemeriksaan Fisik (Objective)</span>
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
                  onChange={(e) => setSystolic(e.target.value)}
                  className="h-8 font-mono text-xs bg-slate-50/50"
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
                  onChange={(e) => setDiastolic(e.target.value)}
                  className="h-8 font-mono text-xs bg-slate-50/50"
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
                  onChange={(e) => setHeartRate(e.target.value)}
                  className="h-8 font-mono text-xs bg-slate-50/50"
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
                  onChange={(e) => setTemperature(e.target.value)}
                  className="h-8 font-mono text-xs bg-slate-50/50"
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
                  onChange={(e) => setRespiratoryRate(e.target.value)}
                  className="h-8 font-mono text-xs bg-slate-50/50"
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
                  onChange={(e) => setOxygenSaturation(e.target.value)}
                  className="h-8 font-mono text-xs bg-slate-50/50"
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
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="h-8 font-mono text-xs bg-slate-50/50"
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
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="h-8 font-mono text-xs bg-slate-50/50"
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
                rows={2}
                placeholder="Mata, THT, Thorax (Cor/Pulmo), Abdomen, Ekstremitas, Status Lokalis..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 leading-relaxed text-slate-800 font-sans"
              />
            </div>

            {/* Hasil Penunjang Diagnostik (Lab & Radiologi) Terintegrasi */}
            {((activeEncounter?.labResults && activeEncounter.labResults.length > 0) ||
              (activeEncounter?.radiologyResults && activeEncounter.radiologyResults.length > 0)) && (
              <div className="space-y-2 pt-2 border-t border-teal-200/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-teal-950 flex items-center gap-1.5 uppercase tracking-wide">
                    <FlaskConical className="h-3.5 w-3.5 text-teal-700" />
                    <span>Hasil Penunjang Terintegrasi (Lab & Radiologi)</span>
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
                      Hasil Laboratorium (LOINC):
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
                  <span>Diagnosis Medis (ICD-10)</span>
                </span>
                <span className="text-[10px] text-teal-800 font-bold bg-teal-100 px-2 py-0.5 rounded-full border border-teal-200/60">
                  *Wajib Minimal 1 Diagnosa Utama
                </span>
              </div>
              <span className="text-[10px] text-teal-800 font-bold bg-teal-100/80 px-2 py-0.5 rounded-md border border-teal-200/60 shadow-2xs">
                Langkah 3 dari 4
              </span>
            </div>

            {/* Selected Diagnoses Chips */}
            <div className="flex flex-wrap gap-2">
              {diagnoses.map((d) => (
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
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetPrimaryDiagnosis(d.code)}
                      className="text-[9px] text-teal-700 hover:underline cursor-pointer"
                      title="Jadikan Diagnosa Utama"
                    >
                      (Set Utama)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveDiagnosis(d.code)}
                    className="text-slate-400 hover:text-red-600 p-0.5 rounded transition-colors cursor-pointer ml-1 font-bold"
                    title="Hapus diagnosis"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* ICD-10 Search & Dropdown Selector */}
            <div className="relative pt-1">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    value={icdSearch}
                    onFocus={() => setShowIcdDropdown(true)}
                    onChange={(e) => {
                      setIcdSearch(e.target.value);
                      setShowIcdDropdown(true);
                    }}
                    placeholder="Cari kode ICD-10 atau nama penyakit (contoh: I10, E11, ISPA, Gastritis, Asma)..."
                    className="h-8.5 text-xs bg-white pl-8 border-slate-300 rounded-lg"
                  />
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
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 max-h-52 overflow-y-auto divide-y divide-slate-100">
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
          </div>

          {/* 2. Tindakan / Prosedur Medis ICD-9-CM */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <Syringe className="h-3.5 w-3.5 text-teal-600" />
                  <span>Tindakan &amp; Prosedur Medis (ICD-9-CM)</span>
                </span>
                <span className="text-[10px] text-teal-800 font-bold bg-teal-100 px-2 py-0.5 rounded-full">
                  FHIR Procedure
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {procedures.length} Tindakan Dipilih
              </span>
            </div>

            {/* Selected Procedures Chips */}
            <div className="flex flex-wrap gap-2">
              {procedures.map((p) => (
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
                  <button
                    type="button"
                    onClick={() => handleRemoveProcedure(p.code)}
                    className="text-slate-400 hover:text-red-600 p-0.5 rounded transition-colors cursor-pointer ml-1 font-bold"
                    title="Hapus tindakan"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Quick Common Presets */}
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

            {/* ICD-9-CM Search & Dropdown Selector */}
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
                    placeholder="Cari kode ICD-9-CM atau nama tindakan (contoh: 89.52, EKG, Nebulisasi, Injeksi, Rawat Luka)..."
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
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 max-h-52 overflow-y-auto divide-y divide-slate-100">
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
                  <span>Penulisan E-Resep Obat (Kamus Farmasi KFA)</span>
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

            {/* KFA Search Bar */}
            <div className="relative">
              <Input
                value={kfaSearch}
                onChange={(e) => setKfaSearch(e.target.value)}
                placeholder="Ketik nama obat KFA (Contoh: Paracetamol, Amlodipine, Metformin, Amoxicillin, Omeprazole)..."
                className="text-xs bg-white border-slate-300 focus:border-teal-500 pr-8 h-9 rounded-lg"
              />
              {kfaSearch && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 max-h-52 overflow-y-auto divide-y divide-slate-100">
                  {filteredKfaOptions.map((med) => {
                    const hasAllergyConflict = checkDrugAllergyConflict(
                      patient.allergies,
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
                      </div>

                      {/* Interactive Dose, Frequency & Timing Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-slate-50/70 p-2.5 rounded-lg border border-slate-200/80">
                        <div>
                          <Label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                            Aturan Pakai:
                          </Label>
                          <Input
                            value={p.frequency}
                            onChange={(e) =>
                              handleUpdatePrescription(idx, "frequency", e.target.value)
                            }
                            placeholder="Contoh: 3 x 1 tablet sehari"
                            className="h-7 text-xs bg-white border-slate-300"
                          />
                        </div>

                        <div>
                          <Label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                            Waktu Minum:
                          </Label>
                          <select
                            value={p.timing}
                            onChange={(e) =>
                              handleUpdatePrescription(idx, "timing", e.target.value)
                            }
                            className="w-full h-7 text-xs bg-white border border-slate-300 rounded px-1.5 text-slate-800 font-medium"
                          >
                            <option value="Sesudah Makan">Sesudah Makan</option>
                            <option value="Sebelum Makan">Sebelum Makan</option>
                            <option value="Bersama Makanan">Bersama Makanan</option>
                            <option value="Sesuai Kebutuhan">Sesuai Kebutuhan (PRN)</option>
                          </select>
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
                              onChange={(e) =>
                                handleUpdatePrescription(
                                  idx,
                                  "quantity",
                                  parseInt(e.target.value) || 1
                                )
                              }
                              className="h-7 text-xs bg-white border-slate-300 font-bold"
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
                              onChange={(e) =>
                                handleUpdatePrescription(
                                  idx,
                                  "durationDays",
                                  parseInt(e.target.value) || 1
                                )
                              }
                              className="h-7 text-xs bg-white border-slate-300 font-bold"
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
                <span>Disposisi Kepulangan & Rencana Tindak Lanjut</span>
              </Label>
              <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                FHIR CarePlan & Encounter.dischargeDisposition
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Disposisi Pasien (Cara Keluar Poli):</Label>
                <select
                  value={dischargeDisposition}
                  onChange={(e) => setDischargeDisposition(e.target.value)}
                  className="w-full h-9 text-xs bg-white border border-slate-300 rounded-lg px-2.5 text-slate-800 font-medium focus:border-teal-500 focus:outline-none"
                >
                  <option value="Pulang Berobat Jalan">Pulang Berobat Jalan (Selesai Pelayanan)</option>
                  <option value="Kontrol Kembali">Kontrol Kembali (Jadwal Terencana)</option>
                  <option value="Rawat Inap">Rawat Inap / Opname (Admisi)</option>
                  <option value="Dirujuk ke RS Lain">Dirujuk ke RS / Faskes Lain (Eksternal)</option>
                  <option value="Konsul Internal Poli Lain">Konsul Internal Poli Lain</option>
                  <option value="Meninggal">Meninggal Dunia</option>
                </select>
              </div>

              {(dischargeDisposition === "Kontrol Kembali" || dischargeDisposition === "Pulang Berobat Jalan") && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Tanggal Rencana Kontrol Ulang (Opsional):</Label>
                  <CustomDatePicker
                    value={nextVisitDate}
                    onChange={setNextVisitDate}
                    placeholder="Pilih Tanggal Kontrol Ulang..."
                    minDate={new Date().toISOString().split("T")[0]}
                    size="md"
                    buttonClassName="h-9 text-xs bg-white border-slate-300 rounded-lg shadow-2xs font-mono"
                  />
                </div>
              )}

              {(dischargeDisposition === "Dirujuk ke RS Lain" || dischargeDisposition === "Konsul Internal Poli Lain") && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Tujuan Faskes Rujukan / Spesialis Konsul:</Label>
                  <Input
                    value={referredToHospital}
                    onChange={(e) => setReferredToHospital(e.target.value)}
                    placeholder="Contoh: RSUPN Dr. Cipto Mangunkusumo / Poli Jantung"
                    className="h-9 text-xs bg-white border-slate-300 rounded-lg"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Instruksi Edukasi & Catatan Pulang Pasien:</Label>
              <textarea
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                rows={2}
                placeholder="Instruksi diet, anjuran istirahat, jadwal minum obat, tanda bahaya yang harus diwaspadai..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 leading-relaxed text-slate-800 font-sans"
              />
            </div>
          </div>

          {/* 3. Manajemen Persetujuan Pasien (Patient Consent SATUSEHAT) */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                <Shield className="h-3.5 w-3.5 text-teal-600" />
                <span>Persetujuan Pertukaran Data (SATUSEHAT Consent)</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Hak Privasi Pasien
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
              {/* Option 1: Opt-In */}
              <button
                type="button"
                onClick={() => {
                  setConsentStatus("opt-in");
                  toast.success("Status persetujuan: Opt-In (Sinkronisasi cloud SATUSEHAT diizinkan)");
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                  consentStatus === "opt-in"
                    ? "bg-teal-50/80 border-teal-400 ring-2 ring-teal-500/20 shadow-xs"
                    : "bg-white border-slate-200 hover:border-teal-200 hover:bg-slate-50/50"
                }`}
              >
                <div
                  className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    consentStatus === "opt-in"
                      ? "bg-teal-600 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
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
                    Sinkronkan bundle resume medis ke Cloud SATUSEHAT via HL7 FHIR R4 standard. Pasien dapat mengakses riwayat di SATUSEHAT Mobile.
                  </p>
                </div>
              </button>

              {/* Option 2: Opt-Out */}
              <button
                type="button"
                onClick={() => {
                  setConsentStatus("opt-out");
                  toast.info("Status persetujuan: Opt-Out (Data hanya disimpan di SIMRS lokal)");
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
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
                    Simpan rekam medis hanya di SIMRS lokal rumah sakit. Transmisi ke cloud SATUSEHAT diblokir (FHIR Consent Deny) demi hak privasi pasien.
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
              {consentStatus === "opt-out" ? (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span>
                    {isSubmitting
                      ? "Menyimpan ke SIMRS Lokal..."
                      : "Simpan Rekam Medis Lokal (Tanpa Sinkronisasi)"}
                  </span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>
                    {isSubmitting
                      ? "Menyinkronkan ke SATUSEHAT..."
                      : "Simpan & Sinkronkan Resume Medis (FHIR)"}
                  </span>
                </>
              )}
            </Button>
          )}

          {/* Quick Direct Sync Button (Available anytime if required fields are met) */}
          {activeSoapTab !== "P" && isTabSComplete && isTabOComplete && isTabAComplete && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`h-9 px-3 text-xs font-bold gap-1 cursor-pointer ${
                consentStatus === "opt-out"
                  ? "text-amber-900 bg-amber-50 border-amber-300 hover:bg-amber-100"
                  : "text-teal-800 bg-teal-50 border-teal-300 hover:bg-teal-100"
              }`}
              title={
                consentStatus === "opt-out"
                  ? "Kelengkapan SOAP Terpenuhi. Simpan langsung ke SIMRS Lokal (Status Opt-Out Pasien)."
                  : "Kelengkapan SOAP Terpenuhi. Simpan langsung & sinkronkan ke SATUSEHAT."
              }
            >
              {consentStatus === "opt-out" ? (
                <Lock className="h-3.5 w-3.5 text-amber-600" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
              )}
              <span className="hidden sm:inline">
                {consentStatus === "opt-out" ? "Simpan Lokal" : "Langsung Simpan"}
              </span>
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
                  Mode Lokal
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
                  Catatan medis pasien <strong>{patient.name}</strong> tidak akan hilang. Data akan disimpan secara aman pada database lokal SIMRS dengan status <strong>Menunggu Pengiriman (Draft / Pending)</strong>.
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
                      Simpan ke SIMRS Lokal & Antrekan Pengiriman
                    </span>
                    <span className="text-[9px] font-extrabold text-teal-800 bg-teal-100 border border-teal-200 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                      Rekomendasi DPJP
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Simpan rekam medis pasien di database RS sekarang agar pelayanan pasien selesai. Pengiriman ke SATUSEHAT dapat dilakukan nanti saat koneksi sudah aktif.
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
                  <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-slate-200 transition-colors">
                    <ExternalLink className="h-4 w-4" />
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
    </div>
  );
}
