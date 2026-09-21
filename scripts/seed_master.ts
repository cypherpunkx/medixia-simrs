import postgres from "postgres";
import { hashPassword } from "../src/lib/auth/password";
import { KFA_MEDICATIONS_DATABASE } from "../src/lib/satusehat/kfa-database";

// ============================================================================
// SIMRS & SATUSEHAT - DEDICATED MASTER DATA SEEDER
// Standar Kemenkes RI: Faskes, Poli, Nakes, Obat KFA, ICD-10, & ICD-9-CM
// ============================================================================

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:admin@localhost:5432/medixia_simrs";

console.log("\n==========================================================");
console.log("🏛️  SIMRS & SATUSEHAT DEDICATED MASTER DATA SEEDER");
console.log(`🔌 URL Database: ${connectionString.replace(/:[^:@]+@/, ":****@")}`);
console.log("==========================================================\n");

const sql = postgres(connectionString, {
  max: 1,
  idle_timeout: 10,
  prepare: false,
  onnotice: () => {},
});

// Daftar Standar Master Kamus Diagnosa ICD-10 Rawat Jalan
const MASTER_ICD10_LIST = [
  { code: "I10", display: "Essential (primary) hypertension", patientFriendlyName: "Hipertensi Primer", category: "Sistem Sirkulasi" },
  { code: "E11.9", display: "Type 2 diabetes mellitus without complications", patientFriendlyName: "Diabetes Melitus Tipe 2", category: "Endokrin & Metabolik" },
  { code: "J00", display: "Acute nasopharyngitis [common cold]", patientFriendlyName: "Nasofaringitis Akut (Flu/Batuk Pilek)", category: "Sistem Pernapasan" },
  { code: "J06.9", display: "Acute upper respiratory infection, unspecified", patientFriendlyName: "ISPA (Infeksi Saluran Pernapasan Akut)", category: "Sistem Pernapasan" },
  { code: "K29.7", display: "Gastritis, unspecified", patientFriendlyName: "Gastritis (Maag)", category: "Sistem Pencernaan" },
  { code: "K30", display: "Functional dyspepsia", patientFriendlyName: "Dispepsia Fungsional", category: "Sistem Pencernaan" },
  { code: "K21.9", display: "Gastro-esophageal reflux disease without esophagitis", patientFriendlyName: "GERD (Penyakit Asam Lambung)", category: "Sistem Pencernaan" },
  { code: "M54.5", display: "Low back pain", patientFriendlyName: "Nyeri Punggung Bawah (LBP)", category: "Muskuloskeletal" },
  { code: "M79.1", display: "Myalgia", patientFriendlyName: "Nyeri Otot (Myalgia)", category: "Muskuloskeletal" },
  { code: "R50.9", display: "Fever, unspecified", patientFriendlyName: "Demam Tanpa Penyebab Khusus", category: "Gejala & Tanda Klinis" },
  { code: "R53.83", display: "Other fatigue", patientFriendlyName: "Kelelahan Fisik Ringan", category: "Gejala & Tanda Klinis" },
  { code: "R51", display: "Headache", patientFriendlyName: "Sakit Kepala", category: "Gejala & Tanda Klinis" },
  { code: "A09", display: "Infectious gastroenteritis and colitis, unspecified", patientFriendlyName: "Diare dan Gastroenteritis Akut", category: "Penyakit Infeksi" },
  { code: "J45.9", display: "Other and unspecified asthma", patientFriendlyName: "Asma Bronkial", category: "Sistem Pernapasan" },
  { code: "E78.0", display: "Pure hypercholesterolaemia", patientFriendlyName: "Hiperkolesterolemia (Kolesterol Tinggi)", category: "Endokrin & Metabolik" },
  { code: "N39.0", display: "Urinary tract infection, site not specified", patientFriendlyName: "Infeksi Saluran Kemih (ISK)", category: "Sistem Genitourinaria" },
  { code: "L20.9", display: "Atopic dermatitis, unspecified", patientFriendlyName: "Dermatitis Atopik (Eksim Alergi)", category: "Penyakit Kulit" },
  { code: "B35.4", display: "Tinea corporis", patientFriendlyName: "Infeksi Jamur Kulit (Kurap)", category: "Penyakit Infeksi" },
  { code: "J02.9", display: "Acute pharyngitis, unspecified", patientFriendlyName: "Faringitis Akut (Radang Tenggorokan)", category: "Sistem Pernapasan" },
  { code: "K02.9", display: "Dental caries, unspecified", patientFriendlyName: "Karies Gigi (Gigi Berlubang)", category: "Kesehatan Gigi & Mulut" },
];

// Daftar Standar Master Kamus Tindakan ICD-9-CM Rawat Jalan
const MASTER_ICD9_LIST = [
  { code: "89.07", display: "General medical consultation", category: "Konsultasi & Pemeriksaan Fisik" },
  { code: "89.52", display: "Electrocardiogram", category: "Pemeriksaan Kardiovaskular" },
  { code: "90.59", display: "Microscopic examination of blood", category: "Hematologi Laboratorium" },
  { code: "87.44", display: "Routine chest x-ray", category: "Radiologi & Pencitraan" },
  { code: "93.57", display: "Application of other wound dressing", category: "Perawatan Luka & Bedah Minor" },
  { code: "96.59", display: "Other nonoperative irrigation of wound", category: "Pembersihan Luka" },
  { code: "99.21", display: "Injection of antibiotic", category: "Pemberian Terapi Injeksi" },
  { code: "99.29", display: "Injection or infusion of other therapeutic substance", category: "Pemberian Terapi Injeksi / Infus" },
  { code: "89.38", display: "Other nonoperative respiratory measurement", category: "Pemeriksaan Fungsi Paru & Spirometri" },
  { code: "96.04", display: "Insertion of endotracheal tube", category: "Tindakan Jalan Napas" },
  { code: "23.09", display: "Extraction of other tooth", category: "Tindakan Gigi & Mulut" },
  { code: "95.05", display: "Visual field study", category: "Pemeriksaan Mata & Penglihatan" },
];

async function seedMasterData() {
  const startTime = Date.now();

  try {
    // ------------------------------------------------------------------------
    // 1. Master Profil Faskes (Facilities)
    // ------------------------------------------------------------------------
    console.log("🏢 Menyinkronkan Master Fasilitas Pelayanan Kesehatan (Facilities)...");
    await sql`
      INSERT INTO facilities (id, name, type, satusehat_org_id, address, phone, license_number, is_active)
      VALUES
        ('fac-rsud-01', 'RS Umum Daerah Sehat Sejahtera', 'rumah_sakit', 'b15a7ae7-f366-4a84-8385-0b8196c05002', 'Jl. Kesehatan No. 100, Jakarta Pusat', '021-5551234', '503/RSUD-01/Dinkes/2024', true),
        ('fac-klinik-01', 'Klinik Pratama Sehat Utama', 'klinik_pratama', 'b15a7ae7-f366-4a84-8385-0b8196c05002', 'Jl. Melati Indah No. 12, Jakarta Selatan', '021-7890123', '445/012/Klinik/2024', true)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        satusehat_org_id = EXCLUDED.satusehat_org_id,
        address = EXCLUDED.address,
        phone = EXCLUDED.phone,
        license_number = EXCLUDED.license_number,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP;
    `;

    // ------------------------------------------------------------------------
    // 2. Master Poliklinik & Unit Layanan (Departments)
    // ------------------------------------------------------------------------
    console.log("🏥 Menyinkronkan Master Poliklinik & Ruang Pelayanan (Departments)...");
    await sql`
      INSERT INTO departments (id, facility_id, code, queue_prefix, name, room, quota, default_doctor_name, is_active)
      VALUES
        ('dept-rs-01', 'fac-rsud-01', 'INT', 'A', 'Poli Penyakit Dalam', 'Ruang 204 (Lt. 2)', 35, 'dr. Rian Pratama, Sp.PD', true),
        ('dept-rs-02', 'fac-rsud-01', 'UMU', 'B', 'Poli Umum', 'Ruang 101 (Lt. 1)', 50, 'dr. Rian Pratama, Sp.PD', true),
        ('dept-rs-03', 'fac-rsud-01', 'ANA', 'C', 'Poli Anak', 'Ruang 208 (Lt. 2)', 30, 'dr. Sarah Amanda, Sp.A', true),
        ('dept-rs-04', 'fac-rsud-01', 'GIG', 'D', 'Poli Gigi & Mulut', 'Ruang 105 (Lt. 1)', 25, 'drg. Hendra Wijaya', true),
        ('dept-rs-05', 'fac-rsud-01', 'JAN', 'E', 'Poli Jantung & Pembuluh Darah', 'Ruang 301 (Lt. 3)', 20, 'dr. Maya Kartika, Sp.JP', true),
        ('dept-rs-06', 'fac-rsud-01', 'MAT', 'F', 'Poli Mata', 'Ruang 107 (Lt. 1)', 25, 'dr. Budi Setiawan, Sp.M', true)
      ON CONFLICT (id) DO UPDATE SET
        code = EXCLUDED.code,
        queue_prefix = EXCLUDED.queue_prefix,
        name = EXCLUDED.name,
        room = EXCLUDED.room,
        quota = EXCLUDED.quota,
        default_doctor_name = EXCLUDED.default_doctor_name,
        is_active = EXCLUDED.is_active;
    `;

    // ------------------------------------------------------------------------
    // 3. Master Tenaga Medis & Akun Staf (Users with Bcrypt Hashed Passwords)
    // ------------------------------------------------------------------------
    console.log("👨‍⚕️ Menyinkronkan Master Tenaga Kesehatan & Pengguna SIMRS (Users)...");
    const hashedAdminPass = await hashPassword("admin123");
    const hashedDoctorPass = await hashPassword("password123");
    const hashedNursePass = await hashPassword("password123");

    await sql`
      INSERT INTO users (id, facility_id, department_id, username, password_hash, name, role, sip, ihs_practitioner_id, is_active)
      VALUES
        ('usr-admin', 'fac-rsud-01', NULL, 'admin', ${hashedAdminPass}, 'Administrator SIMRS', 'admin', NULL, NULL, true),
        ('usr-dr-rian', 'fac-rsud-01', 'dept-rs-01', 'dr.rian', ${hashedDoctorPass}, 'dr. Rian Pratama, Sp.PD', 'doctor', 'SIP.446/089/DS/Dinkes/2026', 'N10000001', true),
        ('usr-nurse-siti', 'fac-rsud-01', 'dept-rs-01', 'ns.siti', ${hashedNursePass}, 'Ns. Siti Rahmawati, S.Kep', 'nurse', 'SIP.446/102/SKEP/Dinkes/2026', 'N10000001', true)
      ON CONFLICT (id) DO UPDATE SET
        facility_id = EXCLUDED.facility_id,
        department_id = EXCLUDED.department_id,
        username = EXCLUDED.username,
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        sip = EXCLUDED.sip,
        ihs_practitioner_id = EXCLUDED.ihs_practitioner_id,
        is_active = EXCLUDED.is_active;
    `;

    // ------------------------------------------------------------------------
    // 4. Master Kamus Obat & Alkes KFA Kemenkes (master_medications)
    // ------------------------------------------------------------------------
    console.log("💊 Menyinkronkan Master Obat & Alkes Kamus Farmasi KFA (master_medications)...");
    let medicationCount = 0;
    for (const med of KFA_MEDICATIONS_DATABASE) {
      const medId = `med-kfa-${med.kfaCode}`;
      await sql`
        INSERT INTO master_medications (
          id, kfa_code, name, generic_name, form, strength, route, category, unit,
          default_dosage, default_frequency, default_timing, stock, price, is_active
        ) VALUES (
          ${medId}, ${med.kfaCode}, ${med.name}, ${med.genericName}, ${med.form}, ${med.strength}, ${med.route || "Oral"}, ${med.category}, ${med.unit || "Tablet"},
          ${med.defaultDosage || null}, ${med.defaultFrequency || null}, ${med.defaultTiming || null}, 100, 0, true
        )
        ON CONFLICT (kfa_code) DO UPDATE SET
          name = EXCLUDED.name,
          generic_name = EXCLUDED.generic_name,
          form = EXCLUDED.form,
          strength = EXCLUDED.strength,
          category = EXCLUDED.category,
          default_dosage = EXCLUDED.default_dosage,
          default_frequency = EXCLUDED.default_frequency,
          default_timing = EXCLUDED.default_timing,
          updated_at = CURRENT_TIMESTAMP
      `;
      medicationCount++;
    }

    // ------------------------------------------------------------------------
    // 5. Master Kamus Diagnosa ICD-10 (master_icd10)
    // ------------------------------------------------------------------------
    console.log("📚 Menyinkronkan Master Kamus Diagnosa Medis ICD-10 (master_icd10)...");
    let icd10Count = 0;
    for (const item of MASTER_ICD10_LIST) {
      await sql`
        INSERT INTO master_icd10 (id, code, display, patient_friendly_name, category, is_active)
        VALUES (${`icd10-${item.code.replace(".", "-")}`}, ${item.code}, ${item.display}, ${item.patientFriendlyName}, ${item.category}, true)
        ON CONFLICT (code) DO UPDATE SET
          display = EXCLUDED.display,
          patient_friendly_name = EXCLUDED.patient_friendly_name,
          category = EXCLUDED.category
      `;
      icd10Count++;
    }

    // ------------------------------------------------------------------------
    // 6. Master Kamus Tindakan Medis ICD-9-CM (master_icd9)
    // ------------------------------------------------------------------------
    console.log("🩺 Menyinkronkan Master Kamus Tindakan Medis ICD-9-CM (master_icd9)...");
    let icd9Count = 0;
    for (const item of MASTER_ICD9_LIST) {
      await sql`
        INSERT INTO master_icd9 (id, code, display, category, is_active)
        VALUES (${`icd9-${item.code.replace(".", "-")}`}, ${item.code}, ${item.display}, ${item.category}, true)
        ON CONFLICT (code) DO UPDATE SET
          display = EXCLUDED.display,
          category = EXCLUDED.category
      `;
      icd9Count++;
    }

    const elapsed = Date.now() - startTime;

    console.log("\n==========================================================");
    console.log("✅ SEEDING MASTER DATA SELESAI DENGAN SUKSES!");
    console.log(`⏱️  Waktu Eksekusi: ${elapsed} ms`);
    console.log("----------------------------------------------------------");
    console.log("🏢 Profil Faskes (facilities)      : 2 baris");
    console.log("🏥 Poliklinik Rawat Jalan (dept)   : 6 baris");
    console.log("👨‍⚕️ Tenaga Medis / RBAC (users)     : 3 akun");
    console.log(`💊 Master Obat KFA Kemenkes        : ${medicationCount} obat`);
    console.log(`📚 Master Kamus Diagnosa ICD-10    : ${icd10Count} kode`);
    console.log(`🩺 Master Kamus Tindakan ICD-9-CM  : ${icd9Count} prosedur`);
    console.log("==========================================================\n");
  } catch (error) {
    console.error("\n❌ Gagal menyinkronkan master data SIMRS:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

seedMasterData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
