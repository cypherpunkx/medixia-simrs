import { db } from "../index";
import { satusehatOutbox, encounters } from "../schema";
import { eq, and, or, inArray, lte, sql } from "drizzle-orm";
import { generatePrefixedId } from "@/lib/id-generator";

export interface OutboxItem {
  id: string;
  encounterId: string;
  resourceType: string;
  payload: string;
  status: "pending" | "processing" | "synced" | "failed";
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Interval exponential backoff dalam detik: 30dtk, 2mnt, 10mnt, 30mnt, 2jam
const BACKOFF_DELAYS_SECONDS = [30, 120, 600, 1800, 7200];

export const OutboxRepository = {
  /**
   * Menambahkan pesan baru ke antrean outbox
   */
  async enqueue(
    encounterId: string,
    resourceType: string,
    payload: Record<string, unknown> | string,
    maxRetries = 5
  ): Promise<OutboxItem> {
    const id = generatePrefixedId("obx_");
    const now = new Date();
    const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);

    // Pertama kali masuk: siap diproses segera (next_retry_at = now)
    const nextRetryAt = now.toISOString();

    await db.insert(satusehatOutbox).values({
      id,
      encounterId,
      resourceType,
      payload: payloadStr,
      status: "pending",
      retryCount: 0,
      maxRetries,
      nextRetryAt,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    return {
      id,
      encounterId,
      resourceType,
      payload: payloadStr,
      status: "pending",
      retryCount: 0,
      maxRetries,
      nextRetryAt,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  },

  /**
   * Mengambil antrean yang telah jatuh tempo untuk diproses ulang (retry)
   */
  async fetchDueItems(limit = 10): Promise<OutboxItem[]> {
    const nowIso = new Date().toISOString();

    const rows = await db
      .select()
      .from(satusehatOutbox)
      .where(
        and(
          inArray(satusehatOutbox.status, ["pending", "failed"]),
          lte(satusehatOutbox.nextRetryAt, nowIso),
          sql`${satusehatOutbox.retryCount} < ${satusehatOutbox.maxRetries}`
        )
      )
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      encounterId: r.encounterId,
      resourceType: r.resourceType,
      payload: r.payload,
      status: r.status as OutboxItem["status"],
      retryCount: r.retryCount,
      maxRetries: r.maxRetries,
      nextRetryAt: r.nextRetryAt,
      errorMessage: r.errorMessage,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  },

  /**
   * Menandai item sedang dalam proses pengiriman ke Kemenkes
   */
  async markProcessing(id: string): Promise<void> {
    await db
      .update(satusehatOutbox)
      .set({
        status: "processing",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(satusehatOutbox.id, id));
  },

  /**
   * Menandai item sukses tersinkronisasi ke SATUSEHAT
   */
  async markSynced(id: string): Promise<void> {
    await db
      .update(satusehatOutbox)
      .set({
        status: "synced",
        errorMessage: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(satusehatOutbox.id, id));
  },

  /**
   * Menandai item gagal dengan penjadwalan exponential backoff berikutnya
   */
  async markFailed(id: string, currentRetryCount: number, errorMsg: string): Promise<void> {
    const nextRetryCount = currentRetryCount + 1;
    const now = new Date();

    // Hitung jadwal percobaan berikutnya dengan exponential backoff
    const delayIndex = Math.min(nextRetryCount - 1, BACKOFF_DELAYS_SECONDS.length - 1);
    const delaySeconds = BACKOFF_DELAYS_SECONDS[delayIndex] || 300;
    const nextRetryDate = new Date(now.getTime() + delaySeconds * 1000);

    await db
      .update(satusehatOutbox)
      .set({
        status: "failed",
        retryCount: nextRetryCount,
        nextRetryAt: nextRetryDate.toISOString(),
        errorMessage: errorMsg.slice(0, 1000),
        updatedAt: now.toISOString(),
      })
      .where(eq(satusehatOutbox.id, id));
  },

  /**
   * Statistik antrean outbox untuk monitoring dasbor
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    synced: number;
    failed: number;
    total: number;
  }> {
    const rows = await db
      .select({
        status: satusehatOutbox.status,
        count: sql<number>`count(*)::int`,
      })
      .from(satusehatOutbox)
      .groupBy(satusehatOutbox.status);

    const stats = {
      pending: 0,
      processing: 0,
      synced: 0,
      failed: 0,
      total: 0,
    };

    for (const r of rows) {
      if (r.status in stats) {
        stats[r.status as keyof typeof stats] = r.count;
      }
      stats.total += r.count;
    }

    return stats;
  },
};
