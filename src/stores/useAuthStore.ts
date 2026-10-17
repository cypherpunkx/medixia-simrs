"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
  UserProfile,
  FacilityProfile,
  DepartmentItem,
} from "@/lib/satusehat/types";
import { toast } from "sonner";

export interface AuthState {
  user: UserProfile | null;
  facility: FacilityProfile | null;
  allFacilities: FacilityProfile[];
  isLoading: boolean;
  isLoggingOut: boolean;

  // Actions
  setUser: (user: UserProfile | null) => void;
  setFacility: (facility: FacilityProfile | null) => void;
  setAllFacilities: (facilities: FacilityProfile[]) => void;
  initSession: () => Promise<void>;
  login: (username: string, passwordAttempt: string) => Promise<UserProfile | null>;
  switchFacility: (facilityId: string) => Promise<void>;
  refreshFacilities: (includeAll?: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

let isLoggingIn = false;

export const useAuthStore = create<AuthState>()(
  devtools(
    (set, get) => ({
      user: null,
      facility: null,
      allFacilities: [],
      isLoading: true,
      isLoggingOut: false,

      setUser: (user) => set({ user }, undefined, "auth/setUser"),
      setFacility: (facility) => set({ facility }, undefined, "auth/setFacility"),
      setAllFacilities: (allFacilities) =>
        set({ allFacilities }, undefined, "auth/setAllFacilities"),

      initSession: async () => {
        try {
          set({ isLoading: true }, undefined, "auth/initStart");

          let currentUserRole: string | null = null;
          const authRes = await fetch("/api/auth/me");
          if (authRes.ok) {
            const authText = await authRes.text();
            if (authText) {
              try {
                const authData = JSON.parse(authText);
                if (authData.success && authData.data) {
                  if (authData.data.user) {
                    set({ user: authData.data.user }, undefined, "auth/setUserFromMe");
                    currentUserRole = authData.data.user.role;
                  }
                  if (authData.data.facility) {
                    set(
                      { facility: authData.data.facility },
                      undefined,
                      "auth/setFacilityFromMe"
                    );
                  }
                }
              } catch {
                // Hot reload safe
              }
            }
          } else {
            set({ user: null, facility: null }, undefined, "auth/clearAuth");
          }

          const shouldLoadAll =
            currentUserRole === "super_admin" ||
            (typeof window !== "undefined" &&
              window.location.pathname.startsWith("/admin"));

          const facRes = await fetch(
            shouldLoadAll ? "/api/facilities?all=true" : "/api/facilities"
          );
          if (facRes.ok) {
            const text = await facRes.text();
            if (text) {
              try {
                const facData = JSON.parse(text);
                if (facData.success && Array.isArray(facData.data)) {
                  set(
                    { allFacilities: facData.data },
                    undefined,
                    "auth/setAllFacilities"
                  );
                }
              } catch {
                // Hot reload safe
              }
            }
          }
        } catch (err) {
          console.warn("Gagal inisialisasi sesi auth di store:", err);
          set({ user: null, facility: null }, undefined, "auth/initError");
        } finally {
          set({ isLoading: false }, undefined, "auth/initEnd");
        }
      },

      login: async (username: string, passwordAttempt: string) => {
        if (isLoggingIn) return null;

        try {
          isLoggingIn = true;
          set({ isLoading: true }, undefined, "auth/loginStart");

          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password: passwordAttempt }),
          });

          const data = await res.json();
          if (data.success && data.data) {
            set(
              {
                user: data.data.user,
                facility: data.data.facility,
                isLoading: false,
              },
              undefined,
              "auth/loginSuccess"
            );
            toast.success(`Login Berhasil: ${data.data.user.name}`, {
              description: data.data.facility?.name
                ? `Faskes: ${data.data.facility.name}`
                : undefined,
            });
            return data.data.user;
          } else {
            set({ isLoading: false }, undefined, "auth/loginFailed");
            toast.error(
              data.error || "Gagal login. Periksa username dan password."
            );
            return null;
          }
        } catch {
          set({ isLoading: false }, undefined, "auth/loginError");
          toast.error("Terjadi gangguan koneksi saat login.");
          return null;
        } finally {
          isLoggingIn = false;
        }
      },

      switchFacility: async (facilityId: string) => {
        try {
          const { allFacilities, user } = get();
          const targetFac = allFacilities.find((f) => f.id === facilityId);
          if (!targetFac) return;

          if (targetFac.isActive === false && user?.role !== "super_admin") {
            toast.error(
              "Akses Ditolak: Faskes ini sedang dinonaktifkan / diarsipkan.",
              {
                description:
                  "Staf non-vendor tidak dapat membuka sesi pelayanan faskes yang tidak aktif.",
              }
            );
            return;
          }

          set({ facility: targetFac }, undefined, "auth/switchFacility");

          if (user) {
            set(
              {
                user: {
                  ...user,
                  facilityId: targetFac.id,
                  facilityName: targetFac.name,
                  facilityType: targetFac.type,
                },
              },
              undefined,
              "auth/updateUserFacility"
            );
          }

          if (targetFac.isActive === false) {
            toast.warning(`Mode Arsip Aktif: ${targetFac.name}`, {
              description:
                "Faskes berstatus nonaktif. Akses dibuka dalam mode inspeksi arsip (Read-Only).",
            });
          } else {
            toast.success(`Faskes Aktif: ${targetFac.name}`, {
              description: `Tipe: ${
                targetFac.type === "rumah_sakit"
                  ? "Rumah Sakit"
                  : "Klinik Pratama"
              } • Org ID: ${targetFac.satusehatOrgId}`,
            });
          }
        } catch (err) {
          console.error("Gagal beralih faskes di store:", err);
        }
      },

      refreshFacilities: async (includeAll: boolean = false) => {
        try {
          const url = includeAll
            ? "/api/facilities?all=true"
            : "/api/facilities";
          const facRes = await fetch(url);
          const facData = await facRes.json();
          if (facData.success && Array.isArray(facData.data)) {
            set(
              { allFacilities: facData.data },
              undefined,
              "auth/refreshFacilities"
            );
          }
        } catch (err) {
          console.error("Gagal memperbarui daftar faskes di store:", err);
        }
      },

      logout: async () => {
        const { isLoggingOut } = get();
        if (isLoggingOut) return;

        set({ isLoggingOut: true }, undefined, "auth/logoutStart");

        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch (err) {
          console.error("Gagal memanggil endpoint logout:", err);
        } finally {
          set(
            { user: null, facility: null },
            undefined,
            "auth/logoutComplete"
          );
          toast.info("Anda telah berhasil keluar dari sistem.");

          setTimeout(() => {
            if (typeof window !== "undefined") {
              if (window.location.pathname.startsWith("/admin")) {
                window.location.href = "/admin/login";
              } else {
                window.location.href = "/login";
              }
            }
          }, 700);
        }
      },
    }),
    { name: "MedixiaAuthStore", enabled: process.env.NODE_ENV === "development" }
  )
);

// Convenience Selectors
export const selectDepartments = (state: AuthState): DepartmentItem[] =>
  state.facility?.departments || [];
export const selectIsAuthenticated = (state: AuthState): boolean =>
  Boolean(state.user);
export const selectUserRole = (state: AuthState) => state.user?.role;
