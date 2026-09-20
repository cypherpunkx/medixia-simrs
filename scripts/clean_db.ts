import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/medixia_simrs";

const client = postgres(connectionString, {
  max: 5,
  idle_timeout: 10,
  prepare: false,
});

async function cleanDatabase() {
  console.log("==================================================");
  console.log("🧹 MEMULAI PROSES PEMBERSIHAN DATA OPERASIONAL DB");
  console.log("==================================================");

  try {
    // 1. Truncate all transactional & patient tables with CASCADE
    console.log("Menghapus data tabel operasional klinis...");
    await client.unsafe(`
      TRUNCATE TABLE 
        satusehat_sync_logs,
        medical_addendums,
        radiology_results,
        lab_results,
        diagnostic_orders,
        prescriptions,
        procedures,
        diagnoses,
        vitals,
        encounters,
        queue_items,
        patients
      CASCADE;
    `);

    console.log("✅ Berhasil mengosongkan seluruh data operasional pasien, antrean, dan rekam medis.");

    // 2. Verify row counts
    const tables = [
      "facilities",
      "departments",
      "users",
      "patients",
      "queue_items",
      "encounters",
      "vitals",
      "diagnoses",
      "procedures",
      "prescriptions",
      "diagnostic_orders",
      "lab_results",
      "radiology_results",
      "medical_addendums",
      "satusehat_sync_logs",
    ];

    console.log("\n📊 STATUS JUMLAH DATA TABEL POSTGRESQL:");
    console.log("--------------------------------------------------");
    for (const t of tables) {
      const res = await client.unsafe(`SELECT COUNT(*)::int as count FROM ${t}`);
      const count = res[0]?.count || 0;
      const statusIcon = ["facilities", "departments", "users"].includes(t)
        ? "🏢 (Master Data - Dipertahankan)"
        : count === 0
        ? "✨ (Kosong / Siap Testing)"
        : "⚠️ (Ada Data)";
      console.log(`- ${t.padEnd(22)} : ${count} record ${statusIcon}`);
    }
    console.log("--------------------------------------------------");
    console.log("🎉 DATABASE BERHASIL DIRESET KE KONDISI AWAL (CLEAN TEST STATE)!");
  } catch (err) {
    console.error("❌ Gagal membersihkan database:", err);
  } finally {
    await client.end();
  }
}

cleanDatabase();
