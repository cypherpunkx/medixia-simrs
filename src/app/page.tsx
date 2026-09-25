"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { EhrHeader } from "@/components/layout/EhrHeader";
import { EhrLeftSidebar, EhrModule } from "@/components/layout/EhrLeftSidebar";
import { EhrRightPanel } from "@/components/layout/EhrRightPanel";
import { EhrFooter } from "@/components/layout/EhrFooter";
import { ClinicalSkeleton } from "@/components/layout/ClinicalSkeleton";
import { PatientProfileBanner } from "@/components/patient/PatientProfileBanner";
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
import {
  AuthSession,
  ClinicQueuePatientItem,
  OutpatientEncounter,
  PatientProfile,
  SatusehatEnvironment,
} from "@/lib/satusehat/types";
import { ModuleEmptyState } from "@/components/layout/ModuleEmptyState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { QrCode, Loader2, Hospital, Pill, Activity, Calendar, Shield, ArrowRight, AlertTriangle, Archive } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { generateUUIDv7, generatePrefixedId } from "@/lib/id-generator";
import { toast } from "sonner";

gsap.registerPlugin(useGSAP);

export default function HomePage() {
  const router = useRouter();
  const { user, facility, departments, isLoading } = useAuth();
  const [activeDepartment, setActiveDepartment] = useState("Poli Penyakit Dalam");
  const [activeModule, setActiveModule] = useState<EhrModule>("resume");
  const [currentEnv, setCurrentEnv] = useState<SatusehatEnvironment>(
    (process.env.NEXT_PUBLIC_SATUSEHAT_ENV as SatusehatEnvironment) || "staging"
  );
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [encounters, setEncounters] = useState<OutpatientEncounter[]>([]);
  const [worklist, setWorklist] = useState<ClinicQueuePatientItem[]>([]);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isDbSyncing, setIsDbSyncing] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Authentication Route Guard
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  // Sync active department with facility's departments list
  useEffect(() => {
    if (departments && departments.length > 0) {
      const deptNames = departments.map((d) => d.name);
      if (activeDepartment !== "Semua Poli" && !deptNames.includes(activeDepartment)) {
        setActiveDepartment(departments[0].name);
      }
    }
  }, [departments, activeDepartment]);

  // Adjust default active module based on user role if first visit
  useEffect(() => {
    if (user?.role === "registration") {
      const savedMod = typeof window !== "undefined" ? sessionStorage.getItem("simrs_active_module") : null;
      if (!savedMod) {
        setActiveModule("registration");
      }
    } else if (user?.role === "admin") {
      const savedMod = typeof window !== "undefined" ? sessionStorage.getItem("simrs_active_module") : null;
      if (!savedMod) {
        setActiveModule("auth");
      }
    }
  }, [user?.role]);

  // Dynamic DPJP & Practitioner Resolver Helper strictly scoped to facility context
  const resolveDepartmentDoctor = (deptName?: string) => {
    const dept = deptName && deptName !== "Semua Poli" ? deptName : activeDepartment;
    const matchedDept = departments.find((d) => d.name === dept);
    if (user?.role === "doctor" && (!user.department || user.department === dept || dept === "Semua Poli")) {
      return {
        doctorId: user.id,
        departmentId: matchedDept?.id || user.departmentId,
        doctorName: user.name,
        doctorIhsId: user.ihsPractitionerId || "",
        doctorSip: user.sip || "",
      };
    }
    if (matchedDept?.defaultDoctorName) {
      return {
        doctorId: undefined,
        departmentId: matchedDept.id,
        doctorName: matchedDept.defaultDoctorName,
        doctorIhsId: user?.ihsPractitionerId || "",
        doctorSip: user?.sip || "",
      };
    }
    return {
      doctorId: undefined,
      departmentId: matchedDept?.id,
      doctorName: user?.role === "doctor" ? user.name : "",
      doctorIhsId: user?.ihsPractitionerId || "",
      doctorSip: user?.sip || "",
    };
  };

  // Initial Load from SQLite DB with Context Persistence & Multi-Facility Scoping
  useEffect(() => {
    let isMounted = true;

    // Restore saved user context if page was refreshed
    const savedDept = typeof window !== "undefined" ? sessionStorage.getItem("simrs_active_department") : null;
    const savedMod = typeof window !== "undefined" ? sessionStorage.getItem("simrs_active_module") : null;
    const savedPatientId = typeof window !== "undefined" ? sessionStorage.getItem("simrs_active_patient_id") : null;
    const savedEncId = typeof window !== "undefined" ? sessionStorage.getItem("simrs_active_encounter_id") : null;

    const loadDbData = async () => {
      try {
        const activeFacId = facility?.id || user?.facilityId;
        const queueUrl = activeFacId ? `/api/queue?facilityId=${encodeURIComponent(activeFacId)}` : "/api/queue";

        const [pRes, qRes, encRes] = await Promise.all([
          fetch("/api/patients", { cache: "no-store" }),
          fetch(queueUrl, { cache: "no-store" }),
          fetch("/api/encounters", { cache: "no-store" }),
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

        const availableDeptNames = departments && departments.length > 0 ? departments.map((d) => d.name) : [];
        let effectiveDept = savedDept;
        if (!effectiveDept || (effectiveDept !== "Semua Poli" && availableDeptNames.length > 0 && !availableDeptNames.includes(effectiveDept))) {
          effectiveDept = availableDeptNames[0] || "Poli Umum";
        }
        if (!effectiveDept) {
          effectiveDept = "Poli Umum";
        }

        const effectiveMod = (savedMod as EhrModule) || "resume";
        const allPatientsSource = loadedPatients;
        const queueSource = loadedQueue;
        const allEncountersSource = loadedEncounters;

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
          } else if (allPatientsSource.length > 0) {
            selectedPat = allPatientsSource[0];
          } else {
            selectedPat = null;
          }
        }

        // 2. Resolve patient's specific encounters (strictly isolated to selectedPat)
        let patientEncounters: OutpatientEncounter[] = [];
        if (selectedPat) {
          patientEncounters = allEncountersSource.filter(
            (e) => e.patientId === selectedPat?.id
          );

          if (patientEncounters.length > 0) {
            patientEncounters = patientEncounters.map((e) => {
              const matchedQ = queueSource.find(
                (w) =>
                  (w.queueNumber && e.queueNumber && w.queueNumber === e.queueNumber) ||
                  (w.registrationNumber && e.registrationNumber && w.registrationNumber === e.registrationNumber)
              );
              if (matchedQ) {
                // If encounter in DB is already finished, do NOT downgrade it back to in-progress or arrived
                if (e.encounterStatus === "finished" && matchedQ.status !== "finished") {
                  return e;
                }
                return { ...e, encounterStatus: matchedQ.status as any };
              }
              return e;
            });
          }

          const patientTodayQueue =
            queueSource.find(
              (w) =>
                w.patient.id === selectedPat?.id &&
                (effectiveDept === "Semua Poli" || w.department === effectiveDept) &&
                (w.status === "in-progress" || w.status === "arrived")
            ) ||
            queueSource.find(
              (w) =>
                w.patient.id === selectedPat?.id &&
                (w.status === "in-progress" || w.status === "arrived")
            ) ||
            queueSource.find(
              (w) =>
                w.patient.id === selectedPat?.id &&
                (effectiveDept === "Semua Poli" || w.department === effectiveDept)
            ) ||
            queueSource.find((w) => w.patient.id === selectedPat?.id);

          if (patientTodayQueue) {
            const hasMatchedEnc = patientEncounters.some(
              (e) =>
                (patientTodayQueue.queueNumber && e.queueNumber === patientTodayQueue.queueNumber) ||
                (patientTodayQueue.registrationNumber && e.registrationNumber === patientTodayQueue.registrationNumber) ||
                (patientTodayQueue.encounterId && e.id === patientTodayQueue.encounterId) ||
                (patientTodayQueue.id && (e.id === patientTodayQueue.id || e.id === patientTodayQueue.encounterId))
            );

            if (!hasMatchedEnc && patientEncounters.length === 0) {
              const deptName =
                patientTodayQueue.department ||
                (effectiveDept !== "Semua Poli" ? effectiveDept : (departments[0]?.name || "Poli Rawat Jalan"));
              const docInfo = resolveDepartmentDoctor(deptName);
              const doctorName = patientTodayQueue.doctor || docInfo.doctorName;

              const draftEnc: OutpatientEncounter = {
                id: `ENC-${selectedPat.id.replace("P-", "")}-${patientTodayQueue.queueNumber || "DRAFT"}`,
                patientId: selectedPat.id,
                facilityId: facility?.id || user?.facilityId,
                departmentId: docInfo.departmentId,
                doctorId: docInfo.doctorId,
                visitDate: new Date().toISOString(),
                clinicDepartment: deptName,
                doctorName: doctorName,
                doctorSip: docInfo.doctorSip,
                doctorIhsId: docInfo.doctorIhsId,
                hospitalName: facility?.name || user?.facilityName || "Fasilitas Pelayanan Kesehatan",
                hospitalOrgId: facility?.satusehatOrgId || "",
                chiefComplaint: patientTodayQueue.chiefComplaint || "Pemeriksaan dan konsultasi rawat jalan",
                anamnesis: patientTodayQueue.chiefComplaint
                  ? `Pasien mendaftar dengan keluhan: ${patientTodayQueue.chiefComplaint}.`
                  : "Menunggu asesmen anamnesis dokter DPJP.",
                vitals: undefined,
                diagnoses: [],
                procedures: [],
                prescriptions: [],
                followUpPlan: {
                  instruction: "Menunggu pemeriksaan & instruksi dokter DPJP.",
                },
                dischargeDisposition: patientTodayQueue.status === "finished" ? "Pulang Berobat Jalan" : "Dalam Pelayanan Poli",
                encounterStatus: (patientTodayQueue.status as any) || "arrived",
                queueNumber: patientTodayQueue.queueNumber,
                registrationNumber: patientTodayQueue.registrationNumber,
                consentStatus: selectedPat.satusehatConsent || "opt-in",
                syncStatus: "pending",
                syncedAt: undefined,
                satusehatEncounterId: undefined,
              };
              patientEncounters = [draftEnc];
            }
          } else if (patientEncounters.length === 0) {
            const deptName =
              effectiveDept !== "Semua Poli" ? effectiveDept : (departments[0]?.name || "Poli Rawat Jalan");
            const docInfo = resolveDepartmentDoctor(deptName);

            const draftEnc: OutpatientEncounter = {
              id: `ENC-${selectedPat.id.replace("P-", "")}-DRAFT`,
              patientId: selectedPat.id,
              facilityId: facility?.id || user?.facilityId,
              departmentId: docInfo.departmentId,
              doctorId: docInfo.doctorId,
              visitDate: new Date().toISOString(),
              clinicDepartment: deptName,
              doctorName: docInfo.doctorName,
              doctorSip: docInfo.doctorSip,
              doctorIhsId: docInfo.doctorIhsId,
              hospitalName: facility?.name || user?.facilityName || "Fasilitas Pelayanan Kesehatan",
              hospitalOrgId: facility?.satusehatOrgId || "",
              chiefComplaint: "Pemeriksaan dan konsultasi rawat jalan",
              anamnesis: "Menunggu asesmen anamnesis dokter DPJP.",
              vitals: undefined,
              diagnoses: [],
              procedures: [],
              prescriptions: [],
              followUpPlan: {
                instruction: "Menunggu pemeriksaan & instruksi dokter DPJP.",
              },
              dischargeDisposition: "Dalam Pelayanan Poli",
              encounterStatus: "arrived",
              consentStatus: selectedPat.satusehatConsent || "opt-in",
              syncStatus: "pending",
              syncedAt: undefined,
              satusehatEncounterId: undefined,
            };
            patientEncounters = [draftEnc];
          }
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
        setPatient(selectedPat);
        if (selectedPat) {
          try {
            sessionStorage.setItem("simrs_active_patient_id", selectedPat.id);
          } catch {}
        }
        setEncounters(patientEncounters);
        setSelectedEncounterId(targetEncId || null);
        if (targetEncId) {
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
  }, [facility?.id, user?.facilityId, departments]);

  // Modals
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isQueueTicketOpen, setIsQueueTicketOpen] = useState(false);
  const [ticketQueueItem, setTicketQueueItem] = useState<ClinicQueuePatientItem | null>(null);
  const [isPatientCardOpen, setIsPatientCardOpen] = useState(false);
  const [isPrescriptionPrintOpen, setIsPrescriptionPrintOpen] = useState(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isQueueDisplayOpen, setIsQueueDisplayOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Auth & Gateway State
  const [session, setSession] = useState<AuthSession | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Single-Tenant: Auto-connect SATUSEHAT session on app startup dynamically from server ENV
  useEffect(() => {
    async function autoFetchSatusehat() {
      try {
        const res = await fetch(`/api/satusehat/auth`);
        const data = await res.json();
        if (data.success && data.data) {
          setSession(data.data);
          if (data.data.env && data.data.env !== currentEnv) {
            setCurrentEnv(data.data.env);
          }
        }
      } catch (err) {
        console.warn("Auto SATUSEHAT handshake error:", err);
      }
    }
    autoFetchSatusehat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isBridgingActive = Boolean(session?.accessToken && session.expiresAt > Date.now());

  const mainCanvasRef = useRef<HTMLDivElement>(null);
  const selectedEncounter: OutpatientEncounter | null = (() => {
    // 0. Filter encounters strictly within active patient context
    const patientEncounters = patient
      ? encounters.filter((e) => e.patientId === patient.id || !e.patientId)
      : encounters;

    // 1. Explicit match by selectedEncounterId
    if (selectedEncounterId) {
      const match = patientEncounters.find((e) => e.id === selectedEncounterId);
      if (match) return match;
    }

    // 2. In Resume Medis module, prioritize finished encounters that contain clinical data (TTV / diagnosa)
    if (activeModule === "resume") {
      const finishedWithData = patientEncounters.find(
        (e) => e.encounterStatus === "finished" && (e.vitals || (e.diagnoses && e.diagnoses.length > 0))
      );
      if (finishedWithData) return finishedWithData;

      const anyFinished = patientEncounters.find((e) => e.encounterStatus === "finished");
      if (anyFinished) return anyFinished;
    }

    // 3. For Entry/Doctor module, prefer active (in-progress / arrived) encounter
    const activeMatch = patientEncounters.find(
      (e) => e.encounterStatus === "in-progress" || e.encounterStatus === "arrived"
    );
    if (activeMatch) return activeMatch;

    // 4. Department match if filtered
    if (activeDepartment && activeDepartment !== "Semua Poli") {
      const deptMatch = patientEncounters.find((e) => e.clinicDepartment === activeDepartment);
      if (deptMatch) return deptMatch;
    }

    return patientEncounters[0] || null;
  })();

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
  }, [activeModule, patient?.id, isHydrated]);

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
      id: generateUUIDv7(),
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
    if (newSession.env && newSession.env !== currentEnv) {
      setCurrentEnv(newSession.env);
    }
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
          return { ...item, status: nextStatus, pausedReason: undefined };
        }
        if (previousActiveInSameDept && item.id === previousActiveInSameDept.id) {
          // KESELAMATAN KLINIS: Pasien aktif sebelumnya TIDAK BOLEH difinish tanpa diagnosa/SOAP.
          // Kembalikan ke antrean menunggu dengan catatan ditunda sementara.
          return {
            ...item,
            status: "arrived",
            pausedReason: "Pemeriksaan ditunda sementara (ruang periksa dialihkan)",
          };
        }
        return item;
      })
    );

    // 2. Synchronously update encounters state for the specific target queue item
    if (target) {
      setEncounters((prev) =>
        prev.map((e) => {
          const isTargetMatch =
            (target.queueNumber && e.queueNumber === target.queueNumber) ||
            (target.registrationNumber && e.registrationNumber === target.registrationNumber) ||
            (target.encounterId && e.id === target.encounterId) ||
            (target.id && (e.id === target.id || e.id === target.encounterId));
          if (isTargetMatch) {
            return { ...e, encounterStatus: nextStatus };
          }
          return e;
        })
      );
    }
    if (previousActiveInSameDept) {
      setEncounters((prev) =>
        prev.map((e) => {
          const isPrevMatch =
            (previousActiveInSameDept.queueNumber && e.queueNumber === previousActiveInSameDept.queueNumber) ||
            (previousActiveInSameDept.registrationNumber && e.registrationNumber === previousActiveInSameDept.registrationNumber) ||
            (previousActiveInSameDept.encounterId && e.id === previousActiveInSameDept.encounterId) ||
            (previousActiveInSameDept.id && (e.id === previousActiveInSameDept.id || e.id === previousActiveInSameDept.encounterId));
          if (isPrevMatch) {
            return { ...e, encounterStatus: "arrived" };
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
        body: JSON.stringify({
          status: "arrived",
          pausedReason: "Pemeriksaan ditunda sementara",
        }),
      }).catch((err) => {
        console.error("Gagal menunda previous patient di DB:", err);
      });
    }

    // 4. Immediate synchronous patient & module state transition (t = 0 ms)
    if (target) {
      if (nextStatus === "in-progress") {
        // Direct jump to 'entry' (SOAP DPJP Form) with active patient instantly
        handleSelectPatient(target.patient, "entry", "in-progress", target, target.department);
        if (!silent) {
          toast.success(
            `Pasien ${target.patient.name} (${target.queueNumber}) kini sedang diperiksa di ${target.department}. Membuka formulir SOAP DPJP.`,
            { duration: 4000 }
          );
        }
      } else if (nextStatus === "finished") {
        handleSelectPatient(target.patient, "resume", "finished", target, target.department);
        if (!silent) {
          toast.success(
            `Kunjungan pasien ${target.patient.name} (${target.queueNumber}) telah selesai. Menampilkan berkas resume medis.`,
            { duration: 4000 }
          );
        }
      } else {
        handleSelectPatient(target.patient, undefined, "arrived", target, target.department);
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
    queueStatusOverride?: "arrived" | "in-progress" | "finished",
    targetQueueItemOrNumber?: ClinicQueuePatientItem | string,
    targetDepartment?: string
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
    const targetQueue =
      typeof targetQueueItemOrNumber === "object" && targetQueueItemOrNumber
        ? targetQueueItemOrNumber
        : typeof targetQueueItemOrNumber === "string"
        ? worklist.find((w) => w.queueNumber === targetQueueItemOrNumber || w.id === targetQueueItemOrNumber)
        : targetDepartment && targetDepartment !== "Semua Poli"
        ? worklist.find(
            (w) =>
              (w.patient.id === selectedPat.id || w.patient.mrn === selectedPat.mrn) &&
              w.department === targetDepartment
          )
        // 1. Prioritize active waiting/in-progress queue across any department
        : worklist.find(
            (w) =>
              (w.patient.id === selectedPat.id || w.patient.mrn === selectedPat.mrn) &&
              (w.status === "in-progress" || w.status === "arrived")
          ) ||
          // 2. Currently active encounter if already selected for this patient
          (selectedEncounter && selectedEncounter.patientId === selectedPat.id
            ? worklist.find(
                (w) =>
                  (w.patient.id === selectedPat.id || w.patient.mrn === selectedPat.mrn) &&
                  (w.id === selectedEncounter.id ||
                    (w.queueNumber && w.queueNumber === selectedEncounter.queueNumber) ||
                    (w.registrationNumber && w.registrationNumber === selectedEncounter.registrationNumber) ||
                    (w.encounterId && w.encounterId === selectedEncounter.id))
              )
            : null) ||
          // 3. Department match if filtered
          (activeDepartment && activeDepartment !== "Semua Poli"
            ? worklist.find(
                (w) =>
                  (w.patient.id === selectedPat.id || w.patient.mrn === selectedPat.mrn) &&
                  w.department === activeDepartment
              )
            : null) ||
          // 4. Fallback: most recent queue item for this patient
          [...worklist]
            .reverse()
            .find((w) => w.patient.id === selectedPat.id || w.patient.mrn === selectedPat.mrn);

    const effectiveStatus = queueStatusOverride || (targetQueue?.status as any);

    // Optimistically assign matching encounters with synchronized status
    const rawLocalMatch = encounters.filter((e) => e.patientId === selectedPat.id);
    const localMatch = rawLocalMatch.map((e) => {
      if (
        effectiveStatus &&
        targetQueue &&
        ((targetQueue.queueNumber && e.queueNumber === targetQueue.queueNumber) ||
          (targetQueue.registrationNumber && e.registrationNumber === targetQueue.registrationNumber) ||
          (targetQueue.encounterId && e.id === targetQueue.encounterId) ||
          (targetQueue.id && (e.id === targetQueue.id || e.id === targetQueue.encounterId)))
      ) {
        return { ...e, encounterStatus: effectiveStatus };
      }
      return e;
    });

    if (localMatch.length > 0) {
      setEncounters(localMatch);
      let targetEncId: string | undefined = undefined;
      if (targetQueue) {
        const matchEnc = localMatch.find(
          (e) =>
            (targetQueue.encounterId && e.id === targetQueue.encounterId) ||
            (targetQueue.registrationNumber && e.registrationNumber === targetQueue.registrationNumber) ||
            (targetQueue.queueNumber && e.queueNumber === targetQueue.queueNumber) ||
            (targetQueue.id && (e.id === targetQueue.id || e.id === targetQueue.encounterId))
        );
        if (matchEnc) {
          targetEncId = matchEnc.id;
        }
      } else {
        const activeEnc = localMatch.find(
          (e) => e.encounterStatus === "in-progress" || e.encounterStatus === "arrived"
        );
        targetEncId = activeEnc?.id || localMatch[0]?.id;
      }
      if (targetEncId) {
        setSelectedEncounterId(targetEncId);
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem("simrs_active_encounter_id", targetEncId);
          } catch {}
        }
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

      // Filter out stale draft encounters from localMatch if DB has real encounters
      const cleanLocalMatch = localMatch.filter((e) => !e.id.includes("-DRAFT"));

      if (patientEncounters.length === 0) {
        if (cleanLocalMatch.length > 0) {
          patientEncounters = cleanLocalMatch;
        } else {
          const deptName =
            targetQueue?.department ||
            (activeDepartment !== "Semua Poli" ? activeDepartment : (departments[0]?.name || "Poli Rawat Jalan"));
          const docInfo = resolveDepartmentDoctor(deptName);
          const doctorName = targetQueue?.doctor || docInfo.doctorName;

          const draftEnc: OutpatientEncounter = {
            id: `ENC-${selectedPat.id.replace("P-", "")}-DRAFT`,
            patientId: selectedPat.id,
            facilityId: facility?.id || user?.facilityId,
            departmentId: docInfo.departmentId,
            doctorId: docInfo.doctorId,
            visitDate: new Date().toISOString(),
            clinicDepartment: deptName,
            doctorName: doctorName,
            doctorSip: docInfo.doctorSip,
            doctorIhsId: docInfo.doctorIhsId,
            hospitalName: facility?.name || user?.facilityName || "Fasilitas Pelayanan Kesehatan",
            hospitalOrgId: facility?.satusehatOrgId || "",
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
            registrationNumber: targetQueue?.registrationNumber,
            consentStatus: selectedPat.satusehatConsent || "opt-in",
            syncStatus: "pending",
            syncedAt: undefined,
            satusehatEncounterId: undefined,
          };
          patientEncounters = [draftEnc];
        }
      } else {
        // If patient has existing encounters in DB, synchronize encounterStatus with effectiveStatus
        if (effectiveStatus) {
          patientEncounters = patientEncounters.map((e) => {
            const isMatch =
              targetQueue &&
              ((targetQueue.queueNumber && e.queueNumber === targetQueue.queueNumber) ||
                (targetQueue.registrationNumber && e.registrationNumber === targetQueue.registrationNumber) ||
                (targetQueue.encounterId && e.id === targetQueue.encounterId) ||
                (targetQueue.id && (e.id === targetQueue.id || e.id === targetQueue.encounterId)));
            if (isMatch) {
              return { ...e, encounterStatus: effectiveStatus };
            }
            return e;
          });
        }
      }

      setEncounters((prev) => {
        const hasRealEncounters = patientEncounters.some((e) => !e.id.includes("-DRAFT"));
        const merged = [...patientEncounters];

        prev.forEach((prevEnc) => {
          if (prevEnc.patientId === selectedPat.id) {
            // Drop stale draft if real encounter exists
            if (hasRealEncounters && prevEnc.id.includes("-DRAFT")) {
              return;
            }
            if (
              !merged.some(
                (m) =>
                  m.id === prevEnc.id ||
                  (m.queueNumber && prevEnc.queueNumber && m.queueNumber === prevEnc.queueNumber) ||
                  (m.clinicDepartment === prevEnc.clinicDepartment &&
                    new Date(m.visitDate).toDateString() === new Date(prevEnc.visitDate).toDateString() &&
                    prevEnc.id.includes("-DRAFT"))
              )
            ) {
              if (prevEnc.encounterStatus === "arrived" || prevEnc.encounterStatus === "in-progress") {
                merged.unshift(prevEnc);
              } else {
                merged.push(prevEnc);
              }
            }
          }
        });

        // Deduplicate uniquely by ID
        const uniqueMap = new Map<string, OutpatientEncounter>();
        merged.forEach((item) => {
          if (!uniqueMap.has(item.id)) {
            uniqueMap.set(item.id, item);
          }
        });
        return Array.from(uniqueMap.values());
      });

      let targetEncId: string | undefined = undefined;
      if (targetQueue) {
        const matchEnc =
          patientEncounters.find(
            (e) =>
              (targetQueue.encounterId && e.id === targetQueue.encounterId) ||
              (targetQueue.registrationNumber && e.registrationNumber === targetQueue.registrationNumber) ||
              (targetQueue.queueNumber && e.queueNumber === targetQueue.queueNumber) ||
              (targetQueue.id && (e.id === targetQueue.id || e.id === targetQueue.encounterId))
          ) ||
          localMatch.find(
            (e) =>
              (targetQueue.encounterId && e.id === targetQueue.encounterId) ||
              (targetQueue.registrationNumber && e.registrationNumber === targetQueue.registrationNumber) ||
              (targetQueue.queueNumber && e.queueNumber === targetQueue.queueNumber) ||
              (targetQueue.id && (e.id === targetQueue.id || e.id === targetQueue.encounterId))
          );

        if (matchEnc) {
          targetEncId = matchEnc.id;
        } else {
          // Antrean spesifik ini belum memiliki encounter di DB maupun local state.
          // Buatkan sesi encounter baru khusus untuk antrean ini (BUKAN mengambil encounter lama yang sudah selesai!)
          const deptName =
            targetQueue.department ||
            (activeDepartment !== "Semua Poli" ? activeDepartment : (departments[0]?.name || "Poli Rawat Jalan"));
          const docInfo = resolveDepartmentDoctor(deptName);
          const doctorName = targetQueue.doctor || docInfo.doctorName;
          const newTargetEncId = targetQueue.encounterId || generatePrefixedId("enc_");

          const newTargetEnc: OutpatientEncounter = {
            id: newTargetEncId,
            patientId: selectedPat.id,
            facilityId: facility?.id || user?.facilityId,
            departmentId: targetQueue.departmentId || docInfo.departmentId,
            doctorId: targetQueue.doctorId || docInfo.doctorId,
            visitDate: new Date().toISOString(),
            clinicDepartment: deptName,
            doctorName: doctorName,
            doctorSip: docInfo.doctorSip,
            doctorIhsId: docInfo.doctorIhsId,
            hospitalName: facility?.name || user?.facilityName || "Fasilitas Pelayanan Kesehatan",
            hospitalOrgId: facility?.satusehatOrgId || "",
            chiefComplaint: targetQueue.chiefComplaint || "Pemeriksaan dan konsultasi rawat jalan",
            anamnesis: targetQueue.chiefComplaint
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
            encounterStatus: effectiveStatus || (targetQueue.status as any) || "in-progress",
            queueNumber: targetQueue.queueNumber,
            registrationNumber: targetQueue.registrationNumber,
            consentStatus: selectedPat.satusehatConsent || "opt-in",
            syncStatus: "pending",
            syncedAt: undefined,
            satusehatEncounterId: undefined,
          };

          targetEncId = newTargetEnc.id;
          if (!targetQueue.encounterId) {
            targetQueue.encounterId = newTargetEnc.id;
          }

          setEncounters((prev) => [newTargetEnc, ...prev.filter((e) => e.id !== newTargetEnc.id)]);

          // Simpan encounter baru ini ke DB agar persisten
          fetch("/api/encounters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ encounter: newTargetEnc, patientId: selectedPat.id }),
          }).catch((err) => console.error("Gagal simpan encounter baru ke DB:", err));
        }
      }

      if (!targetEncId) {
        // Prioritaskan encounter yang saat ini sedang aktif dipilih di UI jika masih in-progress atau arrived
        const currentActive = encounters.find(
          (e) =>
            e.id === selectedEncounterId &&
            e.patientId === selectedPat.id &&
            (e.encounterStatus === "in-progress" || e.encounterStatus === "arrived")
        );
        if (currentActive) {
          targetEncId = currentActive.id;
        } else {
          const activeEnc =
            patientEncounters.find(
              (e) => e.encounterStatus === "in-progress" || e.encounterStatus === "arrived"
            ) ||
            localMatch.find(
              (e) => e.encounterStatus === "in-progress" || e.encounterStatus === "arrived"
            );
          if (activeEnc) {
            targetEncId = activeEnc.id;
          } else {
            targetEncId = patientEncounters[0]?.id || localMatch[0]?.id;
          }
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
  const handleEncounterRegistered = (newEncounter: OutpatientEncounter, updatedPatient?: PatientProfile) => {
    if (updatedPatient) {
      setPatient(updatedPatient);
    }
    setEncounters((prev) => [
      newEncounter,
      ...prev.filter(
        (e) =>
          e.id !== newEncounter.id &&
          !e.id.includes("-DRAFT") &&
          !(e.patientId === newEncounter.patientId && e.clinicDepartment === newEncounter.clinicDepartment && !e.queueNumber)
      ),
    ]);
    setSelectedEncounterId(newEncounter.id);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("simrs_active_encounter_id", newEncounter.id);
        if (newEncounter.patientId) {
          sessionStorage.setItem("simrs_active_patient_id", newEncounter.patientId);
        }
      } catch {}
    }
  };

  // Handler saat dokter DPJP menyelesaikan dan memfinalisasi rekam medis rawat jalan (Status: Selesai / Finished)
  const handleEncounterFinalized = (newEncounter: OutpatientEncounter) => {
    const finalizedEnc: OutpatientEncounter = {
      ...newEncounter,
      encounterStatus: "finished",
      dischargeDisposition:
        !newEncounter.dischargeDisposition || newEncounter.dischargeDisposition === "Menunggu Pelayanan Poli"
          ? "Pulang Berobat Jalan"
          : newEncounter.dischargeDisposition,
    };
    setEncounters((prev) => [
      finalizedEnc,
      ...prev.filter(
        (e) =>
          e.id !== finalizedEnc.id &&
          !e.id.includes("-DRAFT")
      ),
    ]);
    setSelectedEncounterId(finalizedEnc.id);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("simrs_active_encounter_id", finalizedEnc.id);
        if (finalizedEnc.patientId) {
          sessionStorage.setItem("simrs_active_patient_id", finalizedEnc.patientId);
        }
      } catch {}
    }

    // Otomatis sinkronkan status pasien di master worklist menjadi "finished" & "synced" untuk antrean terkait
    const isSynced = finalizedEnc.syncStatus === "synced" || Boolean(finalizedEnc.satusehatEncounterId);

    const isQueueMatching = (item: ClinicQueuePatientItem) => {
      const isDirectMatch =
        (newEncounter.queueNumber && item.queueNumber === newEncounter.queueNumber) ||
        (newEncounter.registrationNumber && item.registrationNumber === newEncounter.registrationNumber) ||
        (item.encounterId && item.encounterId === newEncounter.id) ||
        (item.id === newEncounter.id);

      const isPatientActiveQueue =
        (item.patient.id === newEncounter.patientId || (patient && (item.patient.id === patient.id || item.patient.mrn === patient.mrn))) &&
        (item.status === "in-progress" || item.status === "arrived") &&
        (!newEncounter.clinicDepartment || item.department === newEncounter.clinicDepartment || newEncounter.clinicDepartment === "Semua Poli");

      return isDirectMatch || isPatientActiveQueue;
    };

    setWorklist((prev) =>
      prev.map((item) => {
        return isQueueMatching(item)
          ? {
              ...item,
              status: "finished",
              encounterId: finalizedEnc.id,
              satusehatStatus: isSynced ? "synced" : item.satusehatStatus,
            }
          : item;
      })
    );

    const matchingQueue = worklist.find(isQueueMatching);
    if (matchingQueue) {
      fetch(`/api/queue/${matchingQueue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "finished",
          encounterId: finalizedEnc.id,
          satusehatStatus: isSynced ? "synced" : undefined,
        }),
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
          toast.success("Sinkronisasi ulang berhasil");
        } else {
          toast.info("Memproses sinkronisasi ulang data...", {
            description: `${data.data.syncedCount} berhasil, ${data.data.failedCount} masih menunggu.`,
            duration: 4000,
          });
        }
      } else {
        toast.error("Gagal melakukan sinkronisasi ulang", {
          description: data.error || undefined,
        });
      }
    } catch {
      toast.error("Kendala jaringan saat memproses sinkronisasi ulang.");
    } finally {
      setIsRetryingSelective(false);
    }
  };

  if (!isHydrated || isLoading || !user) {
    return <ClinicalSkeleton />;
  }

  const effectiveHospitalName =
    facility?.name ||
    selectedEncounter?.hospitalName ||
    user?.facilityName ||
    "Fasilitas Pelayanan Kesehatan";

  const defaultDeptDoctor = departments.find(
    (d) => d.name === activeDepartment
  )?.defaultDoctorName;

  const effectiveDoctorName =
    user?.role === "doctor"
      ? user.name
      : selectedEncounter?.doctorName ||
        defaultDeptDoctor ||
        user?.name ||
        "Dokter DPJP";

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

      {/* 0. Mode Inspeksi Vendor (Hanya Tampil Jika Login sebagai Super Admin) */}
      {user?.role === "super_admin" && (
        <div className="bg-slate-900 border-b border-indigo-500/40 px-4 sm:px-6 py-2 text-xs flex flex-wrap items-center justify-between gap-2 text-white relative z-50">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
            <span className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Mode Inspeksi Vendor:
            </span>
            <span className="text-slate-300 text-[11px] sm:text-xs">
              Anda sedang meninjau SIMRS <strong>{facility?.name || effectiveHospitalName}</strong>
            </span>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1 rounded-lg text-[11px] transition-colors cursor-pointer shadow-xs"
          >
            <span>Kembali ke Vendor Console</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* 1. TOP HEADER (Sticky) */}
      <EhrHeader
        currentEnv={currentEnv}
        onEnvChange={(newEnv) => {
          setCurrentEnv(newEnv);
          setSession(null);
          toast.info(`Mode lingkungan: ${newEnv === "staging" ? "Staging" : "Production"}`);
        }}
        hospitalName={effectiveHospitalName}
        department={activeDepartment}
        onDepartmentChange={handleDepartmentChange}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
        doctorName={effectiveDoctorName}
        worklist={worklist}
        onSelectPatient={(p, mod, queueItem, dept) =>
          handleSelectPatient(p, mod || "entry", undefined, queueItem, dept)
        }
        onUpdateQueueStatus={handleUpdateQueueStatus}
        onOpenRegistration={() => handleModuleChange("registration")}
        isDbSyncing={isDbSyncing}
        isBridgingActive={isBridgingActive}
      />

      {/* Banner Peringatan Faskes Diarsipkan / Nonaktif (Read-Only Mode) */}
      {facility?.isActive === false && (
        <div className="w-full bg-amber-500 text-slate-950 px-4 py-2.5 shadow-sm border-b border-amber-600/30">
          <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 font-medium">
              <span className="p-1 rounded-md bg-amber-600/30 text-slate-950 font-bold shrink-0">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <span>
                <strong>Mode Arsip (Faskes Nonaktif):</strong> Fasilitas kesehatan ini sedang diarsipkan oleh pengelola sistem. Seluruh data rekam medis pasien dapat ditinjau untuk audit, namun pendaftaran dan input transaksi baru dibatasi demi integritas data.
              </span>
            </div>
            {user?.role === "super_admin" && (
              <Button
                size="sm"
                onClick={() => router.push("/admin")}
                className="h-7 text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-3 shrink-0 cursor-pointer"
              >
                Kembali ke Vendor Portal
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 2. HOLY GRAIL LAYOUT BODY (Left Sidebar + Center Canvas + Right Panel) */}
      <div className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 pb-24 flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar (280px) */}
        <EhrLeftSidebar
          activeModule={activeModule}
          onModuleChange={handleModuleChange}
          onOpenQueueDisplay={() => setIsQueueDisplayOpen(true)}
          waitingCount={
            worklist.filter((w) => {
              if (activeDepartment && activeDepartment !== "Semua Poli" && w.department !== activeDepartment) {
                return false;
              }
              return w.status === "arrived";
            }).length
          }
        />

        {/* Center Main Clinical Canvas (Fluid) */}
        <main ref={mainCanvasRef} className="flex-1 min-w-0 space-y-5">
          {/* Module 1: Resume Medis Rawat Jalan (Comprehensive Patient Summary) */}
          {activeModule === "resume" && (
            <div className="space-y-5">
              {/* Patient Profile & Clinical Content OR Empty State */}
              {!patient ? (
                <div className="canvas-content">
                  <ClinicEmptyState
                    department={activeDepartment}
                    doctorName={effectiveDoctorName}
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
                      vitals={selectedEncounter?.vitals}
                      recordedDate={selectedEncounter?.visitDate}
                    />
                  </div>

                  {/* 3. Subjektif (S) & Assessment (A): Anamnesis, Diagnosis ICD-10, Tindakan & Riwayat */}
                  <div className="canvas-content">
                    <OutpatientTimeline
                      encounters={encounters.filter(
                        (e) => !patient || e.patientId === patient.id || !e.patientId
                      )}
                      selectedEncounterId={selectedEncounterId || ""}
                      onSelectEncounter={handleSelectEncounter}
                    />
                  </div>

                  {/* 4. Plan (P): Resep Obat Elektronik KFA Kemenkes & Jadwal Dosis */}
                  <div className="canvas-content">
                    <MedicationScheduleCard
                      prescriptions={selectedEncounter?.prescriptions || []}
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
                  activeEncounter={selectedEncounter}
                  worklist={worklist}
                  onUpdateWorklist={setWorklist}
                  onUpdateStatus={handleUpdateQueueStatus}
                  onSelectPatient={(p, mod, queueItem, dept) =>
                    handleSelectPatient(p, mod, undefined, queueItem, dept)
                  }
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
                  onOpenQueueTicket={(item) => {
                    setTicketQueueItem(item || null);
                    setIsQueueTicketOpen(true);
                  }}
                />
              </div>
            </div>
          )}

          {/* Module: Penunjang Lab & Radiologi (FHIR ServiceRequest & DiagnosticReport) */}
          {/* Module: Penunjang Lab & Radiologi (FHIR ServiceRequest & DiagnosticReport) */}
          {activeModule === "diagnostic" && (
            <div className="space-y-5">
              <div className="canvas-content">
                <DiagnosticSupportModule
                  patient={patient}
                  encounter={selectedEncounter}
                  session={session}
                  env={currentEnv}
                  onOpenRegistration={() => handleModuleChange("registration")}
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
              {!patient || !selectedEncounter ? (
                <div className="canvas-content">
                  <ModuleEmptyState
                    icon={Activity}
                    title="Observasi Tanda-Tanda Vital & Pemeriksaan Fisik"
                    description="Silakan pilih pasien dari daftar antrean poliklinik terlebih dahulu untuk melihat hasil observasi tanda-tanda vital, antropometri, dan pemeriksaan fisik."
                    actionText="Buka Daftar Antrean Pasien"
                    onAction={() => handleModuleChange("registration")}
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
                  <div className="canvas-content">
                    <VitalsCard
                      vitals={selectedEncounter.vitals}
                      recordedDate={selectedEncounter.visitDate}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Module 3: Resep Obat & Terapi KFA */}
          {activeModule === "prescriptions" && (
            <div className="space-y-5">
              {!patient || !selectedEncounter ? (
                <div className="canvas-content">
                  <ModuleEmptyState
                    icon={Pill}
                    title="Resep Obat & Terapi Pulang (KFA)"
                    description="Silakan pilih pasien dari daftar antrean poliklinik terlebih dahulu untuk melihat resep obat elektronik KFA dan jadwal aturan pakai."
                    actionText="Buka Daftar Antrean Pasien"
                    onAction={() => handleModuleChange("registration")}
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
                  <div className="canvas-content">
                    <MedicationScheduleCard
                      prescriptions={selectedEncounter.prescriptions || []}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Module 4: Riwayat Kunjungan Poli */}
          {activeModule === "history" && (
            <div className="space-y-5">
              {!patient || !selectedEncounter ? (
                <div className="canvas-content">
                  <ModuleEmptyState
                    icon={Calendar}
                    title="Riwayat Kunjungan & Rekam Medis"
                    description="Silakan pilih pasien dari daftar antrean poliklinik terlebih dahulu untuk melihat rekam jejak kunjungan dan riwayat diagnosis terdahulu."
                    actionText="Buka Daftar Antrean Pasien"
                    onAction={() => handleModuleChange("registration")}
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
                  <div className="canvas-content">
                    <OutpatientTimeline
                      encounters={encounters.filter(
                        (e) => !patient || e.patientId === patient.id || !e.patientId
                      )}
                      selectedEncounterId={selectedEncounterId || ""}
                      onSelectEncounter={handleSelectEncounter}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Module 5: Input Rekam Medis (Dokter DPJP) */}
          {activeModule === "entry" && (
            <div className="space-y-5">
              <div className="canvas-content">
                {(() => {
                  const currentActiveQueue = patient
                    ? worklist.find(
                        (w) =>
                          (w.patient.id === patient.id || w.patient.mrn === patient.mrn) &&
                          (w.status === "in-progress" || w.status === "arrived")
                      )
                    : null;

                  const enrichedEncounter: OutpatientEncounter | undefined = selectedEncounter
                    ? {
                        ...selectedEncounter,
                        queueNumber: selectedEncounter.queueNumber || currentActiveQueue?.queueNumber,
                        registrationNumber:
                          selectedEncounter.registrationNumber || currentActiveQueue?.registrationNumber,
                      }
                    : undefined;

                  return (
                    <OutpatientEntryForm
                      patient={patient}
                      activeEncounter={enrichedEncounter}
                      activeDepartment={activeDepartment}
                      onEncounterCreated={handleEncounterFinalized}
                      onOpenRegistration={() => handleModuleChange("registration")}
                      token={session?.accessToken}
                      session={session}
                      onNavigateToBridging={() => setActiveModule("auth")}
                    />
                  );
                })()}
              </div>
            </div>
          )}

          {/* Module 6: SATUSEHAT Auth & Gateway */}
          {activeModule === "auth" && (
            <div className="space-y-5">
              <div className="canvas-content">
                <AuthCard
                  env={currentEnv}
                  initialSession={session}
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
          vitals={selectedEncounter?.vitals}
          encounter={selectedEncounter}
          session={session}
          patient={patient}
          onOpenPrintModal={() => setIsPrintModalOpen(true)}
          onOpenPrescriptionPrint={() => setIsPrescriptionPrintOpen(true)}
          onOpenLockModal={() => setIsLockModalOpen(true)}
          onRefreshToken={handleRefresh}
          isRefreshing={isRefreshing}
          onSelectiveRetry={handleSelectiveRetry}
          isRetrying={isRetryingSelective}
        />
      </div>

      {/* 3. BOTTOM STATUS BAR (Sticky Footer) */}
      <EhrFooter
        env={currentEnv}
        hospitalName={facility?.name || selectedEncounter?.hospitalName || "RS Umum Daerah Sehat Sejahtera"}
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
        onOpenChange={(open) => {
          setIsQueueTicketOpen(open);
          if (!open) {
            // Berikan jeda agar animasi keluar (exit transition 200ms) Radix UI tuntas sebelum state dibersihkan
            setTimeout(() => setTicketQueueItem(null), 300);
          }
        }}
        patient={patient}
        encounter={selectedEncounter}
        worklist={worklist}
        queueItem={ticketQueueItem}
      />

      {/* Patient Card & Barcode Modal */}
      <PatientCardPrintModal
        isOpen={isPatientCardOpen}
        onOpenChange={setIsPatientCardOpen}
        patient={patient}
        hospitalName={facility?.name || selectedEncounter?.hospitalName || "RS Umum Daerah Sehat Sejahtera"}
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
        hospitalName={facility?.name || selectedEncounter?.hospitalName || "RS Umum Daerah Sehat Sejahtera"}
        worklist={worklist}
        onUpdateStatus={handleUpdateQueueStatus}
        onSelectPatient={(p, mod, queueItem, dept) =>
          handleSelectPatient(p, (mod as any) || "entry", undefined, queueItem, dept)
        }
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
                <span>{patient?.id || "P-TEMP"}</span>
                <span className="text-[8px] text-slate-400">KEMENKES RI</span>
              </div>
            </div>
            <div className="space-y-0.5 text-center">
              <p className="font-bold text-sm text-slate-900">{patient?.name || "-"}</p>
              <p className="text-xs text-slate-500 font-mono">NIK: {patient?.nik || "-"}</p>
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
