import { db } from "../index";
import { queueItems, encounters, departments, users } from "../schema";
import { eq, and, or, asc, desc, gte, lte, inArray, SQL } from "drizzle-orm";
import { ClinicQueuePatientItem, PatientProfile } from "@/lib/satusehat/types";
import { PatientRepository } from "./patient-repo";
import { MemoryCache, CACHE_CONFIG, InvalidationService } from "@/lib/cache";
import { generatePrefixedId, getLocalDateString } from "@/lib/id-generator";
import { getNextRegistrationNumber } from "../sequence";

export interface QueueFilterOptions {
  date?: string; // YYYY-MM-DD
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  department?: string;
  departments?: string[];
  facilityId?: string;
  all?: boolean; // If true, return all historical queue records
}

export const QueueRepository = {
  async getQueue(options?: QueueFilterOptions): Promise<ClinicQueuePatientItem[]> {
    const cacheKey = CACHE_CONFIG.KEYS.QUEUE_FILTER(JSON.stringify(options || {}));

    return MemoryCache.getOrSetAsync(
      cacheKey,
      async () => {
        const { date, startDate, endDate, department, departments: deptsList, facilityId, all } = options || {};
        const deptFilter =
          department && department !== "Semua Poli" && department !== "all"
            ? department
            : undefined;

        let facilityDeptNames: string[] | undefined = undefined;
        if (facilityId) {
          const dRows = await db
            .select({ name: departments.name })
            .from(departments)
            .where(eq(departments.facilityId, facilityId));
          facilityDeptNames = dRows.map((d) => d.name);
        }

        const conditions: SQL[] = [];
        if (deptFilter) {
          conditions.push(eq(queueItems.department, deptFilter));
        } else if (deptsList && deptsList.length > 0) {
          conditions.push(inArray(queueItems.department, deptsList));
        } else if (facilityDeptNames && facilityDeptNames.length > 0) {
          conditions.push(inArray(queueItems.department, facilityDeptNames));
        }

        if (!all) {
          if (startDate && endDate) {
            conditions.push(gte(queueItems.queueDate, startDate));
            conditions.push(lte(queueItems.queueDate, endDate));
          } else if (date) {
            conditions.push(eq(queueItems.queueDate, date));
          } else {
            const todayStr = getLocalDateString();
            conditions.push(eq(queueItems.queueDate, todayStr));
          }
        }

        let query = db.select().from(queueItems);
        if (conditions.length === 1) {
          query = query.where(conditions[0]) as any;
        } else if (conditions.length > 1) {
          query = query.where(and(...conditions)) as any;
        }

        let rows = await query
          .orderBy(desc(queueItems.queueDate), asc(queueItems.arrivalTimestamp));

        // Fallback: If no records match today's date yet and no explicit past filter was queried, fetch any active queue items
        if (rows.length === 0 && !date && !startDate && !endDate && !all) {
          let fallbackWhere: SQL | undefined = undefined;
          if (deptFilter) {
            fallbackWhere = eq(queueItems.department, deptFilter);
          } else if (deptsList && deptsList.length > 0) {
            fallbackWhere = inArray(queueItems.department, deptsList);
          } else if (facilityDeptNames && facilityDeptNames.length > 0) {
            fallbackWhere = inArray(queueItems.department, facilityDeptNames);
          }

          let fallbackQuery = db.select().from(queueItems);
          if (fallbackWhere) {
            fallbackQuery = fallbackQuery.where(fallbackWhere) as any;
          }
          rows = await fallbackQuery.orderBy(asc(queueItems.arrivalTimestamp));
        }

        // Fallback 2 (Auto-Recovery & Sync): Ensure all registered clinical encounters exist in queueItems
        const todayStr = getLocalDateString();
        const allEncs = await db.select().from(encounters).limit(50);
        if (allEncs.length > 0) {
          const existingRegs = new Set(rows.map((r) => r.registrationNumber).filter(Boolean));
          const missingEncs = allEncs.filter(
            (enc) => enc.registrationNumber && !existingRegs.has(enc.registrationNumber)
          );

          if (missingEncs.length > 0) {
            for (const enc of missingEncs) {
              const qDate = enc.visitDate ? enc.visitDate.split("T")[0] : todayStr;
              await db
                .insert(queueItems)
                .values({
                  id: generatePrefixedId("q_"),
                  queueNumber: enc.queueNumber || "A-001",
                  registrationNumber: enc.registrationNumber,
                  patientId: enc.patientId,
                  departmentId: enc.departmentId || null,
                  doctorId: enc.doctorId || null,
                  encounterId: enc.id,
                  department: enc.clinicDepartment || "Poli Umum",
                  doctor: enc.doctorName || "dr. Dokter DPJP",
                  room: "Ruang 101",
                  arrivalTime:
                    new Date().toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }) + " WIB",
                  arrivalTimestamp: Date.now(),
                  chiefComplaint:
                    enc.chiefComplaint ||
                    "Pemeriksaan dan konsultasi rawat jalan",
                  status: (enc.encounterStatus as any) || "arrived",
                  satusehatStatus: enc.satusehatEncounterId ? "synced" : "pending",
                  satusehatConsent: "opt-in",
                  triagePriority: "regular",
                  queueDate: qDate,
                })
                .catch(() => {});
            }
            rows = await query.orderBy(
              desc(queueItems.queueDate),
              asc(queueItems.arrivalTimestamp)
            );
          }
        }

        if (rows.length === 0) return [];

        // Batch fetch all patients in 1 query (Eliminating N+1)
        const patientIds = rows.map((r) => r.patientId);
        const patientMap = await PatientRepository.getByIds(patientIds);

        // Batch fetch encounters to derive real SATUSEHAT sync status (Single Source of Truth)
        const encounterIds = rows.map((r) => r.encounterId).filter(Boolean) as string[];
        const regNumbers = rows.map((r) => r.registrationNumber).filter(Boolean) as string[];

        const encConditions: SQL[] = [];
        if (encounterIds.length > 0) encConditions.push(inArray(encounters.id, encounterIds));
        if (regNumbers.length > 0) encConditions.push(inArray(encounters.registrationNumber, regNumbers));

        const encounterByEncId = new Map<string, { id: string; registrationNumber: string | null; syncStatus: string | null; satusehatEncounterId: string | null }>();
        const encounterByRegNum = new Map<string, { id: string; registrationNumber: string | null; syncStatus: string | null; satusehatEncounterId: string | null }>();
        const encounterByPatientId = new Map<string, { id: string; registrationNumber: string | null; syncStatus: string | null; satusehatEncounterId: string | null }>();

        if (encConditions.length > 0 || patientIds.length > 0) {
          const encRows = await db
            .select({
              id: encounters.id,
              registrationNumber: encounters.registrationNumber,
              patientId: encounters.patientId,
              syncStatus: encounters.syncStatus,
              satusehatEncounterId: encounters.satusehatEncounterId,
            })
            .from(encounters)
            .where(
              encConditions.length > 0
                ? or(...encConditions, inArray(encounters.patientId, patientIds))
                : inArray(encounters.patientId, patientIds)
            );

          for (const enc of encRows) {
            encounterByEncId.set(enc.id, enc);
            if (enc.registrationNumber) encounterByRegNum.set(enc.registrationNumber, enc);
            if (enc.patientId) encounterByPatientId.set(enc.patientId, enc);
          }
        }

        const result: ClinicQueuePatientItem[] = [];

        for (const row of rows) {
          const patient = patientMap.get(row.patientId);
          if (patient) {
            const matchedEnc =
              (row.encounterId ? encounterByEncId.get(row.encounterId) : null) ||
              (row.registrationNumber ? encounterByRegNum.get(row.registrationNumber) : null) ||
              encounterByPatientId.get(row.patientId);

            // True sync status derived from actual clinical encounter
            const isSynced =
              matchedEnc?.syncStatus === "synced" ||
              Boolean(matchedEnc?.satusehatEncounterId) ||
              row.satusehatStatus === "synced";

            result.push({
              id: row.id,
              queueNumber: row.queueNumber,
              registrationNumber: row.registrationNumber || matchedEnc?.registrationNumber || undefined,
              patient,
              paymentPayer: row.paymentPayer || patient.paymentPayer || undefined,
              departmentId: row.departmentId || undefined,
              doctorId: row.doctorId || undefined,
              encounterId: row.encounterId || matchedEnc?.id || undefined,
              department: row.department,
              doctor: row.doctor,
              room: row.room,
              arrivalTime: row.arrivalTime,
              arrivalTimestamp: row.arrivalTimestamp || undefined,
              chiefComplaint: row.chiefComplaint,
              status: row.status as "arrived" | "in-progress" | "finished",
              satusehatStatus: isSynced ? "synced" : "pending",
              satusehatConsent: (row.satusehatConsent as "opt-in" | "opt-out") || "opt-in",
              triagePriority: (row.triagePriority as ClinicQueuePatientItem["triagePriority"]) || "regular",
            });
          }
        }

        return result;
      },
      CACHE_CONFIG.TTL.SHORT
    );
  },

  async getTodayQueue(department?: string): Promise<ClinicQueuePatientItem[]> {
    return this.getQueue({ department });
  },

  async add(item: ClinicQueuePatientItem): Promise<ClinicQueuePatientItem> {
    // 1. Ensure Patient exists or is created/updated
    let patient: PatientProfile | null = null;
    if (item.patient?.id) {
      patient = await PatientRepository.getById(item.patient.id);
    }
    if (!patient && item.patient?.nik) {
      patient = await PatientRepository.getByNik(item.patient.nik);
    }
    if (!patient) {
      patient = await PatientRepository.create(item.patient);
    }

    const todayStr = getLocalDateString();
    const id = item.id || generatePrefixedId("q_");

    // 1. Resolve encounter and its facility context if available
    let resolvedEncounterId = item.encounterId || null;
    let encFacilityId: string | null = null;
    if (resolvedEncounterId) {
      const encRows = await db
        .select({
          id: encounters.id,
          facilityId: encounters.facilityId,
          departmentId: encounters.departmentId,
          doctorId: encounters.doctorId,
        })
        .from(encounters)
        .where(eq(encounters.id, resolvedEncounterId))
        .limit(1);
      if (encRows.length > 0) {
        encFacilityId = encRows[0].facilityId;
        if (!item.departmentId && encRows[0].departmentId) item.departmentId = encRows[0].departmentId;
        if (!item.doctorId && encRows[0].doctorId) item.doctorId = encRows[0].doctorId;
      } else {
        // Encounter belum ada di database, jangan jadikan FK agar tidak error FK constraint
        resolvedEncounterId = null;
      }
    }
    
    if (!resolvedEncounterId && item.registrationNumber) {
      const encRows = await db
        .select({
          id: encounters.id,
          facilityId: encounters.facilityId,
          departmentId: encounters.departmentId,
          doctorId: encounters.doctorId,
        })
        .from(encounters)
        .where(eq(encounters.registrationNumber, item.registrationNumber))
        .limit(1);
      if (encRows.length > 0) {
        resolvedEncounterId = encRows[0].id;
        encFacilityId = encRows[0].facilityId;
        if (!item.departmentId && encRows[0].departmentId) item.departmentId = encRows[0].departmentId;
        if (!item.doctorId && encRows[0].doctorId) item.doctorId = encRows[0].doctorId;
      }
    }

    // 2. Resolve departmentId strictly within facility context
    let resolvedDepartmentId = item.departmentId || null;
    if (!resolvedDepartmentId && item.department) {
      const deptCondition = encFacilityId
        ? and(eq(departments.name, item.department), eq(departments.facilityId, encFacilityId))
        : eq(departments.name, item.department);

      const deptRows = await db
        .select({ id: departments.id })
        .from(departments)
        .where(deptCondition)
        .limit(1);
      if (deptRows.length > 0) {
        resolvedDepartmentId = deptRows[0].id;
      }
    }

    // 3. Resolve doctorId strictly within facility context
    let resolvedDoctorId = item.doctorId || null;
    if (!resolvedDoctorId && item.doctor) {
      const docCleanName = item.doctor.split(" (")[0].trim();
      const userCondition = encFacilityId
        ? and(eq(users.name, docCleanName), eq(users.facilityId, encFacilityId))
        : eq(users.name, docCleanName);

      const userRows = await db
        .select({ id: users.id })
        .from(users)
        .where(userCondition)
        .limit(1);
      if (userRows.length > 0) {
        resolvedDoctorId = userRows[0].id;
      }
    }

    const existingRows = await db.select().from(queueItems).where(eq(queueItems.id, id)).limit(1);
    const existing = existingRows[0];

    const regNumToUse =
      item.registrationNumber ||
      existing?.registrationNumber ||
      (await getNextRegistrationNumber(new Date(), "RJ"));

    if (existing) {
      await db
        .update(queueItems)
        .set({
          queueNumber: item.queueNumber || existing.queueNumber,
          registrationNumber: regNumToUse,
          patientId: patient.id,
          departmentId: resolvedDepartmentId !== null ? resolvedDepartmentId : existing.departmentId,
          doctorId: resolvedDoctorId !== null ? resolvedDoctorId : existing.doctorId,
          encounterId: resolvedEncounterId !== null ? resolvedEncounterId : existing.encounterId,
          department: item.department || existing.department,
          doctor: item.doctor || existing.doctor,
          room: item.room || existing.room,
          arrivalTime: item.arrivalTime || existing.arrivalTime,
          arrivalTimestamp: item.arrivalTimestamp || existing.arrivalTimestamp,
          chiefComplaint: item.chiefComplaint || existing.chiefComplaint,
          status: item.status || existing.status,
          paymentPayer: item.paymentPayer || existing.paymentPayer || patient.paymentPayer || null,
          satusehatStatus: item.satusehatStatus || existing.satusehatStatus,
          satusehatConsent: item.satusehatConsent || existing.satusehatConsent,
          triagePriority: item.triagePriority || existing.triagePriority,
          queueDate: todayStr,
        })
        .where(eq(queueItems.id, id));
    } else {
      await db.insert(queueItems).values({
        id,
        queueNumber: item.queueNumber,
        registrationNumber: regNumToUse,
        patientId: patient.id,
        paymentPayer: item.paymentPayer || patient.paymentPayer || null,
        departmentId: resolvedDepartmentId,
        doctorId: resolvedDoctorId,
        encounterId: resolvedEncounterId,
        department: item.department,
        doctor: item.doctor || "dr. Dokter Pemeriksa",
        room: item.room || "R-101",
        arrivalTime:
          item.arrivalTime ||
          new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          }) + " WIB",
        arrivalTimestamp: item.arrivalTimestamp || Date.now(),
        chiefComplaint: item.chiefComplaint || "Pemeriksaan Umum",
        status: item.status || "arrived",
        satusehatStatus: item.satusehatStatus || "pending",
        satusehatConsent:
          item.satusehatConsent || patient.satusehatConsent || "opt-in",
        triagePriority: item.triagePriority || "regular",
        queueDate: todayStr,
      });
    }

    InvalidationService.invalidateQueue();

    return {
      ...item,
      id,
      patient,
      paymentPayer: item.paymentPayer || patient.paymentPayer || undefined,
      departmentId: resolvedDepartmentId || undefined,
      doctorId: resolvedDoctorId || undefined,
      encounterId: resolvedEncounterId || undefined,
      satusehatStatus: item.satusehatStatus || "pending",
    };
  },

  async updateStatus(
    id: string,
    status?: "arrived" | "in-progress" | "finished",
    satusehatStatus?: "synced" | "pending"
  ): Promise<boolean> {
    const qRows = await db.select().from(queueItems).where(eq(queueItems.id, id)).limit(1);
    const qRow = qRows[0];

    const now = new Date().toISOString();
    const updateData: {
      status?: "arrived" | "in-progress" | "finished";
      calledAt?: string;
      callCount?: number;
      satusehatStatus?: "synced" | "pending";
    } = {};

    if (status) {
      updateData.status = status;
    }
    if (satusehatStatus) {
      updateData.satusehatStatus = satusehatStatus;
    }

    // Auto-record called_at and initial call_count when patient enters in-progress status
    if (status === "in-progress" && (!qRow?.calledAt || (qRow?.callCount || 0) === 0)) {
      updateData.calledAt = now;
      updateData.callCount = 1;
    }

    if (Object.keys(updateData).length > 0) {
      await db.update(queueItems).set(updateData).where(eq(queueItems.id, id));
    }

    if (qRow) {

      // Auto-link encounterId if currently null
      if (!qRow.encounterId && qRow.registrationNumber) {
        const encRows = await db
          .select({ id: encounters.id })
          .from(encounters)
          .where(eq(encounters.registrationNumber, qRow.registrationNumber))
          .limit(1);
        if (encRows.length > 0) {
          await db
            .update(queueItems)
            .set({ encounterId: encRows[0].id })
            .where(eq(queueItems.id, id));
        }
      }

      if (qRow.encounterId) {
        await db
          .update(encounters)
          .set({ encounterStatus: status, updatedAt: now })
          .where(eq(encounters.id, qRow.encounterId));
      } else if (qRow.registrationNumber) {
        await db
          .update(encounters)
          .set({ encounterStatus: status, updatedAt: now })
          .where(eq(encounters.registrationNumber, qRow.registrationNumber));
      } else if (qRow.queueNumber) {
        await db
          .update(encounters)
          .set({ encounterStatus: status, updatedAt: now })
          .where(eq(encounters.queueNumber, qRow.queueNumber));
      }
    }

    InvalidationService.invalidateQueue();
    InvalidationService.invalidateEncounter();
    return true;
  },

  async incrementCallCount(id: string): Promise<{ callCount: number; calledAt: string } | null> {
    const now = new Date().toISOString();
    const existingRows = await db.select().from(queueItems).where(eq(queueItems.id, id)).limit(1);
    const existing = existingRows[0];
    if (!existing) return null;

    const nextCount = (existing.callCount || 0) + 1;
    await db
      .update(queueItems)
      .set({
        callCount: nextCount,
        calledAt: now,
      })
      .where(eq(queueItems.id, id));

    InvalidationService.invalidateQueue();
    return { callCount: nextCount, calledAt: now };
  },

  async updateSatusehatStatus(params: {
    encounterId?: string;
    registrationNumber?: string;
    patientId?: string;
    status: "synced" | "pending";
  }): Promise<boolean> {
    const conditions: SQL[] = [];
    if (params.encounterId) conditions.push(eq(queueItems.encounterId, params.encounterId));
    if (params.registrationNumber) conditions.push(eq(queueItems.registrationNumber, params.registrationNumber));
    if (params.patientId) conditions.push(eq(queueItems.patientId, params.patientId));

    if (conditions.length === 0) return false;

    await db
      .update(queueItems)
      .set({ satusehatStatus: params.status })
      .where(or(...conditions));

    InvalidationService.invalidateQueue();
    return true;
  },

  async finishQueueForEncounter(params: {
    encounterId: string;
    registrationNumber?: string;
    queueNumber?: string;
    patientId: string;
    satusehatStatus?: "synced" | "pending";
  }): Promise<boolean> {
    const conditions: SQL[] = [];
    if (params.encounterId) conditions.push(eq(queueItems.encounterId, params.encounterId));
    if (params.registrationNumber) conditions.push(eq(queueItems.registrationNumber, params.registrationNumber));
    if (params.queueNumber) conditions.push(eq(queueItems.queueNumber, params.queueNumber));

    // Also match any active waiting/in-progress queue for this patient to ensure 100% completion
    const activePatientCondition = and(
      eq(queueItems.patientId, params.patientId),
      or(eq(queueItems.status, "in-progress"), eq(queueItems.status, "arrived"))
    );
    if (activePatientCondition) {
      conditions.push(activePatientCondition);
    }

    const updated = await db
      .update(queueItems)
      .set({
        status: "finished",
        encounterId: params.encounterId,
        satusehatStatus: params.satusehatStatus || "pending",
      })
      .where(or(...conditions))
      .returning({ id: queueItems.id });

    // Self-healing: Jika antrean belum pernah dibuat di database, buatkan record antrean selesai agar muncul di riwayat antrean hari ini
    if (updated.length === 0) {
      const encRows = await db
        .select()
        .from(encounters)
        .where(eq(encounters.id, params.encounterId))
        .limit(1);
      const enc = encRows[0];
      const todayStr = getLocalDateString();

      await db.insert(queueItems).values({
        id: generatePrefixedId("q_"),
        queueNumber: params.queueNumber || enc?.queueNumber || "A-001",
        registrationNumber:
          params.registrationNumber ||
          enc?.registrationNumber ||
          `RJ-${todayStr.replace(/-/g, "")}-0001`,
        patientId: params.patientId,
        departmentId: enc?.departmentId || null,
        doctorId: enc?.doctorId || null,
        encounterId: params.encounterId,
        department: enc?.clinicDepartment || "Poli Umum",
        doctor: enc?.doctorName || "dr. Dokter Pemeriksa",
        room: "Ruang 204 (Lt. 2)",
        arrivalTime:
          new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          }) + " WIB",
        arrivalTimestamp: Date.now(),
        chiefComplaint:
          enc?.chiefComplaint || "Pemeriksaan dan konsultasi rawat jalan",
        status: "finished",
        satusehatStatus: params.satusehatStatus || "synced",
        satusehatConsent: "opt-in",
        triagePriority: "regular",
        queueDate: enc?.visitDate ? enc.visitDate.split("T")[0] : todayStr,
      });
    }

    InvalidationService.invalidateQueue();
    InvalidationService.invalidateEncounter();
    return true;
  },
};
