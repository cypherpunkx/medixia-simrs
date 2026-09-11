"use client";

import React, { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { EhrHeader } from "@/components/layout/EhrHeader";
import { EhrLeftSidebar, EhrModule } from "@/components/layout/EhrLeftSidebar";
import { EhrRightPanel } from "@/components/layout/EhrRightPanel";
import { EhrFooter } from "@/components/layout/EhrFooter";
import { ClinicalSkeleton } from "@/components/layout/ClinicalSkeleton";
import { PatientProfileBanner } from "@/components/patient/PatientProfileBanner";
import { ClinicalShiftBar } from "@/components/patient/ClinicalShiftBar";
import { ClinicEmptyState } from "@/components/patient/ClinicEmptyState";
import { VitalsCard } from "@/components/patient/VitalsCard";
import { OutpatientTimeline } from "@/components/patient/OutpatientTimeline";
import { MedicationScheduleCard } from "@/components/patient/MedicationScheduleCard";
import { ResumeMedisPrintModal } from "@/components/patient/ResumeMedisPrintModal";
import { QueueTicketPrintModal } from "@/components/patient/QueueTicketPrintModal";
import { PatientCardPrintModal } from "@/components/patient/PatientCardPrintModal";
import { PrescriptionPrintModal } from "@/components/patient/PrescriptionPrintModal";
import { MedicalRecordLockModal } from "@/components/compliance/MedicalRecordLockModal";
import { PublicQueueDisplayModal } from "@/components/queue/PublicQueueDisplayModal";
import { DiagnosticSupportModule } from "@/components/diagnostic/DiagnosticSupportModule";
import { OutpatientEntryForm } from "@/components/doctor/OutpatientEntryForm";
import { PatientRegistrationModule } from "@/components/registration/PatientRegistrationModule";
import { AuthCard } from "@/components/auth/AuthCard";
import { TokenDisplay } from "@/components/auth/TokenDisplay";
import { OrgVerification } from "@/components/auth/OrgVerification";
import { RequestLogs, LogEntry } from "@/components/auth/RequestLogs";
import { CodeSnippetModal } from "@/components/auth/CodeSnippetModal";
import {
  MOCK_PATIENT,
  SAMPLE_PATIENTS,
  MOCK_ENCOUNTERS,
  ALL_SAMPLE_ENCOUNTERS,
  INITIAL_WORKLIST,
} from "@/lib/satusehat/mock-data";
import {
  AuthSession,
  ClinicQueuePatientItem,
  OutpatientEncounter,
  PatientProfile,
  SatusehatEnvironment,
} from "@/lib/satusehat/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QrCode, Loader2, Hospital } from "lucide-react";
import { toast } from "sonner";

gsap.registerPlugin(useGSAP);

export default function HomePage() {
  const [activeDepartment, setActiveDepartment] = useState("Poli Penyakit Dalam");
  const [activeModule, setActiveModule] = useState<EhrModule>("resume");
  const [currentEnv, setCurrentEnv] = useState<SatusehatEnvironment>("staging");
  const [patient, setPatient] = useState<PatientProfile>(MOCK_PATIENT);
  const [encounters, setEncounters] = useState<OutpatientEncounter[]>(MOCK_ENCOUNTERS);
  const [worklist, setWorklist] = useState<ClinicQueuePatientItem[]>(INITIAL_WORKLIST);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string>(
    MOCK_ENCOUNTERS[0].id
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const [isDbSyncing, setIsDbSyncing] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Initial Load from SQLite DB with Context Persistence
  useEffect(() => {
    let isMounted = true;

    // Restore saved user context if page was refreshed
    const savedDept = typeof window !== "undefined" ? sessionStorage.getItem("simrs_active_department") : null;
    const savedMod = typeof window !== "undefined" ? sessionStorage.getItem("simrs_active_module") : null;
    const savedPatientId = typeof window !== "undefined" ? sessionStorage.getItem("simrs_active_patient_id") : null;
    const savedEncId = typeof window !== "undefined" ? sessionStorage.getItem("simrs_active_encounter_id") : null;

    const loadDbData = async () => {
      try {
        const [pRes, qRes, encRes] = await Promise.all([
          fetch("/api/patients"),
          fetch("/api/queue"),
          fetch("/api/encounters"),
        ]);

        let loadedPatients: PatientProfile[] = [];
        let loadedQueue: ClinicQueuePatientItem[] = [];
        let loadedEncounters: OutpatientEncounter[] = [];

        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData.success && Array.isArray(pData.data) && pData.data.length > 0) {
            loadedPatients = pData.data;
          }
        }

        if (qRes.ok) {
          const qData = await qRes.json();
          if (qData.success && Array.isArray(qData.data) && qData.data.length > 0) {
            loadedQueue = qData.data;
          }
        }

        if (encRes.ok) {
          const encData = await encRes.json();
          if (encData.success && Array.isArray(encData.data) && encData.data.length > 0) {
            loadedEncounters = encData.data;
          }
        }

        if (!isMounted) return;

        const effectiveDept = savedDept || "Poli Penyakit Dalam";
        const effectiveMod = (savedMod as EhrModule) || "resume";
        const allPatientsSource = loadedPatients.length > 0 ? loadedPatients : SAMPLE_PATIENTS;
        const queueSource = loadedQueue.length > 0 ? loadedQueue : INITIAL_WORKLIST;
        const allEncountersSource = loadedEncounters.length > 0 ? loadedEncounters : ALL_SAMPLE_ENCOUNTERS;

        // 1. Resolve active patient
        let selectedPat: PatientProfile | null = null;
        if (savedPatientId) {
          selectedPat =
            allPatientsSource.find((p) => p.id === savedPatientId) ||
            queueSource.find((w) => w.patient.id === savedPatientId)?.patient ||
            null;
        }

        if (!selectedPat) {
          const deptItems =
            effectiveDept === "Semua Poli"
              ? queueSource
              : queueSource.filter((w) => w.department === effectiveDept);

          const activeQueueItem =
            deptItems.find((w) => w.status === "in-progress") ||
            deptItems.find((w) => w.status === "arrived") ||
            deptItems[0] ||
            null;

          if (activeQueueItem) {
            selectedPat = activeQueueItem.patient;
          } else {
            selectedPat = allPatientsSource[0];
          }
        }

        // 2. Resolve patient's specific encounters (strictly isolated to selectedPat)
        let patientEncounters = allEncountersSource.filter(
          (e) => e.patientId === selectedPat?.id
        );

        const matchingQueue = selectedPat
          ? queueSource.find(
              (w) => w.patient.id === selectedPat?.id || w.patient.mrn === selectedPat?.mrn
            )
          : null;

        if (patientEncounters.length > 0 && matchingQueue) {
          patientEncounters = patientEncounters.map((e) => {
            if (e.queueNumber === matchingQueue.queueNumber || patientEncounters.length === 1) {
              return { ...e, encounterStatus: matchingQueue.status as any };
            }
            return e;
          });
        }

        if (patientEncounters.length === 0 && selectedPat) {
          const draftEnc: OutpatientEncounter = {
            id: `ENC-${selectedPat.id.replace("P-", "")}-DRAFT`,
            patientId: selectedPat.id,
            visitDate: new Date().toISOString(),
            clinicDepartment: matchingQueue?.department || effectiveDept,
            doctorName: matchingQueue?.doctor || (effectiveDept === "Poli Umum" ? "dr. Amanda Putri, M.Biomed" : "dr. Rian Pratama, Sp.PD"),
            doctorSip: "SIP.446/089/DS/Dinkes/2026",
            doctorIhsId: "N10009841",
            hospitalName: "RS Umum Daerah Sehat Sejahtera",
            hospitalOrgId: "10000004",
            chiefComplaint: matchingQueue?.chiefComplaint || "Pemeriksaan dan konsultasi rawat jalan",
            anamnesis: matchingQueue?.chiefComplaint
              ? `Pasien mendaftar dengan keluhan: ${matchingQueue.chiefComplaint}.`
              : "Menunggu asesmen anamnesis dokter DPJP.",
            vitals: undefined,
            diagnoses: [],
            procedures: [],
            prescriptions: [],
            followUpPlan: {
              instruction: "Menunggu pemeriksaan & instruksi dokter DPJP.",
            },
            dischargeDisposition: matchingQueue?.status === "finished" ? "Pulang Berobat Jalan" : "Dalam Pelayanan Poli",
            encounterStatus: (matchingQueue?.status as any) || "arrived",
            queueNumber: matchingQueue?.queueNumber,
            consentStatus: selectedPat.satusehatConsent || "opt-in",
            syncStatus: "pending",
            syncedAt: undefined,
            satusehatEncounterId: undefined,
          };
          patientEncounters = [draftEnc];
        }

        // 3. Resolve active encounter ID
        let targetEncId = patientEncounters[0]?.id || "";
        if (savedEncId && patientEncounters.some((e) => e.id === savedEncId)) {
          targetEncId = savedEncId;
        }

        // 4. Batch update all states atomically
        setActiveDepartment(effectiveDept);
        setActiveModule(effectiveMod);
        setWorklist(queueSource);
        if (selectedPat) {
          setPatient(selectedPat);
          try {
            sessionStorage.setItem("simrs_active_patient_id", selectedPat.id);
          } catch {}
        }
        setEncounters(patientEncounters);
        if (targetEncId) {
          setSelectedEncounterId(targetEncId);
          try {
            sessionStorage.setItem("simrs_active_encounter_id", targetEncId);
          } catch {}
        }
        try {
          sessionStorage.setItem("simrs_active_department", effectiveDept);
          sessionStorage.setItem("simrs_active_module", effectiveMod);
        } catch {}

        setIsHydrated(true);
      } catch (err) {
        console.error("Gagal sinkronisasi data awal database:", err);
        setIsHydrated(true);
      }
    };

    loadDbData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Modals
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isQueueTicketOpen, setIsQueueTicketOpen] = useState(false);
  const [isPatientCardOpen, setIsPatientCardOpen] = useState(false);
  const [isPrescriptionPrintOpen, setIsPrescriptionPrintOpen] = useState(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isQueueDisplayOpen, setIsQueueDisplayOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isCodeSnippetOpen, setIsCodeSnippetOpen] = useState(false);

  // Auth & Gateway State
  const [session, setSession] = useState<AuthSession | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isBridgingActive = Boolean(session?.accessToken && session.expiresAt > Date.now());

  const mainCanvasRef = useRef<HTMLDivElement>(null);
  const selectedEncounter =
    encounters.find((e) => e.id === selectedEncounterId) || encounters[0];

  // GSAP animation when switching modules (with explicit fromTo and clearProps to prevent stuck opacity)
  useGSAP(
    () => {
      if (!isHydrated) return;
      gsap.fromTo(
        ".canvas-content",
        { y: 8, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.2,
          stagger: 0.03,
          ease: "power2.out",
          clearProps: "all",
          overwrite: "auto",
        }
      );
    },
    { dependencies: [activeModule, selectedEncounterId, isHydrated], scope: mainCanvasRef }
  );

  // Auto-scroll to the very top whenever switching clinical modules or active patient
  useEffect(() => {
    if (!isHydrated) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (mainCanvasRef.current) {
      mainCanvasRef.current.scrollTop = 0;
    }
  }, [activeModule, patient.id, isHydrated]);

  const handleLogRequest = (entry: {
    title: string;
    url: string;
    method: string;
    status: number;
    latencyMs: number;
    requestBody: Record<string, unknown>;
    responseBody: unknown;
  }) => {
    const newLog: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      ...entry,
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  const handleAuthSuccess = (newSession: AuthSession) => {
    setSession(newSession);
  };

  const handleRefresh = async () => {
    if (!session) return;
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/satusehat/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          env: session.env,
          orgId: session.orgId,
          useEnvCredentials: true,
          forceRefresh: true,
        }),
      });
      const data = await response.json();

      handleLogRequest({
        title: "OAuth 2.0 Force Token Refresh",
        url: data.telemetry?.targetUrl || `/api/satusehat/auth`,
        method: "POST",
        status: response.status,
        latencyMs: data.telemetry?.latencyMs || 250,
        requestBody: { forceRefresh: true, env: session.env },
        responseBody: data,
      });

      if (data.success && data.data) {
        setSession(data.data);
        toast.success("Token akses berhasil diperbarui");
      }
    } catch {
      toast.error("Gagal terhubung ke server");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Holistic Status Transition across Master Queue and Encounters (with Non-blocking DB persistence)
  const handleUpdateQueueStatus = (
    itemId: string,
    nextStatus: "arrived" | "in-progress" | "finished",
    silent: boolean = false
  ) => {
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

    // 1. Optimistic UI state update for worklist
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

    // 2. Synchronously update encounters state for the target patient
    if (target) {
      setEncounters((prev) =>
        prev.map((e) => {
          if (
            e.queueNumber === target.queueNumber ||
            e.patientId === target.patient.id
          ) {
            return { ...e, encounterStatus: nextStatus };
          }
          return e;
        })
      );
    }
    if (previousActiveInSameDept) {
      setEncounters((prev) =>
        prev.map((e) => {
          if (
            e.queueNumber === previousActiveInSameDept.queueNumber ||
            e.patientId === previousActiveInSameDept.patient.id
          ) {
            return { ...e, encounterStatus: "finished" };
          }
          return e;
        })
      );
    }

    // 3. Persist to DB asynchronously in background (Non-blocking with UI badge sync indicator)
    setIsDbSyncing(true);
    fetch(`/api/queue/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    })
      .catch((err) => {
        console.error("Gagal update queue status ke DB:", err);
      })
      .finally(() => {
        setIsDbSyncing(false);
      });

    if (previousActiveInSameDept) {
      fetch(`/api/queue/${previousActiveInSameDept.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "finished" }),
      }).catch((err) => {
        console.error("Gagal auto-finish previous patient di DB:", err);
      });
    }

    // 4. Immediate synchronous patient & module state transition (t = 0 ms)
    if (target) {
      if (nextStatus === "in-progress") {
        // Direct jump to 'entry' (SOAP DPJP Form) with active patient instantly
        handleSelectPatient(target.patient, "entry", "in-progress");
        if (!silent) {
          toast.success(
            `Pasien ${target.patient.name} (${target.queueNumber}) kini sedang diperiksa di ${target.department}. Membuka formulir SOAP DPJP.`,
            { duration: 4000 }
          );
        }
      } else if (nextStatus === "finished") {
        handleSelectPatient(target.patient, "resume", "finished");
        if (!silent) {
          toast.success(
            `Kunjungan pasien ${target.patient.name} (${target.queueNumber}) telah selesai. Menampilkan berkas resume medis.`,
            { duration: 4000 }
          );
        }
      } else {
        handleSelectPatient(target.patient, undefined, "arrived");
        if (!silent) {
          toast.info(`Status antrean ${target.patient.name} diubah menjadi Menunggu.`);
        }
      }
    }
  };

  const departmentWorklist =
    activeDepartment === "Semua Poli"
      ? worklist
      : worklist.filter((w) => w.department === activeDepartment);

  // Explicit Module Switch Handler with Persistence & Instant Top Scroll + Navigation Pulse
  const handleModuleChange = (newMod: EhrModule) => {
    setIsNavigating(true);
    setTimeout(() => setIsNavigating(false), 300);
    setActiveModule(newMod);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("simrs_active_module", newMod);
      } catch {}
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  };

  // Explicit Encounter Switch Handler with Persistence
  const handleSelectEncounter = (encId: string) => {
    setSelectedEncounterId(encId);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("simrs_active_encounter_id", encId);
      } catch {}
    }
  };

  // Explicit Department Switch Handler with Persistence
  const handleDepartmentChange = (newDept: string) => {
    setActiveDepartment(newDept);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("simrs_active_department", newDept);
      } catch {}
    }

    const deptItems =
      newDept === "Semua Poli"
        ? worklist
        : worklist.filter((w) => w.department === newDept);

    const activeItem =
      deptItems.find((w) => w.status === "in-progress") ||
      deptItems.find((w) => w.status === "arrived") ||
      deptItems[0] ||
      null;

    if (activeItem) {
      handleSelectPatient(activeItem.patient);
    }
  };

  const handleCallNextPatient = () => {
    const nextWaiting = departmentWorklist.find((w) => w.status === "arrived");
    if (nextWaiting) {
      handleUpdateQueueStatus(nextWaiting.id, "in-progress");
    } else {
      toast.info(`Belum ada antrean berstatus Menunggu di ${activeDepartment}.`);
    }
  };

  const handleSelectPatient = async (
    selectedPat: PatientProfile,
    forceModule?: EhrModule,
    queueStatusOverride?: "arrived" | "in-progress" | "finished"
  ) => {
    // 1. Immediately update active patient & session storage (Instant t = 0 ms)
    setPatient(selectedPat);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("simrs_active_patient_id", selectedPat.id);
      } catch {}
    }

    // 2. Immediately switch module if forceModule is requested (Zero Blocking Lag!)
    if (forceModule) {
      handleModuleChange(forceModule);
    }

    // 3. Immediately scroll to top
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }

    // 4. Find active queue for this patient to ensure encounter status consistency
    const targetQueue = worklist.find(
      (w) => w.patient.id === selectedPat.id || w.patient.mrn === selectedPat.mrn
    );
    const effectiveStatus = queueStatusOverride || (targetQueue?.status as any);

    // Optimistically assign local matching encounters with synchronized status
    const rawLocalMatch = ALL_SAMPLE_ENCOUNTERS.filter((e) => e.patientId === selectedPat.id);
    const localMatch = rawLocalMatch.map((e) => {
      if (effectiveStatus && (e.queueNumber === targetQueue?.queueNumber || rawLocalMatch.length === 1)) {
        return { ...e, encounterStatus: effectiveStatus };
      }
      return e;
    });

    if (localMatch.length > 0) {
      setEncounters(localMatch);
      let targetEncId = localMatch[0].id;
      if (targetQueue) {
        const matchEnc = localMatch.find(
          (e) => e.queueNumber === targetQueue.queueNumber
        );
        if (matchEnc) {
          targetEncId = matchEnc.id;
        }
      }
      setSelectedEncounterId(targetEncId);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("simrs_active_encounter_id", targetEncId);
        } catch {}
      }
    }

    // 5. Fetch SQLite encounters in non-blocking async background
    setIsDbSyncing(true);
    try {
      const res = await fetch(`/api/encounters?patientId=${selectedPat.id}`);
      let patientEncounters: OutpatientEncounter[] = [];
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          patientEncounters = json.data;
        }
      }

      if (patientEncounters.length === 0) {
        if (localMatch.length > 0) {
          patientEncounters = localMatch;
        } else {
          const draftEnc: OutpatientEncounter = {
            id: `ENC-${selectedPat.id.replace("P-", "")}-DRAFT`,
            patientId: selectedPat.id,
            visitDate: new Date().toISOString(),
            clinicDepartment: targetQueue?.department || activeDepartment,
            doctorName: targetQueue?.doctor || (activeDepartment === "Poli Umum" ? "dr. Amanda Putri, M.Biomed" : "dr. Rian Pratama, Sp.PD"),
            doctorSip: "SIP.446/089/DS/Dinkes/2026",
            doctorIhsId: "N10009841",
            hospitalName: "RS Umum Daerah Sehat Sejahtera",
            hospitalOrgId: "10000004",
            chiefComplaint: targetQueue?.chiefComplaint || "Pemeriksaan dan konsultasi rawat jalan",
            anamnesis: targetQueue?.chiefComplaint
              ? `Pasien mendaftar dengan keluhan: ${targetQueue.chiefComplaint}.`
              : "Menunggu asesmen anamnesis dokter DPJP.",
            vitals: undefined,
            diagnoses: [],
            procedures: [],
            prescriptions: [],
            followUpPlan: {
              instruction: "Menunggu pemeriksaan & instruksi dokter DPJP.",
            },
            dischargeDisposition: effectiveStatus === "finished" ? "Pulang Berobat Jalan" : "Dalam Pelayanan Poli",
            encounterStatus: effectiveStatus || "arrived",
            queueNumber: targetQueue?.queueNumber,
            consentStatus: selectedPat.satusehatConsent || "opt-in",
            syncStatus: "pending",
            syncedAt: undefined,
            satusehatEncounterId: undefined,
          };
          patientEncounters = [draftEnc];
        }
      } else {
        // Synchronize encounterStatus with effectiveStatus or targetQueue if active
        if (effectiveStatus) {
          patientEncounters = patientEncounters.map((e) => {
            if (e.queueNumber === targetQueue?.queueNumber || patientEncounters.length === 1) {
              return { ...e, encounterStatus: effectiveStatus };
            }
            return e;
          });
        }
      }

      setEncounters((prev) => {
        if (patientEncounters.length > 0 && !patientEncounters[0].id.includes("DRAFT")) {
          return patientEncounters;
        }
        const existingRealEnc = prev.filter(
          (e) => e.patientId === selectedPat.id && !e.id.includes("DRAFT")
        );
        if (existingRealEnc.length > 0) {
          return existingRealEnc;
        }
        return patientEncounters;
      });

      let targetEncId = patientEncounters[0]?.id;
      if (targetQueue) {
        const matchEnc = patientEncounters.find(
          (e) => e.queueNumber === targetQueue.queueNumber
        );
        if (matchEnc) {
          targetEncId = matchEnc.id;
        }
      }
      if (targetEncId) {
        setSelectedEncounterId(targetEncId);
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem("simrs_active_encounter_id", targetEncId);
          } catch {}
        }
      }
    } catch (err) {
      console.error("Gagal memuat rekam medis kunjungan pasien:", err);
    } finally {
      setIsDbSyncing(false);
    }
  };

  // Handler saat pasien baru didaftarkan ke antrean poliklinik di loket (Status: Menunggu / Arrived)
  const handleEncounterRegistered = (newEncounter: OutpatientEncounter) => {
    setEncounters((prev) => [newEncounter, ...prev.filter((e) => e.id !== newEncounter.id)]);
    setSelectedEncounterId(newEncounter.id);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("simrs_active_encounter_id", newEncounter.id);
      } catch {}
    }
  };

  // Handler saat dokter DPJP menyelesaikan dan memfinalisasi rekam medis rawat jalan (Status: Selesai / Finished)
  const handleEncounterFinalized = (newEncounter: OutpatientEncounter) => {
    const finalizedEnc: OutpatientEncounter = {
      ...newEncounter,
      encounterStatus: "finished",
    };
    setEncounters((prev) => [finalizedEnc, ...prev.filter((e) => e.id !== finalizedEnc.id)]);
    setSelectedEncounterId(finalizedEnc.id);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("simrs_active_encounter_id", finalizedEnc.id);
      } catch {}
    }

    // Otomatis sinkronkan status pasien di master worklist menjadi "finished"
    setWorklist((prev) =>
      prev.map((item) =>
        item.patient.id === patient.id ||
        (newEncounter.queueNumber && item.queueNumber === newEncounter.queueNumber)
          ? { ...item, status: "finished" }
          : item
      )
    );

    const matchingQueue = worklist.find(
      (item) =>
        item.patient.id === patient.id ||
        (newEncounter.queueNumber && item.queueNumber === newEncounter.queueNumber)
    );
    if (matchingQueue) {
      fetch(`/api/queue/${matchingQueue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "finished" }),
      }).catch((err) => console.error("Gagal update queue status ke DB:", err));
    }

    setActiveModule("resume");
  };

  const [isRetryingSelective, setIsRetryingSelective] = useState(false);

  // Selective / Partial Retry Handler for SATUSEHAT FHIR Resources
  const handleSelectiveRetry = async (targetTypes?: string[]) => {
    if (!selectedEncounter || !patient) return;
    setIsRetryingSelective(true);

    try {
      const res = await fetch("/api/satusehat/sync-retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient,
          encounter: selectedEncounter,
          targetResourceTypes: targetTypes,
          token: session?.accessToken,
          env: currentEnv,
          simulate: !session?.accessToken,
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setEncounters((prev) =>
          prev.map((e) =>
            e.id === selectedEncounter.id
              ? {
                  ...e,
                  syncStatus: data.data.syncStatus,
                  syncedAt: data.data.syncedAt,
                  syncBreakdown: data.data.syncBreakdown,
                  satusehatEncounterId:
                    data.data.satusehatEncounterId || e.satusehatEncounterId,
                }
              : e
          )
        );

        if (data.data.syncStatus === "synced") {
          toast.success("Sinkronisasi ulang berhasil", {
            description: `Seluruh ${data.data.syncedCount || 9} data FHIR telah tersinkronisasi 100% ke cloud SATUSEHAT tanpa duplikasi.`,
            duration: 5000,
          });
        } else {
          toast.info("Memproses sinkronisasi ulang data...", {
            description: `${data.data.syncedCount} berhasil disinkronkan, ${data.data.failedCount} masih menunggu.`,
            duration: 4000,
          });
        }
      } else {
        toast.error("Gagal melakukan sinkronisasi ulang", {
          description: data.error || "Terjadi kendala pada gateway SATUSEHAT.",
        });
      }
    } catch {
      toast.error("Kendala jaringan saat memproses sinkronisasi ulang.");
    } finally {
      setIsRetryingSelective(false);
    }
  };

  // Demo Feature: Simulate Partial Network Drop (e.g. timeout on Prescription & Composition)
  const handleSimulatePartialDrop = () => {
    if (!selectedEncounter) return;
    const currentBreakdown = selectedEncounter.syncBreakdown || [];

    const simulatedBreakdown = currentBreakdown.map((item) => {
      if (
        item.resourceType === "MedicationRequest" ||
        item.resourceType === "Composition"
      ) {
        return {
          ...item,
          status: "failed" as const,
          httpStatus: 504,
          errorMessage:
            "504 Gateway Timeout: Transmisi ke gateway SATUSEHAT terputus di tengah pengiriman.",
        };
      }
      return item;
    });

    setEncounters((prev) =>
      prev.map((e) =>
        e.id === selectedEncounter.id
          ? {
              ...e,
              syncStatus: "partial_failed",
              syncBreakdown: simulatedBreakdown,
            }
          : e
      )
    );

    toast.warning("Simulasi gangguan jaringan diaktifkan", {
      description:
        "Transmisi Resep KFA & Composition disimulasikan gagal (504 Timeout). Buka detail SATUSEHAT untuk mencoba fitur Sinkronisasi Ulang.",
      duration: 6000,
    });
  };

  if (!isHydrated) {
    return <ClinicalSkeleton />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans selection:bg-teal-500/20 selection:text-teal-950">
      {/* 0. TOP ULTRA-SMOOTH MICRO NAVIGATION & SYNC BAR */}
      <div
        className={`fixed top-0 left-0 right-0 z-[100] h-[2.5px] transition-all duration-300 pointer-events-none ${
          isNavigating || isDbSyncing
            ? "opacity-100 bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-600 animate-pulse"
            : "opacity-0"
        }`}
      />

      {/* 1. TOP HEADER (Sticky) */}
      <EhrHeader
        currentEnv={currentEnv}
        onEnvChange={(newEnv) => {
          setCurrentEnv(newEnv);
          setSession(null);
          toast.info(`Mode lingkungan: ${newEnv === "staging" ? "Staging" : "Production"}`);
        }}
        hospitalName={selectedEncounter.hospitalName}
        department={activeDepartment}
        onDepartmentChange={handleDepartmentChange}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
        doctorName={selectedEncounter.doctorName}
        worklist={worklist}
        onSelectPatient={(p, mod) => handleSelectPatient(p, mod || "entry")}
        onOpenRegistration={() => handleModuleChange("registration")}
        isDbSyncing={isDbSyncing}
        isBridgingActive={isBridgingActive}
      />

      {/* 2. HOLY GRAIL LAYOUT BODY (Left Sidebar + Center Canvas + Right Panel) */}
      <div className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar (280px) */}
        {(() => {
          const activeQueueItem = worklist.find(
            (w) => w.patient.id === patient.id || w.patient.mrn === patient.mrn
          );
          
          let effectiveCurrentStatus: "arrived" | "in-progress" | "finished" | "none" = "none";
          if (activeQueueItem) {
            effectiveCurrentStatus = activeQueueItem.status as "arrived" | "in-progress" | "finished";
          } else if (
            selectedEncounter &&
            selectedEncounter.patientId === patient.id &&
            !selectedEncounter.id.includes("DRAFT")
          ) {
            if (selectedEncounter.encounterStatus === "finished") {
              effectiveCurrentStatus = "finished";
            } else if (selectedEncounter.encounterStatus === "in-progress") {
              effectiveCurrentStatus = "in-progress";
            } else if (selectedEncounter.encounterStatus === "arrived") {
              effectiveCurrentStatus = "arrived";
            } else {
              effectiveCurrentStatus = "none";
            }
          } else {
            effectiveCurrentStatus = "none";
          }

          const currentQueueNumber =
            activeQueueItem?.queueNumber ||
            (selectedEncounter?.patientId === patient.id && !selectedEncounter?.id.includes("DRAFT")
              ? selectedEncounter.queueNumber
              : undefined);

          return (
            <EhrLeftSidebar
              patient={patient}
              activeModule={activeModule}
              onModuleChange={handleModuleChange}
              onOpenQrModal={() => setIsQrModalOpen(true)}
              onOpenQueueDisplay={() => setIsQueueDisplayOpen(true)}
              onOpenQueueTicket={() => setIsQueueTicketOpen(true)}
              onOpenPatientCard={() => setIsPatientCardOpen(true)}
              onOpenPrescriptionPrint={() => setIsPrescriptionPrintOpen(true)}
              onOpenLockModal={() => setIsLockModalOpen(true)}
              waitingCount={
                worklist.filter((w) => {
                  if (activeDepartment && activeDepartment !== "Semua Poli" && w.department !== activeDepartment) {
                    return false;
                  }
                  return w.status === "arrived";
                }).length
              }
              currentStatus={effectiveCurrentStatus}
              hasActivePatient={Boolean(patient && patient.id)}
              activeDepartment={activeDepartment}
              queueNumber={currentQueueNumber}
              isBridgingActive={isBridgingActive}
              onCallNextPatient={handleCallNextPatient}
              onOpenRegistration={() => handleModuleChange("registration")}
            />
          );
        })()}

        {/* Center Main Clinical Canvas (Fluid) */}
        <main ref={mainCanvasRef} className="flex-1 min-w-0 space-y-5">
          {/* Module 1: Resume Medis Rawat Jalan (Comprehensive Patient Summary) */}
          {activeModule === "resume" && (
            <div className="space-y-5">
              {/* Clinical Shift Bar with Doctor Greeting & Real-time Queue Stats */}
              <div className="canvas-content">
                <ClinicalShiftBar
                  doctorName={selectedEncounter.doctorName}
                  department={activeDepartment}
                  roomName={
                    worklist.find((w) => w.department === activeDepartment)?.room ||
                    "Ruang Pelayanan 01"
                  }
                  worklist={worklist}
                  currentPatientName={
                    departmentWorklist.length > 0 ? patient.name : undefined
                  }
                  onCallNextPatient={handleCallNextPatient}
                  onOpenWorklist={() => handleModuleChange("registration")}
                />
              </div>

              {/* Patient Profile & Clinical Content OR Empty State */}
              {departmentWorklist.length === 0 ? (
                <div className="canvas-content">
                  <ClinicEmptyState
                    department={activeDepartment}
                    doctorName={selectedEncounter.doctorName}
                    onOpenRegistration={() => handleModuleChange("registration")}
                    onViewAllDepartments={() => handleDepartmentChange("Semua Poli")}
                    onOpenQueueDisplay={() => setIsQueueDisplayOpen(true)}
                  />
                </div>
              ) : (
                <>
                  <div className="canvas-content">
                    <PatientProfileBanner
                      patient={patient}
                      encounter={selectedEncounter}
                      onOpenPrintModal={() => setIsPrintModalOpen(true)}
                      isBridgingActive={isBridgingActive}
                    />
                  </div>

                  {/* 2. Objektif (O): Tanda-Tanda Vital, SpO2, Antropometri & Pemeriksaan Fisik */}
                  <div className="canvas-content">
                    <VitalsCard
                      vitals={selectedEncounter.vitals}
                      recordedDate={selectedEncounter.visitDate}
                    />
                  </div>

                  {/* 3. Subjektif (S) & Assessment (A): Anamnesis, Diagnosis ICD-10, Tindakan & Riwayat */}
                  <div className="canvas-content">
                    <OutpatientTimeline
                      encounters={encounters}
                      selectedEncounterId={selectedEncounterId}
                      onSelectEncounter={handleSelectEncounter}
                    />
                  </div>

                  {/* 4. Plan (P): Resep Obat Elektronik KFA Kemenkes & Jadwal Dosis */}
                  <div className="canvas-content">
                    <MedicationScheduleCard
                      prescriptions={selectedEncounter.prescriptions}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Module: Pendaftaran & Pasien Baru (Loket Onboarding) */}
          {activeModule === "registration" && (
            <div className="space-y-5">
              <div className="canvas-content">
                <PatientRegistrationModule
                  currentPatient={patient}
                  worklist={worklist}
                  onUpdateWorklist={setWorklist}
                  onUpdateStatus={handleUpdateQueueStatus}
                  onSelectPatient={handleSelectPatient}
                  onRegisterNewPatient={(newPat) => {
                    setPatient(newPat);
                    fetch("/api/patients", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(newPat),
                    }).catch((err) => console.error("Gagal simpan pasien baru ke DB:", err));
                  }}
                  onCreateEncounter={handleEncounterRegistered}
                  activeDepartment={activeDepartment}
                  onDepartmentChange={handleDepartmentChange}
                  onOpenQueueTicket={() => setIsQueueTicketOpen(true)}
                />
              </div>
            </div>
          )}

          {/* Module: Penunjang Lab & Radiologi (FHIR ServiceRequest & DiagnosticReport) */}
          {activeModule === "diagnostic" && (
            <div className="space-y-5">
              <div className="canvas-content">
                <DiagnosticSupportModule
                  patient={patient}
                  encounter={selectedEncounter}
                  onUpdateEncounter={async (updated) => {
                    setEncounters((prev) =>
                      prev.map((e) => (e.id === updated.id ? updated : e))
                    );
                    try {
                      await fetch(`/api/encounters/${updated.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(updated),
                      });
                    } catch (err) {
                      console.error("Gagal sinkronisasi order diagnostik ke DB:", err);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Module 2: Pemeriksaan Fisik & TTV */}
          {activeModule === "vitals" && (
            <div className="space-y-5">
              <div className="canvas-content">
                <VitalsCard
                  vitals={selectedEncounter.vitals}
                  recordedDate={selectedEncounter.visitDate}
                />
              </div>

              <div className="canvas-content">
                <OutpatientTimeline
                  encounters={encounters}
                  selectedEncounterId={selectedEncounterId}
                  onSelectEncounter={handleSelectEncounter}
                />
              </div>
            </div>
          )}

          {/* Module 3: Resep Obat & Terapi KFA */}
          {activeModule === "prescriptions" && (
            <div className="space-y-5">
              <div className="canvas-content">
                <MedicationScheduleCard
                  prescriptions={selectedEncounter.prescriptions}
                />
              </div>
            </div>
          )}

          {/* Module 4: Riwayat Kunjungan Poli */}
          {activeModule === "history" && (
            <div className="space-y-5">
              <div className="canvas-content">
                <OutpatientTimeline
                  encounters={encounters}
                  selectedEncounterId={selectedEncounterId}
                  onSelectEncounter={handleSelectEncounter}
                />
              </div>
            </div>
          )}

          {/* Module 5: Input Rekam Medis (Dokter DPJP) */}
          {activeModule === "entry" && (
            <div className="space-y-5">
              <div className="canvas-content">
                <OutpatientEntryForm
                  patient={patient}
                  activeEncounter={selectedEncounter}
                  activeDepartment={activeDepartment}
                  onEncounterCreated={handleEncounterFinalized}
                  token={session?.accessToken}
                  session={session}
                  onNavigateToBridging={() => setActiveModule("auth")}
                />
              </div>
            </div>
          )}

          {/* Module 6: SATUSEHAT Auth & Gateway */}
          {activeModule === "auth" && (
            <div className="space-y-5">
              <div className="canvas-content">
                <AuthCard
                  env={currentEnv}
                  onEnvChange={setCurrentEnv}
                  onAuthSuccess={handleAuthSuccess}
                  onAuthError={() => {}}
                  onLogRequest={handleLogRequest}
                />
              </div>

              {session && (
                <div className="canvas-content">
                  <TokenDisplay
                    session={session}
                    onRefresh={handleRefresh}
                    onVerifyOrg={() => {}}
                    onOpenCodeSnippet={() => setIsCodeSnippetOpen(true)}
                    isRefreshing={isRefreshing}
                  />
                </div>
              )}

              <div className="canvas-content">
                <OrgVerification
                  token={session?.accessToken || ""}
                  env={currentEnv}
                  defaultOrgId={session?.orgId || ""}
                  onLogRequest={handleLogRequest}
                />
              </div>

              <div className="canvas-content">
                <RequestLogs logs={logs} onClearLogs={() => setLogs([])} />
              </div>
            </div>
          )}
        </main>

        {/* Right Clinical Diagnostic & Action Panel (320px) */}
        <EhrRightPanel
          vitals={selectedEncounter.vitals}
          encounter={selectedEncounter}
          session={session}
          patient={patient}
          onOpenPrintModal={() => setIsPrintModalOpen(true)}
          onOpenPrescriptionPrint={() => setIsPrescriptionPrintOpen(true)}
          onOpenLockModal={() => setIsLockModalOpen(true)}
          onOpenCodeSnippet={() => setIsCodeSnippetOpen(true)}
          onRefreshToken={handleRefresh}
          isRefreshing={isRefreshing}
          onSelectiveRetry={handleSelectiveRetry}
          onSimulatePartialDrop={handleSimulatePartialDrop}
          isRetrying={isRetryingSelective}
        />
      </div>

      {/* 3. BOTTOM STATUS BAR (Sticky Footer) */}
      <EhrFooter
        env={currentEnv}
        hospitalName={selectedEncounter.hospitalName}
      />

      {/* Printable Resume Medis Modal */}
      <ResumeMedisPrintModal
        isOpen={isPrintModalOpen}
        onOpenChange={setIsPrintModalOpen}
        patient={patient}
        encounter={selectedEncounter}
      />

      {/* Queue Ticket Print Modal */}
      <QueueTicketPrintModal
        isOpen={isQueueTicketOpen}
        onOpenChange={setIsQueueTicketOpen}
        patient={patient}
        encounter={selectedEncounter}
        worklist={worklist}
      />

      {/* Patient Card & Barcode Modal */}
      <PatientCardPrintModal
        isOpen={isPatientCardOpen}
        onOpenChange={setIsPatientCardOpen}
        patient={patient}
        hospitalName={selectedEncounter.hospitalName}
      />

      {/* E-Prescription Print Modal */}
      <PrescriptionPrintModal
        isOpen={isPrescriptionPrintOpen}
        onOpenChange={setIsPrescriptionPrintOpen}
        patient={patient}
        encounter={selectedEncounter}
      />

      {/* Record Lock & Addendum Modal */}
      <MedicalRecordLockModal
        isOpen={isLockModalOpen}
        onOpenChange={setIsLockModalOpen}
        encounter={selectedEncounter}
        onUpdateEncounter={async (updated) => {
          setEncounters((prev) =>
            prev.map((e) => (e.id === updated.id ? updated : e))
          );
          try {
            await fetch(`/api/encounters/${updated.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updated),
            });
          } catch (err) {
            console.error("Gagal sinkronisasi update encounter ke database:", err);
          }
        }}
      />

      {/* Public Queue TV Display Modal */}
      <PublicQueueDisplayModal
        isOpen={isQueueDisplayOpen}
        onOpenChange={setIsQueueDisplayOpen}
        hospitalName={selectedEncounter.hospitalName}
        worklist={worklist}
        onUpdateStatus={handleUpdateQueueStatus}
        onSelectPatient={handleSelectPatient}
      />

      {/* Multi-Language Code Generator Modal */}
      <CodeSnippetModal
        isOpen={isCodeSnippetOpen}
        onOpenChange={setIsCodeSnippetOpen}
        env={currentEnv}
        clientId={session?.clientIdMasked}
        patient={patient}
        encounter={selectedEncounter}
      />

      {/* Patient QR Code Modal */}
      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
        <DialogContent className="max-w-sm max-h-[85vh] p-6 bg-white rounded-3xl">
          <DialogHeader className="px-6 text-center sm:text-center">
            <DialogTitle className="text-center text-base font-bold text-slate-900 tracking-tight">
              Identitas Pasien SATUSEHAT
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-3.5 py-2">
            <div className="h-44 w-44 rounded-2xl bg-white p-3 border-2 border-slate-200 shadow-md flex items-center justify-center">
              <div className="h-full w-full bg-slate-900 rounded-xl flex flex-col items-center justify-center text-white text-[10px] font-mono p-2">
                <QrCode className="h-20 w-20 text-teal-400 mb-1" />
                <span>{patient.id}</span>
                <span className="text-[8px] text-slate-400">KEMENKES RI</span>
              </div>
            </div>
            <div className="space-y-0.5 text-center">
              <p className="font-bold text-sm text-slate-900">{patient.name}</p>
              <p className="text-xs text-slate-500 font-mono">NIK: {patient.nik}</p>
            </div>
            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              Tunjukkan QR Code ini kepada petugas pendaftaran RS/Klinik.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
