"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Search,
  Building2,
  ShieldCheck,
  Printer,
  ChevronDown,
  X,
  UserPlus,
  Check,
  Bell,
  FlaskConical,
  UserCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClinicQueuePatientItem,
  PatientProfile,
  SatusehatEnvironment,
} from "@/lib/satusehat/types";
import { EhrModule } from "@/components/layout/EhrLeftSidebar";
import { toast } from "sonner";

interface EhrHeaderProps {
  currentEnv: SatusehatEnvironment;
  onEnvChange?: (env: SatusehatEnvironment) => void;
  hospitalName: string;
  department: string;
  onDepartmentChange?: (dept: string) => void;
  onOpenPrintModal: () => void;
  doctorName: string;
  worklist?: ClinicQueuePatientItem[];
  onSelectPatient?: (patient: PatientProfile, targetModule?: EhrModule) => void;
  onOpenRegistration?: () => void;
  isDbSyncing?: boolean;
  isBridgingActive?: boolean;
}

const DEPARTMENTS = [
  "Semua Poli",
  "Poli Penyakit Dalam",
  "Poli Umum",
  "Poli Anak (Pediatri)",
  "Poli Gigi & Mulut",
  "Poli Jantung & Pembuluh Darah",
  "Poli Mata",
];

export function EhrHeader({
  currentEnv,
  hospitalName,
  department,
  onDepartmentChange,
  onOpenPrintModal,
  doctorName,
  worklist = [],
  onSelectPatient,
  onOpenRegistration,
  isDbSyncing = false,
  isBridgingActive = false,
}: EhrHeaderProps) {
  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Clinical Notifications State (Derived dynamically from live worklist)
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      type: "lab" | "queue" | "sync";
      title: string;
      desc: string;
      time: string;
      read: boolean;
    }>
  >([]);

  useEffect(() => {
    const getAge = (birthDate?: string) => {
      if (!birthDate) return 0;
      const bYear = new Date(birthDate).getFullYear();
      const cYear = new Date().getFullYear();
      return isNaN(bYear) ? 0 : cYear - bYear;
    };

    const list: Array<{
      id: string;
      type: "lab" | "queue" | "sync";
      title: string;
      desc: string;
      time: string;
      read: boolean;
    }> = [];

    // 1. Geriatric / High-priority patients
    const geriatric = worklist.filter(
      (w) => w.triagePriority === "geriatric" || getAge(w.patient.birthDate) >= 60
    );
    geriatric.forEach((g, idx) => {
      const age = getAge(g.patient.birthDate);
      list.push({
        id: `notif-geriatric-${g.id || idx}`,
        type: "queue",
        title: "Pasien Prioritas Geriatri",
        desc: `${g.patient.name} (${age > 0 ? `${age} thn, ` : ""}No: ${g.queueNumber}) terdaftar di ${g.department}.`,
        time: "Prioritas",
        read: false,
      });
    });

    // 2. In-progress / consultation patients
    const inProgress = worklist.filter((w) => w.status === "in-progress");
    inProgress.forEach((c, idx) => {
      list.push({
        id: `notif-consult-${c.id || idx}`,
        type: "queue",
        title: "Konsultasi Sedang Berlangsung",
        desc: `${c.patient.name} sedang dalam pemeriksaan DPJP di ${c.department}.`,
        time: "Sedang Berlangsung",
        read: false,
      });
    });

    // 3. Arrived / waiting queue patients
    const arrived = worklist.filter(
      (w) => w.status === "arrived" && getAge(w.patient.birthDate) < 60
    );
    arrived.slice(0, 3).forEach((w, idx) => {
      list.push({
        id: `notif-waiting-${w.id || idx}`,
        type: "queue",
        title: `Antrean ${w.queueNumber} Tiba`,
        desc: `${w.patient.name} di ${w.department} (${w.chiefComplaint || "Pemeriksaan Poli"}).`,
        time: "Menunggu",
        read: false,
      });
    });

    // 4. SATUSEHAT Gateway status
    list.push({
      id: "notif-satusehat-gateway",
      type: "sync",
      title: isBridgingActive ? "Gateway SATUSEHAT Kemenkes RI" : "Mode Simulasi Lokal SIMRS",
      desc: isBridgingActive
        ? `Layanan interoperabilitas FHIR R4 terhubung aktif pada server ${currentEnv.toUpperCase()} Kemenkes RI.`
        : `Sistem beroperasi dalam mode simulasi lokal. Kredensial SATUSEHAT belum dihubungkan ke server Kemenkes.`,
      time: isBridgingActive ? "Live Online" : "Simulasi",
      read: true,
    });

    setNotifications(list);
  }, [worklist, currentEnv, isBridgingActive]);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const deptDropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

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
      item.queueNumber.toLowerCase().includes(q) ||
      item.department.toLowerCase().includes(q) ||
      item.chiefComplaint.toLowerCase().includes(q)
    );
  });

  const handlePatientClick = (item: ClinicQueuePatientItem) => {
    // If encounter is finished, open 'resume' (Resume Medis), otherwise open 'entry' (SOAP DPJP Pemeriksaan)
    const targetModule: EhrModule = item.status === "finished" ? "resume" : "entry";
    if (onSelectPatient) {
      onSelectPatient(item.patient, targetModule);
    }
    setIsSearchOpen(false);
    setSearchQuery("");
    toast.success(`Membuka Rekam Medis: ${item.patient.name}`, {
      description: `No. RM: ${item.patient.mrn} • Status: ${
        item.status === "finished" ? "Selesai Berobat" : "Pemeriksaan Dokter (SOAP)"
      }`,
    });
  };

  const handleSelectDepartment = (dept: string) => {
    if (onDepartmentChange) {
      onDepartmentChange(dept);
    }
    setIsDeptDropdownOpen(false);
    const count = dept === "Semua Poli"
      ? worklist.length
      : worklist.filter((w) => w.department === dept).length;
    toast.info(`Poli aktif beralih ke: ${dept}`, {
      description: `${count} pasien antrean terdaftar di poli ini`,
    });
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("Semua notifikasi telah ditandai dibaca");
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const availableDepartments = Array.from(
    new Set([
      ...DEPARTMENTS,
      ...worklist.map((w) => w.department).filter(Boolean),
    ])
  );

  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shadow-2xs gap-3">
      {/* 1. Left: Brand & Hospital Identity (Clean, without redundant badge) */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs shrink-0">
          <Building2 className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <div className="font-extrabold text-sm text-slate-900 tracking-tight whitespace-nowrap">
            {hospitalName || "RSUD Sehat Sejahtera"}
          </div>
          <p className="text-[10px] text-slate-400 font-medium truncate">
            SIMRS Rawat Jalan • Terintegrasi SATUSEHAT
          </p>
        </div>
      </div>

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
              placeholder="Cari Pasien (Nama, RM, NIK, Antrean)..."
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
            <div className="absolute top-full mt-1.5 left-0 w-full sm:w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                <span>
                  {searchQuery.trim()
                    ? `Hasil Pencarian (${filteredPatients.length})`
                    : department === "Semua Poli"
                    ? `Daftar Pasien Semua Poli (${filteredPatients.length})`
                    : `Daftar Pasien ${department} (${filteredPatients.length})`}
                </span>
                {onOpenRegistration && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchOpen(false);
                      onOpenRegistration();
                    }}
                    className="text-teal-600 hover:text-teal-800 flex items-center gap-1 font-bold text-[10px] cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>+ Pasien Baru</span>
                  </button>
                )}
              </div>

              {/* Patients List */}
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
                        className="w-full text-left p-2 rounded-xl hover:bg-teal-50/80 transition-colors flex items-center justify-between gap-2.5 group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Queue Pill */}
                          <div className="h-7 px-2 min-w-[48px] rounded-lg bg-teal-50 border border-teal-200 text-teal-900 font-mono font-extrabold text-[11px] flex items-center justify-center shrink-0 whitespace-nowrap group-hover:bg-teal-600 group-hover:text-white group-hover:border-teal-600 transition-colors">
                            {item.queueNumber}
                          </div>

                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-900 group-hover:text-teal-950 truncate max-w-[170px]">
                                {item.patient.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                ({item.patient.gender === "male" ? "L" : "P"})
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono truncate">
                              No. RM <strong className="text-slate-700">{item.patient.mrn.replace(/^RM-?/i, "")}</strong> • NIK: {item.patient.nik}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex flex-col items-end gap-0.5 text-right">
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
                          <span className="text-[9px] text-slate-400 font-medium truncate max-w-[110px]">
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
                          <strong className="text-slate-800">{searchQuery}</strong>&quot;.
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
            <span className="truncate max-w-[110px] sm:max-w-[140px]">{department}</span>
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
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center border-2 border-white animate-pulse">
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

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 transition-colors hover:bg-slate-50 flex items-start gap-2.5 ${
                      !notif.read ? "bg-teal-50/40" : ""
                    }`}
                  >
                    <div
                      className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                        notif.type === "lab"
                          ? "bg-teal-100 text-teal-700"
                          : notif.type === "queue"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {notif.type === "lab" ? (
                        <FlaskConical className="h-3.5 w-3.5" />
                      ) : notif.type === "queue" ? (
                        <UserCheck className="h-3.5 w-3.5" />
                      ) : (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-900 truncate">
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {notif.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {notif.desc}
                      </p>
                    </div>
                  </div>
                ))}
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

        {/* Compact SATUSEHAT Connection / Simulation Badge */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-medium whitespace-nowrap shrink-0 shadow-2xs"
          title={
            isBridgingActive
              ? `Bridging SATUSEHAT Aktif (${currentEnv === "production" ? "Server Utama Production" : "Server Uji Coba Staging"})`
              : "Bridging SATUSEHAT Belum Terhubung (Mode Simulasi Lokal). Masuk ke menu Bridging untuk menghubungkan."
          }
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isBridgingActive
                ? currentEnv === "production"
                  ? "bg-emerald-500"
                  : "bg-teal-500"
                : "bg-amber-400"
            } ${isBridgingActive ? "animate-pulse" : ""}`}
          />
          <span className="text-[10px] text-slate-600 font-bold">
            {isBridgingActive
              ? currentEnv === "production"
                ? "SATUSEHAT Live (Prod)"
                : "SATUSEHAT Live (Staging)"
              : "Simulasi Lokal (Offline)"}
          </span>
        </div>

        {/* Quick Print Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenPrintModal}
          className="h-9 px-3 text-xs font-semibold gap-1.5 bg-white border-slate-200 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 shrink-0 whitespace-nowrap rounded-full shadow-2xs"
        >
          <Printer className="h-3.5 w-3.5 text-teal-600" />
          <span className="hidden sm:inline">Cetak Resume</span>
        </Button>

        {/* DPJP Doctor Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 shrink-0">
          <div className="h-8 w-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs border border-teal-200 shrink-0">
            {doctorName
              .replace("dr. ", "")
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div className="hidden xl:flex flex-col text-left shrink-0">
            <span className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
              {doctorName}
            </span>
            <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              DPJP Online
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}


