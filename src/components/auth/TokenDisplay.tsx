"use client";

import React, { useEffect, useState, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  ShieldCheck,
  Clock,
  Copy,
  Check,
  RefreshCw,
  Building,
  Key,
  ExternalLink,
  Code2,
  Terminal,
  AlertTriangle,
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
import { Badge } from "@/components/ui/badge";
import { AuthSession } from "@/lib/satusehat/types";
import { formatTimeRemaining } from "@/lib/utils";
import { toast } from "sonner";

interface TokenDisplayProps {
  session: AuthSession;
  onRefresh: () => void;
  onVerifyOrg: () => void;
  isRefreshing?: boolean;
}

export function TokenDisplay({
  session,
  onRefresh,
  onVerifyOrg,
  isRefreshing = false,
}: TokenDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [copiedBearer, setCopiedBearer] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    const remaining = Math.max(
      0,
      Math.floor((session.expiresAt - Date.now()) / 1000)
    );
    return remaining || session.expiresIn || 1800;
  });

  const cardRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const totalSeconds = session.expiresIn || 1800;

  // Real-time countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const left = Math.max(0, Math.floor((session.expiresAt - now) / 1000));
      setRemainingSeconds(left);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [session.expiresAt]);

  // GSAP animation for initial reveal and progress bar update
  useGSAP(
    () => {
      if (progressRef.current) {
        const percentage = Math.max(0, (remainingSeconds / totalSeconds) * 100);
        gsap.to(progressRef.current, {
          width: `${percentage}%`,
          duration: 0.5,
          ease: "power2.out",
        });
      }
    },
    { dependencies: [remainingSeconds, totalSeconds], scope: cardRef }
  );

  const percentage = Math.max(0, (remainingSeconds / totalSeconds) * 100);
  const isExpiringSoon = remainingSeconds <= 300 && remainingSeconds > 0;
  const isExpired = remainingSeconds === 0;

  const copyToClipboard = (text: string, isBearer = false) => {
    navigator.clipboard.writeText(text);
    if (isBearer) {
      setCopiedBearer(true);
      setTimeout(() => setCopiedBearer(false), 2000);
      toast.success("Header otentikasi Bearer berhasil disalin", {
        description: "Format `Authorization: Bearer <token>` siap digunakan.",
      });
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Access Token berhasil disalin");
    }
  };

  const formattedIssued = new Date(session.issuedAt).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const formattedExpires = new Date(session.expiresAt).toLocaleTimeString(
    "id-ID",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  );

  return (
    <Card
      ref={cardRef}
      className={`ehr-card p-0 shadow-sm border-slate-200 bg-white transition-all duration-300 ${
        isExpired
          ? "border-rose-300"
          : isExpiringSoon
          ? "border-amber-300"
          : "border-teal-300"
      }`}
    >
      <CardHeader className="p-5 pb-3 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-extrabold text-slate-900">
                  OAuth 2.0 Access Token
                </CardTitle>
                <Badge
                  variant={isExpired ? "destructive" : "production"}
                  className="text-[10px] uppercase font-bold tracking-wider"
                >
                  {isExpired ? "Expired" : "Active Token"}
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500">
                Bearer token resmi untuk autentikasi endpoint FHIR SATUSEHAT
              </CardDescription>
            </div>
          </div>

          {/* Expiry Badge */}
          <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Clock
              className={`h-4 w-4 ${
                isExpired
                  ? "text-rose-600 animate-pulse"
                  : isExpiringSoon
                  ? "text-amber-500 animate-pulse"
                  : "text-teal-600"
              }`}
            />
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold">
                Masa Berlaku
              </span>
              <span
                className={`font-mono text-sm font-bold ${
                  isExpired
                    ? "text-rose-600"
                    : isExpiringSoon
                    ? "text-amber-600"
                    : "text-teal-700"
                }`}
              >
                {formatTimeRemaining(remainingSeconds)}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3">
          <div
            ref={progressRef}
            className={`h-full rounded-full transition-colors ${
              isExpired
                ? "bg-rose-500"
                : isExpiringSoon
                ? "bg-amber-500"
                : "bg-teal-600"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {/* Token String Box */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-teal-600" />
              <span>Token String (Bearer)</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(`Bearer ${session.accessToken}`, true)
                }
                className="text-[11px] text-teal-700 hover:underline flex items-center gap-1 font-bold"
              >
                {copiedBearer ? (
                  <Check className="h-3 w-3 text-emerald-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                <span>Salin Bearer Header</span>
              </button>
            </div>
          </div>

          <div className="relative group">
            <div className="rounded-lg bg-slate-900 p-3 text-[11px] font-mono text-emerald-400 border border-slate-800 break-all select-all leading-relaxed max-h-24 overflow-y-auto">
              {session.accessToken}
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(session.accessToken)}
              className="absolute right-2 top-2 rounded-md bg-slate-800 p-1.5 text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-slate-700 transition-all"
              title="Salin Token"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Metadata Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 space-y-0.5">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">
              Token Type
            </span>
            <span className="font-bold text-slate-800">
              {session.tokenType}
            </span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 space-y-0.5">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">
              Issued Time
            </span>
            <span className="font-bold text-slate-800 font-mono">
              {formattedIssued}
            </span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 space-y-0.5">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">
              Expires At
            </span>
            <span className="font-bold text-slate-800 font-mono">
              {formattedExpires}
            </span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 space-y-0.5">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">
              Environment
            </span>
            <span className="font-bold text-teal-700 capitalize">
              {session.env}
            </span>
          </div>
        </div>

        {/* Warning if expiring */}
        {isExpiringSoon && !isExpired && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Token akan kedaluwarsa dalam beberapa menit. Lakukan refresh untuk memperpanjang sesi.
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-5 pt-0 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 mt-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="text-xs font-bold gap-1.5 border-slate-200"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>Refresh Token</span>
          </Button>
        </div>

        <Button
          type="button"
          variant="hospitalBlue"
          size="sm"
          onClick={onVerifyOrg}
          className="text-xs font-bold gap-1.5 shadow-sm"
        >
          <Building className="h-3.5 w-3.5" />
          <span>Verifikasi Organisasi FHIR</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
