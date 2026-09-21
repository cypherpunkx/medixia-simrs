"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tv,
  Volume2,
  Users,
  Activity,
  Radio,
  Clock,
  CheckCircle,
  Play,
  RotateCcw,
  Sparkles,
  Bell,
  Mic,
  VolumeX,
  Calendar,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import { ClinicQueuePatientItem, PatientProfile } from "@/lib/satusehat/types";
import {
  speakIndonesianQueueCall,
  VOICE_PROFILES,
  VoiceProfileId,
  playHospitalChime,
} from "@/lib/audio/queueVoiceAnnouncer";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";

interface PublicQueueDisplayModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  hospitalName?: string;
  worklist?: ClinicQueuePatientItem[];
  onUpdateStatus?: (
    itemId: string,
    status: "arrived" | "in-progress" | "finished",
    silent?: boolean
  ) => void;
  onSelectPatient?: (
    patient: PatientProfile,
    targetModule?: string,
    targetQueueItem?: ClinicQueuePatientItem,
    targetDepartment?: string
  ) => void;
}

interface DepartmentConfig {
  id?: string;
  code: string;
  deptCode?: string;
  department: string;
  room: string;
  defaultDoctor: string;
}

const DEPARTMENTS: DepartmentConfig[] = [
  {
    id: "dept-rs-01",
    code: "A",
    deptCode: "INT",
    department: "Poli Penyakit Dalam",
    room: "Ruang 204 (Lt. 2)",
    defaultDoctor: "dr. Rian Pratama, Sp.PD",
  },
  {
    id: "dept-rs-02",
    code: "B",
    deptCode: "UMU",
    department: "Poli Umum",
    room: "Ruang 102 (Lt. 1)",
    defaultDoctor: "dr. Amanda Putri, M.Biomed",
  },
  {
    id: "dept-rs-03",
    code: "C",
    deptCode: "ANA",
    department: "Poli Anak (Pediatri)",
    room: "Ruang 105 (Lt. 1)",
    defaultDoctor: "dr. Maya Anggraini, Sp.A",
  },
  {
    id: "dept-rs-04",
    code: "D",
    deptCode: "GIG",
    department: "Poli Gigi & Mulut",
    room: "Ruang 201 (Lt. 2)",
    defaultDoctor: "drg. Kevin Tanuwidjaja",
  },
  {
    id: "dept-rs-05",
    code: "E",
    deptCode: "JAN",
    department: "Poli Jantung & Pembuluh Darah",
    room: "Ruang 208 (Lt. 2)",
    defaultDoctor: "dr. Rian Hidayat, Sp.JP",
  },
  {
    id: "dept-rs-06",
    code: "F",
    deptCode: "MAT",
    department: "Poli Mata",
    room: "Ruang 210 (Lt. 2)",
    defaultDoctor: "dr. Nadia Putri, Sp.M",
  },
];

export function matchesDepartment(itemDept?: string, targetDept?: string): boolean {
  if (!itemDept || !targetDept) return false;
  const a = itemDept.toLowerCase().trim();
  const b = targetDept.toLowerCase().trim();
  if (a === b) return true;
  const cleanA = a.replace(/\s*\([^)]*\).*/g, "").trim();
  const cleanB = b.replace(/\s*\([^)]*\).*/g, "").trim();
  if (cleanA === cleanB) return true;
  if (cleanA && cleanB && (cleanA.includes(cleanB) || cleanB.includes(cleanA))) return true;
  return false;
}

export function isQueueItemForDept(item: ClinicQueuePatientItem, dept: DepartmentConfig): boolean {
  if (item.departmentId && dept.id && item.departmentId === dept.id) {
    return true;
  }
  return matchesDepartment(item.department, dept.department);
}

export function PublicQueueDisplayModal({
  isOpen,
  onOpenChange,
  hospitalName = "RS Umum Daerah Sehat Sejahtera",
  worklist = [],
  onUpdateStatus,
  onSelectPatient,
}: PublicQueueDisplayModalProps) {
  const { departments: authDepartments } = useAuth();

  const activeDepartmentsList: DepartmentConfig[] = React.useMemo(() => {
    if (authDepartments && authDepartments.length > 0) {
      const fallbackLetters = ["A", "B", "C", "D", "E", "F", "G", "H"];
      return authDepartments.map((d, idx) => ({
        id: d.id,
        code: d.queuePrefix || fallbackLetters[idx % fallbackLetters.length],
        deptCode: d.code || d.name.substring(0, 3).toUpperCase(),
        department: d.name,
        room: d.room || `Ruang ${idx + 1}`,
        defaultDoctor: d.defaultDoctorName || "dr. Dokter DPJP",
      }));
    }
    return DEPARTMENTS;
  }, [authDepartments]);

  const [timeString, setTimeString] = useState("");
  const [dateString, setDateString] = useState("");
  const [liveWorklist, setLiveWorklist] = useState<ClinicQueuePatientItem[]>(worklist);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [lastCalled, setLastCalled] = useState<{
    queueNumber: string;
    patientName: string;
    department: string;
    room: string;
    doctor: string;
    queueItemId?: string;
  } | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoiceProfile, setSelectedVoiceProfile] = useState<VoiceProfileId>("jokowi");
  const [withChime, setWithChime] = useState<boolean>(true);

  // Synchronize initial prop
  useEffect(() => {
    setLiveWorklist(worklist);
  }, [worklist]);

  // Live Real-Time Clock & Date in Indonesian
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " WIB"
      );
      setDateString(
        now.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      );
    };
    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-refresh today's queue directly from DB every 5s while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const fetchTodayQueue = async () => {
      try {
        const res = await fetch("/api/queue");
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            setLiveWorklist(data.data);
          }
        }
      } catch (err) {
        console.error("Gagal sinkronisasi data antrean display TV:", err);
      }
    };

    fetchTodayQueue();
    const interval = setInterval(fetchTodayQueue, 5000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Initialize lastCalled from the active in-progress patient if not set
  useEffect(() => {
    if (!lastCalled && liveWorklist.length > 0) {
      const activeItem =
        liveWorklist.find((w) => w.status === "in-progress") || liveWorklist[0];
      if (activeItem) {
        setLastCalled({
          queueNumber: activeItem.queueNumber,
          patientName: activeItem.patient.name,
          department: activeItem.department,
          room: activeItem.room,
          doctor: activeItem.doctor,
          queueItemId: activeItem.id,
        });
      }
    }
  }, [liveWorklist, lastCalled]);

  const speakQueueCall = async (data: {
    queueNumber: string;
    patientName: string;
    department: string;
    room: string;
    doctor: string;
    queueItemId?: string;
  }) => {
    setLastCalled(data);
    setIsSpeaking(true);

    // Persist call action and timestamp to DB
    if (data.queueItemId) {
      fetch(`/api/queue/${data.queueItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "call" }),
      })
        .then((res) => res.json())
        .then((resJson) => {
          if (resJson.success && resJson.data) {
            setLiveWorklist((prev) =>
              prev.map((w) =>
                w.id === data.queueItemId
                  ? {
                      ...w,
                      callCount: resJson.data.callCount,
                      calledAt: resJson.data.calledAt,
                    }
                  : w
              )
            );
          }
        })
        .catch((err) => console.error("Gagal update call count ke DB:", err));
    }

    const profileInfo = VOICE_PROFILES[selectedVoiceProfile] || VOICE_PROFILES.jokowi;

    await speakIndonesianQueueCall({
      queueNumber: data.queueNumber,
      patientName: data.patientName,
      department: data.department,
      room: data.room,
      doctor: data.doctor,
      profileId: selectedVoiceProfile,
      withChime: withChime,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });

    const cleanPatientName = data.patientName.replace(/\s*\([^)]*\)/g, "").trim();
    toast.success(`Memanggil Antrean ${data.queueNumber} — ${cleanPatientName}`, {
      description: `${data.department} • Suara: ${profileInfo.name}`,
      duration: 4000,
    });
  };

  const handleCallClinicPatient = (dept: DepartmentConfig) => {
    const deptWorklist = facilityScopedLiveWorklist.filter((w) =>
      isQueueItemForDept(w, dept)
    );

    const inProgress = deptWorklist.find((w) => w.status === "in-progress");
    const waiting = deptWorklist
      .filter((w) => w.status === "arrived")
      .sort((a, b) => (a.arrivalTimestamp || 0) - (b.arrivalTimestamp || 0))[0];

    const target = inProgress || waiting;

    if (target) {
      if (target.status === "arrived" && onUpdateStatus) {
        onUpdateStatus(target.id, "in-progress");
      }
      if (onSelectPatient) {
        onSelectPatient(target.patient, "entry", target, target.department);
      }
      speakQueueCall({
        queueNumber: target.queueNumber,
        patientName: target.patient.name,
        department: target.department,
        room: target.room,
        doctor: target.doctor,
        queueItemId: target.id,
      });
    } else {
      toast.info(`Belum ada antrean pasien hari ini di ${dept.department}.`);
    }
  };

  const handleAdvanceClinicQueue = (dept: DepartmentConfig) => {
    const deptWorklist = facilityScopedLiveWorklist.filter((w) =>
      isQueueItemForDept(w, dept)
    );

    const inProgress = deptWorklist.find((w) => w.status === "in-progress");
    const nextWaiting = deptWorklist
      .filter((w) => w.status === "arrived")
      .sort((a, b) => (a.arrivalTimestamp || 0) - (b.arrivalTimestamp || 0))[0];

    if (nextWaiting) {
      if (inProgress && onUpdateStatus) {
        onUpdateStatus(inProgress.id, "finished", true);
      }
      if (onUpdateStatus) {
        onUpdateStatus(nextWaiting.id, "in-progress", false);
      }
      if (onSelectPatient) {
        onSelectPatient(nextWaiting.patient, "entry", nextWaiting, nextWaiting.department);
      }
      speakQueueCall({
        queueNumber: nextWaiting.queueNumber,
        patientName: nextWaiting.patient.name,
        department: nextWaiting.department,
        room: nextWaiting.room,
        doctor: nextWaiting.doctor,
        queueItemId: nextWaiting.id,
      });
    } else {
      toast.info(
        `Belum ada antrean pasien yang sedang menunggu di ${dept.department}.`
      );
      if (inProgress) {
        speakQueueCall({
          queueNumber: inProgress.queueNumber,
          patientName: inProgress.patient.name,
          department: inProgress.department,
          room: inProgress.room,
          doctor: inProgress.doctor,
          queueItemId: inProgress.id,
        });
      }
    }
  };

  const facilityScopedLiveWorklist = React.useMemo(() => {
    if (activeDepartmentsList.length === 0) return liveWorklist;
    return liveWorklist.filter((w) =>
      activeDepartmentsList.some((dept) => isQueueItemForDept(w, dept))
    );
  }, [liveWorklist, activeDepartmentsList]);

  const totalHariIni = facilityScopedLiveWorklist.length;
  const sedangDiperiksa = facilityScopedLiveWorklist.filter((w) => w.status === "in-progress").length;
  const menungguHariIni = facilityScopedLiveWorklist.filter((w) => w.status === "arrived").length;
  const selesaiHariIni = facilityScopedLiveWorklist.filter((w) => w.status === "finished").length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[86vh] flex flex-col p-4 sm:p-5 overflow-hidden bg-slate-900 text-white border-slate-800 shadow-2xl">
        {/* Modal Header */}
        <DialogHeader className="pb-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-12">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
              <Tv className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2 flex-wrap">
                <span>{hospitalName}</span>
                <Badge
                  variant="outline"
                  className="text-[9px] font-mono bg-teal-500/20 text-teal-300 border-teal-500/30 py-0"
                >
                  MONITOR RUANG TUNGGU TERINTEGRASI
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[9px] font-bold bg-amber-500/20 text-amber-300 border-amber-500/30 py-0 flex items-center gap-1"
                >
                  <CalendarDays className="h-3 w-3 text-amber-400" />
                  <span>ANTREAN HARI INI</span>
                </Badge>
              </DialogTitle>
              <p className="text-[11px] text-slate-400">
                Sistem Panggilan &amp; Tampilan Antrean Rawat Jalan Terintegrasi SATUSEHAT
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-800/90 px-3 py-1 rounded-lg border border-slate-700 shadow-xs">
              <Calendar className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-bold text-amber-200">
                {dateString || "Hari Ini"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800/90 px-3 py-1 rounded-lg border border-slate-700 shadow-xs">
              <Clock className="h-3.5 w-3.5 text-teal-400" />
              <span className="font-mono text-xs font-bold text-teal-300">
                {timeString || "12:00:00 WIB"}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Main TV Screen Canvas */}
        <div className="flex-1 overflow-y-auto space-y-3 p-1 max-h-[calc(86vh-120px)] pr-1.5">
          {/* Today's Queue Summary Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-800/80 border border-slate-700/80 p-2.5 rounded-xl shadow-xs">
            <div className="flex items-center gap-2.5 bg-slate-900/70 p-2 rounded-lg border border-slate-700/60">
              <div className="h-8 w-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                  Total Hari Ini
                </span>
                <span className="text-base font-black text-white font-mono">
                  {totalHariIni} <span className="text-[10px] font-normal text-slate-400">Pasien</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-slate-900/70 p-2 rounded-lg border border-slate-700/60">
              <div className="h-8 w-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-blue-300 font-bold block">
                  Sedang Diperiksa
                </span>
                <span className="text-base font-black text-blue-300 font-mono">
                  {sedangDiperiksa} <span className="text-[10px] font-normal text-slate-400">Pasien</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-slate-900/70 p-2 rounded-lg border border-slate-700/60">
              <div className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-amber-300 font-bold block">
                  Menunggu Giliran
                </span>
                <span className="text-base font-black text-amber-300 font-mono">
                  {menungguHariIni} <span className="text-[10px] font-normal text-slate-400">Pasien</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-slate-900/70 p-2 rounded-lg border border-slate-700/60">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-emerald-300 font-bold block">
                  Selesai Hari Ini
                </span>
                <span className="text-base font-black text-emerald-300 font-mono">
                  {selesaiHariIni} <span className="text-[10px] font-normal text-slate-400">Pasien</span>
                </span>
              </div>
            </div>
          </div>

          {/* Voice Persona & Audio Settings Control Strip */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                <Mic className="h-3.5 w-3.5 text-teal-400" />
                <span>Karakter Suara:</span>
              </div>

              {/* Profile Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(Object.keys(VOICE_PROFILES) as VoiceProfileId[]).map((profId) => {
                  const prof = VOICE_PROFILES[profId];
                  const isSelected = selectedVoiceProfile === profId;
                  return (
                    <button
                      key={profId}
                      type="button"
                      onClick={() => {
                        setSelectedVoiceProfile(profId);
                        toast.info(`Karakter suara dipilih: ${prof.name}`, {
                          description: prof.tagline,
                        });
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isSelected
                          ? profId === "jokowi"
                            ? "bg-red-600 text-white border-red-500 shadow-sm ring-2 ring-red-400/40"
                            : "bg-teal-600 text-white border-teal-500 shadow-sm ring-2 ring-teal-400/40"
                          : "bg-slate-700/60 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
                      }`}
                    >
                      <span>{prof.icon}</span>
                      <span>{prof.name.split(" (")[0]}</span>
                      {profId === "jokowi" && (
                        <span className="text-[8px] bg-white/20 text-white px-1 py-0.2 rounded font-extrabold ml-0.5 uppercase tracking-wider">
                          Khas
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Chime Bell Toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = !withChime;
                  setWithChime(next);
                  if (next) playHospitalChime();
                  toast.info(next ? "Bel RS (Ting-Tung) aktif" : "Bel RS dinonaktifkan");
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  withChime
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-slate-700/50 text-slate-400 border-slate-700 hover:text-slate-200"
                }`}
                title="Bunyikan Ting-Tung Khas RS sebelum suara pemanggilan"
              >
                <Bell className={`h-3.5 w-3.5 ${withChime ? "text-amber-400" : "text-slate-500"}`} />
                <span>Bell RS: {withChime ? "ON" : "OFF"}</span>
              </button>

              {/* Test Voice Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const testItem =
                    lastCalled ||
                    (liveWorklist && liveWorklist.length > 0
                      ? {
                          queueNumber: liveWorklist[0].queueNumber,
                          patientName: liveWorklist[0].patient.name,
                          department: liveWorklist[0].department,
                          room: liveWorklist[0].room || "Ruang Periksa",
                          doctor: liveWorklist[0].doctor || "Dokter Jaga",
                        }
                      : null);

                  if (testItem) {
                    speakQueueCall(testItem);
                  } else {
                    toast.info("Belum ada data antrean hari ini untuk pemanggilan suara.");
                  }
                }}
                disabled={isSpeaking}
                className="text-xs h-7.5 bg-slate-700 hover:bg-slate-600 text-teal-300 border-slate-600 font-bold gap-1 cursor-pointer"
              >
                <Play className="h-3 w-3 text-teal-400" />
                <span>{isSpeaking ? "Memanggil..." : "Tes Suara"}</span>
              </Button>
            </div>
          </div>

          {/* Active Call Hero Banner */}
          {lastCalled && (
            <div className="bg-gradient-to-r from-teal-950 via-teal-900 to-slate-900 p-3 sm:p-4 rounded-xl border border-teal-500/50 shadow-lg flex flex-col md:flex-row items-center justify-between gap-3 animate-fade-in-up">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-teal-500 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0 relative">
                  <Volume2 className="h-6 w-6" />
                  {isSpeaking && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-300 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-400"></span>
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-teal-300 uppercase tracking-widest block">
                      PANGGILAN ANTREAN TERAKHIR (HARI INI)
                    </span>
                    <span className="text-[9px] bg-slate-800 text-teal-300 px-1.5 py-0.2 rounded border border-teal-500/30 font-mono">
                      {VOICE_PROFILES[selectedVoiceProfile]?.name}
                    </span>
                    {isSpeaking && (
                      <div className="audio-wave-wrap text-teal-400 ml-1">
                        <span className="audio-wave-bar-1"></span>
                        <span className="audio-wave-bar-2"></span>
                        <span className="audio-wave-bar-3"></span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2.5">
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
                      {lastCalled.queueNumber}
                    </h2>
                    <span className="text-base sm:text-lg font-bold text-teal-200">
                      {lastCalled.patientName}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium">
                    {lastCalled.department} •{" "}
                    <strong className="text-white">{lastCalled.room}</strong> •{" "}
                    {lastCalled.doctor}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => speakQueueCall(lastCalled)}
                  disabled={isSpeaking}
                  className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs gap-1.5 shadow-sm h-8 cursor-pointer btn-press transition-all duration-150"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  <span>{isSpeaking ? "Memanggil..." : "Ulangi Panggilan"}</span>
                </Button>
              </div>
            </div>
          )}

          {/* Grid of Clinic Queue Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {activeDepartmentsList.map((dept) => {
              const deptWorklist = facilityScopedLiveWorklist.filter((w) =>
                isQueueItemForDept(w, dept)
              );

              const inProgress = deptWorklist.find((w) => w.status === "in-progress");
              const waitingList = deptWorklist
                .filter((w) => w.status === "arrived")
                .sort((a, b) => (a.arrivalTimestamp || 0) - (b.arrivalTimestamp || 0));
              const finishedList = deptWorklist.filter((w) => w.status === "finished");

              const activeDisplayItem =
                inProgress ||
                waitingList[0] ||
                finishedList[finishedList.length - 1];

              const currentNumber =
                activeDisplayItem?.queueNumber || "-";
              const patientName =
                activeDisplayItem?.patient.name || "Belum Ada Antrean";
              const doctorName =
                activeDisplayItem?.doctor || dept.defaultDoctor;
              const waitingCount = waitingList.length;
              const totalDeptToday = deptWorklist.length;

              const isAllFinished = !inProgress && waitingList.length === 0 && finishedList.length > 0;
              const statusBadge = inProgress
                ? "serving"
                : waitingList.length > 0
                ? "calling"
                : isAllFinished
                ? "finished"
                : "idle";

              return (
                <div
                  key={dept.id || dept.code}
                  className={`p-3 rounded-xl border card-interactive transition-all duration-200 ${
                    inProgress
                      ? "bg-slate-800 border-teal-400 shadow-md ring-1 ring-teal-500/50"
                      : isAllFinished
                      ? "bg-slate-800/80 border-emerald-500/30"
                      : "bg-slate-800/60 border-slate-700/80 hover:border-slate-500"
                  }`}
                >
                  {/* Poli Header */}
                  <div className="flex items-start justify-between border-b border-slate-700/60 pb-1.5 mb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-black bg-teal-500/20 text-teal-300 border border-teal-500/30">
                          {dept.deptCode || dept.code}
                        </span>
                        <h3 className="font-bold text-xs text-white truncate max-w-[150px]">
                          {dept.department}
                        </h3>
                      </div>
                      <p className="text-[9px] text-teal-400 font-mono mt-0.5">
                        {dept.room} • Prefix: <strong>{dept.code}</strong>
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[8px] uppercase font-bold px-1.5 py-0 ${
                        statusBadge === "serving"
                          ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                          : statusBadge === "calling"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : statusBadge === "finished"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-slate-700/60 text-slate-400 border-slate-600"
                      }`}
                    >
                      {statusBadge === "serving"
                        ? "Sedang Dilayani"
                        : statusBadge === "calling"
                        ? "Ada Antrean"
                        : statusBadge === "finished"
                        ? "Semua Selesai"
                        : "Kosong"}
                    </Badge>
                  </div>

                  {/* Queue Number Callout */}
                  <div className="flex items-center justify-between my-1">
                    <div>
                      <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-semibold">
                        {inProgress
                          ? "SEDANG DIPERIKSA (HARI INI)"
                          : isAllFinished
                          ? "TERAKHIR SELESAI"
                          : waitingList.length > 0
                          ? "NOMOR BERIKUTNYA"
                          : "STATUS ANTREAN"}
                      </span>
                      <span className="text-2xl font-black text-white font-mono tracking-tight">
                        {currentNumber}
                      </span>
                      <span className="text-[11px] text-slate-300 block font-medium truncate max-w-[130px]">
                        {patientName}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-semibold">
                        SISA MENUNGGU
                      </span>
                      <span className="text-xl font-black text-teal-400 font-mono">
                        {waitingCount}
                      </span>
                      <span className="text-[9px] text-slate-400 block">
                        Pasien (Total: {totalDeptToday})
                      </span>
                    </div>
                  </div>

                  {/* Doctor Name */}
                  <p className="text-[10px] text-slate-400 italic truncate border-t border-slate-700/50 pt-1.5 mb-2">
                    {doctorName}
                  </p>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCallClinicPatient(dept)}
                      className="text-[10px] font-bold text-teal-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-600 hover:border-teal-400 rounded-lg flex items-center justify-center gap-1.5 h-7 cursor-pointer transition-all shadow-xs active:scale-95"
                      title="Panggil pasien poliklinik dengan suara"
                    >
                      <Volume2 className="h-3.5 w-3.5 text-teal-400" />
                      <span>Panggil</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAdvanceClinicQueue(dept)}
                      className="bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1.5 h-7 shadow-sm cursor-pointer transition-all active:scale-95"
                      title="Panggil pasien berikutnya di antrean"
                    >
                      <Play className="h-3 w-3" />
                      <span>Berikutnya</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Running Marquee */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            <span>
              Koneksi Antrean SATUSEHAT:{" "}
              <strong className="text-emerald-400">Aktif & Sinkron</strong>
            </span>
          </div>

          <p className="text-[10px] text-slate-500 italic">
            Harap siapkan KTP / Kartu Berobat saat nomor antrean Anda dipanggil.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
