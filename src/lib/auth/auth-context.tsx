"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserProfile, UserRole, FacilityProfile, DepartmentItem } from "@/lib/satusehat/types";
import { toast } from "sonner";

interface AuthContextType {
  user: UserProfile | null;
  facility: FacilityProfile | null;
  allFacilities: FacilityProfile[];
  departments: DepartmentItem[];
  isLoading: boolean;
  login: (username: string, passwordAttempt: string) => Promise<boolean>;
  switchFacility: (facilityId: string) => Promise<void>;
  refreshFacilities: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [facility, setFacility] = useState<FacilityProfile | null>(null);
  const [allFacilities, setAllFacilities] = useState<FacilityProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load session & facilities on mount
  useEffect(() => {
    async function initSession() {
      try {
        setIsLoading(true);

        // Fetch facilities
        const facRes = await fetch("/api/facilities");
        if (facRes.ok) {
          const text = await facRes.text();
          if (text) {
            try {
              const facData = JSON.parse(text);
              if (facData.success && facData.data?.length > 0) {
                setAllFacilities(facData.data);
              }
            } catch {
              // Ignored during dev hot reload
            }
          }
        }

        // Fetch current session
        const authRes = await fetch("/api/auth/me");
        if (authRes.ok) {
          const authText = await authRes.text();
          if (authText) {
            try {
              const authData = JSON.parse(authText);
              if (authData.success && authData.data) {
                if (authData.data.user) setUser(authData.data.user);
                if (authData.data.facility) setFacility(authData.data.facility);
              }
            } catch {
              // Ignored during dev hot reload
            }
          }
        } else {
          setUser(null);
          setFacility(null);
        }
      } catch (err) {
        console.warn("Gagal inisialisasi sesi auth:", err);
        setUser(null);
        setFacility(null);
      } finally {
        setIsLoading(false);
      }
    }

    initSession();
  }, []);

  const isLoggingInRef = React.useRef(false);

  const login = async (username: string, passwordAttempt: string): Promise<boolean> => {
    if (isLoggingInRef.current) {
      return false;
    }

    try {
      isLoggingInRef.current = true;
      setIsLoading(true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: passwordAttempt }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setUser(data.data.user);
        setFacility(data.data.facility);
        toast.success(`Login Berhasil: ${data.data.user.name}`, {
          description: `Peran: ${data.data.user.role.toUpperCase()} • Faskes: ${data.data.facility?.name}`,
        });
        return true;
      } else {
        toast.error(data.error || "Gagal login. Periksa username dan password.");
        return false;
      }
    } catch {
      toast.error("Terjadi gangguan koneksi saat login.");
      return false;
    } finally {
      setIsLoading(false);
      isLoggingInRef.current = false;
    }
  };

  const switchFacility = async (facilityId: string) => {
    try {
      const targetFac = allFacilities.find((f) => f.id === facilityId);
      if (!targetFac) return;

      setFacility(targetFac);
      if (user) {
        setUser({
          ...user,
          facilityId: targetFac.id,
          facilityName: targetFac.name,
          facilityType: targetFac.type,
        });
      }

      toast.success(`Faskes Aktif: ${targetFac.name}`, {
        description: `Tipe: ${targetFac.type === "rumah_sakit" ? "Rumah Sakit" : "Klinik Pratama"} • Org ID: ${targetFac.satusehatOrgId}`,
      });
    } catch (err) {
      console.error("Gagal beralih faskes:", err);
    }
  };

  const refreshFacilities = async () => {
    try {
      const facRes = await fetch("/api/facilities");
      const facData = await facRes.json();
      if (facData.success && facData.data?.length > 0) {
        setAllFacilities(facData.data);
      }
    } catch (err) {
      console.error("Gagal memperbarui daftar faskes:", err);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setFacility(null);
      toast.info("Anda telah berhasil keluar dari sistem.");
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    } catch {
      setUser(null);
      setFacility(null);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  };

  const departments = facility?.departments || [];

  return (
    <AuthContext.Provider
      value={{
        user,
        facility,
        allFacilities,
        departments,
        isLoading,
        login,
        switchFacility,
        refreshFacilities,
        logout,
      }}
    >
      {children}
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
