"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Plus,
  ShieldCheck,
  Hospital,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  ArrowRight,
  Server,
  Layers,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import { FacilityProfile } from "@/lib/satusehat/types";
import { FacilityRegistrationModal } from "./FacilityRegistrationModal";

interface SuperAdminFacilityManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SuperAdminFacilityManagerModal({
  isOpen,
  onClose,
}: SuperAdminFacilityManagerModalProps) {
  const { user, facility, allFacilities, switchFacility, refreshFacilities } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [testingFacilityId, setTestingFacilityId] = useState<string | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // RBAC: Hanya akun super_admin (Vendor / Penyedia RME) yang berhak membuka konsol manajemen multi-faskes
  if (user && user.role !== "super_admin") {
    return null;
  }

  const filteredFacilities = allFacilities.filter((f) => {
    const q = searchQuery.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      f.satusehatOrgId.toLowerCase().includes(q) ||
      f.type.toLowerCase().includes(q)
    );
  });

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
        await refreshFacilities();
      } else {
        toast.error(`Koneksi Gagal: ${f.name}`, {
          description: data.error || "Gagal mendapatkan token OAuth2 SATUSEHAT Kemenkes.",
        });
        await refreshFacilities();
      }
    } catch {
      toast.error(`Gagal menguji koneksi ke ${f.name}`);
    } finally {
      setTestingFacilityId(null);
    }
  };

  const getFacilityTypeLabel = (type: string) => {
    switch (type) {
      case "rumah_sakit":
        return "Rumah Sakit";
      case "klinik_pratama":
        return "Klinik Pratama";
      case "klinik_utama":
        return "Klinik Utama";
      case "puskesmas":
        return "Puskesmas";
      case "praktik_mandiri":
        return "Praktik Mandiri";
      default:
        return type;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto p-0 rounded-2xl border-slate-200">
          {/* Header Visual */}
          <div className="bg-white p-6 border-b border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-600 shadow-xs">
                  <Server className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    <span>Manajemen Fasilitas Layanan (Multi-Tenant RME)</span>
                    <Badge className="bg-teal-50 text-teal-700 border-teal-200 text-[10px] font-bold">
                      SaaS Vendor Edition
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    Kelola faskes binaan, kredensial dinamis SATUSEHAT (AES-256), dan beralih tenant instan tanpa konfigurasi .env manual.
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setIsRegisterModalOpen(true)}
                  className="h-9 px-3.5 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-600/20 gap-1.5 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Daftarkan Faskes Baru</span>
                </Button>
              </div>
            </div>

            {/* Search & Stats Bar */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Cari nama faskes, Org ID, tipe..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-9 text-xs bg-slate-50/80 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl focus:bg-white focus:border-teal-500"
                />
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>Total Faskes Terdaftar: <strong className="text-slate-900">{allFacilities.length}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Faskes Aktif: <strong className="text-teal-700">{facility?.name || "-"}</strong></span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refreshFacilities()}
                  className="h-8 px-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                  title="Segarkan data faskes"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* List Faskes Content */}
          <div className="p-6 space-y-4 bg-slate-50/50">
            {filteredFacilities.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">Tidak ada fasilitas kesehatan yang cocok</p>
                <p className="text-xs text-slate-400 mt-1">Coba kata kunci pencarian lain atau daftarkan faskes baru.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {filteredFacilities.map((f) => {
                  const isCurrent = facility?.id === f.id;
                  const isTesting = testingFacilityId === f.id;

                  return (
                    <div
                      key={f.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCurrent
                          ? "bg-white border-teal-500 shadow-md ring-2 ring-teal-500/20"
                          : "bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Faskes Identity */}
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                              {f.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold bg-slate-50 border-slate-300 text-slate-700"
                            >
                              {getFacilityTypeLabel(f.type)}
                            </Badge>

                            {isCurrent && (
                              <Badge className="bg-teal-600 text-white text-[10px] font-bold gap-1 shadow-sm">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Tenant Aktif</span>
                              </Badge>
                            )}

                            {f.satusehatStatus === "connected" ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>SATUSEHAT Terhubung</span>
                              </Badge>
                            ) : f.satusehatStatus === "error" ? (
                              <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold gap-1">
                                <AlertCircle className="h-3 w-3 text-rose-500" />
                                <span>Koneksi Terputus</span>
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-bold">
                                Belum Terverifikasi
                              </Badge>
                            )}
                          </div>

                          {/* Technical Metadata */}
                          <div className="flex items-center gap-x-4 gap-y-1 text-xs text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1 font-mono">
                              <strong className="text-slate-700">Org ID:</strong> {f.satusehatOrgId}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="flex items-center gap-1">
                              <KeyRound className="h-3 w-3 text-slate-400" />
                              <strong className="text-slate-700">Client ID:</strong>{" "}
                              <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono">
                                {f.satusehatClientId || "Belum diisi (.env fallback)"}
                              </code>
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="flex items-center gap-1">
                              <strong className="text-slate-700">Secret:</strong>{" "}
                              <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono">
                                {f.satusehatClientSecretMasked || "-"}
                              </code>
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="flex items-center gap-1">
                              <Layers className="h-3 w-3 text-slate-400" />
                              <span>{f.departments?.length || 0} Poliklinik</span>
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestConnection(f)}
                            disabled={isTesting}
                            className="h-8 text-xs font-semibold rounded-xl bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {isTesting ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin text-teal-600" />
                                <span>Menguji...</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
                                <span>Uji SATUSEHAT</span>
                              </>
                            )}
                          </Button>

                          {!isCurrent ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                switchFacility(f.id);
                                toast.success(`Beralih ke Faskes: ${f.name}`);
                              }}
                              className="h-8 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white gap-1.5 cursor-pointer shadow-sm"
                            >
                              <span>Pilih Tenant</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled
                              className="h-8 text-xs font-bold rounded-xl bg-teal-50 text-teal-800 border border-teal-200 cursor-default"
                            >
                              Aktif Sekarang
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Embedded Registration Modal */}
      <FacilityRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={() => {
          setIsRegisterModalOpen(false);
          refreshFacilities();
        }}
      />
    </>
  );
}
