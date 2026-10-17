"use client";

import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { LabResult, RadiologyResult } from "@/lib/satusehat/types";

export type DiagnosticTab = "order" | "lab" | "rad";
export type DiagnosticCategory = "laboratory" | "radiology";
export type DiagnosticPriority = "routine" | "urgent" | "stat";

export interface LabFormData {
  testCode: string;
  testName: string;
  category: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: "normal" | "high" | "low" | "critical";
  performer: string;
}

export interface RadFormData {
  examCode: string;
  examName: string;
  modality: "X-Ray" | "CT-Scan" | "USG" | "MRI" | "EKG";
  findings: string;
  conclusion: string;
  radiologistName: string;
}

const DEFAULT_LAB_FORM: LabFormData = {
  testCode: "58410-2",
  testName: "Darah Lengkap (CBC)",
  category: "Hematologi",
  value: "",
  unit: "-",
  referenceRange: "Normal",
  flag: "normal",
  performer: "",
};

const DEFAULT_RAD_FORM: RadFormData = {
  examCode: "36554-4",
  examName: "Foto Thorax PA / AP",
  modality: "X-Ray",
  findings: "",
  conclusion: "",
  radiologistName: "",
};

export interface DiagnosticState {
  // Navigation & Category Selection
  activeTab: DiagnosticTab;
  selectedCategory: DiagnosticCategory;
  priority: DiagnosticPriority;
  selectedPreset: string;
  clinicalNotes: string;
  searchTest: string;
  searchLabPreset: string;
  searchRadPreset: string;
  customTest: { code: string; name: string } | null;

  // Order Submission State
  isAddingOrder: boolean;
  isSyncing: string | null;

  // Lab Form State
  isAddingLab: boolean;
  editingLabId: string | null;
  labForm: LabFormData;

  // Rad Form State
  isAddingRad: boolean;
  editingRadId: string | null;
  radForm: RadFormData;

  // Setters & Actions
  setActiveTab: (tab: DiagnosticTab) => void;
  setSelectedCategory: (category: DiagnosticCategory) => void;
  setPriority: (priority: DiagnosticPriority) => void;
  setSelectedPreset: (code: string) => void;
  setClinicalNotes: (notes: string) => void;
  setSearchTest: (query: string) => void;
  setSearchLabPreset: (query: string) => void;
  setSearchRadPreset: (query: string) => void;
  setCustomTest: (test: { code: string; name: string } | null) => void;
  setIsAddingOrder: (isAdding: boolean) => void;
  setIsSyncing: (id: string | null) => void;

  // Lab Actions
  setLabForm: (updater: Partial<LabFormData> | ((prev: LabFormData) => LabFormData)) => void;
  startEditLab: (lr: LabResult) => void;
  cancelEditLab: () => void;
  setIsAddingLab: (isAdding: boolean) => void;

  // Rad Actions
  setRadForm: (updater: Partial<RadFormData> | ((prev: RadFormData) => RadFormData)) => void;
  startEditRad: (rad: RadiologyResult) => void;
  cancelEditRad: () => void;
  setIsAddingRad: (isAdding: boolean) => void;

  // Reset Actions
  resetOrderForm: () => void;
}

export const useDiagnosticStore = create<DiagnosticState>()(
  devtools(
    persist(
      immer((set) => ({
        // Default UI States
        activeTab: "order",
        selectedCategory: "laboratory",
        priority: "routine",
        selectedPreset: "58410-2",
        clinicalNotes: "",
        searchTest: "",
        searchLabPreset: "",
        searchRadPreset: "",
        customTest: null,

        // Order Workflow
        isAddingOrder: false,
        isSyncing: null,

        // Lab Form
        isAddingLab: false,
        editingLabId: null,
        labForm: { ...DEFAULT_LAB_FORM },

        // Rad Form
        isAddingRad: false,
        editingRadId: null,
        radForm: { ...DEFAULT_RAD_FORM },

        // Setters
        setActiveTab: (tab) =>
          set((state) => {
            state.activeTab = tab;
          }),
        setSelectedCategory: (category) =>
          set((state) => {
            state.selectedCategory = category;
          }),
        setPriority: (priority) =>
          set((state) => {
            state.priority = priority;
          }),
        setSelectedPreset: (code) =>
          set((state) => {
            state.selectedPreset = code;
          }),
        setClinicalNotes: (notes) =>
          set((state) => {
            state.clinicalNotes = notes;
          }),
        setSearchTest: (query) =>
          set((state) => {
            state.searchTest = query;
          }),
        setSearchLabPreset: (query) =>
          set((state) => {
            state.searchLabPreset = query;
          }),
        setSearchRadPreset: (query) =>
          set((state) => {
            state.searchRadPreset = query;
          }),
        setCustomTest: (test) =>
          set((state) => {
            state.customTest = test;
          }),
        setIsAddingOrder: (isAdding) =>
          set((state) => {
            state.isAddingOrder = isAdding;
          }),
        setIsSyncing: (id) =>
          set((state) => {
            state.isSyncing = id;
          }),

        // Lab Actions
        setLabForm: (updater) =>
          set((state) => {
            if (typeof updater === "function") {
              state.labForm = updater(state.labForm);
            } else {
              state.labForm = { ...state.labForm, ...updater };
            }
          }),
        startEditLab: (lr) =>
          set((state) => {
            state.editingLabId = lr.id;
            state.labForm = {
              testCode: lr.testCode,
              testName: lr.testName,
              category: lr.category,
              value: String(lr.value),
              unit: lr.unit,
              referenceRange: lr.referenceRange,
              flag: lr.flag,
              performer: lr.performer,
            };
            state.isAddingLab = true;
          }),
        cancelEditLab: () =>
          set((state) => {
            state.editingLabId = null;
            state.isAddingLab = false;
            state.labForm = { ...DEFAULT_LAB_FORM };
          }),
        setIsAddingLab: (isAdding) =>
          set((state) => {
            state.isAddingLab = isAdding;
          }),

        // Rad Actions
        setRadForm: (updater) =>
          set((state) => {
            if (typeof updater === "function") {
              state.radForm = updater(state.radForm);
            } else {
              state.radForm = { ...state.radForm, ...updater };
            }
          }),
        startEditRad: (rad) =>
          set((state) => {
            state.editingRadId = rad.id;
            state.radForm = {
              examCode: rad.examCode,
              examName: rad.examName,
              modality: rad.modality,
              findings: rad.findings,
              conclusion: rad.conclusion,
              radiologistName: rad.radiologistName,
            };
            state.isAddingRad = true;
          }),
        cancelEditRad: () =>
          set((state) => {
            state.editingRadId = null;
            state.isAddingRad = false;
            state.radForm = { ...DEFAULT_RAD_FORM };
          }),
        setIsAddingRad: (isAdding) =>
          set((state) => {
            state.isAddingRad = isAdding;
          }),

        // Reset
        resetOrderForm: () =>
          set((state) => {
            state.isAddingOrder = false;
            state.clinicalNotes = "";
            state.searchTest = "";
            state.customTest = null;
          }),
      })),
      {
        name: "medixia-diagnostic-store",
        storage: createJSONStorage(() => sessionStorage),
        // Simpan preferensi tab, prioritas, dan draft teks agar tidak hilang saat berpindah modul
        partialize: (state) => ({
          activeTab: state.activeTab,
          selectedCategory: state.selectedCategory,
          priority: state.priority,
          clinicalNotes: state.clinicalNotes,
          labForm: state.labForm,
          radForm: state.radForm,
        }),
      }
    ),
    { name: "DiagnosticStore" }
  )
);
