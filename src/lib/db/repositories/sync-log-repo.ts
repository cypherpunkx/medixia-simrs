import { db } from "../index";
import { satusehatSyncLogs } from "../schema";
import { eq, and } from "drizzle-orm";
import { ResourceSyncItem } from "@/lib/satusehat/types";
import { generatePrefixedId } from "@/lib/id-generator";

export const SyncLogRepository = {
  async getByEncounterId(encounterId: string): Promise<ResourceSyncItem[]> {
    const rows = await db
      .select()
      .from(satusehatSyncLogs)
      .where(eq(satusehatSyncLogs.encounterId, encounterId));

    return rows.map((r: typeof satusehatSyncLogs.$inferSelect) => ({
      resourceType: r.resourceType,
      label: r.label,
      category: r.category || undefined,
      standard: r.standard,
      status: r.status as "synced" | "failed" | "pending",
      httpStatus: r.httpStatus || undefined,
      fhirId: r.fhirId || undefined,
      errorMessage: r.errorMessage || undefined,
      retryCount: r.retryCount || 0,
      lastAttempt: r.lastAttempt || undefined,
      details: r.details ? JSON.parse(r.details) : undefined,
    }));
  },

  async saveBreakdown(encounterId: string, breakdown: ResourceSyncItem[]): Promise<void> {
    // Delete existing logs for this encounter and re-insert
    await db.delete(satusehatSyncLogs).where(eq(satusehatSyncLogs.encounterId, encounterId));

    const now = new Date().toISOString();
    for (let i = 0; i < breakdown.length; i++) {
      const item = breakdown[i];
      await db.insert(satusehatSyncLogs).values({
        id: generatePrefixedId("sync_"),
        encounterId,
        resourceType: item.resourceType,
        label: item.label,
        category: item.category || null,
        standard: item.standard,
        status: item.status,
        httpStatus: item.httpStatus || null,
        fhirId: item.fhirId || null,
        errorMessage: item.errorMessage || null,
        retryCount: item.retryCount || 0,
        lastAttempt: item.lastAttempt || now,
        details: item.details ? JSON.stringify(item.details) : null,
      });
    }
  },

  async updateResourceStatus(
    encounterId: string,
    resourceType: string,
    status: "synced" | "failed" | "pending",
    httpStatus?: number,
    fhirId?: string,
    errorMessage?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    const rows = await db
      .select()
      .from(satusehatSyncLogs)
      .where(
        and(
          eq(satusehatSyncLogs.encounterId, encounterId),
          eq(satusehatSyncLogs.resourceType, resourceType)
        )
      )
      .limit(1);

    const existing = rows[0];
    if (existing) {
      await db
        .update(satusehatSyncLogs)
        .set({
          status,
          httpStatus: httpStatus || existing.httpStatus,
          fhirId: fhirId || existing.fhirId,
          errorMessage: errorMessage || null,
          retryCount: (existing.retryCount || 0) + 1,
          lastAttempt: now,
        })
        .where(
          and(
            eq(satusehatSyncLogs.encounterId, encounterId),
            eq(satusehatSyncLogs.resourceType, resourceType)
          )
        );
    }
  },
};
