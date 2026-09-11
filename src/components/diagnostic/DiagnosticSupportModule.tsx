"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FlaskConical,
  Radio,
  Plus,
  Trash2,
  ChevronDown,
  Check,
  Search,
  X,
  Sparkles,
} from "lucide-react";
import {
  PatientProfile,
  OutpatientEncounter,
  DiagnosticOrder,
  LabResult,
  RadiologyResult,
} from "@/lib/satusehat/types";
import { toast } from "sonner";

interface DiagnosticSupportModuleProps {
  patient: PatientProfile;
  encounter: OutpatientEncounter;
  onUpdateEncounter: (updated: OutpatientEncounter) => void;
}

const PRESET_LAB_TESTS = [
  { code: "58410-2", name: "Darah Lengkap (CBC)", category: "Hematologi", unit: "-", refRange: "Normal" },
  { code: "1558-6", name: "Glukosa Darah Puasa (GDP)", category: "Kimia Darah", unit: "mg/dL", refRange: "70 - 100" },
  { code: "4548-4", name: "HbA1c (Glikemik Terkontrol)", category: "Kimia Darah", unit: "%", refRange: "< 5.7" },
  { code: "2093-3", name: "Kolesterol Total", category: "Profil Lipid", unit: "mg/dL", refRange: "< 200" },
  { code: "2085-9", name: "Kolesterol HDL", category: "Profil Lipid", unit: "mg/dL", refRange: "> 40" },
  { code: "13457-7", name: "Kolesterol LDL", category: "Profil Lipid", unit: "mg/dL", refRange: "< 100" },
  { code: "2571-8", name: "Trigliserida", category: "Profil Lipid", unit: "mg/dL", refRange: "< 150" },
  { code: "2160-0", name: "Kreatinin Serum", category: "Faal Ginjal", unit: "mg/dL", refRange: "0.7 - 1.3" },
  { code: "3094-0", name: "Ureum / BUN", category: "Faal Ginjal", unit: "mg/dL", refRange: "10 - 50" },
  { code: "1920-8", name: "SGOT / AST", category: "Faal Hati", unit: "U/L", refRange: "0 - 35" },
  { code: "1742-6", name: "SGPT / ALT", category: "Faal Hati", unit: "U/L", refRange: "0 - 45" },
  { code: "24356-8", name: "Urinalisis Lengkap", category: "Urinalisis", unit: "-", refRange: "Normal" },
];

const PRESET_RAD_TESTS: Array<{
  code: string;
  name: string;
  modality: "X-Ray" | "CT-Scan" | "USG" | "MRI" | "EKG";
}> = [
  { code: "36554-4", name: "Foto Thorax PA / AP", modality: "X-Ray" },
  { code: "11524-6", name: "EKG 12 Sandapan", modality: "EKG" },
  { code: "24627-2", name: "USG Abdomen Lengkap", modality: "USG" },
  { code: "24725-4", name: "CT-Scan Kepala Non-Kontras", modality: "CT-Scan" },
];

export function DiagnosticSupportModule({
  patient,
  encounter,
  onUpdateEncounter,
}: DiagnosticSupportModuleProps) {
  const [activeTab, setActiveTab] = useState<"order" | "lab" | "rad">("order");
  const [selectedCategory, setSelectedCategory] = useState<"laboratory" | "radiology">("laboratory");
  const [selectedPreset, setSelectedPreset] = useState(PRESET_LAB_TESTS[0].code);
  const [priority, setPriority] = useState<"routine" | "urgent" | "stat">("routine");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTest, setSearchTest] = useState("");
  const [customTest, setCustomTest] = useState<{ code: string; name: string } | null>(null);
  const [isAddingOrder, setIsAddingOrder] = useState(false);

  // Lab Form State
  const [isAddingLab, setIsAddingLab] = useState(false);
  const [isLabPresetOpen, setIsLabPresetOpen] = useState(false);
  const [searchLabPreset, setSearchLabPreset] = useState("");
  const [labForm, setLabForm] = useState<{
    testCode: string;
    testName: string;
    category: string;
    value: string;
    unit: string;
    referenceRange: string;
    flag: "normal" | "high" | "low" | "critical";
    performer: string;
  }>({
    testCode: PRESET_LAB_TESTS[0].code,
    testName: PRESET_LAB_TESTS[0].name,
    category: PRESET_LAB_TESTS[0].category,
    value: "",
    unit: PRESET_LAB_TESTS[0].unit,
    referenceRange: PRESET_LAB_TESTS[0].refRange,
    flag: "normal",
    performer: "Laboratorium Patologi RSUD",
  });

  // Rad Form State
  const [isAddingRad, setIsAddingRad] = useState(false);
  const [isRadPresetOpen, setIsRadPresetOpen] = useState(false);
  const [searchRadPreset, setSearchRadPreset] = useState("");
  const [radForm, setRadForm] = useState<{
    examCode: string;
    examName: string;
    modality: "X-Ray" | "CT-Scan" | "USG" | "MRI" | "EKG";
    findings: string;
    conclusion: string;
    radiologistName: string;
  }>({
    examCode: PRESET_RAD_TESTS[0].code,
    examName: PRESET_RAD_TESTS[0].name,
    modality: PRESET_RAD_TESTS[0].modality,
    findings: "",
    conclusion: "",
    radiologistName: "dr. Hendra Pratama, Sp.Rad",
  });

  const currentPresetList =
    selectedCategory === "laboratory" ? PRESET_LAB_TESTS : PRESET_RAD_TESTS;
  const filteredPresetList = searchTest.trim()
    ? currentPresetList.filter(
        (t) =>
          t.name.toLowerCase().includes(searchTest.toLowerCase()) ||
          t.code.toLowerCase().includes(searchTest.toLowerCase())
      )
    : currentPresetList;
  const currentActivePreset =
    (customTest && customTest.code === selectedPreset ? customTest : null) ||
    currentPresetList.find((t) => t.code === selectedPreset) ||
    currentPresetList[0];

  const filteredLabPresets = searchLabPreset.trim()
    ? PRESET_LAB_TESTS.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLabPreset.toLowerCase()) ||
          t.code.toLowerCase().includes(searchLabPreset.toLowerCase()) ||
          t.category.toLowerCase().includes(searchLabPreset.toLowerCase())
      )
    : PRESET_LAB_TESTS;

  const filteredRadPresets = searchRadPreset.trim()
    ? PRESET_RAD_TESTS.filter(
        (t) =>
          t.name.toLowerCase().includes(searchRadPreset.toLowerCase()) ||
          t.code.toLowerCase().includes(searchRadPreset.toLowerCase()) ||
          t.modality.toLowerCase().includes(searchRadPreset.toLowerCase())
      )
    : PRESET_RAD_TESTS;

  const diagnosticOrders = encounter.diagnosticOrders || [];
  const labResults = encounter.labResults || [];
  const radiologyResults = encounter.radiologyResults || [];

  // Order Submission (ServiceRequest)
  const handleAddOrder = (e: React.FormEvent) => {
    e.preventDefault();
    let testCode = selectedPreset;
    let testName = "";

    if (customTest && customTest.code === selectedPreset) {
      testName = customTest.name;
    } else if (selectedCategory === "laboratory") {
      const found = PRESET_LAB_TESTS.find((t) => t.code === selectedPreset);
      testName = found ? found.name : "Pemeriksaan Laboratorium";
    } else {
      const found = PRESET_RAD_TESTS.find((t) => t.code === selectedPreset);
      testName = found ? found.name : "Pemeriksaan Radiologi";
    }

    const newOrder: DiagnosticOrder = {
      id: `ORD-${Date.now().toString().slice(-6)}`,
      testCode,
      testName,
      category: selectedCategory,
      status: "ordered",
      priority,
      orderDate: new Date().toISOString(),
      doctorName: encounter.doctorName,
      clinicalNotes: clinicalNotes || `Permintaan pemeriksaan penunjang untuk pasien ${patient.name}`,
    };

    const updatedOrders = [...diagnosticOrders, newOrder];

    onUpdateEncounter({
      ...encounter,
      diagnosticOrders: updatedOrders,
    });

    setIsAddingOrder(false);
    setClinicalNotes("");
    toast.success(`Order ${testName} berhasil dikirim ke instalasi penunjang!`);
  };

  const handleDeleteOrder = (orderId: string) => {
    const updated = diagnosticOrders.filter((o) => o.id !== orderId);
    onUpdateEncounter({
      ...encounter,
      diagnosticOrders: updated,
    });
    toast.info("Order pemeriksaan dihapus");
  };

  // Lab Results Submission (FHIR Observation / DiagnosticReport)
  const handleSaveLabResult = (e: React.FormEvent) => {
    e.preventDefault();
    if (!labForm.testName.trim()) {
      toast.error("Nama pemeriksaan laboratorium wajib diisi");
      return;
    }
    if (!labForm.value.trim()) {
      toast.error("Nilai hasil pemeriksaan laboratorium wajib diisi");
      return;
    }

    const newLab: LabResult = {
      id: `LAB-${Date.now().toString().slice(-5)}`,
      testCode: labForm.testCode.trim() || "MISC-LAB",
      testName: labForm.testName.trim(),
      category: labForm.category.trim() || "Laboratorium Umum",
      value: isNaN(Number(labForm.value)) ? labForm.value.trim() : Number(labForm.value.trim()),
      unit: labForm.unit.trim() || "-",
      referenceRange: labForm.referenceRange.trim() || "Normal",
      flag: labForm.flag,
      resultDate: new Date().toISOString(),
      performer: labForm.performer.trim() || "Laboratorium RSUD",
    };

    const updated = [...labResults, newLab];
    onUpdateEncounter({
      ...encounter,
      labResults: updated,
    });

    setIsAddingLab(false);
    setLabForm({
      testCode: PRESET_LAB_TESTS[0].code,
      testName: PRESET_LAB_TESTS[0].name,
      category: PRESET_LAB_TESTS[0].category,
      value: "",
      unit: PRESET_LAB_TESTS[0].unit,
      referenceRange: PRESET_LAB_TESTS[0].refRange,
      flag: "normal",
      performer: "Laboratorium Patologi RSUD",
    });
    toast.success(`Hasil laboratorium ${newLab.testName} berhasil disimpan!`);
  };

  const handleDeleteLabResult = (labId: string) => {
    const updated = labResults.filter((l) => l.id !== labId);
    onUpdateEncounter({
      ...encounter,
      labResults: updated,
    });
    toast.info("Hasil laboratorium dihapus");
  };

  // Radiology Results Submission (FHIR DiagnosticReport RAD)
  const handleSaveRadResult = (e: React.FormEvent) => {
    e.preventDefault();
    if (!radForm.examName.trim()) {
      toast.error("Nama pemeriksaan radiologi wajib diisi");
      return;
    }
    if (!radForm.findings.trim() || !radForm.conclusion.trim()) {
      toast.error("Deskripsi temuan klinis dan kesimpulan wajib diisi");
      return;
    }

    const newRad: RadiologyResult = {
      id: `RAD-${Date.now().toString().slice(-5)}`,
      examCode: radForm.examCode.trim() || "MISC-RAD",
      examName: radForm.examName.trim(),
      modality: radForm.modality,
      findings: radForm.findings.trim(),
      conclusion: radForm.conclusion.trim(),
      radiologistName: radForm.radiologistName.trim() || "dr. Hendra Pratama, Sp.Rad",
      resultDate: new Date().toISOString(),
    };

    const updated = [...radiologyResults, newRad];
    onUpdateEncounter({
      ...encounter,
      radiologyResults: updated,
    });

    setIsAddingRad(false);
    setRadForm({
      examCode: PRESET_RAD_TESTS[0].code,
      examName: PRESET_RAD_TESTS[0].name,
      modality: PRESET_RAD_TESTS[0].modality,
      findings: "",
      conclusion: "",
      radiologistName: "dr. Hendra Pratama, Sp.Rad",
    });
    toast.success(`Hasil ekspertise radiologi ${newRad.examName} berhasil disimpan!`);
  };

  const handleDeleteRadResult = (radId: string) => {
    const updated = radiologyResults.filter((r) => r.id !== radId);
    onUpdateEncounter({
      ...encounter,
      radiologyResults: updated,
    });
    toast.info("Hasil ekspertise radiologi dihapus");
  };

  return (
    <Card className="border-border/60 bg-white shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/40 bg-slate-50/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center font-bold shadow-2xs shrink-0">
              <FlaskConical className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-sm font-bold text-slate-900 leading-tight">
                  Penunjang Diagnostik (Lab &amp; Radiologi)
                </CardTitle>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-teal-50 text-teal-800 border border-teal-200/80 whitespace-nowrap shrink-0 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                  Terintegrasi Lab &amp; Radiologi
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Permintaan dan pencatatan hasil pemeriksaan terstandar LOINC Kemenkes RI
              </p>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shadow-2xs self-start lg:self-auto shrink-0 overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab("order")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap btn-press cursor-pointer ${
                activeTab === "order"
                  ? "bg-white text-teal-900 shadow-2xs font-bold border border-slate-200/70"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <Plus className="h-3.5 w-3.5 text-teal-600" />
              <span>Order Baru</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "order"
                    ? "bg-teal-100 text-teal-800"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {diagnosticOrders.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("lab")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap btn-press cursor-pointer ${
                activeTab === "lab"
                  ? "bg-white text-teal-900 shadow-2xs font-bold border border-slate-200/70"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <FlaskConical className="h-3.5 w-3.5 text-teal-600" />
              <span>Hasil Lab</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "lab"
                    ? "bg-teal-100 text-teal-800"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {labResults.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("rad")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap btn-press cursor-pointer ${
                activeTab === "rad"
                  ? "bg-white text-teal-900 shadow-2xs font-bold border border-slate-200/70"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <Radio className="h-3.5 w-3.5 text-blue-600" />
              <span>Hasil Radiologi</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "rad"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {radiologyResults.length}
              </span>
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* TAB 1: ORDER BARU */}
        {activeTab === "order" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5 text-teal-600" />
                  <span>Daftar & Permintaan Pemeriksaan Penunjang (Order Elektronik)</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Permintaan pemeriksaan laboratorium dan radiologi terstandar LOINC & SATUSEHAT (FHIR ServiceRequest)
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-800 border-teal-200">
                  {diagnosticOrders.length} Order Aktif
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsAddingOrder(!isAddingOrder)}
                  className="h-8 text-xs font-bold gap-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg shadow-2xs btn-press cursor-pointer"
                >
                  {isAddingOrder ? (
                    <>
                      <X className="h-3.5 w-3.5" />
                      <span>Batal Input</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      <span>+ Buat Permintaan Baru</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Form Input Permintaan Baru (Full Width 2-Column Responsive Layout) */}
            {isAddingOrder && (
              <form
                onSubmit={handleAddOrder}
                className="bg-teal-50/40 border border-teal-200/80 p-4 sm:p-5 rounded-2xl space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-200 shadow-2xs"
              >
                <div className="flex items-center justify-between pb-2 border-b border-teal-200/60">
                  <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                    Formulir Permintaan Pemeriksaan Penunjang (ServiceRequest)
                  </span>
                  <span className="text-[10px] text-teal-700 font-mono">
                    DPJP: {encounter.doctorName}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Kolom Kiri: Instalasi & Pemeriksaan */}
                  <div className="space-y-3.5">
                    {/* Category Selector */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Jenis Instalasi Penunjang:
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategory("laboratory");
                            setSelectedPreset(PRESET_LAB_TESTS[0].code);
                          }}
                          className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-2 transition-all btn-press cursor-pointer ${
                            selectedCategory === "laboratory"
                              ? "bg-teal-700 text-white border-teal-800 shadow-2xs"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <FlaskConical className="h-3.5 w-3.5" />
                          <span>Laboratorium</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategory("radiology");
                            setSelectedPreset(PRESET_RAD_TESTS[0].code);
                          }}
                          className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-2 transition-all btn-press cursor-pointer ${
                            selectedCategory === "radiology"
                              ? "bg-teal-700 text-white border-teal-800 shadow-2xs"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <Radio className="h-3.5 w-3.5" />
                          <span>Radiologi & EKG</span>
                        </button>
                      </div>
                    </div>

                    {/* Preset Test Selection */}
                    <div className="space-y-1.5 relative">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs font-bold text-slate-800">
                          Pilih Pemeriksaan Penunjang:
                        </Label>
                        {"category" in (currentActivePreset || {}) && (currentActivePreset as any)?.category && (
                          <span className="text-[10px] font-semibold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded-md border border-teal-200 shadow-2xs whitespace-nowrap shrink-0">
                            {(currentActivePreset as any).category}
                          </span>
                        )}
                        {"modality" in (currentActivePreset || {}) && (currentActivePreset as any)?.modality && (
                          <span className="text-[10px] font-semibold text-blue-800 bg-blue-100/70 px-2 py-0.5 rounded-md border border-blue-200 shadow-2xs whitespace-nowrap shrink-0">
                            Modalitas: {(currentActivePreset as any).modality}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen((prev) => !prev)}
                        className="w-full text-left text-xs rounded-xl border border-slate-300 bg-white p-2.5 text-slate-900 hover:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all shadow-2xs flex items-center justify-between gap-2 cursor-pointer btn-press"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="font-mono text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 shrink-0">
                            {currentActivePreset?.code}
                          </span>
                          <span className="font-bold text-slate-900 truncate">
                            {currentActivePreset?.name}
                          </span>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                            isDropdownOpen ? "rotate-180 text-teal-600" : ""
                          }`}
                        />
                      </button>

                      {isDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={() => setIsDropdownOpen(false)}
                          />
                          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-100 p-1 animate-in fade-in-0 zoom-in-95">
                            <div className="p-1.5 sticky top-0 bg-white z-10">
                              <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                <input
                                  type="text"
                                  value={searchTest}
                                  onChange={(e) => setSearchTest(e.target.value)}
                                  placeholder="Cari nama tes atau kode LOINC..."
                                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>

                            <div className="py-1 space-y-0.5">
                              {filteredPresetList.map((t) => {
                                const isSelected = selectedPreset === t.code;
                                return (
                                  <button
                                    key={t.code}
                                    type="button"
                                    onClick={() => {
                                      setSelectedPreset(t.code);
                                      setIsDropdownOpen(false);
                                      setSearchTest("");
                                    }}
                                    className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                                      isSelected
                                        ? "bg-teal-50 border border-teal-200 text-teal-950 font-bold"
                                        : "hover:bg-slate-50 text-slate-800"
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <span className="font-semibold block truncate">
                                        {t.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="font-mono text-[10px] font-bold text-teal-800 bg-white px-1.5 py-0.5 rounded border border-teal-200">
                                        {t.code}
                                      </span>
                                      {isSelected && (
                                        <Check className="h-3.5 w-3.5 text-teal-600" />
                                      )}
                                    </div>
                                  </button>
                                );
                              })}

                              {searchTest.trim() && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const code = `CUSTOM-${Date.now().toString().slice(-4)}`;
                                    setCustomTest({ code, name: searchTest.trim() });
                                    setSelectedPreset(code);
                                    setIsDropdownOpen(false);
                                    setSearchTest("");
                                  }}
                                  className="w-full text-left p-2 rounded-lg text-xs bg-teal-50/80 hover:bg-teal-100 text-teal-950 border border-dashed border-teal-300 font-semibold flex items-center justify-between gap-2 mt-1 cursor-pointer transition-colors"
                                >
                                  <div className="flex items-center gap-1.5 truncate">
                                    <Plus className="h-3.5 w-3.5 text-teal-700 shrink-0" />
                                    <span className="truncate">Gunakan: &quot;{searchTest.trim()}&quot; (Kustom)</span>
                                  </div>
                                  <span className="text-[10px] font-mono font-bold bg-white text-teal-800 px-1.5 py-0.5 rounded border border-teal-200 shrink-0">
                                    Order Baru
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Kolom Kanan: Prioritas & Indikasi Klinis */}
                  <div className="space-y-3.5">
                    {/* Priority */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Tingkat Prioritas:</Label>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {[
                          { id: "routine", label: "Rutin", desc: "Sesuai Antrean", activeClass: "bg-slate-900 text-white border-slate-900 shadow-2xs font-bold" },
                          { id: "urgent", label: "Cito", desc: "Segera", activeClass: "bg-amber-600 text-white border-amber-700 shadow-2xs font-bold" },
                          { id: "stat", label: "Emergensi", desc: "Gawat Darurat", activeClass: "bg-rose-600 text-white border-rose-700 shadow-2xs font-bold" },
                        ].map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setPriority(p.id as any)}
                            className={`py-2 px-2 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center transition-all btn-press cursor-pointer ${
                              priority === p.id
                                ? `${p.activeClass} ring-2 ring-offset-1 ring-slate-400/30`
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <span className="font-bold">{p.label}</span>
                            <span className={`text-[9.5px] ${priority === p.id ? "text-white/80" : "text-slate-400"}`}>
                              {p.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Clinical Notes with Quick Chips */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-700">
                          Indikasi Klinis / Catatan Petugas:
                        </Label>
                        <span className="text-[10px] text-slate-400">Opsional</span>
                      </div>
                      
                      <Input
                        value={clinicalNotes}
                        onChange={(e) => setClinicalNotes(e.target.value)}
                        placeholder="Contoh: Evaluasi profil lipid dan glikemik berkala"
                        className="text-xs bg-white border-slate-300 rounded-xl"
                      />

                      {/* Quick Chips */}
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {[
                          "Evaluasi Rutin",
                          "Pre-Operatif",
                          "Suspek Infeksi",
                          "Monitoring Terapi",
                        ].map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => setClinicalNotes(chip)}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-white text-slate-600 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 border border-slate-200 transition-colors cursor-pointer"
                          >
                            + {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Form */}
                <div className="flex justify-end gap-2 pt-2 border-t border-teal-200/60">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingOrder(false)}
                    className="text-xs rounded-xl cursor-pointer"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    variant="medical"
                    size="sm"
                    className="text-xs font-bold gap-1.5 rounded-xl shadow-2xs btn-press cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Kirim Order Pemeriksaan</span>
                  </Button>
                </div>
              </form>
            )}

            {/* List of Active Orders (Full Width 2-Column Cards Grid) */}
            {diagnosticOrders.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-2 bg-slate-50/50">
                <FlaskConical className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">
                  Belum ada permintaan laboratorium atau radiologi yang dibuat pada kunjungan ini.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingOrder(true)}
                  className="text-xs font-semibold text-teal-700 border-teal-200 hover:bg-teal-50 rounded-lg cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Buat Permintaan Pertama
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {diagnosticOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-start justify-between gap-3 hover:border-slate-300 hover:shadow-xs transition-all"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                          ord.category === "laboratory"
                            ? "bg-teal-50 text-teal-700 border border-teal-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {ord.category === "laboratory" ? (
                          <FlaskConical className="h-4.5 w-4.5" />
                        ) : (
                          <Radio className="h-4.5 w-4.5" />
                        )}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {ord.testName}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-bold ${
                              ord.priority === "stat"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : ord.priority === "urgent"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {ord.priority === "stat" ? "Emergensi" : ord.priority === "urgent" ? "Cito" : "Rutin"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                          <span>Kode: {ord.testCode}</span>
                          <span>•</span>
                          <span>ID: {ord.id}</span>
                        </p>
                        {ord.clinicalNotes && (
                          <p className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            &quot;{ord.clinicalNotes}&quot;
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
                        Terkirim (FHIR)
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteOrder(ord.id)}
                        className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                        title="Batalkan / Hapus Order"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HASIL LAB (OBSERVATION & DIAGNOSTIC REPORT) */}
        {activeTab === "lab" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <FlaskConical className="h-3.5 w-3.5 text-teal-600" />
                  <span>Hasil Pemeriksaan Laboratorium Pasien</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Data hasil observasi laboratorium terstandar LOINC & SATUSEHAT
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-800 border-teal-200">
                  Standar LOINC / Kemenkes
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsAddingLab(!isAddingLab)}
                  className="h-8 text-xs font-bold gap-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg shadow-2xs btn-press cursor-pointer"
                >
                  {isAddingLab ? (
                    <>
                      <X className="h-3.5 w-3.5" />
                      <span>Batal Input</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      <span>+ Input Hasil Lab Baru</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Form Input Hasil Lab Dinamis */}
            {isAddingLab && (
              <form
                onSubmit={handleSaveLabResult}
                className="bg-teal-50/40 border border-teal-200/80 p-4 rounded-2xl space-y-3.5 animate-in fade-in-0 slide-in-from-top-2 duration-200 shadow-2xs"
              >
                <div className="flex items-center justify-between pb-2 border-b border-teal-200/60">
                  <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                    Formulir Pengisian Hasil Laboratorium
                  </span>
                  <span className="text-[10px] text-teal-700 font-mono">
                    Diinput oleh Petugas Lab / DPJP
                  </span>
                </div>

                {/* Quick Select from Orders or Presets */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1 relative">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700">
                        Pilih dari Permintaan / Preset:
                      </Label>
                      {labForm.category && (
                        <span className="text-[10px] font-semibold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded-md border border-teal-200 shadow-2xs">
                          {labForm.category}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsLabPresetOpen((prev) => !prev)}
                      className="w-full text-left text-xs rounded-xl border border-slate-300 bg-white p-2.5 text-slate-900 hover:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all shadow-2xs flex items-center justify-between gap-2 cursor-pointer btn-press"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-mono text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 shrink-0">
                          {labForm.testCode || "PRESET"}
                        </span>
                        <span className="font-bold text-slate-900 truncate">
                          {labForm.testName || "Pilih Pemeriksaan Lab..."}
                        </span>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                          isLabPresetOpen ? "rotate-180 text-teal-600" : ""
                        }`}
                      />
                    </button>

                    {/* Dropdown Menu */}
                    {isLabPresetOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setIsLabPresetOpen(false)}
                        />
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-100 p-1 animate-in fade-in-0 zoom-in-95">
                          <div className="p-1.5 sticky top-0 bg-white z-10">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                              <input
                                type="text"
                                value={searchLabPreset}
                                onChange={(e) => setSearchLabPreset(e.target.value)}
                                placeholder="Cari tes lab atau kode LOINC..."
                                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>

                          <div className="py-1 space-y-0.5">
                            {filteredLabPresets.map((t) => {
                              const isSelected = labForm.testCode === t.code;
                              return (
                                <button
                                  key={t.code}
                                  type="button"
                                  onClick={() => {
                                    setLabForm((prev) => ({
                                      ...prev,
                                      testCode: t.code,
                                      testName: t.name,
                                      category: t.category,
                                      unit: t.unit,
                                      referenceRange: t.refRange,
                                    }));
                                    setIsLabPresetOpen(false);
                                    setSearchLabPreset("");
                                  }}
                                  className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                                    isSelected
                                      ? "bg-teal-50 border border-teal-200 text-teal-950 font-bold"
                                      : "hover:bg-slate-50 text-slate-800"
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="font-semibold truncate">{t.name}</div>
                                    <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                      <span>{t.category}</span>
                                      <span>•</span>
                                      <span>Rujukan: {t.refRange} {t.unit}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="font-mono text-[10px] font-bold text-teal-800 bg-white px-1.5 py-0.5 rounded border border-teal-200">
                                      {t.code}
                                    </span>
                                    {isSelected && <Check className="h-3.5 w-3.5 text-teal-600" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      Nama Pemeriksaan (LOINC):
                    </Label>
                    <Input
                      value={labForm.testName}
                      onChange={(e) =>
                        setLabForm({ ...labForm, testName: e.target.value })
                      }
                      placeholder="Contoh: Darah Lengkap (Hemoglobin)"
                      className="text-xs bg-white border-slate-300 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      Nilai Hasil:
                    </Label>
                    <Input
                      value={labForm.value}
                      onChange={(e) =>
                        setLabForm({ ...labForm, value: e.target.value })
                      }
                      placeholder="Contoh: 14.2"
                      className="text-xs bg-white border-slate-300 rounded-xl font-mono font-bold"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      Satuan Unit:
                    </Label>
                    <Input
                      value={labForm.unit}
                      onChange={(e) =>
                        setLabForm({ ...labForm, unit: e.target.value })
                      }
                      placeholder="g/dL, mg/dL, /uL"
                      className="text-xs bg-white border-slate-300 rounded-xl font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      Nilai Rujukan:
                    </Label>
                    <Input
                      value={labForm.referenceRange}
                      onChange={(e) =>
                        setLabForm({ ...labForm, referenceRange: e.target.value })
                      }
                      placeholder="13.0 - 17.0"
                      className="text-xs bg-white border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Status Flag (Interpretasi Klinis):
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        { value: "normal", label: "Normal", bg: "bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/20 shadow-2xs font-bold", dot: "bg-emerald-500" },
                        { value: "high", label: "High", bg: "bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-500/20 shadow-2xs font-bold", dot: "bg-amber-500" },
                        { value: "low", label: "Low", bg: "bg-blue-50 text-blue-900 border-blue-300 ring-2 ring-blue-500/20 shadow-2xs font-bold", dot: "bg-blue-500" },
                        { value: "critical", label: "Critical", bg: "bg-rose-50 text-rose-900 border-rose-300 ring-2 ring-rose-500/20 shadow-2xs font-bold", dot: "bg-rose-600" },
                      ].map((opt) => {
                        const isActive = labForm.flag === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setLabForm({ ...labForm, flag: opt.value as any })}
                            className={`px-2 py-2 text-xs rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer btn-press ${
                              isActive
                                ? opt.bg
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${opt.dot} shrink-0`} />
                            <span className="truncate">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      Pemeriksa / Laboratorium:
                    </Label>
                    <Input
                      value={labForm.performer}
                      onChange={(e) =>
                        setLabForm({ ...labForm, performer: e.target.value })
                      }
                      placeholder="Laboratorium Patologi RSUD"
                      className="text-xs bg-white border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingLab(false)}
                    className="text-xs rounded-xl cursor-pointer"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    variant="medical"
                    size="sm"
                    className="text-xs font-bold rounded-xl gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Simpan Hasil Lab
                  </Button>
                </div>
              </form>
            )}

            {/* List / Table Hasil Lab */}
            {labResults.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                <FlaskConical className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">
                  Belum ada hasil pemeriksaan laboratorium yang tercatat pada kunjungan ini.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingLab(true)}
                  className="text-xs font-semibold text-teal-700 border-teal-200 hover:bg-teal-50 rounded-lg cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Input Hasil Pertama
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Nama Pemeriksaan (LOINC)</th>
                      <th className="p-3">Kategori</th>
                      <th className="p-3 text-center">Hasil</th>
                      <th className="p-3 text-center">Nilai Rujukan</th>
                      <th className="p-3 text-center">Status Flag</th>
                      <th className="p-3">Petugas</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {labResults.map((lr) => (
                      <tr key={lr.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-semibold text-slate-900">
                          {lr.testName}
                          <span className="text-[10px] font-mono text-slate-400 block">
                            LOINC: {lr.testCode}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">{lr.category}</td>
                        <td className="p-3 text-center font-bold font-mono text-slate-900">
                          {lr.value} {lr.unit && lr.unit !== "-" ? lr.unit : ""}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600">
                          {lr.referenceRange} {lr.unit && lr.unit !== "-" ? lr.unit : ""}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              lr.flag === "high"
                                ? "bg-red-100 text-red-700 border border-red-200"
                                : lr.flag === "low"
                                ? "bg-amber-100 text-amber-700 border border-amber-200"
                                : lr.flag === "critical"
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {lr.flag === "high"
                              ? "Tinggi"
                              : lr.flag === "low"
                              ? "Rendah"
                              : lr.flag === "critical"
                              ? "Kritis"
                              : "Normal"}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">{lr.performer}</td>
                        <td className="p-3 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteLabResult(lr.id)}
                            className="h-7 w-7 text-slate-400 hover:text-red-600 cursor-pointer"
                            title="Hapus Hasil Lab"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: HASIL RADIOLOGI & EKG (DIAGNOSTIC REPORT RAD) */}
        {activeTab === "rad" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Radio className="h-3.5 w-3.5 text-teal-600" />
                  <span>Ekspertise Hasil Radiologi &amp; Pencitraan</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Temuan klinis &amp; kesimpulan ekspertise dokter spesialis radiologi
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-800 border-blue-200">
                  Ekspertise Radiologi
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsAddingRad(!isAddingRad)}
                  className="h-8 text-xs font-bold gap-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg shadow-2xs btn-press cursor-pointer"
                >
                  {isAddingRad ? (
                    <>
                      <X className="h-3.5 w-3.5" />
                      <span>Batal Input</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      <span>+ Input Ekspertise Radiologi</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Form Input Ekspertise Radiologi Dinamis */}
            {isAddingRad && (
              <form
                onSubmit={handleSaveRadResult}
                className="bg-blue-50/40 border border-blue-200/80 p-4 rounded-2xl space-y-3.5 animate-in fade-in-0 slide-in-from-top-2 duration-200 shadow-2xs"
              >
                <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
                  <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    Formulir Pengisian Ekspertise Radiologi
                  </span>
                  <span className="text-[10px] text-blue-700 font-mono">
                    Diinput oleh Dokter Radiolog / DPJP
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1 relative">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700">
                        Pilih dari Preset:
                      </Label>
                      {radForm.modality && (
                        <span className="text-[10px] font-semibold text-blue-800 bg-blue-100/70 px-2 py-0.5 rounded-md border border-blue-200 shadow-2xs">
                          {radForm.modality}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsRadPresetOpen((prev) => !prev)}
                      className="w-full text-left text-xs rounded-xl border border-slate-300 bg-white p-2.5 text-slate-900 hover:border-blue-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all shadow-2xs flex items-center justify-between gap-2 cursor-pointer btn-press"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-mono text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shrink-0">
                          {radForm.examCode || "RAD"}
                        </span>
                        <span className="font-bold text-slate-900 truncate">
                          {radForm.examName || "Pilih Pemeriksaan Radiologi..."}
                        </span>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                          isRadPresetOpen ? "rotate-180 text-blue-600" : ""
                        }`}
                      />
                    </button>

                    {/* Dropdown Menu */}
                    {isRadPresetOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setIsRadPresetOpen(false)}
                        />
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-100 p-1 animate-in fade-in-0 zoom-in-95">
                          <div className="p-1.5 sticky top-0 bg-white z-10">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                              <input
                                type="text"
                                value={searchRadPreset}
                                onChange={(e) => setSearchRadPreset(e.target.value)}
                                placeholder="Cari pemeriksaan radiologi..."
                                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>

                          <div className="py-1 space-y-0.5">
                            {filteredRadPresets.map((t) => {
                              const isSelected = radForm.examCode === t.code;
                              return (
                                <button
                                  key={t.code}
                                  type="button"
                                  onClick={() => {
                                    setRadForm((prev) => ({
                                      ...prev,
                                      examCode: t.code,
                                      examName: t.name,
                                      modality: t.modality,
                                    }));
                                    setIsRadPresetOpen(false);
                                    setSearchRadPreset("");
                                  }}
                                  className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                                    isSelected
                                      ? "bg-blue-50 border border-blue-200 text-blue-950 font-bold"
                                      : "hover:bg-slate-50 text-slate-800"
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="font-semibold truncate">{t.name}</div>
                                    <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                      <span>Modalitas: {t.modality}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="font-mono text-[10px] font-bold text-blue-800 bg-white px-1.5 py-0.5 rounded border border-blue-200">
                                      {t.code}
                                    </span>
                                    {isSelected && <Check className="h-3.5 w-3.5 text-blue-600" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      Nama Pemeriksaan:
                    </Label>
                    <Input
                      value={radForm.examName}
                      onChange={(e) =>
                        setRadForm({ ...radForm, examName: e.target.value })
                      }
                      placeholder="Contoh: Foto Thorax PA/AP"
                      className="text-xs bg-white border-slate-300 rounded-xl"
                      required
                    />
                  </div>
                </div>

                {/* Modality Segmented Pills */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Modalitas Radiologi:
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    {(["X-Ray", "EKG", "USG", "CT-Scan", "MRI"] as const).map((m) => {
                      const isActive = radForm.modality === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setRadForm({ ...radForm, modality: m })}
                          className={`py-2 px-3 text-xs rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer btn-press ${
                            isActive
                              ? "bg-blue-700 text-white border-blue-800 shadow-2xs font-bold"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <Radio className={`h-3 w-3 ${isActive ? "text-blue-200" : "text-slate-400"}`} />
                          <span>{m}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Deskripsi Temuan Klinis (Findings):
                  </Label>
                  <textarea
                    value={radForm.findings}
                    onChange={(e) =>
                      setRadForm({ ...radForm, findings: e.target.value })
                    }
                    placeholder="Contoh: Cor dan pulmo dalam batas normal. Sinus rhythm, HR 78 bpm, tidak ada tanda iskemia akut atau kardiomegali."
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 min-h-[70px] focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Kesimpulan Radiologis (Conclusion):
                  </Label>
                  <textarea
                    value={radForm.conclusion}
                    onChange={(e) =>
                      setRadForm({ ...radForm, conclusion: e.target.value })
                    }
                    placeholder="Contoh: Pemeriksaan dalam batas normal, tidak tampak kelainan kardiopulmonal akut."
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 min-h-[50px] font-semibold text-teal-950 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      Dokter Radiolog / Pemeriksa:
                    </Label>
                    <Input
                      value={radForm.radiologistName}
                      onChange={(e) =>
                        setRadForm({ ...radForm, radiologistName: e.target.value })
                      }
                      placeholder="dr. Hendra Pratama, Sp.Rad"
                      className="text-xs bg-white border-slate-300 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      Kode LOINC:
                    </Label>
                    <Input
                      value={radForm.examCode}
                      onChange={(e) =>
                        setRadForm({ ...radForm, examCode: e.target.value })
                      }
                      placeholder="Contoh: 36554-4"
                      className="text-xs bg-white border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingRad(false)}
                    className="text-xs rounded-xl cursor-pointer"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    variant="medical"
                    size="sm"
                    className="text-xs font-bold rounded-xl gap-1.5 shadow-2xs bg-blue-700 hover:bg-blue-800 text-white cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Simpan Ekspertise Radiologi
                  </Button>
                </div>
              </form>
            )}

            {/* List Hasil Radiologi */}
            {radiologyResults.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                <Radio className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">
                  Belum ada hasil ekspertise radiologi atau pencitraan pada kunjungan ini.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingRad(true)}
                  className="text-xs font-semibold text-blue-700 border-blue-200 hover:bg-blue-50 rounded-lg cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Input Ekspertise Pertama
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {radiologyResults.map((rad) => (
                  <div
                    key={rad.id}
                    className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3"
                  >
                    <div className="flex justify-between items-start border-b border-slate-200 pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-900">
                            {rad.examName}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-bold bg-blue-50 text-blue-800">
                            Modalitas: {rad.modality}
                          </Badge>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 block">
                          Kode LOINC: {rad.examCode} • ID: {rad.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 font-medium">
                          {rad.radiologistName}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRadResult(rad.id)}
                          className="h-7 w-7 text-slate-400 hover:text-red-600 cursor-pointer"
                          title="Hapus Hasil Radiologi"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">
                          Deskripsi Temuan Klinis (Findings):
                        </span>
                        <p className="text-slate-800 leading-relaxed bg-white p-2.5 rounded border border-slate-200">
                          {rad.findings}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">
                          Kesimpulan Radiologis (Conclusion):
                        </span>
                        <p className="text-slate-900 font-semibold leading-relaxed bg-teal-50/70 p-2.5 rounded border border-teal-200 text-teal-900">
                          {rad.conclusion}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
