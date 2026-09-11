"use client";

import React, { useState, useEffect } from "react";
import {
  UserPlus,
  Search,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  Stethoscope,
  FileCheck,
  Users,
  Clock,
  Activity,
  Volume2,
  FileText,
  Check,
  ListOrdered,
  ArrowUpDown,
  AlertTriangle,
  Info,
  ShieldAlert,
  LayoutGrid,
  Table,
  ChevronLeft,
  ChevronRight,
  Baby,
  HeartPulse,
  Filter,
  Layers,
  Building2,
  X,
  Bell,
  Sparkles,
  MapPin,
  Calendar,
  UserCheck,
  RotateCcw,
  SlidersHorizontal,
  Lock,
  Ticket,
  Printer,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CustomSelect } from "@/components/ui/custom-select";
import { CustomDatePicker, formatDateIndonesian } from "@/components/ui/custom-date-picker";
import { PatientProfile, OutpatientEncounter, ClinicQueuePatientItem } from "@/lib/satusehat/types";
import {
  validateNIK,
  validateIHS,
  validateBPJS,
  validatePhone,
} from "@/lib/satusehat/validation";
import {
  speakIndonesianQueueCall,
  VOICE_PROFILES,
  VoiceProfileId,
} from "@/lib/audio/queueVoiceAnnouncer";
import { toast } from "sonner";

interface PatientRegistrationModuleProps {
  currentPatient: PatientProfile;
  worklist?: ClinicQueuePatientItem[];
  onUpdateWorklist?: React.Dispatch<React.SetStateAction<ClinicQueuePatientItem[]>>;
  onUpdateStatus?: (
    itemId: string,
    status: "arrived" | "in-progress" | "finished",
    silent?: boolean
  ) => void;
  onSelectPatient: (
    patient: PatientProfile,
    targetModule?:
      | "resume"
      | "vitals"
      | "prescriptions"
      | "history"
      | "entry"
      | "auth"
      | "registration"
      | "diagnostic"
  ) => void;
  onRegisterNewPatient: (patient: PatientProfile) => void;
  onCreateEncounter: (encounter: OutpatientEncounter) => void;
  activeDepartment?: string;
  onDepartmentChange?: (dept: string) => void;
  onOpenQueueTicket?: () => void;
}

export function PatientRegistrationModule({
  currentPatient,
  worklist: propsWorklist,
  onUpdateWorklist,
  onUpdateStatus: propsOnUpdateStatus,
  onSelectPatient,
  onRegisterNewPatient,
  onCreateEncounter,
  activeDepartment,
  onDepartmentChange,
  onOpenQueueTicket,
}: PatientRegistrationModuleProps) {
  const [activeTab, setActiveTab] = useState<"worklist" | "returning" | "new" | "queue">("worklist");
  const [worklistStatusFilter, setWorklistStatusFilter] = useState<"all" | "arrived" | "in-progress" | "finished">("all");
  const [worklistDepartmentFilter, setWorklistDepartmentFilter] = useState<string>(
    activeDepartment && activeDepartment !== "Semua Poli" ? activeDepartment : "all"
  );
  const [worklistDatePreset, setWorklistDatePreset] = useState<
    "today" | "yesterday" | "last-7" | "last-30" | "all" | "custom"
  >("today");
  const [worklistCustomDate, setWorklistCustomDate] = useState<string>("");
  const [isLoadingWorklist, setIsLoadingWorklist] = useState<boolean>(false);
  const [triageFilter, setTriageFilter] = useState<"all" | "urgent" | "geriatric" | "pediatric" | "regular">("all");
  const [sortBy, setSortBy] = useState<"fifo" | "status" | "queueNumber">("fifo");
  const [worklistSearch, setWorklistSearch] = useState("");
  const [patientsList, setPatientsList] = useState<PatientProfile[]>([]);
  const [localWorklist, setLocalWorklist] = useState<ClinicQueuePatientItem[]>([]);

  // Fetch Master Patient Index from SQLite Database API
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch("/api/patients");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setPatientsList(json.data);
          }
        }
      } catch (err) {
        console.error("Gagal memuat data pasien dari database:", err);
      }
    };
    fetchPatients();
  }, []);

  // Fetch Worklist from Database by Date Filter
  const fetchWorklistByDate = async (
    preset: string,
    customDate?: string
  ) => {
    setIsLoadingWorklist(true);
    try {
      let queryUrl = "/api/queue?";
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      if (preset === "today") {
        queryUrl += `date=${todayStr}`;
      } else if (preset === "yesterday") {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        queryUrl += `date=${yesterday.toISOString().split("T")[0]}`;
      } else if (preset === "last-7") {
        const start = new Date(today);
        start.setDate(start.getDate() - 7);
        queryUrl += `startDate=${start.toISOString().split("T")[0]}&endDate=${todayStr}`;
      } else if (preset === "last-30") {
        const start = new Date(today);
        start.setDate(start.getDate() - 30);
        queryUrl += `startDate=${start.toISOString().split("T")[0]}&endDate=${todayStr}`;
      } else if (preset === "all") {
        queryUrl += `all=true`;
      } else if (preset === "custom" && customDate) {
        queryUrl += `date=${customDate}`;
      }

      const res = await fetch(queryUrl);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setWorklist(json.data);
        }
      }
    } catch (err) {
      console.error("Gagal memuat antrean berdasarkan tanggal:", err);
    } finally {
      setIsLoadingWorklist(false);
    }
  };

  // Returning Patients Search, Multi-Filter, Multi-Sort, and Pagination State
  const [returningSearch, setReturningSearch] = useState("");
  const [returningVisitFilter, setReturningVisitFilter] = useState<
    "all" | "today" | "last-7" | "last-30" | "older-30" | "has-history" | "no-history" | "custom"
  >("all");
  const [returningCustomDate, setReturningCustomDate] = useState<string>("");
  const [returningDeptFilter, setReturningDeptFilter] = useState<string>("all");
  const [returningAgeFilter, setReturningAgeFilter] = useState<"all" | "pediatric" | "adult" | "geriatric">("all");
  const [returningSortBy, setReturningSortBy] = useState<"recent-visit" | "name-asc" | "name-desc" | "mrn-asc" | "visits-count">("recent-visit");
  const [returningViewMode, setReturningViewMode] = useState<"cards" | "table">("cards");
  const [returningPage, setReturningPage] = useState<number>(1);
  const [returningPageSize, setReturningPageSize] = useState<number>(6);

  // Auto-scroll to top when switching registration sub-tabs
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [activeTab]);

  // Helper formatting for Last Visit Relative Time & Date
  const formatRelativeVisit = (dateStr?: string) => {
    if (!dateStr) return { text: "Belum Pernah Berkunjung", daysDiff: null, isNew: true };
    const visitDate = new Date(dateStr);
    const today = new Date();
    const diffTime = today.getTime() - visitDate.getTime();
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    if (diffDays === 0) return { text: "Hari ini", daysDiff: 0, isNew: false };
    if (diffDays === 1) return { text: "Kemarin", daysDiff: 1, isNew: false };
    if (diffDays < 7) return { text: `${diffDays} hari lalu`, daysDiff: diffDays, isNew: false };
    if (diffDays < 30) {
      const weeks = Math.max(1, Math.floor(diffDays / 7));
      return { text: `${weeks} minggu lalu`, daysDiff: diffDays, isNew: false };
    }
    if (diffDays < 365) {
      const months = Math.max(1, Math.floor(diffDays / 30));
      return { text: `${months} bulan lalu`, daysDiff: diffDays, isNew: false };
    }
    const years = Math.max(1, Math.floor(diffDays / 365));
    return { text: `${years} thn lalu`, daysDiff: diffDays, isNew: false };
  };

  const formatVisitDateIndo = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const worklist = propsWorklist || localWorklist;
  const setWorklist = onUpdateWorklist || setLocalWorklist;

  // Synchronize department filter when changed from Header or parent
  React.useEffect(() => {
    if (activeDepartment) {
      setWorklistDepartmentFilter(
        activeDepartment === "Semua Poli" ? "all" : activeDepartment
      );
      setCurrentPage(1);
    }
  }, [activeDepartment]);

  const handleDepartmentFilterChange = (dept: string) => {
    setWorklistDepartmentFilter(dept);
    if (onDepartmentChange) {
      onDepartmentChange(dept === "all" ? "Semua Poli" : dept);
    }
    setCurrentPage(1);
  };

  // New Patient Form State
  const [nikInput, setNikInput] = useState("");
  const [isVerifyingNik, setIsVerifyingNik] = useState(false);
  const [isNikVerified, setIsNikVerified] = useState(false);
  const [newPatientData, setNewPatientData] = useState<Partial<PatientProfile>>({
    name: "",
    gender: "male",
    birthDate: "",
    phone: "",
    address: "",
    bloodType: "O",
    allergies: [],
  });
  const [allergyInput, setAllergyInput] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("Keluarga");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  // Encounter / Queue Form State
  const [selectedClinic, setSelectedClinic] = useState("Poli Penyakit Dalam");
  const [selectedDoctor, setSelectedDoctor] = useState("dr. Rian Pratama, Sp.PD (SIP: 446/089)");
  const [payerType, setPayerType] = useState("BPJS Kesehatan (JKN-PBI / Non-PBI)");
  const [bpjsNumber, setBpjsNumber] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [triagePriorityInput, setTriagePriorityInput] = useState<"regular" | "urgent" | "geriatric" | "pediatric">("regular");

  // High-Volume UI States (Density, Multi-Filter, Pagination)
  const [viewMode, setViewMode] = useState<"comfortable" | "compact">("comfortable");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showCapacityBar, setShowCapacityBar] = useState<boolean>(true);
  const [queueVoiceProfile, setQueueVoiceProfile] = useState<VoiceProfileId>("female_announcer");
  const [callingItemId, setCallingItemId] = useState<string | null>(null);
  const [transitioningItemId, setTransitioningItemId] = useState<string | null>(null);

  // Clinic Quota Limits Definition
  const CLINIC_QUOTAS: Record<string, { quota: number; room: string; doctor: string }> = {
    "Poli Penyakit Dalam": { quota: 30, room: "Ruang 204 (Lt. 2)", doctor: "dr. Rian Pratama, Sp.PD" },
    "Poli Umum": { quota: 35, room: "Ruang 102 (Lt. 1)", doctor: "dr. Amanda Putri, M.Biomed" },
    "Poli Anak (Pediatri)": { quota: 20, room: "Ruang 105 (Lt. 1)", doctor: "dr. Maya Anggraini, Sp.A" },
    "Poli Gigi & Mulut": { quota: 20, room: "Ruang 201 (Lt. 2)", doctor: "drg. Kevin Tanuwidjaja" },
    "Poli Jantung & Pembuluh Darah": { quota: 15, room: "Ruang 208 (Lt. 2)", doctor: "dr. Rian Hidayat, Sp.JP" },
    "Poli Mata": { quota: 20, room: "Ruang 210 (Lt. 2)", doctor: "dr. Nadia Putri, Sp.M" },
  };

  const currentQuotaInfo = CLINIC_QUOTAS[selectedClinic] || CLINIC_QUOTAS["Poli Penyakit Dalam"];

  const handleSelectPatient = (p: PatientProfile) => {
    onSelectPatient(p);
    toast.info(`Pasien aktif: ${p.name} (No. RM ${p.mrn.replace(/^RM-?/i, "")})`);
  };

  // Real-time Validations
  const nikValResult = validateNIK(nikInput);
  const existingPatientByNik = nikInput.length >= 16 ? patientsList.find((p) => p.nik === nikInput.trim()) : null;
  const isDuplicateQueue = worklist.some(
    (w) =>
      w.patient.id === currentPatient.id &&
      (w.status === "arrived" || w.status === "in-progress") &&
      w.department === selectedClinic
  );
  const existingQueueItem = worklist.find(
    (w) =>
      w.patient.id === currentPatient.id &&
      (w.status === "arrived" || w.status === "in-progress")
  );

  // Filter & Sort Returning Patients Engine
  const processedReturningPatients = patientsList
    .filter((p) => {
      // 1. Multi-Field Search (Name, NIK, MRN, ID, Diagnosis, Department, Doctor)
      const q = returningSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.nik.includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.lastVisitDepartment && p.lastVisitDepartment.toLowerCase().includes(q)) ||
        (p.lastVisitDoctor && p.lastVisitDoctor.toLowerCase().includes(q)) ||
        (p.lastVisitDiagnosis && p.lastVisitDiagnosis.toLowerCase().includes(q));

      // 2. Active queue check today
      const hasTodayQueue = worklist.some((w) => w.patient.id === p.id);

      // 3. Visit Status & Historical Date Filter
      let matchesVisit = true;
      if (returningVisitFilter === "today") {
        matchesVisit =
          hasTodayQueue ||
          (p.lastVisitDate ? formatRelativeVisit(p.lastVisitDate).daysDiff === 0 : false);
      } else if (returningVisitFilter === "last-7") {
        if (!p.lastVisitDate) {
          matchesVisit = false;
        } else {
          const diff = formatRelativeVisit(p.lastVisitDate).daysDiff;
          matchesVisit = diff !== null && diff <= 7;
        }
      } else if (returningVisitFilter === "last-30") {
        if (!p.lastVisitDate) {
          matchesVisit = false;
        } else {
          const diff = formatRelativeVisit(p.lastVisitDate).daysDiff;
          matchesVisit = diff !== null && diff <= 30;
        }
      } else if (returningVisitFilter === "older-30") {
        if (!p.lastVisitDate) {
          matchesVisit = false;
        } else {
          const diff = formatRelativeVisit(p.lastVisitDate).daysDiff;
          matchesVisit = diff !== null && diff > 30;
        }
      } else if (returningVisitFilter === "custom" && returningCustomDate) {
        matchesVisit = p.lastVisitDate?.split("T")[0] === returningCustomDate;
      } else if (returningVisitFilter === "has-history") {
        matchesVisit = Boolean(p.lastVisitDate || (p.totalVisitsCount && p.totalVisitsCount > 0));
      } else if (returningVisitFilter === "no-history") {
        matchesVisit = !p.lastVisitDate && (!p.totalVisitsCount || p.totalVisitsCount === 0);
      }

      // 4. Department Filter
      let matchesDept = true;
      if (returningDeptFilter !== "all") {
        matchesDept = p.lastVisitDepartment === returningDeptFilter;
      }

      // 5. Age Filter
      let matchesAge = true;
      if (returningAgeFilter !== "all") {
        const age = new Date().getFullYear() - new Date(p.birthDate).getFullYear();
        if (returningAgeFilter === "pediatric") matchesAge = age < 18;
        else if (returningAgeFilter === "adult") matchesAge = age >= 18 && age < 60;
        else if (returningAgeFilter === "geriatric") matchesAge = age >= 60;
      }

      return matchesSearch && matchesVisit && matchesDept && matchesAge;
    })
    .sort((a, b) => {
      if (returningSortBy === "recent-visit") {
        const aToday = worklist.some((w) => w.patient.id === a.id);
        const bToday = worklist.some((w) => w.patient.id === b.id);
        if (aToday && !bToday) return -1;
        if (!aToday && bToday) return 1;

        const timeA = a.lastVisitDate ? new Date(a.lastVisitDate).getTime() : 0;
        const timeB = b.lastVisitDate ? new Date(b.lastVisitDate).getTime() : 0;
        return timeB - timeA;
      } else if (returningSortBy === "name-asc") {
        return a.name.localeCompare(b.name);
      } else if (returningSortBy === "name-desc") {
        return b.name.localeCompare(a.name);
      } else if (returningSortBy === "mrn-asc") {
        return a.mrn.localeCompare(b.mrn);
      } else if (returningSortBy === "visits-count") {
        return (b.totalVisitsCount || 0) - (a.totalVisitsCount || 0);
      }
      return 0;
    });

  // Returning Patients Pagination calculations
  const returningTotalPages = Math.max(
    1,
    Math.ceil(processedReturningPatients.length / returningPageSize)
  );
  const safeReturningPage = Math.min(returningPage, returningTotalPages);
  const paginatedReturningPatients = processedReturningPatients.slice(
    (safeReturningPage - 1) * returningPageSize,
    safeReturningPage * returningPageSize
  );

  // Calculate master FIFO sequence number (arrival rank #1, #2, etc.)
  const getFifoRank = (itemId: string) => {
    const fifoList = [...worklist].sort((a, b) => {
      const timeA = a.arrivalTimestamp || 0;
      const timeB = b.arrivalTimestamp || 0;
      if (timeA && timeB && timeA !== timeB) return timeA - timeB;
      return 0;
    });
    const index = fifoList.findIndex((w) => w.id === itemId);
    return index !== -1 ? index + 1 : 1;
  };

  // Department Count Map
  const deptCountMap = Object.keys(CLINIC_QUOTAS).reduce((acc, dept) => {
    acc[dept] = worklist.filter((w) => w.department === dept).length;
    return acc;
  }, {} as Record<string, number>);

  // Triage Count Map
  const countUrgent = worklist.filter((w) => w.triagePriority === "urgent").length;
  const countGeriatric = worklist.filter((w) => w.triagePriority === "geriatric").length;
  const countPediatric = worklist.filter((w) => w.triagePriority === "pediatric").length;

  // KPI Counts
  const countWaiting = worklist.filter((w) => w.status === "arrived").length;
  const countInProgress = worklist.filter((w) => w.status === "in-progress").length;
  const countFinished = worklist.filter((w) => w.status === "finished").length;

  // Speech Call Function (Indonesian Locale & Voice Personas)
  const handleCallPatient = async (item: ClinicQueuePatientItem) => {
    setCallingItemId(item.id);
    const profileInfo = VOICE_PROFILES[queueVoiceProfile] || VOICE_PROFILES.jokowi;
    try {
      await speakIndonesianQueueCall({
        queueNumber: item.queueNumber,
        patientName: item.patient.name,
        department: item.department,
        room: item.room,
        doctor: item.doctor,
        profileId: queueVoiceProfile,
        withChime: true,
      });
      const cleanPatientName = item.patient.name.replace(/\s*\([^)]*\)/g, "").trim();
      toast.success(`Memanggil Antrean ${item.queueNumber} — ${cleanPatientName}`, {
        description: `${item.department} • Suara: ${profileInfo.name}`,
        duration: 4000,
      });
    } finally {
      setCallingItemId(null);
    }
  };

  // Filter & Sort live worklist
  const filteredWorklist = worklist
    .filter((item) => {
      const matchesStatus =
        worklistStatusFilter === "all" || item.status === worklistStatusFilter;
      const matchesDept =
        worklistDepartmentFilter === "all" || item.department === worklistDepartmentFilter;
      const matchesTriage =
        triageFilter === "all" || (item.triagePriority || "regular") === triageFilter;
      const matchesQuery =
        item.patient.name.toLowerCase().includes(worklistSearch.toLowerCase()) ||
        item.patient.mrn.toLowerCase().includes(worklistSearch.toLowerCase()) ||
        item.queueNumber.toLowerCase().includes(worklistSearch.toLowerCase()) ||
        item.doctor.toLowerCase().includes(worklistSearch.toLowerCase()) ||
        item.department.toLowerCase().includes(worklistSearch.toLowerCase()) ||
        item.patient.nik.includes(worklistSearch);
      return matchesStatus && matchesDept && matchesTriage && matchesQuery;
    })
    .sort((a, b) => {
      if (sortBy === "fifo") {
        // Urgent/CITO can bubble to top if urgent, otherwise FIFO
        const timeA = a.arrivalTimestamp || 0;
        const timeB = b.arrivalTimestamp || 0;
        if (timeA && timeB && timeA !== timeB) return timeA - timeB;
        return a.arrivalTime.localeCompare(b.arrivalTime);
      } else if (sortBy === "status") {
        // Status priority: in-progress (1) > arrived (2) > finished (3)
        const rank: Record<string, number> = { "in-progress": 1, arrived: 2, finished: 3 };
        const diff = rank[a.status] - rank[b.status];
        if (diff !== 0) return diff;
        return (a.arrivalTimestamp || 0) - (b.arrivalTimestamp || 0);
      } else if (sortBy === "queueNumber") {
        return a.queueNumber.localeCompare(b.queueNumber);
      }
      return 0;
    });

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredWorklist.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedWorklist = filteredWorklist.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  // Active examination patient spotlight
  const currentInProgressPatient = worklist.find((w) => w.status === "in-progress");

  // Status Change Handlers with Tactile Transition Feedback
  const handleUpdateStatus = (
    itemId: string,
    nextStatus: "arrived" | "in-progress" | "finished"
  ) => {
    setTransitioningItemId(itemId);
    setTimeout(() => setTransitioningItemId(null), 800);

    if (propsOnUpdateStatus) {
      propsOnUpdateStatus(itemId, nextStatus);
      return;
    }

    const target = worklist.find((w) => w.id === itemId);
    const previousActiveInSameDept =
      nextStatus === "in-progress" && target
        ? worklist.find(
            (w) =>
              w.id !== itemId &&
              w.department === target.department &&
              w.status === "in-progress"
          )
        : null;

    setWorklist((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return { ...item, status: nextStatus };
        }
        if (previousActiveInSameDept && item.id === previousActiveInSameDept.id) {
          return { ...item, status: "finished" };
        }
        return item;
      })
    );

    if (target) {
      if (nextStatus === "in-progress") {
        onSelectPatient(target.patient, "entry");
        toast.success(
          `Memulai pemeriksaan pasien ${target.patient.name} (${target.queueNumber}). Membuka formulir SOAP DPJP.`,
          { duration: 4000 }
        );
      } else if (nextStatus === "finished") {
        onSelectPatient(target.patient, "resume");
        toast.success(
          `Kunjungan pasien ${target.patient.name} (${target.queueNumber}) telah selesai. Menampilkan resume medis.`,
          { duration: 4000 }
        );
      } else {
        toast.info(`Status antrean ${target.patient.name} diubah menjadi Menunggu.`);
      }
    }
  };

  // Open Doctor SOAP Entry Form
  const handleOpenSoapEntry = (patient: PatientProfile, itemId?: string) => {
    if (itemId) {
      setTransitioningItemId(itemId);
      setTimeout(() => setTransitioningItemId(null), 800);
    }
    onSelectPatient(patient, "entry");
    toast.success(`Membuka formulir SOAP: ${patient.name}`);
  };

  // Open Patient Record & Resume Medis History
  const handleOpenPatientHistory = (patient: PatientProfile, itemId?: string) => {
    if (itemId) {
      setTransitioningItemId(itemId);
      setTimeout(() => setTransitioningItemId(null), 800);
    }
    onSelectPatient(patient, "resume");
    toast.success(`Membuka berkas resume medis & riwayat pasien: ${patient.name}`);
  };

  // Live / MPI SATUSEHAT NIK Verification
  const handleVerifyNikMpi = async () => {
    if (nikInput.length < 16) {
      toast.error("NIK harus terdiri dari 16 digit angka sesuai KTP.");
      return;
    }

    setIsVerifyingNik(true);
    try {
      const res = await fetch(`/api/satusehat/patient?nik=${nikInput}`);
      const data = await res.json();

      if (data.success && data.data) {
        setIsNikVerified(true);
        setNewPatientData({
          id: data.data.ihsId || data.data.id,
          nik: data.data.nik,
          name: data.data.name,
          gender: data.data.gender,
          birthDate: data.data.birthDate,
          address: data.data.address,
          phone: data.data.phone,
          bloodType: data.data.bloodType || "O",
          allergies: data.data.allergies || [],
        });
        if (data.data.emergencyContact) {
          setEmergencyName(data.data.emergencyContact.name || "");
          setEmergencyRelation(data.data.emergencyContact.relation || "Keluarga");
          setEmergencyPhone(data.data.emergencyContact.phone || "");
        }
        toast.success("NIK terverifikasi di Master Patient Index (MPI) SATUSEHAT Kemenkes");
      } else {
        toast.error(data.error || "Gagal memverifikasi NIK ke SATUSEHAT.");
      }
    } catch {
      toast.error("Gagal terhubung ke endpoint SATUSEHAT MPI.");
    } finally {
      setIsVerifyingNik(false);
    }
  };

  // Submit New Patient
  const handleSaveNewPatient = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Validasi NIK
    const nikCheck = validateNIK(nikInput);
    if (!nikCheck.isValid) {
      toast.error("Validasi NIK Gagal", { description: nikCheck.message });
      return;
    }

    // 2. Cek Duplikasi NIK
    if (existingPatientByNik) {
      toast.error("Pasien Sudah Terdaftar", {
        description: `NIK ${nikInput} sudah terdaftar atas nama ${existingPatientByNik.name} (No. RM: ${existingPatientByNik.mrn}).`,
      });
      return;
    }

    // 3. Validasi Nama
    if (!newPatientData.name?.trim()) {
      toast.error("Nama lengkap pasien wajib diisi.");
      return;
    }

    // 4. Validasi Telepon
    if (newPatientData.phone) {
      const phoneCheck = validatePhone(newPatientData.phone);
      if (!phoneCheck.isValid) {
        toast.error("Format Nomor Telepon Tidak Valid", { description: phoneCheck.message });
        return;
      }
    }

    const createdPatient: PatientProfile = {
      id: newPatientData.id || `P-${Date.now()}`,
      nik: nikInput.trim(),
      mrn: `RM-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      name: newPatientData.name.trim(),
      gender: newPatientData.gender || "male",
      birthDate: newPatientData.birthDate || "",
      phone: newPatientData.phone?.trim() || "",
      address: newPatientData.address?.trim() || "",
      bloodType: (newPatientData.bloodType as "A" | "B" | "AB" | "O") || "O",
      allergies: allergyInput
        ? [allergyInput]
        : newPatientData.allergies || [],
      emergencyContact: {
        name: emergencyName.trim(),
        relation: emergencyRelation || "Keluarga",
        phone: emergencyPhone.trim(),
      },
      satusehatConsent: newPatientData.satusehatConsent || "opt-in",
    };

    setPatientsList((prev) => [createdPatient, ...prev]);
    onRegisterNewPatient(createdPatient);
    onSelectPatient(createdPatient);
    toast.success(`Pasien baru berhasil didaftarkan (No. RM ${createdPatient.mrn.replace(/^RM-?/i, "")})`);
    setActiveTab("queue");
  };

  // Submit New Encounter
  const handleRegisterEncounter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chiefComplaint.trim()) {
      toast.error("Mohon isi keluhan awal saat mendaftar poli.");
      return;
    }

    // Validasi No BPJS jika memilih penjamin BPJS dan mengisi nomornya (Opsional)
    if (payerType.includes("BPJS") && bpjsNumber.trim()) {
      const bpjsCheck = validateBPJS(bpjsNumber);
      if (!bpjsCheck.isValid) {
        toast.error("Validasi BPJS Gagal", { description: bpjsCheck.message });
        return;
      }
    }

    // Validasi Duplikasi Antrean Aktif
    if (isDuplicateQueue) {
      toast.error("Peringatan Duplikasi Antrean", {
        description: `Pasien ${currentPatient.name} sudah memiliki antrean aktif di ${selectedClinic}. Selesaikan antrean sebelumnya terlebih dahulu.`,
        duration: 6000,
      });
      return;
    }

    const newQueueNum = `A-0${Math.floor(16 + Math.random() * 80)}`;
    const newEnc: OutpatientEncounter = {
      id: `ENC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      satusehatEncounterId: undefined,
      visitDate: new Date().toISOString(),
      clinicDepartment: selectedClinic,
      doctorName: selectedDoctor.split(" (")[0],
      doctorSip: "SIP.446/089/DS/Dinkes/2026",
      doctorIhsId: "N10009841",
      hospitalName: "RS Umum Daerah Sehat Sejahtera",
      hospitalOrgId: "10000004",
      chiefComplaint: chiefComplaint,
      anamnesis: `Pasien mendaftar di ${selectedClinic} dengan keluhan: ${chiefComplaint}. Penjamin: ${payerType}.`,
      vitals: undefined,
      diagnoses: [],
      procedures: [],
      prescriptions: [],
      followUpPlan: {
        instruction: "Menunggu pemeriksaan & instruksi dokter DPJP.",
      },
      dischargeDisposition: "Menunggu Pelayanan Poli",
      encounterStatus: "arrived",
      queueNumber: newQueueNum,
      syncStatus: "pending",
      syncedAt: undefined,
    };

    const now = new Date();
    const newArrivalTimestamp = now.getTime();
    const newArrivalTime =
      now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";

    const newQueueItem: ClinicQueuePatientItem = {
      id: `Q-${Date.now().toString().slice(-4)}`,
      queueNumber: newQueueNum,
      patient: currentPatient,
      department: selectedClinic,
      doctor: selectedDoctor.split(" (")[0],
      room: CLINIC_QUOTAS[selectedClinic]?.room || "Ruang 204 (Lt. 2)",
      arrivalTime: newArrivalTime,
      arrivalTimestamp: newArrivalTimestamp,
      chiefComplaint: chiefComplaint,
      status: "arrived",
      satusehatStatus: "pending",
      triagePriority: triagePriorityInput,
    };

    // Menambahkan pasien baru ke urutan antrean FIFO paling akhir
    setWorklist((prev) => [...prev, newQueueItem]);
    onCreateEncounter(newEnc);
    onSelectPatient(currentPatient);

    // Persist ke Database SQLite via API
    fetch("/api/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newQueueItem),
    }).catch((err) => console.error("Gagal simpan queue baru ke DB:", err));

    fetch("/api/encounters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ encounter: newEnc, patientId: currentPatient.id }),
    }).catch((err) => console.error("Gagal simpan encounter baru ke DB:", err));

    toast.success(
      `Pendaftaran kunjungan (${newQueueNum}) ke ${selectedClinic} berhasil. Membuka karcis antrean cetak...`
    );
    if (onOpenQueueTicket) {
      setTimeout(() => {
        onOpenQueueTicket();
      }, 300);
    }
    setActiveTab("worklist");
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="ehr-card p-5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-900">
                Pendaftaran & Alur Antrean Pasien (Clinical Worklist)
              </h2>
              <p className="text-xs text-slate-500">
                Pantau status pasien Menunggu, Sedang Diperiksa, &amp; Selesai sesuai urutan kedatangan pasien dan standar integrasi Kemenkes RI
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Registration Tabs */}
      <div className="ehr-card p-5 space-y-5">
        {/* Navigation Tabs Header */}
        <div className="grid grid-cols-2 lg:grid-cols-4 bg-slate-100 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("worklist")}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "worklist"
                ? "bg-white text-teal-800 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Activity className="h-3.5 w-3.5 text-teal-600 shrink-0" />
            <span className="truncate">Antrean Pasien ({worklist.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("returning")}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "returning"
                ? "bg-white text-teal-800 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Search className="h-3.5 w-3.5 text-teal-600" />
            <span>1. Cari Pasien Lama</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("new")}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "new"
                ? "bg-white text-teal-800 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <UserPlus className="h-3.5 w-3.5 text-teal-600" />
            <span>2. Pendaftaran Pasien Baru</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("queue")}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "queue"
                ? "bg-white text-teal-800 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Stethoscope className="h-3.5 w-3.5 text-teal-600" />
            <span>3. Form Pendaftaran Poli</span>
          </button>
        </div>

        {/* TAB 0: ALUR & STATUS PASIEN HARI INI (LIVE WORKLIST) */}
        {activeTab === "worklist" && (
          <div className="space-y-4">
            {/* 1. Clinic Quota & Capacity Meters Dashboard (Collapsible) */}
            <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 via-teal-50/20 to-slate-50 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                      <span>Pemantauan Kapasitas & Beban Pelayanan Poli Hari Ini</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                        Live Monitor
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Klik salah satu poli untuk memfilter worklist secara cepat berdasarkan poliklinik tujuan
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCapacityBar(!showCapacityBar)}
                  className="text-xs font-bold text-teal-800 hover:text-teal-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs hover:bg-slate-50 cursor-pointer"
                >
                  {showCapacityBar ? "Sembunyikan Indikator" : "Buka Indikator Kapasitas"}
                </button>
              </div>

              {showCapacityBar && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {Object.entries(CLINIC_QUOTAS).map(([dept, info]) => {
                    const currentCount = deptCountMap[dept] || 0;
                    const percent = Math.min(100, Math.round((currentCount / info.quota) * 100));
                    const isSelected = worklistDepartmentFilter === dept;
                    const isHighLoad = percent >= 80;

                    const getDeptIcon = () => {
                      if (dept.includes("Anak")) return <Baby className="h-4 w-4 shrink-0" />;
                      if (dept.includes("Jantung")) return <HeartPulse className="h-4 w-4 shrink-0" />;
                      if (dept.includes("Penyakit Dalam")) return <Stethoscope className="h-4 w-4 shrink-0" />;
                      return <Building2 className="h-4 w-4 shrink-0" />;
                    };

                    return (
                      <div
                        key={dept}
                        onClick={() => {
                          handleDepartmentFilterChange(isSelected ? "all" : dept);
                        }}
                        className={`p-3.5 rounded-xl border card-interactive transition-all cursor-pointer shadow-2xs ${
                          isSelected
                            ? "bg-teal-700 text-white border-teal-800 shadow-md ring-2 ring-teal-500/30"
                            : "bg-white text-slate-800 border-slate-200 hover:border-teal-300 hover:bg-teal-50/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-105 ${
                                isSelected
                                  ? "bg-white/20 text-white"
                                  : "bg-teal-50 text-teal-700 border border-teal-200"
                              }`}
                            >
                              {getDeptIcon()}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-xs tracking-tight truncate">
                                {dept}
                              </h4>
                              <p
                                className={`text-[10px] truncate ${
                                  isSelected ? "text-teal-200" : "text-slate-400"
                                }`}
                              >
                                {info.room}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-mono text-xs font-extrabold">
                              <span className={isSelected ? "text-white" : "text-slate-900"}>
                                {currentCount}
                              </span>
                              <span className={isSelected ? "text-teal-200 text-[10px]" : "text-slate-400 text-[10px]"}>
                                /{info.quota}
                              </span>
                            </div>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full inline-block mt-0.5 transition-colors duration-150 ${
                                isSelected
                                  ? "bg-teal-800 text-teal-100"
                                  : isHighLoad
                                  ? "bg-red-100 text-red-800 border border-red-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              {isHighLoad ? "Hampir Penuh" : `${info.quota - currentCount} Slot`}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar & Percentage */}
                        <div className="mt-3 space-y-1">
                          <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-500 ${
                                isSelected
                                  ? "bg-white"
                                  : isHighLoad
                                  ? "bg-red-500"
                                  : percent >= 50
                                  ? "bg-amber-500"
                                  : "bg-teal-600"
                              }`}
                              style={{ width: `${Math.max(percent, 4)}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className={isSelected ? "text-teal-200" : "text-slate-400 font-sans"}>
                              Beban Antrean
                            </span>
                            <span className={`font-bold ${isSelected ? "text-white" : "text-slate-700"}`}>
                              {percent}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. KPI Summary Strip with Triage Counts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div
                onClick={() => {
                  setWorklistStatusFilter("all");
                  setCurrentPage(1);
                }}
                className={`p-3.5 rounded-xl border cursor-pointer card-interactive transition-all ${
                  worklistStatusFilter === "all"
                    ? "bg-slate-900 text-white border-slate-800 shadow-sm ring-2 ring-teal-500/20"
                    : "bg-white text-slate-900 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${worklistStatusFilter === "all" ? "text-slate-300" : "text-slate-500"}`}>
                    Total Antrean
                  </span>
                  <Users className={`h-4 w-4 ${worklistStatusFilter === "all" ? "text-teal-400" : "text-slate-400"}`} />
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-extrabold">{worklist.length}</span>
                  {countUrgent > 0 && (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-red-500 text-white animate-pulse">
                      {countUrgent} CITO
                    </span>
                  )}
                </div>
              </div>

              <div
                onClick={() => {
                  setWorklistStatusFilter("arrived");
                  setCurrentPage(1);
                }}
                className={`p-3.5 rounded-xl border cursor-pointer card-interactive transition-all ${
                  worklistStatusFilter === "arrived"
                    ? "bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-500/20"
                    : "bg-amber-50/70 text-amber-950 border-amber-200 hover:bg-amber-100/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${worklistStatusFilter === "arrived" ? "text-amber-100" : "text-amber-800"}`}>
                    Menunggu
                  </span>
                  <Clock className={`h-4 w-4 ${worklistStatusFilter === "arrived" ? "text-white" : "text-amber-600"}`} />
                </div>
                <div className="text-xl font-extrabold mt-1">{countWaiting}</div>
              </div>

              <div
                onClick={() => {
                  setWorklistStatusFilter("in-progress");
                  setCurrentPage(1);
                }}
                className={`p-3.5 rounded-xl border cursor-pointer card-interactive transition-all ${
                  worklistStatusFilter === "in-progress"
                    ? "bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-500/20"
                    : "bg-blue-50/70 text-blue-950 border-blue-200 hover:bg-blue-100/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${worklistStatusFilter === "in-progress" ? "text-blue-100" : "text-blue-800"}`}>
                    Sedang Diperiksa
                  </span>
                  <Activity className={`h-4 w-4 ${worklistStatusFilter === "in-progress" ? "text-white animate-pulse" : "text-blue-600"}`} />
                </div>
                <div className="text-xl font-extrabold mt-1">{countInProgress}</div>
              </div>

              <div
                onClick={() => {
                  setWorklistStatusFilter("finished");
                  setCurrentPage(1);
                }}
                className={`p-3.5 rounded-xl border cursor-pointer card-interactive transition-all ${
                  worklistStatusFilter === "finished"
                    ? "bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-500/20"
                    : "bg-emerald-50/70 text-emerald-950 border-emerald-200 hover:bg-emerald-100/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${worklistStatusFilter === "finished" ? "text-emerald-100" : "text-emerald-800"}`}>
                    Selesai
                  </span>
                  <CheckCircle2 className={`h-4 w-4 ${worklistStatusFilter === "finished" ? "text-white" : "text-emerald-600"}`} />
                </div>
                <div className="text-xl font-extrabold mt-1">{countFinished}</div>
              </div>
            </div>

            {/* 3. Multi-Faceted Filter, Search & Density Switcher Toolbar (Redesigned & Spacious) */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
              {/* Row 1: Search Bar + View Mode + Page Size */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Cari nama pasien, NIK, No. RM, atau dokter DPJP..."
                    value={worklistSearch}
                    onChange={(e) => {
                      setWorklistSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 pr-8 text-xs h-10 bg-slate-50/70 border-slate-200 hover:bg-white focus:bg-white w-full transition-colors"
                  />
                  {worklistSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setWorklistSearch("");
                        setCurrentPage(1);
                      }}
                      className="absolute right-2.5 top-2.5 h-5 w-5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center text-xs font-bold cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Density View Switcher */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 h-10 shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewMode("comfortable")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        viewMode === "comfortable"
                          ? "bg-white text-teal-800 shadow-xs border border-slate-200/80"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      title="Tampilan Kartu Lengkap"
                    >
                      <LayoutGrid className="h-3.5 w-3.5 text-teal-600" />
                      <span>Mode Kartu</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("compact")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        viewMode === "compact"
                          ? "bg-white text-teal-800 shadow-xs border border-slate-200/80"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      title="Tampilan Tabel Data Terstruktur"
                    >
                      <Table className="h-3.5 w-3.5 text-teal-600" />
                      <span>Mode Tabel</span>
                    </button>
                  </div>

                  {/* Page Size Selector */}
                  <CustomSelect<number>
                    value={pageSize}
                    onChange={(val) => {
                      setPageSize(val);
                      setCurrentPage(1);
                    }}
                    size="lg"
                    align="right"
                    options={[
                      { value: 5, label: "5 per hal" },
                      { value: 10, label: "10 per hal" },
                      { value: 25, label: "25 per hal" },
                      { value: 50, label: "50 per hal" },
                    ]}
                    title="Jumlah Baris per Halaman"
                  />
                </div>
              </div>

              {/* Row 2: Date Range Quick Selector Bar */}
              <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1 mr-1">
                    <Calendar className="h-3.5 w-3.5 text-teal-600" />
                    <span>Filter Tanggal:</span>
                  </span>

                  {[
                    { id: "today", label: "Hari Ini" },
                    { id: "yesterday", label: "Kemarin" },
                    { id: "last-7", label: "7 Hari" },
                    { id: "all", label: "Semua Riwayat" },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setWorklistDatePreset(preset.id as any);
                        setWorklistCustomDate("");
                        setCurrentPage(1);
                        fetchWorklistByDate(preset.id, "");
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none border ${
                        worklistDatePreset === preset.id
                          ? "bg-teal-700 text-white border-teal-800 shadow-xs ring-1 ring-teal-500/30 font-extrabold"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-medium"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}

                  {/* Inline Custom Date Picker */}
                  <CustomDatePicker
                    value={worklistDatePreset === "custom" ? worklistCustomDate : ""}
                    onChange={(dateVal) => {
                      if (dateVal) {
                        setWorklistDatePreset("custom");
                        setWorklistCustomDate(dateVal);
                        setCurrentPage(1);
                        fetchWorklistByDate("custom", dateVal);
                      } else {
                        setWorklistDatePreset("today");
                        setWorklistCustomDate("");
                        setCurrentPage(1);
                        fetchWorklistByDate("today", "");
                      }
                    }}
                    size="sm"
                    align="left"
                    isActive={worklistDatePreset === "custom" && Boolean(worklistCustomDate)}
                    placeholder="Pilih Tanggal..."
                    prefixLabel={worklistDatePreset === "custom" ? "Tanggal:" : undefined}
                    buttonClassName={`h-[30px] px-2.5 py-1 text-xs rounded-lg transition-all border ${
                      worklistDatePreset === "custom" && Boolean(worklistCustomDate)
                        ? "bg-teal-700 text-white border-teal-800 shadow-xs ring-1 ring-teal-500/30 font-extrabold"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-medium"
                    }`}
                  />
                </div>
              </div>

              {/* Row 3: Filter Selectors (Poli, Triase, Sort) */}
              <div className="pt-2.5 border-t border-slate-100 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Filter Poli */}
                  <CustomSelect<string>
                    value={worklistDepartmentFilter}
                    onChange={(val) => {
                      handleDepartmentFilterChange(val);
                    }}
                    prefixIcon={<Building2 className="h-3.5 w-3.5 text-teal-600" />}
                    prefixLabel="Poli:"
                    size="md"
                    className="w-full"
                    options={[
                      {
                        value: "all",
                        label: `Semua Poliklinik (${worklist.length})`,
                      },
                      ...Object.keys(CLINIC_QUOTAS).map((dept) => ({
                        value: dept,
                        label: dept,
                        badge: (
                          <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 font-mono">
                            {deptCountMap[dept] || 0}
                          </span>
                        ),
                      })),
                    ]}
                  />

                  {/* Filter Triase */}
                  <CustomSelect<string>
                    value={triageFilter}
                    onChange={(val) => {
                      setTriageFilter(val as any);
                      setCurrentPage(1);
                    }}
                    prefixIcon={<AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                    prefixLabel="Triase:"
                    size="md"
                    className="w-full"
                    options={[
                      { value: "all", label: `Semua Triase (${worklist.length})` },
                      {
                        value: "urgent",
                        label: "🔴 CITO / Urgent",
                        badge: (
                          <span className="text-[10px] font-bold text-red-800 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                            {countUrgent}
                          </span>
                        ),
                      },
                      {
                        value: "geriatric",
                        label: "🟣 Geriatri / Lansia",
                        badge: (
                          <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                            {countGeriatric}
                          </span>
                        ),
                      },
                      {
                        value: "pediatric",
                        label: "🔵 Pediatri / Anak",
                        badge: (
                          <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {countPediatric}
                          </span>
                        ),
                      },
                      { value: "regular", label: "🟢 Reguler" },
                    ]}
                  />

                  {/* Sort Selector */}
                  <CustomSelect<"fifo" | "status" | "queueNumber">
                    value={sortBy}
                    onChange={(val) => setSortBy(val)}
                    prefixIcon={<ListOrdered className="h-3.5 w-3.5 text-teal-700" />}
                    prefixLabel="Urut:"
                    size="md"
                    className="w-full"
                    options={[
                      { value: "fifo", label: "Urutan Kedatangan Terawal" },
                      { value: "status", label: "Status (Diperiksa ➔ Selesai)" },
                      { value: "queueNumber", label: "Nomor Antrean (A-Z)" },
                    ]}
                  />
                </div>

                {/* Active Filter Summary & Reset Bar */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>
                      Menampilkan <strong className="text-slate-900 font-bold">{filteredWorklist.length}</strong> dari <strong className="text-slate-700">{worklist.length}</strong> antrean
                    </span>
                    {worklistDatePreset !== "today" && (
                      <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 font-semibold text-[10px] border border-teal-200">
                        Tanggal: {worklistDatePreset === "yesterday" ? "Kemarin" : worklistDatePreset === "last-7" ? "7 Hari Terakhir" : worklistDatePreset === "last-30" ? "30 Hari Terakhir" : worklistDatePreset === "all" ? "Semua Riwayat" : worklistCustomDate || "Custom"}
                      </span>
                    )}
                    {worklistStatusFilter !== "all" && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px] border border-slate-200">
                        Status: {worklistStatusFilter === "arrived" ? "Menunggu" : worklistStatusFilter === "in-progress" ? "Diperiksa" : "Selesai"}
                      </span>
                    )}
                  </div>

                  {(worklistDepartmentFilter !== "all" || triageFilter !== "all" || worklistSearch || worklistStatusFilter !== "all" || worklistDatePreset !== "today") && (
                    <button
                      type="button"
                      onClick={() => {
                        setWorklistDepartmentFilter("all");
                        if (onDepartmentChange) {
                          onDepartmentChange("Semua Poli");
                        }
                        setTriageFilter("all");
                        setWorklistSearch("");
                        setWorklistStatusFilter("all");
                        setWorklistDatePreset("today");
                        setWorklistCustomDate("");
                        setCurrentPage(1);
                        fetchWorklistByDate("today", "");
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      <X className="h-3 w-3" />
                      <span>Reset Filter</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Main Worklist Body (Comfortable Cards vs Compact Table Grid) */}
            {filteredWorklist.length === 0 ? (
              worklist.length === 0 ? (
                <div className="p-8 sm:p-12 text-center border-2 border-dashed border-teal-200 rounded-2xl bg-teal-50/30 space-y-4 animate-in fade-in duration-200">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-teal-100/70 border border-teal-200 flex items-center justify-center text-teal-700">
                    <Users className="h-8 w-8" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1.5">
                    <h4 className="text-base font-extrabold text-slate-900">
                      Belum Ada Antrean Pasien Hari Ini
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Mulai operasional pelayanan dengan mendaftarkan pasien baru, mencari data pasien lama di database RM, atau muat data simulasi demo.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1.5">
                    <Button
                      onClick={() => setActiveTab("new")}
                      className="h-9 px-3.5 text-xs font-semibold gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-2xs cursor-pointer active:scale-[0.98] transition-all"
                    >
                      <UserPlus className="h-3.5 w-3.5 shrink-0" />
                      <span>Daftarkan Pasien Baru</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("returning")}
                      className="h-9 px-3.5 text-xs font-semibold gap-2 rounded-lg bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-800 shadow-2xs cursor-pointer active:scale-[0.98] transition-all"
                    >
                      <Search className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                      <span>Cari Pasien Lama</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/queue");
                          if (res.ok) {
                            const json = await res.json();
                            if (json.success && Array.isArray(json.data)) {
                              setWorklist(json.data);
                              toast.success("Antrean pasien berhasil disinkronkan dari database!");
                            }
                          }
                        } catch {
                          toast.error("Gagal menyinkronkan antrean dari database.");
                        }
                      }}
                      className="h-9 px-3.5 text-xs font-semibold gap-2 rounded-lg bg-white border-dashed border-teal-300 text-teal-800 hover:bg-teal-50 hover:border-teal-400 shadow-2xs cursor-pointer active:scale-[0.98] transition-all"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                      <span>Sinkronkan Antrean Database</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-2xl bg-slate-50/50 space-y-2">
                  <Users className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Tidak ada data pasien yang sesuai filter.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setWorklistDepartmentFilter("all");
                      setTriageFilter("all");
                      setWorklistSearch("");
                      setWorklistStatusFilter("all");
                    }}
                    className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
                  >
                    Kembalikan Tampilan Awal (Reset Filter)
                  </button>
                </div>
              )
            ) : viewMode === "compact" ? (
              /* COMPACT DATA GRID TABLE (BALANCED & PERFECT FIT) */
              <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/90 text-slate-700 font-extrabold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                        <th className="py-2.5 px-3 w-[85px]">No. & Masuk</th>
                        <th className="py-2.5 px-3 min-w-[160px]">Pasien & Keluhan</th>
                        <th className="py-2.5 px-3 min-w-[130px]">Poli & DPJP</th>
                        <th className="py-2.5 px-2.5 w-[75px] text-center">Triase</th>
                        <th className="py-2.5 px-2.5 w-[85px] text-center">Status</th>
                        <th className="py-2.5 px-3 w-[150px] text-right">Aksi Layanan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedWorklist.map((item) => {
                        const isCurrentActive = item.patient.id === currentPatient.id;
                        const isInProgress = item.status === "in-progress";
                        const fifoRank = getFifoRank(item.id);
                        return (
                          <tr
                            key={item.id}
                            className={`transition-colors ${
                              isInProgress
                                ? "bg-blue-50/70 border-l-4 border-l-blue-600 font-medium hover:bg-blue-100/50"
                                : isCurrentActive
                                ? "bg-teal-50/50 border-l-4 border-l-teal-600 hover:bg-teal-100/50"
                                : "hover:bg-slate-50/80"
                            }`}
                          >
                            {/* Queue & FIFO */}
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5">
                                <div
                                  className={`h-6 px-1.5 min-w-[42px] rounded flex items-center justify-center font-mono font-extrabold text-[10px] text-white shadow-2xs shrink-0 whitespace-nowrap ${
                                    item.status === "finished"
                                      ? "bg-emerald-600"
                                      : item.status === "in-progress"
                                      ? "bg-blue-600 animate-pulse"
                                      : "bg-amber-500"
                                  }`}
                                >
                                  {item.queueNumber}
                                </div>
                                <div className="text-[10px] leading-tight">
                                  <div className="font-extrabold text-teal-800 font-mono">#{fifoRank}</div>
                                  <div className="text-slate-400 font-mono text-[9px]">{item.arrivalTime.replace(" WIB", "")}</div>
                                </div>
                              </div>
                            </td>

                            {/* Patient Info & Chief Complaint */}
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5">
                                <div className="font-bold text-slate-900 text-[11px] truncate max-w-[170px]" title={item.patient.name}>
                                  {item.patient.name}
                                </div>
                                {isCurrentActive && (
                                  <span className="px-1 py-0.2 rounded-xs bg-teal-700 text-white font-extrabold text-[8px] shrink-0">
                                    Aktif
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-mono mt-0.5 min-w-0">
                                <span className="whitespace-nowrap shrink-0">{item.patient.mrn}</span>
                                <span className="text-slate-300 shrink-0">•</span>
                                <span className="font-sans italic text-slate-500 truncate max-w-[140px]" title={item.chiefComplaint}>
                                  "{item.chiefComplaint}"
                                </span>
                              </div>
                            </td>

                            {/* Department & Doctor */}
                            <td className="py-2 px-3">
                              <div className="font-bold text-slate-800 text-[11px] truncate max-w-[130px]">
                                {item.department.replace("Poli ", "")}
                              </div>
                              <div className="text-[9px] text-slate-500 truncate max-w-[130px]">
                                {item.doctor}
                              </div>
                            </td>

                            {/* Triage Badge */}
                            <td className="py-2 px-2.5 text-center">
                              {item.triagePriority === "urgent" && (
                                <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-extrabold bg-red-100 text-red-800 border border-red-200">
                                  CITO
                                </span>
                              )}
                              {item.triagePriority === "geriatric" && (
                                <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                                  Lansia
                                </span>
                              )}
                              {item.triagePriority === "pediatric" && (
                                <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                                  Anak
                                </span>
                              )}
                              {(!item.triagePriority || item.triagePriority === "regular") && (
                                <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                  Reguler
                                </span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-2 px-2.5 text-center">
                              {item.status === "in-progress" && (
                                <span className="inline-flex items-center justify-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-800 border border-blue-200">
                                  <Activity className="h-2.5 w-2.5 text-blue-600" />
                                  Diperiksa
                                </span>
                              )}
                              {item.status === "finished" && (
                                <span className="inline-flex items-center justify-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                                  Selesai
                                </span>
                              )}
                              {item.status === "arrived" && (
                                <span className="inline-flex items-center justify-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-900 border border-amber-200">
                                  <Clock className="h-2.5 w-2.5 text-amber-700" />
                                  Menunggu
                                </span>
                              )}
                            </td>

                            {/* Quick Actions (Compact & Never Clipped) */}
                            <td className="py-2 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {/* Cetak Karcis Antrean */}
                                {onOpenQueueTicket && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onSelectPatient(item.patient);
                                      onOpenQueueTicket();
                                    }}
                                    className="h-6.5 w-6.5 rounded text-amber-800 hover:text-amber-900 bg-white hover:bg-amber-50 border border-amber-200 hover:border-amber-400 font-bold flex items-center justify-center shadow-2xs cursor-pointer btn-press transition-all duration-150 shrink-0"
                                    title="Cetak Karcis Antrean Thermal"
                                  >
                                    <Ticket className="h-3 w-3 text-amber-600" />
                                  </button>
                                )}

                                {/* Panggil */}
                                <button
                                  type="button"
                                  onClick={() => handleCallPatient(item)}
                                  className={`h-6.5 px-1.5 min-w-[26px] rounded font-bold flex items-center justify-center shadow-2xs cursor-pointer btn-press transition-all duration-150 shrink-0 ${
                                    callingItemId === item.id
                                      ? "bg-teal-600 text-white border border-teal-700 ring-2 ring-teal-300/40"
                                      : "text-teal-800 hover:text-teal-900 bg-white hover:bg-teal-50 border border-teal-200 hover:border-teal-400"
                                  }`}
                                  title="Panggil nomor antrean"
                                >
                                  {callingItemId === item.id ? (
                                    <div className="audio-wave-wrap text-white">
                                      <span className="audio-wave-bar-1"></span>
                                      <span className="audio-wave-bar-2"></span>
                                      <span className="audio-wave-bar-3"></span>
                                    </div>
                                  ) : (
                                    <Volume2 className="h-3 w-3 text-teal-600" />
                                  )}
                                </button>

                                {/* Buka RME */}
                                <button
                                  type="button"
                                  disabled={transitioningItemId === item.id}
                                  onClick={() => handleOpenPatientHistory(item.patient, item.id)}
                                  className={`h-6.5 px-2 rounded text-[10px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer btn-press transition-all duration-150 shrink-0 disabled:opacity-75 disabled:pointer-events-none ${
                                    isCurrentActive
                                      ? "bg-teal-700 text-white border border-teal-800 shadow-xs"
                                      : "bg-white text-slate-800 hover:bg-slate-100 border border-slate-300"
                                  }`}
                                  title="Buka Resume Medis & Riwayat Pasien"
                                >
                                  {transitioningItemId === item.id ? (
                                    <Loader2 className="h-2.5 w-2.5 animate-spin text-teal-600" />
                                  ) : (
                                    <FileText className={`h-2.5 w-2.5 ${isCurrentActive ? "text-white" : "text-teal-600"}`} />
                                  )}
                                  <span>RME</span>
                                </button>

                                {/* Status Transition */}
                                {item.status === "arrived" && (
                                  <button
                                    type="button"
                                    disabled={transitioningItemId === item.id}
                                    onClick={() => handleUpdateStatus(item.id, "in-progress")}
                                    className="h-6.5 px-2 rounded text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-2xs border border-blue-700 flex items-center gap-1 cursor-pointer btn-press transition-all duration-150 shrink-0 disabled:opacity-75 disabled:pointer-events-none"
                                    title="Mulai Pemeriksaan Dokter"
                                  >
                                    {transitioningItemId === item.id ? (
                                      <Loader2 className="h-2.5 w-2.5 text-white animate-spin" />
                                    ) : (
                                      <Activity className="h-2.5 w-2.5" />
                                    )}
                                    <span>Periksa</span>
                                  </button>
                                )}

                                {item.status === "in-progress" && (
                                  <button
                                    type="button"
                                    disabled={transitioningItemId === item.id}
                                    onClick={() => handleUpdateStatus(item.id, "finished")}
                                    className="h-6.5 px-2 rounded text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs border border-emerald-700 flex items-center gap-1 cursor-pointer btn-press transition-all duration-150 shrink-0 disabled:opacity-75 disabled:pointer-events-none"
                                    title="Selesaikan Konsultasi"
                                  >
                                    {transitioningItemId === item.id ? (
                                      <Loader2 className="h-2.5 w-2.5 text-white animate-spin" />
                                    ) : (
                                      <Check className="h-2.5 w-2.5" />
                                    )}
                                    <span>Selesai</span>
                                  </button>
                                )}

                                {item.status === "finished" && (
                                  <button
                                    type="button"
                                    disabled={transitioningItemId === item.id}
                                    onClick={() => handleUpdateStatus(item.id, "in-progress")}
                                    className="h-6.5 px-2 rounded text-[10px] font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 shadow-2xs flex items-center gap-1 cursor-pointer btn-press transition-all duration-150 shrink-0 disabled:opacity-75 disabled:pointer-events-none"
                                    title="Buka kembali konsultasi pasien untuk addendum atau perbaikan data"
                                  >
                                    {transitioningItemId === item.id ? (
                                      <Loader2 className="h-2.5 w-2.5 text-slate-700 animate-spin" />
                                    ) : (
                                      <RotateCcw className="h-2.5 w-2.5 text-slate-600" />
                                    )}
                                    <span>Buka Kembali</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* COMFORTABLE CARDS VIEW (WITH TRIAGE TAGS & HIGH CLARITY) */
              <div className="space-y-3 pt-1">
                {paginatedWorklist.map((item) => {
                  const isCurrentActive = item.patient.id === currentPatient.id;
                  const isInProgress = item.status === "in-progress";
                  const fifoRank = getFifoRank(item.id);
                  const isCallingThis = callingItemId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border card-interactive transition-all duration-200 ${
                        isInProgress && isCurrentActive
                          ? "bg-gradient-to-r from-blue-50/90 to-teal-50/80 border-blue-400 shadow-md ring-2 ring-blue-500/30"
                          : isInProgress
                          ? "bg-blue-50/70 border-blue-300 hover:border-blue-400 shadow-sm ring-2 ring-blue-500/25"
                          : isCurrentActive
                          ? "bg-teal-50/70 border-teal-400 shadow-sm ring-2 ring-teal-500/20"
                          : "bg-white border-slate-200 hover:border-teal-300 shadow-xs"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Left Info */}
                        <div className="flex items-start gap-3.5 min-w-0">
                          {/* Queue Badge Box */}
                          <div
                            className={`h-12 w-14 rounded-xl flex flex-col items-center justify-center font-mono font-extrabold shadow-xs shrink-0 text-white transition-transform duration-200 hover:scale-105 ${
                              item.status === "finished"
                                ? "bg-emerald-600"
                                : item.status === "in-progress"
                                ? "bg-blue-600 ring-2 ring-blue-400/50"
                                : "bg-amber-500"
                            }`}
                          >
                            <span className="text-xs leading-none">{item.queueNumber}</span>
                            <span className="text-[8px] font-sans font-bold mt-1 uppercase tracking-wider opacity-95">
                              {item.status === "finished" ? "Selesai" : item.status === "in-progress" ? "Diperiksa" : "Antre"}
                            </span>
                          </div>

                          <div className="space-y-1.5 min-w-0 flex-1">
                            {/* Row 1: Header (Patient Name, Age/Gender, Active Badge, Triage, SATUSEHAT Sync Status) */}
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <h3 className="font-extrabold text-sm text-slate-900 truncate">
                                  {item.patient.name}
                                </h3>
                                <span className="text-xs font-semibold text-slate-500 shrink-0">
                                  ({new Date().getFullYear() - new Date(item.patient.birthDate).getFullYear()} Thn / {item.patient.gender === "male" ? "L" : "P"})
                                </span>
                                {isCurrentActive && (
                                  <span className="bg-teal-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-2xs shrink-0">
                                    RME Terpilih
                                  </span>
                                )}
                              </div>

                              {/* Live Examination Status Indicator (only shown for in-progress; finished & arrived are anchored on the left queue box) */}
                              {item.status === "in-progress" && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-300 shadow-2xs">
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                                  </span>
                                  <span>Sedang Diperiksa</span>
                                </span>
                              )}

                              {/* Triage Badge */}
                              {item.triagePriority === "urgent" && (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-100 text-red-900 border border-red-300 text-[10px] font-extrabold shadow-2xs animate-pulse-subtle">
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                                  </span>
                                  <span>CITO</span>
                                </span>
                              )}
                              {item.triagePriority === "geriatric" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-bold shadow-2xs transition-transform duration-150 hover:scale-105">
                                  🟣 GERIATRI
                                </span>
                              )}
                              {item.triagePriority === "pediatric" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 text-sky-900 border border-sky-300 text-[10px] font-bold shadow-2xs transition-transform duration-150 hover:scale-105">
                                  🔵 PEDIATRI
                                </span>
                              )}

                              {/* SATUSEHAT Sync Status Badge */}
                              {item.satusehatStatus === "synced" && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200 shadow-2xs">
                                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                  <span>SATUSEHAT Terkirim</span>
                                </span>
                              )}
                              {item.satusehatConsent === "opt-out" && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200 shadow-2xs">
                                  <Lock className="h-3 w-3 text-slate-500" />
                                  <span>Opt-Out</span>
                                </span>
                              )}
                              {item.satusehatStatus !== "synced" && item.satusehatConsent !== "opt-out" && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200 shadow-2xs">
                                  <Clock className="h-3 w-3 text-amber-600" />
                                  <span>SATUSEHAT: Draft</span>
                                </span>
                              )}
                            </div>

                            {/* Row 2: Structured Clinical & RM Metadata */}
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              {/* No RM Chip */}
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-mono text-[11px] font-bold shrink-0">
                                <span className="text-slate-400 font-normal">No. RM</span>
                                <span>{item.patient.mrn.replace(/^RM-?/i, "")}</span>
                              </div>

                              {/* Clinic & Room Chip */}
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-900 border border-teal-200 text-[11px] font-semibold shrink-0">
                                <Building2 className="h-3 w-3 text-teal-600 shrink-0" />
                                <span>{item.department}</span>
                                <span className="text-teal-700 font-normal font-mono">({item.room})</span>
                              </div>

                              {/* DPJP Chip */}
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200 text-[11px] shrink-0">
                                <Stethoscope className="h-3 w-3 text-teal-600 shrink-0" />
                                <span className="font-semibold text-slate-800">{item.doctor}</span>
                              </div>

                              {/* Arrival Time Chip */}
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-mono shrink-0">
                                <Clock className="h-3 w-3 text-slate-400" />
                                <span>Masuk: {item.arrivalTime}</span>
                              </div>
                            </div>

                            {/* Row 3: Chief Complaint Highlight Box */}
                            <div className="rounded-lg bg-slate-50/80 border border-slate-200/80 px-2.5 py-1.5 text-xs text-slate-700 flex items-start gap-1.5">
                              <span className="font-bold text-slate-500 shrink-0 text-[11px]">Keluhan:</span>
                              <span className="italic text-slate-800 line-clamp-2 text-[11px] leading-relaxed">&quot;{item.chiefComplaint}&quot;</span>
                            </div>
                          </div>
                        </div>

                        {/* Right Action Matrix (Clean Context-Aware Actions) */}
                        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap self-stretch md:self-center justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                          {/* Cetak Karcis (Only for active / waiting queue, hidden on finished to prevent clutter) */}
                          {onOpenQueueTicket && item.status !== "finished" && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectPatient(item.patient);
                                onOpenQueueTicket();
                              }}
                              className="inline-flex items-center justify-center gap-1.5 h-9 px-2.5 rounded-lg text-xs font-bold text-amber-800 bg-white hover:bg-amber-50 border border-amber-200 hover:border-amber-400 shadow-2xs transition-all duration-150 active:scale-95 shrink-0 cursor-pointer btn-press"
                              title="Cetak Karcis Antrean Thermal"
                            >
                              <Ticket className="h-4 w-4 text-amber-600 shrink-0" />
                              <span className="hidden lg:inline">Karcis</span>
                            </button>
                          )}

                          {/* 1. Context: STATUS MENUNGGU (ARRIVED) */}
                          {item.status === "arrived" && (
                            <>
                              {/* Audio Panggil */}
                              <button
                                type="button"
                                onClick={() => handleCallPatient(item)}
                                className={`inline-flex items-center justify-center gap-1.5 h-9 min-w-[95px] px-3 rounded-lg text-xs font-bold shadow-2xs btn-press transition-all duration-150 shrink-0 cursor-pointer ${
                                  isCallingThis
                                    ? "bg-teal-600 text-white border-2 border-teal-700 ring-2 ring-teal-300/40"
                                    : "text-teal-800 bg-white hover:bg-teal-50 border border-teal-300 hover:border-teal-400"
                                }`}
                                title="Panggil nomor antrean dengan suara"
                              >
                                {isCallingThis ? (
                                  <>
                                    <div className="audio-wave-wrap text-white">
                                      <span className="audio-wave-bar-1"></span>
                                      <span className="audio-wave-bar-2"></span>
                                      <span className="audio-wave-bar-3"></span>
                                    </div>
                                    <span>Panggil...</span>
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="h-4 w-4 text-teal-600 shrink-0" />
                                    <span>Panggil</span>
                                  </>
                                )}
                              </button>

                              {/* Mulai Periksa */}
                              <button
                                type="button"
                                disabled={transitioningItemId === item.id}
                                onClick={() => handleUpdateStatus(item.id, "in-progress")}
                                className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-2xs border border-blue-700 btn-press transition-all duration-150 shrink-0 cursor-pointer disabled:opacity-75 disabled:pointer-events-none"
                                title="Pindahkan status pasien menjadi Sedang Diperiksa DPJP"
                              >
                                {transitioningItemId === item.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 shrink-0 text-white animate-spin" />
                                    <span>Membuka...</span>
                                  </>
                                ) : (
                                  <>
                                    <Activity className="h-4 w-4 shrink-0" />
                                    <span>Mulai Periksa</span>
                                  </>
                                )}
                              </button>
                            </>
                          )}

                          {/* 2. Context: STATUS SEDANG DIPERIKSA (IN-PROGRESS) */}
                          {item.status === "in-progress" && (
                            <>
                              {/* Buka SOAP DPJP */}
                              <button
                                type="button"
                                disabled={transitioningItemId === item.id}
                                onClick={() => handleOpenSoapEntry(item.patient, item.id)}
                                className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold shadow-2xs btn-press transition-all duration-150 shrink-0 cursor-pointer bg-teal-700 text-white hover:bg-teal-800 border border-teal-800 disabled:opacity-75 disabled:pointer-events-none"
                                title="Buka Formulir SOAP DPJP Pasien"
                              >
                                {transitioningItemId === item.id ? (
                                  <Loader2 className="h-4 w-4 shrink-0 text-white animate-spin" />
                                ) : (
                                  <FileText className="h-4 w-4 shrink-0 text-white" />
                                )}
                                <span>Input SOAP</span>
                              </button>

                              {/* Selesaikan */}
                              <button
                                type="button"
                                disabled={transitioningItemId === item.id}
                                onClick={() => handleUpdateStatus(item.id, "finished")}
                                className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs border border-emerald-700 btn-press transition-all duration-150 shrink-0 cursor-pointer disabled:opacity-75 disabled:pointer-events-none"
                                title="Selesaikan konsultasi dan finalisasi resume medis"
                              >
                                {transitioningItemId === item.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 shrink-0 text-white animate-spin" />
                                    <span>Menyimpan...</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-4 w-4 shrink-0" />
                                    <span>Selesaikan</span>
                                  </>
                                )}
                              </button>
                            </>
                          )}

                          {/* 3. Context: STATUS SELESAI (FINISHED) */}
                          {item.status === "finished" && (
                            <>
                              {/* Primary Action: Buka Resume Medis */}
                              <button
                                type="button"
                                disabled={transitioningItemId === item.id}
                                onClick={() => handleOpenPatientHistory(item.patient, item.id)}
                                className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-bold shadow-2xs btn-press transition-all duration-150 shrink-0 cursor-pointer bg-teal-800 text-white hover:bg-teal-900 border border-teal-900 disabled:opacity-75 disabled:pointer-events-none"
                                title="Lihat Berkas Resume Medis & Riwayat Pasien"
                              >
                                {transitioningItemId === item.id ? (
                                  <Loader2 className="h-4 w-4 shrink-0 text-teal-200 animate-spin" />
                                ) : (
                                  <FileText className="h-4 w-4 shrink-0 text-teal-200" />
                                )}
                                <span>Buka Resume Medis</span>
                              </button>

                              {/* Secondary Action: Revisi Pelayanan */}
                              <button
                                type="button"
                                disabled={transitioningItemId === item.id}
                                onClick={() => handleUpdateStatus(item.id, "in-progress")}
                                className="inline-flex items-center justify-center gap-1.5 h-9 px-2.5 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-2xs btn-press transition-all duration-150 shrink-0 cursor-pointer disabled:opacity-75 disabled:pointer-events-none"
                                title="Buka kembali konsultasi pasien untuk addendum atau perbaikan data"
                              >
                                {transitioningItemId === item.id ? (
                                  <Loader2 className="h-3.5 w-3.5 shrink-0 text-slate-600 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                                )}
                                <span>Buka Kembali</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 5. Smart Pagination Bar */}
            {filteredWorklist.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                <div className="text-slate-500 text-[11px]">
                  Menampilkan{" "}
                  <strong className="text-slate-900">
                    {(safeCurrentPage - 1) * pageSize + 1}
                  </strong>{" "}
                  -{" "}
                  <strong className="text-slate-900">
                    {Math.min(safeCurrentPage * pageSize, filteredWorklist.length)}
                  </strong>{" "}
                  dari <strong className="text-slate-900">{filteredWorklist.length}</strong> total pasien
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-2xs cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    <span>Sebelumnya</span>
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setCurrentPage(num)}
                        className={`h-8 w-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          safeCurrentPage === num
                            ? "bg-teal-700 text-white shadow-xs"
                            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-2xs cursor-pointer"
                  >
                    <span>Berikutnya</span>
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: CARI PASIEN LAMA & RIWAYAT TERAKHIR */}
        {activeTab === "returning" && (
          <div className="space-y-4">
            {/* 1. Quick Filter Pills Bar with Comprehensive Historical Date Options */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 p-1.5 bg-slate-100 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="flex flex-wrap items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setReturningVisitFilter("all");
                    setReturningCustomDate("");
                    setReturningPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
                    returningVisitFilter === "all"
                      ? "bg-white text-teal-950 shadow-xs border border-slate-200/90 font-extrabold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50 font-medium"
                  }`}
                >
                  <Users
                    className={`h-3.5 w-3.5 transition-colors ${
                      returningVisitFilter === "all" ? "text-teal-600" : "text-slate-400"
                    }`}
                  />
                  <span>Semua Pasien ({patientsList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReturningVisitFilter("today");
                    setReturningCustomDate("");
                    setReturningPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
                    returningVisitFilter === "today"
                      ? "bg-white text-teal-950 shadow-xs border border-teal-400 ring-1 ring-teal-500/20 font-extrabold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50 font-medium"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Hari Ini</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReturningVisitFilter("last-7");
                    setReturningCustomDate("");
                    setReturningPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
                    returningVisitFilter === "last-7"
                      ? "bg-white text-teal-950 shadow-xs border border-slate-200/90 font-extrabold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50 font-medium"
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5 text-teal-600" />
                  <span>7 Hari</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReturningVisitFilter("last-30");
                    setReturningCustomDate("");
                    setReturningPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
                    returningVisitFilter === "last-30"
                      ? "bg-white text-teal-950 shadow-xs border border-slate-200/90 font-extrabold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50 font-medium"
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5 text-blue-600" />
                  <span>30 Hari</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReturningVisitFilter("older-30");
                    setReturningCustomDate("");
                    setReturningPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
                    returningVisitFilter === "older-30"
                      ? "bg-white text-teal-950 shadow-xs border border-slate-200/90 font-extrabold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50 font-medium"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5 text-purple-600" />
                  <span>&gt; 30 Hari</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReturningVisitFilter("no-history");
                    setReturningCustomDate("");
                    setReturningPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
                    returningVisitFilter === "no-history"
                      ? "bg-white text-teal-950 shadow-xs border border-slate-200/90 font-extrabold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50 font-medium"
                  }`}
                >
                  <UserCheck
                    className={`h-3.5 w-3.5 transition-colors ${
                      returningVisitFilter === "no-history" ? "text-slate-700" : "text-slate-400"
                    }`}
                  />
                  <span>0 Kunjungan</span>
                </button>

                {/* Inline Custom Date Picker */}
                <CustomDatePicker
                  value={returningVisitFilter === "custom" ? returningCustomDate : ""}
                  onChange={(dateVal) => {
                    if (dateVal) {
                      setReturningVisitFilter("custom");
                      setReturningCustomDate(dateVal);
                    } else {
                      setReturningVisitFilter("all");
                      setReturningCustomDate("");
                    }
                    setReturningPage(1);
                  }}
                  size="sm"
                  align="left"
                  isActive={returningVisitFilter === "custom" && Boolean(returningCustomDate)}
                  placeholder="Pilih Tanggal..."
                  prefixLabel={returningVisitFilter === "custom" ? "Kunjungan:" : undefined}
                  buttonClassName={`h-[30px] px-2.5 py-1 text-xs rounded-lg transition-all border ${
                    returningVisitFilter === "custom" && Boolean(returningCustomDate)
                      ? "bg-teal-700 text-white border-teal-800 shadow-xs ring-1 ring-teal-500/30 font-extrabold"
                      : "bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 border-slate-200/80 font-medium"
                  }`}
                />
              </div>
            </div>

            {/* 2. Unified Search & Filter Control Card (Rock-Solid 2-Row Layout) */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
              {/* ROW 1: Full-Width Search Bar + View Mode Switcher + Rows Selector */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {/* Search Input (Expands to fill available width) */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Cari Pasien (Nama, NIK 16 digit, No. RM, Dokter DPJP, Diagnosis, ID SATUSEHAT)..."
                    value={returningSearch}
                    onChange={(e) => {
                      setReturningSearch(e.target.value);
                      setReturningPage(1);
                    }}
                    className="w-full pl-10 pr-9 h-10 text-xs bg-slate-50/70 border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-500 rounded-xl transition-all"
                  />
                  {returningSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setReturningSearch("");
                        setReturningPage(1);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Right controls on Row 1 (Kartu/Tabel Toggle & Rows Selector) */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* View Mode Toggle (Segmented Pill Switcher) */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/90 h-10 shadow-2xs gap-0.5">
                    <button
                      type="button"
                      onClick={() => setReturningViewMode("cards")}
                      className={`h-8 px-3 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                        returningViewMode === "cards"
                          ? "bg-white text-teal-950 font-bold shadow-xs border border-slate-200/90"
                          : "text-slate-500 hover:text-slate-800 hover:bg-white/50 font-medium"
                      }`}
                      title="Tampilan Kartu Pasien Lengkap"
                    >
                      <LayoutGrid
                        className={`h-3.5 w-3.5 transition-colors ${
                          returningViewMode === "cards" ? "text-teal-600" : "text-slate-400"
                        }`}
                      />
                      <span>Kartu</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReturningViewMode("table")}
                      className={`h-8 px-3 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                        returningViewMode === "table"
                          ? "bg-white text-teal-950 font-bold shadow-xs border border-slate-200/90"
                          : "text-slate-500 hover:text-slate-800 hover:bg-white/50 font-medium"
                      }`}
                      title="Tampilan Tabel Ringkas"
                    >
                      <Table
                        className={`h-3.5 w-3.5 transition-colors ${
                          returningViewMode === "table" ? "text-teal-600" : "text-slate-400"
                        }`}
                      />
                      <span>Tabel</span>
                    </button>
                  </div>

                  {/* Rows Selector with CustomSelect */}
                  <CustomSelect<number>
                    value={returningPageSize}
                    onChange={(val) => {
                      setReturningPageSize(val);
                      setReturningPage(1);
                    }}
                    prefixLabel="Baris:"
                    size="md"
                    className="shrink-0"
                    buttonClassName="h-10 text-xs bg-slate-50/70 hover:bg-white border-slate-200 rounded-xl px-2.5"
                    align="right"
                    options={[
                      { value: 6, label: "6" },
                      { value: 12, label: "12" },
                      { value: 24, label: "24" },
                    ]}
                  />
                </div>
              </div>

              {/* ROW 2: Balanced 3-Column Dropdown Filter Grid (Poli, Usia, Urutan) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2.5 border-t border-slate-100">
                {/* 1. Poli Dropdown */}
                <div className="w-full">
                  <CustomSelect
                    value={returningDeptFilter}
                    onChange={(val) => {
                      setReturningDeptFilter(val);
                      setReturningPage(1);
                    }}
                    prefixIcon={<Building2 className="h-3.5 w-3.5 text-teal-600" />}
                    prefixLabel="Poli:"
                    size="md"
                    className="w-full"
                    buttonClassName="w-full h-9.5 text-xs bg-slate-50/70 hover:bg-white border-slate-200 justify-between rounded-lg"
                    options={[
                      { value: "all", label: "Semua Poliklinik" },
                      { value: "Poli Penyakit Dalam", label: "Poli Penyakit Dalam" },
                      { value: "Poli Umum", label: "Poli Umum" },
                      { value: "Poli Anak (Pediatri)", label: "Poli Anak (Pediatri)" },
                      { value: "Poli Jantung & Pembuluh Darah", label: "Poli Jantung & Pembuluh Darah" },
                      { value: "Poli Mata", label: "Poli Mata" },
                      { value: "Poli Gigi & Mulut", label: "Poli Gigi & Mulut" },
                    ]}
                  />
                </div>

                {/* 2. Usia Dropdown */}
                <div className="w-full">
                  <CustomSelect
                    value={returningAgeFilter}
                    onChange={(val) => {
                      setReturningAgeFilter(val as any);
                      setReturningPage(1);
                    }}
                    prefixIcon={<Users className="h-3.5 w-3.5 text-teal-600" />}
                    prefixLabel="Usia:"
                    size="md"
                    className="w-full"
                    buttonClassName="w-full h-9.5 text-xs bg-slate-50/70 hover:bg-white border-slate-200 justify-between rounded-lg"
                    options={[
                      { value: "all", label: "Semua Kategori Usia" },
                      { value: "pediatric", label: "Anak / Pediatri (< 18 Thn)" },
                      { value: "adult", label: "Dewasa (18 - 59 Thn)" },
                      { value: "geriatric", label: "Geriatri / Lansia (≥ 60 Thn)" },
                    ]}
                  />
                </div>

                {/* 3. Urutan Dropdown */}
                <div className="w-full">
                  <CustomSelect
                    value={returningSortBy}
                    onChange={(val) => {
                      setReturningSortBy(val as any);
                      setReturningPage(1);
                    }}
                    prefixIcon={<ArrowUpDown className="h-3.5 w-3.5 text-teal-600" />}
                    prefixLabel="Urutan:"
                    size="md"
                    className="w-full"
                    buttonClassName="w-full h-9.5 text-xs bg-slate-50/70 hover:bg-white border-slate-200 justify-between rounded-lg"
                    options={[
                      { value: "recent-visit", label: "Kunjungan Terbaru" },
                      { value: "name-asc", label: "Nama Pasien (A - Z)" },
                      { value: "name-desc", label: "Nama Pasien (Z - A)" },
                      { value: "mrn-asc", label: "No. Rekam Medis (RM)" },
                      { value: "visits-count", label: "Total Kunjungan Terbanyak" },
                    ]}
                  />
                </div>
              </div>

              {/* Active Filters Summary Strip & Reset Button */}
              {(returningSearch || returningDeptFilter !== "all" || returningAgeFilter !== "all" || returningSortBy !== "recent-visit" || returningVisitFilter !== "all" || returningCustomDate) && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                    <span className="font-bold text-slate-700">Filter Aktif:</span>
                    {returningVisitFilter !== "all" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 font-medium">
                        Kunjungan: {returningVisitFilter === "today" ? "Hari Ini" : returningVisitFilter === "last-7" ? "7 Hari Terakhir" : returningVisitFilter === "last-30" ? "30 Hari Terakhir" : returningVisitFilter === "older-30" ? "Kunjungan Lampau (> 30 Hari)" : returningVisitFilter === "has-history" ? "Ada Riwayat" : returningVisitFilter === "no-history" ? "Pasien Baru (0 Kunjungan)" : returningCustomDate || "Custom"}
                      </span>
                    )}
                    {returningSearch && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-medium">
                        Cari: &quot;{returningSearch}&quot;
                      </span>
                    )}
                    {returningDeptFilter !== "all" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-medium">
                        Poli: {returningDeptFilter}
                      </span>
                    )}
                    {returningAgeFilter !== "all" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-medium">
                        Usia: {returningAgeFilter === "pediatric" ? "Anak" : returningAgeFilter === "adult" ? "Dewasa" : "Geriatri"}
                      </span>
                    )}
                    {returningSortBy !== "recent-visit" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-medium">
                        Urutan: {returningSortBy === "name-asc" ? "Nama A-Z" : returningSortBy === "name-desc" ? "Nama Z-A" : returningSortBy === "mrn-asc" ? "No. RM" : "Kunjungan Terbanyak"}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setReturningSearch("");
                      setReturningVisitFilter("all");
                      setReturningCustomDate("");
                      setReturningDeptFilter("all");
                      setReturningAgeFilter("all");
                      setReturningSortBy("recent-visit");
                      setReturningPage(1);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md border border-red-200 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset Filter</span>
                  </button>
                </div>
              )}
            </div>

            {/* 3. Header Summary */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 uppercase tracking-wider">
                  Daftar Pasien Terdaftar ({processedReturningPatients.length})
                </span>
                <span className="text-[11px] text-slate-500">
                  (Total {patientsList.length} Pasien Terdaftar di RS)
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                Klik kartu untuk memilih pasien aktif atau langsung daftarkan kunjungan poliklinik
              </span>
            </div>

            {/* 4. Empty State */}
            {processedReturningPatients.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
                <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Users className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-slate-800">
                    Tidak Ditemukan Data Pasien
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Tidak ada pasien yang sesuai dengan kata kunci atau kombinasi filter yang Anda pilih. Silakan ubah filter atau daftarkan sebagai pasien baru.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReturningSearch("");
                      setReturningVisitFilter("all");
                      setReturningDeptFilter("all");
                      setReturningAgeFilter("all");
                      setReturningSortBy("recent-visit");
                      setReturningPage(1);
                    }}
                    className="text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    <span>Reset Filter Pencarian</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab("new")}
                    className="text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    <span>Daftarkan Pasien Baru</span>
                  </Button>
                </div>
              </div>
            ) : returningViewMode === "cards" ? (
              /* 5A. CARDS VIEW (COMFORTABLE WITH LAST VISIT TELEMETRY) */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedReturningPatients.map((p) => {
                  const isCurrentActive = p.id === currentPatient.id;
                  const birthYear = new Date(p.birthDate).getFullYear();
                  const currentYear = new Date().getFullYear();
                  const age = currentYear - birthYear;
                  const initials = p.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("");

                  // Check if patient has live queue today
                  const todayQueue = worklist.find((w) => w.patient.id === p.id);
                  const lastVisitRel = formatRelativeVisit(p.lastVisitDate);

                  return (
                    <div
                      key={p.id}
                      className={`rounded-2xl border transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between gap-3.5 relative group cursor-pointer ${
                        isCurrentActive
                          ? "bg-teal-50/70 border-teal-500 shadow-sm ring-2 ring-teal-500/20"
                          : "bg-white border-slate-200 hover:border-teal-400 hover:shadow-md hover:bg-teal-50/15"
                      }`}
                      onClick={() => {
                        onSelectPatient(p);
                        toast.info(`Pasien ${p.name} dipilih sebagai pasien aktif.`);
                      }}
                    >
                      {/* Top Row: Avatar + Identity + Demographic Badges */}
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white font-extrabold text-sm shadow-xs group-hover:bg-teal-700 transition-colors">
                          {initials}
                          <div
                            className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white"
                            title="SATUSEHAT Terverifikasi"
                          >
                            <ShieldCheck className="h-2.5 w-2.5" />
                          </div>
                        </div>

                        <div className="min-w-0 space-y-1 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 justify-between">
                            <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-teal-950 truncate">
                              {p.name}
                            </h4>
                            {isCurrentActive && (
                              <span className="bg-teal-700 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-2xs">
                                PASIEN AKTIF
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-[11px]">
                              {age} Thn ({p.gender === "male" ? "L" : "P"})
                            </span>

                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 font-bold font-mono text-[10px]">
                              Gol. {p.bloodType}+
                            </span>

                            {p.paymentPayer && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[10px]">
                                {p.paymentPayer.split(" (")[0]}
                              </span>
                            )}

                            {p.allergies && p.allergies.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[10px]">
                                <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                                <span className="truncate max-w-[120px]">Alergi: {p.allergies[0].split(" (")[0]}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Identifier Chips & Address */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-900 border border-slate-300 font-mono text-[11px] font-bold">
                          <span className="text-slate-500 font-normal">RM:</span>
                          <span>{p.mrn}</span>
                        </div>

                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200 font-mono text-[11px]">
                          <span className="text-slate-400">NIK:</span>
                          <span>{p.nik}</span>
                        </div>

                        {p.satusehatConsent === "opt-out" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-[10px]" title="Pasien Menolak Berbagi Data ke SATUSEHAT (Hanya Tersimpan Internal RS)">
                            🔒 Consent: Opt-Out
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 font-semibold text-[10px]" title="Pasien Menyetujui Berbagi Data ke SATUSEHAT">
                            🛡️ Consent: Opt-In
                          </span>
                        )}

                        <div className="inline-flex items-center gap-1 text-[11px] text-slate-500 truncate w-full pt-0.5">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate">{p.address}</span>
                        </div>
                      </div>

                      {/* Row 3: TELEMETRI KUNJUNGAN TERAKHIR (LAST VISIT TELEMETRY) */}
                      <div className="pt-2 border-t border-slate-100">
                        {todayQueue ? (
                          // Case A: Pasien Memiliki Antrean Hari Ini
                          <div
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                              todayQueue.status === "finished"
                                ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                                : todayQueue.status === "in-progress"
                                ? "bg-blue-50 border-blue-300 text-blue-950"
                                : "bg-amber-50 border-amber-300 text-amber-950"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="relative flex h-2 w-2">
                                <span
                                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                    todayQueue.status === "finished"
                                      ? "bg-emerald-400"
                                      : todayQueue.status === "in-progress"
                                      ? "bg-blue-400"
                                      : "bg-amber-400"
                                  }`}
                                />
                                <span
                                  className={`relative inline-flex rounded-full h-2 w-2 ${
                                    todayQueue.status === "finished"
                                      ? "bg-emerald-600"
                                      : todayQueue.status === "in-progress"
                                      ? "bg-blue-600"
                                      : "bg-amber-600"
                                  }`}
                                />
                              </span>
                              <div className="min-w-0">
                                <div className="text-xs font-bold truncate">
                                  Antrean Hari Ini:{" "}
                                  <span className="font-mono font-extrabold">{todayQueue.queueNumber}</span> ({todayQueue.department})
                                </div>
                                <div className="text-[10px] opacity-80 truncate">
                                  {todayQueue.doctor} • {todayQueue.arrivalTime}
                                </div>
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                                todayQueue.status === "finished"
                                  ? "bg-emerald-200 text-emerald-900"
                                  : todayQueue.status === "in-progress"
                                  ? "bg-blue-200 text-blue-900"
                                  : "bg-amber-200 text-amber-900"
                              }`}
                            >
                              {todayQueue.status === "finished"
                                ? "Selesai"
                                : todayQueue.status === "in-progress"
                                ? "Diperiksa"
                                : "Menunggu"}
                            </span>
                          </div>
                        ) : p.lastVisitDate ? (
                          // Case B: Ada Riwayat Kunjungan Terdahulu
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1.5">
                            <div className="flex items-center justify-between gap-1 text-xs">
                              <div className="flex items-center gap-1.5 text-slate-800 font-bold text-[11px] min-w-0">
                                <Clock className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                                <span className="truncate">
                                  Kunjungan Terakhir: {formatVisitDateIndo(p.lastVisitDate)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-teal-100 text-teal-800 border border-teal-200">
                                  {lastVisitRel.text}
                                </span>
                                {p.totalVisitsCount !== undefined && p.totalVisitsCount > 0 && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-slate-200/80 text-slate-700">
                                    {p.totalVisitsCount}x Kunjungan
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-600">
                              <div className="flex items-center gap-1 truncate">
                                <Stethoscope className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="font-semibold text-slate-800 truncate">
                                  {p.lastVisitDepartment || "Poli Penyakit Dalam"}
                                </span>
                                <span className="text-slate-400">•</span>
                                <span className="truncate text-slate-600">
                                  {p.lastVisitDoctor || "dr. Rian Pratama, Sp.PD"}
                                </span>
                              </div>
                            </div>

                            {p.lastVisitDiagnosis && (
                              <div className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200/80 truncate">
                                <span className="font-semibold text-slate-700">Diagnosis:</span>{" "}
                                <span>{p.lastVisitDiagnosis}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          // Case C: Pasien Baru Terdaftar (0 Kunjungan)
                          <div className="p-2.5 rounded-xl bg-slate-50/70 border border-dashed border-slate-200 flex items-center justify-between text-xs text-slate-500">
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <UserCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>Belum Ada Riwayat Kunjungan (Pasien Baru MPI)</span>
                            </div>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              Kunjungan Perdana
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Row 4: Action Footer */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <span className="text-[11px] text-teal-700 font-semibold flex items-center gap-1 font-mono">
                          <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                          <span className="truncate max-w-[120px]">{p.id}</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPatientHistory(p);
                            }}
                            className="h-8 px-2.5 text-xs font-bold text-slate-700 border-slate-300 hover:bg-slate-100 shadow-2xs cursor-pointer shrink-0"
                            title="Buka Resume Medis Elektronik (RME)"
                          >
                            <FileText className="h-3.5 w-3.5 mr-1 text-teal-600" />
                            <span>Buka RME</span>
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectPatient(p);
                              setActiveTab("queue");
                              toast.success(`Pasien ${p.name} dipilih. Lanjutkan form pendaftaran poli.`);
                            }}
                            className="h-8 px-3 text-xs font-bold gap-1 bg-teal-600 hover:bg-teal-700 text-white shadow-2xs cursor-pointer shrink-0"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            <span>Daftarkan ➔</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* 5B. TABLE VIEW (SPACIOUS ENTERPRISE GRID WITH EXCELLENT LEGIBILITY) */
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4 min-w-[135px]">No. RM & NIK</th>
                        <th className="py-3 px-4 min-w-[210px]">Nama Pasien & Usia</th>
                        <th className="py-3 px-4 min-w-[150px]">Penjamin & Consent</th>
                        <th className="py-3 px-4 min-w-[185px]">Kunjungan Terakhir</th>
                        <th className="py-3 px-4 min-w-[130px] text-center">Status Hari Ini</th>
                        <th className="py-3 px-4 min-w-[135px] text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {paginatedReturningPatients.map((p) => {
                        const isCurrentActive = p.id === currentPatient.id;
                        const age = new Date().getFullYear() - new Date(p.birthDate).getFullYear();
                        const todayQueue = worklist.find((w) => w.patient.id === p.id);
                        const lastVisitRel = formatRelativeVisit(p.lastVisitDate);

                        return (
                          <tr
                            key={p.id}
                            onClick={() => {
                              onSelectPatient(p);
                              toast.info(`Pasien ${p.name} dipilih sebagai pasien aktif.`);
                            }}
                            className={`transition-colors cursor-pointer ${
                              isCurrentActive
                                ? "bg-teal-50/60 font-semibold"
                                : "hover:bg-slate-50/80"
                            }`}
                          >
                            {/* RM & NIK */}
                            <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                              <div className="font-bold text-slate-900 text-xs">{p.mrn}</div>
                              <div className="text-[10px] text-slate-400">{p.nik}</div>
                            </td>

                            {/* Name & Age */}
                            <td className="py-3.5 px-4 min-w-[210px]">
                              <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 flex-wrap">
                                <span>{p.name}</span>
                                {isCurrentActive && (
                                  <span className="text-[8px] bg-teal-700 text-white px-1.5 py-0.2 rounded-full font-bold">
                                    AKTIF
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {age} Thn ({p.gender === "male" ? "Laki-laki" : "Perempuan"}) • Gol. {p.bloodType}+
                              </div>
                            </td>

                            {/* Payer & Consent */}
                            <td className="py-3.5 px-4 whitespace-nowrap min-w-[150px]">
                              <div className="flex flex-col items-start gap-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-semibold whitespace-nowrap">
                                  {p.paymentPayer ? p.paymentPayer.split(" (")[0] : "Mandiri / Umum"}
                                </span>
                                <div>
                                  {p.satusehatConsent === "opt-out" ? (
                                    <span
                                      className="inline-flex items-center gap-1 text-[9px] text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 whitespace-nowrap"
                                      title="Consent Menolak SATUSEHAT (Hanya Lokal RS)"
                                    >
                                      <Lock className="h-2.5 w-2.5 text-amber-700" />
                                      <span>Opt-Out</span>
                                    </span>
                                  ) : (
                                    <span
                                      className="inline-flex items-center gap-1 text-[9px] text-teal-800 font-bold bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200 whitespace-nowrap"
                                      title="Consent Terhubung SATUSEHAT"
                                    >
                                      <ShieldCheck className="h-2.5 w-2.5 text-teal-700" />
                                      <span>Opt-In</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Last Visit Info */}
                            <td className="py-3.5 px-4 min-w-[185px]">
                              {p.lastVisitDate ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-900 text-[11px]">
                                      {formatVisitDateIndo(p.lastVisitDate)}
                                    </span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-teal-50 text-teal-800 border border-teal-200 whitespace-nowrap">
                                      {lastVisitRel.text}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 truncate max-w-[210px]">
                                    {p.lastVisitDepartment} • {p.lastVisitDoctor}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">
                                  Belum pernah berkunjung
                                </span>
                              )}
                            </td>

                            {/* Today Status */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              {todayQueue ? (
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tight shadow-2xs whitespace-nowrap ${
                                    todayQueue.status === "finished"
                                      ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                                      : todayQueue.status === "in-progress"
                                      ? "bg-blue-50 text-blue-800 border border-blue-300"
                                      : "bg-amber-50 text-amber-900 border border-amber-300"
                                  }`}
                                >
                                  <span className="font-mono font-black">{todayQueue.queueNumber}</span>
                                  <span className="text-slate-300">•</span>
                                  <span>
                                    {todayQueue.status === "finished"
                                      ? "Selesai"
                                      : todayQueue.status === "in-progress"
                                      ? "Diperiksa"
                                      : "Menunggu"}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs font-mono">-</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenPatientHistory(p);
                                  }}
                                  className="h-8 px-2.5 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                                  title="Buka Resume Medis & Riwayat Pasien"
                                >
                                  <FileText className="h-3.5 w-3.5 text-teal-600" />
                                  <span>RME</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectPatient(p);
                                    setActiveTab("queue");
                                    toast.success(
                                      `Pasien ${p.name} dipilih. Formulir pendaftaran poliklinik dibuka.`
                                    );
                                  }}
                                  className="h-8 px-2.5 rounded-lg text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-2xs cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                                  title="Daftarkan ke antrean poliklinik"
                                >
                                  <UserPlus className="h-3.5 w-3.5" />
                                  <span>Daftar ➔</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. Smart Pagination Bar */}
            {processedReturningPatients.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                <div className="text-slate-500 text-[11px]">
                  Menampilkan{" "}
                  <strong className="text-slate-900">
                    {(safeReturningPage - 1) * returningPageSize + 1}
                  </strong>{" "}
                  -{" "}
                  <strong className="text-slate-900">
                    {Math.min(safeReturningPage * returningPageSize, processedReturningPatients.length)}
                  </strong>{" "}
                  dari <strong className="text-slate-900">{processedReturningPatients.length}</strong> total pasien terdaftar
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={safeReturningPage <= 1}
                    onClick={() => setReturningPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-2xs cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    <span>Sebelumnya</span>
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: returningTotalPages }, (_, i) => i + 1).map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setReturningPage(num)}
                        className={`h-8 w-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          safeReturningPage === num
                            ? "bg-teal-700 text-white shadow-xs"
                            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={safeReturningPage >= returningTotalPages}
                    onClick={() => setReturningPage((p) => Math.min(returningTotalPages, p + 1))}
                    className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-2xs cursor-pointer"
                  >
                    <span>Berikutnya</span>
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REGISTRASI PASIEN BARU */}
        {activeTab === "new" && (
          <form onSubmit={handleSaveNewPatient} className="space-y-4">
            {/* NIK Input & MPI SATUSEHAT Section */}
            <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-teal-700" />
                  <span>Verifikasi Identitas Kependudukan (NIK e-KTP) *</span>
                </Label>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      nikInput.length === 16
                        ? "bg-teal-100 text-teal-800 border border-teal-300"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {nikInput.length}/16 Digit
                  </span>
                  {nikInput.length === 16 && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        nikValResult.isValid
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {nikValResult.isValid ? "✓ Format Valid" : "Format Tidak Valid"}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <Input
                  type="text"
                  maxLength={16}
                  placeholder="Masukkan 16 digit NIK Pasien (Contoh: 3174051208820003)..."
                  value={nikInput}
                  onChange={(e) => {
                    setNikInput(e.target.value.replace(/\D/g, ""));
                    setIsNikVerified(false);
                  }}
                  className={`font-mono text-xs h-10 bg-white ${
                    nikInput && !nikValResult.isValid
                      ? "border-red-400 focus:border-red-500 ring-1 ring-red-200"
                      : "border-slate-300"
                  }`}
                />
                <Button
                  type="button"
                  onClick={handleVerifyNikMpi}
                  disabled={isVerifyingNik || nikInput.length < 16}
                  variant="medical"
                  className="text-xs font-bold gap-1.5 h-10 shrink-0 cursor-pointer"
                >
                  {isVerifyingNik ? (
                    "Memeriksa NIK..."
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Cek Data KTP (Kemenkes)</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Duplicate Detection Alert */}
              {existingPatientByNik && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs flex items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
                    <span className="text-amber-900">
                      Pasien dengan NIK ini sudah terdaftar: <strong>{existingPatientByNik.name}</strong> (RM: {existingPatientByNik.mrn})
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onSelectPatient(existingPatientByNik);
                      toast.info(`Pasien ${existingPatientByNik.name} dipilih.`);
                      setActiveTab("queue");
                    }}
                    className="h-7 text-[11px] text-amber-900 border-amber-300 bg-white hover:bg-amber-100 cursor-pointer"
                  >
                    Gunakan Pasien Ini
                  </Button>
                </div>
              )}
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-bold text-slate-700">Nama Lengkap Pasien *</Label>
                <Input
                  type="text"
                  required
                  placeholder="Nama lengkap sesuai e-KTP..."
                  value={newPatientData.name || ""}
                  onChange={(e) =>
                    setNewPatientData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="text-xs h-9 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Jenis Kelamin *</Label>
                <CustomSelect<"male" | "female">
                  value={newPatientData.gender || "male"}
                  onChange={(val) =>
                    setNewPatientData((prev) => ({
                      ...prev,
                      gender: val,
                    }))
                  }
                  size="md"
                  className="w-full"
                  buttonClassName="h-9 bg-white border-slate-300"
                  options={[
                    { value: "male", label: "Laki-laki (Male)" },
                    { value: "female", label: "Perempuan (Female)" },
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Tanggal Lahir *</Label>
                <CustomDatePicker
                  value={newPatientData.birthDate || ""}
                  onChange={(dateVal) =>
                    setNewPatientData((prev) => ({ ...prev, birthDate: dateVal }))
                  }
                  maxDate={new Date().toISOString().split("T")[0]}
                  placeholder="Pilih Tanggal Lahir Pasien..."
                  size="md"
                  buttonClassName="h-9 text-xs bg-white border-slate-200 shadow-2xs font-mono"
                  showPresets={false}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Nomor Telepon / WhatsApp</Label>
                <Input
                  type="tel"
                  placeholder="Contoh: 081234567890"
                  value={newPatientData.phone || ""}
                  onChange={(e) =>
                    setNewPatientData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="text-xs h-9 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Golongan Darah</Label>
                <CustomSelect<"A" | "B" | "AB" | "O">
                  value={newPatientData.bloodType || "O"}
                  onChange={(val) =>
                    setNewPatientData((prev) => ({
                      ...prev,
                      bloodType: val,
                    }))
                  }
                  size="md"
                  className="w-full"
                  buttonClassName="h-9 bg-white border-slate-300"
                  options={[
                    { value: "A", label: "Golongan A" },
                    { value: "B", label: "Golongan B" },
                    { value: "AB", label: "Golongan AB" },
                    { value: "O", label: "Golongan O" },
                  ]}
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-bold text-slate-700">Alamat Domisili KTP</Label>
                <Input
                  type="text"
                  placeholder="Jl. Nama Jalan No. XX, Kelurahan, Kecamatan, Kota"
                  value={newPatientData.address || ""}
                  onChange={(e) =>
                    setNewPatientData((prev) => ({ ...prev, address: e.target.value }))
                  }
                  className="text-xs h-9 bg-white"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-bold text-slate-700">
                  Riwayat Alergi (Obat / Makanan)
                </Label>
                <Input
                  type="text"
                  placeholder="Contoh: Penisilin, Sulfa, Amoxicillin, Kacang, Debu..."
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  className="text-xs h-9 bg-white"
                />
              </div>

              {/* Kontak Darurat */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Nama Kontak Darurat</Label>
                <Input
                  type="text"
                  placeholder="Nama keluarga / kerabat..."
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="text-xs h-9 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">No. HP Kontak Darurat</Label>
                <Input
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="text-xs h-9 bg-white"
                />
              </div>

              {/* Persetujuan Berbagi Data SATUSEHAT (General Consent) */}
              <div className="p-3.5 rounded-xl bg-teal-50/50 border border-teal-200 md:col-span-2 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-teal-700" />
                    <span>Persetujuan Pertukaran Data Medis (SATUSEHAT Consent)</span>
                  </Label>
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full">
                    Hak Akses Pasien
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNewPatientData((prev) => ({ ...prev, satusehatConsent: "opt-in" }))}
                    className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                      (newPatientData.satusehatConsent || "opt-in") === "opt-in"
                        ? "bg-teal-700 text-white shadow-xs"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>🛡️ Setuju / Opt-In (Kirim ke SATUSEHAT)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPatientData((prev) => ({ ...prev, satusehatConsent: "opt-out" }))}
                    className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                      newPatientData.satusehatConsent === "opt-out"
                        ? "bg-slate-800 text-white shadow-xs"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>🔒 Menolak / Opt-Out (Hanya Internal RS)</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <Button
                type="submit"
                variant="medical"
                disabled={!nikValResult.isValid || Boolean(existingPatientByNik)}
                className="text-xs font-bold gap-2 cursor-pointer shadow-sm"
              >
                <UserPlus className="h-4 w-4" />
                <span>Simpan & Terbitkan No. Rekam Medis</span>
              </Button>
            </div>
          </form>
        )}

        {/* TAB 3: DAFTAR KUNJUNGAN POLI (QUEUE ENCOUNTER) */}
        {activeTab === "queue" && (
          <form onSubmit={handleRegisterEncounter} className="space-y-4">
            {/* Active Patient Target Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                    RM
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">
                      {currentPatient.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono">
                      No. RM: {currentPatient.mrn} | NIK: {currentPatient.nik}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("returning")}
                  className="h-7 text-[11px] font-bold text-teal-800 bg-teal-50 border-teal-300 hover:bg-teal-100 cursor-pointer shadow-2xs"
                >
                  Ganti Pasien
                </Button>
              </div>

              {/* Active Queue Warning */}
              {isDuplicateQueue && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-300 text-xs text-red-900 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>
                    ⚠️ <strong>Perhatian:</strong> Pasien ini sudah memiliki antrean aktif di <strong>{selectedClinic}</strong>. Selesaikan konsultasi berjalan sebelum mendaftarkan kunjungan baru.
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Poli / Klinik Tujuan *</Label>
                <CustomSelect<string>
                  value={selectedClinic}
                  onChange={(val) => {
                    setSelectedClinic(val);
                    if (val === "Poli Penyakit Dalam") {
                      setSelectedDoctor("dr. Rian Pratama, Sp.PD (SIP: 446/089)");
                    } else if (val === "Poli Umum") {
                      setSelectedDoctor("dr. Amanda Putri, M.Biomed (SIP: 446/012)");
                    } else if (val === "Poli Anak (Pediatri)") {
                      setSelectedDoctor("dr. Maya Anggraini, Sp.A (SIP: 446/055)");
                    } else if (val === "Poli Gigi & Mulut") {
                      setSelectedDoctor("drg. Kevin Tanuwidjaja (SIP: 446/099)");
                    } else if (val === "Poli Jantung & Pembuluh Darah") {
                      setSelectedDoctor("dr. Rian Hidayat, Sp.JP (SIP: 446/108)");
                    } else if (val === "Poli Mata") {
                      setSelectedDoctor("dr. Nadia Putri, Sp.M (SIP: 446/077)");
                    }
                  }}
                  size="lg"
                  className="w-full"
                  buttonClassName="h-10 bg-white border-slate-300"
                  options={[
                    { value: "Poli Penyakit Dalam", label: "Poli Penyakit Dalam (Lt. 2)" },
                    { value: "Poli Umum", label: "Poli Umum (Lt. 1)" },
                    { value: "Poli Anak (Pediatri)", label: "Poli Anak / Pediatri (Lt. 1)" },
                    { value: "Poli Gigi & Mulut", label: "Poli Gigi & Mulut (Lt. 2)" },
                    { value: "Poli Jantung & Pembuluh Darah", label: "Poli Jantung & Pembuluh Darah (Lt. 2)" },
                    { value: "Poli Mata", label: "Poli Mata (Lt. 2)" },
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Dokter Spesialis / DPJP *</Label>
                <Input
                  type="text"
                  readOnly
                  value={selectedDoctor}
                  className="text-xs h-10 bg-slate-50 border-slate-300 font-medium text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Jenis Penjamin / Payer *</Label>
                <CustomSelect<string>
                  value={payerType}
                  onChange={(val) => setPayerType(val)}
                  size="lg"
                  className="w-full"
                  buttonClassName="h-10 bg-white border-slate-300"
                  options={[
                    { value: "BPJS Kesehatan (JKN-PBI / Non-PBI)", label: "BPJS Kesehatan (JKN-PBI / Non-PBI)" },
                    { value: "Pasien Umum / Mandiri", label: "Pasien Umum / Mandiri" },
                    { value: "Asuransi Swasta / AdMedika", label: "Asuransi Swasta / AdMedika" },
                    { value: "Jaminan Perusahaan", label: "Jaminan Perusahaan" },
                  ]}
                />
              </div>

              {/* BPJS Number Validation Field */}
              {payerType.includes("BPJS") && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700">
                      No. Kartu BPJS (13 Digit) <span className="text-slate-400 font-normal">(Opsional)</span>
                    </Label>
                    <span className="text-[10px] font-mono text-slate-500">{bpjsNumber.length}/13</span>
                  </div>
                  <Input
                    type="text"
                    maxLength={13}
                    placeholder="Contoh: 0001234567890 (Opsional)..."
                    value={bpjsNumber}
                    onChange={(e) => setBpjsNumber(e.target.value.replace(/\D/g, ""))}
                    className={`text-xs h-10 bg-white font-mono ${
                      bpjsNumber.length > 0 && bpjsNumber.length !== 13
                        ? "border-amber-400 ring-1 ring-amber-200"
                        : "border-slate-300"
                    }`}
                  />
                  {bpjsNumber.length > 0 && bpjsNumber.length !== 13 && (
                    <p className="text-[11px] text-amber-600">
                      Nomor kartu BPJS harus terdiri dari 13 digit angka jika diisi.
                    </p>
                  )}
                </div>
              )}

              {/* Triage Priority Selector */}
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Klasifikasi Triase & Jalur Prioritas Antrean *</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    Sesuai Standar Pelayanan Klinis Kemenkes RI
                  </span>
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div
                    onClick={() => setTriagePriorityInput("regular")}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      triagePriorityInput === "regular"
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-slate-500/20"
                        : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>🟢 Reguler</span>
                    </div>
                    <p className={`text-[10px] mt-1 ${triagePriorityInput === "regular" ? "text-slate-300" : "text-slate-500"}`}>
                      Alur pemeriksaan standar
                    </p>
                  </div>

                  <div
                    onClick={() => setTriagePriorityInput("urgent")}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      triagePriorityInput === "urgent"
                        ? "bg-red-600 text-white border-red-700 shadow-xs ring-2 ring-red-500/20"
                        : "bg-red-50/60 text-red-950 border-red-200 hover:bg-red-100/60"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-extrabold">
                      <span className="h-2 w-2 rounded-full bg-red-400 animate-ping" />
                      <span>🔴 CITO / Urgent</span>
                    </div>
                    <p className={`text-[10px] mt-1 ${triagePriorityInput === "urgent" ? "text-red-100" : "text-red-700"}`}>
                      Prioritas gawat darurat
                    </p>
                  </div>

                  <div
                    onClick={() => setTriagePriorityInput("geriatric")}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      triagePriorityInput === "geriatric"
                        ? "bg-purple-700 text-white border-purple-800 shadow-xs ring-2 ring-purple-500/20"
                        : "bg-purple-50/60 text-purple-950 border-purple-200 hover:bg-purple-100/60"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="h-2 w-2 rounded-full bg-purple-500" />
                      <span>🟣 Geriatri (Lansia)</span>
                    </div>
                    <p className={`text-[10px] mt-1 ${triagePriorityInput === "geriatric" ? "text-purple-100" : "text-purple-700"}`}>
                      Pasien usia lanjut (&gt; 60 th)
                    </p>
                  </div>

                  <div
                    onClick={() => setTriagePriorityInput("pediatric")}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      triagePriorityInput === "pediatric"
                        ? "bg-sky-600 text-white border-sky-700 shadow-xs ring-2 ring-sky-500/20"
                        : "bg-sky-50/60 text-sky-950 border-sky-200 hover:bg-sky-100/60"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="h-2 w-2 rounded-full bg-sky-400" />
                      <span>🔵 Pediatri (Anak)</span>
                    </div>
                    <p className={`text-[10px] mt-1 ${triagePriorityInput === "pediatric" ? "text-sky-100" : "text-sky-700"}`}>
                      Pasien balita & anak-anak
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-bold text-slate-700">Keluhan Utama / Alasan Kunjungan *</Label>
                <Input
                  type="text"
                  required
                  placeholder="Contoh: Kontrol tekanan darah tinggi dan sakit kepala tengkuk..."
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  className="text-xs h-10 bg-white"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Pasien akan otomatis masuk ke antrean poliklinik sesuai urutan kedatangan.
              </span>
              <Button
                type="submit"
                variant="medical"
                disabled={isDuplicateQueue || !chiefComplaint.trim()}
                className="text-xs font-bold gap-2 cursor-pointer shadow-sm"
              >
                <FileCheck className="h-4 w-4" />
                <span>Daftarkan Kunjungan & Cetak Antrean</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
