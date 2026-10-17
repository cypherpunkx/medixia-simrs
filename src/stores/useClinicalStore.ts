"use client";

import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import {
  PatientProfile,
  OutpatientEncounter,
  ClinicQueuePatientItem,
} from "@/lib/satusehat/types";
import { useUIStore } from "./useUIStore";
import { EhrModule } from "@/components/layout/EhrLeftSidebar";
import { toast } from "sonner";

export interface ClinicalState {
  patient: PatientProfile | null;
  selectedEncounterId: string | null;
  encounters: OutpatientEncounter[];
  worklist: ClinicQueuePatientItem[];
  isDbSyncing: boolean;
  isHydrated: boolean;

  // Actions
  setPatient: (patient: PatientProfile | null) => void;
  setSelectedEncounterId: (id: string | null) => void;
  setEncounters: (
    encounters:
      | OutpatientEncounter[]
      | ((prev: OutpatientEncounter[]) => OutpatientEncounter[])
  ) => void;
  setWorklist: (
    worklist:
      | ClinicQueuePatientItem[]
      | ((prev: ClinicQueuePatientItem[]) => ClinicQueuePatientItem[])
  ) => void;
  updateEncounter: (encounter: OutpatientEncounter) => void;
  updateWorklistStatus: (
    queueId: string,
    status: "arrived" | "in-progress" | "finished"
  ) => void;
  updateQueueStatus: (
    queueId: string,
    status: "arrived" | "in-progress" | "finished",
    silent?: boolean
  ) => Promise<void>;
  selectPatient: (
    selectedPat: PatientProfile,
    options?: {
      targetModule?: EhrModule;
      targetQueueItemOrNumber?: ClinicQueuePatientItem | string;
      targetDepartment?: string;
      queueStatusOverride?: "arrived" | "in-progress" | "finished";
    }
  ) => Promise<void>;
  setIsDbSyncing: (isSyncing: boolean) => void;
  setIsHydrated: (isHydrated: boolean) => void;
  fetchClinicalData: (facilityId?: string) => Promise<void>;
}

export const useClinicalStore = create<ClinicalState>()(
  devtools(
    persist(
      immer((set, get) => ({
        patient: null,
        selectedEncounterId: null,
        encounters: [],
        worklist: [],
        isDbSyncing: false,
        isHydrated: false,

        setPatient: (patient) =>
          set((state) => {
            state.patient = patient;
            if (patient && typeof window !== "undefined") {
              try {
                sessionStorage.setItem("simrs_active_patient_id", patient.id);
              } catch {}
            }
          }, undefined, "clinical/setPatient"),

        setSelectedEncounterId: (id) =>
          set((state) => {
            state.selectedEncounterId = id;
            if (id && typeof window !== "undefined") {
              try {
                sessionStorage.setItem("simrs_active_encounter_id", id);
              } catch {}
            }
          }, undefined, "clinical/setSelectedEncounterId"),

        setEncounters: (action) =>
          set((state) => {
            const next = typeof action === "function" ? action(state.encounters) : action;
            state.encounters = next;
          }, undefined, "clinical/setEncounters"),

        setWorklist: (action) =>
          set((state) => {
            const next = typeof action === "function" ? action(state.worklist) : action;
            state.worklist = next;
          }, undefined, "clinical/setWorklist"),

        updateEncounter: (encounter) =>
          set((state) => {
            const index = state.encounters.findIndex((e) => e.id === encounter.id);
            if (index !== -1) {
              state.encounters[index] = encounter;
            } else {
              state.encounters.unshift(encounter);
            }
          }, undefined, "clinical/updateEncounter"),

        updateWorklistStatus: (queueId, status) =>
          set((state) => {
            const item = state.worklist.find((w) => w.id === queueId);
            if (item) {
              item.status = status;
            }
          }, undefined, "clinical/updateWorklistStatus"),

        updateQueueStatus: async (queueId, status, silent = false) => {
          const prevWorklist = get().worklist;
          const targetItem = prevWorklist.find((w) => w.id === queueId);
          if (!targetItem) return;

          // 1. Optimistic Update
          set((state) => {
            const item = state.worklist.find((w) => w.id === queueId);
            if (item) item.status = status;

            // Sync to matching encounter
            state.encounters.forEach((e) => {
              if (
                (targetItem.queueNumber && e.queueNumber === targetItem.queueNumber) ||
                (targetItem.registrationNumber && e.registrationNumber === targetItem.registrationNumber) ||
                (targetItem.encounterId && e.id === targetItem.encounterId) ||
                (e.id === queueId)
              ) {
                e.encounterStatus = status;
              }
            });
          }, undefined, "clinical/updateQueueStatusOptimistic");

          if (!silent) {
            const statusLabel =
              status === "in-progress"
                ? "Dipanggil ke Ruang Periksa"
                : status === "finished"
                ? "Pelayanan Selesai"
                : "Menunggu Antrean";
            toast.success(`Antrean ${targetItem.queueNumber}: ${statusLabel}`);
          }

          // 2. Persist to API
          try {
            const res = await fetch(`/api/queue/${queueId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status }),
            });
            if (!res.ok) {
              throw new Error("HTTP error during queue update");
            }
          } catch (err) {
            console.error("Gagal update status antrean ke database:", err);
            // Rollback on failure
            set({ worklist: prevWorklist }, undefined, "clinical/rollbackQueueStatus");
            toast.error("Gagal memperbarui status antrean di server.");
          }
        },

        selectPatient: async (selectedPat, options) => {
          // 1. Set active patient immediately
          set((state) => {
            state.patient = selectedPat;
            if (typeof window !== "undefined") {
              try {
                sessionStorage.setItem("simrs_active_patient_id", selectedPat.id);
              } catch {}
            }
          }, undefined, "clinical/selectPatientStart");

          if (typeof window !== "undefined") {
            window.scrollTo({ top: 0, left: 0, behavior: "instant" });
          }

          // 2. Switch UI module/dept if requested
          if (options?.targetModule) {
            useUIStore.getState().setActiveModule(options.targetModule);
          }
          if (options?.targetDepartment) {
            useUIStore.getState().setActiveDepartment(options.targetDepartment);
          }

          const { worklist, encounters } = get();

          // 3. Resolve active queue item for this patient
          const targetQueue =
            typeof options?.targetQueueItemOrNumber === "object" && options.targetQueueItemOrNumber
              ? options.targetQueueItemOrNumber
              : typeof options?.targetQueueItemOrNumber === "string"
              ? worklist.find(
                  (w) =>
                    w.queueNumber === options.targetQueueItemOrNumber ||
                    w.id === options.targetQueueItemOrNumber
                )
              : options?.targetDepartment && options.targetDepartment !== "Semua Poli"
              ? worklist.find(
                  (w) =>
                    (w.patient.id === selectedPat.id || w.patient.mrn === selectedPat.mrn) &&
                    w.department === options.targetDepartment
                )
              : worklist.find(
                  (w) =>
                    (w.patient.id === selectedPat.id || w.patient.mrn === selectedPat.mrn) &&
                    (w.status === "in-progress" || w.status === "arrived")
                ) ||
                worklist.find((w) => w.patient.id === selectedPat.id || w.patient.mrn === selectedPat.mrn);

          const effectiveStatus = options?.queueStatusOverride || (targetQueue?.status as any);

          // 4. Resolve matching local encounters
          const patientEncounters = encounters.filter((e) => e.patientId === selectedPat.id);
          let targetEncId = patientEncounters[0]?.id;
          if (targetQueue) {
            const match = patientEncounters.find(
              (e) =>
                (targetQueue.encounterId && e.id === targetQueue.encounterId) ||
                (targetQueue.registrationNumber && e.registrationNumber === targetQueue.registrationNumber) ||
                (targetQueue.queueNumber && e.queueNumber === targetQueue.queueNumber) ||
                (targetQueue.id && (e.id === targetQueue.id || e.id === targetQueue.encounterId))
            );
            if (match) targetEncId = match.id;
          }

          if (targetEncId) {
            set((state) => {
              state.selectedEncounterId = targetEncId!;
            }, undefined, "clinical/setSelectedEncounterId");
          }

          // 5. Async fetch fresh encounters from server
          try {
            set((state) => { state.isDbSyncing = true; });
            const res = await fetch(`/api/encounters?patientId=${selectedPat.id}`);
            if (res.ok) {
              const json = await res.json();
              if (json.success && Array.isArray(json.data) && json.data.length > 0) {
                set((state) => {
                  const fetched: OutpatientEncounter[] = json.data;
                  // Merge fetched encounters with existing ones for other patients
                  const others = state.encounters.filter((e) => e.patientId !== selectedPat.id);
                  state.encounters = [...fetched, ...others];
                  if (!targetEncId && fetched[0]) {
                    state.selectedEncounterId = fetched[0].id;
                  }
                  state.isDbSyncing = false;
                }, undefined, "clinical/syncEncountersSuccess");
                return;
              }
            }
            set((state) => { state.isDbSyncing = false; });
          } catch {
            set((state) => { state.isDbSyncing = false; });
          }
        },

        setIsDbSyncing: (isDbSyncing) =>
          set((state) => {
            state.isDbSyncing = isDbSyncing;
          }, undefined, "clinical/setIsDbSyncing"),

        setIsHydrated: (isHydrated) =>
          set((state) => {
            state.isHydrated = isHydrated;
          }, undefined, "clinical/setIsHydrated"),

        fetchClinicalData: async (facilityId) => {
          set((state) => {
            state.isDbSyncing = true;
          }, undefined, "clinical/fetchStart");

          try {
            const queueUrl = facilityId
              ? `/api/queue?facilityId=${encodeURIComponent(facilityId)}`
              : "/api/queue";

            const [pRes, qRes, encRes] = await Promise.all([
              fetch("/api/patients", { cache: "no-store" }),
              fetch(queueUrl, { cache: "no-store" }),
              fetch("/api/encounters", { cache: "no-store" }),
            ]);

            const [pData, qData, encData] = await Promise.all([
              pRes.ok ? pRes.json() : { success: false, data: [] },
              qRes.ok ? qRes.json() : { success: false, data: [] },
              encRes.ok ? encRes.json() : { success: false, data: [] },
            ]);

            set((state) => {
              if (qData.success && Array.isArray(qData.data)) {
                state.worklist = qData.data;
              }
              if (encData.success && Array.isArray(encData.data)) {
                state.encounters = encData.data;
              }
              if (pData.success && Array.isArray(pData.data) && !state.patient) {
                state.patient = pData.data[0] || null;
              }
              state.isDbSyncing = false;
              state.isHydrated = true;
            }, undefined, "clinical/fetchSuccess");
          } catch (error) {
            console.error("Gagal sinkronisasi data klinis di store:", error);
            set((state) => {
              state.isDbSyncing = false;
              state.isHydrated = true;
            }, undefined, "clinical/fetchError");
          }
        },
      })),
      {
        name: "medixia_simrs_clinical",
        storage: createJSONStorage(() => sessionStorage),
        partialize: (state) => ({
          selectedEncounterId: state.selectedEncounterId,
        }),
      }
    ),
    { name: "MedixiaClinicalStore", enabled: process.env.NODE_ENV === "development" }
  )
);
