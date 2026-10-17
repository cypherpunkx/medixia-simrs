import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/lib/db";
import { MemoryCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

/**
 * Enterprise Production Health Check Endpoint (Liveness & Readiness Probe)
 * Digunakan oleh load balancer, Kubernetes k8s probe, atau uptime monitor.
 */
export async function GET() {
  const startTime = performance.now();
  const dbConnected = await checkDatabaseConnection();
  const dbLatencyMs = Number((performance.now() - startTime).toFixed(2));

  const memory = process.memoryUsage();
  const heapUsedMB = Number((memory.heapUsed / 1024 / 1024).toFixed(2));
  const heapTotalMB = Number((memory.heapTotal / 1024 / 1024).toFixed(2));
  const rssMB = Number((memory.rss / 1024 / 1024).toFixed(2));

  const cacheStats = MemoryCache.getStats();

  const isHealthy = dbConnected && heapUsedMB < 1024; // Alert jika heap > 1GB

  const payload = {
    status: isHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
    checks: {
      database: {
        status: dbConnected ? "up" : "down",
        engine: "postgresql",
        latencyMs: dbLatencyMs,
      },
      memory: {
        status: heapUsedMB < 800 ? "normal" : "warning",
        heapUsedMB,
        heapTotalMB,
        rssMB,
      },
      cacheTier: {
        entries: cacheStats.size,
        hitRate: `${cacheStats.hitRatePercentage}%`,
        totalQueries: cacheStats.total,
      },
    },
  };

  return NextResponse.json(payload, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
