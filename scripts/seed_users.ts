import postgres from "postgres";
import { hashPassword } from "../src/lib/auth/password";

// ============================================================================
// SIMRS MEDIXIA & SATUSEHAT - DEDICATED USER & PRACTITIONER SEEDER
// Standar Kemenkes RI, Permenkes No. 24/2022, RBAC & SATUSEHAT Practitioner
// ============================================================================

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:admin@localhost:5432/medixia_simrs";

const client = postgres(connectionString, {
  max: 1,
  idle_timeout: 10,
  prepare: false,
  onnotice: () => {},
});

export interface SeedUserItem {
  id: string;
  facilityId: string | null;
  departmentId: string | null;
  username: string;
  plainPassword: string;
  name: string;
  role: "super_admin" | "admin" | "doctor" | "nurse" | "registration" | "pharmacy";
  sip: string | null;
  nik: string | null;
  ihsPractitionerId: string | null;
  isActive: boolean;
}

export const USERS_SEED_DATA: SeedUserItem[] = [
  // 1. Super Admin Vendor RME Platform (Multi-Tenant Master Console)
  {
    id: "usr-superadmin",
    facilityId: null,
    departmentId: null,
    username: "superadmin",
    plainPassword: "admin123",
    name: "Vendor RME Platform Super Admin",
    role: "super_admin",
    sip: null,
    nik: null,
    ihsPractitionerId: null,
    isActive: true,
  },

  // 2. Administrator Faskes (RSUD Sehat Sejahtera)
  {
    id: "usr-admin",
    facilityId: "fac-rsud-01",
    departmentId: null,
    username: "admin",
    plainPassword: "admin123",
    name: "Administrator RSUD Sehat Sejahtera",
    role: "admin",
    sip: null,
    nik: null,
    ihsPractitionerId: null,
    isActive: true,
  },

  // 3. Administrator Faskes (Klinik Pratama Sehat Utama)
  {
    id: "usr-admin-klinik",
    facilityId: "fac-klinik-01",
    departmentId: null,
    username: "admin.klinik",
    plainPassword: "admin123",
    name: "Administrator Klinik Pratama",
    role: "admin",
    sip: null,
    nik: null,
    ihsPractitionerId: null,
    isActive: true,
  },

  // 4. Petugas Admisi & Pendaftaran Rawat Jalan (Registration)
  {
    id: "usr-reg-budi",
    facilityId: "fac-rsud-01",
    departmentId: null,
    username: "pendaftaran",
    plainPassword: "password123",
    name: "Budi Hartono, A.Md.RMIK",
    role: "registration",
    sip: null,
    nik: "3171071205930005",
    ihsPractitionerId: null,
    isActive: true,
  },

  // 5. Dokter Spesialis Penyakit Dalam (DPJP Utama Poli Dalam)
  {
    id: "usr-dr-rian",
    facilityId: "fac-rsud-01",
    departmentId: "dept-rs-01",
    username: "dr.rian",
    plainPassword: "password123",
    name: "dr. Syarifuddin, Sp.PD",
    role: "doctor",
    sip: "SIP.446/089/DS/Dinkes/2026",
    nik: "3171071609900003",
    ihsPractitionerId: "10001354453",
    isActive: true,
  },

  // 6. Dokter Poli Umum
  {
    id: "usr-dr-alexander",
    facilityId: "fac-rsud-01",
    departmentId: "dept-rs-02",
    username: "dr.alexander",
    plainPassword: "password123",
    name: "dr. Alexander",
    role: "doctor",
    sip: "SIP.446/012/DU/Dinkes/2026",
    nik: "7209061211900001",
    ihsPractitionerId: "10009880728",
    isActive: true,
  },

  // 7. Dokter Spesialis Anak (Poli Anak)
  {
    id: "usr-dr-yoga",
    facilityId: "fac-rsud-01",
    departmentId: "dept-rs-03",
    username: "dr.yoga",
    plainPassword: "password123",
    name: "dr. Yoga Yandika, Sp.A",
    role: "doctor",
    sip: "SIP.446/033/SPA/Dinkes/2026",
    nik: "3322071302900002",
    ihsPractitionerId: "10006926841",
    isActive: true,
  },

  // 8. Dokter Gigi & Mulut (Poli Gigi)
  {
    id: "usr-drg-kevin",
    facilityId: "fac-rsud-01",
    departmentId: "dept-rs-04",
    username: "drg.kevin",
    plainPassword: "password123",
    name: "drg. Kevin Tanuwidjaja",
    role: "doctor",
    sip: "SIP.446/024/GIG/Dinkes/2026",
    nik: "3175082104910003",
    ihsPractitionerId: "10011554201",
    isActive: true,
  },

  // 9. Dokter Spesialis Bedah (Poli Bedah)
  {
    id: "usr-dr-nicholas",
    facilityId: "fac-rsud-01",
    departmentId: "dept-rs-05",
    username: "dr.nicholas",
    plainPassword: "password123",
    name: "dr. Nicholas Evan, Sp.B",
    role: "doctor",
    sip: "SIP.446/044/SPB/Dinkes/2026",
    nik: "3207192310600004",
    ihsPractitionerId: "10010910332",
    isActive: true,
  },

  // 10. Dokter Spesialis Mata (Poli Mata)
  {
    id: "usr-dr-dito",
    facilityId: "fac-rsud-01",
    departmentId: "dept-rs-06",
    username: "dr.dito",
    plainPassword: "password123",
    name: "dr. Dito Arifin, Sp.M",
    role: "doctor",
    sip: "SIP.446/055/SPM/Dinkes/2026",
    nik: "6408130207800005",
    ihsPractitionerId: "10018180913",
    isActive: true,
  },

  // 11. Dokter Spesialis Obstetri & Ginekologi (Obgyn)
  {
    id: "usr-dr-olivia",
    facilityId: "fac-rsud-01",
    departmentId: "dept-rs-01",
    username: "dr.olivia",
    plainPassword: "password123",
    name: "dr. Olivia Kirana, Sp.OG",
    role: "doctor",
    sip: "SIP.446/066/SPOG/Dinkes/2026",
    nik: "3217040109800006",
    ihsPractitionerId: "10002074224",
    isActive: true,
  },

  // 12. Dokter Spesialis Neurologi (Saraf)
  {
    id: "usr-dr-alicia",
    facilityId: "fac-rsud-01",
    departmentId: "dept-rs-01",
    username: "dr.alicia",
    plainPassword: "password123",
    name: "dr. Alicia Chrissy, Sp.N",
    role: "doctor",
    sip: "SIP.446/077/SPN/Dinkes/2026",
    nik: "3519111703800007",
    ihsPractitionerId: "10012572188",
    isActive: true,
  },

  // 13. Dokter Spesialis Patologi Klinik (Laboratorium PK)
  {
    id: "usr-dr-nathalie",
    facilityId: "fac-rsud-01",
    departmentId: "dept-rs-01",
    username: "dr.nathalie",
    plainPassword: "password123",
    name: "dr. Nathalie Tan, Sp.PK",
    role: "doctor",
    sip: "SIP.446/088/SPPK/Dinkes/2026",
    nik: "5271002009700008",
    ihsPractitionerId: "10018452434",
    isActive: true,
  },

  // 14. Tenaga Perawat Rawat Jalan (Nurse)
  {
    id: "usr-nurse-siti",
    facilityId: "fac-rsud-01",
    departmentId: "dept-rs-01",
    username: "ns.siti",
    plainPassword: "password123",
    name: "Sheila Annisa, S.Kep",
    role: "nurse",
    sip: "SIP.446/102/SKEP/Dinkes/2026",
    nik: "3313096403900009",
    ihsPractitionerId: "10014058550",
    isActive: true,
  },

  // 15. Tenaga Apoteker & Kefarmasian (Pharmacy)
  {
    id: "usr-apt-aditya",
    facilityId: "fac-rsud-01",
    departmentId: "dept-rs-01",
    username: "apt.aditya",
    plainPassword: "password123",
    name: "apt. Aditya Pradhana, S.Farm.",
    role: "pharmacy",
    sip: "SIPA.446/011/SIPA/Dinkes/2026",
    nik: "3578083008700010",
    ihsPractitionerId: "10001915884",
    isActive: true,
  },
];

export async function seedUsers() {
  const startTime = Date.now();
  console.log("\n==========================================================");
  console.log("👤 SIMRS & SATUSEHAT - RE-SEED PENGGUNA (USERS SEEDER)");
  console.log(`🔌 DB: ${connectionString.replace(/:[^:@]+@/, ":****@")}`);
  console.log("==========================================================\n");

  try {
    // 1. Pastikan tabel penunjang facilities dan departments ada (fk integrity)
    console.log("🏢 Memvalidasi tabel fasilitas dan unit layanan...");
    await client.unsafe(`
      CREATE TABLE IF NOT EXISTS facilities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'rumah_sakit',
        satusehat_org_id TEXT NOT NULL DEFAULT 'b15a7ae7-f366-4a84-8385-0b8196c05002',
        satusehat_client_id TEXT,
        satusehat_client_secret_enc TEXT,
        satusehat_env TEXT NOT NULL DEFAULT 'staging',
        satusehat_status TEXT NOT NULL DEFAULT 'unverified',
        satusehat_last_tested_at TEXT,
        address TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        license_number TEXT DEFAULT '',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY,
        facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
        code TEXT NOT NULL DEFAULT '',
        queue_prefix TEXT NOT NULL DEFAULT 'A',
        name TEXT NOT NULL,
        room TEXT NOT NULL,
        quota INTEGER NOT NULL DEFAULT 30,
        default_doctor_name TEXT,
        satusehat_location_id TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Pastikan faskes default tersedia untuk foreign key users
      INSERT INTO facilities (id, name, type, satusehat_org_id, address, phone, license_number, is_active)
      VALUES 
        ('fac-rsud-01', 'RS Umum Daerah Sehat Sejahtera', 'rumah_sakit', 'b15a7ae7-f366-4a84-8385-0b8196c05002', 'Jl. Kesehatan No. 100, Jakarta Pusat', '021-5551234', '503/RSUD-01/Dinkes/2024', true),
        ('fac-klinik-01', 'Klinik Pratama Sehat Utama', 'klinik_pratama', 'b15a7ae7-f366-4a84-8385-0b8196c05002', 'Jl. Melati Indah No. 12, Jakarta Selatan', '021-7890123', '445/012/Klinik/2024', true)
      ON CONFLICT (id) DO NOTHING;

      -- Pastikan poliklinik dasar tersedia untuk relasi nakes
      INSERT INTO departments (id, facility_id, code, queue_prefix, name, room, quota, default_doctor_name, is_active)
      VALUES
        ('dept-rs-01', 'fac-rsud-01', 'INT', 'A', 'Poli Penyakit Dalam', 'Ruang 204 (Lt. 2)', 35, 'dr. Syarifuddin, Sp.PD', true),
        ('dept-rs-02', 'fac-rsud-01', 'UMU', 'B', 'Poli Umum', 'Ruang 101 (Lt. 1)', 50, 'dr. Alexander', true),
        ('dept-rs-03', 'fac-rsud-01', 'ANA', 'C', 'Poli Anak', 'Ruang 208 (Lt. 2)', 30, 'dr. Yoga Yandika, Sp.A', true),
        ('dept-rs-04', 'fac-rsud-01', 'GIG', 'D', 'Poli Gigi & Mulut', 'Ruang 105 (Lt. 1)', 25, 'drg. Kevin Tanuwidjaja', true),
        ('dept-rs-05', 'fac-rsud-01', 'BED', 'E', 'Poli Bedah', 'Ruang 301 (Lt. 3)', 20, 'dr. Nicholas Evan, Sp.B', true),
        ('dept-rs-06', 'fac-rsud-01', 'MAT', 'F', 'Poli Mata', 'Ruang 107 (Lt. 1)', 25, 'dr. Dito Arifin, Sp.M', true)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 2. Buat tabel users jika belum ada & sinkronkan kolom-kolom terkini sesuai skema
    console.log("🛠️  Memvalidasi skema tabel users sesuai skema terkini (Drizzle ORM)...");
    await client.unsafe(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        facility_id TEXT REFERENCES facilities(id) ON DELETE SET NULL,
        department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        sip TEXT,
        nik TEXT UNIQUE,
        ihs_practitioner_id TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Mutasi skema idempoten bila tabel sudah ada dari versi terdahulu
      ALTER TABLE users ADD COLUMN IF NOT EXISTS nik TEXT UNIQUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS sip TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS ihs_practitioner_id TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS facility_id TEXT REFERENCES facilities(id) ON DELETE SET NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id TEXT REFERENCES departments(id) ON DELETE SET NULL;

      -- Index Kinerja Query
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_nik ON users(nik);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_facility_id ON users(facility_id);
    `);

    // 3. Hapus data pengguna terdahulu (Reset bersih sesuai instruksi pengguna)
    console.log("🧹 Menghapus data pengguna terdahulu dari tabel users...");
    // Putuskan sementara keterikatan foreign key pada tabel yang merujuk ke users
    await client.unsafe(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'encounters') THEN
          UPDATE encounters SET doctor_id = NULL WHERE doctor_id IS NOT NULL;
        END IF;
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'queue_items') THEN
          UPDATE queue_items SET doctor_id = NULL WHERE doctor_id IS NOT NULL;
        END IF;
      END $$;

      DELETE FROM users;
    `);
    console.log("✅ Data user lama berhasil dibersihkan.");

    // 4. Seeding Pengguna Baru dengan Bcrypt Password Hashing
    console.log(`🔐 Menyiapkan password hash bcrypt & memasukkan ${USERS_SEED_DATA.length} pengguna baru...`);

    const cachedHashes: Record<string, string> = {};

    for (const u of USERS_SEED_DATA) {
      if (!cachedHashes[u.plainPassword]) {
        cachedHashes[u.plainPassword] = await hashPassword(u.plainPassword);
      }
      const passHash = cachedHashes[u.plainPassword];

      await client.unsafe(
        `
        INSERT INTO users (
          id, facility_id, department_id, username, password_hash, name,
          role, sip, nik, ihs_practitioner_id, is_active, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP
        );
        `,
        [
          u.id,
          u.facilityId,
          u.departmentId,
          u.username,
          passHash,
          u.name,
          u.role,
          u.sip,
          u.nik,
          u.ihsPractitionerId,
          u.isActive,
        ]
      );
    }

    // 5. Hubungkan kembali encounter / antrean yang ada ke DPJP Utama
    await client.unsafe(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'encounters') THEN
          UPDATE encounters 
          SET doctor_id = 'usr-dr-rian' 
          WHERE doctor_id IS NULL AND (doctor_name ILIKE '%Syarifuddin%' OR doctor_name ILIKE '%Rian%');
        END IF;
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'queue_items') THEN
          UPDATE queue_items 
          SET doctor_id = 'usr-dr-rian' 
          WHERE doctor_id IS NULL AND (doctor ILIKE '%Syarifuddin%' OR doctor ILIKE '%Rian%');
        END IF;
      END $$;
    `);

    const elapsed = Date.now() - startTime;
    console.log(`\n🎉 SEEDER PENGGUNA BERHASIL SELESAI (${elapsed}ms)!`);
    console.log("---------------------------------------------------------------------------------------------------------");
    console.log("| USERNAME        | PASSWORD      | PERAN / ROLE    | NAMA PENGGUNA                     | NIK / IHS ID  |");
    console.log("---------------------------------------------------------------------------------------------------------");
    for (const u of USERS_SEED_DATA) {
      const uCol = u.username.padEnd(15);
      const pCol = u.plainPassword.padEnd(13);
      const rCol = u.role.padEnd(15);
      const nCol = u.name.padEnd(33);
      const idCol = (u.nik || u.ihsPractitionerId || "-").padEnd(13);
      console.log(`| ${uCol} | ${pCol} | ${rCol} | ${nCol} | ${idCol} |`);
    }
    console.log("---------------------------------------------------------------------------------------------------------");
    console.log("💡 Seluruh data pengguna kini 100% selaras dengan skema PostgreSQL Drizzle ORM saat ini.\n");
  } catch (error) {
    console.error("❌ Terjadi kesalahan saat seeding data pengguna:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Jalankan otomatis saat dieksekusi langsung
if (require.main === module || process.argv[1]?.includes("seed_users")) {
  seedUsers()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
