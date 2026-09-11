import { NextRequest, NextResponse } from "next/server";
import { SatusehatClient } from "@/lib/satusehat/client";
import { SatusehatEnvironment } from "@/lib/satusehat/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const env = (searchParams.get("env") as SatusehatEnvironment) || "staging";

    const pingResult = await SatusehatClient.pingGateway(env);
    return NextResponse.json(pingResult);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        reachable: false,
        latencyMs: 0,
        error: error instanceof Error ? error.message : "Ping error",
      },
      { status: 500 }
    );
  }
}
