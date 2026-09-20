import { db } from "@/lib/db";
import { masterMedications, masterIcd10, masterIcd9 } from "@/lib/db/schema";
import { eq, ilike, or, and, desc, sql } from "drizzle-orm";

export interface MasterMedicationItem {
  id: string;
  kfaCode: string;
  name: string;
  genericName: string;
  form: string;
  strength: string;
  route: string;
  category: string;
  unit: string;
  defaultDosage?: string | null;
  defaultFrequency?: string | null;
  defaultTiming?: string | null;
  stock: number;
  price: number;
  isActive: boolean;
}

export interface MasterIcd10Item {
  id: string;
  code: string;
  display: string;
  patientFriendlyName: string;
  category?: string | null;
  isActive: boolean;
}

export interface MasterIcd9Item {
  id: string;
  code: string;
  display: string;
  category: string;
  isActive: boolean;
}

export class MasterDataRepository {
  // ==========================================
  // 1. MASTER OBAT & KFA
  // ==========================================
  public static async getMedications(params: {
    query?: string;
    category?: string;
    limit?: number;
  } = {}): Promise<MasterMedicationItem[]> {
    const limit = params.limit || 50;
    const conditions = [eq(masterMedications.isActive, true)];

    if (params.query && params.query.trim()) {
      const q = `%${params.query.trim()}%`;
      conditions.push(
        or(
          ilike(masterMedications.name, q),
          ilike(masterMedications.genericName, q),
          ilike(masterMedications.kfaCode, q)
        )!
      );
    }

    if (params.category && params.category.trim()) {
      conditions.push(eq(masterMedications.category, params.category.trim()));
    }

    return await db
      .select()
      .from(masterMedications)
      .where(and(...conditions))
      .orderBy(masterMedications.name)
      .limit(limit);
  }

  public static async getMedicationByKfa(kfaCode: string): Promise<MasterMedicationItem | null> {
    const rows = await db
      .select()
      .from(masterMedications)
      .where(eq(masterMedications.kfaCode, kfaCode))
      .limit(1);

    return rows[0] || null;
  }

  public static async upsertMedication(data: Omit<MasterMedicationItem, "id"> & { id?: string }): Promise<MasterMedicationItem> {
    const id = data.id || `med-kfa-${data.kfaCode}`;
    const [row] = await db
      .insert(masterMedications)
      .values({
        id,
        kfaCode: data.kfaCode,
        name: data.name,
        genericName: data.genericName,
        form: data.form,
        strength: data.strength,
        route: data.route || "Oral",
        category: data.category,
        unit: data.unit || "Tablet",
        defaultDosage: data.defaultDosage,
        defaultFrequency: data.defaultFrequency,
        defaultTiming: data.defaultTiming,
        stock: data.stock !== undefined ? data.stock : 100,
        price: data.price !== undefined ? data.price : 0,
        isActive: data.isActive !== undefined ? data.isActive : true,
      })
      .onConflictDoUpdate({
        target: masterMedications.kfaCode,
        set: {
          name: data.name,
          genericName: data.genericName,
          form: data.form,
          strength: data.strength,
          category: data.category,
          stock: data.stock,
          price: data.price,
          isActive: data.isActive,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      })
      .returning();

    return row;
  }

  // ==========================================
  // 2. MASTER DIAGNOSA ICD-10
  // ==========================================
  public static async getIcd10(params: {
    query?: string;
    limit?: number;
  } = {}): Promise<MasterIcd10Item[]> {
    const limit = params.limit || 50;
    const conditions = [eq(masterIcd10.isActive, true)];

    if (params.query && params.query.trim()) {
      const q = `%${params.query.trim()}%`;
      conditions.push(
        or(
          ilike(masterIcd10.code, q),
          ilike(masterIcd10.display, q),
          ilike(masterIcd10.patientFriendlyName, q)
        )!
      );
    }

    return await db
      .select()
      .from(masterIcd10)
      .where(and(...conditions))
      .orderBy(masterIcd10.code)
      .limit(limit);
  }

  // ==========================================
  // 3. MASTER TINDAKAN ICD-9-CM
  // ==========================================
  public static async getIcd9(params: {
    query?: string;
    limit?: number;
  } = {}): Promise<MasterIcd9Item[]> {
    const limit = params.limit || 50;
    const conditions = [eq(masterIcd9.isActive, true)];

    if (params.query && params.query.trim()) {
      const q = `%${params.query.trim()}%`;
      conditions.push(
        or(
          ilike(masterIcd9.code, q),
          ilike(masterIcd9.display, q),
          ilike(masterIcd9.category, q)
        )!
      );
    }

    return await db
      .select()
      .from(masterIcd9)
      .where(and(...conditions))
      .orderBy(masterIcd9.code)
      .limit(limit);
  }
}
