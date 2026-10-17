import { runMigrations } from "./migrate";
import { cleanDatabase } from "./clean_db";
import { seedMasterData } from "./seed_master";
import { seedTransactionData } from "./seed_transactions";

// ============================================================================
// SIMRS MEDIXIA & SATUSEHAT - MASTER DATABASE ORCHESTRATOR
// Standar Kemenkes RI, Permenkes No. 24/2022, HL7 FHIR R4
// Mengorkestrasi: Migrasi DDL -> Clean (opsional) -> Master Data -> Transaksi
// ============================================================================

const isFresh =
  process.argv.includes("--fresh") ||
  process.argv.includes("--reset") ||
  process.argv.includes("-f");

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:admin@localhost:5432/medixia_simrs";

export async function runOrchestratedSeed() {
  const totalStartTime = Date.now();

  console.log("\n==================================================================================");
  console.log("🌟 SIMRS MEDIXIA & SATUSEHAT - MASTER DATABASE ORCHESTRATOR");
  console.log(`🔌 Target Database : ${connectionString.replace(/:[^:@]+@/, ":****@")}`);
  console.log(`⚙️  Mode Eksekusi   : ${isFresh ? "FRESH RESET & RE-SEED (--fresh)" : "INCREMENTAL / UPSERT SEED"}`);
  console.log("==================================================================================\n");

  try {
    // ------------------------------------------------------------------------
    // Langkah 1: Jalankan Migrasi DDL Skema (20 Tabel Relasional & Sequences)
    // ------------------------------------------------------------------------
    console.log("🚀 [TAHAP 1/3] Menjalankan Sinkronisasi Migrasi & Skema Database...");
    await runMigrations();

    // ------------------------------------------------------------------------
    // Langkah Opsional: Jika mode --fresh, bersihkan transaksi lama terlebih dahulu
    // ------------------------------------------------------------------------
    if (isFresh) {
      console.log("\n🧹 [TAHAP OPTIONAL] Mengosongkan data transaksi lama (--fresh aktif)...");
      await cleanDatabase();
    }

    // ------------------------------------------------------------------------
    // Langkah 2: Seed Master Data (Faskes, Poli, Nakes/User, Kamus KFA, ICD)
    // ------------------------------------------------------------------------
    console.log("\n📦 [TAHAP 2/3] Menyinkronkan Master Data SIMRS & Kemenkes RI...");
    await seedMasterData();

    // ------------------------------------------------------------------------
    // Langkah 3: Seed Data Transaksi (Pasien, RME, Resep, Penunjang, Antrean)
    // ------------------------------------------------------------------------
    console.log("\n📋 [TAHAP 3/3] Menyinkronkan Data Transaksi Operasional Klinis...");
    await seedTransactionData();

    const totalElapsed = Date.now() - totalStartTime;

    console.log("\n==================================================================================");
    console.log(`🎉 SELURUH PROSES DATABASE ORCHESTRATOR SELESAI SUKSES DALAM ${totalElapsed}ms!`);
    console.log("==================================================================================");
    console.log("✅ DDL Skema & Indeks  : 20 Tabel Relasional & 46 Query Indexes up-to-date");
    console.log("✅ Master Referensi    : Faskes, Poliklinik, RBAC Users, Obat KFA, ICD-10, ICD-9-CM");
    console.log("✅ Transaksi Klinis    : Pasien, RME, Resep, Penunjang, Antrean & Integrasi SATUSEHAT");
    console.log("💡 SIMRS Medixia siap digunakan untuk operasional dan pengujian sistem.\n");
  } catch (error) {
    console.error("\n❌ Terjadi kegagalan saat menjalankan Database Orchestrator:", error);
    process.exit(1);
  }
}

// Eksekusi bila dipanggil langsung via CLI
if (require.main === module || process.argv[1]?.includes("seed")) {
  runOrchestratedSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
