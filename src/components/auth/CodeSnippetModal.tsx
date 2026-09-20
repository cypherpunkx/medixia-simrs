"use client";

import React, { useState } from "react";
import {
  Code2,
  Copy,
  Check,
  Terminal,
  FileCode,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { getSatusehatAuthUrl } from "@/lib/satusehat/config";
import {
  PatientProfile,
  OutpatientEncounter,
  SatusehatEnvironment,
} from "@/lib/satusehat/types";
import { toast } from "sonner";
import { generateFhirBundle } from "@/lib/satusehat/fhir-transformer";

interface CodeSnippetModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  env: SatusehatEnvironment;
  clientId?: string;
  patient?: PatientProfile | null;
  encounter?: OutpatientEncounter | null;
}

const DEFAULT_PATIENT_PLACEHOLDER: PatientProfile = {
  id: "P-TEMPLATE",
  nik: "3171012345670001",
  mrn: "RM-000001",
  name: "Pasien RME Faskes",
  gender: "male",
  birthDate: "1985-05-15",
  phone: "081234567890",
  address: "Jl. Kesehatan No. 1",
  bloodType: "O",
  allergies: [],
  emergencyContact: { name: "Keluarga", relation: "Keluarga", phone: "081234567890" },
  paymentPayer: "BPJS Kesehatan",
  satusehatConsent: "opt-in",
};

const DEFAULT_ENCOUNTER_PLACEHOLDER: OutpatientEncounter = {
  id: "ENC-TEMPLATE",
  patientId: "P-TEMPLATE",
  visitDate: new Date().toISOString(),
  clinicDepartment: "Poli Penyakit Dalam",
  doctorName: "dr. Rian Pratama, Sp.PD",
  doctorSip: "SIP.446/089/DS/Dinkes/2026",
  doctorIhsId: "N10009841",
  hospitalName: "RS Umum Daerah Sehat Sejahtera",
  hospitalOrgId: "10000004",
  chiefComplaint: "Pemeriksaan dan konsultasi rawat jalan",
  anamnesis: "Anamnesis pemeriksaan rawat jalan.",
  diagnoses: [
    {
      code: "I10",
      display: "Essential (primary) hypertension",
      patientFriendlyName: "Hipertensi Primer (Darah Tinggi)",
      type: "primary",
      clinicalStatus: "active",
    },
  ],
  procedures: [
    { code: "89.07", display: "General medical consultation", category: "Konsultasi" },
  ],
  prescriptions: [],
  followUpPlan: { instruction: "Kontrol rutin bila keluhan berlanjut." },
  dischargeDisposition: "Pulang Berobat Jalan",
  encounterStatus: "finished",
  consentStatus: "opt-in",
  syncStatus: "synced",
};

export function CodeSnippetModal({
  isOpen,
  onOpenChange,
  env,
  clientId = "YOUR_CLIENT_ID",
  patient,
  encounter,
}: CodeSnippetModalProps) {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  const authUrl = getSatusehatAuthUrl(env);
  const client_id = clientId || "YOUR_CLIENT_ID";

  const activePat = patient || DEFAULT_PATIENT_PLACEHOLDER;
  const activeEnc = encounter || DEFAULT_ENCOUNTER_PLACEHOLDER;

  const sampleFhirBundle = JSON.stringify(
    generateFhirBundle(activePat, activeEnc),
    null,
    2
  );

  const snippets: Record<string, string> = {
    fhir: sampleFhirBundle,
    curl: `curl -X POST "${authUrl}" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "client_id=${client_id}" \\
  -d "client_secret=YOUR_CLIENT_SECRET"`,

    typescript: `// Server-side TypeScript / Next.js 15
export async function getSatusehatToken() {
  const params = new URLSearchParams();
  params.append('client_id', process.env.SATUSEHAT_CLIENT_ID!);
  params.append('client_secret', process.env.SATUSEHAT_CLIENT_SECRET!);

  const response = await fetch('${authUrl}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(\`Auth failed: \${response.statusText}\`);
  }

  const data = await response.json();
  // data.access_token contains Bearer token (~30 mins)
  return data.access_token;
}`,

    axios: `// Node.js (Axios)
const axios = require('axios');
const qs = require('qs');

async function getAccessToken() {
  const payload = qs.stringify({
    client_id: '${client_id}',
    client_secret: process.env.SATUSEHAT_CLIENT_SECRET
  });

  const response = await axios.post('${authUrl}', payload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  return response.data.access_token;
}`,

    python: `# Python 3 (requests)
import os
import requests

def get_satusehat_token():
    url = "${authUrl}"
    payload = {
        "client_id": "${client_id}",
        "client_secret": os.environ.get("SATUSEHAT_CLIENT_SECRET")
    }
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }

    response = requests.post(url, data=payload, headers=headers)
    response.raise_for_status()
    return response.json().get("access_token")`,

    go: `// Go (net/http)
package main

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
)

type TokenResponse struct {
	AccessToken string \`json:"access_token"\`
	TokenType   string \`json:"token_type"\`
	ExpiresIn   string \`json:"expires_in"\`
}

func GetSatusehatToken(clientID, clientSecret string) (string, error) {
	apiURL := "${authUrl}"
	
	data := url.Values{}
	data.Set("client_id", clientID)
	data.Set("client_secret", clientSecret)

	req, err := http.NewRequest("POST", apiURL, strings.NewReader(data.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var res TokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", err
	}
	return res.AccessToken, nil
}`,

    php: `<?php
// PHP / Laravel Integration
function getSatusehatToken($clientId, $clientSecret) {
    $url = "${authUrl}";
    $postData = http_build_query([
        'client_id' => $clientId,
        'client_secret' => $clientSecret,
    ]);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/x-www-form-urlencoded'
    ]);

    $response = curl_exec($ch);
    curl_close($ch);

    $json = json_decode($response, true);
    return $json['access_token'] ?? null;
}`,
  };

  const copyCode = (key: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTab(key);
    setTimeout(() => setCopiedTab(null), 2000);
    toast.success("Contoh kode berhasil disalin");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-5 sm:p-6">
        <DialogHeader className="pb-2 border-b border-border/50 pr-12">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Code2 className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Payload FHIR & Snippet Integrasi SATUSEHAT
              </DialogTitle>
              <DialogDescription className="text-xs">
                Spesifikasi Bundle FHIR R4 & Kode siap pakai untuk Backend Faskes
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="fhir" className="w-full mt-2">
          <TabsList className="grid grid-cols-4 sm:grid-cols-7 h-9">
            <TabsTrigger value="fhir" className="text-xs font-bold text-teal-600">
              FHIR Bundle
            </TabsTrigger>
            <TabsTrigger value="curl" className="text-xs">
              cURL
            </TabsTrigger>
            <TabsTrigger value="typescript" className="text-xs">
              TypeScript
            </TabsTrigger>
            <TabsTrigger value="axios" className="text-xs">
              Node.js
            </TabsTrigger>
            <TabsTrigger value="python" className="text-xs">
              Python
            </TabsTrigger>
            <TabsTrigger value="go" className="text-xs">
              Golang
            </TabsTrigger>
            <TabsTrigger value="php" className="text-xs">
              PHP
            </TabsTrigger>
          </TabsList>

          {Object.entries(snippets).map(([key, code]) => (
            <TabsContent key={key} value={key} className="relative mt-3">
              <div className="relative rounded-xl bg-slate-950 p-4 font-mono text-xs text-emerald-400 border border-slate-800 overflow-x-auto max-h-[50vh]">
                <pre>{code}</pre>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyCode(key, code)}
                  className="absolute right-3 top-3 h-7 text-xs bg-slate-900 border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800 gap-1.5"
                >
                  {copiedTab === key ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedTab === key ? "Tersalin!" : "Salin Kode"}</span>
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
