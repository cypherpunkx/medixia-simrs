"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, Activity, Database, CheckCircle2, Clock } from "lucide-react";
import { SatusehatEnvironment } from "@/lib/satusehat/types";

interface EhrFooterProps {
  env: SatusehatEnvironment;
  hospitalName: string;
}

export function EhrFooter({ env, hospitalName }: EhrFooterProps) {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      setTime(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZoneName: "short",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="h-8 border-t border-slate-200 bg-white px-4 sm:px-6 flex items-center justify-between text-[11px] text-slate-500 shrink-0 font-medium z-40">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
          <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
          <span>{hospitalName || "RS Umum Daerah Sehat Sejahtera"}</span>
        </div>

        <div className="hidden md:flex items-center gap-2 text-slate-400">
          <span>•</span>
          <span className="text-slate-500">
            Standar: <strong>HL7 FHIR R4</strong> (Permenkes No. 24/2022)
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 font-mono text-[10px]">
        <div className="flex items-center gap-1 text-slate-600">
          <Clock className="h-3 w-3 text-slate-400" />
          <span>{time}</span>
        </div>
      </div>
    </footer>
  );
}
