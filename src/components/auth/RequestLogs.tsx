"use client";

import React, { useState } from "react";
import {
  Terminal,
  Trash2,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Clock,
  Send,
  Download,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export interface LogEntry {
  id: string;
  timestamp: string;
  title: string;
  url: string;
  method: string;
  status: number;
  latencyMs: number;
  requestBody: Record<string, unknown>;
  responseBody: unknown;
}

interface RequestLogsProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export function RequestLogs({ logs, onClearLogs }: RequestLogsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const copyCurl = (log: LogEntry) => {
    const curl = `curl -X ${log.method} "${log.url}" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET"`;
    navigator.clipboard.writeText(curl);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Perintah cURL berhasil disalin");
  };

  return (
    <Card className="ehr-card p-0 shadow-sm border-slate-200 bg-white">
      <CardHeader className="p-5 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
              <Terminal className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span>Developer Telemetry & HTTP Logs</span>
                <span className="font-mono text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {logs.length} events
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Inspeksi payload request, headers, latency, dan response SATUSEHAT secara real-time
              </CardDescription>
            </div>
          </div>

          {logs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearLogs}
              className="h-8 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Hapus Log</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-5">
        {logs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-2">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 border border-slate-200">
              <Clock className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-slate-700">
              Belum ada aktivitas HTTP
            </p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Lakukan generate Access Token atau uji verifikasi organisasi untuk melihat log request dan response telemetry di sini.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {logs.map((log) => {
              const isExpanded = expandedId === log.id;
              const isSuccess = log.status >= 200 && log.status < 300;

              return (
                <div
                  key={log.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-all overflow-hidden"
                >
                  {/* Log Header Row */}
                  <div
                    onClick={() => toggleExpand(log.id)}
                    className="flex items-center justify-between p-3 cursor-pointer select-none text-xs gap-2"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                      )}

                      <span
                        className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          log.method === "POST"
                            ? "bg-teal-100 text-teal-800 border border-teal-200"
                            : "bg-sky-100 text-sky-800 border border-sky-200"
                        }`}
                      >
                        {log.method}
                      </span>

                      <span className="font-bold text-slate-800 truncate">
                        {log.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[11px] text-slate-500 hidden sm:inline-block">
                        {log.latencyMs}ms
                      </span>

                      <span
                        className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isSuccess
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-rose-300 bg-rose-50 text-rose-700"
                        }`}
                      >
                        {log.status === 0 ? "NETWORK ERR" : `${log.status} ${isSuccess ? "OK" : "ERROR"}`}
                      </span>

                      <span className="font-mono text-[10px] text-slate-400 hidden md:inline-block">
                        {log.timestamp}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="border-t border-border/50 bg-slate-950 p-3.5 text-xs text-slate-200 font-mono space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] text-slate-400 truncate max-w-md">
                          <span className="text-teal-400">Endpoint:</span> {log.url}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyCurl(log);
                          }}
                          className="h-6 text-[10px] px-2 text-slate-300 hover:text-white bg-slate-900"
                        >
                          {copiedId === log.id ? (
                            <Check className="h-3 w-3 text-emerald-400 mr-1" />
                          ) : (
                            <Copy className="h-3 w-3 mr-1" />
                          )}
                          <span>Copy cURL</span>
                        </Button>
                      </div>

                      {/* Request Payload */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          Request Payload (Sanitized)
                        </span>
                        <div className="rounded bg-slate-900 p-2.5 text-[11px] text-slate-300 overflow-x-auto border border-slate-800">
                          <pre>{JSON.stringify(log.requestBody, null, 2)}</pre>
                        </div>
                      </div>

                      {/* Response Payload */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          Response Body
                        </span>
                        <div className="rounded bg-slate-900 p-2.5 text-[11px] text-emerald-400 overflow-x-auto max-h-48 overflow-y-auto border border-slate-800">
                          <pre>{JSON.stringify(log.responseBody, null, 2)}</pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
