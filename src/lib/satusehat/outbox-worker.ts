import { OutboxRepository, OutboxItem } from "@/lib/db/repositories/outbox-repo";
import { EncounterRepository } from "@/lib/db/repositories/encounter-repo";
import { PatientRepository } from "@/lib/db/repositories/patient-repo";
import { SatusehatClient } from "./client";
import { SatusehatEnvironment } from "./types";

export interface OutboxProcessingResult {
  processedCount: number;
  succeededCount: number;
  failedCount: number;
  details: Array<{
    id: string;
    encounterId: string;
    status: "synced" | "failed";
    message: string;
  }>;
}

/**
 * Worker untuk memproses antrean Outbox SATUSEHAT secara berkala di latar belakang
 * Menggunakan prinsip Outbox Pattern & Exponential Backoff saat server Kemenkes mengalami downtime.
 */
export async function processOutboxQueue(
  batchLimit = 5,
  targetEnv?: SatusehatEnvironment
): Promise<OutboxProcessingResult> {
  const dueItems = await OutboxRepository.fetchDueItems(batchLimit);

  const result: OutboxProcessingResult = {
    processedCount: dueItems.length,
    succeededCount: 0,
    failedCount: 0,
    details: [],
  };

  if (dueItems.length === 0) {
    return result;
  }

  // 1. Verifikasi konektivitas token ke gateway Kemenkes
  const authRes = await SatusehatClient.getOrFetchToken(targetEnv);
  if (!authRes.success || !authRes.data?.accessToken) {
    const errorMsg =
      authRes.error?.message || "Koneksi gateway autentikasi SATUSEHAT terputus.";
    // Seluruh item dalam batch dijadwalkan ulang dengan backoff karena server Kemenkes sedang down
    for (const item of dueItems) {
      await OutboxRepository.markFailed(item.id, item.retryCount, errorMsg);
      result.failedCount++;
      result.details.push({
        id: item.id,
        encounterId: item.encounterId,
        status: "failed",
        message: `Gateway auth down: ${errorMsg}`,
      });
    }
    return result;
  }

  const token = authRes.data.accessToken;

  // 2. Proses tiap item yang telah jatuh tempo
  for (const item of dueItems) {
    try {
      await OutboxRepository.markProcessing(item.id);

      const encounter = await EncounterRepository.getById(item.encounterId);
      if (!encounter) {
        await OutboxRepository.markFailed(
          item.id,
          item.maxRetries,
          "Encounter tidak ditemukan di database."
        );
        result.failedCount++;
        result.details.push({
          id: item.id,
          encounterId: item.encounterId,
          status: "failed",
          message: "Encounter tidak ditemukan.",
        });
        continue;
      }

      if (!encounter.patientId) {
        await OutboxRepository.markFailed(
          item.id,
          item.maxRetries,
          "ID Pasien pada encounter tidak ditemukan."
        );
        result.failedCount++;
        result.details.push({
          id: item.id,
          encounterId: item.encounterId,
          status: "failed",
          message: "ID Pasien tidak valid.",
        });
        continue;
      }

      const patient = await PatientRepository.getById(encounter.patientId);
      if (!patient) {
        await OutboxRepository.markFailed(
          item.id,
          item.maxRetries,
          "Profil pasien tidak ditemukan."
        );
        result.failedCount++;
        result.details.push({
          id: item.id,
          encounterId: item.encounterId,
          status: "failed",
          message: "Pasien tidak ditemukan.",
        });
        continue;
      }

      // Jika encounter sudah sukses tersinkronisasi sebelumnya
      if (encounter.syncStatus === "synced" && encounter.satusehatEncounterId) {
        await OutboxRepository.markSynced(item.id);
        result.succeededCount++;
        result.details.push({
          id: item.id,
          encounterId: item.encounterId,
          status: "synced",
          message: "Telah tersinkronisasi sebelumnya.",
        });
        continue;
      }

      // Jalankan proses sinkronisasi ulang via internal request ke API sync-retry
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

      let payloadParsed: Record<string, unknown> = {};
      try {
        payloadParsed = JSON.parse(item.payload);
      } catch {
        payloadParsed = {};
      }

      const syncPayload = {
        patient,
        encounter,
        targetResourceTypes: payloadParsed.targetResourceTypes || undefined,
        token,
        env: targetEnv || (process.env.SATUSEHAT_ENV as SatusehatEnvironment) || "staging",
      };

      const syncRes = await fetch(`${baseUrl}/api/satusehat/sync-retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(syncPayload),
      });

      const syncData = await syncRes.json().catch(() => ({}));

      if (syncRes.ok && syncData.success && syncData.data?.syncStatus === "synced") {
        await OutboxRepository.markSynced(item.id);
        result.succeededCount++;
        result.details.push({
          id: item.id,
          encounterId: item.encounterId,
          status: "synced",
          message: "Berhasil disinkronkan ke SATUSEHAT melalui outbox worker.",
        });
      } else {
        const errorDetail =
          syncData.error ||
          syncData.message ||
          `HTTP ${syncRes.status}: Sinkronisasi belum tuntas (${syncData.data?.failedCount || 1} gagal).`;

        await OutboxRepository.markFailed(item.id, item.retryCount, errorDetail);
        result.failedCount++;
        result.details.push({
          id: item.id,
          encounterId: item.encounterId,
          status: "failed",
          message: errorDetail,
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Kesalahan tak terduga worker outbox.";
      await OutboxRepository.markFailed(item.id, item.retryCount, errorMsg);
      result.failedCount++;
      result.details.push({
        id: item.id,
        encounterId: item.encounterId,
        status: "failed",
        message: errorMsg,
      });
    }
  }

  return result;
}
