import { NextRequest, NextResponse } from "next/server";
import { QueueRepository } from "@/lib/db/repositories/queue-repo";
import { ClinicQueuePatientItem } from "@/lib/satusehat/types";

import { applyRateLimit } from "@/lib/middleware/rate-limiter";

export async function GET(req: NextRequest) {
  const rateLimitResponse = applyRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  const startTime = performance.now();

  try {
    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department") || undefined;
    const date = searchParams.get("date") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const all = searchParams.get("all") === "true";

    const list = QueueRepository.getQueue({
      department,
      date,
      startDate,
      endDate,
      all,
    });

    const durationMs = Number((performance.now() - startTime).toFixed(2));

    return NextResponse.json(
      { success: true, data: list },
      {
        headers: {
          "Server-Timing": `db;dur=${durationMs}`,
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengambil daftar antrean dari database.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ClinicQueuePatientItem;

    if (!body.patient || !body.department || !body.queueNumber) {
      return NextResponse.json(
        {
          success: false,
          error: "Data antrean, poli, dan pasien wajib disertakan.",
        },
        { status: 400 }
      );
    }

    const created = QueueRepository.add(body);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mendaftarkan antrean ke database.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
