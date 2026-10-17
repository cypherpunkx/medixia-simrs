"use client";

import React, { createContext, useContext, useEffect } from "react";
import { UserProfile, FacilityProfile, DepartmentItem } from "@/lib/satusehat/types";
import { useAuthStore } from "@/stores/useAuthStore";
import { Activity, Loader2 } from "lucide-react";
import { useShallow } from "zustand/shallow";

export interface AuthContextType {
  user: UserProfile | null;
  facility: FacilityProfile | null;
  allFacilities: FacilityProfile[];
  departments: DepartmentItem[];
  isLoading: boolean;
  isLoggingOut: boolean;
  login: (username: string, passwordAttempt: string) => Promise<UserProfile | null>;
  switchFacility: (facilityId: string) => Promise<void>;
  refreshFacilities: (includeAll?: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    user,
    facility,
    allFacilities,
    isLoading,
    isLoggingOut,
    login,
    switchFacility,
    refreshFacilities,
    logout,
    initSession,
  } = useAuthStore(
    useShallow((s) => ({
      user: s.user,
      facility: s.facility,
      allFacilities: s.allFacilities,
      isLoading: s.isLoading,
      isLoggingOut: s.isLoggingOut,
      login: s.login,
      switchFacility: s.switchFacility,
      refreshFacilities: s.refreshFacilities,
      logout: s.logout,
      initSession: s.initSession,
    }))
  );

  useEffect(() => {
    initSession();
  }, [initSession]);

  const departments = facility?.departments || [];

  return (
    <AuthContext.Provider
      value={{
        user,
        facility,
        allFacilities,
        departments,
        isLoading,
        isLoggingOut,
        login,
        switchFacility,
        refreshFacilities,
        logout,
      }}
    >
      {children}

      {/* Global Logout Transition */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[9999] min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center space-y-3 select-none animate-in fade-in duration-200">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md">
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
            <span>Sesi diakhiri. Mengarahkan ke halaman login...</span>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
