import { db } from "../index";
import { queueItems, encounters } from "../schema";
import { eq, and, asc, desc, gte, lte, SQL } from "drizzle-orm";
import { ClinicQueuePatientItem, PatientProfile } from "@/lib/satusehat/types";
import { PatientRepository } from "./patient-repo";
import { MemoryCache, CACHE_CONFIG, InvalidationService } from "@/lib/cache";

export interface QueueFilterOptions {
  date?: string; // YYYY-MM-DD
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  department?: string;
  all?: boolean; // If true, return all historical queue records
}

export const QueueRepository = {
  getQueue(options?: QueueFilterOptions): ClinicQueuePatientItem[] {
    const cacheKey = CACHE_CONFIG.KEYS.QUEUE_FILTER(JSON.stringify(options || {}));

    return MemoryCache.getOrSet(
      cacheKey,
      () => {
        const { date, startDate, endDate, department, all } = options || {};
        const deptFilter =
          department && department !== "Semua Poli" && department !== "all"
            ? department
            : undefined;

        const conditions: SQL[] = [];
        if (deptFilter) {
          conditions.push(eq(queueItems.department, deptFilter));
        }

        if (!all) {
          if (startDate && endDate) {
            conditions.push(gte(queueItems.queueDate, startDate));
            conditions.push(lte(queueItems.queueDate, endDate));
          } else if (date) {
            conditions.push(eq(queueItems.queueDate, date));
          } else {
            const todayStr = new Date().toISOString().split("T")[0];
            conditions.push(eq(queueItems.queueDate, todayStr));
          }
        }

        let query = db.select().from(queueItems);
        if (conditions.length === 1) {
          query = query.where(conditions[0]) as any;
        } else if (conditions.length > 1) {
          query = query.where(and(...conditions)) as any;
        }

        let rows = query
          .orderBy(desc(queueItems.queueDate), asc(queueItems.arrivalTimestamp))
          .all();

        // Fallback: If no records match today's date yet and no explicit past filter was queried, fetch any active queue items
        if (rows.length === 0 && !date && !startDate && !endDate && !all) {
          const fallbackQuery = deptFilter
            ? db
                .select()
                .from(queueItems)
                .where(eq(queueItems.department, deptFilter))
                .orderBy(asc(queueItems.arrivalTimestamp))
            : db
                .select()
                .from(queueItems)
                .orderBy(asc(queueItems.arrivalTimestamp));
          rows = fallbackQuery.all();
        }

        if (rows.length === 0) return [];

        // Batch fetch all patients in 1 query (Eliminating N+1)
        const patientIds = rows.map((r) => r.patientId);
        const patientMap = PatientRepository.getByIds(patientIds);

        const result: ClinicQueuePatientItem[] = [];

        for (const row of rows) {
          const patient = patientMap.get(row.patientId);
          if (patient) {
            result.push({
              id: row.id,
              queueNumber: row.queueNumber,
              patient,
              department: row.department,
              doctor: row.doctor,
              room: row.room,
              arrivalTime: row.arrivalTime,
              arrivalTimestamp: row.arrivalTimestamp || undefined,
              chiefComplaint: row.chiefComplaint,
              status: row.status as "arrived" | "in-progress" | "finished",
              satusehatStatus: (row.satusehatStatus as "synced" | "pending") || "pending",
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

  getTodayQueue(department?: string): ClinicQueuePatientItem[] {
    return this.getQueue({ department });
  },

  add(item: ClinicQueuePatientItem): ClinicQueuePatientItem {
    // 1. Ensure Patient exists or is created/updated
    let patient: PatientProfile | null = null;
    if (item.patient?.id) {
      patient = PatientRepository.getById(item.patient.id);
    }
    if (!patient && item.patient?.nik) {
      patient = PatientRepository.getByNik(item.patient.nik);
    }
    if (!patient) {
      patient = PatientRepository.create(item.patient);
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const id = item.id || `Q-${Date.now().toString(36).toUpperCase()}`;

    const existing = db.select().from(queueItems).where(eq(queueItems.id, id)).get();
    if (existing) {
      db.update(queueItems)
        .set({
          queueNumber: item.queueNumber || existing.queueNumber,
          patientId: patient.id,
          department: item.department || existing.department,
          doctor: item.doctor || existing.doctor,
          room: item.room || existing.room,
          arrivalTime: item.arrivalTime || existing.arrivalTime,
          arrivalTimestamp: item.arrivalTimestamp || existing.arrivalTimestamp,
          chiefComplaint: item.chiefComplaint || existing.chiefComplaint,
          status: item.status || existing.status,
          satusehatStatus: item.satusehatStatus || existing.satusehatStatus,
          satusehatConsent: item.satusehatConsent || existing.satusehatConsent,
          triagePriority: item.triagePriority || existing.triagePriority,
          queueDate: todayStr,
        })
        .where(eq(queueItems.id, id))
        .run();
    } else {
      db.insert(queueItems)
        .values({
          id,
          queueNumber: item.queueNumber,
          patientId: patient.id,
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
        })
        .run();
    }

    InvalidationService.invalidateQueue();

    return {
      ...item,
      id,
      patient,
      satusehatStatus: item.satusehatStatus || "pending",
    };
  },

  updateStatus(id: string, status: "arrived" | "in-progress" | "finished"): boolean {
    const qRow = db.select().from(queueItems).where(eq(queueItems.id, id)).get();
    const res = db.update(queueItems).set({ status }).where(eq(queueItems.id, id)).run();

    if (qRow) {
      const now = new Date().toISOString();
      if (qRow.queueNumber) {
        db.update(encounters)
          .set({ encounterStatus: status, updatedAt: now })
          .where(eq(encounters.queueNumber, qRow.queueNumber))
          .run();
      }
      if (qRow.patientId) {
        db.update(encounters)
          .set({ encounterStatus: status, updatedAt: now })
          .where(eq(encounters.patientId, qRow.patientId))
          .run();
      }
    }

    InvalidationService.invalidateQueue();
    InvalidationService.invalidateEncounter();
    return res.changes > 0;
  },

  incrementCallCount(id: string): { callCount: number; calledAt: string } | null {
    const now = new Date().toISOString();
    const existing = db.select().from(queueItems).where(eq(queueItems.id, id)).get();
    if (!existing) return null;

    const nextCount = (existing.callCount || 0) + 1;
    db.update(queueItems)
      .set({
        callCount: nextCount,
        calledAt: now,
      })
      .where(eq(queueItems.id, id))
      .run();

    InvalidationService.invalidateQueue();
    return { callCount: nextCount, calledAt: now };
  },
};
