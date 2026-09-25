"use client";

import React, { useState, useEffect } from "react";
import {
  KeyRound,
  Shield,
  ShieldCheck,
  Building2,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
  ArrowRight,
  Activity,
  Server,
  Zap,
  ChevronDown,
  ChevronUp,
  Hospital,
  Save,
  Loader2,
  Copy,
  Check,
  MapPin,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  AuthApiResponse,
  AuthSession,
  SatusehatEnvironment,
} from "@/lib/satusehat/types";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";
import { maskSecret } from "@/lib/utils";

interface AuthCardProps {
  env: SatusehatEnvironment;
  initialSession?: AuthSession | null;
  onEnvChange?: (env: SatusehatEnvironment) => void;
  onAuthSuccess: (session: AuthSession, rawResponse: unknown) => void;
  onAuthError: (error: AuthApiResponse["error"], telemetry?: AuthApiResponse["telemetry"]) => void;
  onLogRequest: (entry: {
    title: string;
    url: string;
    method: string;
    status: number;
    latencyMs: number;
    requestBody: Record<string, unknown>;
    responseBody: unknown;
  }) => void;
}

export function AuthCard({
  env,
  initialSession,
  onEnvChange,
  onAuthSuccess,
  onAuthError,
  onLogRequest,
}: AuthCardProps) {
  const { facility, user, refreshFacilities } = useAuth();

  const isInitialValid = Boolean(
    initialSession?.accessToken &&
    initialSession.expiresAt &&
    initialSession.expiresAt > Date.now()
  );

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [orgId, setOrgId] = useState("");
  const [selectedEnv, setSelectedEnv] = useState<SatusehatEnvironment>(env);
  const [showSecret, setShowSecret] = useState(false);
  const [showEditCredentials, setShowEditCredentials] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSession, setActiveSession] = useState<AuthSession | null>(initialSession || null);
  const [isConnected, setIsConnected] = useState<boolean>(
    isInitialValid || facility?.satusehatStatus === "connected"
  );
  const [isVerifyingStatus, setIsVerifyingStatus] = useState<boolean>(
    !isInitialValid && facility?.satusehatStatus !== "connected"
  );
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const [lastError, setLastError] = useState<AuthApiResponse["error"] | null>(null);
  const [copiedOrgId, setCopiedOrgId] = useState(false);

  const activeOrgId = facility?.satusehatOrgId || activeSession?.orgId || "b15a7ae7-f366-4a84-8385-0b8196c05002";

  const handleCopyOrgId = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activeOrgId) return;
    navigator.clipboard.writeText(activeOrgId);
    setCopiedOrgId(true);
    toast.success("Organization ID disalin ke clipboard", {
      description: activeOrgId,
    });
    setTimeout(() => setCopiedOrgId(false), 2000);
  };

  // Sync selectedEnv when prop env changes
  useEffect(() => {
    setSelectedEnv(env);
  }, [env]);

  // Set initial default values from active facility if available
  useEffect(() => {
    if (facility) {
      setOrgId(facility.satusehatOrgId || "");
      if (facility.satusehatEnv) {
        setSelectedEnv(facility.satusehatEnv);
      }
      if (facility.satusehatStatus === "connected") {
        setIsConnected(true);
      }
    }
  }, [facility]);

  // Sync with initialSession if it updates from parent
  useEffect(() => {
    if (initialSession?.accessToken && initialSession.expiresAt > Date.now()) {
      setActiveSession(initialSession);
      setIsConnected(true);
      setIsVerifyingStatus(false);
    }
  }, [initialSession]);

  // Auto-connect on mount or when environment/facility changes
  useEffect(() => {
    // Jika sudah ada session yang aktif dan masih berlaku (buffer minimal 60 detik),
    // gunakan session tersebut langsung tanpa handshake berulang!
    if (initialSession?.accessToken && initialSession.expiresAt > Date.now() + 60000) {
      setIsConnected(true);
      setActiveSession(initialSession);
      setIsVerifyingStatus(false);
      return;
    }

    handleAuthenticate(false, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env, facility?.id, initialSession?.accessToken]);

  const handleAuthenticate = async (forceRefresh = false, isAutoInit = false) => {
    setIsLoading(true);
    if (!isConnected) {
      setIsVerifyingStatus(true);
    }
    setLastError(null);

    const isCustom = Boolean(clientId.trim() || clientSecret.trim());
    const payload = {
      facilityId: facility?.id || undefined,
      clientId: clientId.trim() || undefined,
      clientSecret: clientSecret.trim() || undefined,
      env: selectedEnv,
      orgId: orgId.trim() || facility?.satusehatOrgId || undefined,
      forceRefresh,
    };

    try {
      const startTime = performance.now();
      const response = await fetch("/api/satusehat/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(facility?.id ? { "x-facility-id": facility.id } : {}),
        },
        body: JSON.stringify(payload),
      });

      const latencyMs = Math.round(performance.now() - startTime);
      setLastLatency(latencyMs);
      const data: AuthApiResponse = await response.json();

      // Log request to telemetry
      onLogRequest({
        title: forceRefresh ? "Force Refresh Token SATUSEHAT" : "Handshake Gateway SATUSEHAT",
        url: data.telemetry?.targetUrl || `/api/satusehat/auth`,
        method: data.telemetry?.method || "POST",
        status: response.status,
        latencyMs: data.telemetry?.latencyMs ?? latencyMs,
        requestBody: {
          facility_id: facility?.id,
          facility_name: facility?.name,
          source: isCustom ? "manual_input" : "facility_encrypted_db",
          env: selectedEnv,
          org_id: orgId || facility?.satusehatOrgId || data.data?.orgId || undefined,
        },
        responseBody: data,
      });

      if (data.success && data.data) {
        setIsConnected(true);
        setActiveSession(data.data);
        if (!isAutoInit) {
          toast.success("Koneksi SATUSEHAT Berhasil", {
            description: `Gateway Kemenkes terhubung untuk ${facility?.name || "Faskes"} (${latencyMs}ms) • Token berlaku ${Math.round(data.data.expiresIn / 60)} menit.`,
          });
        }
        onAuthSuccess(data.data, data);
      } else {
        setIsConnected(false);
        const err = data.error || {
          message: "Gagal menghubungkan sistem ke SATUSEHAT Kemenkes.",
        };
        setLastError(err);
        if (!isAutoInit) {
          toast.error("Koneksi SATUSEHAT Gagal", {
            description: err.message,
          });
        }
        onAuthError(err, data.telemetry);
      }
    } catch (err: unknown) {
      setIsConnected(false);
      const errorObj = {
        message:
          err instanceof Error
            ? err.message
            : "Terjadi kendala jaringan saat menghubungi server SATUSEHAT.",
        code: "NETWORK_ERROR",
      };
      setLastError(errorObj);
      if (!isAutoInit) {
        toast.error("Kendala Jaringan", { description: errorObj.message });
      }
      onAuthError(errorObj);
    } finally {
      setIsLoading(false);
      setIsVerifyingStatus(false);
    }
  };

  const handleSaveFacilityCredentials = async () => {
    if (!facility?.id) {
      toast.error("Tidak ada faskes aktif yang terdeteksi.");
      return;
    }

    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error("Client ID dan Client Secret wajib diisi.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/facilities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: facility.id,
          satusehatOrgId: orgId.trim() || facility.satusehatOrgId,
          satusehatClientId: clientId.trim(),
          satusehatClientSecret: clientSecret.trim(),
          satusehatEnv: selectedEnv,
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        toast.success("Kredensial Faskes Berhasil Disimpan", {
          description: "Kredensial disimpan dan dienkripsi AES-256-GCM. Menguji koneksi gateway...",
        });
        if (refreshFacilities) {
          await refreshFacilities();
        }
        setShowEditCredentials(false);
        // Langsung uji koneksi dengan kredensial baru
        await handleAuthenticate(true, false);
      } else {
        toast.error("Gagal Menyimpan Kredensial", {
          description: resData.error || "Terjadi kesalahan saat menyimpan ke database.",
        });
      }
    } catch (err) {
      toast.error("Kesalahan Jaringan", {
        description: err instanceof Error ? err.message : "Gagal memperbarui kredensial faskes.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const activeFacilityName = facility?.name || "RS Umum Daerah Sehat Sejahtera";
  const isSuperOrAdmin = user?.role === "super_admin" || user?.role === "admin";

  return (
    <Card className="ehr-card p-0 shadow-sm border-slate-200 bg-white">
      <CardHeader className="p-5 pb-4 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl border p-2 shrink-0 transition-colors duration-300 ${
                isVerifyingStatus || (isLoading && !isConnected)
                  ? "bg-slate-50 border-slate-200"
                  : isConnected
                  ? "bg-white border-emerald-200 shadow-2xs"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              {isVerifyingStatus || (isLoading && !isConnected) ? (
                <Activity className="h-5 w-5 animate-pulse text-teal-600" />
              ) : isConnected ? (
                <img
                  src="/satusehat-default-logo.svg"
                  alt="SATUSEHAT"
                  className="h-full w-full object-contain"
                />
              ) : (
                <Activity className="h-5 w-5 text-rose-500" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base font-extrabold text-slate-900">
                  Integrasi SATUSEHAT Kemenkes RI
                </CardTitle>
                {isVerifyingStatus || (isLoading && !isConnected) ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin text-teal-600" />
                    <span>MEMERIKSA KONEKSI...</span>
                  </span>
                ) : (
                  <Badge
                    variant={isConnected ? "default" : "destructive"}
                    className={`text-[10px] font-bold px-2 py-0.5 transition-all duration-300 ${
                      isConnected
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-rose-600 text-white"
                    }`}
                  >
                    {isConnected ? "🟢 TERHUBUNG (LIVE)" : "🔴 TERPUTUS / BELUM VERIFIKASI"}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Gateway Interoperabilitas Kemenkes RI • Kredensial Faskes Terenkripsi AES-256 & Terintegrasi Otomatis
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Environment Badge / Selector */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
              <span
                className={`h-2 w-2 rounded-full ${
                  selectedEnv === "production" ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              <span className="capitalize">
                {selectedEnv === "production" ? "Production (Operasional Resmi)" : "Staging (Sandbox Uji Coba)"}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {/* Active Facility Profile Card */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-teal-50/70 via-slate-50 to-white border border-teal-200/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs shrink-0">
              <Hospital className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                  {activeFacilityName}
                </span>
                <Badge variant="outline" className="text-[10px] font-bold bg-white text-teal-800 border-teal-200 shrink-0">
                  {facility?.type === "rumah_sakit"
                    ? "Rumah Sakit"
                    : facility?.type === "klinik_pratama"
                    ? "Klinik Pratama"
                    : facility?.type === "klinik_utama"
                    ? "Klinik Utama"
                    : "Fasyankes"}
                </Badge>
              </div>

              {/* Organization ID Chip + Address */}
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-slate-500 mt-1.5">
                {/* Org ID Chip with Copy Button */}
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-teal-200/80 text-[11px] font-mono text-slate-700 shadow-2xs">
                  <span className="text-slate-400 font-sans text-[10px] font-semibold uppercase tracking-wider">
                    Org ID:
                  </span>
                  <code className="font-semibold text-slate-800 whitespace-nowrap select-all" title={activeOrgId}>
                    {activeOrgId}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyOrgId}
                    title={copiedOrgId ? "Tersalin!" : "Salin Organization ID"}
                    className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 active:scale-90 transition-all focus:outline-none"
                  >
                    {copiedOrgId ? (
                      <Check className="h-3 w-3 text-emerald-600 animate-in zoom-in-50 duration-200" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>

                <span className="hidden sm:inline text-slate-300">•</span>

                {/* Facility Address */}
                <div className="inline-flex items-center gap-1 text-slate-600 font-sans font-medium text-xs">
                  <MapPin className="h-3 w-3 text-teal-600 shrink-0" />
                  <span className="truncate max-w-xs sm:max-w-md" title={facility?.address || "Jakarta, Indonesia"}>
                    {facility?.address || "Jakarta, Indonesia"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {isSuperOrAdmin && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowEditCredentials(!showEditCredentials)}
              className="text-xs font-semibold gap-1.5 shrink-0 self-start md:self-auto bg-white hover:bg-teal-50 border-teal-200 text-teal-700"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>{showEditCredentials ? "Tutup Form Kredensial" : "Kelola Kredensial Faskes"}</span>
            </Button>
          )}
        </div>

        {/* Status Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Box 1: Mode & Gateway */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-slate-400" />
              <span>Target Gateway Kemenkes</span>
            </div>
            <div className="text-xs font-bold text-slate-800 font-mono">
              {selectedEnv === "production" ? "api-satusehat.kemkes.go.id" : "api-satusehat-stg.dto.kemkes.go.id"}
            </div>
            <div className="text-[10px] text-teal-600 font-medium">
              Protokol TLS 1.3 • OAuth 2.0 Bearer
            </div>
          </div>

          {/* Box 2: Organization ID */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                <span>Organization ID Faskes</span>
              </div>
              <button
                type="button"
                onClick={handleCopyOrgId}
                title={copiedOrgId ? "Tersalin!" : "Salin Organization ID"}
                className="p-1 rounded hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition-colors"
              >
                {copiedOrgId ? (
                  <Check className="h-3 w-3 text-emerald-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
            <div className="text-xs font-bold font-mono text-slate-800 truncate" title={activeOrgId}>
              {activeOrgId}
            </div>
            <div className="text-[10px] text-slate-500">
              {facility ? "Terdaftar Resmi pada Profil Faskes" : "Mode Uji Coba (Sandbox Kemenkes)"}
            </div>
          </div>

          {/* Box 3: Latensi & Masa Berlaku */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-slate-400" />
              <span>Latensi & Masa Berlaku Token</span>
            </div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <span className="text-emerald-700 font-mono">
                {lastLatency !== null ? `${lastLatency} ms` : isConnected ? "Aktif" : "-"}
              </span>
              {activeSession && (
                <span className="text-slate-400 font-normal text-[11px]">
                  • Sisa ±{Math.round(activeSession.expiresIn / 60)} mnt
                </span>
              )}
            </div>
            <div className="text-[10px] text-emerald-600 font-medium">
              Token Diperbarui Otomatis oleh Gateway
            </div>
          </div>
        </div>

        {/* Info Banner: Efisiensi Pelayanan Medis */}
        <div className="p-3.5 rounded-xl bg-teal-50/80 border border-teal-200/80 flex items-start gap-3">
          <Shield className="h-5 w-5 text-teal-700 shrink-0 mt-0.5" />
          <div className="text-xs text-teal-900 space-y-0.5">
            <p className="font-bold text-teal-950">
              Otomatisasi Pengiriman Klinis (Tanpa Input Berulang)
            </p>
            <p className="text-teal-800 leading-relaxed">
              Dokter dan tenaga medis di <strong>{activeFacilityName}</strong> fokus sepenuhnya pada pelayanan pasien. 
              Seluruh pertukaran data <strong>9 Resource HL7 FHIR R4</strong> (Kunjungan, Tanda Vital, Diagnosa ICD-10, Tindakan ICD-9-CM, Resep KFA) 
              ditransmisikan otomatis ke gateway Kemenkes RI dengan enkripsi berstandar Permenkes No. 24/2022.
            </p>
          </div>
        </div>

        {/* Error Alert with Suggestions */}
        {lastError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 space-y-2">
            <div className="flex items-start gap-2 text-rose-800 text-xs font-bold">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{lastError.message}</span>
            </div>
            {lastError.suggestions && lastError.suggestions.length > 0 && (
              <ul className="pl-6 text-[11px] text-rose-700 list-disc space-y-1">
                {lastError.suggestions.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Form Pembaruan Kredensial SATUSEHAT Mandiri untuk Admin Faskes */}
        {showEditCredentials && isSuperOrAdmin && (
          <div className="border border-teal-200 rounded-xl p-4 bg-teal-50/30 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-teal-100 pb-2">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-teal-700" />
                <span className="text-xs font-bold text-slate-800">
                  Konfigurasi Kredensial SATUSEHAT ({activeFacilityName})
                </span>
              </div>
              <span className="text-[10px] text-teal-700 font-semibold bg-teal-100/60 px-2 py-0.5 rounded">
                Terenkripsi AES-256
              </span>
            </div>

            <p className="text-[11px] text-slate-600">
              Masukkan Client ID dan Client Secret resmi yang diterbitkan oleh Kementerian Kesehatan RI untuk faskes ini. 
              Kredensial disimpan secara terenkripsi dan hanya dapat diakses oleh layanan gateway SIMRS.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="facility-client-id" className="text-[11px] font-bold text-slate-700">
                  Client ID SATUSEHAT
                </Label>
                <Input
                  id="facility-client-id"
                  placeholder="Contoh: vL7xxxxxxxxxxxxxxxxxxx"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="font-mono text-xs h-8 bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="facility-client-secret" className="text-[11px] font-bold text-slate-700">
                  Client Secret SATUSEHAT
                </Label>
                <div className="relative">
                  <Input
                    id="facility-client-secret"
                    type={showSecret ? "text" : "password"}
                    placeholder="Masukkan Secret Key Kemenkes..."
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    className="font-mono text-xs h-8 pr-8 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    title={showSecret ? "Sembunyikan secret" : "Tampilkan secret"}
                  >
                    {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="facility-org-id" className="text-[11px] font-bold text-slate-700">
                  Organization ID Kemenkes
                </Label>
                <Input
                  id="facility-org-id"
                  placeholder="Contoh: 10000004 atau UUID Organisasi"
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  className="font-mono text-xs h-8 bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="facility-env" className="text-[11px] font-bold text-slate-700">
                  Target Environment
                </Label>
                <CustomSelect<SatusehatEnvironment>
                  value={selectedEnv}
                  onChange={(newEnv) => {
                    setSelectedEnv(newEnv);
                    if (onEnvChange) onEnvChange(newEnv);
                  }}
                  size="sm"
                  className="w-full"
                  buttonClassName="w-full h-8 text-xs px-2.5 rounded-lg border-slate-200 bg-white font-medium text-slate-800 shadow-2xs"
                  options={[
                    { value: "staging", label: "Staging Sandbox (Uji Coba)" },
                    { value: "production", label: "Production (Operasional Resmi)" },
                  ]}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-teal-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowEditCredentials(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="medical"
                size="sm"
                onClick={handleSaveFacilityCredentials}
                disabled={isSaving}
                className="text-xs font-bold gap-1.5"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Menyimpan & Menguji...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Simpan & Terapkan Kredensial</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-5 pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 mt-2">
        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>Kepatuhan Regulasi: <strong className="text-slate-700 font-semibold">HL7 FHIR R4</strong> • Enkripsi AES-256 Sesuai Permenkes No. 24/2022</span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAuthenticate(true, false)}
            disabled={isLoading}
            className="text-xs font-semibold gap-1.5"
            title="Perbarui token otentikasi OAuth2 SATUSEHAT faskes"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Perbarui Token (Refresh)</span>
          </Button>

          <Button
            type="button"
            variant="medical"
            size="sm"
            onClick={() => handleAuthenticate(false, false)}
            disabled={isLoading}
            className="text-xs font-bold gap-1.5 shadow-sm"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Memeriksa Gateway...</span>
              </>
            ) : (
              <>
                <Zap className="h-3.5 w-3.5" />
                <span>Uji Koneksi Gateway</span>
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
