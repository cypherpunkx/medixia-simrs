import { db } from "../index";
import { facilities, departments, users } from "../schema";
import { eq, asc } from "drizzle-orm";
import { FacilityProfile, DepartmentItem, FacilityType } from "@/lib/satusehat/types";
import { generatePrefixedId } from "@/lib/id-generator";

export const FacilityRepository = {
  async getAll(): Promise<FacilityProfile[]> {
    try {
      const facRows = await db
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
        }));

        result.push({
          id: f.id,
          name: f.name,
          type: f.type as FacilityType,
          satusehatOrgId: f.satusehatOrgId,
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
          address: "Jl. Kesehatan Medika No. 45, Jakarta Pusat",
          phone: "021-5550199",
          licenseNumber: "440/012/Dinkes/RS-B/2024",
          isActive: true,
          departments: [
            { id: "dept-rs-01", facilityId: "fac-rsud-01", code: "INT", queuePrefix: "A", name: "Poli Penyakit Dalam", room: "Ruang 204 (Lt. 2)", quota: 35, defaultDoctorName: "dr. Rian Pratama, Sp.PD", isActive: true },
            { id: "dept-rs-02", facilityId: "fac-rsud-01", code: "UMU", queuePrefix: "B", name: "Poli Umum", room: "Ruang 101 (Lt. 1)", quota: 50, defaultDoctorName: "dr. Amanda Putri, M.Biomed", isActive: true },
            { id: "dept-rs-03", facilityId: "fac-rsud-01", code: "ANA", queuePrefix: "C", name: "Poli Anak", room: "Ruang 208 (Lt. 2)", quota: 30, defaultDoctorName: "dr. Sarah Amanda, Sp.A", isActive: true },
            { id: "dept-rs-04", facilityId: "fac-rsud-01", code: "GIG", queuePrefix: "D", name: "Poli Gigi & Mulut", room: "Ruang 105 (Lt. 1)", quota: 25, defaultDoctorName: "drg. Hendra Wijaya", isActive: true },
            { id: "dept-rs-05", facilityId: "fac-rsud-01", code: "JAN", queuePrefix: "E", name: "Poli Jantung & Pembuluh Darah", room: "Ruang 301 (Lt. 3)", quota: 20, defaultDoctorName: "dr. Maya Kartika, Sp.JP", isActive: true },
            { id: "dept-rs-06", facilityId: "fac-rsud-01", code: "MAT", queuePrefix: "F", name: "Poli Mata", room: "Ruang 107 (Lt. 1)", quota: 25, defaultDoctorName: "dr. Budi Setiawan, Sp.M", isActive: true },
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
        name: d.name,
        room: d.room,
        quota: d.quota,
        defaultDoctorName: d.defaultDoctorName || undefined,
        isActive: d.isActive,
      }));

      return {
        id: f.id,
        name: f.name,
        type: f.type as FacilityType,
        satusehatOrgId: f.satusehatOrgId,
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

  async create(
    data: Omit<FacilityProfile, "id"> & {
      id?: string;
      adminUser?: { name: string; username: string; password?: string };
    }
  ): Promise<FacilityProfile | null> {
    try {
      const facId = data.id || generatePrefixedId("fac_");
      const now = new Date().toISOString();

      await db.insert(facilities).values({
        id: facId,
        name: data.name,
        type: data.type,
        satusehatOrgId: data.satusehatOrgId,
        address: data.address || "",
        phone: data.phone || "",
        licenseNumber: data.licenseNumber || "",
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt: now,
        updatedAt: now,
      });

      if (data.departments && data.departments.length > 0) {
        for (const dept of data.departments) {
          await db.insert(departments).values({
            id: dept.id || generatePrefixedId("dept_"),
            facilityId: facId,
            code: dept.code?.trim().toUpperCase() || dept.name.substring(0, 3).toUpperCase(),
            queuePrefix: dept.queuePrefix?.trim().toUpperCase() || "A",
            name: dept.name,
            room: dept.room || "Ruang Periksa 1",
            quota: dept.quota || 30,
            defaultDoctorName: dept.defaultDoctorName || null,
            isActive: dept.isActive !== undefined ? dept.isActive : true,
            createdAt: now,
          });
        }
      }

      // 3. Inisialisasi Akun Administrator Pertama Faskes
      if (data.adminUser && data.adminUser.username) {
        const userId = generatePrefixedId("usr_");
        await db.insert(users).values({
          id: userId,
          facilityId: facId,
          username: data.adminUser.username.trim().toLowerCase(),
          passwordHash: data.adminUser.password || "password123",
          name: data.adminUser.name || "Administrator Faskes",
          role: "admin",
          isActive: true,
          createdAt: now,
        });
      }

      return this.getById(facId);
    } catch (error) {
      console.error("Gagal menambahkan faskes baru:", error);
      return null;
    }
  },

  async update(id: string, data: Partial<FacilityProfile>): Promise<FacilityProfile | null> {
    try {
      await db
        .update(facilities)
        .set({
          name: data.name,
          type: data.type,
          satusehatOrgId: data.satusehatOrgId,
          address: data.address,
          phone: data.phone,
          licenseNumber: data.licenseNumber,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(facilities.id, id));

      return this.getById(id);
    } catch (error) {
      console.error(`Gagal memperbarui faskes ${id}:`, error);
      return null;
    }
  },

  async addDepartment(facilityId: string, data: { name: string; code?: string; queuePrefix?: string; room?: string; quota?: number; defaultDoctorName?: string }): Promise<DepartmentItem | null> {
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
