"use client";

import React, { useState, useEffect } from "react";
import {
  KeyRound,
  Shield,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AuthApiResponse,
  AuthSession,
  SatusehatEnvironment,
} from "@/lib/satusehat/types";
import { toast } from "sonner";
import { maskSecret } from "@/lib/utils";

interface AuthCardProps {
  env: SatusehatEnvironment;
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
  onEnvChange,
  onAuthSuccess,
  onAuthError,
  onLogRequest,
}: AuthCardProps) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [orgId, setOrgId] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [showManualOverride, setShowManualOverride] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const [activeSession, setActiveSession] = useState<AuthSession | null>(null);
  const [lastError, setLastError] = useState<AuthApiResponse["error"] | null>(null);

  // Auto-connect on mount or when environment changes (Single-Tenant Default)
  useEffect(() => {
    handleAuthenticate(false, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env]);

  const handleAuthenticate = async (forceRefresh = false, isAutoInit = false) => {
    setIsLoading(true);
    setLastError(null);

    const isCustom = Boolean(clientId.trim() || clientSecret.trim());
    const payload = {
      clientId: clientId.trim() || undefined,
      clientSecret: clientSecret.trim() || undefined,
      env,
      orgId: orgId.trim() || undefined,
      forceRefresh,
    };

    try {
      const startTime = performance.now();
      const response = await fetch("/api/satusehat/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
          source: isCustom ? "manual_input" : "server_env_auto",
          env,
          org_id: orgId || data.data?.orgId || undefined,
        },
        responseBody: data,
      });

      if (data.success && data.data) {
        setIsConnected(true);
        setActiveSession(data.data);
        if (!isAutoInit) {
          toast.success("Koneksi SATUSEHAT Aktif", {
            description: `Gateway Kemenkes terhubung (${latencyMs}ms) • Token berlaku ${Math.round(data.data.expiresIn / 60)} menit.`,
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
          toast.error("Koneksi gagal", {
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
        toast.error("Kendala jaringan", { description: errorObj.message });
      }
      onAuthError(errorObj);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="ehr-card p-0 shadow-sm border-slate-200 bg-white">
      <CardHeader className="p-5 pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
              isConnected
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-rose-50 text-rose-700 border-rose-200"
            }`}>
              <Activity className={`h-5 w-5 ${isLoading ? "animate-spin text-teal-600" : ""}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-extrabold text-slate-900">
                  Status Integrasi SATUSEHAT Kemenkes RI
                </CardTitle>
                <Badge
                  variant={isConnected ? "default" : "destructive"}
                  className={`text-[10px] font-bold px-2 py-0.5 ${
                    isConnected ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                  }`}
                >
                  {isConnected ? "🟢 TERHUBUNG (LIVE)" : "🔴 TERPUTUS"}
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500">
                Arsitektur Server Tunggal (Single-Tenant Dedicated Server) • Kredensial Faskes Dikelola Otomatis di Server
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
            <span
              className={`h-2 w-2 rounded-full ${
                env === "production" ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <span className="capitalize">
              {env === "production" ? "Production" : "Staging"}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {/* Status Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Box 1: Mode & Gateway */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-slate-400" />
              <span>Target Gateway Kemenkes</span>
            </div>
            <div className="text-xs font-bold text-slate-800">
              {env === "production" ? "api-satusehat.kemkes.go.id" : "api-satusehat-stg.dto.kemkes.go.id"}
            </div>
            <div className="text-[10px] text-teal-600 font-medium">
              TLS 1.3 • OAuth2 Bearer Token
            </div>
          </div>

          {/* Box 2: Organization ID */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              <span>ID Organisasi Faskes</span>
            </div>
            <div className="text-xs font-bold font-mono text-slate-800 truncate" title={activeSession?.orgId || "b15a7ae7-f366-4a84-8385-0b8196c05002"}>
              {activeSession?.orgId || "b15a7ae7-f366-4a84-8385-0b8196c05002"}
            </div>
            <div className="text-[10px] text-slate-500">
              Terkonfigurasi Resmi di Server Faskes
            </div>
          </div>

          {/* Box 3: Latensi & Masa Berlaku */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-slate-400" />
              <span>Latensi & Masa Berlaku</span>
            </div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <span className="text-emerald-700 font-mono">{lastLatency !== null ? `${lastLatency} ms` : "Aktif"}</span>
              {activeSession && (
                <span className="text-slate-400 font-normal text-[11px]">
                  • Sisa ±{Math.round(activeSession.expiresIn / 60)} mnt
                </span>
              )}
            </div>
            <div className="text-[10px] text-emerald-600 font-medium">
              Auto-Refreshed oleh Server Sistem
            </div>
          </div>
        </div>

        {/* Info Banner: Zero-Input for Clinical Staff */}
        <div className="p-3.5 rounded-xl bg-teal-50/80 border border-teal-200/80 flex items-start gap-3">
          <Shield className="h-5 w-5 text-teal-700 shrink-0 mt-0.5" />
          <div className="text-xs text-teal-900 space-y-0.5">
            <p className="font-bold text-teal-950">
              Otomatisasi Penuh Tenaga Medis (Zero-Manual Input)
            </p>
            <p className="text-teal-800 leading-relaxed">
              Dokter dan staf klinis cukup melakukan pemeriksaan rekam medis. Seluruh pengiriman 
              <strong> 9 Resource FHIR R4</strong> (Encounter, 8 Vital Signs, Diagnosa ICD-10, Tindakan, Resep) 
              secara otomatis menggunakan token resmi dari server ini tanpa perlu input kredensial manual.
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

        {/* Optional Manual Override Accordion (For IT Admin Only) */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowManualOverride(!showManualOverride)}
            className="w-full p-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-slate-500" />
              <span>Pengaturan Kredensial Manual (Khusus Administrator IT)</span>
            </span>
            {showManualOverride ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showManualOverride && (
            <div className="p-4 bg-white border-t border-slate-200 space-y-3">
              <p className="text-[11px] text-slate-500">
                Gunakan formulir ini khusus jika Anda ingin menguji kredensial Client ID / Secret baru secara langsung.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="custom-client-id" className="text-[11px] font-bold text-slate-700">
                    Custom Client ID
                  </Label>
                  <Input
                    id="custom-client-id"
                    placeholder="Kosongkan untuk memakai konfigurasi default"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="font-mono text-xs h-8 bg-slate-50"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="custom-client-secret" className="text-[11px] font-bold text-slate-700">
                    Custom Client Secret
                  </Label>
                  <div className="relative">
                    <Input
                      id="custom-client-secret"
                      type={showSecret ? "text" : "password"}
                      placeholder="Kosongkan untuk memakai konfigurasi default"
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      className="font-mono text-xs h-8 pr-8 bg-slate-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="custom-org-id" className="text-[11px] font-bold text-slate-700">
                  Custom Organization ID
                </Label>
                <Input
                  id="custom-org-id"
                  placeholder="Kosongkan untuk memakai konfigurasi default"
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  className="font-mono text-xs h-8 bg-slate-50"
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-5 pt-0 flex items-center justify-between border-t border-slate-100 mt-2">
        <div className="text-[11px] text-slate-500">
          Mode Integrasi: <strong className="text-slate-700 font-semibold">Single-Tenant Rumah Sakit / Klinik Mandiri</strong>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAuthenticate(true, false)}
            disabled={isLoading}
            className="text-xs font-semibold gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Force Refresh Token</span>
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
                <span>Uji Koneksi (Ping SATUSEHAT)</span>
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
