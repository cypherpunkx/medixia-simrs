"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  Users,
  UserPlus,
  Stethoscope,
  UserCheck,
  Shield,
  Sparkles,
  Search,
  CheckCircle2,
  Loader2,
  Building2,
  FileBadge,
  KeyRound,
  IdCard,
  Layers,
  Plus,
  Edit2,
  Trash2,
  DoorOpen,
  SlidersHorizontal,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import {
  UserProfile,
  UserRole,
  DepartmentItem,
  formatDoctorSip,
} from "@/lib/satusehat/types";
import { useAuth } from "@/lib/auth/auth-context";

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLE_INFO: Record<
  UserRole,
  { label: string; color: string; icon: React.ElementType }
> = {
  super_admin: {
    label: "Super Admin (Vendor)",
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

export function StaffManagementModal({
  isOpen,
  onClose,
}: StaffManagementModalProps) {
  const { user, facility, departments, refreshFacilities } = useAuth();

  // RBAC: Hanya akun Administrator atau Super Admin yang berhak membuka & mengelola SDM Nakes
  if (user && user.role !== "admin" && user.role !== "super_admin") {
    return null;
  }

  const [activeTab, setActiveTab] = useState<"staff" | "departments">("staff");

  // === 1. State Nakes / Staff ===
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");

  // Staff Form State
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("doctor");
  const [selectedDept, setSelectedDept] = useState(
    departments[0]?.name || "Poli Umum",
  );
  const [sip, setSip] = useState("");
  const [ihsPractitionerId, setIhsPractitionerId] = useState("");
  const [nakesNik, setNakesNik] = useState("");
  const [isVerifyingNakes, setIsVerifyingNakes] = useState(false);
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);

  // === 2. State Poliklinik / Departments ===
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [deptName, setDeptName] = useState("");
  const [deptRoom, setDeptRoom] = useState("");
  const [deptQuota, setDeptQuota] = useState(30);
  const [deptDoctor, setDeptDoctor] = useState("");
  const [isSubmittingDept, setIsSubmittingDept] = useState(false);
  const [syncingDeptId, setSyncingDeptId] = useState<string | null>(null);

  const fetchStaff = async () => {
    if (!facility?.id) return;
    try {
      setIsLoadingStaff(true);
      const res = await fetch(`/api/users?facilityId=${facility.id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setStaffList(data.data);
      }
    } catch (err) {
      console.error("Gagal mengambil daftar staf:", err);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  useEffect(() => {
    if (isOpen && facility?.id) {
      fetchStaff();
    }
  }, [isOpen, facility?.id]);

  // Reset staff form
  const resetStaffForm = () => {
    setName("");
    setUsername("");
    setPassword("");
    setRole("doctor");
    setSelectedDept(departments[0]?.name || "Poli Umum");
    setSip("");
    setIhsPractitionerId("");
    setNakesNik("");
    setIsAddingStaff(false);
    setEditingStaff(null);
  };

  // Open edit staff
  const handleOpenEditStaff = (staff: UserProfile) => {
    setEditingStaff(staff);
    setName(staff.name);
    setUsername(staff.username);
    setPassword("");
    setRole(staff.role);
    setSelectedDept(staff.department || departments[0]?.name || "Poli Umum");
    setSip(staff.sip || "");
    setIhsPractitionerId(staff.ihsPractitionerId || "");
    setNakesNik("");
    setIsAddingStaff(true);
  };

  // Verifikasi NIK Dokter / Perawat ke SISDMK & SATUSEHAT Practitioner API
  const handleVerifyNakesNik = async () => {
    if (!nakesNik || nakesNik.length !== 16) {
      toast.error("Masukkan 16 digit NIK KTP Tenaga Medis.");
      return;
    }

    try {
      setIsVerifyingNakes(true);
      const res = await fetch(
        `/api/satusehat/practitioner?nik=${nakesNik.trim()}`,
      );
      const json = await res.json();

      if (json.success && json.data) {
        setIhsPractitionerId(json.data.id);
        if (!name.trim()) {
          setName(json.data.name);
        }
        if (json.data.sip && !sip.trim()) {
          setSip(json.data.sip);
        }
        toast.success("Tenaga Medis Terverifikasi di SISDMK / SATUSEHAT!", {
          description: `IHS Practitioner ID: ${json.data.id} (${json.data.name})`,
        });
      } else {
        toast.error(
          json.error?.message ||
            "Tenaga Medis tidak ditemukan di basis data SATUSEHAT / SISDMK.",
        );
      }
    } catch (err) {
      console.error("Gagal verifikasi nakes:", err);
      toast.error("Gagal menghubungi layanan Practitioner SATUSEHAT.");
    } finally {
      setIsVerifyingNakes(false);
    }
  };

  // Registrasi Ruang Poliklinik ke SATUSEHAT Location API (POST /Location)
  const handleSyncDepartmentLocation = async (dept: DepartmentItem) => {
    if (!facility?.id) {
      toast.error("Data faskes aktif tidak ditemukan.");
      return;
    }

    try {
      setSyncingDeptId(dept.id);
      const res = await fetch("/api/satusehat/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentId: dept.id,
          facilityId: facility.id,
          name: dept.name,
          code:
            dept.code || `LOC-${dept.name.replace(/\s+/g, "-").toUpperCase()}`,
          room: dept.room,
        }),
      });

      const json = await res.json();
      if (json.success && json.data?.satusehatLocationId) {
        toast.success("Poliklinik Berhasil Diregistrasi ke SATUSEHAT!", {
          description: `Location ID resmi: ${json.data.satusehatLocationId}`,
        });
        await refreshFacilities();
      } else {
        toast.error(
          json.error || "Gagal meregistrasikan Location ke SATUSEHAT.",
        );
      }
    } catch (err) {
      console.error("Gagal sync Location:", err);
      toast.error("Terjadi gangguan koneksi saat mendaftarkan Location.");
    } finally {
      setSyncingDeptId(null);
    }
  };

  // Save / Update Staff
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) {
      toast.error("Nama Lengkap dan Username wajib diisi.");
      return;
    }

    if (!facility?.id) {
      toast.error("Faskes aktif tidak ditemukan.");
      return;
    }

    try {
      setIsSubmittingStaff(true);

      if (editingStaff) {
        // UPDATE STAFF
        const res = await fetch("/api/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingStaff.id,
            name: name.trim(),
            role,
            department: selectedDept,
            sip: sip.trim() || null,
            ihsPractitionerId: ihsPractitionerId.trim() || null,
            password: password.trim() ? password.trim() : undefined,
          }),
        });

        const result = await res.json();
        if (result.success) {
          toast.success("Data Nakes Berhasil Diperbarui!");
          resetStaffForm();
          await fetchStaff();
        } else {
          toast.error(result.error || "Gagal memperbarui data nakes.");
        }
      } else {
        // CREATE STAFF
        const payload = {
          name: name.trim(),
          username: username.trim(),
          password: password.trim() || "password123",
          role,
          facilityId: facility.id,
          department: selectedDept,
          sip: sip.trim() || undefined,
          ihsPractitionerId: ihsPractitionerId.trim() || undefined,
        };

        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await res.json();
        if (result.success && result.data) {
          toast.success("Nakes Baru Berhasil Didaftarkan!", {
            description: `${result.data.name} telah aktif di ${facility.name}.`,
          });
          resetStaffForm();
          await fetchStaff();
        } else {
          toast.error(result.error || "Gagal mendaftarkan nakes baru.");
        }
      }
    } catch (err) {
      toast.error("Terjadi gangguan koneksi.");
      console.error(err);
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  // Delete Staff
  const handleDeleteStaff = async (id: string, staffName: string) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus/menonaktifkan akun ${staffName}?`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        toast.success(`Akun ${staffName} berhasil dihapus.`);
        await fetchStaff();
      } else {
        toast.error(result.error || "Gagal menghapus nakes.");
      }
    } catch (err) {
      toast.error("Gagal menghapus nakes.");
      console.error(err);
    }
  };

  // === POLIKLINIK MANAGEMENT ===
  const resetDeptForm = () => {
    setDeptName("");
    setDeptRoom("");
    setDeptQuota(30);
    setDeptDoctor("");
    setIsAddingDept(false);
    setEditingDept(null);
  };

  const handleOpenEditDept = (dept: DepartmentItem) => {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptRoom(dept.room);
    setDeptQuota(dept.quota);
    setDeptDoctor(dept.defaultDoctorName || "");
    setIsAddingDept(true);
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) {
      toast.error("Nama Poliklinik wajib diisi.");
      return;
    }

    if (!facility?.id) return;

    try {
      setIsSubmittingDept(true);

      if (editingDept) {
        // UPDATE DEPT
        const res = await fetch("/api/departments", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingDept.id,
            name: deptName.trim(),
            room: deptRoom.trim() || "Ruang Periksa",
            quota: deptQuota,
            defaultDoctorName: deptDoctor.trim() || null,
          }),
        });
        const result = await res.json();
        if (result.success) {
          toast.success("Poliklinik Berhasil Diperbarui!");
          resetDeptForm();
          await refreshFacilities();
        } else {
          toast.error(result.error || "Gagal memperbarui poliklinik.");
        }
      } else {
        // CREATE DEPT
        const res = await fetch("/api/departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            facilityId: facility.id,
            name: deptName.trim(),
            room: deptRoom.trim() || `Ruang ${departments.length + 1}`,
            quota: deptQuota,
            defaultDoctorName: deptDoctor.trim() || null,
          }),
        });
        const result = await res.json();
        if (result.success) {
          toast.success("Poliklinik Baru Berhasil Ditambahkan!");
          resetDeptForm();
          await refreshFacilities();
        } else {
          toast.error(result.error || "Gagal menambahkan poliklinik.");
        }
      }
    } catch (err) {
      toast.error("Terjadi gangguan koneksi.");
      console.error(err);
    } finally {
      setIsSubmittingDept(false);
    }
  };

  const handleDeleteDept = async (id: string, name: string) => {
    if (departments.length <= 1) {
      toast.warning("Faskes minimal harus memiliki 1 poliklinik aktif.");
      return;
    }

    if (
      !confirm(`Apakah Anda yakin ingin menghapus unit poliklinik ${name}?`)
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/departments?id=${id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`Poliklinik ${name} berhasil dihapus.`);
        await refreshFacilities();
      } else {
        toast.error(result.error || "Gagal menghapus poliklinik.");
      }
    } catch (err) {
      toast.error("Gagal menghapus poliklinik.");
      console.error(err);
    }
  };

  const filteredStaff = staffList.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.sip && s.sip.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.ihsPractitionerId &&
        s.ihsPractitionerId.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchRole = filterRole === "all" || s.role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-slate-200">
        {/* Header Visual */}
        <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-800 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg">
                <SlidersHorizontal className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                  <span>Panel Administrasi Faskes</span>
                  <Badge
                    variant="outline"
                    className="bg-white/20 text-white text-[10px] font-bold border-white/30"
                  >
                    Kelola SDM &amp; Poli
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-purple-100 mt-0.5">
                  Pengaturan mandiri Tenaga Medis (Dokter, Perawat, Staf) dan
                  Master Poliklinik untuk <strong>{facility?.name}</strong>.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/15">
            <button
              type="button"
              onClick={() => {
                setActiveTab("staff");
                resetStaffForm();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "staff"
                  ? "bg-white text-purple-950 shadow-md"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Tenaga Medis &amp; Nakes ({staffList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("departments");
                resetDeptForm();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "departments"
                  ? "bg-white text-purple-950 shadow-md"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Master Poliklinik &amp; Kuota ({departments.length})</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* TAB 1: SDM & TENAGA MEDIS */}
          {activeTab === "staff" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-purple-600" />
                  <span>
                    {isAddingStaff
                      ? editingStaff
                        ? `Ubah Data Nakes: ${editingStaff.name}`
                        : "Tambah Tenaga Medis Baru"
                      : "Daftar Nakes Terdaftar"}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    if (isAddingStaff) {
                      resetStaffForm();
                    } else {
                      resetStaffForm();
                      setIsAddingStaff(true);
                    }
                  }}
                  className="h-8 px-3 text-xs font-bold bg-purple-100 hover:bg-purple-200 active:bg-purple-300 text-purple-950 border border-purple-200/90 rounded-xl inline-flex items-center gap-1.5 cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-1 transition-all active:scale-[0.98]"
                >
                  {isAddingStaff ? (
                    <ArrowLeft className="h-3.5 w-3.5" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {isAddingStaff ? "Kembali ke Daftar" : "Tambah Nakes"}
                  </span>
                </button>
              </div>

              {isAddingStaff ? (
                /* Form Tambah / Edit Nakes */
                <form
                  onSubmit={handleSaveStaff}
                  className="space-y-4 animate-in fade-in duration-150"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5 sm:col-span-2">
                      <div className="h-5 flex items-center">
                        <Label className="text-xs font-bold text-slate-700 leading-none">
                          Nama Lengkap &amp; Gelar{" "}
                          <span className="text-rose-500">*</span>
                        </Label>
                      </div>
                      <Input
                        required
                        placeholder="Contoh: dr. Amanda Putri, Sp.A / Ns. Budi Santoso, S.Kep"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-10 text-xs rounded-xl bg-white border border-slate-200 focus:border-purple-500 shadow-2xs"
                      />
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <div className="h-5 flex items-center">
                        <Label className="text-xs font-bold text-slate-700 leading-none">
                          Peran Nakes (RBAC){" "}
                          <span className="text-rose-500">*</span>
                        </Label>
                      </div>
                      <CustomSelect<UserRole>
                        value={role}
                        onChange={(val) => setRole(val)}
                        size="md"
                        className="w-full"
                        buttonClassName="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        options={[
                          {
                            value: "doctor",
                            label: "Dokter DPJP (Pemeriksaan SOAP & Resep)",
                          },
                          {
                            value: "nurse",
                            label: "Perawat Poli (Triase & TTV)",
                          },
                          {
                            value: "registration",
                            label: "Petugas Admisi / Pendaftaran",
                          },
                          { value: "pharmacy", label: "Apoteker / Farmasi" },
                          { value: "admin", label: "Administrator Sistem" },
                        ]}
                      />
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <div className="h-5 flex items-center">
                        <Label className="text-xs font-bold text-slate-700 leading-none">
                          Unit Layanan / Poliklinik Tugas
                        </Label>
                      </div>
                      <CustomSelect<string>
                        value={selectedDept}
                        onChange={(val) => setSelectedDept(val)}
                        size="md"
                        className="w-full"
                        buttonClassName="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        options={[
                          ...departments.map((d) => ({
                            value: d.name,
                            label: `${d.name} (${d.room})`,
                          })),
                          {
                            value: "Admisi & Rekam Medis",
                            label: "Admisi & Rekam Medis",
                          },
                          {
                            value: "Instalasi Farmasi",
                            label: "Instalasi Farmasi",
                          },
                          {
                            value: "Teknologi Informasi",
                            label: "Teknologi Informasi & Sistem",
                          },
                        ]}
                      />
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <div className="h-5 flex items-center">
                        <Label className="text-xs font-bold text-slate-700 leading-none">
                          Username Login{" "}
                          <span className="text-rose-500">*</span>
                        </Label>
                      </div>
                      <Input
                        required
                        disabled={Boolean(editingStaff)}
                        placeholder="Contoh: dr.amanda / perawat.budi"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="h-10 text-xs rounded-xl font-mono bg-white border border-slate-200 focus:border-purple-500 disabled:bg-slate-100 shadow-2xs"
                      />
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <div className="h-5 flex items-center">
                        <Label className="text-xs font-bold text-slate-700 leading-none">
                          {editingStaff
                            ? "Kata Sandi Baru (Kosongkan jika tidak diubah)"
                            : "Kata Sandi Awal"}
                        </Label>
                      </div>
                      <Input
                        type="password"
                        placeholder={
                          editingStaff
                            ? "Biarkan kosong..."
                            : "Default: password123"
                        }
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-10 text-xs rounded-xl bg-white border border-slate-200 focus:border-purple-500 shadow-2xs"
                      />
                    </div>

                    {/* Dokter / Perawat Field: NIK SISDMK, SIP & IHS ID */}
                    {(role === "doctor" || role === "nurse") && (
                      <>
                        <div className="space-y-1.5 sm:col-span-2 p-3 bg-purple-50/60 rounded-xl border border-purple-100">
                          <Label className="text-xs font-bold text-purple-900 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <img
                                src="/satusehat-default-logo.svg"
                                alt="SATUSEHAT"
                                className="h-3.5 w-3.5 object-contain shrink-0"
                              />
                              <span>
                                Verifikasi NIK Tenaga Medis (SISDMK SATUSEHAT)
                              </span>
                            </span>
                            <span className="text-[10px] font-normal text-purple-700">
                              Otomatisasi IHS Nakes
                            </span>
                          </Label>
                          <div className="flex items-center gap-2 pt-1">
                            <div className="relative flex-1">
                              <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-purple-600" />
                              <Input
                                placeholder="Masukkan 16 digit NIK Dokter / Perawat..."
                                value={nakesNik}
                                maxLength={16}
                                onChange={(e) =>
                                  setNakesNik(e.target.value.replace(/\D/g, ""))
                                }
                                className="h-9 pl-9 text-xs rounded-xl font-mono bg-white focus:border-purple-500"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleVerifyNakesNik}
                              disabled={
                                isVerifyingNakes || nakesNik.length !== 16
                              }
                              className="h-9 px-3 text-xs font-bold bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white rounded-xl inline-flex items-center gap-1 cursor-pointer shrink-0 shadow-xs outline-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isVerifyingNakes ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  <span>Mencari...</span>
                                </>
                              ) : (
                                <>
                                  <Search className="h-3.5 w-3.5" />
                                  <span>Verifikasi NIK</span>
                                </>
                              )}
                            </button>
                          </div>
                          <p className="text-[10px] text-purple-600 pt-1">
                            Sistem akan mencocokkan NIK ke basis data SISDMK /
                            Kemenkes untuk memperoleh IHS ID & data STR/SIP.
                          </p>
                        </div>

                        <div className="flex flex-col space-y-1.5">
                          <div className="h-5 flex items-center justify-between">
                            <Label className="text-xs font-bold text-slate-700 leading-none">
                              Nomor Surat Izin Praktik (SIP)
                            </Label>
                          </div>
                          <div className="relative">
                            <FileBadge className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                              placeholder="SIP.446/099/DU/Dinkes/2026"
                              value={sip}
                              onChange={(e) => setSip(e.target.value)}
                              className="h-10 pl-9 text-xs rounded-xl font-mono bg-white border border-slate-200 focus:border-purple-500 shadow-2xs"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col space-y-1.5">
                          <div className="h-5 flex items-center justify-between">
                            <Label className="text-xs font-bold text-slate-700 leading-none flex items-center gap-1.5">
                              <img
                                src="/satusehat-default-logo.svg"
                                alt="SATUSEHAT"
                                className="h-3.5 w-3.5 object-contain shrink-0"
                              />
                              <span>IHS Practitioner ID</span>
                            </Label>
                            {ihsPractitionerId && (
                              <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 leading-none">
                                Terverifikasi
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-purple-600" />
                            <Input
                              placeholder="Contoh: N10009841"
                              value={ihsPractitionerId}
                              onChange={(e) =>
                                setIhsPractitionerId(e.target.value)
                              }
                              className="h-10 pl-9 text-xs rounded-xl font-mono font-bold text-purple-900 bg-purple-50/40 border border-purple-200/80 focus:border-purple-500 shadow-2xs"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={resetStaffForm}
                      className="h-9 px-4 text-xs font-medium rounded-xl cursor-pointer hover:bg-purple-50 hover:text-purple-900 text-slate-600 outline-none focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingStaff}
                      className="h-9 px-4 text-xs font-bold rounded-xl bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white shadow-md inline-flex items-center gap-1.5 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingStaff ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Menyimpan Data...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          <span>
                            {editingStaff
                              ? "Simpan Perubahan"
                              : "Terbitkan Akun Nakes"}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* List Nakes */
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-2.5">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        placeholder="Cari nakes (Nama, Username, SIP, IHS ID)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-9 pl-9 text-xs rounded-xl bg-slate-50 focus:bg-white"
                      />
                    </div>

                    <CustomSelect<string>
                      value={filterRole}
                      onChange={(val) => setFilterRole(val)}
                      size="sm"
                      className="w-full sm:w-56 shrink-0"
                      buttonClassName="w-full h-9 px-3 text-xs bg-slate-50 hover:bg-white border-slate-200 rounded-xl text-slate-700 font-medium shadow-2xs"
                      options={[
                        {
                          value: "all",
                          label: `Semua Peran (${staffList.length})`,
                        },
                        { value: "doctor", label: "Dokter DPJP" },
                        { value: "nurse", label: "Perawat Poli" },
                        { value: "registration", label: "Petugas Admisi" },
                        { value: "pharmacy", label: "Apoteker / Farmasi" },
                        { value: "admin", label: "Administrator" },
                      ]}
                    />
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto">
                    {isLoadingStaff ? (
                      <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                        <span>Memuat daftar tenaga medis...</span>
                      </div>
                    ) : filteredStaff.length > 0 ? (
                      filteredStaff.map((staff) => {
                        const rInfo = ROLE_INFO[staff.role] || ROLE_INFO.doctor;
                        const RIcon = rInfo.icon;

                        return (
                          <div
                            key={staff.id}
                            className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-sm shrink-0">
                                <RIcon className="h-5 w-5" />
                              </div>

                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-xs text-slate-900 truncate">
                                    {staff.name}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${rInfo.color}`}
                                  >
                                    {rInfo.label}
                                  </Badge>
                                  {staff.ihsPractitionerId ? (
                                    <span
                                      className="inline-flex items-center gap-1 text-[9px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded shadow-2xs cursor-help"
                                      title={`Praktisi Medis Terdaftar di SATUSEHAT (IHS: ${staff.ihsPractitionerId})`}
                                    >
                                      <img
                                        src="/satusehat-default-logo.svg"
                                        alt="SATUSEHAT"
                                        className="h-2.5 w-2.5 object-contain shrink-0"
                                      />
                                      <span>SATUSEHAT</span>
                                    </span>
                                  ) : (
                                    <span
                                      className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.2 rounded"
                                      title="Belum terdaftar di SATUSEHAT (IHS Practitioner ID belum diisi)"
                                    >
                                      <span>Non-SATUSEHAT</span>
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-purple-700">
                                    @{staff.username}
                                  </span>
                                  <span>•</span>
                                  <span>{staff.department || "Unit Umum"}</span>
                                  {staff.sip && (
                                    <>
                                      <span>•</span>
                                      <span className="font-mono text-[10px] text-slate-400">
                                        SIP: {staff.sip}
                                      </span>
                                    </>
                                  )}
                                  {staff.ihsPractitionerId && (
                                    <>
                                      <span>•</span>
                                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-teal-800 font-bold bg-teal-50/80 px-1.5 py-0.2 rounded border border-teal-200/80">
                                        <img
                                          src="/satusehat-default-logo.svg"
                                          alt="SATUSEHAT"
                                          className="h-2.5 w-2.5 object-contain"
                                        />
                                        IHS: {staff.ihsPractitionerId}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions: Edit & Delete */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenEditStaff(staff)}
                                className="h-7 w-7 rounded-lg text-slate-400 hover:text-purple-700 hover:bg-purple-50 flex items-center justify-center cursor-pointer transition-colors"
                                title="Edit Nakes"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteStaff(staff.id, staff.name)
                                }
                                className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center cursor-pointer transition-colors"
                                title="Hapus Nakes"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-400">
                        Tidak ada tenaga medis yang cocok dengan pencarian.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MASTER POLIKLINIK */}
          {activeTab === "departments" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-purple-600" />
                  <span>
                    {isAddingDept
                      ? editingDept
                        ? `Ubah Poliklinik: ${editingDept.name}`
                        : "Tambah Poliklinik Baru"
                      : `Daftar Poliklinik & Kuota (${departments.length} Poli)`}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    if (isAddingDept) {
                      resetDeptForm();
                    } else {
                      resetDeptForm();
                      setIsAddingDept(true);
                    }
                  }}
                  className="h-8 px-3 text-xs font-bold bg-purple-100 hover:bg-purple-200 active:bg-purple-300 text-purple-950 border border-purple-200/90 rounded-xl inline-flex items-center gap-1.5 cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-1 transition-all active:scale-[0.98]"
                >
                  {isAddingDept ? (
                    <ArrowLeft className="h-3.5 w-3.5" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {isAddingDept ? "Kembali ke Daftar" : "Tambah Poliklinik"}
                  </span>
                </button>
              </div>

              {isAddingDept ? (
                /* Form Tambah / Edit Poli */
                <form
                  onSubmit={handleSaveDept}
                  className="space-y-4 animate-in fade-in duration-150"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5 sm:col-span-2">
                      <div className="h-5 flex items-center">
                        <Label className="text-xs font-bold text-slate-700 leading-none">
                          Nama Poliklinik / Unit Layanan{" "}
                          <span className="text-rose-500">*</span>
                        </Label>
                      </div>
                      <Input
                        required
                        placeholder="Contoh: Poli Kebidanan & Kandungan (Obgyn) / Poli Mata"
                        value={deptName}
                        onChange={(e) => setDeptName(e.target.value)}
                        className="h-10 text-xs rounded-xl bg-white border border-slate-200 focus:border-purple-500 shadow-2xs"
                      />
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <div className="h-5 flex items-center">
                        <Label className="text-xs font-bold text-slate-700 leading-none">
                          Ruangan Pelayanan / Lokasi
                        </Label>
                      </div>
                      <div className="relative">
                        <DoorOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          placeholder="Contoh: Ruang 204 (Lt. 2)"
                          value={deptRoom}
                          onChange={(e) => setDeptRoom(e.target.value)}
                          className="h-10 pl-9 text-xs rounded-xl bg-white border border-slate-200 focus:border-purple-500 shadow-2xs"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <div className="h-5 flex items-center">
                        <Label className="text-xs font-bold text-slate-700 leading-none">
                          Kuota Pasien Antrean per Hari
                        </Label>
                      </div>
                      <Input
                        type="number"
                        min="1"
                        max="500"
                        value={deptQuota}
                        onChange={(e) =>
                          setDeptQuota(parseInt(e.target.value) || 30)
                        }
                        className="h-10 text-xs rounded-xl font-mono bg-white border border-slate-200 focus:border-purple-500 shadow-2xs"
                      />
                    </div>

                    <div className="flex flex-col space-y-1.5 sm:col-span-2">
                      <div className="h-5 flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-700 leading-none">
                          Dokter Penanggung Jawab / DPJP Utama (Opsional)
                        </Label>
                        <span className="text-[10px] text-purple-700 font-medium leading-none">
                          Praktisi Medis
                        </span>
                      </div>
                      <CustomSelect<string>
                        value={deptDoctor}
                        options={[
                          {
                            value: "",
                            label: "— Belum Ditentukan (Opsional) —",
                          },
                          ...staffList
                            .filter(
                              (s) =>
                                s.role === "doctor" && s.isActive !== false,
                            )
                            .map((d) => ({
                              value: d.name,
                              label: `${d.name}${d.sip ? ` (${formatDoctorSip(d.sip)})` : ""}${d.department ? ` — ${d.department}` : ""}`,
                            })),
                        ]}
                        onChange={(val) => setDeptDoctor(val)}
                        placeholder="Pilih Dokter DPJP Utama..."
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={resetDeptForm}
                      className="h-9 px-4 text-xs font-medium rounded-xl cursor-pointer hover:bg-purple-50 hover:text-purple-900 text-slate-600 outline-none focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingDept}
                      className="h-9 px-4 text-xs font-bold rounded-xl bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white shadow-md inline-flex items-center gap-1.5 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingDept ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Menyimpan Poli...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          <span>
                            {editingDept
                              ? "Simpan Perubahan Poli"
                              : "Tambah Poliklinik"}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* Daftar Poli */
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {departments.map((dept, idx) => (
                    <div
                      key={dept.id}
                      className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-xl bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {dept.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[9px] font-mono"
                            >
                              {dept.room}
                            </Badge>
                            {dept.satusehatLocationId ? (
                              <span
                                className="inline-flex items-center gap-1 text-[9px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded shadow-2xs cursor-help"
                                title={`Lokasi Poliklinik Terpetakan di SATUSEHAT FHIR (ID: ${dept.satusehatLocationId})`}
                              >
                                <img
                                  src="/satusehat-default-logo.svg"
                                  alt="SATUSEHAT"
                                  className="h-2.5 w-2.5 object-contain shrink-0"
                                />
                                <span>
                                  Location: {dept.satusehatLocationId}
                                </span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded"
                                title="Lokasi belum dipetakan ke SATUSEHAT"
                              >
                                <span>Lokal Faskes</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2">
                            <span>
                              Kuota:{" "}
                              <strong className="text-slate-800">
                                {dept.quota}
                              </strong>{" "}
                              pasien/hari
                            </span>
                            {dept.defaultDoctorName && (
                              <>
                                <span>•</span>
                                <span className="text-teal-700">
                                  DPJP: {dept.defaultDoctorName}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Tombol Sinkronisasi / Registrasi SATUSEHAT Location */}
                        <button
                          type="button"
                          disabled={syncingDeptId === dept.id}
                          onClick={() => handleSyncDepartmentLocation(dept)}
                          className="h-7 px-2 rounded-lg text-[10px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="Daftarkan / Sinkronisasi Ruang Poliklinik ke SATUSEHAT Location API (POST /Location)"
                        >
                          {syncingDeptId === dept.id ? (
                            <Loader2 className="h-3 w-3 animate-spin text-teal-700" />
                          ) : (
                            <img
                              src="/satusehat-default-logo.svg"
                              alt="SATUSEHAT"
                              className="h-3 w-3 object-contain shrink-0"
                            />
                          )}
                          <span>
                            {dept.satusehatLocationId
                              ? "Re-sync Location"
                              : "Daftarkan SATUSEHAT"}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditDept(dept)}
                          className="h-7 w-7 rounded-lg text-slate-400 hover:text-purple-700 hover:bg-purple-50 flex items-center justify-center cursor-pointer transition-colors"
                          title="Edit Poliklinik"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDept(dept.id, dept.name)}
                          className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center cursor-pointer transition-colors"
                          title="Hapus Poliklinik"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between w-full">
          <span className="text-[11px] text-slate-500">
            Perubahan data langsung tersinkronisasi ke seluruh layanan faskes.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-purple-400 transition-all"
          >
            Tutup
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
