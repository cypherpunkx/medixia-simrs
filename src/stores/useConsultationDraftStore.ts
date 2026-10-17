"use client";

import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import {
  DiagnosisItem,
  ProcedureItem,
  PrescriptionItem,
} from "@/lib/satusehat/types";

export interface ConsultationDraft {
  encounterId: string;
  patientId: string;
  activeSoapTab: "S" | "O" | "A" | "P";
  chiefComplaint: string;
  anamnesis: string;
  pastMedicalHistory: string;
  vitals: {
    systolic?: string;
    diastolic?: string;
    heartRate?: string;
    respiratoryRate?: string;
    temperature?: string;
    weight?: string;
    height?: string;
    oxygenSaturation?: string;
    bloodSugar?: string;
  };
  physicalExamNotes?: string;
  diagnoses: DiagnosisItem[];
  procedures: ProcedureItem[];
  prescriptions: PrescriptionItem[];
  followUpInstruction?: string;
  dischargeDisposition?: string;
  updatedAt: number;
}

export interface ConsultationDraftState {
  drafts: Record<string, ConsultationDraft>;

  // Actions
  saveDraft: (encounterId: string, draft: Partial<ConsultationDraft>) => void;
  getDraft: (encounterId: string) => ConsultationDraft | undefined;
  clearDraft: (encounterId: string) => void;
  clearAllDrafts: () => void;
}

export const useConsultationDraftStore = create<ConsultationDraftState>()(
  devtools(
    persist(
      immer((set, get) => ({
        drafts: {},

        saveDraft: (encounterId, draftData) =>
          set((state) => {
            const existing = state.drafts[encounterId] || {
              encounterId,
              patientId: draftData.patientId || "",
              activeSoapTab: "S",
              chiefComplaint: "",
              anamnesis: "",
              pastMedicalHistory: "",
              vitals: {},
              diagnoses: [],
              procedures: [],
              prescriptions: [],
              updatedAt: Date.now(),
            };

            state.drafts[encounterId] = {
              ...existing,
              ...draftData,
              vitals: {
                ...existing.vitals,
                ...(draftData.vitals || {}),
              },
              updatedAt: Date.now(),
            };
          }, undefined, "draft/saveDraft"),

        getDraft: (encounterId) => {
          return get().drafts[encounterId];
        },

        clearDraft: (encounterId) =>
          set((state) => {
            delete state.drafts[encounterId];
          }, undefined, "draft/clearDraft"),

        clearAllDrafts: () =>
          set((state) => {
            state.drafts = {};
          }, undefined, "draft/clearAllDrafts"),
      })),
      {
        name: "medixia_consultation_drafts",
        storage: createJSONStorage(() => sessionStorage),
      }
    ),
    {
      name: "MedixiaConsultationDraftStore",
      enabled: process.env.NODE_ENV === "development",
    }
  )
);
