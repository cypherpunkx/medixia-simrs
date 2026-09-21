import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:admin@localhost:5432/medixia_simrs";

const client = postgres(connectionString, {
  max: 1,
  idle_timeout: 10,
  prepare: false,
  onnotice: () => {}, // Filter PostgreSQL notices agar terminal tetap bersih
});

async function cleanDatabase() {
  console.log("==================================================");
  console.log("🧹 MEMULAI PROSES PEMBERSIHAN DATA OPERASIONAL DB");
  console.log("==================================================");

  try {
    // 1. Truncate all transactional, patient, and outbox tables with CASCADE
    console.log("Menghapus data tabel operasional klinis...");
    await client.unsafe(`
      TRUNCATE TABLE 
        satusehat_outbox,
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

      -- Reset atomic sequences ke nomor awal
      ALTER SEQUENCE IF EXISTS reg_number_seq RESTART WITH 1;
      ALTER SEQUENCE IF EXISTS mrn_seq RESTART WITH 100001;
    `);

    console.log("✅ Berhasil mengosongkan seluruh data operasional pasien, antrean, outbox, dan rekam medis.");
    console.log("🔄 Sequence nomor registrasi (reg_number_seq) & MRN (mrn_seq) berhasil di-reset ke nilai awal.");

    // 2. Verify row counts
    const tables = [
      "facilities",
      "departments",
      "users",
      "master_medications",
      "master_icd10",
      "master_icd9",
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
      "satusehat_outbox",
    ];

    console.log("\n📊 STATUS JUMLAH DATA TABEL POSTGRESQL:");
    console.log("--------------------------------------------------");
    for (const t of tables) {
      const res = await client.unsafe(`SELECT COUNT(*)::int as count FROM ${t}`);
      const count = res[0]?.count || 0;
      const isMaster = [
        "facilities",
        "departments",
        "users",
        "master_medications",
        "master_icd10",
        "master_icd9",
      ].includes(t);

      const statusIcon = isMaster
        ? "🏢 (Master Data - Dipertahankan)"
        : count === 0
        ? "✨ (Kosong / Siap Testing)"
        : "⚠️ (Ada Data)";
      console.log(`- ${t.padEnd(24)} : ${count} record ${statusIcon}`);
    }
    console.log("--------------------------------------------------");
    console.log("🎉 DATABASE BERHASIL DIRESET KE KONDISI AWAL (CLEAN TEST STATE)!");
  } catch (err) {
    console.error("❌ Gagal membersihkan database:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

cleanDatabase()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
