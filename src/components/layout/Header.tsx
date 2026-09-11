"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  Activity,
  Moon,
  Sun,
  ExternalLink,
  ShieldCheck,
  Zap,
  User,
  Stethoscope,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SATUSEHAT_CONFIG } from "@/lib/satusehat/config";
import { SatusehatEnvironment } from "@/lib/satusehat/types";

export type PortalMode = "patient" | "doctor" | "developer";

interface HeaderProps {
  currentEnv: SatusehatEnvironment;
  onEnvChange: (env: SatusehatEnvironment) => void;
  isAuthenticated: boolean;
  activeMode: PortalMode;
  onModeChange: (mode: PortalMode) => void;
}

export function Header({
  currentEnv,
  onEnvChange,
  isAuthenticated,
  activeMode,
  onModeChange,
}: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [pingLatency, setPingLatency] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const checkPing = async (env: SatusehatEnvironment) => {
    try {
      const res = await fetch(`/api/satusehat/ping?env=${env}`);
      const data = await res.json();
      if (data.reachable) {
        setPingLatency(data.latencyMs);
      } else {
        setPingLatency(null);
      }
    } catch {
      setPingLatency(null);
    }
  };

  useEffect(() => {
    checkPing(currentEnv);
    const interval = setInterval(() => checkPing(currentEnv), 30000);
    return () => clearInterval(interval);
  }, [currentEnv]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 backdrop-blur-md transition-colors">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-8 max-w-7xl">
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/20">
            <Activity className="h-5 w-5 animate-heartbeat" />
            <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-background" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-foreground sm:text-lg">
                SATU<span className="text-teal-600 dark:text-teal-400">SEHAT</span>
              </span>
              <span className="rounded bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-teal-700 dark:text-teal-300 uppercase border border-teal-500/20">
                Resume Medis
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground hidden sm:inline-block">
              Rekam Medis Elektronik Rawat Jalan Kemenkes RI
            </span>
          </div>
        </div>

        {/* Center: Mode Switcher (Pasien vs Dokter vs Developer) */}
        <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-muted/60 p-1 text-xs shadow-inner">
          <button
            type="button"
            onClick={() => onModeChange("patient")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
              activeMode === "patient"
                ? "bg-background text-foreground shadow-sm font-bold text-teal-700 dark:text-teal-300"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Pasien</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange("doctor")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
              activeMode === "doctor"
                ? "bg-background text-foreground shadow-sm font-bold text-teal-700 dark:text-teal-300"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Stethoscope className="h-3.5 w-3.5" />
            <span>Dokter / Faskes</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange("developer")}
            className={`hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
              activeMode === "developer"
                ? "bg-background text-foreground shadow-sm font-bold text-teal-700 dark:text-teal-300"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Auth Gateway</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {/* Environment Pill */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground px-2 py-1 rounded-md border border-border/50 bg-background/50">
            <span
              className={`h-2 w-2 rounded-full ${
                currentEnv === "production" ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <span className="font-semibold uppercase text-[10px]">
              {currentEnv}
            </span>
            {pingLatency !== null && (
              <span className="font-mono text-emerald-600 dark:text-emerald-400 text-[11px]">
                ({pingLatency}ms)
              </span>
            )}
          </div>

          {/* Theme Toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Ganti Tema"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400 transition-all" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700 transition-all" />
              )}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
