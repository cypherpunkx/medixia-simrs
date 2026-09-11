import { NextRequest, NextResponse } from "next/server";
import { QueueRepository } from "@/lib/db/repositories/queue-repo";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (body.action === "call") {
      const callResult = QueueRepository.incrementCallCount(id);
      if (!callResult) {
        return NextResponse.json(
          { success: false, error: "Antrean tidak ditemukan." },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: callResult });
    }

    if (body.status) {
      const ok = QueueRepository.updateStatus(id, body.status);
      if (!ok) {
        return NextResponse.json(
          { success: false, error: "Antrean tidak ditemukan." },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, message: "Status antrean diperbarui." });
    }

    return NextResponse.json(
      { success: false, error: "Action atau status wajib ditentukan." },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal memperbarui status antrean.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
