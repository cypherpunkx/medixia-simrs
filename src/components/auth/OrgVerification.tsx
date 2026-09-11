"use client";

import React, { useState } from "react";
import {
  Building2,
  CheckCircle2,
  XCircle,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileCode2,
  RefreshCw,
  Search,
  Stethoscope,
  Info,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FhirOrganization,
  OrgVerifyApiResponse,
  SatusehatEnvironment,
} from "@/lib/satusehat/types";
import { toast } from "sonner";

interface OrgVerificationProps {
  token: string;
  env: SatusehatEnvironment;
  defaultOrgId?: string;
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

export function OrgVerification({
  token,
  env,
  defaultOrgId = "",
  onLogRequest,
}: OrgVerificationProps) {
  const [orgId, setOrgId] = useState(defaultOrgId);
  const [isLoading, setIsLoading] = useState(false);
  const [orgData, setOrgData] = useState<FhirOrganization | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const handleVerify = async () => {
    if (!token) {
      toast.error("Token tidak ditemukan", {
        description: "Silakan buat Access Token terlebih dahulu.",
      });
      return;
    }

    if (!orgId.trim()) {
      toast.error("Validasi gagal", {
        description: "Harap masukkan Organization ID faskes / rumah sakit.",
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const startTime = performance.now();
      const response = await fetch("/api/satusehat/organization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          orgId: orgId.trim(),
          env,
        }),
      });

      const latencyMs = Math.round(performance.now() - startTime);
      const resData: OrgVerifyApiResponse = await response.json();

      onLogRequest({
        title: `FHIR GET Organization/${orgId.trim()}`,
        url: resData.telemetry?.targetUrl || `/api/satusehat/organization`,
        method: "GET",
        status: response.status,
        latencyMs: resData.telemetry?.latencyMs ?? latencyMs,
        requestBody: {
          org_id: orgId.trim(),
          env,
        },
        responseBody: resData,
      });

      if (resData.success && resData.data) {
        setOrgData(resData.data);
        toast.success("Organisasi terverifikasi", {
          description: `Data ${resData.data.name} berhasil dimuat.`,
        });
      } else {
        const errMsg =
          resData.error?.message || "Organisasi tidak ditemukan di SATUSEHAT.";
        setError(errMsg);
        toast.error("Verifikasi gagal", { description: errMsg });
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Kesalahan jaringan verifikasi.";
      setError(msg);
      toast.error("Kendala jaringan", { description: msg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="ehr-card p-0 shadow-sm border-slate-200 bg-white">
      <CardHeader className="p-5 pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-700 border border-sky-200">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-extrabold text-slate-900">
                Verifikasi Profil Rumah Sakit (FHIR)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Uji akses Bearer token ke resource FHIR HL7 R4 Organization
              </CardDescription>
            </div>
          </div>

          <Badge variant="fhir" className="text-[11px]">
            FHIR v1.0.0
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {/* Search Input */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="Masukkan ID Organisasi (Contoh: 10000004)"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="font-mono text-xs h-9 bg-slate-50 border-slate-200 focus:bg-white"
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            />
          </div>
          <Button
            type="button"
            variant="hospitalBlue"
            size="sm"
            onClick={handleVerify}
            disabled={isLoading || !token}
            className="text-xs font-bold gap-1.5 shrink-0"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Memeriksa...</span>
              </>
            ) : (
              <>
                <Search className="h-3.5 w-3.5" />
                <span>Verifikasi Faskes</span>
              </>
            )}
          </Button>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
            <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <span className="font-bold block">Gagal Memverifikasi:</span>
              <span className="text-[11px] text-rose-700">{error}</span>
            </div>
          </div>
        )}

        {/* Hospital Card Details */}
        {orgData && (
          <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 border border-teal-200">
                  <Stethoscope className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    {orgData.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                    <span>ID: {orgData.id}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant={orgData.active !== false ? "production" : "outline"}
                  className="text-[10px]"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {orgData.active !== false ? "Active Faskes" : "Inactive"}
                </Badge>

                <Dialog open={showRawJson} onOpenChange={setShowRawJson}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] px-2 gap-1 text-slate-600 hover:text-slate-900 border-slate-200"
                    >
                      <FileCode2 className="h-3 w-3" />
                      <span>FHIR JSON</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col bg-white">
                    <DialogHeader>
                      <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <FileCode2 className="h-4 w-4 text-teal-600" />
                        <span>FHIR Organization Resource Payload</span>
                      </DialogTitle>
                    </DialogHeader>
                    <div className="rounded-lg bg-slate-900 p-4 font-mono text-xs text-emerald-400 overflow-y-auto max-h-[60vh] border border-slate-800">
                      <pre>{JSON.stringify(orgData, null, 2)}</pre>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Hospital Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {/* Address */}
              <div className="flex items-start gap-2 rounded-lg bg-white p-3 border border-slate-200 shadow-2xs">
                <MapPin className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">
                    Alamat Faskes
                  </span>
                  <span className="text-slate-800 font-medium">
                    {orgData.address?.[0]?.line?.join(", ") ||
                      orgData.address?.[0]?.city ||
                      "Data alamat terdaftar di SATUSEHAT"}
                  </span>
                  {orgData.address?.[0]?.postalCode && (
                    <span className="text-slate-500 text-[11px] block">
                      Kode Pos: {orgData.address[0].postalCode}
                    </span>
                  )}
                </div>
              </div>

              {/* Type / Category */}
              <div className="flex items-start gap-2 rounded-lg bg-white p-3 border border-slate-200 shadow-2xs">
                <Building2 className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">
                    Kategori Organisasi
                  </span>
                  <span className="text-slate-800 font-bold">
                    {orgData.type?.[0]?.coding?.[0]?.display ||
                      "Healthcare Provider / Rumah Sakit"}
                  </span>
                  <span className="text-slate-500 text-[11px] block font-mono">
                    Code: {orgData.type?.[0]?.coding?.[0]?.code || "prov"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
