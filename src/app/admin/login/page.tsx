"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  Building2,
  Lock,
  User,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowLeft,
  Server,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const { user, login, logout, isLoading } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    password?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessRedirecting, setIsSuccessRedirecting] = useState(false);
  const isSubmitLockedRef = useRef(false);

  // Jika sudah memiliki sesi login aktif sebagai super_admin, langsung arahkan ke /admin
  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === "super_admin") {
        router.replace("/admin");
      }
    }
  }, [user, isLoading, router]);

  const validateForm = (): boolean => {
    const errors: { username?: string; password?: string } = {};

    const cleanUser = username.trim();
    if (!cleanUser) {
      errors.username = "Username Super Admin wajib diisi.";
    }

    const cleanPass = password.trim();
    if (!cleanPass) {
      errors.password = "Kata sandi wajib diisi.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitLockedRef.current || isSubmitting || isSuccessRedirecting) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      isSubmitLockedRef.current = true;
      setIsSubmitting(true);

      const success = await login(username.trim(), password.trim());

      if (success) {
        // Cek apakah akun yang berhasil login memang memiliki peran super_admin
        if (success.role !== "super_admin") {
          toast.error("Akses Ditolak: Bukan Akun Super Admin", {
            description: "Akun ini tidak memiliki hak akses sebagai Vendor / Pengelola Portal Multi-Faskes.",
          });
          await logout();
          setIsSubmitting(false);
          isSubmitLockedRef.current = false;
          return;
        }

        setIsSuccessRedirecting(true);
        toast.success("Otentikasi Super Admin Berhasil", {
          description: "Mengarahkan ke Vendor Portal Console...",
        });

        setTimeout(() => {
          router.replace("/admin");
        }, 350);
      } else {
        setIsSubmitting(false);
        isSubmitLockedRef.current = false;
      }
    } catch {
      setIsSubmitting(false);
      isSubmitLockedRef.current = false;
    }
  };

  const isBusy = isSubmitting || isSuccessRedirecting || isLoading;

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans selection:bg-teal-500 selection:text-white">
      {/* Background Subtle Gradient Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-teal-100/50 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 h-72 w-72 rounded-full bg-emerald-100/40 blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3 relative z-10">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/20 ring-4 ring-white">
          <Shield className="h-7 w-7" />
        </div>
        <div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              MEDIXIA<span className="text-teal-600">.PORTAL</span>
            </h1>
            <Badge className="bg-teal-50 text-teal-700 border-teal-200 text-[10px] font-bold tracking-wide">
              SUPER ADMIN
            </Badge>
          </div>
          <p className="mt-1.5 text-xs text-slate-500 max-w-sm mx-auto font-medium">
            Konsol Manajemen Faskes Multi-Tenant &amp; SATUSEHAT Kemenkes RI
          </p>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div
          className={`bg-white py-8 px-6 sm:px-10 shadow-sm hover:shadow-md rounded-3xl border border-slate-200/80 space-y-6 transition-all duration-300 ${
            isSuccessRedirecting ? "border-teal-400 ring-2 ring-teal-500/20" : ""
          }`}
        >
          <div className="space-y-1 border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-teal-600" />
              <span>Otentikasi Vendor RME</span>
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Masuk dengan kredensial Super Admin untuk mengelola pendaftaran faskes dan gateway OAuth2 Kemenkes.
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Username Super Admin</span>
                {fieldErrors.username && (
                  <span className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.username}
                  </span>
                )}
              </Label>
              <div className="relative">
                <Input
                  type="text"
                  disabled={isBusy}
                  placeholder="superadmin"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (fieldErrors.username) {
                      setFieldErrors((prev) => ({ ...prev, username: undefined }));
                    }
                  }}
                  className={`h-10 text-xs pl-9 bg-slate-50/80 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all ${
                    fieldErrors.username ? "border-rose-400 focus:border-rose-500" : ""
                  }`}
                  autoComplete="username"
                  autoFocus
                />
                <User className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Kata Sandi Master</span>
                {fieldErrors.password && (
                  <span className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.password}
                  </span>
                )}
              </Label>
              <div className="relative">
                <Input
                  type="password"
                  disabled={isBusy}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  className={`h-10 text-xs pl-9 bg-slate-50/80 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all ${
                    fieldErrors.password ? "border-rose-400 focus:border-rose-500" : ""
                  }`}
                  autoComplete="current-password"
                />
                <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isBusy}
              className={`w-full h-10 text-xs font-bold gap-2 cursor-pointer shadow-md rounded-xl transition-all duration-200 mt-2 ${
                isSuccessRedirecting
                  ? "bg-teal-700 text-white"
                  : "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20"
              }`}
            >
              {isSuccessRedirecting ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-teal-100 animate-bounce" />
                  <span>Kredensial Valid! Mengarahkan ke Portal...</span>
                </>
              ) : isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Memverifikasi Otoritas Vendor...</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  <span>Masuk ke Konsol Super Admin</span>
                </>
              )}
            </Button>
          </form>

          {/* Quick Demo Credentials Info for Developer / Evaluator */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center justify-between text-slate-700 font-semibold">
              <span className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span>Akun Bawaan Vendor:</span>
              </span>
              <span className="text-[10px] text-teal-700 font-mono font-bold bg-teal-50 px-1.5 py-0.5 rounded">Dev / Sandbox</span>
            </div>
            <div className="flex items-center justify-between font-mono text-[10px] text-slate-600 pt-0.5">
              <span>Username: <strong className="text-slate-900 font-bold">superadmin</strong></span>
              <span>Password: <strong className="text-slate-900 font-bold">password123</strong> / <strong className="text-slate-900 font-bold">admin123</strong></span>
            </div>
          </div>

          {/* Footer: Link ke Portal Klinik */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-700 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Buka Portal Operasional SIMRS Klinik</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
