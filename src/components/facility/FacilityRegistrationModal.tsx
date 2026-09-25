"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Plus,
  Trash2,
  ShieldCheck,
  Hospital,
  MapPin,
  Phone,
  FileBadge,
  Sparkles,
  Loader2,
  CheckCircle2,
  Layers,
  Shield,
  Eye,
  EyeOff,
  Stethoscope,
  Server,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { FacilityType } from "@/lib/satusehat/types";
import { useAuth } from "@/lib/auth/auth-context";
import { CustomSelect } from "@/components/ui/custom-select";

interface DepartmentInput {
  name: string;
  room: string;
  quota: number;
  defaultDoctorName?: string;
}

interface FacilityRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newFacilityId: string) => void;
}

export function FacilityRegistrationModal({
  isOpen,
  onClose,
  onSuccess,
}: FacilityRegistrationModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
    expiresIn?: number;
  } | null>(null);

  // RBAC: Hanya akun Super Admin (Vendor RME) yang berhak mendaftarkan fasilitas kesehatan baru
  if (user && user.role !== "super_admin") {
    return null;
  }

  // Form Fields
  const [name, setName] = useState("");
  const [type, setType] = useState<FacilityType>("klinik_pratama");
  const [satusehatOrgId, setSatusehatOrgId] = useState("");
  const [satusehatEnv, setSatusehatEnv] = useState<"staging" | "production">("staging");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [satusehatClientId, setSatusehatClientId] = useState("");
  const [satusehatClientSecret, setSatusehatClientSecret] = useState("");
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Initial Admin User
  const [adminName, setAdminName] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // Initial Departments
  const [departments, setDepartments] = useState<DepartmentInput[]>([
    { name: "Poli Umum", room: "Ruang Periksa 1", quota: 40, defaultDoctorName: "dr. Dokter Umum" },
    { name: "Poli Gigi & Mulut", room: "Ruang Gigi", quota: 20, defaultDoctorName: "drg. Dokter Gigi" },
  ]);

  const handleAddDepartment = () => {
    setDepartments((prev) => [
      ...prev,
      {
        name: `Poli Baru ${prev.length + 1}`,
        room: `Ruang ${prev.length + 1}`,
        quota: 30,
        defaultDoctorName: "",
      },
    ]);
  };

  const handleRemoveDepartment = (index: number) => {
    if (departments.length <= 1) {
      toast.warning("Minimal harus ada 1 unit poliklinik / layanan.");
      return;
    }
    setDepartments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDepartmentChange = (
    index: number,
    field: keyof DepartmentInput,
    value: string | number
  ) => {
    setDepartments((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleTestConnection = async () => {
    if (!satusehatClientId.trim() || !satusehatClientSecret.trim()) {
      toast.error("Isi Client ID dan Client Secret terlebih dahulu sebelum menguji koneksi.");
      return;
    }
    try {
      setIsTestingConnection(true);
      setTestResult(null);

      const res = await fetch("/api/facilities/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: satusehatClientId.trim(),
          clientSecret: satusehatClientSecret.trim(),
          env: satusehatEnv,
          orgId: satusehatOrgId.trim() || "b15a7ae7-f366-4a84-8385-0b8196c05002",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: data.data.message || "Koneksi berhasil!",
          latencyMs: data.data.telemetry?.latencyMs,
          expiresIn: data.data.tokenExpiresIn,
        });
        toast.success("Uji Koneksi SATUSEHAT Berhasil!", {
          description: `Token aktif ${data.data.tokenExpiresIn} detik (Latency: ${data.data.telemetry?.latencyMs || 0}ms)`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || "Gagal terhubung ke SATUSEHAT.",
        });
        toast.error("Uji Koneksi SATUSEHAT Gagal", {
          description: data.error || "Periksa kembali Client ID dan Secret.",
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: "Terjadi kesalahan jaringan saat menguji koneksi.",
      });
      toast.error("Gagal menghubungi server untuk pengujian koneksi.");
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Nama Fasilitas Kesehatan wajib diisi.");
      return;
    }

    if (!satusehatOrgId.trim()) {
      toast.error("Organization ID SATUSEHAT Kemenkes wajib diisi.");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        name: name.trim(),
        type,
        satusehatOrgId: satusehatOrgId.trim(),
        satusehatEnv,
        licenseNumber: licenseNumber.trim(),
        address: address.trim(),
        phone: phone.trim(),
        satusehatClientId: satusehatClientId.trim() || undefined,
        satusehatClientSecret: satusehatClientSecret.trim() || undefined,
        departments: departments.filter((d) => d.name.trim().length > 0),
        adminUser: adminUsername.trim()
          ? {
              name: adminName.trim() || `Admin ${name.trim()}`,
              username: adminUsername.trim(),
              password: adminPassword.trim() || "password123",
            }
          : undefined,
      };

      const res = await fetch("/api/facilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (result.success && result.data) {
        toast.success(`Faskes Baru Berhasil Didaftarkan!`, {
          description: `${result.data.name} telah aktif di sistem.`,
        });

        // Reset Form
        setName("");
        setType("klinik_pratama");
        setSatusehatOrgId("");
        setLicenseNumber("");
        setAddress("");
        setPhone("");
        setSatusehatClientId("");
        setSatusehatClientSecret("");
        setAdminName("");
        setAdminUsername("");
        setAdminPassword("");

        onClose();
        if (onSuccess) {
          onSuccess(result.data.id);
        }
      } else {
        toast.error(result.error || "Gagal mendaftarkan faskes baru.");
      }
    } catch (err) {
      toast.error("Terjadi gangguan saat menghubungkan ke server.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-slate-200">
        {/* Header Visual */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg">
              <Hospital className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Registrasi Faskes / Cabang Baru</span>
                <Badge
                  variant="outline"
                  className="bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold border-white/30"
                >
                  Multi-Tenant
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-teal-100 mt-0.5">
                Daftarkan Rumah Sakit, Klinik Pratama, Klinik Utama, atau Puskesmas baru secara instan ke sistem layanan faskes.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Section 1: Identitas Faskes */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-100">
              <Building2 className="h-4 w-4 text-teal-600" />
              <span>1. Identitas & Legalitas Faskes</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold text-slate-700">
                  Nama Fasilitas Kesehatan <span className="text-rose-500">*</span>
                </Label>
                <Input
                  required
                  placeholder="Contoh: Klinik Pratama Sehat Sejahtera / RS Harapan Medika"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 text-xs rounded-xl focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Tipe Institusi Faskes <span className="text-rose-500">*</span>
                </Label>
                <CustomSelect<FacilityType>
                  value={type}
                  onChange={(val) => setType(val)}
                  size="md"
                  className="w-full"
                  buttonClassName="h-10 text-xs bg-white border border-slate-200 rounded-xl"
                  options={[
                    { value: "klinik_pratama", label: "Klinik Pratama (Rawat Jalan)", icon: <Stethoscope className="h-3.5 w-3.5 text-teal-600" /> },
                    { value: "klinik_utama", label: "Klinik Utama (Spesialistik)", icon: <Stethoscope className="h-3.5 w-3.5 text-indigo-600" /> },
                    { value: "rumah_sakit", label: "Rumah Sakit (Tipe A/B/C/D)", icon: <Hospital className="h-3.5 w-3.5 text-blue-600" /> },
                    { value: "puskesmas", label: "Puskesmas (Pusat Kesehatan Masyarakat)", icon: <Building2 className="h-3.5 w-3.5 text-emerald-600" /> },
                    { value: "praktik_mandiri", label: "Praktik Mandiri (Dokter / Bidan)", icon: <Stethoscope className="h-3.5 w-3.5 text-purple-600" /> },
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Nomor Izin Operasional Dinkes/DPMPTSP
                </Label>
                <div className="relative">
                  <FileBadge className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Contoh: 503/012/KLINIK/DINKES/2025"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="h-10 pl-9 text-xs rounded-xl focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold text-slate-700">Alamat Lengkap Faskes</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Contoh: Jl. Ahmad Yani No. 88, Kel. Wonokromo, Surabaya, Jawa Timur"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="h-10 pl-9 text-xs rounded-xl focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Nomor Telepon / Kontak</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Contoh: (031) 555-7890 / 08123456789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-10 pl-9 text-xs rounded-xl focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Organization ID SATUSEHAT Kemenkes <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <img
                    src="/satusehat-default-logo.svg"
                    alt="SATUSEHAT"
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 object-contain shrink-0"
                  />
                  <Input
                    required
                    placeholder="Contoh: 10002345 atau b15a7ae7-f366-..."
                    value={satusehatOrgId}
                    onChange={(e) => setSatusehatOrgId(e.target.value)}
                    className="h-10 pl-9 text-xs rounded-xl focus:border-teal-500 font-mono font-bold text-teal-900 bg-teal-50/30"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Kredensial SATUSEHAT & Live Handshake Test */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <img
                  src="/satusehat-default-logo.svg"
                  alt="SATUSEHAT"
                  className="h-4 w-4 object-contain shrink-0"
                />
                <span>Kredensial OAuth2 SATUSEHAT Kemenkes (Terenkripsi AES-256)</span>
              </span>
              <div className="flex items-center gap-2">
                <CustomSelect<"staging" | "production">
                  value={satusehatEnv}
                  onChange={(val) => setSatusehatEnv(val)}
                  size="sm"
                  className="w-40"
                  buttonClassName="h-7 text-[11px] font-semibold bg-white border border-slate-300 text-slate-700 rounded-lg px-2"
                  options={[
                    { value: "staging", label: "Staging (Sandbox)", icon: <Server className="h-3 w-3 text-amber-500" /> },
                    { value: "production", label: "Production (Live)", icon: <Zap className="h-3 w-3 text-emerald-600" /> },
                  ]}
                />
                <Badge variant="outline" className="text-[9px] bg-white">
                  Multi-Tenant
                </Badge>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Kredensial disimpan terenkripsi di PostgreSQL per faskes. Anda dapat langsung menguji koneksi ke server Kemenkes sebelum menyimpan.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold text-slate-600">Client ID</Label>
                  {satusehatClientId.length > 0 && (
                    <span
                      className={`text-[10px] font-mono font-medium ${
                        satusehatClientId.length === 48
                          ? "text-emerald-600"
                          : "text-amber-600 font-semibold"
                      }`}
                    >
                      {satusehatClientId.length}/48 char
                      {satusehatClientId.length !== 48 && " (terpotong?)"}
                    </span>
                  )}
                </div>
                <Input
                  placeholder="Client ID dari Portal SATUSEHAT (48 karakter)"
                  value={satusehatClientId}
                  onChange={(e) => {
                    setSatusehatClientId(e.target.value.trim());
                    setTestResult(null);
                  }}
                  className={`h-9 text-xs rounded-lg font-mono bg-white ${
                    satusehatClientId.length > 0 && satusehatClientId.length !== 48
                      ? "border-amber-400 focus:border-amber-500"
                      : ""
                  }`}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold text-slate-600">Client Secret</Label>
                  {satusehatClientSecret.length > 0 && (
                    <span
                      className={`text-[10px] font-mono font-medium ${
                        satusehatClientSecret.length === 64
                          ? "text-emerald-600"
                          : "text-amber-600 font-semibold"
                      }`}
                    >
                      {satusehatClientSecret.length}/64 char
                      {satusehatClientSecret.length !== 64 && " (terpotong?)"}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type={showClientSecret ? "text" : "password"}
                    placeholder="Client Secret (64 karakter)"
                    value={satusehatClientSecret}
                    onChange={(e) => {
                      setSatusehatClientSecret(e.target.value.trim());
                      setTestResult(null);
                    }}
                    className={`h-9 pr-8 text-xs rounded-lg font-mono bg-white ${
                      satusehatClientSecret.length > 0 && satusehatClientSecret.length !== 64
                        ? "border-amber-400 focus:border-amber-500"
                        : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowClientSecret(!showClientSecret)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    title={showClientSecret ? "Sembunyikan secret" : "Tampilkan secret"}
                  >
                    {showClientSecret ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Test Connection Button & Result */}
            <div className="pt-2 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection || !satusehatClientId || !satusehatClientSecret}
                  className="h-8 text-xs font-semibold rounded-lg bg-white hover:bg-slate-100 border-slate-300 text-teal-700 hover:text-teal-800 gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isTestingConnection ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Menguji Handshake Kemenkes...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                      <span>Uji Koneksi SATUSEHAT Sekarang</span>
                    </>
                  )}
                </Button>

                {satusehatClientId && satusehatClientSecret && !testResult && (
                  <span className="text-[11px] text-slate-400">
                    Kredensial siap diuji
                  </span>
                )}
              </div>

              {testResult && (
                <div
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                    testResult.success
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 text-rose-600 shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                  {testResult.latencyMs !== undefined && (
                    <span className="text-[10px] font-mono font-bold bg-white/80 px-2 py-0.5 rounded border">
                      {testResult.latencyMs}ms
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Master Poliklinik & Unit Layanan */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Layers className="h-4 w-4 text-teal-600" />
                <span>2. Master Poliklinik / Unit Layanan ({departments.length})</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddDepartment}
                className="h-7 px-2.5 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border-teal-200 rounded-lg gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Poli</span>
              </Button>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {departments.map((dept, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors flex items-center gap-2.5"
                >
                  <div className="h-7 w-7 rounded-lg bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                    <Input
                      placeholder="Nama Poli (mis: Poli Penyakit Dalam)"
                      value={dept.name}
                      onChange={(e) => handleDepartmentChange(idx, "name", e.target.value)}
                      className="h-8 text-xs bg-white rounded-lg"
                    />
                    <Input
                      placeholder="Ruangan (mis: Ruang 101)"
                      value={dept.room}
                      onChange={(e) => handleDepartmentChange(idx, "room", e.target.value)}
                      className="h-8 text-xs bg-white rounded-lg"
                    />
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min="1"
                        max="500"
                        placeholder="Kuota"
                        value={dept.quota}
                        onChange={(e) =>
                          handleDepartmentChange(idx, "quota", parseInt(e.target.value) || 30)
                        }
                        className="h-8 text-xs bg-white rounded-lg font-mono w-20"
                      />
                      <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                        pasien/hari
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveDepartment(idx)}
                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                    title="Hapus Poliklinik"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Akun Administrator Pertama Faskes */}
          <div className="space-y-3 p-4 rounded-xl bg-purple-50/60 border border-purple-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-purple-700" />
                <span>3. Akun Administrator Utama Faskes (Super Admin)</span>
              </span>
              <Badge
                variant="purple"
                className="text-[10px] font-bold px-2 py-0.5 shadow-2xs"
              >
                Wewenang Penuh
              </Badge>
            </div>
            <p className="text-[11px] text-purple-800/80">
              Akun ini digunakan oleh Penanggung Jawab / Admin Sistem untuk login pertama kali dan mendaftarkan dokter, perawat &amp; staf lainnya.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1 items-start">
              {/* Kolom 1: Nama PIC */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-5">
                  <Label className="text-[11px] font-bold text-slate-700">Nama Admin / PIC</Label>
                  <span className="text-[10px] text-purple-700/60 font-medium">Penanggung Jawab</span>
                </div>
                <Input
                  placeholder="mis: dr. Hendra / Budi S."
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="h-9 text-xs rounded-lg bg-white shadow-2xs border-slate-200 focus-visible:ring-purple-500"
                />
                <p className="text-[10px] text-slate-500 leading-tight min-h-[14px]">
                  Nama lengkap PIC / pimpinan faskes
                </p>
              </div>

              {/* Kolom 2: Username Login */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-5">
                  <Label className="text-[11px] font-bold text-slate-700">Username Login</Label>
                  <span className="text-[9px] font-bold text-purple-700 bg-purple-200/60 px-1.5 py-0.5 rounded">Wajib Unik</span>
                </div>
                <Input
                  placeholder="mis: admin.sejahtera"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                  className={`h-9 text-xs rounded-lg font-mono bg-white shadow-2xs focus-visible:ring-purple-500 ${
                    ["admin", "superadmin", "dokter", "perawat"].includes(adminUsername.trim().toLowerCase())
                      ? "border-rose-400 focus-visible:ring-rose-500"
                      : "border-slate-200"
                  }`}
                />
                {["admin", "superadmin", "dokter", "perawat"].includes(adminUsername.trim().toLowerCase()) ? (
                  <p className="text-[10px] text-rose-600 font-medium leading-tight min-h-[14px]">
                    Sudah dipakai. Coba: admin.{name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10) || "faskes"}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500 leading-tight min-h-[14px]">
                    Format: admin.namafaskes
                  </p>
                )}
              </div>

              {/* Kolom 3: Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-5">
                  <Label className="text-[11px] font-bold text-slate-700">Kata Sandi / Password</Label>
                  <span className="text-[10px] text-purple-700/60 font-medium">Kredensial Awal</span>
                </div>
                <div className="relative">
                  <Input
                    type={showAdminPassword ? "text" : "password"}
                    placeholder="Password login..."
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="h-9 text-xs rounded-lg bg-white shadow-2xs border-slate-200 pr-9 focus-visible:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-700 focus:outline-none transition-colors cursor-pointer"
                    tabIndex={-1}
                    title={showAdminPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showAdminPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight min-h-[14px]">
                  Minimal 6 karakter kombinasi
                </p>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-between sm:justify-between w-full">
            <p className="text-[11px] text-slate-400">
              * Faskes akan langsung aktif di database &amp; dapat dipilih untuk pelayanan.
            </p>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isSubmitting}
                className="h-9 text-xs rounded-xl cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-9 px-4 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-md gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Mendaftarkan Faskes...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Daftarkan &amp; Aktifkan Faskes</span>
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
