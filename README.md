# 🏥 Medixia — Next-Gen SIMRS & Rekam Medis Elektronik (RME)

[![Next.js 15](https://img.shields.io/badge/Next.js-15.1.7-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0.0-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5.7.3-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45.2-green?style=for-the-badge&logo=drizzle)](https://orm.drizzle.team/)
[![HL7 FHIR R4](https://img.shields.io/badge/HL7_FHIR-R4_Kemenkes_RI-emerald?style=for-the-badge)](https://satusehat.kemkes.go.id/platform)
[![Permenkes 24/2022](https://img.shields.io/badge/Compliance-Permenkes_24%2F2022-red?style=for-the-badge)](https://kemkes.go.id/)

> **Medixia** adalah platform Sistem Informasi Manajemen Rumah Sakit (SIMRS) & Rekam Medis Elektronik (RME) generasi baru dengan arsitektur *Edge / Offline-First* dan engine interoperabilitas *Native HL7 FHIR R4* yang terintegrasi penuh ke platform **SATUSEHAT Kemenkes RI**.

---

## 🌟 Fitur Utama (Core Highlights)

### 1. 🔑 Native SATUSEHAT Gateway & Bridging Suite
- **OAuth 2.0 Auth Manager:** Switcher lingkungan *Staging* & *Production*, token auto-refresh, token TTL tracker, dan masking kredensial.
- **Organization Profiling:** Verifikasi langsung data faskes ke endpoint `Organization/{id}` Kemenkes.
- **Granular FHIR Resource Transformer:** Konversi otomatis data klinis lokal ke resource HL7 FHIR R4:
  - `Encounter` (Kunjungan Rawat Jalan)
  - `Condition` (Diagnosis ICD-10)
  - `Observation` (Tanda-Tanda Vital LOINC & Hasil Laboratorium)
  - `Procedure` (Tindakan Medis ICD-9-CM)
  - `MedicationRequest` (E-Resep Kamus Farmasi KFA)
  - `ServiceRequest` (Order Penunjang Diagnostik)
  - `DiagnosticReport` (Ekspertise Radiologi & Lab)
  - `Consent` (Informed Consent UU PDP No. 27/2022)
  - `Composition` & `CarePlan` (Resume Medis Terpadu)
- **FHIR Payload Inspector & Retry Engine:** Inspeksi JSON mentah per resource dan mekanisme retry manual/otomatis saat terjadi gangguan jaringan.

### 2. 👥 Loket Pendaftaran, Triase & Display Antrean Multimedia
- **Validasi NIK 16 Digit & Auto-Fill IHS:** Query otomatis nomor SATUSEHAT Patient ID (`P-xxxxxxxxxx`) saat registrasi.
- **Informed Consent UU PDP (Opt-In / Opt-Out):** Perekaman persetujuan pertukaran data medis pasien.
- **Antrean Multi-Poli & Triase Prioritas:** Alokasi antrean poli dengan prioritas *Reguler*, *Geriatri*, *Pediatri*, dan *Urgensi*.
- **Pemanggilan Pasien Suara Otomatis (Text-to-Speech):** Integrasi Web Speech API berbahasa Indonesia (*"Nomor Antrean A-01, silakan menuju Poli Penyakit Dalam"*).
- **Public TV Queue Display:** Tampilan layar ruang tunggu real-time untuk monitor publik.

### 3. 🩺 Single-Pane DPJP Clinical Workspace (Asuhan Medis Terpadu)
- **Dokumentasi SOAP & Anamnesis:** Entri terstruktur keluhan utama, riwayat penyakit, dan rencana tindak lanjut.
- **TTV & Early Warning Score:** Kalkulasi IMT (BMI) real-time dan indikator visual *Critical Alert* pada tanda vital abnormal.
- **Kodifikasi Medis Terpadu:** Autocomplete pencarian katalog ICD-10 (primer/sekunder) dan ICD-9-CM.
- **Penunjang Diagnostik:** Modul order & hasil Laboratorium (LOINC) dengan flag nilai kritis serta ekspertise Radiologi (X-Ray/USG/CT-Scan).
- **E-Prescribing (CPOE KFA):** Katalog obat Kamus Farmasi dan Alat Kesehatan (KFA) Kemenkes, visualisasi jadwal minum obat (pagi/siang/sore/malam), dan deteksi dini alergi obat.

### 4. ⚖️ Kepatuhan Hukum & Dokumen Resmi (Permenkes 24/2022)
- **Locking Otomatis 24 Jam (Pasal 21):** Penguncian permanen berkas rekam medis setelah 24 jam atau saat difinalisasi oleh dokter.
- **Audit Trail Addendum Medis:** Penambahan catatan koreksi klinis ber-audit trail tanpa merusak data historis.
- **Format Cetak Standar RS:**
  - Karcis Antrean Poliklinik (Barcode & Jam Kunjungan)
  - Kartu Berobat Pasien (Barcode MRN)
  - Lembar E-Resep & Etiket Aturan Minum Obat
  - Lembar Resume Medis Rawat Jalan Standar Kemenkes RI (A4)

---

## 🛠️ Tech Stack & Arsitektur

```
+-----------------------------------------------------------------------------------+
| FRONTEND & UI     : Next.js 15 (App Router), React 19, Tailwind CSS, GSAP, Radix UI|
| BACKEND & API     : Next.js API Route Handlers, TypeScript 5.7                   |
| DATABASE & ORM    : PostgreSQL (Postgres.js Pool), Drizzle ORM (pg-core)          |
| STANDAR DATA      : HL7 FHIR R4, ICD-10, ICD-9-CM, LOINC, KFA Kemenkes RI         |
| AUDIO & MULTIMEDIA: Web Speech Synthesis API (TTS Bahasa Indonesia)               |
| DOKUMENTASI       : Docs-as-Code (Mermaid, Markdown, Headless PDF Compiler)        |
+-----------------------------------------------------------------------------------+
```

---

## 📁 Struktur Direktori Proyek

```
medixia-simrs-satusehat/
├── docs/                       # Dokumentasi PDF resmi (Backlog, FSD/BPMN, Juknis, Pitch)
│   ├── User_Stories_and_Product_Backlog_SIMRS_SATUSEHAT.pdf
│   ├── BPMN_FSD_Alur_Kerja_Klinis_SIMRS_SATUSEHAT.pdf
│   ├── User_Manual_Juknis_Operasional_SIMRS_SATUSEHAT.pdf
│   └── Investment_Deck_and_Executive_Overview_SIMRS_SATUSEHAT.pdf
├── scripts/                    # Script seeding database & benchmark utilities
│   ├── seed.ts                 # Seeder master pasien, poli, antrean, dan rekam medis PostgreSQL
│   └── benchmark-performance.ts# Benchmark suite performa query & cache
├── src/
│   ├── app/                    # Next.js App Router (Halaman Utama & API Endpoints)
│   │   ├── api/
│   │   │   ├── encounters/     # Endpoint Kunjungan & Berkas Rekam Medis
│   │   │   ├── patients/       # Endpoint Master Pasien & Validasi NIK
│   │   │   ├── queue/          # Endpoint Antrean Poliklinik Live
│   │   │   └── satusehat/      # Endpoint Auth, Org, KFA, Resume, & Sync-Retry
│   │   ├── layout.tsx
│   │   └── page.tsx            # Single-Pane EHR Dashboard
│   ├── components/
│   │   ├── auth/               # Modul OAuth 2.0, Org Verification & Telemetri
│   │   ├── compliance/         # Modul Locking 24 Jam & Inspector FHIR Detail
│   │   ├── diagnostic/         # Modul Order & Hasil Lab/Radiologi
│   │   ├── doctor/             # Form SOAP, Diagnosis ICD-10, & E-Resep KFA
│   │   ├── layout/             # Header, Left Sidebar, Right Panel, Shift Bar
│   │   ├── patient/            # Banner Pasien, Vitals, Timeline, & Print Modals
│   │   ├── queue/              # Public Queue Display TV Modal
│   │   ├── registration/       # Form Pendaftaran Pasien Baru & Cetak Tiket
│   │   └── ui/                 # Reusable UI Atoms (Button, Dialog, Card, Badge)
│   └── lib/
│       ├── audio/              # Text-to-Speech Queue Voice Announcer
│       ├── db/                 # Drizzle Schema & Repository Layer
│       └── satusehat/          # FHIR Transformer, KFA Master DB, & Validation Engine
├── drizzle.config.ts           # Konfigurasi Drizzle ORM
├── package.json
└── tsconfig.json
```

---

## 🚀 Panduan Memulai (Getting Started)

### 1. Prasyarat Sistem
- **Node.js**: Versi 18.18.0 atau lebih baru (direkomendasikan Node.js LTS v20 / v22)
- **Package Manager**: `npm`, `pnpm`, atau `yarn`

### 2. Kloning Repositori & Instalasi Dependensi
```bash
# Kloning repositori
git clone https://github.com/your-org/medixia-simrs-satusehat.git
cd medixia-simrs-satusehat

# Instalasi paket
npm install
```

### 3. Konfigurasi Environment Variables
Salin berkas `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```

Isi variabel kredensial gateway SATUSEHAT Kemenkes RI:
```env
# SATUSEHAT API Credentials (DTO Kemenkes RI)
SATUSEHAT_ENV=staging
SATUSEHAT_CLIENT_ID=your_client_id_here
SATUSEHAT_CLIENT_SECRET=your_client_secret_here
SATUSEHAT_ORG_ID=your_organization_id_here

# Database Configuration
DATABASE_URL=file:./local-simrs.db
```

### 4. Inisialisasi & Seeding Database
Untuk mengisi master data medis (katalog KFA, kamus ICD, nakes, faskes) maupun simulasi data operasional:
```bash
# 1. Khusus Master Data (Faskes, Poli, User, Kamus KFA, ICD-10, ICD-9-CM)
npm run db:seed:master

# 2. Full Seeder (Master Data + Pasien Simulasi, Antrean Live, & Kunjungan RME)
npm run db:seed

# 3. Atau reset total database dan seed ulang dari nol:
npm run db:seed:fresh
```

### 5. Akun Pengujian Default (Demo Credentials)
Gunakan akun uji berikut untuk mencoba sistem sesuai peranan (RBAC). Panduan lengkap tersedia di **[DEFAULT_USERS.md](./DEFAULT_USERS.md)**:

| Role | Username | Password | Keterangan |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | Konfigurasi Faskes, Nakes, Master Kamus, & Outbox |
| **Dokter (DPJP)** | `dr.rian` *(alias: `dokter`)* | `password123` | Form SOAP, ICD-10, Resep KFA, & Lock RME |
| **Perawat (Nurse)** | `ns.siti` *(alias: `perawat`)* | `password123` | Triase, Tanda Vital (TTV), & Antrean Masuk Poli |

### 6. Menjalankan Server Development
```bash
npm run dev
```
Buka peramban Anda di [http://localhost:3000](http://localhost:3000).

---

## 📜 Kepatuhan Regulasi & Standar Medis

1. **Permenkes No. 24 Tahun 2022:** Kewajiban penyelenggaraan Rekam Medis Elektronik (RME), pembatasan penguncian berkas 24 jam (*Pasal 21*), dan interoperabilitas platform SATUSEHAT.
2. **UU No. 27 Tahun 2022 (UU PDP):** Perlindungan Data Pribadi pasien melalui modul *Informed Consent Management* (Opt-In / Opt-Out).
3. **HL7 FHIR R4:** Standar pertukaran data kesehatan internasional yang diadopsi Kementerian Kesehatan Republik Indonesia.
4. **Kamus Farmasi dan Alat Kesehatan (KFA):** Standardisasi master data sediaan obat dan alat kesehatan nasional.

---

## 📚 Koleksi Dokumen Spesifikasi Resmi

Seluruh dokumen teknis dan bisnis telah tersedia dalam format PDF pada folder `docs/`:

- 📋 **[Product Backlog & User Stories (PDF)](./docs/User_Stories_and_Product_Backlog_SIMRS_SATUSEHAT.pdf)**
- 🔄 **[BPMN & Functional Specification Document (FSD) (PDF)](./docs/BPMN_FSD_Alur_Kerja_Klinis_SIMRS_SATUSEHAT.pdf)**
- 📖 **[User Manual & Juknis Operasional Faskes (PDF)](./docs/User_Manual_Juknis_Operasional_SIMRS_SATUSEHAT.pdf)**
- 💼 **[Investment Deck & Executive Overview (PDF)](./docs/Investment_Deck_and_Executive_Overview_SIMRS_SATUSEHAT.pdf)**

---

## 📄 Lisensi & Hak Cipta

Hak Cipta &copy; 2026 **Medixia Health Technologies**. Seluruh hak cipta dilindungi undang-undang.
Dilisensikan di bawah lisensi *Proprietary Healthcare Enterprise License*.
