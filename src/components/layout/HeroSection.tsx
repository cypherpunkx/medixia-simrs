"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  ShieldCheck,
  Server,
  Lock,
  Layers,
  Sparkles,
  ArrowRight,
  Stethoscope,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Register useGSAP
gsap.registerPlugin(useGSAP);

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        defaults: { ease: "power3.out", clearProps: "all", overwrite: "auto" },
      });

      tl.from(".hero-badge", {
        y: -20,
        opacity: 0,
        duration: 0.6,
      })
        .from(
          ".hero-title",
          {
            y: 30,
            opacity: 0,
            duration: 0.8,
            stagger: 0.15,
          },
          "-=0.3"
        )
        .from(
          ".hero-desc",
          {
            y: 20,
            opacity: 0,
            duration: 0.7,
          },
          "-=0.4"
        )
        .from(
          ".hero-card",
          {
            y: 30,
            opacity: 0,
            duration: 0.6,
            stagger: 0.1,
          },
          "-=0.3"
        );
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden pt-8 pb-10 border-b border-border/40 bg-gradient-to-b from-teal-500/[0.04] via-transparent to-transparent"
    >
      {/* Background glow circle */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-96 w-[700px] rounded-full bg-teal-500/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 right-10 h-64 w-64 rounded-full bg-sky-500/10 blur-2xl" />

      <div className="container mx-auto px-4 sm:px-8 max-w-7xl relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          {/* Badge */}
          <div className="hero-badge inline-flex items-center justify-center">
            <Badge
              variant="kemenkes"
              className="px-3.5 py-1 text-xs font-medium shadow-sm gap-1.5 rounded-full"
            >
              <Sparkles className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              <span>Standar Integrasi RME Kemenkes RI</span>
            </Badge>
          </div>

          {/* Title */}
          <h1 className="hero-title text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            Portal Autentikasi{" "}
            <span className="bg-gradient-to-r from-teal-600 via-cyan-600 to-sky-600 bg-clip-text text-transparent">
              SATUSEHAT API
            </span>
          </h1>

          {/* Subtitle */}
          <p className="hero-desc text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Gateway pengujian autentikasi OAuth 2.0 resmi untuk Fasilitas Pelayanan Kesehatan
            (Rumah Sakit, Klinik, Lab, dan Praktik Mandiri). Dikelola secara aman dengan server-side token caching & FHIR validation.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-left">
            <div className="hero-card rme-glass rounded-xl p-3.5 border border-border/60 hover:border-teal-500/40 transition-colors">
              <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 mb-1">
                <Lock className="h-4 w-4" />
                <span className="text-xs font-bold">OAuth 2.0</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Client Credentials Grant RFC 6749
              </p>
            </div>

            <div className="hero-card rme-glass rounded-xl p-3.5 border border-border/60 hover:border-cyan-500/40 transition-colors">
              <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 mb-1">
                <Server className="h-4 w-4" />
                <span className="text-xs font-bold">Token Cache</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Auto-buffer & in-memory reuse
              </p>
            </div>

            <div className="hero-card rme-glass rounded-xl p-3.5 border border-border/60 hover:border-sky-500/40 transition-colors">
              <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 mb-1">
                <Stethoscope className="h-4 w-4" />
                <span className="text-xs font-bold">FHIR HL7 R4</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Verifikasi Resource Organisasi
              </p>
            </div>

            <div className="hero-card rme-glass rounded-xl p-3.5 border border-border/60 hover:border-emerald-500/40 transition-colors">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs font-bold">Zero-Leak</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Secret aman di sisi server
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
