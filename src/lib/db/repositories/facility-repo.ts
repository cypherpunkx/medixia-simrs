import { db } from "../index";
import { facilities, departments, users } from "../schema";
import { eq, asc } from "drizzle-orm";
import { FacilityProfile, DepartmentItem, FacilityType, SatusehatEnvironment } from "@/lib/satusehat/types";
import { generatePrefixedId } from "@/lib/id-generator";
import { encryptSecret, decryptSecret, maskClientSecret } from "@/lib/auth/encryption";
import { hashPassword } from "@/lib/auth/password";

export const FacilityRepository = {
  async getAll(includeInactive: boolean = false): Promise<FacilityProfile[]> {
    try {
      const facRows = includeInactive
        ? await db
            .select()
            .from(facilities)
            .orderBy(asc(facilities.name))
        : await db
            .select()
            .from(facilities)
            .where(eq(facilities.isActive, true))
            .orderBy(asc(facilities.name));

      const result: FacilityProfile[] = [];

      for (const f of facRows) {
        const deptRows = await db
          .select()
          .from(departments)
          .where(eq(departments.facilityId, f.id))
          .orderBy(asc(departments.name));

        const depts: DepartmentItem[] = deptRows.map((d) => ({
          id: d.id,
          facilityId: d.facilityId,
          code: d.code,
          queuePrefix: d.queuePrefix,
          name: d.name,
          room: d.room,
          quota: d.quota,
          defaultDoctorName: d.defaultDoctorName || undefined,
          isActive: d.isActive,
          satusehatLocationId: d.satusehatLocationId || (d.code ? `LOC-${f.satusehatOrgId || "SS"}-${d.code}` : `LOC-${d.id.toUpperCase()}`),
        }));

        let maskedSecret = "-";
        if (f.satusehatClientSecretEnc) {
          const plain = decryptSecret(f.satusehatClientSecretEnc);
          maskedSecret = maskClientSecret(plain);
        }

        result.push({
          id: f.id,
          name: f.name,
          type: f.type as FacilityType,
          satusehatOrgId: f.satusehatOrgId,
          satusehatClientId: f.satusehatClientId || undefined,
          satusehatClientSecretEnc: f.satusehatClientSecretEnc || undefined,
          satusehatClientSecretMasked: maskedSecret,
          satusehatEnv: (f.satusehatEnv as SatusehatEnvironment) || "staging",
          satusehatStatus: (f.satusehatStatus as "connected" | "unverified" | "error") || "unverified",
          satusehatLastTestedAt: f.satusehatLastTestedAt || undefined,
          address: f.address || "",
          phone: f.phone || "",
          licenseNumber: f.licenseNumber || "",
          isActive: f.isActive,
          departments: depts,
        });
      }

      return result;
    } catch (error) {
      console.error("Gagal mengambil daftar faskes dari DB:", error);
      // Fallback default
      return [
        {
          id: "fac-rsud-01",
          name: "RS Umum Daerah Sehat Sejahtera",
          type: "rumah_sakit",
          satusehatOrgId: "10000004",
          satusehatEnv: "staging",
          satusehatStatus: "connected",
          address: "Jl. Kesehatan Medika No. 45, Jakarta Pusat",
          phone: "021-5550199",
          licenseNumber: "440/012/Dinkes/RS-B/2024",
          isActive: true,
          departments: [
            { id: "dept-rs-01", facilityId: "fac-rsud-01", code: "INT", queuePrefix: "A", name: "Poli Penyakit Dalam", room: "Ruang 204 (Lt. 2)", quota: 35, defaultDoctorName: "dr. Rian Pratama, Sp.PD", isActive: true, satusehatLocationId: "LOC-10000004-INT" },
            { id: "dept-rs-02", facilityId: "fac-rsud-01", code: "UMU", queuePrefix: "B", name: "Poli Umum", room: "Ruang 101 (Lt. 1)", quota: 50, defaultDoctorName: "dr. Amanda Putri, M.Biomed", isActive: true, satusehatLocationId: "LOC-10000004-UMU" },
            { id: "dept-rs-03", facilityId: "fac-rsud-01", code: "ANA", queuePrefix: "C", name: "Poli Anak", room: "Ruang 208 (Lt. 2)", quota: 30, defaultDoctorName: "dr. Sarah Amanda, Sp.A", isActive: true, satusehatLocationId: "LOC-10000004-ANA" },
            { id: "dept-rs-04", facilityId: "fac-rsud-01", code: "GIG", queuePrefix: "D", name: "Poli Gigi & Mulut", room: "Ruang 105 (Lt. 1)", quota: 25, defaultDoctorName: "drg. Hendra Wijaya", isActive: true, satusehatLocationId: "LOC-10000004-GIG" },
            { id: "dept-rs-05", facilityId: "fac-rsud-01", code: "JAN", queuePrefix: "E", name: "Poli Jantung & Pembuluh Darah", room: "Ruang 301 (Lt. 3)", quota: 20, defaultDoctorName: "dr. Maya Kartika, Sp.JP", isActive: true, satusehatLocationId: "LOC-10000004-JAN" },
            { id: "dept-rs-06", facilityId: "fac-rsud-01", code: "MAT", queuePrefix: "F", name: "Poli Mata", room: "Ruang 107 (Lt. 1)", quota: 25, defaultDoctorName: "dr. Budi Setiawan, Sp.M", isActive: true, satusehatLocationId: "LOC-10000004-MAT" },
          ],
        },
      ];
    }
  },

  async getById(id: string): Promise<FacilityProfile | null> {
    try {
      const facRows = await db
        .select()
        .from(facilities)
        .where(eq(facilities.id, id))
        .limit(1);

      if (!facRows[0]) return null;

      const f = facRows[0];
      const deptRows = await db
        .select()
        .from(departments)
        .where(eq(departments.facilityId, f.id))
        .orderBy(asc(departments.name));

      const depts: DepartmentItem[] = deptRows.map((d) => ({
        id: d.id,
        facilityId: d.facilityId,
        code: d.code,
        queuePrefix: d.queuePrefix,
        name: d.name,
        room: d.room,
        quota: d.quota,
        defaultDoctorName: d.defaultDoctorName || undefined,
        isActive: d.isActive,
        satusehatLocationId: d.satusehatLocationId || (d.code ? `LOC-${f.satusehatOrgId || "SS"}-${d.code}` : `LOC-${d.id.toUpperCase()}`),
      }));

      let maskedSecret = "-";
      if (f.satusehatClientSecretEnc) {
        const plain = decryptSecret(f.satusehatClientSecretEnc);
        maskedSecret = maskClientSecret(plain);
      }

      return {
        id: f.id,
        name: f.name,
        type: f.type as FacilityType,
        satusehatOrgId: f.satusehatOrgId,
        satusehatClientId: f.satusehatClientId || undefined,
        satusehatClientSecretEnc: f.satusehatClientSecretEnc || undefined,
        satusehatClientSecretMasked: maskedSecret,
        satusehatEnv: (f.satusehatEnv as SatusehatEnvironment) || "staging",
        satusehatStatus: (f.satusehatStatus as "connected" | "unverified" | "error") || "unverified",
        satusehatLastTestedAt: f.satusehatLastTestedAt || undefined,
        address: f.address || "",
        phone: f.phone || "",
        licenseNumber: f.licenseNumber || "",
        isActive: f.isActive,
        departments: depts,
      };
    } catch (error) {
      console.error(`Gagal mengambil faskes ${id}:`, error);
      return null;
    }
  },

  /**
   * Mengambil kredensial SATUSEHAT faskes yang telah didekripsi secara aman untuk keperluan pemanggilan API Kemenkes
   */
  async getDecryptedCredentials(facilityId: string): Promise<{
    orgId: string;
    clientId: string;
    clientSecret: string;
    env: SatusehatEnvironment;
  } | null> {
    try {
      const facRows = await db
        .select()
        .from(facilities)
        .where(eq(facilities.id, facilityId))
        .limit(1);

      if (!facRows[0]) return null;
      const f = facRows[0];

      const clientSecret = f.satusehatClientSecretEnc
        ? decryptSecret(f.satusehatClientSecretEnc)
        : "";

      return {
        orgId: f.satusehatOrgId,
        clientId: f.satusehatClientId || "",
        clientSecret,
        env: (f.satusehatEnv as SatusehatEnvironment) || "staging",
      };
    } catch (error) {
      console.error(`Gagal membaca kredensial terdekripsi untuk faskes ${facilityId}:`, error);
      return null;
    }
  },

  async updateSatusehatStatus(
    facilityId: string,
    status: "connected" | "unverified" | "error",
    testedAt: string = new Date().toISOString()
  ): Promise<boolean> {
    try {
      await db
        .update(facilities)
        .set({
          satusehatStatus: status,
          satusehatLastTestedAt: testedAt,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(facilities.id, facilityId));
      return true;
    } catch (error) {
      console.error(`Gagal memperbarui status SATUSEHAT faskes ${facilityId}:`, error);
      return false;
    }
  },

  async create(
    data: Omit<FacilityProfile, "id"> & {
      id?: string;
      adminUser?: { name: string; username: string; password?: string };
    }
  ): Promise<FacilityProfile | null> {
    try {
      const facId = data.id || generatePrefixedId("fac_");
      const now = new Date().toISOString();

      // Validasi awal keunikan username admin jika disertakan
      let cleanAdminUsername: string | null = null;
      let hashedAdminPassword = "password123";
      if (data.adminUser && data.adminUser.username) {
        cleanAdminUsername = data.adminUser.username.trim().toLowerCase();
        const existingUser = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.username, cleanAdminUsername))
          .limit(1);

        if (existingUser.length > 0) {
          throw new Error(
            `Username login '${cleanAdminUsername}' sudah digunakan oleh pengguna lain di sistem. Silakan gunakan username lain (misalnya: admin.${data.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15)} atau nama admin).`
          );
        }

        hashedAdminPassword = await hashPassword(data.adminUser.password?.trim() || "password123");
      }

      let clientSecretEnc: string | null = null;
      if (data.satusehatClientSecret && data.satusehatClientSecret.trim().length > 0) {
        clientSecretEnc = encryptSecret(data.satusehatClientSecret.trim());
      } else if (data.satusehatClientSecretEnc) {
        clientSecretEnc = data.satusehatClientSecretEnc;
      }

      // Gunakan Transaction database agar seluruh operasi (Faskes, Poli, Admin) bersifat atomik
      await db.transaction(async (tx) => {
        // 1. Insert Fasilitas
        await tx.insert(facilities).values({
          id: facId,
          name: data.name,
          type: data.type,
          satusehatOrgId: data.satusehatOrgId,
          satusehatClientId: data.satusehatClientId || null,
          satusehatClientSecretEnc: clientSecretEnc,
          satusehatEnv: data.satusehatEnv || "staging",
          satusehatStatus: data.satusehatStatus || "unverified",
          satusehatLastTestedAt: data.satusehatLastTestedAt || null,
          address: data.address || "",
          phone: data.phone || "",
          licenseNumber: data.licenseNumber || "",
          isActive: data.isActive !== undefined ? data.isActive : true,
          createdAt: now,
          updatedAt: now,
        });

        // 2. Insert Departemen / Poliklinik Bawaan
        if (data.departments && data.departments.length > 0) {
          for (const dept of data.departments) {
            const deptCode = dept.code?.trim().toUpperCase() || dept.name.substring(0, 3).toUpperCase();
            const locationId = dept.satusehatLocationId || `LOC-${data.satusehatOrgId || "SS"}-${deptCode}`;
            await tx.insert(departments).values({
              id: dept.id || generatePrefixedId("dept_"),
              facilityId: facId,
              code: deptCode,
              queuePrefix: dept.queuePrefix?.trim().toUpperCase() || "A",
              name: dept.name,
              room: dept.room || "Ruang Periksa 1",
              quota: dept.quota || 30,
              defaultDoctorName: dept.defaultDoctorName || null,
              satusehatLocationId: locationId,
              isActive: dept.isActive !== undefined ? dept.isActive : true,
              createdAt: now,
            });
          }
        }

        // 3. Inisialisasi Akun Administrator Pertama Faskes
        if (cleanAdminUsername) {
          const userId = generatePrefixedId("usr_");
          await tx.insert(users).values({
            id: userId,
            facilityId: facId,
            username: cleanAdminUsername,
            passwordHash: hashedAdminPassword,
            name: data.adminUser?.name || `Admin ${data.name}`,
            role: "admin",
            isActive: true,
            createdAt: now,
          });
        }
      });

      return this.getById(facId);
    } catch (error) {
      console.error("Gagal menambahkan faskes baru:", error);
      throw error;
    }
  },

  async update(id: string, data: Partial<FacilityProfile>): Promise<FacilityProfile | null> {
    try {
      const updatePayload: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };
      if (data.name !== undefined) updatePayload.name = data.name;
      if (data.type !== undefined) updatePayload.type = data.type;
      if (data.satusehatOrgId !== undefined) updatePayload.satusehatOrgId = data.satusehatOrgId;
      if (data.satusehatClientId !== undefined) updatePayload.satusehatClientId = data.satusehatClientId;
      if (data.satusehatClientSecret && data.satusehatClientSecret.trim().length > 0) {
        updatePayload.satusehatClientSecretEnc = encryptSecret(data.satusehatClientSecret.trim());
      }
      if (data.satusehatEnv !== undefined) updatePayload.satusehatEnv = data.satusehatEnv;
      if (data.satusehatStatus !== undefined) updatePayload.satusehatStatus = data.satusehatStatus;
      if (data.satusehatLastTestedAt !== undefined) updatePayload.satusehatLastTestedAt = data.satusehatLastTestedAt;
      if (data.address !== undefined) updatePayload.address = data.address;
      if (data.phone !== undefined) updatePayload.phone = data.phone;
      if (data.licenseNumber !== undefined) updatePayload.licenseNumber = data.licenseNumber;
      if (data.isActive !== undefined) updatePayload.isActive = data.isActive;

      await db
        .update(facilities)
        .set(updatePayload)
        .where(eq(facilities.id, id));

      return this.getById(id);
    } catch (error) {
      console.error(`Gagal memperbarui faskes ${id}:`, error);
      return null;
    }
  },

  async addDepartment(facilityId: string, data: { name: string; code?: string; queuePrefix?: string; room?: string; quota?: number; defaultDoctorName?: string; satusehatLocationId?: string }): Promise<DepartmentItem | null> {
    try {
      const deptId = generatePrefixedId("dept_");
      const now = new Date().toISOString();
      const code = data.code?.trim().toUpperCase() || data.name.trim().substring(0, 3).toUpperCase();
      const queuePrefix = data.queuePrefix?.trim().toUpperCase() || "A";

      await db.insert(departments).values({
        id: deptId,
        facilityId,
        code,
        queuePrefix,
        name: data.name.trim(),
        room: data.room?.trim() || "Ruang Periksa 1",
        quota: data.quota || 30,
        defaultDoctorName: data.defaultDoctorName?.trim() || null,
        satusehatLocationId: data.satusehatLocationId?.trim() || null,
        isActive: true,
        createdAt: now,
      });

      return {
        id: deptId,
        facilityId,
        code,
        queuePrefix,
        name: data.name.trim(),
        room: data.room?.trim() || "Ruang Periksa 1",
        quota: data.quota || 30,
        defaultDoctorName: data.defaultDoctorName?.trim() || undefined,
        satusehatLocationId: data.satusehatLocationId?.trim() || undefined,
        isActive: true,
      };
    } catch (error) {
      console.error(`Gagal menambahkan poli ke faskes ${facilityId}:`, error);
      return null;
    }
  },

  async updateDepartment(departmentId: string, data: Partial<DepartmentItem>): Promise<boolean> {
    try {
      await db
        .update(departments)
        .set({
          name: data.name,
          ...(data.code ? { code: data.code.trim().toUpperCase() } : {}),
          ...(data.queuePrefix ? { queuePrefix: data.queuePrefix.trim().toUpperCase() } : {}),
          room: data.room,
          quota: data.quota,
          defaultDoctorName: data.defaultDoctorName || null,
          ...(data.satusehatLocationId !== undefined ? { satusehatLocationId: data.satusehatLocationId } : {}),
          isActive: data.isActive,
        })
        .where(eq(departments.id, departmentId));

      return true;
    } catch (error) {
      console.error(`Gagal memperbarui poli ${departmentId}:`, error);
      return false;
    }
  },

  async deleteDepartment(departmentId: string): Promise<boolean> {
    try {
      await db.delete(departments).where(eq(departments.id, departmentId));
      return true;
    } catch (error) {
      console.error(`Gagal menghapus poli ${departmentId}:`, error);
      return false;
    }
  },
};
