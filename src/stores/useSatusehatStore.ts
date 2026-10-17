"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { AuthSession, SatusehatEnvironment } from "@/lib/satusehat/types";
import { LogEntry } from "@/components/auth/RequestLogs";

export interface SatusehatState {
  session: AuthSession | null;
  logs: LogEntry[];
  currentEnv: SatusehatEnvironment;
  isRefreshing: boolean;

  // Actions
  setSession: (session: AuthSession | null) => void;
  setCurrentEnv: (env: SatusehatEnvironment) => void;
  setRefreshing: (isRefreshing: boolean) => void;
  addLog: (entry: LogEntry) => void;
  clearLogs: () => void;
  fetchSession: () => Promise<AuthSession | null>;
}

export const useSatusehatStore = create<SatusehatState>()(
  devtools(
    (set, get) => ({
      session: null,
      logs: [],
      currentEnv:
        (process.env.NEXT_PUBLIC_SATUSEHAT_ENV as SatusehatEnvironment) || "staging",
      isRefreshing: false,

      setSession: (session) =>
        set({ session }, undefined, "satusehat/setSession"),

      setCurrentEnv: (currentEnv) =>
        set({ currentEnv }, undefined, "satusehat/setCurrentEnv"),

      setRefreshing: (isRefreshing) =>
        set({ isRefreshing }, undefined, "satusehat/setRefreshing"),

      addLog: (entry) =>
        set(
          (state) => ({ logs: [entry, ...state.logs].slice(0, 50) }),
          undefined,
          "satusehat/addLog"
        ),

      clearLogs: () =>
        set({ logs: [] }, undefined, "satusehat/clearLogs"),

      fetchSession: async () => {
        try {
          set({ isRefreshing: true }, undefined, "satusehat/fetchStart");
          const res = await fetch("/api/satusehat/auth", { cache: "no-store" });
          const data = await res.json();
          if (data.success && data.data) {
            set(
              (state) => ({
                session: data.data,
                currentEnv: data.data.env || state.currentEnv,
                isRefreshing: false,
              }),
              undefined,
              "satusehat/fetchSuccess"
            );
            return data.data;
          } else {
            set({ isRefreshing: false }, undefined, "satusehat/fetchFailed");
            return null;
          }
        } catch (err) {
          console.warn("Auto SATUSEHAT handshake error in store:", err);
          set({ isRefreshing: false }, undefined, "satusehat/fetchError");
          return null;
        }
      },
    }),
    { name: "MedixiaSatusehatStore", enabled: process.env.NODE_ENV === "development" }
  )
);

// Convenience Selectors
export const selectIsBridgingActive = (state: SatusehatState): boolean =>
  Boolean(state.session?.accessToken && state.session.expiresAt > Date.now());
