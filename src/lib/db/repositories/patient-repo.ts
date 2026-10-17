import { db } from "../index";
import { patients } from "../schema";
import { eq, or, ilike, desc, inArray, and } from "drizzle-orm";
import { PatientProfile } from "@/lib/satusehat/types";
import { MemoryCache, CACHE_CONFIG, InvalidationService } from "@/lib/cache";
import { generatePrefixedId, generateMRN } from "@/lib/id-generator";
import { getNextMRN } from "../sequence";

function mapRowToPatient(row: typeof patients.$inferSelect): PatientProfile {
  let parsedAllergies: string[] = [];
  try {
    parsedAllergies = typeof row.allergies === "string" ? JSON.parse(row.allergies) : row.allergies || [];
  } catch {
    parsedAllergies = [];
  }

  return {
    id: row.id,
    nik: row.nik,
    mrn: row.mrn,
    name: row.name,
    gender: row.gender as "male" | "female",
    birthDate: row.birthDate,
    phone: row.phone,
    address: row.address,
    bloodType: row.bloodType as "A" | "B" | "AB" | "O",
    allergies: parsedAllergies,
    emergencyContact: {
      name: row.emergencyContactName,
      relation: row.emergencyContactRelation,
      phone: row.emergencyContactPhone,
    },
    paymentPayer: row.paymentPayer || undefined,
    lastVisitDate: row.lastVisitDate || undefined,
    lastVisitDepartment: row.lastVisitDepartment || undefined,
    lastVisitDoctor: row.lastVisitDoctor || undefined,
    lastVisitDiagnosis: row.lastVisitDiagnosis || undefined,
    totalVisitsCount: row.totalVisitsCount ?? 0,
    ihsNumber: row.ihsNumber || (row.id && row.id.startsWith("P") && !row.id.startsWith("pat_") ? row.id : undefined),
    satusehatConsent: (row.satusehatConsent as "opt-in" | "opt-out") || "opt-in",
  };
}

export const PatientRepository = {
  async getAll(options?: { page?: number; limit?: number }): Promise<PatientProfile[]> {
    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(100, Math.max(1, options?.limit || 50));
    const offset = (page - 1) * limit;

    const rows = await db
      .select()
      .from(patients)
      .where(eq(patients.isDeleted, false))
      .orderBy(desc(patients.updatedAt))
      .limit(limit)
      .offset(offset);
    return rows.map(mapRowToPatient);
  },

  async getById(id: string): Promise<PatientProfile | null> {
    if (!id) return null;
    return MemoryCache.getOrSetAsync(
      CACHE_CONFIG.KEYS.PATIENT(id),
      async () => {
        const rows = await db
          .select()
          .from(patients)
          .where(and(eq(patients.id, id), eq(patients.isDeleted, false)))
          .limit(1);
        return rows[0] ? mapRowToPatient(rows[0]) : null;
      },
      CACHE_CONFIG.TTL.LONG
    );
  },

  async getByIds(ids: string[]): Promise<Map<string, PatientProfile>> {
    const resultMap = new Map<string, PatientProfile>();
    if (!ids || ids.length === 0) return resultMap;

    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    const missingIds: string[] = [];

    // Check Cache first for each ID
    for (const id of uniqueIds) {
      const cached = MemoryCache.get<PatientProfile>(CACHE_CONFIG.KEYS.PATIENT(id));
      if (cached) {
        resultMap.set(id, cached);
      } else {
        missingIds.push(id);
      }
    }

    // Single Batch Query for missing IDs
    if (missingIds.length > 0) {
      const rows = await db
        .select()
        .from(patients)
        .where(and(inArray(patients.id, missingIds), eq(patients.isDeleted, false)));
      for (const row of rows) {
        const patient = mapRowToPatient(row);
        resultMap.set(patient.id, patient);
        MemoryCache.set(CACHE_CONFIG.KEYS.PATIENT(patient.id), patient, CACHE_CONFIG.TTL.LONG);
      }
    }

    return resultMap;
  },

  async getByNik(nik: string): Promise<PatientProfile | null> {
    if (!nik) return null;
    return MemoryCache.getOrSetAsync(
      CACHE_CONFIG.KEYS.PATIENT_NIK(nik),
      async () => {
        const rows = await db
          .select()
          .from(patients)
          .where(and(eq(patients.nik, nik), eq(patients.isDeleted, false)))
          .limit(1);
        return rows[0] ? mapRowToPatient(rows[0]) : null;
      },
      CACHE_CONFIG.TTL.LONG
    );
  },

  async getByMrn(mrn: string): Promise<PatientProfile | null> {
    if (!mrn) return null;
    return MemoryCache.getOrSetAsync(
      CACHE_CONFIG.KEYS.PATIENT_MRN(mrn),
      async () => {
        const rows = await db
          .select()
          .from(patients)
          .where(and(eq(patients.mrn, mrn), eq(patients.isDeleted, false)))
          .limit(1);
        return rows[0] ? mapRowToPatient(rows[0]) : null;
      },
      CACHE_CONFIG.TTL.LONG
    );
  },

  async search(q: string, limitCount: number = 50): Promise<PatientProfile[]> {
    const cleanQ = `%${q.trim()}%`;
    const safeLimit = Math.min(100, Math.max(1, limitCount));
    const rows = await db
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.isDeleted, false),
          or(
            ilike(patients.name, cleanQ),
            ilike(patients.nik, cleanQ),
            ilike(patients.mrn, cleanQ),
            ilike(patients.phone, cleanQ)
          )
        )
      )
      .orderBy(desc(patients.updatedAt))
      .limit(safeLimit);
    return rows.map(mapRowToPatient);
  },

  async create(patient: PatientProfile): Promise<PatientProfile> {
    // 1. If patient with ID already exists, update and return
    if (patient.id) {
      const existingById = await this.getById(patient.id);
      if (existingById) {
        await this.update(patient.id, patient);
        return (await this.getById(patient.id))!;
      }
    }

    // 2. If patient with NIK already exists, update and return
    if (patient.nik) {
      const existingByNik = await this.getByNik(patient.nik);
      if (existingByNik) {
        await this.update(existingByNik.id, patient);
        return (await this.getById(existingByNik.id))!;
      }
    }

    const id = patient.id || generatePrefixedId("pat_");
    const mrnToUse = patient.mrn?.trim() || (await getNextMRN());
    const now = new Date().toISOString();

    await db.insert(patients).values({
      id,
      nik: patient.nik,
      mrn: mrnToUse,
      name: patient.name.trim(),
      gender: patient.gender || "male",
      birthDate: patient.birthDate || "1990-01-01",
      phone: patient.phone || "-",
      address: patient.address || "-",
      bloodType: patient.bloodType || "O",
      allergies: JSON.stringify(patient.allergies || []),
      emergencyContactName: patient.emergencyContact?.name || "-",
      emergencyContactRelation: patient.emergencyContact?.relation || "-",
      emergencyContactPhone: patient.emergencyContact?.phone || "-",
      paymentPayer: patient.paymentPayer || null,
      ihsNumber: patient.ihsNumber || (id.startsWith("P") && !id.startsWith("pat_") ? id : null),
      lastVisitDate: patient.lastVisitDate || null,
      lastVisitDepartment: patient.lastVisitDepartment || null,
      lastVisitDoctor: patient.lastVisitDoctor || null,
      lastVisitDiagnosis: patient.lastVisitDiagnosis || null,
      totalVisitsCount: patient.totalVisitsCount ?? 0,
      satusehatConsent: patient.satusehatConsent || "opt-in",
      createdAt: now,
      updatedAt: now,
    });

    InvalidationService.invalidatePatient(id, patient.nik, patient.mrn);
    const created = await this.getById(id);
    return created!;
  },

  async update(id: string, partial: Partial<PatientProfile>): Promise<PatientProfile | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const valuesToUpdate: Partial<typeof patients.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (partial.name !== undefined) valuesToUpdate.name = partial.name;
    if (partial.phone !== undefined) valuesToUpdate.phone = partial.phone;
    if (partial.address !== undefined) valuesToUpdate.address = partial.address;
    if (partial.bloodType !== undefined) valuesToUpdate.bloodType = partial.bloodType;
    if (partial.ihsNumber !== undefined) valuesToUpdate.ihsNumber = partial.ihsNumber;
    if (partial.allergies !== undefined)
      valuesToUpdate.allergies = JSON.stringify(partial.allergies);
    if (partial.paymentPayer !== undefined) valuesToUpdate.paymentPayer = partial.paymentPayer;
    if (partial.emergencyContact !== undefined) {
      valuesToUpdate.emergencyContactName = partial.emergencyContact.name;
      valuesToUpdate.emergencyContactRelation = partial.emergencyContact.relation;
      valuesToUpdate.emergencyContactPhone = partial.emergencyContact.phone;
    }
    if (partial.lastVisitDate !== undefined) valuesToUpdate.lastVisitDate = partial.lastVisitDate;
    if (partial.lastVisitDepartment !== undefined)
      valuesToUpdate.lastVisitDepartment = partial.lastVisitDepartment;
    if (partial.lastVisitDoctor !== undefined)
      valuesToUpdate.lastVisitDoctor = partial.lastVisitDoctor;
    if (partial.lastVisitDiagnosis !== undefined)
      valuesToUpdate.lastVisitDiagnosis = partial.lastVisitDiagnosis;
    if (partial.totalVisitsCount !== undefined)
      valuesToUpdate.totalVisitsCount = partial.totalVisitsCount;
    if (partial.satusehatConsent !== undefined)
      valuesToUpdate.satusehatConsent = partial.satusehatConsent;

    await db.update(patients).set(valuesToUpdate).where(eq(patients.id, id));

    InvalidationService.invalidatePatient(id, existing.nik, existing.mrn);
    return await this.getById(id);
  },

  /**
   * Resilient Soft Delete: Prevents catastrophic cascade data loss
   */
  async softDelete(id: string): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) return false;

    const now = new Date().toISOString();
    await db
      .update(patients)
      .set({
        isDeleted: true,
        deletedAt: now,
        updatedAt: now,
      })
      .where(eq(patients.id, id));

    InvalidationService.invalidatePatient(id, existing.nik, existing.mrn);
    return true;
  },
};
