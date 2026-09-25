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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Shield,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  CheckCircle2,
  Radio,
  Lock,
  MapPin,
  Phone,
  FileCheck2,
  Hospital,
  Stethoscope,
  Server,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { FacilityProfile, FacilityType, SatusehatEnvironment } from "@/lib/satusehat/types";
import { CustomSelect } from "@/components/ui/custom-select";

interface FacilityEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  facility: FacilityProfile | null;
  onSuccess: () => void | Promise<void>;
}

export function FacilityEditModal({
  isOpen,
  onClose,
  facility,
  onSuccess,
}: FacilityEditModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<FacilityType>("klinik_pratama");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  // Kredensial SATUSEHAT
  const [satusehatOrgId, setSatusehatOrgId] = useState("");
  const [satusehatClientId, setSatusehatClientId] = useState("");
  const [satusehatClientSecret, setSatusehatClientSecret] = useState("");
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [satusehatEnv, setSatusehatEnv] = useState<SatusehatEnvironment>("staging");

  // State Test Connection & Save
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state saat modal dibuka dengan data facility
  useEffect(() => {
    if (facility && isOpen) {
      setName(facility.name || "");
      setType(facility.type || "klinik_pratama");
      setLicenseNumber(facility.licenseNumber || "");
      setAddress(facility.address || "");
      setPhone(facility.phone || "");
      setSatusehatOrgId(facility.satusehatOrgId || "");
      setSatusehatClientId(facility.satusehatClientId || "");
      setSatusehatClientSecret(""); // Kosongkan, biarkan user isi jika ingin merotasi
      setShowClientSecret(false);
      setSatusehatEnv(facility.satusehatEnv || "staging");
      setTestResult(null);
    }
  }, [facility, isOpen]);

  const handleTestConnection = async () => {
    if (!satusehatOrgId.trim()) {
      toast.error("Organization ID SATUSEHAT wajib diisi untuk pengujian.");
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);

      // Jika user menginput kredensial baru, uji menggunakan input tersebut
      // Jika kosong, gunakan kredensial tersimpan di backend melalui facilityId
      const payload: Record<string, string> = {
        env: satusehatEnv,
      };

      if (satusehatClientId.trim() && satusehatClientSecret.trim()) {
        payload.clientId = satusehatClientId.trim();
        payload.clientSecret = satusehatClientSecret.trim();
      } else if (facility?.id) {
        payload.facilityId = facility.id;
      } else {
        toast.error("Masukkan Client ID & Client Secret atau simpan data terlebih dahulu.");
        return;
      }

      const res = await fetch("/api/facilities/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: "Handshake OAuth2 Berhasil! Kredensial valid.",
          latencyMs: data.data?.telemetry?.latencyMs,
        });
        toast.success("Koneksi SATUSEHAT Valid!", {
          description: `Token aktif ${data.data.tokenExpiresIn} detik (Latency: ${data.data.telemetry?.latencyMs || 0}ms)`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || "Gagal mendapatkan token OAuth2 SATUSEHAT.",
        });
        toast.error("Uji Koneksi Gagal", {
          description: data.error || "Periksa kembali Organization ID, Client ID & Secret.",
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: "Gangguan jaringan saat menghubungi server.",
      });
      toast.error("Gagal melakukan pengujian koneksi.");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility?.id) return;

    if (!name.trim()) {
      toast.error("Nama faskes wajib diisi.");
      return;
    }
    if (!satusehatOrgId.trim()) {
      toast.error("Organization ID SATUSEHAT wajib diisi.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: Record<string, unknown> = {
        name: name.trim(),
        type,
        licenseNumber: licenseNumber.trim(),
        address: address.trim(),
        phone: phone.trim(),
        satusehatOrgId: satusehatOrgId.trim(),
        satusehatClientId: satusehatClientId.trim(),
        satusehatEnv,
      };

      // Hanya kirim secret jika diisi baru
      if (satusehatClientSecret.trim().length > 0) {
        payload.satusehatClientSecret = satusehatClientSecret.trim();
      }

      const res = await fetch(`/api/facilities/${facility.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Profil Faskes Diperbarui!", {
          description: `Data & kredensial ${name} berhasil disimpan.`,
        });
        await onSuccess();
        onClose();
      } else {
        toast.error(data.error || "Gagal memperbarui faskes.");
      }
    } catch {
      toast.error("Terjadi kesalahan saat menyimpan faskes.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!facility) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-7">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Edit Profil &amp; Kredensial Faskes
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                ID Faskes: <span className="font-mono font-bold text-teal-800">{facility.id}</span> • Diperbarui oleh Super Admin Vendor
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-3">
          {/* Section 1: Profil Faskes */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-50/70 border border-slate-200">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-teal-600" />
              1. Identitas &amp; Legalitas Faskes
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-semibold text-slate-700">Nama Fasilitas Kesehatan *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="mis: Klinik Pratama Sehat Bersama"
                  className="h-9 text-xs bg-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-5">
                  <Label className="text-xs font-semibold text-slate-700">Jenis Faskes *</Label>
                  <span className="text-[10px] text-slate-400 font-medium">Klasifikasi Faskes</span>
                </div>
                <CustomSelect<FacilityType>
                  value={type}
                  onChange={(val) => setType(val)}
                  size="md"
                  className="w-full"
                  buttonClassName="h-9 text-xs rounded-lg border-slate-200 bg-white"
                  options={[
                    { value: "klinik_pratama", label: "Klinik Pratama", icon: <Stethoscope className="h-3.5 w-3.5 text-teal-600" /> },
                    { value: "klinik_utama", label: "Klinik Utama", icon: <Stethoscope className="h-3.5 w-3.5 text-indigo-600" /> },
                    { value: "rumah_sakit", label: "Rumah Sakit", icon: <Hospital className="h-3.5 w-3.5 text-blue-600" /> },
                    { value: "puskesmas", label: "Puskesmas", icon: <Building2 className="h-3.5 w-3.5 text-emerald-600" /> },
                    { value: "praktik_mandiri", label: "Praktik Mandiri", icon: <Stethoscope className="h-3.5 w-3.5 text-purple-600" /> },
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-5">
                  <Label className="text-xs font-semibold text-slate-700">Nomor Izin Operasional</Label>
                  <span className="text-[10px] text-slate-400 font-medium">Dinas Kesehatan</span>
                </div>
                <div className="relative">
                  <FileCheck2 className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="mis: 445/008/Klinik-P/2025"
                    className="h-9 text-xs pl-8 bg-white font-mono shadow-2xs border-slate-200 focus-visible:ring-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-semibold text-slate-700">Alamat Lengkap</Label>
                <div className="relative">
                  <MapPin className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Alamat jalan, kelurahan, kota/kabupaten..."
                    className="w-full text-xs rounded-md border border-slate-200 bg-white p-2.5 pl-8 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">No. Telepon / Hotline</Label>
                <div className="relative">
                  <Phone className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="mis: 021-5550199"
                    className="h-9 text-xs pl-8 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Integrasi SATUSEHAT Kemenkes */}
          <div className="space-y-3.5 p-4 rounded-xl bg-teal-50/50 border border-teal-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-teal-700" />
                2. Kredensial SATUSEHAT Kemenkes RI
              </span>
              <div className="flex items-center gap-1.5">
                <Badge
                  variant={satusehatEnv === "production" ? "production" : "staging"}
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
                >
                  {satusehatEnv}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold px-2 py-0.5 ${
                    facility.satusehatStatus === "connected"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-amber-50 text-amber-800 border-amber-300"
                  }`}
                >
                  {facility.satusehatStatus === "connected" ? "CONNECTED" : "UNVERIFIED"}
                </Badge>
              </div>
            </div>

            <p className="text-[11px] text-teal-900/80 leading-relaxed">
              Kredensial faskes disimpan dengan proteksi enkripsi hardware-grade <strong>AES-256-GCM</strong>. Jika Anda tidak ingin mengubah <em>Client Secret</em>, biarkan kolomnya kosong.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 items-start">
              {/* Row 1, Col 1: Target Environment */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-5">
                  <Label className="text-xs font-semibold text-slate-700">Target Environment *</Label>
                  <span className="text-[10px] text-teal-700/60 font-medium">Gateway Kemenkes</span>
                </div>
                <CustomSelect<SatusehatEnvironment>
                  value={satusehatEnv}
                  onChange={(val) => setSatusehatEnv(val)}
                  size="md"
                  className="w-full"
                  buttonClassName="h-9 text-xs rounded-lg border-slate-200 bg-white font-semibold"
                  options={[
                    { value: "staging", label: "Staging (Development & Sandbox)", icon: <Server className="h-3.5 w-3.5 text-amber-500" /> },
                    { value: "production", label: "Production (Live Kemenkes RI)", icon: <Zap className="h-3.5 w-3.5 text-emerald-600" /> },
                  ]}
                />
                <p className="text-[10px] text-slate-400 leading-tight min-h-[14px]">
                  Pilih server uji coba (staging) atau live (production)
                </p>
              </div>

              {/* Row 1, Col 2: Org ID */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-5">
                  <Label className="text-xs font-semibold text-slate-700">SATUSEHAT Org ID *</Label>
                  <span className="text-[9px] text-teal-700 font-bold bg-teal-100/80 px-1.5 py-0.5 rounded">Dari Portal Kemenkes</span>
                </div>
                <Input
                  value={satusehatOrgId}
                  onChange={(e) => setSatusehatOrgId(e.target.value.trim())}
                  placeholder="mis: 10000004 atau UUID Organisasi"
                  className="h-9 text-xs font-mono bg-white shadow-2xs border-slate-200 focus-visible:ring-teal-500"
                  required
                />
                <p className="text-[10px] text-slate-400 leading-tight min-h-[14px]">
                  ID organisasi resmi terdaftar di Kemenkes RI
                </p>
              </div>

              {/* Row 2, Col 1: Client ID */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-5">
                  <Label className="text-xs font-semibold text-slate-700">Client ID OAuth2</Label>
                  <span className="text-[10px] text-teal-700/60 font-medium">Kredensial Publik</span>
                </div>
                <Input
                  value={satusehatClientId}
                  onChange={(e) => setSatusehatClientId(e.target.value.trim())}
                  placeholder="Client ID dari DTO Kemenkes"
                  className="h-9 text-xs font-mono bg-white shadow-2xs border-slate-200 focus-visible:ring-teal-500"
                />
                <p className="text-[10px] text-slate-400 leading-tight min-h-[14px]">
                  Kredensial client dari DTO Kemenkes RI
                </p>
              </div>

              {/* Row 2, Col 2: Client Secret */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-5">
                  <Label className="text-xs font-semibold text-slate-700">Client Secret</Label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Tersimpan: <strong className="text-slate-700">{facility.satusehatClientSecretMasked || "••••••••"}</strong>
                  </span>
                </div>
                <div className="relative">
                  <Input
                    type={showClientSecret ? "text" : "password"}
                    value={satusehatClientSecret}
                    onChange={(e) => setSatusehatClientSecret(e.target.value)}
                    placeholder="Ketik baru untuk merotasi secret..."
                    className="h-9 text-xs font-mono bg-white shadow-2xs border-slate-200 pr-9 focus-visible:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowClientSecret(!showClientSecret)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    tabIndex={-1}
                    title={showClientSecret ? "Sembunyikan secret" : "Lihat secret"}
                  >
                    {showClientSecret ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight min-h-[14px]">
                  Kosongkan bila tetap menggunakan secret lama
                </p>
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
                  disabled={isTesting || !satusehatOrgId.trim()}
                  className="h-8 text-xs font-semibold rounded-lg bg-white hover:bg-slate-100 border-slate-300 text-teal-700 hover:text-teal-800 gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Menguji Handshake OAuth2...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                      <span>Uji Handshake SATUSEHAT</span>
                    </>
                  )}
                </Button>

                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Lock className="h-3 w-3 text-teal-600" />
                  <span>Enkripsi AES-256 Aktif</span>
                </div>
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

          <DialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-between sm:justify-between w-full">
            <span className="text-[11px] text-slate-400">
              * Perubahan akan langsung aktif untuk seluruh sesi SIMRS faskes.
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
                className="h-9 px-4 text-xs font-semibold cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="h-9 px-4 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer shadow-sm shadow-teal-600/20 gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>Simpan Perubahan</span>
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
