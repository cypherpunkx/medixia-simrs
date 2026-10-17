"use client";

import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";
import { EhrModule } from "@/components/layout/EhrLeftSidebar";
import { ClinicQueuePatientItem } from "@/lib/satusehat/types";

export type ModalName =
  | "isPrintModalOpen"
  | "isQueueTicketOpen"
  | "isPatientCardOpen"
  | "isPrescriptionPrintOpen"
  | "isLockModalOpen"
  | "isQueueDisplayOpen"
  | "isQrModalOpen";

export interface UIState {
  // Navigation & Workspace Context
  activeModule: EhrModule;
  activeDepartment: string;

  // Modals & Overlays State
  isPrintModalOpen: boolean;
  isQueueTicketOpen: boolean;
  ticketQueueItem: ClinicQueuePatientItem | null;
  isPatientCardOpen: boolean;
  isPrescriptionPrintOpen: boolean;
  isLockModalOpen: boolean;
  isQueueDisplayOpen: boolean;
  isQrModalOpen: boolean;

  // Actions
  setActiveModule: (module: EhrModule) => void;
  setActiveDepartment: (department: string) => void;
  setModalOpen: (modal: ModalName, isOpen: boolean) => void;
  openQueueTicketModal: (item: ClinicQueuePatientItem | null) => void;
  closeAllModals: () => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        activeModule: "resume",
        activeDepartment: "Poli Penyakit Dalam",

        isPrintModalOpen: false,
        isQueueTicketOpen: false,
        ticketQueueItem: null,
        isPatientCardOpen: false,
        isPrescriptionPrintOpen: false,
        isLockModalOpen: false,
        isQueueDisplayOpen: false,
        isQrModalOpen: false,

        setActiveModule: (activeModule) =>
          set({ activeModule }, undefined, "ui/setActiveModule"),

        setActiveDepartment: (activeDepartment) =>
          set({ activeDepartment }, undefined, "ui/setActiveDepartment"),

        setModalOpen: (modal, isOpen) =>
          set({ [modal]: isOpen } as Partial<UIState>, undefined, `ui/setModalOpen/${modal}`),

        openQueueTicketModal: (ticketQueueItem) =>
          set(
            { isQueueTicketOpen: true, ticketQueueItem },
            undefined,
            "ui/openQueueTicketModal"
          ),

        closeAllModals: () =>
          set(
            {
              isPrintModalOpen: false,
              isQueueTicketOpen: false,
              ticketQueueItem: null,
              isPatientCardOpen: false,
              isPrescriptionPrintOpen: false,
              isLockModalOpen: false,
              isQueueDisplayOpen: false,
              isQrModalOpen: false,
            },
            undefined,
            "ui/closeAllModals"
          ),
      }),
      {
        name: "medixia_simrs_ui",
        storage: createJSONStorage(() => sessionStorage),
        partialize: (state) => ({
          activeModule: state.activeModule,
          activeDepartment: state.activeDepartment,
        }),
      }
    ),
    { name: "MedixiaUIStore", enabled: process.env.NODE_ENV === "development" }
  )
);
