import { db } from "@/lib/db";
import {
  masterMedications,
  prescriptions,
  encounters,
  patients,
  stockMutations,
  users,
} from "@/lib/db/schema";
import { eq, desc, asc, and, sql, or } from "drizzle-orm";
import { generatePrefixedId, generateUUIDv7 } from "@/lib/id-generator";
import { PrescriptionItem, StockMutationItem } from "@/lib/satusehat/types";

export interface PharmacyWorklistItem {
  prescription: PrescriptionItem;
  encounter: {
    id: string;
    satusehatEncounterId?: string | null;
    visitDate: string;
    clinicDepartment: string;
    doctorName: string;
    registrationNumber?: string | null;
    queueNumber?: string | null;
  };
  patient: {
    id: string;
    mrn: string;
    name: string;
    gender: string;
    birthDate: string;
    allergies: string[];
    satusehatId?: string | null;
    paymentPayer?: string | null;
  };
  inventory: {
    currentStock: number;
    price: number;
    unit: string;
  };
}

export const PharmacyRepository = {
  /**
   * Mengambil daftar resep farmasi (Worklist) berdasarkan status dan filter
   */
  async getWorklist(options?: {
    status?: "all" | "pending_review" | "in_preparation" | "ready" | "dispensed";
    search?: string;
  }): Promise<PharmacyWorklistItem[]> {
    const query = db
      .select({
        rx: prescriptions,
        enc: encounters,
        pat: patients,
        med: masterMedications,
      })
      .from(prescriptions)
      .innerJoin(encounters, eq(prescriptions.encounterId, encounters.id))
      .innerJoin(patients, eq(encounters.patientId, patients.id))
      .leftJoin(masterMedications, eq(prescriptions.kfaCode, masterMedications.kfaCode))
      .orderBy(desc(encounters.visitDate), desc(prescriptions.id));

    const rows = await query;

    let items: PharmacyWorklistItem[] = rows.map(({ rx, enc, pat, med }) => {
      let allergiesArr: string[] = [];
      try {
        allergiesArr = typeof pat.allergies === "string" ? JSON.parse(pat.allergies) : (pat.allergies || []);
      } catch {
        allergiesArr = [];
      }

      return {
        prescription: {
          id: rx.id,
          kfaCode: rx.kfaCode,
          medicationName: rx.medicationName,
          form: rx.form,
          dosage: rx.dosage,
          frequency: rx.frequency,
          timing: rx.timing as PrescriptionItem["timing"],
          schedule: {
            morning: Boolean(rx.morning),
            afternoon: Boolean(rx.afternoon),
            evening: Boolean(rx.evening),
            night: Boolean(rx.night),
          },
          quantity: rx.quantity,
          unit: rx.unit,
          durationDays: rx.durationDays,
          instructions: rx.instructions,
          satusehatMedicationRequestId: rx.satusehatMedicationRequestId || undefined,
          satusehatMedicationId: rx.satusehatMedicationId || undefined,
          dispenseStatus: (rx.dispenseStatus as PrescriptionItem["dispenseStatus"]) || "pending_review",
          reviewedBy: rx.reviewedBy || undefined,
          reviewedAt: rx.reviewedAt || undefined,
          preparedBy: rx.preparedBy || undefined,
          preparedAt: rx.preparedAt || undefined,
          dispensedBy: rx.dispensedBy || undefined,
          dispensedAt: rx.dispensedAt || undefined,
          satusehatMedicationDispenseId: rx.satusehatMedicationDispenseId || undefined,
          etiquetteType: (rx.etiquetteType as "white" | "blue") || "white",
          batchNumber: rx.batchNumber || undefined,
          expiryDate: rx.expiryDate || undefined,
          counselingNotes: rx.counselingNotes || undefined,
        },
        encounter: {
          id: enc.id,
          satusehatEncounterId: enc.satusehatEncounterId,
          visitDate: enc.visitDate,
          clinicDepartment: enc.clinicDepartment,
          doctorName: enc.doctorName,
          registrationNumber: enc.registrationNumber,
          queueNumber: enc.queueNumber,
        },
        patient: {
          id: pat.id,
          mrn: pat.mrn,
          name: pat.name,
          gender: pat.gender,
          birthDate: pat.birthDate,
          allergies: allergiesArr,
          satusehatId: pat.ihsNumber,
          paymentPayer: pat.paymentPayer,
        },
        inventory: {
          currentStock: med?.stock ?? 100,
          price: med?.price ?? 0,
          unit: med?.unit || rx.unit,
        },
      };
    });

    if (options?.status && options.status !== "all") {
      items = items.filter((item) => item.prescription.dispenseStatus === options.status);
    }

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      items = items.filter(
        (item) =>
          item.patient.name.toLowerCase().includes(q) ||
          item.patient.mrn.toLowerCase().includes(q) ||
          item.prescription.medicationName.toLowerCase().includes(q) ||
          (item.encounter.registrationNumber && item.encounter.registrationNumber.toLowerCase().includes(q))
      );
    }

    return items;
  },

  /**
   * Tahap 1: Telaah Resep (Verifikasi Dosis & Bebas Alergi)
   */
  async reviewPrescription(
    prescriptionId: string,
    reviewerName: string = "Apoteker Farmasi"
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const result = await db
      .update(prescriptions)
      .set({
        dispenseStatus: "in_preparation",
        reviewedBy: reviewerName,
        reviewedAt: now,
      })
      .where(eq(prescriptions.id, prescriptionId));

    return true;
  },

  /**
   * Tahap 2: Penyiapan / Peracikan (Otomatis Potong Stok & Catat Kartu Mutasi)
   */
  async prepareAndDeductStock(params: {
    prescriptionId: string;
    preparerName?: string;
    batchNumber?: string;
    expiryDate?: string;
    etiquetteType?: "white" | "blue";
  }): Promise<{ success: boolean; stockAfter: number; message?: string }> {
    const rxRows = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.id, params.prescriptionId))
      .limit(1);

    if (rxRows.length === 0) {
      return { success: false, stockAfter: 0, message: "Resep tidak ditemukan." };
    }

    const rx = rxRows[0];

    // Idempotency Guard: Jika resep sudah pernah disiapkan atau diserahkan, jangan potong stok kembali
    if (rx.dispenseStatus === "ready" || rx.dispenseStatus === "dispensed") {
      const currentMed = await db
        .select({ stock: masterMedications.stock })
        .from(masterMedications)
        .where(eq(masterMedications.kfaCode, rx.kfaCode))
        .limit(1);
      return {
        success: true,
        stockAfter: currentMed[0]?.stock ?? 0,
        message: "Resep ini sudah pernah disiapkan dan stok telah dipotong sebelumnya (Idempotent).",
      };
    }

    const qtyToDeduct = rx.quantity;
    const now = new Date().toISOString();
    const preparer = params.preparerName || "Asisten Apoteker";

    let finalStock = 0;

    await db.transaction(async (tx) => {
      // 1. Temukan obat di master_medications dengan row-level lock (FOR UPDATE)
      const medRows = await tx
        .select()
        .from(masterMedications)
        .where(eq(masterMedications.kfaCode, rx.kfaCode))
        .for("update")
        .limit(1);

      let medId = "";
      let stockBefore = 100;
      let stockAfter = 100;

      if (medRows.length > 0) {
        medId = medRows[0].id;
        stockBefore = medRows[0].stock;
        stockAfter = Math.max(0, stockBefore - qtyToDeduct);

        // Update stok fisik master obat
        await tx
          .update(masterMedications)
          .set({
            stock: stockAfter,
            updatedAt: now,
          })
          .where(eq(masterMedications.id, medId));
      } else {
        // Buat master medication jika belum ada record fisik
        medId = generatePrefixedId("med_");
        stockBefore = 100;
        stockAfter = 100 - qtyToDeduct;

        await tx.insert(masterMedications).values({
          id: medId,
          kfaCode: rx.kfaCode,
          name: rx.medicationName,
          genericName: rx.medicationName,
          form: rx.form,
          strength: rx.dosage,
          route: "Oral",
          category: "Obat KFA",
          unit: rx.unit,
          stock: stockAfter,
          price: 15000,
          isActive: true,
        });
      }

      finalStock = stockAfter;

      // 2. Catat Log Kartu Mutasi Stok
      await tx.insert(stockMutations).values({
        id: generatePrefixedId("mut_"),
        medicationId: medId,
        kfaCode: rx.kfaCode,
        type: "dispense",
        quantity: -qtyToDeduct,
        stockBefore,
        stockAfter,
        referenceType: "prescription",
        referenceId: rx.id,
        notes: `Dispensing obat resep ${rx.medicationName} (${qtyToDeduct} ${rx.unit})`,
        createdBy: preparer,
        createdAt: now,
      });

      // 3. Update status resep menjadi 'ready' (Siap Diserahkan)
      await tx
        .update(prescriptions)
        .set({
          dispenseStatus: "ready",
          preparedBy: preparer,
          preparedAt: now,
          batchNumber: params.batchNumber || `BCH-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-01`,
          expiryDate: params.expiryDate || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split("T")[0],
          etiquetteType: params.etiquetteType || (rx.form?.toLowerCase().includes("salep") || rx.form?.toLowerCase().includes("tetes") ? "blue" : "white"),
        })
        .where(eq(prescriptions.id, rx.id));
    });

    return { success: true, stockAfter: finalStock };
  },

  /**
   * Mengambil detail resep beserta context Encounter dan Patient untuk bridging FHIR
   */
  async getPrescriptionWithContext(prescriptionId: string) {
    const rows = await db
      .select({
        rx: prescriptions,
        enc: encounters,
        pat: patients,
      })
      .from(prescriptions)
      .innerJoin(encounters, eq(prescriptions.encounterId, encounters.id))
      .innerJoin(patients, eq(encounters.patientId, patients.id))
      .where(eq(prescriptions.id, prescriptionId))
      .limit(1);

    if (rows.length === 0) return null;
    return rows[0];
  },

  /**
   * Tahap 3: Penyerahan Obat ke Pasien & Sync SATUSEHAT MedicationDispense
   */
  async dispenseToPatient(params: {
    prescriptionId: string;
    dispenserName?: string;
    counselingNotes?: string;
    satusehatMedicationDispenseId?: string;
  }): Promise<{ success: boolean; satusehatDispenseId: string }> {
    // Idempotency Guard: Jika obat sudah diserahkan, kembalikan status sukses dan ID yang sudah ada
    const existingRows = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.id, params.prescriptionId))
      .limit(1);

    if (existingRows.length > 0 && existingRows[0].dispenseStatus === "dispensed") {
      return {
        success: true,
        satusehatDispenseId:
          existingRows[0].satusehatMedicationDispenseId ||
          params.satusehatMedicationDispenseId ||
          generateUUIDv7(),
      };
    }

    const now = new Date().toISOString();
    // Gunakan ID SATUSEHAT resmi yang diberikan, atau fallback ke standard RFC 4122 UUID v7
    const satusehatDispenseId =
      params.satusehatMedicationDispenseId &&
      !params.satusehatMedicationDispenseId.startsWith("disp-ss-")
        ? params.satusehatMedicationDispenseId
        : generateUUIDv7();

    await db
      .update(prescriptions)
      .set({
        dispenseStatus: "dispensed",
        dispensedBy: params.dispenserName || "Apoteker Pendamping",
        dispensedAt: now,
        counselingNotes: params.counselingNotes || "Edukasi aturan minum obat telah disampaikan kepada pasien/keluarga.",
        satusehatMedicationDispenseId: satusehatDispenseId,
      })
      .where(eq(prescriptions.id, params.prescriptionId));

    return { success: true, satusehatDispenseId };
  },

  /**
   * Update SATUSEHAT MedicationDispense ID hasil bridging resmi
   */
  async updateDispenseSatusehatId(
    prescriptionId: string,
    satusehatDispenseId: string
  ): Promise<boolean> {
    await db
      .update(prescriptions)
      .set({
        satusehatMedicationDispenseId: satusehatDispenseId,
      })
      .where(eq(prescriptions.id, prescriptionId));
    return true;
  },

  /**
   * Riwayat Mutasi Kartu Stok Obat
   */
  async getStockMutations(kfaCode?: string): Promise<StockMutationItem[]> {
    const query = db
      .select()
      .from(stockMutations)
      .orderBy(desc(stockMutations.createdAt))
      .limit(50);

    const rows = kfaCode
      ? await query.where(eq(stockMutations.kfaCode, kfaCode))
      : await query;

    return rows.map((r) => ({
      id: r.id,
      medicationId: r.medicationId,
      kfaCode: r.kfaCode,
      type: r.type as StockMutationItem["type"],
      quantity: r.quantity,
      stockBefore: r.stockBefore,
      stockAfter: r.stockAfter,
      referenceType: (r.referenceType as StockMutationItem["referenceType"]) || "prescription",
      referenceId: r.referenceId || undefined,
      notes: r.notes || undefined,
      createdBy: r.createdBy,
      createdAt: r.createdAt,
    }));
  },

  /**
   * Restock Obat (Penambahan Stok Baru / Faktur Masuk)
   */
  async restock(params: {
    kfaCode: string;
    quantity: number;
    creatorName: string;
    notes?: string;
  }): Promise<{ success: boolean; newStock: number }> {
    const now = new Date().toISOString();

    const medRows = await db
      .select()
      .from(masterMedications)
      .where(eq(masterMedications.kfaCode, params.kfaCode))
      .limit(1);

    if (medRows.length === 0) {
      throw new Error(`Obat dengan kode KFA ${params.kfaCode} tidak ditemukan di master.`);
    }

    const med = medRows[0];
    const stockBefore = med.stock;
    const stockAfter = stockBefore + params.quantity;

    await db.transaction(async (tx) => {
      await tx
        .update(masterMedications)
        .set({
          stock: stockAfter,
          updatedAt: now,
        })
        .where(eq(masterMedications.id, med.id));

      await tx.insert(stockMutations).values({
        id: generatePrefixedId("mut_"),
        medicationId: med.id,
        kfaCode: params.kfaCode,
        type: "restock",
        quantity: params.quantity,
        stockBefore,
        stockAfter,
        referenceType: "po",
        notes: params.notes || "Restock penerimaan gudang farmasi",
        createdBy: params.creatorName,
        createdAt: now,
      });
    });

    return { success: true, newStock: stockAfter };
  },

  /**
   * Mengambil seluruh katalog obat gudang farmasi beserta stok real-time
   */
  async getAllInventory(search?: string): Promise<Array<typeof masterMedications.$inferSelect>> {
    let rows = await db.select().from(masterMedications).orderBy(asc(masterMedications.name));

    // Jika tabel master kosong, lakukan auto-seed dari KFA_MEDICATIONS_DATABASE
    if (rows.length === 0) {
      const { KFA_MEDICATIONS_DATABASE } = await import("@/lib/satusehat/kfa-database");
      const seedItems = KFA_MEDICATIONS_DATABASE.map((kfa, idx) => ({
        id: generatePrefixedId("med_"),
        kfaCode: kfa.kfaCode,
        name: kfa.name,
        genericName: kfa.genericName,
        form: kfa.form,
        strength: kfa.strength,
        route: kfa.route || "Oral",
        category: kfa.category,
        unit: kfa.unit,
        defaultDosage: kfa.defaultDosage,
        defaultFrequency: kfa.defaultFrequency,
        defaultTiming: kfa.defaultTiming,
        stock: 50 + (idx % 5) * 20, // 50 - 130 unit stok awal
        price: 8000 + (idx % 7) * 2500,
        isActive: true,
      }));

      await db.insert(masterMedications).values(seedItems);
      rows = await db.select().from(masterMedications).orderBy(asc(masterMedications.name));
    }

    if (search) {
      const q = search.toLowerCase().trim();
      return rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.kfaCode.includes(q) ||
          r.genericName.toLowerCase().includes(q) ||
          (r.category && r.category.toLowerCase().includes(q))
      );
    }

    return rows;
  },

  /**
   * Penyesuaian Stok (Stock Opname)
   */
  async adjustStock(params: {
    kfaCode: string;
    newStock: number;
    reason: string;
    creatorName: string;
  }): Promise<{ success: boolean; oldStock: number; newStock: number }> {
    const now = new Date().toISOString();

    const medRows = await db
      .select()
      .from(masterMedications)
      .where(eq(masterMedications.kfaCode, params.kfaCode))
      .limit(1);

    if (medRows.length === 0) {
      throw new Error(`Obat dengan kode KFA ${params.kfaCode} tidak ditemukan.`);
    }

    const med = medRows[0];
    const stockBefore = med.stock;
    const stockAfter = params.newStock;
    const diff = stockAfter - stockBefore;

    await db.transaction(async (tx) => {
      await tx
        .update(masterMedications)
        .set({
          stock: stockAfter,
          updatedAt: now,
        })
        .where(eq(masterMedications.id, med.id));

      await tx.insert(stockMutations).values({
        id: generatePrefixedId("mut_"),
        medicationId: med.id,
        kfaCode: params.kfaCode,
        type: "adjustment",
        quantity: diff,
        stockBefore,
        stockAfter,
        referenceType: "opname",
        notes: `Stock Opname: ${params.reason}`,
        createdBy: params.creatorName,
        createdAt: now,
      });
    });

    return { success: true, oldStock: stockBefore, newStock: stockAfter };
  },

  /**
   * Menambahkan Master Obat Baru dengan Kode KFA Kemenkes
   */
  async createMedication(params: {
    kfaCode: string;
    name: string;
    genericName?: string;
    form: string;
    strength: string;
    route?: string;
    category: string;
    unit?: string;
    stock?: number;
    price?: number;
    defaultDosage?: string;
    defaultFrequency?: string;
    defaultTiming?: string;
    creatorName?: string;
  }) {
    const existing = await db
      .select()
      .from(masterMedications)
      .where(eq(masterMedications.kfaCode, params.kfaCode))
      .limit(1);

    const now = new Date().toISOString();
    const stock = Number(params.stock) || 0;
    const price = Number(params.price) || 0;

    if (existing.length > 0) {
      const med = existing[0];
      await db
        .update(masterMedications)
        .set({
          name: params.name || med.name,
          genericName: params.genericName || med.genericName,
          form: params.form || med.form,
          strength: params.strength || med.strength,
          category: params.category || med.category,
          price: price || med.price,
          unit: params.unit || med.unit,
          defaultDosage: params.defaultDosage || med.defaultDosage,
          defaultFrequency: params.defaultFrequency || med.defaultFrequency,
          defaultTiming: params.defaultTiming || med.defaultTiming,
          isActive: true,
          updatedAt: now,
        })
        .where(eq(masterMedications.id, med.id));
      return {
        success: true,
        id: med.id,
        isExisting: true,
        name: params.name || med.name,
        kfaCode: med.kfaCode,
        currentStock: med.stock,
      };
    }

    const medId = generatePrefixedId("med_");
    await db.insert(masterMedications).values({
      id: medId,
      kfaCode: params.kfaCode,
      name: params.name,
      genericName: params.genericName || params.name,
      form: params.form,
      strength: params.strength,
      route: params.route || "Oral",
      category: params.category,
      unit: params.unit || "Tablet",
      stock,
      price,
      defaultDosage: params.defaultDosage || params.strength,
      defaultFrequency: params.defaultFrequency || "3x sehari 1 tablet",
      defaultTiming: params.defaultTiming || "Sesudah makan",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    if (stock > 0) {
      await db.insert(stockMutations).values({
        id: generatePrefixedId("mut_"),
        medicationId: medId,
        kfaCode: params.kfaCode,
        type: "restock",
        quantity: stock,
        stockBefore: 0,
        stockAfter: stock,
        referenceType: "po",
        notes: "Saldo awal pendaftaran obat baru",
        createdBy: params.creatorName || "Apoteker Farmasi",
        createdAt: now,
      });
    }

    return {
      success: true,
      id: medId,
      isExisting: false,
      name: params.name,
      kfaCode: params.kfaCode,
      currentStock: stock,
    };
  },

  /**
   * Memperbarui Master Data Obat (Harga, Aturan Pakai, Kategori)
   */
  async updateMedication(params: {
    id: string;
    name?: string;
    category?: string;
    price?: number;
    unit?: string;
    defaultDosage?: string;
    defaultFrequency?: string;
    defaultTiming?: string;
  }) {
    const now = new Date().toISOString();
    await db
      .update(masterMedications)
      .set({
        ...(params.name ? { name: params.name } : {}),
        ...(params.category ? { category: params.category } : {}),
        ...(params.price !== undefined ? { price: Number(params.price) } : {}),
        ...(params.unit ? { unit: params.unit } : {}),
        ...(params.defaultDosage ? { defaultDosage: params.defaultDosage } : {}),
        ...(params.defaultFrequency ? { defaultFrequency: params.defaultFrequency } : {}),
        ...(params.defaultTiming ? { defaultTiming: params.defaultTiming } : {}),
        updatedAt: now,
      })
      .where(eq(masterMedications.id, params.id));

    return { success: true };
  },

  /**
   * Soft Delete / Deaktivasi Master Obat
   */
  async toggleMedicationActive(id: string, active?: boolean) {
    const med = await db
      .select()
      .from(masterMedications)
      .where(eq(masterMedications.id, id))
      .limit(1);

    if (med.length === 0) {
      throw new Error("Obat tidak ditemukan.");
    }

    const newActive = active !== undefined ? active : !med[0].isActive;
    await db
      .update(masterMedications)
      .set({
        isActive: newActive,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(masterMedications.id, id));

    return { success: true, isActive: newActive };
  },
};
