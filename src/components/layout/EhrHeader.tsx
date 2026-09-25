"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Search,
  Building2,
  ShieldCheck,
  ChevronDown,
  X,
  UserPlus,
  Check,
  Bell,
  FlaskConical,
  UserCheck,
  Loader2,
  LogOut,
  Hospital,
  Sparkles,
  Stethoscope,
  Shield,
  Users,
  AlertTriangle,
  HeartPulse,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClinicQueuePatientItem,
  PatientProfile,
  SatusehatEnvironment,
  UserRole,
} from "@/lib/satusehat/types";
import { EhrModule } from "@/components/layout/EhrLeftSidebar";
import { useAuth } from "@/lib/auth/auth-context";
import { StaffManagementModal } from "@/components/admin/StaffManagementModal";
import { SuperAdminFacilityManagerModal } from "@/components/facility/SuperAdminFacilityManagerModal";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface EhrHeaderProps {
  currentEnv: SatusehatEnvironment;
  onEnvChange?: (env: SatusehatEnvironment) => void;
  hospitalName?: string;
  department: string;
  onDepartmentChange?: (dept: string) => void;
  onOpenPrintModal?: () => void;
  doctorName?: string;
  worklist?: ClinicQueuePatientItem[];
  onSelectPatient?: (
    patient: PatientProfile,
    targetModule?: EhrModule,
    targetQueueItemOrNumber?: ClinicQueuePatientItem | string,
    targetDepartment?: string,
  ) => void;
  onUpdateQueueStatus?: (
    itemId: string,
    nextStatus: "arrived" | "in-progress" | "finished",
    silent?: boolean,
  ) => void;
  onOpenRegistration?: () => void;
  isDbSyncing?: boolean;
  isBridgingActive?: boolean;
}

const ROLE_LABELS: Record<
  UserRole,
  { label: string; color: string; icon: React.ElementType }
> = {
  super_admin: {
    label: "Super Admin (Vendor RME)",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: Shield,
  },
  doctor: {
    label: "Dokter DPJP",
    color: "bg-teal-50 text-teal-700 border-teal-200",
    icon: Stethoscope,
  },
  nurse: {
    label: "Perawat Poli",
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
    icon: UserCheck,
  },
  registration: {
    label: "Petugas Pendaftaran",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    icon: UserPlus,
  },
  pharmacy: {
    label: "Apoteker / Farmasi",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: Sparkles,
  },
  admin: {
    label: "Administrator",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    icon: Shield,
  },
};

export function EhrHeader({
  currentEnv,
  hospitalName,
  department,
  onDepartmentChange,
  onOpenPrintModal,
  doctorName,
  worklist = [],
  onSelectPatient,
  onUpdateQueueStatus,
  onOpenRegistration,
  isDbSyncing = false,
  isBridgingActive = false,
}: EhrHeaderProps) {
  const router = useRouter();
  const { user, facility, departments: dynamicDepartments, logout } = useAuth();

  // Search & Dropdowns State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isFacilityManagerOpen, setIsFacilityManagerOpen] = useState(false);

  // Clinical Notifications State (Derived dynamically from live worklist)
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(
    () => new Set(["notif-satusehat-gateway"]),
  );
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      type: "lab" | "queue" | "sync";
      priority?: "cito" | "geriatric" | "normal";
      title: string;
      desc: string;
      time: string;
      timestamp?: number;
      read: boolean;
      patient?: PatientProfile;
      queueItem?: ClinicQueuePatientItem;
      targetModule?: EhrModule;
    }>
  >([]);

  useEffect(() => {
    const getAge = (birthDate?: string) => {
      if (!birthDate) return 0;
      const bYear = new Date(birthDate).getFullYear();
      const cYear = new Date().getFullYear();
      return isNaN(bYear) ? 0 : cYear - bYear;
    };

    const getItemTimestamp = (
      item: ClinicQueuePatientItem,
      fallbackIndex: number,
    ) => {
      if (item.arrivalTimestamp && item.arrivalTimestamp > 0) {
        return item.arrivalTimestamp;
      }
      if (item.arrivalTime) {
        const match = item.arrivalTime.match(/(\d{1,2})[.:](\d{2})/);
        if (match) {
          const d = new Date();
          d.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
          return d.getTime();
        }
      }
      return Date.now() - (worklist.length - fallbackIndex) * 60000;
    };

    const list: Array<{
      id: string;
      type: "lab" | "queue" | "sync";
      priority?: "cito" | "geriatric" | "normal";
      title: string;
      desc: string;
      time: string;
      timestamp?: number;
      read: boolean;
      patient?: PatientProfile;
      queueItem?: ClinicQueuePatientItem;
      targetModule?: EhrModule;
    }> = [];

    // 1. CITO / Emergency / Urgent patients (Prioritas Tertinggi Gawat Darurat)
    const citoPatients = worklist.filter(
      (w) =>
        w.triagePriority === "urgent" ||
        (w.chiefComplaint && /\bcito\b/i.test(w.chiefComplaint)),
    );
    citoPatients.forEach((u, idx) => {
      const notifId = `notif-cito-${u.id || idx}`;
      const isFinished = u.status === "finished";
      const isInProgress = u.status === "in-progress";

      list.push({
        id: notifId,
        type: "queue",
        priority: isFinished ? "normal" : "cito",
        title: isFinished
          ? `Pasien CITO Selesai: ${u.queueNumber} (${u.department})`
          : isInProgress
            ? `Pasien CITO Sedang Ditangani: ${u.queueNumber} (${u.department})`
            : `Pasien CITO: ${u.queueNumber} (${u.department})`,
        desc: isFinished
          ? `${u.patient.name} telah selesai penanganan klinis & rekam medis di ${u.department}.`
          : isInProgress
            ? `${u.patient.name} sedang dalam penanganan klinis DPJP di ${u.department}.`
            : `${u.patient.name} membutuhkan penanganan segera di ${u.department}. Keluhan: ${u.chiefComplaint || "Kondisi Gawat Darurat CITO"}.`,
        time: isFinished ? "Selesai" : isInProgress ? "Diperiksa" : "CITO",
        timestamp: isFinished
          ? getItemTimestamp(u, idx)
          : (u.arrivalTimestamp || Date.now()) + 50000000, // Hanya CITO aktif yang diprioritaskan di paling atas
        read: readNotifIds.has(notifId),
        patient: u.patient,
        queueItem: u,
        targetModule: isFinished ? "resume" : "entry",
      });
    });

    // 2. In-progress / consultation patients (Aktif diperiksa dokter, non-CITO)
    const inProgress = worklist.filter(
      (w) =>
        w.status === "in-progress" &&
        w.triagePriority !== "urgent" &&
        !(w.chiefComplaint && /\bcito\b/i.test(w.chiefComplaint)),
    );
    inProgress.forEach((c, idx) => {
      const notifId = `notif-consult-${c.id || idx}`;
      const isGeriatric =
        c.triagePriority === "geriatric" || getAge(c.patient.birthDate) >= 60;
      list.push({
        id: notifId,
        type: "queue",
        priority: "normal",
        title: "Konsultasi Sedang Berlangsung",
        desc: `${c.patient.name} (${c.queueNumber}${isGeriatric ? " • Geriatri" : ""}) sedang dalam pemeriksaan DPJP di ${c.department}.`,
        time: "Diperiksa",
        timestamp: getItemTimestamp(c, idx) + 1000,
        read: readNotifIds.has(notifId),
        patient: c.patient,
        queueItem: c,
        targetModule: "entry",
      });
    });

    // 3. Geriatric / High-priority patients yang sedang menunggu (non-CITO)
    const geriatric = worklist.filter(
      (w) =>
        (w.triagePriority === "geriatric" ||
          getAge(w.patient.birthDate) >= 60) &&
        w.status === "arrived" &&
        w.triagePriority !== "urgent" &&
        !(w.chiefComplaint && /\bcito\b/i.test(w.chiefComplaint)),
    );
    geriatric.forEach((g, idx) => {
      const age = getAge(g.patient.birthDate);
      const notifId = `notif-geriatric-${g.id || idx}`;
      list.push({
        id: notifId,
        type: "queue",
        priority: "geriatric",
        title: "Pasien Prioritas Geriatri",
        desc: `${g.patient.name} (${age > 0 ? `${age} thn, ` : ""}No: ${g.queueNumber}) terdaftar di ${g.department}.`,
        time: "Geriatri",
        timestamp: getItemTimestamp(g, idx),
        read: readNotifIds.has(notifId),
        patient: g.patient,
        queueItem: g,
        targetModule: "entry",
      });
    });

    // 4. Arrived / waiting regular queue patients (non-CITO, non-Geriatri)
    const arrived = worklist.filter(
      (w) =>
        w.status === "arrived" &&
        getAge(w.patient.birthDate) < 60 &&
        w.triagePriority !== "geriatric" &&
        w.triagePriority !== "urgent" &&
        !(w.chiefComplaint && /\bcito\b/i.test(w.chiefComplaint)),
    );
    arrived.slice(0, 5).forEach((w, idx) => {
      const notifId = `notif-waiting-${w.id || idx}`;
      list.push({
        id: notifId,
        type: "queue",
        priority: "normal",
        title: `Antrean ${w.queueNumber} Tiba`,
        desc: `${w.patient.name} di ${w.department} (${w.chiefComplaint || "Pemeriksaan Poli"}).`,
        time: "Menunggu",
        timestamp: getItemTimestamp(w, idx),
        read: readNotifIds.has(notifId),
        patient: w.patient,
        queueItem: w,
        targetModule: "entry",
      });
    });

    // 5. Finished regular patients (Pasien non-CITO yang telah selesai diperiksa)
    const recentFinished = worklist.filter(
      (w) =>
        w.status === "finished" &&
        w.triagePriority !== "urgent" &&
        !(w.chiefComplaint && /\bcito\b/i.test(w.chiefComplaint)),
    );
    recentFinished.slice(0, 3).forEach((f, idx) => {
      const notifId = `notif-finished-${f.id || idx}`;
      list.push({
        id: notifId,
        type: "queue",
        priority: "normal",
        title: `Pemeriksaan Selesai: ${f.queueNumber} (${f.department})`,
        desc: `${f.patient.name} telah menyelesaikan pemeriksaan & rekam medis di ${f.department}.`,
        time: "Selesai",
        timestamp: getItemTimestamp(f, idx),
        read: readNotifIds.has(notifId),
        patient: f.patient,
        queueItem: f,
        targetModule: "resume",
      });
    });

    // 5. SATUSEHAT Gateway status (Sistem notifikasi di posisi bawah)
    const gatewayId = "notif-satusehat-gateway";
    list.push({
      id: gatewayId,
      type: "sync",
      priority: "normal",
      title: isBridgingActive
        ? "Gateway SATUSEHAT Kemenkes RI"
        : "Penyimpanan Basis Data Internal",
      desc: isBridgingActive
        ? `Layanan interoperabilitas FHIR R4 terhubung aktif pada server ${currentEnv === "production" ? "Production" : "Staging"} Kemenkes RI.`
        : `Sistem beroperasi dalam mode penyimpanan basis data internal RS. Kredensial SATUSEHAT belum dihubungkan.`,
      time: isBridgingActive ? "Live Online" : "Internal (Offline)",
      timestamp: 0,
      read: readNotifIds.has(gatewayId),
    });

    // Urutkan secara kronologis terbalik (Newest First) dengan CITO selalu di puncak
    list.sort((a, b) => {
      // 1. CITO selalu berada di prioritas paling atas
      if (a.priority === "cito" && b.priority !== "cito") return -1;
      if (a.priority !== "cito" && b.priority === "cito") return 1;

      // 2. Berdasarkan waktu kejadian terbaru (timestamp descending)
      const timeDiff = (b.timestamp ?? 0) - (a.timestamp ?? 0);
      if (timeDiff !== 0) return timeDiff;

      const priorityWeight = (item: typeof a) => {
        if (item.priority === "cito") return 4;
        if (item.time === "Diperiksa") return 3;
        if (item.time === "Geriatri") return 2;
        if (item.time === "Menunggu") return 1;
        return 0;
      };
      return priorityWeight(b) - priorityWeight(a);
    });

    setNotifications(list);
  }, [worklist, currentEnv, isBridgingActive, readNotifIds]);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const deptDropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut Ctrl+K / Cmd+K & Escape for Live Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
      if (e.key === "Escape" && isSearchOpen) {
        setIsSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
      if (
        deptDropdownRef.current &&
        !deptDropdownRef.current.contains(event.target as Node)
      ) {
        setIsDeptDropdownOpen(false);
      }
      if (
        notifDropdownRef.current &&
        !notifDropdownRef.current.contains(event.target as Node)
      ) {
        setIsNotifOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered Patients for Live Search & Active Department Scope
  const filteredPatients = worklist.filter((item) => {
    // 1. Department Scope Filtering
    if (department && department !== "Semua Poli") {
      if (item.department !== department) return false;
    }
    // 2. Search Query Filtering
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.patient.name.toLowerCase().includes(q) ||
      item.patient.mrn.toLowerCase().includes(q) ||
      item.patient.nik.includes(q) ||
      (item.registrationNumber &&
        item.registrationNumber.toLowerCase().includes(q)) ||
      item.queueNumber.toLowerCase().includes(q) ||
      item.department.toLowerCase().includes(q) ||
      item.chiefComplaint.toLowerCase().includes(q)
    );
  });

  const handlePatientClick = (item: ClinicQueuePatientItem) => {
    // If encounter is finished, open 'resume' (Resume Medis), otherwise open 'entry' (SOAP DPJP Pemeriksaan)
    const targetModule: EhrModule =
      item.status === "finished" ? "resume" : "entry";
    if (onSelectPatient) {
      onSelectPatient(item.patient, targetModule, item, item.department);
    }
    setIsSearchOpen(false);
    setSearchQuery("");
    toast.success(`Membuka Rekam Medis: ${item.patient.name}`, {
      description: `No. RM: ${item.patient.mrn} • Status: ${
        item.status === "finished"
          ? "Selesai Berobat"
          : "Pemeriksaan Dokter (SOAP)"
      }`,
    });
  };

  const handleSelectDepartment = (dept: string) => {
    if (onDepartmentChange) {
      onDepartmentChange(dept);
    }
    setIsDeptDropdownOpen(false);
    const count =
      dept === "Semua Poli"
        ? worklist.length
        : worklist.filter((w) => w.department === dept).length;
    toast.info(`Poli aktif beralih ke: ${dept}`, {
      description: `${count} pasien antrean terdaftar di poli ini`,
    });
  };

  const handleMarkAllRead = () => {
    setReadNotifIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.id));
      return next;
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("Semua notifikasi telah ditandai dibaca");
  };

  const handleNotificationClick = (notif: (typeof notifications)[0]) => {
    // 1. Tandai notifikasi spesifik ini telah dibaca
    setReadNotifIds((prev) => {
      const next = new Set(prev);
      next.add(notif.id);
      return next;
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)),
    );

    // 2. Jika notifikasi terikat dengan antrean klinis
    if (notif.patient && notif.queueItem) {
      // OPSI 1: Jika status antrean masih "arrived", langsung mulai periksa (in-progress) & buka SOAP
      if (notif.queueItem.status === "arrived" && onUpdateQueueStatus) {
        onUpdateQueueStatus(notif.queueItem.id, "in-progress");
        setIsNotifOpen(false);
        return;
      }

      // Jika antrean sudah in-progress atau finished, navigasikan langsung ke modul yang sesuai
      if (onSelectPatient) {
        onSelectPatient(
          notif.patient,
          notif.targetModule ||
            (notif.queueItem.status === "finished" ? "resume" : "entry"),
          notif.queueItem,
          notif.queueItem.department,
        );
        toast.info(`Membuka berkas pasien: ${notif.patient.name}`, {
          description: `Antrean ${notif.queueItem.queueNumber} (${notif.queueItem.department})`,
        });
        setIsNotifOpen(false);
        return;
      }
    } else if (notif.patient && onSelectPatient) {
      onSelectPatient(notif.patient, notif.targetModule || "entry");
      setIsNotifOpen(false);
      return;
    }

    // 3. Jika berupa notifikasi status gateway SATUSEHAT
    if (notif.type === "sync") {
      toast.info(notif.title, {
        description: notif.desc,
      });
      setIsNotifOpen(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fallbackDepts = [
    "Poli Penyakit Dalam",
    "Poli Umum",
    "Poli Anak (Pediatri)",
    "Poli Gigi & Mulut",
    "Poli Jantung & Pembuluh Darah",
    "Poli Mata",
  ];

  const availableDepartments = Array.from(
    new Set([
      "Semua Poli",
      ...(dynamicDepartments && dynamicDepartments.length > 0
        ? dynamicDepartments.map((d) => d.name)
        : fallbackDepts),
      ...worklist.map((w) => w.department).filter(Boolean),
    ]),
  );

  const activeFacilityName =
    facility?.name || hospitalName || "RS Umum Daerah Sehat Sejahtera";
  const activeRoleConfig = user?.role
    ? ROLE_LABELS[user.role]
    : ROLE_LABELS.doctor;
  const RoleIcon = activeRoleConfig?.icon || Stethoscope;

  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shadow-2xs gap-3">
      {/* 1. Left: Brand & Hospital Identity (Tenant Indicator / Super Admin Switcher) */}
      {user?.role === "super_admin" ? (
        <button
          type="button"
          onClick={() => setIsFacilityManagerOpen(true)}
          className="flex items-center gap-2.5 shrink-0 text-left hover:bg-indigo-50/70 p-1.5 rounded-xl transition-all cursor-pointer group border border-transparent hover:border-indigo-200"
          title="Mode Super Admin: Klik untuk Beralih Faskes atau Buka Konsol Multi-Tenant"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs shrink-0 group-hover:scale-105 transition-transform">
            <Building2 className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-slate-900 tracking-tight whitespace-nowrap truncate max-w-[190px] sm:max-w-[250px] group-hover:text-indigo-700 transition-colors">
                {activeFacilityName}
              </span>
              <Badge
                variant="outline"
                className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-800 border-indigo-200 shrink-0 hidden sm:inline-flex"
              >
                Super Admin
              </Badge>
              <ChevronDown className="h-3 w-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium truncate">
              <span>Org ID: {facility?.satusehatOrgId || "10000004"}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 font-semibold text-indigo-600">
                <Building2 className="h-3 w-3" />
                Ganti Faskes
              </span>
            </div>
          </div>
        </button>
      ) : (
        <div
          className="flex items-center gap-2.5 shrink-0 text-left p-1 rounded-xl"
          title={`Fasilitas Pelayanan Kesehatan: ${activeFacilityName}`}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs shrink-0">
            <Hospital className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-slate-900 tracking-tight whitespace-nowrap truncate max-w-[190px] sm:max-w-[250px]">
                {activeFacilityName}
              </span>
              <Badge
                variant="outline"
                className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-50 text-teal-800 border-teal-200 shrink-0 hidden sm:inline-flex"
              >
                {facility?.type === "rumah_sakit"
                  ? "RS"
                  : facility?.type === "klinik_pratama"
                    ? "Klinik Pratama"
                    : facility?.type === "klinik_utama"
                      ? "Klinik Utama"
                      : facility?.type === "praktik_mandiri"
                        ? "Praktik Mandiri"
                        : "Puskesmas"}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium truncate">
              <span>Org ID: {facility?.satusehatOrgId || "10000004"}</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Center: Direct Inline Search Bar & Department Selector */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-xl mx-2">
        {/* Direct Search Input with Autocomplete Dropdown */}
        <div ref={searchContainerRef} className="relative flex-1 min-w-[180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!isSearchOpen) setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Cari Kunjungan (Nama, RM, No. Reg, NIK, Antrean)..."
              className="w-full h-9 pl-9 pr-8 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-teal-400 rounded-full text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-2xs focus:ring-2 focus:ring-teal-500/15"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setIsSearchOpen(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Hapus kata kunci pencarian"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="hidden lg:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 items-center px-1.5 py-0.2 text-[9px] font-mono font-bold text-slate-400 bg-white border border-slate-200 rounded pointer-events-none shadow-2xs select-none">
                Ctrl K
              </kbd>
            )}
          </div>

          {/* Autocomplete Results Dropdown */}
          {isSearchOpen && (
            <div className="absolute top-full mt-1.5 left-0 w-full sm:w-[460px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                <span className="truncate pr-2">
                  {searchQuery.trim()
                    ? `Hasil Pencarian Kunjungan (${filteredPatients.length})`
                    : department === "Semua Poli"
                      ? `Antrean Kunjungan Rawat Jalan (${filteredPatients.length} Kunjungan)`
                      : `Antrean Kunjungan ${department} (${filteredPatients.length} Kunjungan)`}
                </span>
                {onOpenRegistration && filteredPatients.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchOpen(false);
                      onOpenRegistration();
                    }}
                    className="text-teal-600 hover:text-teal-800 flex items-center gap-1 font-bold text-[10px] cursor-pointer shrink-0"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>+ Pasien Baru</span>
                  </button>
                )}
              </div>

              {/* Patients/Visits List */}
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 p-1">
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((item) => {
                    const isInProgress = item.status === "in-progress";
                    const isFinished = item.status === "finished";

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handlePatientClick(item)}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-teal-50/80 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {/* Queue Pill */}
                          <div
                            className={`h-8 px-2 min-w-[50px] rounded-lg font-mono font-extrabold text-xs flex items-center justify-center shrink-0 whitespace-nowrap transition-colors shadow-2xs ${
                              item.triagePriority === "urgent"
                                ? "bg-rose-50 border border-rose-300 text-rose-900 group-hover:bg-rose-600 group-hover:text-white group-hover:border-rose-600"
                                : "bg-teal-50 border border-teal-200 text-teal-900 group-hover:bg-teal-600 group-hover:text-white group-hover:border-teal-600"
                            }`}
                          >
                            {item.queueNumber}
                          </div>

                          <div className="min-w-0 space-y-0.5 flex-1">
                            {/* Baris 1: Nama Pasien + Gender + CITO / Geriatri / Multi-Poli */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-slate-900 group-hover:text-teal-950 truncate max-w-[170px]">
                                {item.patient.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                ({item.patient.gender === "male" ? "L" : "P"})
                              </span>
                              {item.triagePriority === "urgent" && (
                                <span className="inline-flex items-center gap-1 text-[8px] bg-rose-600 text-white px-1.5 py-0.2 rounded font-black tracking-wider uppercase animate-pulse shadow-2xs">
                                  CITO
                                </span>
                              )}
                              {item.triagePriority === "geriatric" && (
                                <span className="text-[8px] bg-purple-50 text-purple-700 border border-purple-200 px-1 py-0.2 rounded font-bold">
                                  Geriatri
                                </span>
                              )}
                              {item.isSequentialMultiClinic && (
                                <span className="text-[8px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1 py-0.2 rounded font-bold">
                                  Multi-Poli
                                </span>
                              )}
                            </div>

                            {/* Baris 2: No. Registrasi Kunjungan & Jam Kedatangan */}
                            <div className="text-[10px] text-slate-600 font-mono flex items-center gap-1.5 flex-wrap">
                              <span className="bg-slate-100 text-slate-800 px-1.5 py-0.2 rounded font-semibold text-[9px] border border-slate-200">
                                No. Reg:{" "}
                                {item.registrationNumber ||
                                  `RJ-${item.queueNumber}`}
                              </span>
                              {item.arrivalTime && (
                                <span className="text-slate-400 text-[9px]">
                                  • {item.arrivalTime}
                                </span>
                              )}
                            </div>

                            {/* Baris 3: No. RM & NIK */}
                            <div className="text-[9px] text-slate-400 font-mono truncate">
                              No. RM:{" "}
                              <strong className="text-slate-700">
                                {item.patient.mrn.replace(/^RM-?/i, "")}
                              </strong>{" "}
                              • NIK: {item.patient.nik}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex flex-col items-end gap-1 text-right">
                          <div className="flex items-center gap-1">
                            {item.status === "arrived" && item.pausedReason && (
                              <Badge
                                variant="outline"
                                className="text-[8px] font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap bg-amber-50 text-amber-900 border-amber-300 shadow-2xs"
                                title={item.pausedReason}
                              >
                                Ditunda
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap shadow-2xs ${
                                isInProgress
                                  ? "bg-teal-50 text-teal-700 border-teal-300 animate-pulse"
                                  : isFinished
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                    : "bg-amber-50 text-amber-700 border-amber-300"
                              }`}
                            >
                              {isInProgress
                                ? "Sedang Diperiksa"
                                : isFinished
                                  ? "Selesai"
                                  : "Menunggu"}
                            </Badge>
                          </div>
                          <span className="text-[9px] text-slate-500 font-medium truncate max-w-[110px]">
                            {item.department}
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-6 text-center space-y-2">
                    <p className="text-xs text-slate-500">
                      {searchQuery.trim() ? (
                        <>
                          Tidak ditemukan pasien dengan kata kunci &quot;
                          <strong className="text-slate-800">
                            {searchQuery}
                          </strong>
                          &quot;.
                        </>
                      ) : (
                        <>Belum ada antrean terdaftar di {department}.</>
                      )}
                    </p>
                    {onOpenRegistration && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsSearchOpen(false);
                          onOpenRegistration();
                        }}
                        className="text-xs font-semibold gap-1.5 bg-white text-teal-700 border-teal-200 hover:bg-teal-50 cursor-pointer"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Daftarkan Pasien Baru</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Interactive Department / Clinic Selector Dropdown */}
        <div ref={deptDropdownRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
            className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-slate-50 hover:bg-teal-50/60 border border-slate-200 hover:border-slate-300 text-xs text-slate-700 font-semibold transition-colors cursor-pointer whitespace-nowrap shadow-2xs btn-press"
            title="Klik untuk mengganti filter Poli aktif"
          >
            <Building2 className="h-3.5 w-3.5 text-teal-600 shrink-0" />
            <span className="truncate max-w-[110px] sm:max-w-[140px]">
              {department}
            </span>
            <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
          </button>

          {isDeptDropdownOpen && (
            <div className="absolute top-full mt-1.5 left-0 sm:left-auto sm:right-0 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3.5 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Pilih Poli / Departemen
              </div>
              <div className="max-h-60 overflow-y-auto py-1 divide-y divide-slate-50">
                {availableDepartments.map((dept) => {
                  const isSelected = department === dept;
                  const deptCount =
                    dept === "Semua Poli"
                      ? worklist.length
                      : worklist.filter((w) => w.department === dept).length;

                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => handleSelectDepartment(dept)}
                      className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-teal-50 text-teal-900 font-bold"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Building2 className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                        <span className="truncate">{dept}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                            isSelected
                              ? "bg-teal-200 text-teal-950"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {deptCount}
                        </span>
                        {isSelected && (
                          <Check className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Right: Notification Center, SATUSEHAT Badge, Print & DPJP Profile */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Clinical Notification Center Popover */}
        <div ref={notifDropdownRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative h-9 w-9 rounded-full bg-slate-50 hover:bg-white border border-slate-200 hover:border-teal-300 flex items-center justify-center text-slate-600 hover:text-teal-700 transition-colors cursor-pointer shrink-0 shadow-2xs"
            title="Pusat Notifikasi Klinis"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-rose-500 text-white font-extrabold text-[9px] flex items-center justify-center border-2 border-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute top-full mt-1.5 right-0 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5 text-teal-600" />
                  <span className="font-bold text-xs text-slate-900">
                    Notifikasi Klinis &amp; Antrean
                  </span>
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-teal-700 hover:text-teal-900 font-semibold cursor-pointer"
                  >
                    Tandai Semua Dibaca
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-30 text-slate-300" />
                    <p className="text-xs font-semibold">
                      Tidak ada notifikasi klinis baru
                    </p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isFinished =
                      notif.time === "Selesai" ||
                      notif.queueItem?.status === "finished";
                    const isCito =
                      !isFinished &&
                      (notif.priority === "cito" || notif.time === "CITO");
                    const isGeriatric = notif.time === "Geriatri";
                    const isInProgress = notif.time === "Diperiksa";
                    const isWaiting = notif.time === "Menunggu";

                    return (
                      <button
                        key={notif.id}
                        type="button"
                        onClick={() => handleNotificationClick(notif)}
                        className={`w-full text-left p-3 transition-colors hover:bg-teal-50/60 flex items-start gap-2.5 cursor-pointer group select-none ${
                          !notif.read ? "bg-teal-50/40" : "bg-white"
                        }`}
                      >
                        <div
                          className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-105 ${
                            isFinished
                              ? "bg-emerald-100 text-emerald-800"
                              : isCito
                                ? "bg-rose-100 text-rose-800"
                                : isGeriatric
                                  ? "bg-purple-100 text-purple-800"
                                  : notif.type === "lab"
                                    ? "bg-teal-100 text-teal-700"
                                    : isInProgress
                                      ? "bg-blue-100 text-blue-800"
                                      : isWaiting
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {isFinished ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : isCito ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : isGeriatric ? (
                            <HeartPulse className="h-4 w-4" />
                          ) : notif.type === "lab" ? (
                            <FlaskConical className="h-4 w-4" />
                          ) : isInProgress ? (
                            <Stethoscope className="h-4 w-4" />
                          ) : isWaiting ? (
                            <UserCheck className="h-4 w-4" />
                          ) : notif.id === "notif-satusehat-gateway" ? (
                            <img src="/satusehat-default-logo.svg" alt="SATUSEHAT" className="h-4 w-4 object-contain shrink-0" />
                          ) : (
                            <ShieldCheck className="h-4 w-4" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-bold text-slate-900 group-hover:text-teal-950 truncate">
                                {notif.title}
                              </span>
                              {!notif.read && (
                                <span className="h-1.5 w-1.5 rounded-full bg-teal-600 shrink-0" />
                              )}
                            </div>

                            {/* Clean Status & Priority Badges */}
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                                isFinished
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : isCito
                                    ? "bg-rose-100 text-rose-800 border border-rose-200"
                                    : isGeriatric
                                      ? "bg-purple-100 text-purple-800 border border-purple-200"
                                      : isInProgress
                                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                                        : isWaiting
                                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              }`}
                            >
                              {notif.time}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                            {notif.desc}
                          </p>

                          {notif.patient && (
                            <div className="text-[10px] text-teal-700 font-semibold pt-0.5 flex items-center gap-1 opacity-80 group-hover:opacity-100">
                              <span>
                                {isFinished
                                  ? "Lihat resume medis pasien"
                                  : isCito
                                    ? notif.queueItem?.status === "in-progress"
                                      ? "Buka SOAP Pasien CITO"
                                      : "Tangani Pasien CITO (SOAP)"
                                    : notif.queueItem?.status === "in-progress"
                                      ? "Buka SOAP Pasien"
                                      : notif.queueItem?.status === "arrived"
                                        ? "Mulai periksa pasien (SOAP)"
                                        : "Buka formulir pemeriksaan (SOAP)"}
                              </span>
                              <span className="group-hover:translate-x-0.5 transition-transform">
                                ➔
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* SIMRS Data Synchronization Status Indicator */}
        <div
          className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 shadow-2xs transition-all duration-200 ${
            isDbSyncing
              ? "bg-teal-50 border border-teal-300 text-teal-800 ring-2 ring-teal-500/10"
              : "bg-slate-50 border border-slate-200 text-slate-600"
          }`}
          title={
            isDbSyncing
              ? "Sedang menyimpan perubahan data rekam medis..."
              : "Sistem Rekam Medis Elektronik RS Siap & Terhubung"
          }
        >
          {isDbSyncing ? (
            <>
              <Loader2 className="h-3 w-3 text-teal-600 animate-spin" />
              <span className="text-[10px] text-teal-800 font-bold">
                Menyimpan Data...
              </span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-slate-600 font-bold">
                Sistem Siap
              </span>
            </>
          )}
        </div>

        {/* Compact SATUSEHAT Connection / Offline Badge */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-medium whitespace-nowrap shrink-0 shadow-2xs"
          title={
            isBridgingActive
              ? `Bridging SATUSEHAT Aktif (${currentEnv === "production" ? "Server Utama Production" : "Server Uji Coba Staging"})`
              : "Bridging SATUSEHAT Belum Terhubung (Penyimpanan Internal RS). Buka modul Bridging untuk menghubungkan kredensial Kemenkes."
          }
        >
          {isBridgingActive ? (
            <div className="relative flex items-center justify-center shrink-0">
              <img
                src="/satusehat-default-logo.svg"
                alt="SATUSEHAT"
                className="h-3.5 w-3.5 object-contain"
              />
              <span
                className={`absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ${
                  currentEnv === "production"
                    ? "bg-emerald-500"
                    : "bg-teal-500"
                } animate-pulse ring-1 ring-white`}
              />
            </div>
          ) : (
            <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
          )}
          <span className="text-[10px] text-slate-600 font-bold">
            {isBridgingActive
              ? currentEnv === "production"
                ? "SATUSEHAT (Prod)"
                : "SATUSEHAT (Staging)"
              : "Internal RS (Offline)"}
          </span>
        </div>

        {/* User Account & Faskes Switcher Dropdown */}
        <div
          ref={userMenuRef}
          className="relative shrink-0 pl-1 sm:pl-2 border-l border-slate-200"
        >
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1 sm:px-2 sm:py-1 rounded-full hover:bg-slate-100 transition-all cursor-pointer border border-transparent hover:border-slate-200 group text-left"
            title="Klik untuk membuka menu profil nakes & ganti faskes"
          >
            <div className="h-8 w-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs border border-teal-200 shrink-0 group-hover:ring-2 group-hover:ring-teal-500/20 transition-all">
              {user?.name
                ? user.name
                    .replace(/^(dr\.|drg\.|Ns\.|apt\.)\s*/i, "")
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                : "US"}
            </div>

            <div className="hidden lg:flex flex-col text-left shrink-0 max-w-[130px]">
              <span className="text-xs font-bold text-slate-900 truncate leading-tight">
                {user?.name || doctorName || "Dokter DPJP"}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[10px] text-teal-700 font-semibold truncate">
                  {activeRoleConfig.label}
                </span>
              </div>
            </div>

            <ChevronDown className="h-3 w-3 text-slate-400 shrink-0 group-hover:text-slate-600 transition-colors" />
          </button>

          {/* Popover Dropdown Menu */}
          {isUserMenuOpen && (
            <div className="absolute top-full mt-2 right-0 w-80 sm:w-88 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              {/* 1. User Info Header */}
              <div className="p-4 bg-gradient-to-br from-teal-500/10 via-slate-50 to-slate-100/60 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
                    <RoleIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-sm text-slate-900 truncate">
                        {user?.name || "Pengguna Sistem"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${activeRoleConfig.color}`}
                      >
                        {activeRoleConfig.label}
                      </Badge>
                      <span className="text-[10px] text-slate-400 font-mono">
                        @{user?.username || "user"}
                      </span>
                    </div>
                    {user?.sip && (
                      <p className="text-[10px] text-slate-500 font-mono mt-1 truncate">
                        SIP: {user.sip}
                      </p>
                    )}
                    {user?.ihsPractitionerId ? (
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded font-mono font-bold truncate">
                        <img
                          src="/satusehat-default-logo.svg"
                          alt="SATUSEHAT"
                          className="h-2.5 w-2.5 object-contain shrink-0"
                        />
                        <span>IHS Nakes: {user.ihsPractitionerId}</span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 font-mono mt-1 truncate">
                        IHS: Belum Terdaftar
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Single-Tenant Active Facility Information Card (Read-Only & Secure) */}
              <div className="p-3 border-b border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <Hospital className="h-3 w-3 text-teal-600" />
                    <span>Fasilitas Pelayanan Terdaftar</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[9px] font-bold px-1.5 py-0.2 rounded border bg-teal-50 text-teal-800 border-teal-200 flex items-center gap-1"
                  >
                    <img
                      src="/satusehat-default-logo.svg"
                      alt="SATUSEHAT"
                      className="h-2.5 w-2.5 object-contain shrink-0"
                    />
                    <span>
                      {facility?.type === "rumah_sakit"
                        ? "RS Terdaftar Kemenkes"
                        : facility?.type === "puskesmas"
                          ? "Puskesmas Kemenkes"
                          : "Klinik Terdaftar Kemenkes"}
                    </span>
                  </Badge>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 text-xs space-y-2">
                  <div className="flex items-start gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs mt-0.5">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-extrabold text-xs text-slate-900 leading-tight">
                        {facility?.name || "RS Umum Daerah Sehat Sejahtera"}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                        <img
                          src="/satusehat-default-logo.svg"
                          alt="SATUSEHAT"
                          className="h-3 w-3 object-contain shrink-0"
                        />
                        <span>
                          Org ID SATUSEHAT:{" "}
                          <strong className="text-teal-700 font-bold">
                            {facility?.satusehatOrgId || "10000004"}
                          </strong>
                        </span>
                      </p>
                    </div>
                  </div>

                  {facility?.address && (
                    <div className="text-[10px] text-slate-600 border-t border-slate-200/60 pt-1.5 leading-relaxed">
                      <span>{facility.address}</span>
                      {facility.phone && <span> • Telp: {facility.phone}</span>}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono border-t border-slate-200/60 pt-1.5">
                    <span>Poliklinik Terdaftar:</span>
                    <strong className="text-slate-800 font-sans font-bold">
                      {dynamicDepartments?.length ||
                        facility?.departments?.length ||
                        6}{" "}
                      Unit Pelayanan
                    </strong>
                  </div>
                </div>
              </div>

              {/* 3. Multi-Tenant Console & Admin Staff Management */}
              {user?.role === "super_admin" && (
                <div className="p-2.5 border-b border-slate-100 bg-slate-50/70 space-y-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      router.push("/admin");
                    }}
                    className="w-full p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <Shield className="h-3.5 w-3.5 text-indigo-200" />
                    <span>Portal Vendor RME (/admin)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsFacilityManagerOpen(true);
                    }}
                    className="w-full p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Building2 className="h-3.5 w-3.5 text-indigo-700" />
                    <span>Ganti Faskes SIMRS</span>
                  </button>
                </div>
              )}

              {user?.role === "admin" && (
                <div className="p-2.5 border-b border-slate-100 bg-slate-50/70 space-y-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsStaffModalOpen(true);
                    }}
                    className="w-full p-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <Users className="h-3.5 w-3.5 text-teal-700" />
                    <span>Kelola SDM Nakes & Poliklinik</span>
                  </button>
                </div>
              )}

              {/* 4. Action Footer: Clean Minimalist Logout */}
              <div className="p-2 border-t border-slate-100 bg-slate-50/40">
                <button
                  type="button"
                  onClick={async () => {
                    setIsUserMenuOpen(false);
                    await logout();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <LogOut className="h-3.5 w-3.5 text-rose-500 group-hover:-translate-x-0.5 transition-transform" />
                    <span>Keluar dari Aplikasi</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono group-hover:text-rose-400">
                    Logout
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Dialog Manajemen SDM Nakes */}
      <StaffManagementModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
      />

      {/* Modal Dialog Manajemen Multi-Faskes RME Platform */}
      <SuperAdminFacilityManagerModal
        isOpen={isFacilityManagerOpen}
        onClose={() => setIsFacilityManagerOpen(false)}
      />
    </header>
  );
}
