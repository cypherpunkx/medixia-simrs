import { NextRequest, NextResponse } from "next/server";
import { QueueRepository } from "@/lib/db/repositories/queue-repo";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    let callResult = null;
    if (body.action === "call") {
      callResult = await QueueRepository.incrementCallCount(id);
    }

    if (body.status || body.satusehatStatus) {
      const ok = await QueueRepository.updateStatus(id, body.status, body.satusehatStatus);
      if (!ok && !callResult) {
        return NextResponse.json(
          { success: false, error: "Antrean tidak ditemukan." },
          { status: 404 }
        );
      }
    }

    if (callResult) {
      return NextResponse.json({ success: true, data: callResult });
    }

    if (body.status || body.satusehatStatus) {
      return NextResponse.json({ success: true, message: "Status antrean diperbarui." });
    }

    return NextResponse.json(
      { success: false, error: "Action, status, atau satusehatStatus wajib ditentukan." },
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
