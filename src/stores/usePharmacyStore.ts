"use client";

import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { PharmacyWorklistItem } from "@/lib/db/repositories/pharmacy-repo";
import { StockMutationItem } from "@/lib/satusehat/types";
import { toast } from "sonner";

export type PharmacyMainTab = "prescriptions" | "inventory" | "mutations";
export type RxFilter = "all" | "pending_review" | "in_preparation" | "ready" | "dispensed";
export type InventoryFilter = "all" | "active" | "inactive" | "critical" | "low" | "safe";
export type MutationFilter = "all" | "dispense" | "restock";
export type RxSort = "status_priority" | "time_desc" | "time_asc" | "patient_name";
export type InventorySort = "name_asc" | "name_desc" | "stock_asc" | "stock_desc" | "recently_updated";
export type MutationSort = "time_desc" | "time_asc" | "qty_desc";

export interface InventoryItem {
  id: string;
  kfaCode: string;
  name: string;
  genericName: string;
  form: string;
  strength: string;
  route?: string;
  category: string;
  unit: string;
  defaultDosage?: string | null;
  defaultFrequency?: string | null;
  defaultTiming?: string | null;
  stock: number;
  price: number;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PharmacyState {
  // Navigation & Filtering Preferences
  mainTab: PharmacyMainTab;
  rxFilter: RxFilter;
  inventoryFilter: InventoryFilter;
  mutationFilter: MutationFilter;
  rxViewMode: "cards" | "table";
  rxSort: RxSort;
  inventorySort: InventorySort;
  mutationSort: MutationSort;

  // Domain Data
  worklist: PharmacyWorklistItem[];
  inventoryList: InventoryItem[];
  mutations: StockMutationItem[];

  // Loading States
  isLoadingWorklist: boolean;
  isLoadingInventory: boolean;
  isLoadingMutations: boolean;
  actionLoadingId: string | null;
  syncingId: string | null;

  // Hydration state
  isHydrated: boolean;

  // Setters
  setMainTab: (tab: PharmacyMainTab) => void;
  setRxFilter: (filter: RxFilter) => void;
  setInventoryFilter: (filter: InventoryFilter) => void;
  setMutationFilter: (filter: MutationFilter) => void;
  setRxViewMode: (mode: "cards" | "table") => void;
  setRxSort: (sort: RxSort) => void;
  setInventorySort: (sort: InventorySort) => void;
  setMutationSort: (sort: MutationSort) => void;
  setActionLoadingId: (id: string | null) => void;
  setSyncingId: (id: string | null) => void;
  setIsHydrated: (isHydrated: boolean) => void;

  // Async API Actions
  loadWorklist: () => Promise<void>;
  loadInventory: () => Promise<void>;
  loadMutations: () => Promise<void>;
  loadAll: () => Promise<void>;

  // Workflow Handlers
  reviewPrescription: (item: PharmacyWorklistItem, reviewerName: string) => Promise<boolean>;
  preparePrescription: (
    item: PharmacyWorklistItem,
    payload: {
      preparerName: string;
      batchNumber: string;
      expiryDate: string;
      etiquetteType: "white" | "blue";
    }
  ) => Promise<{ success: boolean; stockAfter?: number; error?: string }>;
  dispensePrescription: (
    item: PharmacyWorklistItem,
    payload: {
      dispenserName: string;
      counselingNotes: string;
    }
  ) => Promise<{ success: boolean; satusehatSynced?: boolean; satusehatDispenseId?: string; error?: string }>;
  syncSatusehat: (item: PharmacyWorklistItem) => Promise<{ success: boolean; satusehatDispenseId?: string; isLocalFallback?: boolean; error?: string }>;
  restockMedication: (payload: {
    kfaCode: string;
    quantity: number;
    creatorName: string;
    notes: string;
  }) => Promise<{ success: boolean; newStock?: number; error?: string }>;
  adjustStock: (payload: {
    kfaCode: string;
    newStock: number;
    reason: string;
    creatorName: string;
  }) => Promise<{ success: boolean; oldStock?: number; newStock?: number; error?: string }>;
  toggleMedicationActive: (id: string, active: boolean) => Promise<{ success: boolean; isActive?: boolean; error?: string }>;
}

export const usePharmacyStore = create<PharmacyState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Default UI Preferences
        mainTab: "prescriptions",
        rxFilter: "all",
        inventoryFilter: "all",
        mutationFilter: "all",
        rxViewMode: "cards",
        rxSort: "status_priority",
        inventorySort: "name_asc",
        mutationSort: "time_desc",

        // Initial Data Collections
        worklist: [],
        inventoryList: [],
        mutations: [],

        // Loaders
        isLoadingWorklist: false,
        isLoadingInventory: false,
        isLoadingMutations: false,
        actionLoadingId: null,
        syncingId: null,
        isHydrated: false,

        // Setters
        setMainTab: (tab) =>
          set((state) => {
            state.mainTab = tab;
          }),
        setRxFilter: (filter) =>
          set((state) => {
            state.rxFilter = filter;
          }),
        setInventoryFilter: (filter) =>
          set((state) => {
            state.inventoryFilter = filter;
          }),
        setMutationFilter: (filter) =>
          set((state) => {
            state.mutationFilter = filter;
          }),
        setRxViewMode: (mode) =>
          set((state) => {
            state.rxViewMode = mode;
          }),
        setRxSort: (sort) =>
          set((state) => {
            state.rxSort = sort;
          }),
        setInventorySort: (sort) =>
          set((state) => {
            state.inventorySort = sort;
          }),
        setMutationSort: (sort) =>
          set((state) => {
            state.mutationSort = sort;
          }),
        setActionLoadingId: (id) =>
          set((state) => {
            state.actionLoadingId = id;
          }),
        setSyncingId: (id) =>
          set((state) => {
            state.syncingId = id;
          }),
        setIsHydrated: (isHydrated) =>
          set((state) => {
            state.isHydrated = isHydrated;
          }),

        // Async API Actions
        loadWorklist: async () => {
          set((state) => {
            state.isLoadingWorklist = true;
          });
          try {
            const res = await fetch("/api/pharmacy/worklist");
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
              set((state) => {
                state.worklist = json.data;
              });
            }
          } catch (err) {
            console.error("Gagal memuat antrean resep farmasi:", err);
            toast.error("Gagal memuat antrean resep farmasi.");
          } finally {
            set((state) => {
              state.isLoadingWorklist = false;
            });
          }
        },

        loadInventory: async () => {
          set((state) => {
            state.isLoadingInventory = true;
          });
          try {
            const res = await fetch("/api/pharmacy/inventory");
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
              set((state) => {
                state.inventoryList = json.data;
              });
            }
          } catch (err) {
            console.error("Gagal memuat katalog stok obat gudang:", err);
            toast.error("Gagal memuat katalog stok obat gudang.");
          } finally {
            set((state) => {
              state.isLoadingInventory = false;
            });
          }
        },

        loadMutations: async () => {
          set((state) => {
            state.isLoadingMutations = true;
          });
          try {
            const res = await fetch("/api/pharmacy/mutations");
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
              set((state) => {
                state.mutations = json.data;
              });
            }
          } catch (err) {
            console.error("Gagal memuat riwayat mutasi stok:", err);
          } finally {
            set((state) => {
              state.isLoadingMutations = false;
            });
          }
        },

        loadAll: async () => {
          await Promise.all([
            get().loadWorklist(),
            get().loadInventory(),
            get().loadMutations(),
          ]);
        },

        // Workflow Handlers
        reviewPrescription: async (item, reviewerName) => {
          const rxId = item.prescription.id;
          if (!rxId) return false;
          set((state) => {
            state.actionLoadingId = rxId;
          });

          try {
            const res = await fetch("/api/pharmacy/dispense", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "review",
                prescriptionId: item.prescription.id,
                reviewerName,
              }),
            });
            const data = await res.json();
            if (data.success) {
              toast.success("Resep Berhasil Diverifikasi", {
                description: `${item.prescription.medicationName} telah lolos telaah 5-Benar.`,
              });
              await get().loadWorklist();
              return true;
            } else {
              toast.error(data.error || "Gagal telaah resep.");
              return false;
            }
          } catch {
            toast.error("Terjadi kesalahan jaringan.");
            return false;
          } finally {
            set((state) => {
              state.actionLoadingId = null;
            });
          }
        },

        preparePrescription: async (item, payload) => {
          const rxId = item.prescription.id;
          if (!rxId) {
            return { success: false, error: "ID Resep tidak ditemukan" };
          }
          set((state) => {
            state.actionLoadingId = rxId;
          });

          try {
            const res = await fetch("/api/pharmacy/dispense", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "prepare",
                prescriptionId: rxId,
                ...payload,
              }),
            });
            const data = await res.json();
            if (data.success) {
              toast.success("Obat Siap & Stok Berhasil Dipotong", {
                description: `Sisa stok obat: ${data.data?.stockAfter ?? 0} ${item.prescription.unit}`,
              });
              await Promise.all([
                get().loadWorklist(),
                get().loadInventory(),
                get().loadMutations(),
              ]);
              return { success: true, stockAfter: data.data?.stockAfter };
            } else {
              toast.error(data.error || "Gagal memproses peracikan obat.");
              return { success: false, error: data.error };
            }
          } catch {
            toast.error("Terjadi kesalahan jaringan.");
            return { success: false, error: "Network error" };
          } finally {
            set((state) => {
              state.actionLoadingId = null;
            });
          }
        },

        dispensePrescription: async (item, payload) => {
          const rxId = item.prescription.id;
          if (!rxId) {
            return { success: false, error: "ID Resep tidak ditemukan" };
          }
          set((state) => {
            state.actionLoadingId = rxId;
          });

          try {
            const res = await fetch("/api/pharmacy/dispense", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "dispense",
                prescriptionId: rxId,
                ...payload,
              }),
            });
            const data = await res.json();
            if (data.success) {
              if (data.data?.satusehatSynced) {
                toast.success("Obat Berhasil Diserahkan & Tersinkron SATUSEHAT!", {
                  description: `Resource MedicationDispense ID: ${data.data.satusehatDispenseId}`,
                });
              } else {
                toast.info("Obat Berhasil Diserahkan (Sinkronisasi SATUSEHAT Tertunda)", {
                  description: `Tersimpan secara lokal (${data.data?.satusehatDispenseId}). Anda dapat menyinkronkan ulang ke Kemenkes kapan saja.`,
                });
              }
              await Promise.all([
                get().loadWorklist(),
                get().loadInventory(),
                get().loadMutations(),
              ]);
              return {
                success: true,
                satusehatSynced: data.data?.satusehatSynced,
                satusehatDispenseId: data.data?.satusehatDispenseId,
              };
            } else {
              toast.error(data.error || "Gagal menyerahkan obat.");
              return { success: false, error: data.error };
            }
          } catch {
            toast.error("Terjadi kesalahan jaringan.");
            return { success: false, error: "Network error" };
          } finally {
            set((state) => {
              state.actionLoadingId = null;
            });
          }
        },

        syncSatusehat: async (item) => {
          const rxId = item.prescription.id;
          if (!rxId) {
            return { success: false, error: "ID Resep tidak ditemukan" };
          }
          set((state) => {
            state.syncingId = rxId;
          });

          try {
            const res = await fetch("/api/pharmacy/dispense", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "sync_satusehat",
                prescriptionId: rxId,
              }),
            });
            const data = await res.json();
            if (data.success) {
              if (!data.data?.isLocalFallback) {
                toast.success("Berhasil Tersinkron ke SATUSEHAT!", {
                  description: `ID Resmi MedicationDispense: ${data.data?.satusehatDispenseId}`,
                });
              } else {
                toast.warning("Gagal Menghubungi Gateway SATUSEHAT", {
                  description: data.data?.error || "Koneksi gateway Kemenkes gagal. ID lokal tetap dipertahankan.",
                });
              }
              await get().loadWorklist();
              return {
                success: true,
                satusehatDispenseId: data.data?.satusehatDispenseId,
                isLocalFallback: data.data?.isLocalFallback,
              };
            } else {
              toast.error(data.error || "Gagal menyinkronkan resep ke SATUSEHAT.");
              return { success: false, error: data.error };
            }
          } catch {
            toast.error("Terjadi gangguan jaringan saat sinkronisasi SATUSEHAT.");
            return { success: false, error: "Network error" };
          } finally {
            set((state) => {
              state.syncingId = null;
            });
          }
        },

        restockMedication: async (payload) => {
          set((state) => {
            state.actionLoadingId = payload.kfaCode;
          });

          try {
            const res = await fetch("/api/pharmacy/inventory", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "restock",
                ...payload,
              }),
            });
            const data = await res.json();
            if (data.success) {
              await Promise.all([
                get().loadInventory(),
                get().loadMutations(),
              ]);
              return { success: true, newStock: data.data?.newStock };
            } else {
              toast.error(data.error || "Gagal melakukan restock.");
              return { success: false, error: data.error };
            }
          } catch {
            toast.error("Terjadi kesalahan jaringan.");
            return { success: false, error: "Network error" };
          } finally {
            set((state) => {
              state.actionLoadingId = null;
            });
          }
        },

        adjustStock: async (payload) => {
          set((state) => {
            state.actionLoadingId = payload.kfaCode;
          });

          try {
            const res = await fetch("/api/pharmacy/inventory", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "adjustment",
                ...payload,
              }),
            });
            const data = await res.json();
            if (data.success) {
              await Promise.all([
                get().loadInventory(),
                get().loadMutations(),
              ]);
              return {
                success: true,
                oldStock: data.data?.oldStock,
                newStock: data.data?.newStock,
              };
            } else {
              toast.error(data.error || "Gagal melakukan penyesuaian stok.");
              return { success: false, error: data.error };
            }
          } catch {
            toast.error("Terjadi kesalahan jaringan.");
            return { success: false, error: "Network error" };
          } finally {
            set((state) => {
              state.actionLoadingId = null;
            });
          }
        },

        toggleMedicationActive: async (id, active) => {
          try {
            const res = await fetch("/api/pharmacy/inventory", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "toggle_active",
                id,
                active,
              }),
            });
            const data = await res.json();
            if (data.success) {
              await get().loadInventory();
              return { success: true, isActive: data.data?.isActive };
            } else {
              toast.error(data.error || "Gagal mengubah status obat.");
              return { success: false, error: data.error };
            }
          } catch {
            toast.error("Terjadi kesalahan jaringan.");
            return { success: false, error: "Network error" };
          }
        },
      })),
      {
        name: "medixia-pharmacy-store",
        storage: createJSONStorage(() => sessionStorage),
        // Filter & tab preferences dipersist ke sessionStorage agar apoteker tidak kehilangan konteks
        partialize: (state) => ({
          mainTab: state.mainTab,
          rxFilter: state.rxFilter,
          inventoryFilter: state.inventoryFilter,
          mutationFilter: state.mutationFilter,
          rxViewMode: state.rxViewMode,
          rxSort: state.rxSort,
          inventorySort: state.inventorySort,
          mutationSort: state.mutationSort,
        }),
        onRehydrateStorage: () => (state) => {
          state?.setIsHydrated(true);
        },
      }
    ),
    { name: "PharmacyStore" }
  )
);
