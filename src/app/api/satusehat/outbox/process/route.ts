import { NextRequest, NextResponse } from "next/server";
import { processOutboxQueue } from "@/lib/satusehat/outbox-worker";
import { OutboxRepository } from "@/lib/db/repositories/outbox-repo";
import { SatusehatEnvironment } from "@/lib/satusehat/types";

export async function GET() {
  try {
    const stats = await OutboxRepository.getStats();
    const dueItems = await OutboxRepository.fetchDueItems(10);

    return NextResponse.json({
      success: true,
      data: {
        stats,
        dueCount: dueItems.length,
        dueItems: dueItems.map((d) => ({
          id: d.id,
          encounterId: d.encounterId,
          resourceType: d.resourceType,
          status: d.status,
          retryCount: d.retryCount,
          maxRetries: d.maxRetries,
          nextRetryAt: d.nextRetryAt,
          errorMessage: d.errorMessage,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengambil status antrean outbox.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const batchLimit = typeof body.limit === "number" && body.limit > 0 ? body.limit : 5;
    const targetEnv: SatusehatEnvironment | undefined = body.env;

    const startTime = Date.now();
    const result = await processOutboxQueue(batchLimit, targetEnv);
    const elapsed = Date.now() - startTime;

    const updatedStats = await OutboxRepository.getStats();

    return NextResponse.json({
      success: true,
      message: `Pemrosesan antrean outbox selesai (${elapsed}ms). Diproses: ${result.processedCount}, Berhasil: ${result.succeededCount}, Gagal/Dijadwalkan Ulang: ${result.failedCount}.`,
      data: {
        ...result,
        executionTimeMs: elapsed,
        currentStats: updatedStats,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal memproses antrean outbox.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
