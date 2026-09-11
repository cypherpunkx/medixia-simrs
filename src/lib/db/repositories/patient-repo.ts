import { db } from "../index";
import { patients } from "../schema";
import { eq, or, like, desc } from "drizzle-orm";
import { PatientProfile } from "@/lib/satusehat/types";

function mapRowToPatient(row: typeof patients.$inferSelect): PatientProfile {
  let parsedAllergies: string[] = [];
  try {
    parsedAllergies = JSON.parse(row.allergies);
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
    paymentPayer: row.paymentPayer || "BPJS Kesehatan",
    lastVisitDate: row.lastVisitDate || undefined,
    lastVisitDepartment: row.lastVisitDepartment || undefined,
    lastVisitDoctor: row.lastVisitDoctor || undefined,
    lastVisitDiagnosis: row.lastVisitDiagnosis || undefined,
    totalVisitsCount: row.totalVisitsCount || 1,
    satusehatConsent: (row.satusehatConsent as "opt-in" | "opt-out") || "opt-in",
  };
}

import { inArray } from "drizzle-orm";
import { MemoryCache, CACHE_CONFIG, InvalidationService } from "@/lib/cache";

export const PatientRepository = {
  getAll(): PatientProfile[] {
    return MemoryCache.getOrSet(
      CACHE_CONFIG.KEYS.PATIENTS_ALL,
      () => {
        const rows = db.select().from(patients).orderBy(desc(patients.updatedAt)).all();
        return rows.map(mapRowToPatient);
      },
      CACHE_CONFIG.TTL.LONG
    );
  },

  getById(id: string): PatientProfile | null {
    if (!id) return null;
    return MemoryCache.getOrSet(
      CACHE_CONFIG.KEYS.PATIENT(id),
      () => {
        const row = db.select().from(patients).where(eq(patients.id, id)).get();
        return row ? mapRowToPatient(row) : null;
      },
      CACHE_CONFIG.TTL.LONG
    );
  },

  getByIds(ids: string[]): Map<string, PatientProfile> {
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
      const rows = db.select().from(patients).where(inArray(patients.id, missingIds)).all();
      for (const row of rows) {
        const patient = mapRowToPatient(row);
        resultMap.set(patient.id, patient);
        MemoryCache.set(CACHE_CONFIG.KEYS.PATIENT(patient.id), patient, CACHE_CONFIG.TTL.LONG);
      }
    }

    return resultMap;
  },

  getByNik(nik: string): PatientProfile | null {
    if (!nik) return null;
    return MemoryCache.getOrSet(
      CACHE_CONFIG.KEYS.PATIENT_NIK(nik),
      () => {
        const row = db.select().from(patients).where(eq(patients.nik, nik)).get();
        return row ? mapRowToPatient(row) : null;
      },
      CACHE_CONFIG.TTL.LONG
    );
  },

  getByMrn(mrn: string): PatientProfile | null {
    if (!mrn) return null;
    return MemoryCache.getOrSet(
      CACHE_CONFIG.KEYS.PATIENT_MRN(mrn),
      () => {
        const row = db.select().from(patients).where(eq(patients.mrn, mrn)).get();
        return row ? mapRowToPatient(row) : null;
      },
      CACHE_CONFIG.TTL.LONG
    );
  },

  search(q: string): PatientProfile[] {
    const cleanQ = `%${q.trim()}%`;
    const rows = db
      .select()
      .from(patients)
      .where(
        or(
          like(patients.name, cleanQ),
          like(patients.nik, cleanQ),
          like(patients.mrn, cleanQ),
          like(patients.phone, cleanQ)
        )
      )
      .orderBy(desc(patients.updatedAt))
      .all();
    return rows.map(mapRowToPatient);
  },

  create(patient: PatientProfile): PatientProfile {
    // 1. If patient with ID already exists, update and return
    if (patient.id) {
      const existingById = this.getById(patient.id);
      if (existingById) {
        this.update(patient.id, patient);
        return this.getById(patient.id)!;
      }
    }

    // 2. If patient with NIK already exists, update and return
    if (patient.nik) {
      const existingByNik = this.getByNik(patient.nik);
      if (existingByNik) {
        this.update(existingByNik.id, patient);
        return this.getById(existingByNik.id)!;
      }
    }

    const id = patient.id || `P-${Date.now().toString(36).toUpperCase()}`;
    const generatedMrn = `RM-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString();

    db.insert(patients)
      .values({
        id,
        nik: patient.nik,
        mrn: patient.mrn?.trim() || generatedMrn,
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
        paymentPayer: patient.paymentPayer || "BPJS Kesehatan",
        lastVisitDate: patient.lastVisitDate || null,
        lastVisitDepartment: patient.lastVisitDepartment || null,
        lastVisitDoctor: patient.lastVisitDoctor || null,
        lastVisitDiagnosis: patient.lastVisitDiagnosis || null,
        totalVisitsCount: patient.totalVisitsCount || 1,
        satusehatConsent: patient.satusehatConsent || "opt-in",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const created = this.getById(id)!;
    InvalidationService.invalidatePatient(id, patient.nik, patient.mrn);
    return created;
  },

  update(id: string, partial: Partial<PatientProfile>): PatientProfile | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const valuesToUpdate: Partial<typeof patients.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (partial.name !== undefined) valuesToUpdate.name = partial.name;
    if (partial.phone !== undefined) valuesToUpdate.phone = partial.phone;
    if (partial.address !== undefined) valuesToUpdate.address = partial.address;
    if (partial.bloodType !== undefined) valuesToUpdate.bloodType = partial.bloodType;
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

    db.update(patients).set(valuesToUpdate).where(eq(patients.id, id)).run();

    InvalidationService.invalidatePatient(id, existing.nik, existing.mrn);
    return this.getById(id);
  },
};
