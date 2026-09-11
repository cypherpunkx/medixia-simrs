"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  Activity,
  Heart,
  Thermometer,
  Percent,
  Scale,
  Wind,
  Stethoscope,
  Calendar,
} from "lucide-react";
import { VitalSigns } from "@/lib/satusehat/types";

interface VitalsCardProps {
  vitals?: VitalSigns;
  recordedDate?: string;
}

export function VitalsCard({ vitals, recordedDate }: VitalsCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!vitals || !vitals.systolic) return;
      gsap.fromTo(
        ".vital-box",
        { scale: 0.97, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.25,
          stagger: 0.03,
          ease: "power2.out",
          clearProps: "all",
          overwrite: "auto",
        }
      );
    },
    { dependencies: [vitals], scope: containerRef }
  );

  if (!vitals || !vitals.systolic || vitals.systolic === 0) {
    return (
      <div className="ehr-card p-6 sm:p-8 text-center space-y-3 bg-slate-50/50 border border-slate-200">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
          <Activity className="h-6 w-6" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h4 className="font-bold text-sm text-slate-800">
            Belum Ada Observasi Tanda-Tanda Vital
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Data observasi klinis (Tekanan Darah, Nadi, Suhu Tubuh, SpO2, Antropometri) belum diinputkan untuk kunjungan ini. Data akan otomatis tercatat setelah perawat triage atau dokter DPJP mengisi pemeriksaan fisik di formulir SOAP.
          </p>
        </div>
      </div>
    );
  }

  const getBpStatus = (sys: number, dia: number) => {
    if (sys < 120 && dia < 80) {
      return {
        label: "Normal / Optimal",
        color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      };
    } else if (sys <= 139 || dia <= 89) {
      return {
        label: "Pre-Hipertensi",
        color: "text-amber-800 bg-amber-50 border-amber-200",
      };
    } else {
      return {
        label: "Hipertensi",
        color: "text-rose-800 bg-rose-50 border-rose-200",
      };
    }
  };

  const bpStatus = getBpStatus(vitals.systolic, vitals.diastolic);

  const getHrStatus = (hr: number) => {
    if (hr >= 60 && hr <= 100) {
      return { label: "Normal (Reguler)", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    } else if (hr < 60) {
      return { label: "Bradikardia", color: "text-amber-800 bg-amber-50 border-amber-200" };
    } else {
      return { label: "Takikardia", color: "text-rose-800 bg-rose-50 border-rose-200" };
    }
  };

  const getTempStatus = (temp: number) => {
    if (temp >= 36.0 && temp <= 37.5) {
      return { label: "Afebris (Normal)", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    } else if (temp > 37.5) {
      return { label: "Febris (Demam)", color: "text-rose-800 bg-rose-50 border-rose-200" };
    } else {
      return { label: "Hipotermia", color: "text-sky-800 bg-sky-50 border-sky-200" };
    }
  };

  const getSpo2Status = (spo2: number) => {
    if (spo2 >= 95) {
      return { label: "Saturasi Baik", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    } else {
      return { label: "Hipoksia Ringan", color: "text-rose-800 bg-rose-50 border-rose-200" };
    }
  };

  const hrStatus = getHrStatus(vitals.heartRate);
  const tempStatus = getTempStatus(vitals.temperature);
  const spo2Status = getSpo2Status(vitals.oxygenSaturation);

  return (
    <div ref={containerRef} className="ehr-card p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
            <Activity className="h-4 w-4 animate-heartbeat" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">
              Tanda-Tanda Vital & Pemeriksaan Fisik
            </h3>
            <p className="text-[11px] text-slate-500">
              Observasi klinis terintegrasi standar LOINC SATUSEHAT Kemenkes
            </p>
          </div>
        </div>

        {recordedDate && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 font-mono font-medium">
            <Calendar className="h-3.5 w-3.5 text-teal-600" />
            <span>
              {new Date(recordedDate).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        )}
      </div>

      {/* Primary 4 Vitals Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Tekanan Darah */}
        <div className="vital-box rounded-xl p-3.5 border border-slate-200 bg-slate-50/70 space-y-2 card-interactive hover:border-teal-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-rose-500 shrink-0" />
              <span>Tekanan Darah</span>
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {vitals.systolic}/{vitals.diastolic}
            </span>
            <span className="text-[11px] text-slate-500 font-mono font-medium">mmHg</span>
          </div>
          <div className="pt-0.5">
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border transition-colors duration-200 ${bpStatus.color}`}>
              {bpStatus.label}
            </span>
          </div>
        </div>

        {/* 2. Detak Nadi */}
        <div className="vital-box rounded-xl p-3.5 border border-slate-200 bg-slate-50/70 space-y-2 card-interactive hover:border-teal-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-teal-600 shrink-0 animate-heartbeat" />
              <span>Detak Nadi</span>
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {vitals.heartRate}
            </span>
            <span className="text-[11px] text-slate-500 font-mono font-medium">bpm</span>
          </div>
          <div className="pt-0.5">
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border transition-colors duration-200 ${hrStatus.color}`}>
              {hrStatus.label}
            </span>
          </div>
        </div>

        {/* 3. Suhu Tubuh */}
        <div className="vital-box rounded-xl p-3.5 border border-slate-200 bg-slate-50/70 space-y-2 card-interactive hover:border-teal-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
              <Thermometer className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>Suhu Tubuh</span>
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {vitals.temperature}
            </span>
            <span className="text-[11px] text-slate-500 font-mono font-medium">°C</span>
          </div>
          <div className="pt-0.5">
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border transition-colors duration-200 ${tempStatus.color}`}>
              {tempStatus.label}
            </span>
          </div>
        </div>

        {/* 4. SpO2 */}
        <div className="vital-box rounded-xl p-3.5 border border-slate-200 bg-slate-50/70 space-y-2 card-interactive hover:border-teal-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5 text-sky-600 shrink-0" />
              <span>Saturasi SpO2</span>
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {vitals.oxygenSaturation}
            </span>
            <span className="text-[11px] text-slate-500 font-mono font-medium">%</span>
          </div>
          <div className="pt-0.5">
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border transition-colors duration-200 ${spo2Status.color}`}>
              {spo2Status.label}
            </span>
          </div>
        </div>
      </div>

      {/* Anthropometrics & Respiratory Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Berat Badan</span>
            <span className="font-extrabold text-slate-800 font-mono text-sm">{vitals.weightKg} kg</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Tinggi Badan</span>
            <span className="font-extrabold text-slate-800 font-mono text-sm">{vitals.heightCm} cm</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Body Mass Index (BMI)</span>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-teal-800 font-mono text-sm">{vitals.bmi || 23.0}</span>
              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                Ideal
              </span>
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Laju Pernapasan (RR)</span>
            <div className="flex items-center gap-1.5">
              <Wind className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-extrabold text-slate-800 font-mono text-sm">{vitals.respiratoryRate} x/menit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Physical Exam Doctor Notes */}
      {vitals.physicalExamNotes && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 text-slate-700 font-bold">
            <Stethoscope className="h-3.5 w-3.5 text-teal-600" />
            <span className="text-[11px] uppercase tracking-wide">Catatan Pemeriksaan Fisik (Head-to-Toe)</span>
          </div>
          <p className="text-slate-700 leading-relaxed font-medium pl-5">
            {vitals.physicalExamNotes}
          </p>
        </div>
      )}
    </div>
  );
}
