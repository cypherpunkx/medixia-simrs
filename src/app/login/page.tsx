"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  KeyRound,
  Lock,
  User,
  Shield,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const { user, login, isLoading } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    password?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessRedirecting, setIsSuccessRedirecting] = useState(false);
  const isSubmitLockedRef = useRef(false);

  // Jika user sudah memiliki sesi login aktif, arahkan sesuai peran (Super Admin ke /admin, lainnya ke /)
  React.useEffect(() => {
    if (!isLoading && user) {
      if (user.role === "super_admin") {
        router.replace("/admin");
      } else {
        router.replace("/");
      }
    }
  }, [user, isLoading, router]);

  const validateForm = (): boolean => {
    const errors: { username?: string; password?: string } = {};

    const cleanUser = username.trim();
    if (!cleanUser) {
      errors.username = "Username atau NIP nakes wajib diisi.";
    } else if (cleanUser.length < 2) {
      errors.username = "Username minimal 2 karakter.";
    }

    const cleanPass = password.trim();
    if (!cleanPass) {
      errors.password = "Kata sandi wajib diisi.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent rapid multiple clicks synchronously
    if (isSubmitLockedRef.current || isSubmitting || isSuccessRedirecting) {
      return;
    }

    if (!validateForm()) {
      toast.error("Mohon lengkapi formulir login.");
      return;
    }

    try {
      isSubmitLockedRef.current = true;
      setIsSubmitting(true);

      const loggedInUser = await login(username.trim(), password.trim());

      if (loggedInUser) {
        setIsSuccessRedirecting(true);
        // Arahkan super_admin ke Vendor Portal (/admin), dan role lain ke SIMRS Klinik (/)
        const destination = loggedInUser.role === "super_admin" ? "/admin" : "/";
        setTimeout(() => {
          router.replace(destination);
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

  // Jika sedang memeriksa sesi atau sudah login, render tampilan pengalihan yang bersih
  if (!isLoading && user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center space-y-3">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md">
          <Activity className="h-6 w-6 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
          <span>Sesi aktif terdeteksi. Mengarahkan ke Dashboard SIMRS...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-800 relative overflow-hidden">
      {/* Top Micro Loading / Progress Bar */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 h-[3px] bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-600 transition-all duration-300 ${
          isBusy ? "opacity-100 animate-pulse" : "opacity-0"
        }`}
      />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3 animate-in fade-in slide-in-from-top-3 duration-500">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20 ring-4 ring-teal-50">
          <Activity className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            MEDIXIA <span className="text-teal-600">SIMRS</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Sistem Informasi Manajemen Rumah Sakit &amp; Klinik Terpadu SATUSEHAT Kemenkes RI
          </p>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div
          className={`bg-white py-8 px-6 sm:px-10 shadow-sm rounded-3xl border border-slate-200/80 space-y-6 transition-all duration-300 ${
            isSuccessRedirecting ? "login-card-success border-teal-400 ring-2 ring-teal-500/20" : ""
          }`}
        >
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">Masuk ke Sistem</h2>
            <p className="text-xs text-slate-500">
              Gunakan akun resmi Nakes atau Administrator Faskes Anda.
            </p>
          </div>

          {/* Form Login */}
          <form onSubmit={handleStandardLogin} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Username / NIP Nakes</span>
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
                  placeholder="Masukkan username akun Anda..."
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (fieldErrors.username) {
                      setFieldErrors((prev) => ({ ...prev, username: undefined }));
                    }
                  }}
                  className={`h-10 text-xs pl-9 bg-slate-50/50 rounded-xl transition-all ${
                    fieldErrors.username
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
                      : "border-slate-200 focus:bg-white focus:border-teal-600"
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                  autoComplete="username"
                  autoFocus
                />
                <User className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Kata Sandi / Password</span>
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
                  placeholder="Masukkan kata sandi..."
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  className={`h-10 text-xs pl-9 bg-slate-50/50 rounded-xl transition-all ${
                    fieldErrors.password
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
                      : "border-slate-200 focus:bg-white focus:border-teal-600"
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                  autoComplete="current-password"
                />
                <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <Button
              type="submit"
              variant="medical"
              disabled={isBusy}
              className={`w-full h-10 text-xs font-bold gap-2 cursor-pointer shadow-sm rounded-xl transition-all duration-200 mt-2 btn-press ${
                isSuccessRedirecting
                  ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                  : "bg-teal-600 hover:bg-teal-700 text-white"
              } disabled:opacity-75 disabled:cursor-not-allowed`}
            >
              {isSuccessRedirecting ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-200 animate-bounce" />
                  <span>Login Berhasil! Mengalihkan ke Dashboard...</span>
                </>
              ) : isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Memverifikasi Kredensial...</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  <span>Masuk ke Sistem SIMRS</span>
                </>
              )}
            </Button>
          </form>

          {/* Standard Footer Compliance */}
          <div className="text-center pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-slate-400 text-[11px]">
            <img
              src="/satusehat-default-logo.svg"
              alt="SATUSEHAT"
              className="h-3.5 w-3.5 object-contain shrink-0"
            />
            <span>Permenkes No. 24 Tahun 2022 • Standar HL7 FHIR SATUSEHAT</span>
          </div>
        </div>

        {/* Vendor Portal Link */}
        <div className="mt-4 text-center">
          <Link
            href="/admin/login"
            className="text-[11px] text-slate-400 hover:text-slate-600 font-medium inline-flex items-center gap-1.5 transition-colors"
          >
            <Shield className="h-3 w-3 text-slate-400" />
            <span>Portal Khusus Vendor / Penyedia RME</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

