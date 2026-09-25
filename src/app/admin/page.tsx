"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Hospital,
  Building2,
  Shield,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  LogOut,
  Stethoscope,
  Activity,
  Layers,
  MapPin,
  Phone,
  Radio,
  FileCheck2,
  Server,
  Zap,
  ArrowRight,
  ShieldAlert,
  SlidersHorizontal,
  Edit3,
  Archive,
  ArchiveRestore,
  AlertTriangle,
  Loader2,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import { FacilityProfile, FacilityType } from "@/lib/satusehat/types";
import { FacilityRegistrationModal } from "@/components/facility/FacilityRegistrationModal";
import { FacilityEditModal } from "@/components/facility/FacilityEditModal";
import { CustomSelect } from "@/components/ui/custom-select";

export default function SuperAdminVendorPortalPage() {
  const router = useRouter();
  const { user, allFacilities, switchFacility, refreshFacilities, logout, isLoading } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedActiveFilter, setSelectedActiveFilter] = useState<string>("all");
  const [testingFacilityId, setTestingFacilityId] = useState<string | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State Modal Edit Faskes & Kredensial
  const [editingFacility, setEditingFacility] = useState<FacilityProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // State Dialog Konfirmasi Nonaktifkan / Arsipkan
  const [facilityToDeactivate, setFacilityToDeactivate] = useState<FacilityProfile | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Load all facilities on mount (termasuk yang diarsipkan)
  useEffect(() => {
    refreshFacilities(true);
  }, [refreshFacilities]);

  // Jika belum login, arahkan ke halaman login vendor /admin/login
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/admin/login");
    }
  }, [user, isLoading, router]);

  // Loading state
  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4 text-slate-800">
        <div className="h-12 w-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center animate-pulse">
          <Activity className="h-6 w-6 text-teal-600" />
        </div>
        <p className="text-xs font-semibold text-slate-500 font-mono tracking-wide">
          Memuat Konsol Super Admin Medixia...
        </p>
      </div>
    );
  }

  // RBAC Guard: Hanya akun dengan role super_admin yang berhak mengakses Vendor Portal
  if (!user || user.role !== "super_admin") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-3xl p-7 shadow-xl text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-bold text-slate-900">Akses Terbatas (Vendor Portal)</h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Halaman ini diperuntukkan secara khusus bagi <strong>Penyedia Layanan RME (Super Admin)</strong> untuk mengelola fasilitas kesehatan terdaftar dan kredensial SATUSEHAT.
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-600 text-left space-y-1 font-mono">
            <p><strong>Akun Aktif:</strong> {user ? user.name : "Belum Login"}</p>
            <p>
              <strong>Hak Akses:</strong>{" "}
              {user
                ? user.role === "doctor"
                  ? "Dokter"
                  : user.role === "nurse"
                  ? "Perawat"
                  : user.role === "registration"
                  ? "Petugas Pendaftaran"
                  : user.role === "pharmacy"
                  ? "Apoteker / Farmasi"
                  : user.role === "admin"
                  ? "Administrator Faskes"
                  : user.role === "super_admin"
                  ? "Super Admin"
                  : user.role
                : "Tamu (Belum Login)"}
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border-slate-200 text-xs rounded-xl"
            >
              Kembali ke SIMRS
            </Button>
            <Button
              onClick={logout}
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs rounded-xl"
            >
              Ganti Akun
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Handler uji koneksi SATUSEHAT per-faskes
  const handleTestConnection = async (f: FacilityProfile) => {
    try {
      setTestingFacilityId(f.id);
      const res = await fetch("/api/facilities/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facilityId: f.id }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Koneksi SATUSEHAT Sukses: ${f.name}`, {
          description: `Token aktif ${data.data.tokenExpiresIn} detik (Latency: ${data.data.telemetry?.latencyMs || 0}ms)`,
        });
        await refreshFacilities(true);
      } else {
        toast.error(`Koneksi Gagal: ${f.name}`, {
          description: data.error || "Gagal mendapatkan token OAuth2 SATUSEHAT Kemenkes.",
        });
        await refreshFacilities(true);
      }
    } catch {
      toast.error(`Gagal menguji koneksi ke ${f.name}`);
    } finally {
      setTestingFacilityId(null);
    }
  };

  // Handler beralih ke SIMRS faskes tertentu
  const handleAccessFacilitySimrs = async (facilityId: string) => {
    await switchFacility(facilityId);
    toast.success("Beralih ke sesi SIMRS faskes...");
    router.push("/");
  };

  // Handler buka modal edit faskes & kredensial
  const handleOpenEditModal = (f: FacilityProfile) => {
    setEditingFacility(f);
    setIsEditModalOpen(true);
  };

  // Handler ubah status aktif/nonaktif (Soft Delete / Archive)
  const handleToggleFacilityStatus = async (f: FacilityProfile, newActiveState: boolean) => {
    try {
      setIsTogglingStatus(true);
      const res = await fetch(`/api/facilities/${f.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newActiveState }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Status faskes berhasil diperbarui");
        await refreshFacilities(true);
        setFacilityToDeactivate(null);
      } else {
        toast.error(data.error || "Gagal mengubah status faskes.");
      }
    } catch {
      toast.error("Terjadi gangguan koneksi ke server.");
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Filter facilities
  const filteredFacilities = allFacilities.filter((f) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      f.name.toLowerCase().includes(q) ||
      f.satusehatOrgId.toLowerCase().includes(q) ||
      (f.licenseNumber && f.licenseNumber.toLowerCase().includes(q)) ||
      (f.address && f.address.toLowerCase().includes(q));

    const matchType = selectedType === "all" || f.type === selectedType;
    const matchStatus =
      selectedStatus === "all" ||
      (selectedStatus === "connected" && f.satusehatStatus === "connected") ||
      (selectedStatus === "unverified" && (f.satusehatStatus === "unverified" || !f.satusehatStatus)) ||
      (selectedStatus === "error" && f.satusehatStatus === "error");

    const matchActive =
      selectedActiveFilter === "all" ||
      (selectedActiveFilter === "active" && f.isActive !== false) ||
      (selectedActiveFilter === "inactive" && f.isActive === false);

    return matchQuery && matchType && matchStatus && matchActive;
  });

  // Calculate statistics
  const totalFacilities = allFacilities.length;
  const activeCount = allFacilities.filter((f) => f.isActive !== false).length;
  const inactiveCount = allFacilities.filter((f) => f.isActive === false).length;
  const connectedCount = allFacilities.filter((f) => f.satusehatStatus === "connected").length;
  const prodCount = allFacilities.filter((f) => f.satusehatEnv === "production").length;
  const stagingCount = allFacilities.filter((f) => f.satusehatEnv === "staging" || !f.satusehatEnv).length;
  const totalDepts = allFacilities.reduce((acc, f) => acc + (f.departments?.length || 0), 0);

  const getFacilityTypeLabel = (type: FacilityType) => {
    switch (type) {
      case "rumah_sakit":
        return "Rumah Sakit";
      case "klinik_pratama":
        return "Klinik Pratama";
      case "klinik_utama":
        return "Klinik Utama";
      case "praktik_mandiri":
        return "Praktik Mandiri";
      default:
        return "Puskesmas / Klinik";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* 1. Top Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900">
                MEDIXIA<span className="text-teal-600">.SIMRS</span>
              </span>
              <Badge className="bg-teal-50 text-teal-700 border-teal-200 text-[10px] font-bold tracking-wide">
                SUPER ADMIN
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Konsol Manajemen Multi-Faskes &amp; Gateway SATUSEHAT Kemenkes RI
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/")}
            className="hidden sm:inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200 shadow-2xs text-xs font-semibold rounded-xl cursor-pointer"
          >
            <Stethoscope className="h-3.5 w-3.5 text-teal-600" />
            <span>Buka SIMRS Klinik</span>
            <ExternalLink className="h-3 w-3 text-slate-400" />
          </Button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {/* User Profile */}
          <div className="flex items-center gap-2.5 bg-slate-100/80 border border-slate-200/80 rounded-xl px-3 py-1.5">
            <div className="h-7 w-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
              <Shield className="h-4 w-4" />
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-bold text-slate-900 leading-tight">{user.name}</p>
              <p className="text-[10px] text-teal-700 font-mono font-semibold">SUPER ADMIN (VENDOR)</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition-colors cursor-pointer"
            title="Keluar dari Portal"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* 2. Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Banner Welcome & Action Button */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-xs">
          {/* Subtle Ambient Background Gradients */}
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 h-64 w-64 rounded-full bg-teal-50 blur-3xl pointer-events-none" />
          <div className="absolute right-40 bottom-0 h-48 w-48 rounded-full bg-emerald-50 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/70 text-[11px] font-semibold text-teal-700">
                <Radio className="h-3 w-3 text-teal-600 animate-pulse" />
                <span>Arsitektur True Multi-Tenant Terisolasi</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Kelola Seluruh Faskes &amp; Kredensial SATUSEHAT
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Daftarkan rumah sakit, klinik pratama, dan praktik mandiri tanpa perlu deploy server baru. Setiap faskes memiliki kredensial Kemenkes tersendiri yang dienkripsi secara aman dengan AES-256-GCM.
              </p>
            </div>

            <div className="shrink-0 flex flex-wrap gap-2.5">
              <Button
                onClick={() => setIsRegisterModalOpen(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 px-4 py-2.5 rounded-xl cursor-pointer transition-all"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                <span>+ Daftarkan Faskes Baru</span>
              </Button>

              <Button
                variant="outline"
                disabled={isRefreshing}
                onClick={async () => {
                  setIsRefreshing(true);
                  await refreshFacilities(true);
                  setIsRefreshing(false);
                  toast.success("Daftar fasilitas diperbarui");
                }}
                className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200 text-xs rounded-xl shadow-2xs cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? "animate-spin text-teal-600" : "text-slate-500"}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
        </div>

        {/* 3. Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-2 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold">Total Faskes Terdaftar</span>
              <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Hospital className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{totalFacilities}</span>
              <span className="text-[11px] text-slate-500 font-medium">Fasilitas</span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              <span className="text-emerald-700 font-semibold">{activeCount} Aktif</span> • <span className="text-slate-500">{inactiveCount} Diarsipkan</span>
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-2 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold">Terhubung SATUSEHAT</span>
              <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">{connectedCount}</span>
              <span className="text-[11px] text-slate-500 font-medium">/ {totalFacilities} Faskes</span>
            </div>
            <p className="text-[10px] text-emerald-700/80 font-mono">OAuth2 Kemenkes terverifikasi</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-2 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold">Environment Kemenkes</span>
              <div className="h-8 w-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Server className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-bold text-slate-800">{prodCount} <span className="text-xs font-normal text-slate-500">Prod</span></span>
              <span className="text-slate-300">•</span>
              <span className="text-lg sm:text-xl font-bold text-teal-700">{stagingCount} <span className="text-xs font-normal text-slate-500">Staging</span></span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">Sandbox &amp; Live Gateway</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-2 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold">Total Unit Poliklinik</span>
              <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{totalDepts}</span>
              <span className="text-[11px] text-slate-500 font-medium">Layanan</span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">Terpetakan ke Location FHIR</p>
          </div>
        </div>

        {/* 4. Toolbar: Search & Filters */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Cari faskes (Nama, Org ID, Alamat)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-slate-50/80 border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 rounded-xl focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Filter Status Operasional (Aktif / Nonaktif) */}
            <CustomSelect<string>
              value={selectedActiveFilter}
              onChange={(val) => setSelectedActiveFilter(val)}
              size="md"
              className="w-full sm:w-auto shrink-0"
              buttonClassName="h-10 text-xs bg-white hover:bg-slate-50 border-slate-200 rounded-xl px-3 font-medium shadow-2xs min-w-[175px]"
              options={[
                {
                  value: "all",
                  label: `Semua Operasional (${totalFacilities})`,
                  icon: <Layers className="h-3.5 w-3.5 text-slate-500" />,
                },
                {
                  value: "active",
                  label: `Hanya Aktif (${activeCount})`,
                  icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />,
                },
                {
                  value: "inactive",
                  label: `Hanya Diarsipkan (${inactiveCount})`,
                  icon: <Archive className="h-3.5 w-3.5 text-amber-600" />,
                },
              ]}
            />

            {/* Filter Jenis Faskes */}
            <CustomSelect<string>
              value={selectedType}
              onChange={(val) => setSelectedType(val)}
              size="md"
              className="w-full sm:w-auto shrink-0"
              buttonClassName="h-10 text-xs bg-white hover:bg-slate-50 border-slate-200 rounded-xl px-3 font-medium shadow-2xs min-w-[160px]"
              options={[
                {
                  value: "all",
                  label: "Semua Tipe Faskes",
                  icon: <Building2 className="h-3.5 w-3.5 text-slate-500" />,
                },
                {
                  value: "rumah_sakit",
                  label: "Rumah Sakit",
                  icon: <Hospital className="h-3.5 w-3.5 text-blue-600" />,
                },
                {
                  value: "klinik_pratama",
                  label: "Klinik Pratama",
                  icon: <Stethoscope className="h-3.5 w-3.5 text-teal-600" />,
                },
                {
                  value: "klinik_utama",
                  label: "Klinik Utama",
                  icon: <Stethoscope className="h-3.5 w-3.5 text-indigo-600" />,
                },
                {
                  value: "praktik_mandiri",
                  label: "Praktik Mandiri",
                  icon: <Activity className="h-3.5 w-3.5 text-purple-600" />,
                },
                {
                  value: "puskesmas",
                  label: "Puskesmas",
                  icon: <Building2 className="h-3.5 w-3.5 text-emerald-600" />,
                },
              ]}
            />

            {/* Filter Status SATUSEHAT */}
            <CustomSelect<string>
              value={selectedStatus}
              onChange={(val) => setSelectedStatus(val)}
              size="md"
              align="right"
              className="w-full sm:w-auto shrink-0"
              buttonClassName="h-10 text-xs bg-white hover:bg-slate-50 border-slate-200 rounded-xl px-3 font-medium shadow-2xs min-w-[185px]"
              options={[
                {
                  value: "all",
                  label: "Semua Status SATUSEHAT",
                  icon: <Radio className="h-3.5 w-3.5 text-slate-500" />,
                },
                {
                  value: "connected",
                  label: "Terhubung (Connected)",
                  icon: <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />,
                },
                {
                  value: "unverified",
                  label: "Belum Diverifikasi",
                  icon: <Clock className="h-3.5 w-3.5 text-amber-600" />,
                },
                {
                  value: "error",
                  label: "Gangguan / Error",
                  icon: <AlertCircle className="h-3.5 w-3.5 text-rose-600" />,
                },
              ]}
            />
          </div>
        </div>

        {/* 5. Facility Catalog Grid */}
        {filteredFacilities.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center space-y-3 shadow-xs">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Building2 className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">Tidak ada fasilitas kesehatan yang cocok</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Coba sesuaikan kata kunci pencarian atau sesuaikan filter status operasional di atas.
            </p>
            <Button
              onClick={() => {
                setSearchQuery("");
                setSelectedType("all");
                setSelectedStatus("all");
                setSelectedActiveFilter("all");
              }}
              variant="outline"
              size="sm"
              className="text-xs bg-white text-slate-700 border-slate-200 hover:bg-slate-50 mt-2 rounded-xl cursor-pointer"
            >
              Reset Filter
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFacilities.map((f) => {
              const isConnected = f.satusehatStatus === "connected";
              const isTesting = testingFacilityId === f.id;
              const isInactive = f.isActive === false;

              return (
                <div
                  key={f.id}
                  className={`rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 space-y-4 group ${
                    isInactive
                      ? "bg-slate-100/70 border border-dashed border-slate-300 shadow-none opacity-85"
                      : "bg-white border border-slate-200/90 hover:border-teal-300 hover:shadow-lg hover:shadow-slate-200/50 shadow-xs"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header Card: Tipe, Action Quick Edit, Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-semibold">
                          {getFacilityTypeLabel(f.type)}
                        </Badge>
                        {isInactive && (
                          <Badge className="bg-slate-200 text-slate-600 border-slate-300 text-[9px] font-bold">
                            DIARSIPKAN
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-mono uppercase tracking-wider font-bold ${
                            f.satusehatEnv === "production"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-teal-50 text-teal-700 border-teal-200"
                          }`}
                        >
                          {f.satusehatEnv || "staging"}
                        </Badge>
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            isConnected ? "bg-emerald-500 ring-2 ring-emerald-100 animate-pulse" : "bg-amber-400"
                          }`}
                          title={isConnected ? "SATUSEHAT Terhubung" : "Belum Terhubung"}
                        />

                        {/* Tombol Edit Cepat */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(f)}
                          className="h-7 w-7 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-teal-50 flex items-center justify-center transition-colors ml-1 cursor-pointer"
                          title="Edit Profil & Kredensial Faskes"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>

                        {/* Tombol Arsip / Aktifkan */}
                        {isInactive ? (
                          <button
                            type="button"
                            onClick={() => handleToggleFacilityStatus(f, true)}
                            className="h-7 w-7 rounded-lg text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition-colors cursor-pointer"
                            title="Aktifkan Kembali Faskes"
                          >
                            <ArchiveRestore className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setFacilityToDeactivate(f)}
                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                            title="Nonaktifkan (Arsipkan) Faskes"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Facility Name & License */}
                    <div>
                      <h2 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors line-clamp-1">
                        {f.name}
                      </h2>
                      {f.licenseNumber ? (
                        <p className="text-[11px] text-slate-500 font-mono">No. Izin: {f.licenseNumber}</p>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">No. Izin belum dicatat</p>
                      )}
                    </div>

                    {/* Metadata Kredensial SATUSEHAT */}
                    <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 space-y-1.5 text-[11px] font-mono">
                      <div className="flex items-center justify-between text-slate-500 gap-2 h-5">
                        <span className="shrink-0 whitespace-nowrap">Org ID:</span>
                        <div className="flex items-center gap-1 min-w-0">
                          <span
                            className="font-bold text-slate-800 font-mono select-all truncate cursor-pointer hover:text-teal-700 transition-colors"
                            title={`Klik untuk menyalin Org ID: ${f.satusehatOrgId}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(f.satusehatOrgId);
                              toast.success("Org ID disalin ke clipboard", {
                                description: f.satusehatOrgId,
                              });
                            }}
                          >
                            {f.satusehatOrgId.length > 16
                              ? `${f.satusehatOrgId.slice(0, 8)}...${f.satusehatOrgId.slice(-6)}`
                              : f.satusehatOrgId}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(f.satusehatOrgId);
                              toast.success("Org ID disalin ke clipboard", {
                                description: f.satusehatOrgId,
                              });
                            }}
                            title="Salin Org ID lengkap"
                            className="p-0.5 rounded hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition-colors shrink-0 cursor-pointer"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 gap-2 h-5">
                        <span className="shrink-0 whitespace-nowrap">Client ID:</span>
                        <span className="text-slate-700 shrink-0">
                          {f.satusehatClientId ? `${f.satusehatClientId.slice(0, 8)}••••••••` : "(Belum diisi)"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 gap-2 h-5">
                        <span className="shrink-0 whitespace-nowrap">Status OAuth2:</span>
                        <span className={isConnected ? "text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded shrink-0" : "text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded shrink-0"}>
                          {isConnected ? "CONNECTED" : "UNVERIFIED"}
                        </span>
                      </div>
                    </div>

                    {/* Info Poliklinik & Alamat */}
                    <div className="space-y-1 text-[11px] text-slate-500">
                      {f.address && (
                        <div className="flex items-start gap-1.5 line-clamp-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="truncate">{f.address}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                        <span className="text-slate-400">Unit Poliklinik:</span>
                        <span className="font-bold text-slate-700">
                          {f.departments?.length || 0} Ruangan Terdaftar
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Buttons */}
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isTesting}
                      onClick={() => handleTestConnection(f)}
                      className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border-slate-200 text-xs py-2 h-auto shadow-2xs cursor-pointer"
                    >
                      {isTesting ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1 text-teal-600" />
                          <span>Menguji...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="h-3.5 w-3.5 mr-1 text-amber-500" />
                          <span>Uji Koneksi</span>
                        </>
                      )}
                    </Button>

                    {isInactive ? (
                      <Button
                        size="sm"
                        disabled={isTogglingStatus}
                        onClick={() => handleToggleFacilityStatus(f, true)}
                        className="flex-1 bg-slate-700 hover:bg-emerald-700 text-white font-bold text-xs py-2 h-auto cursor-pointer shadow-sm"
                      >
                        <ArchiveRestore className="h-3.5 w-3.5 mr-1" />
                        <span>Aktifkan Faskes</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleAccessFacilitySimrs(f.id)}
                        className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 h-auto cursor-pointer shadow-sm shadow-teal-600/20"
                      >
                        <span>Buka SIMRS</span>
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Dialog Registrasi Faskes Baru */}
      <FacilityRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={async (newId) => {
          setIsRegisterModalOpen(false);
          await refreshFacilities(true);
          toast.success("Faskes baru siap digunakan!", {
            description: `ID Faskes: ${newId}. Kredensial telah disimpan dan dienkripsi ke database.`,
          });
        }}
      />

      {/* Modal Dialog Edit Profil & Kredensial Faskes */}
      <FacilityEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingFacility(null);
        }}
        facility={editingFacility}
        onSuccess={async () => {
          await refreshFacilities(true);
        }}
      />

      {/* Dialog Konfirmasi Nonaktifkan / Arsipkan Faskes (Soft Delete) */}
      <Dialog
        open={!!facilityToDeactivate}
        onOpenChange={(open) => !open && setFacilityToDeactivate(null)}
      >
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="text-center space-y-1">
              <DialogTitle className="text-base font-bold text-slate-900">
                Nonaktifkan (Arsipkan) Faskes?
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 leading-relaxed">
                Fasilitas kesehatan <strong className="text-slate-800">{facilityToDeactivate?.name}</strong> akan dialihkan ke status diarsipkan.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
            <p className="font-semibold flex items-center gap-1.5 text-amber-800">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
              <span>Jaminan Kepatuhan Permenkes No. 24/2022</span>
            </p>
            <p className="text-[11px] text-amber-800/90 leading-relaxed">
              Seluruh riwayat rekam medis pasien, encounter, dan audit trail tetap tersimpan aman di database. Staf klinik tidak akan dapat membuka sesi pelayanan baru sampai faskes diaktifkan kembali.
            </p>
          </div>

          <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isTogglingStatus}
              onClick={() => setFacilityToDeactivate(null)}
              className="flex-1 text-xs cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isTogglingStatus}
              onClick={() => {
                if (facilityToDeactivate) {
                  handleToggleFacilityStatus(facilityToDeactivate, false);
                }
              }}
              className="flex-1 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs gap-1.5"
            >
              {isTogglingStatus ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <Archive className="h-3.5 w-3.5" />
                  <span>Ya, Nonaktifkan Faskes</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
