import { NextRequest, NextResponse } from "next/server";
import { KFA_MEDICATIONS_DATABASE } from "@/lib/satusehat/kfa-database";
import { MemoryCache, CACHE_CONFIG } from "@/lib/cache";

export async function GET(request: NextRequest) {
  const startTime = performance.now();
  const searchParams = request.nextUrl.searchParams;
  const query = (searchParams.get("q") || "").toLowerCase().trim();
  const category = (searchParams.get("category") || "").toLowerCase().trim();

  const cacheKey = CACHE_CONFIG.KEYS.KFA_SEARCH(`${query}:${category}`);

  const results = MemoryCache.getOrSet(
    cacheKey,
    () => {
      let filtered = KFA_MEDICATIONS_DATABASE;

      if (query) {
        filtered = filtered.filter(
          (m) =>
            m.name.toLowerCase().includes(query) ||
            m.genericName.toLowerCase().includes(query) ||
            m.kfaCode.includes(query) ||
            m.indications.some((ind) => ind.toLowerCase().includes(query))
        );
      }

      if (category) {
        filtered = filtered.filter((m) =>
          m.category.toLowerCase().includes(category)
        );
      }

      return filtered;
    },
    CACHE_CONFIG.TTL.LONG
  );

  const latencyMs = Number((performance.now() - startTime).toFixed(2));

  return NextResponse.json(
    {
      success: true,
      data: results,
      total: results.length,
      meta: {
        source: "Kemenkes RI Kamus Farmasi dan Alat Kesehatan (KFA) v1.0",
        latencyMs,
        timestamp: new Date().toISOString(),
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "Server-Timing": `app;dur=${latencyMs}`,
      },
    }
  );
}
