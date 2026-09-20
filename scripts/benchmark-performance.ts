import { EncounterRepository } from "../src/lib/db/repositories/encounter-repo";
import { QueueRepository } from "../src/lib/db/repositories/queue-repo";
import { PatientRepository } from "../src/lib/db/repositories/patient-repo";
import { MemoryCache } from "../src/lib/cache";

async function runBenchmarks() {
  console.log("\n==================================================================");
  console.log("🚀 SIMRS RME SATUSEHAT - POSTGRESQL PERFORMANCE BENCHMARK SUITE");
  console.log("==================================================================\n");

  // 1. Encounter Repository Benchmark (Batch Eager Loading vs In-Memory Cache)
  console.log("📊 1. EncounterRepository.getAll()");
  MemoryCache.clear();
  const startEncCold = performance.now();
  const encountersCold = await EncounterRepository.getAll();
  const durationEncCold = performance.now() - startEncCold;
  console.log(`   - Cold Run (Batch Eager DB Query, ${encountersCold.length} records): ${durationEncCold.toFixed(2)} ms`);

  const startEncWarm = performance.now();
  const encountersWarm = await EncounterRepository.getAll();
  const durationEncWarm = performance.now() - startEncWarm;
  console.log(`   - Warm Run (In-Memory Cache Hit, ${encountersWarm.length} records): ${durationEncWarm.toFixed(2)} ms`);
  console.log(`   - Speedup: ${(durationEncCold / Math.max(0.01, durationEncWarm)).toFixed(1)}x faster\n`);

  // 2. Queue Repository Benchmark (Batch Patient Map vs Individual N+1)
  console.log("📊 2. QueueRepository.getQueue()");
  MemoryCache.clear();
  const startQueueCold = performance.now();
  const queueCold = await QueueRepository.getQueue();
  const durationQueueCold = performance.now() - startQueueCold;
  console.log(`   - Cold Run (Batch Join & Fetch, ${queueCold.length} items): ${durationQueueCold.toFixed(2)} ms`);

  const startQueueWarm = performance.now();
  const queueWarm = await QueueRepository.getQueue();
  const durationQueueWarm = performance.now() - startQueueWarm;
  console.log(`   - Warm Run (In-Memory Cache Hit, ${queueWarm.length} items): ${durationQueueWarm.toFixed(2)} ms`);
  console.log(`   - Speedup: ${(durationQueueCold / Math.max(0.01, durationQueueWarm)).toFixed(1)}x faster\n`);

  // 3. Patient Repository Batch vs Sequential Fetch
  console.log("📊 3. Patient Batch Loading (getByIds)");
  MemoryCache.clear();
  const allPatients = await PatientRepository.getAll();
  const patientIds = allPatients.map((p) => p.id);

  MemoryCache.clear();
  const startBatch = performance.now();
  const batchMap = await PatientRepository.getByIds(patientIds);
  const durationBatch = performance.now() - startBatch;
  console.log(`   - Batch Query (${batchMap.size} patients in 1 SQL statement): ${durationBatch.toFixed(2)} ms`);

  // 4. Cache Statistics
  console.log("\n📊 4. In-Memory Cache Telemetry");
  const stats = MemoryCache.getStats();
  console.log(`   - Total Cache Hits: ${stats.hits}`);
  console.log(`   - Total Cache Misses: ${stats.misses}`);
  console.log(`   - Hit Rate: ${stats.hitRatePercentage}%`);
  console.log(`   - Active Cached Keys: ${stats.size}`);

  console.log("\n==================================================================");
  console.log("✅ ALL PERFORMANCE BENCHMARKS COMPLETED SUCCESSFULLY!");
  console.log("==================================================================\n");
}

runBenchmarks().catch(console.error);
