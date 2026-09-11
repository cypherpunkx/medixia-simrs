"use client";

import React, { useState } from "react";
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
  onEnvChange: (env: SatusehatEnvironment) => void;
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
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<AuthApiResponse["error"] | null>(
    null
  );

  const handleFillDemo = () => {
    // Fill with informative demo format
    setClientId("SAMPLE_CLIENT_ID_KEMENKES_STAGING");
    setClientSecret("SAMPLE_CLIENT_SECRET_987654321");
    setOrgId("10000004"); // Demo RS Umum Pusat ID
    toast.info("Data contoh format Sandbox SATUSEHAT telah diisi.", {
      description: "Ganti dengan Client ID & Secret resmi fasilitas kesehatan Anda dari portal Kemenkes.",
    });
  };

  const handleAuthenticate = async (forceRefresh = false) => {
    setIsLoading(true);
    setLastError(null);

    const payload = {
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      env,
      orgId: orgId.trim(),
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
      const data: AuthApiResponse = await response.json();

      // Log request to telemetry
      onLogRequest({
        title: "Koneksi Akses SATUSEHAT",
        url: data.telemetry?.targetUrl || `/api/satusehat/auth`,
        method: data.telemetry?.method || "POST",
        status: response.status,
        latencyMs: data.telemetry?.latencyMs ?? latencyMs,
        requestBody: {
          client_id: maskSecret(clientId || "terkonfigurasi_di_server"),
          client_secret: "••••••••",
          env,
          org_id: orgId || undefined,
        },
        responseBody: data,
      });

      if (data.success && data.data) {
        toast.success("Koneksi berhasil", {
          description: `Sesi SATUSEHAT aktif (${data.data.expiresIn} detik).`,
        });
        onAuthSuccess(data.data, data);
      } else {
        const err = data.error || {
          message: "Gagal menghubungkan sistem ke SATUSEHAT Kemenkes.",
        };
        setLastError(err);
        toast.error("Koneksi gagal", {
          description: err.message,
        });
        onAuthError(err, data.telemetry);
      }
    } catch (err: unknown) {
      const errorObj = {
        message:
          err instanceof Error
            ? err.message
            : "Terjadi kendala jaringan saat menghubungi server SATUSEHAT.",
        code: "NETWORK_ERROR",
      };
      setLastError(errorObj);
      toast.error("Kendala jaringan", { description: errorObj.message });
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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-extrabold text-slate-900">
                Kredensial Integrasi SATUSEHAT
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Konfigurasi akses resmi fasilitas pelayanan kesehatan ke Kementerian Kesehatan RI
              </CardDescription>
            </div>
          </div>

          <Badge
            variant={env === "production" ? "production" : "staging"}
            className="text-[11px]"
          >
            {env === "production" ? "Mode Produksi" : "Mode Uji Coba (Sandbox)"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {/* Faskes Security Context Banner */}
        <div className="p-3 rounded-lg bg-slate-900 text-white border border-slate-800 flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-teal-400 shrink-0" />
            <span className="font-semibold text-slate-200">
              Kredensial Gateway Resmi Fasyankes (Kemenkes RI)
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] text-teal-300 border-teal-500/30 bg-teal-950/40">
            Terkoneksi TLS 1.3
          </Badge>
        </div>

        <div className="space-y-3.5">
          {/* Client ID */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="client-id"
                className="text-xs font-bold text-slate-700 flex items-center gap-1"
              >
                <span>Client ID Fasilitas Kesehatan</span>
                <span className="text-rose-500">*</span>
              </Label>
              <span className="text-[10px] text-slate-400 font-medium">
                Kredensial Resmi
              </span>
            </div>
            <Input
              id="client-id"
              placeholder="Masukkan Client ID dari Portal Kemenkes"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="font-mono text-xs h-9 bg-slate-50 border-slate-200 focus:bg-white"
            />
          </div>

          {/* Client Secret */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="client-secret"
                className="text-xs font-bold text-slate-700 flex items-center gap-1"
              >
                <span>Client Secret</span>
                <span className="text-rose-500">*</span>
              </Label>
              <span className="text-[10px] text-slate-400 font-medium">
                Kunci Rahasia
              </span>
            </div>
            <div className="relative">
              <Input
                id="client-secret"
                type={showSecret ? "text" : "password"}
                placeholder="Masukkan Client Secret Fasilitas Kesehatan"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="font-mono text-xs h-9 pr-9 bg-slate-50 border-slate-200 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                title={showSecret ? "Sembunyikan" : "Tampilkan"}
              >
                {showSecret ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Org ID (Optional) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="org-id"
                className="text-xs font-bold text-slate-700 flex items-center gap-1"
              >
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                <span>ID Organisasi Faskes / Rumah Sakit (Opsional)</span>
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[10px] text-teal-700 cursor-pointer flex items-center gap-0.5 font-semibold">
                      <HelpCircle className="h-3 w-3" />
                      <span>Info ID Organisasi</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs bg-slate-900 text-white border-none text-xs">
                    Nomor ID Organisasi Fasilitas Kesehatan dari Kemenkes RI (Contoh: 10000004).
                    Digunakan untuk verifikasi data profil Rumah Sakit / Klinik pada sistem SATUSEHAT.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="org-id"
              placeholder="Contoh: 10000004"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="font-mono text-xs h-9 bg-slate-50 border-slate-200 focus:bg-white"
            />
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
      </CardContent>

      <CardFooter className="p-5 pt-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleFillDemo}
          disabled={isLoading}
          className="text-xs text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1 text-teal-600" />
          <span>Isi Contoh Sandbox</span>
        </Button>

        <Button
          type="button"
          variant="medical"
          size="sm"
          onClick={() => handleAuthenticate(false)}
          disabled={isLoading}
          className="text-xs font-bold gap-1.5 shadow-sm"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Menghubungkan ke SATUSEHAT...</span>
            </>
          ) : (
            <>
              <span>Hubungkan ke SATUSEHAT</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
