import { db } from "../index";
import { users, facilities, departments } from "../schema";
import { eq } from "drizzle-orm";
import { UserProfile, UserRole, FacilityType } from "@/lib/satusehat/types";
import { generatePrefixedId } from "@/lib/id-generator";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export const UserRepository = {
  async getByFacilityId(facilityId: string): Promise<UserProfile[]> {
    try {
      const rows = await db
        .select({
          id: users.id,
          facilityId: users.facilityId,
          departmentId: users.departmentId,
          username: users.username,
          name: users.name,
          role: users.role,
          sip: users.sip,
          ihsPractitionerId: users.ihsPractitionerId,
          department: departments.name,
          isActive: users.isActive,
          facilityName: facilities.name,
          facilityType: facilities.type,
        })
        .from(users)
        .leftJoin(facilities, eq(users.facilityId, facilities.id))
        .leftJoin(departments, eq(users.departmentId, departments.id))
        .where(eq(users.facilityId, facilityId));

      return rows.map((r) => ({
        id: r.id,
        facilityId: r.facilityId || undefined,
        departmentId: r.departmentId || undefined,
        username: r.username,
        name: r.name,
        role: r.role as UserRole,
        sip: r.sip || undefined,
        ihsPractitionerId: r.ihsPractitionerId || undefined,
        department: r.department || undefined,
        facilityName: r.facilityName || undefined,
        facilityType: (r.facilityType as FacilityType) || undefined,
        isActive: r.isActive,
      }));
    } catch (error) {
      console.error(`Gagal mengambil pengguna faskes ${facilityId}:`, error);
      const all = await this.getAll();
      return all.filter((u) => u.facilityId === facilityId);
    }
  },

  async create(data: {
    username: string;
    password?: string;
    name: string;
    role: UserRole;
    facilityId: string;
    departmentId?: string;
    sip?: string;
    ihsPractitionerId?: string;
  }): Promise<UserProfile | null> {
    try {
      const userId = generatePrefixedId("usr_");
      const now = new Date().toISOString();

      const hashedPassword = await hashPassword(data.password || "password123");
      await db.insert(users).values({
        id: userId,
        facilityId: data.facilityId,
        departmentId: data.departmentId || null,
        username: data.username.trim().toLowerCase(),
        passwordHash: hashedPassword,
        name: data.name.trim(),
        role: data.role,
        sip: data.sip || null,
        ihsPractitionerId: data.ihsPractitionerId || null,
        isActive: true,
        createdAt: now,
      });

      return this.getById(userId);
    } catch (error) {
      console.error("Gagal menambahkan pengguna baru:", error);
      return null;
    }
  },

  async update(id: string, data: Partial<UserProfile & { password?: string }>): Promise<UserProfile | null> {
    try {
      const updatePayload: Record<string, unknown> = {};
      if (data.name !== undefined) updatePayload.name = data.name;
      if (data.role !== undefined) updatePayload.role = data.role;
      if (data.departmentId !== undefined) updatePayload.departmentId = data.departmentId;
      if (data.sip !== undefined) updatePayload.sip = data.sip;
      if (data.ihsPractitionerId !== undefined) updatePayload.ihsPractitionerId = data.ihsPractitionerId;
      if (data.isActive !== undefined) updatePayload.isActive = data.isActive;
      if (data.password && data.password.trim().length > 0) {
        updatePayload.passwordHash = await hashPassword(data.password.trim());
      }

      await db.update(users).set(updatePayload).where(eq(users.id, id));
      return this.getById(id);
    } catch (error) {
      console.error(`Gagal memperbarui pengguna ${id}:`, error);
      return null;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error(`Gagal menghapus pengguna ${id}:`, error);
      return false;
    }
  },

  async getAll(): Promise<UserProfile[]> {
    try {
      const rows = await db
        .select({
          id: users.id,
          facilityId: users.facilityId,
          departmentId: users.departmentId,
          username: users.username,
          name: users.name,
          role: users.role,
          sip: users.sip,
          ihsPractitionerId: users.ihsPractitionerId,
          department: departments.name,
          isActive: users.isActive,
          facilityName: facilities.name,
          facilityType: facilities.type,
        })
        .from(users)
        .leftJoin(facilities, eq(users.facilityId, facilities.id))
        .leftJoin(departments, eq(users.departmentId, departments.id))
        .where(eq(users.isActive, true));

      return rows.map((r) => ({
        id: r.id,
        facilityId: r.facilityId || undefined,
        departmentId: r.departmentId || undefined,
        username: r.username,
        name: r.name,
        role: r.role as UserRole,
        sip: r.sip || undefined,
        ihsPractitionerId: r.ihsPractitionerId || undefined,
        department: r.department || undefined,
        facilityName: r.facilityName || undefined,
        facilityType: (r.facilityType as FacilityType) || undefined,
        isActive: r.isActive,
      }));
    } catch (error) {
      console.error("Gagal mengambil daftar pengguna dari DB:", error);
      // Fallback default 3 core users
      return [
        {
          id: "usr-admin",
          facilityId: "fac-rsud-01",
          username: "admin",
          name: "Administrator SIMRS",
          role: "admin",
          department: "Instalasi SIMRS & TI",
          facilityName: "RS Umum Daerah Sehat Sejahtera",
          facilityType: "rumah_sakit",
          isActive: true,
        },
        {
          id: "usr-dr-rian",
          facilityId: "fac-rsud-01",
          departmentId: "dept-rs-01",
          username: "dr.rian",
          name: "dr. Rian Pratama, Sp.PD",
          role: "doctor",
          sip: "SIP.446/089/DS/Dinkes/2026",
          ihsPractitionerId: "N10000001",
          department: "Poli Penyakit Dalam",
          facilityName: "RS Umum Daerah Sehat Sejahtera",
          facilityType: "rumah_sakit",
          isActive: true,
        },
        {
          id: "usr-nurse-siti",
          facilityId: "fac-rsud-01",
          departmentId: "dept-rs-01",
          username: "ns.siti",
          name: "Ns. Siti Rahmawati, S.Kep",
          role: "nurse",
          sip: "SIP.446/102/SKEP/Dinkes/2026",
          ihsPractitionerId: "N10000001",
          department: "Poli Penyakit Dalam",
          facilityName: "RS Umum Daerah Sehat Sejahtera",
          facilityType: "rumah_sakit",
          isActive: true,
        },
      ];
    }
  },

  async getById(id: string): Promise<UserProfile | null> {
    try {
      const rows = await db
        .select({
          id: users.id,
          facilityId: users.facilityId,
          departmentId: users.departmentId,
          username: users.username,
          name: users.name,
          role: users.role,
          sip: users.sip,
          ihsPractitionerId: users.ihsPractitionerId,
          department: departments.name,
          isActive: users.isActive,
          facilityName: facilities.name,
          facilityType: facilities.type,
        })
        .from(users)
        .leftJoin(facilities, eq(users.facilityId, facilities.id))
        .leftJoin(departments, eq(users.departmentId, departments.id))
        .where(eq(users.id, id))
        .limit(1);

      if (!rows[0]) return null;
      const r = rows[0];

      return {
        id: r.id,
        facilityId: r.facilityId || undefined,
        departmentId: r.departmentId || undefined,
        username: r.username,
        name: r.name,
        role: r.role as UserRole,
        sip: r.sip || undefined,
        ihsPractitionerId: r.ihsPractitionerId || undefined,
        department: r.department || undefined,
        facilityName: r.facilityName || undefined,
        facilityType: (r.facilityType as FacilityType) || undefined,
        isActive: r.isActive,
      };
    } catch (error) {
      console.error(`Gagal mengambil pengguna ${id}:`, error);
      return null;
    }
  },

  async authenticate(username: string, passwordAttempt: string): Promise<UserProfile | null> {
    try {
      const cleanUsername = username.trim().toLowerCase();
      const rows = await db
        .select({
          id: users.id,
          facilityId: users.facilityId,
          departmentId: users.departmentId,
          username: users.username,
          passwordHash: users.passwordHash,
          name: users.name,
          role: users.role,
          sip: users.sip,
          ihsPractitionerId: users.ihsPractitionerId,
          department: departments.name,
          isActive: users.isActive,
          facilityName: facilities.name,
          facilityType: facilities.type,
        })
        .from(users)
        .leftJoin(facilities, eq(users.facilityId, facilities.id))
        .leftJoin(departments, eq(users.departmentId, departments.id))
        .where(eq(users.isActive, true));

      const matched = rows.find((r) => {
        const u = r.username.toLowerCase();
        return (
          u === cleanUsername ||
          ((cleanUsername === "admin" || cleanUsername === "admin.rsud") && (u === "admin" || u === "admin.rsud")) ||
          ((cleanUsername === "dokter" || cleanUsername === "dr.rian") && (u === "dokter" || u === "dr.rian")) ||
          ((cleanUsername === "perawat" || cleanUsername === "ns.siti") && (u === "perawat" || u === "ns.siti"))
        );
      });

      if (!matched) return null;

      // Verifikasi kata sandi dengan hash bcrypt (aman & anti-bypass)
      const p = passwordAttempt.trim();
      const validPass = await verifyPassword(p, matched.passwordHash);

      if (!validPass) {
        return null;
      }

      return {
        id: matched.id,
        facilityId: matched.facilityId || undefined,
        departmentId: matched.departmentId || undefined,
        username: matched.username,
        name: matched.name,
        role: matched.role as UserRole,
        sip: matched.sip || undefined,
        ihsPractitionerId: matched.ihsPractitionerId || undefined,
        department: matched.department || undefined,
        facilityName: matched.facilityName || undefined,
        facilityType: (matched.facilityType as FacilityType) || undefined,
        isActive: matched.isActive,
      };
    } catch (error) {
      console.error(`Gagal autentikasi pengguna ${username}:`, error);
      return null;
    }
  },
};
