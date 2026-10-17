import postgres from "postgres";

// ============================================================================
// SIMRS MEDIXIA & SATUSEHAT - DATABASE TRANSACTION CLEANER
// Menghapus seluruh data transaksi operasional, rekam medis, antrean,
// kartu mutasi farmasi, dan log integrasi SATUSEHAT tanpa menghapus master data
// (Fasilitas Faskes, Poliklinik, Pengguna/Nakes, Kamus KFA & Master ICD).
// ============================================================================

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:admin@localhost:5432/medixia_simrs";

const client = postgres(connectionString, {
  max: 1,
  idle_timeout: 10,
  prepare: false,
  onnotice: () => {}, // Filter PostgreSQL notices agar log terminal bersih
});

// Daftar tabel transaksi / operasional klinis yang akan dikosongkan
const TRANSACTIONAL_TABLES = [
  "stock_mutations",         // Mutasi stok obat farmasi
  "satusehat_outbox",        // Antrean retry outbox SATUSEHAT
  "satusehat_sync_logs",     // Log audit integrasi FHIR
  "medical_addendums",       // Catatan addendum rekam medis
  "radiology_results",       // Hasil radiologi & penunjang
  "lab_results",             // Hasil uji laboratorium
  "diagnostic_orders",       // Order penunjang lab & radiologi
  "prescriptions",           // Resep & telaah obat farmasi
  "procedures",              // Tindakan klinis ICD-9-CM
  "diagnoses",               // Diagnosa klinis ICD-10
  "vitals",                  // Tanda-tanda vital fisik
  "queue_items",             // Antrean loket, poli, farmasi hari ini
  "encounters",              // Kunjungan / encounter RME pasien
  "patients",                // Data pasien terdaftar
];

// Daftar tabel master yang dipertahankan
const MASTER_TABLES = [
  "facilities",              // Fasilitas pelayanan kesehatan (RSUD, Klinik)
  "departments",             // Master poliklinik & unit layanan
  "users",                   // Akun pengguna, dokter, perawat, admin, farmasi
  "master_medications",      // Kamus obat & alkes standar KFA Kemenkes
  "master_icd10",            // Kamus diagnosa standar ICD-10
  "master_icd9",             // Kamus tindakan medis standar ICD-9-CM
];

export async function cleanDatabase() {
  const startTime = Date.now();
  console.log("\n==========================================================");
  console.log("🧹 SIMRS & SATUSEHAT - PEMBERSIHAN DATA TRANSAKSI KLINIS");
  console.log(`🔌 DB: ${connectionString.replace(/:[^:@]+@/, ":****@")}`);
  console.log("==========================================================\n");

  try {
    // 1. Truncate seluruh tabel transaksi secara atomic dengan CASCADE
    console.log("🗑️  Mengosongkan seluruh tabel operasional klinis, antrean, dan log transaksi...");
    await client.unsafe(`
      TRUNCATE TABLE 
        stock_mutations,
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
        queue_items,
        encounters,
        patients
      CASCADE;

      -- 2. Reset Atomic Sequences ke nomor awal (Anti-Collision)
      ALTER SEQUENCE IF EXISTS reg_number_seq RESTART WITH 1;
      ALTER SEQUENCE IF EXISTS mrn_seq RESTART WITH 100001;

      -- 3. Kembalikan stok fisik master obat ke kapasitas default awal (100 unit)
      UPDATE master_medications SET stock = 100 WHERE stock != 100;
    `);

    console.log("✅ Berhasil mengosongkan 14 tabel transaksi secara aman.");
    console.log("🔄 Sequence nomor registrasi (reg_number_seq) berhasil di-reset ke 1.");
    console.log("🔄 Sequence nomor rekam medis (mrn_seq) berhasil di-reset ke 100001.");
    console.log("💊 Stok fisik master obat (master_medications) berhasil dikembalikan ke 100 unit.");

    // 4. Audit dan verifikasi jumlah baris seluruh tabel di database
    console.log("\n📊 STATUS DATABASE PASCA-PEMBERSIHAN DATA TRANSAKSI:");
    console.log("----------------------------------------------------------------------------------");
    console.log("| NAMA TABEL             | KATEGORI DATA      | JUMLAH RECORD | STATUS            |");
    console.log("----------------------------------------------------------------------------------");

    const allTables = [...MASTER_TABLES, ...TRANSACTIONAL_TABLES];

    for (const tableName of allTables) {
      const isMaster = MASTER_TABLES.includes(tableName);
      let count = 0;
      try {
        const res = await client.unsafe(`SELECT COUNT(*)::int as count FROM ${tableName}`);
        count = res[0]?.count || 0;
      } catch {
        // Abaikan jika tabel opsional belum dibuat
      }

      const tCol = tableName.padEnd(22);
      const catCol = (isMaster ? "Master Data" : "Transaksi Klinis").padEnd(18);
      const cCol = String(count).padStart(13);
      const sCol = isMaster
        ? "Dipertahankan ✅".padEnd(17)
        : count === 0
        ? "Kosong / Bersih ✨".padEnd(17)
        : "Ada Data ⚠️".padEnd(17);

      console.log(`| ${tCol} | ${catCol} | ${cCol} | ${sCol} |`);
    }

    const elapsed = Date.now() - startTime;
    console.log("----------------------------------------------------------------------------------");
    console.log(`🎉 PROSES PEMBERSIHAN SELESAI DALAM ${elapsed}ms!`);
    console.log("💡 Seluruh data master tetap utuh. Sistem siap untuk pengujian alur baru.\n");
  } catch (err) {
    console.error("❌ Gagal membersihkan data transaksi:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Jalankan jika dipanggil langsung via CLI
if (require.main === module || process.argv[1]?.includes("clean_db")) {
  cleanDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
