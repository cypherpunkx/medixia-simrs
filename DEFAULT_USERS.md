# 🏥 Panduan Akun Default Pengujian SIMRS & SATUSEHAT

Dokumen ini berisi daftar akun pengguna (*default test users*), hak akses (*Role-Based Access Control / RBAC*), kredensial login, dan panduan skenario pengujian fungsional untuk sistem **Medixia SIMRS & SATUSEHAT**.

---

## ⚡ Matriks Kredensial Cepat (*Quick Access*)

Semua kata sandi dienkripsi menggunakan standar **Bcrypt (cost factor 10)** dan tersimpan aman di database PostgreSQL.

| Role SIMRS | Username | Kata Sandi | Nama Nakes / Akun | SIP & IHS Practitioner | Unit / Departemen |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Administrator** | `admin` *(alias: `admin.rsud`)* | `admin123` | **Administrator SIMRS** | `-` | Instalasi SIMRS & TI |
| **Dokter (DPJP)** | `dr.rian` *(alias: `dokter`)* | `password123` | **dr. Rian Pratama, Sp.PD** | SIP: `SIP.446/089/DS/Dinkes/2026`<br>IHS: `N10000001` | Poli Penyakit Dalam |
| **Perawat (Nurse)** | `ns.siti` *(alias: `perawat`)* | `password123` | **Ns. Siti Rahmawati, S.Kep** | SIP: `SIP.446/102/SKEP/Dinkes/2026`<br>IHS: `N10000001` | Poli Penyakit Dalam |

> 💡 **Fitur Autentikasi Fleksibel:**  
> Sistem mendukung login dengan username resmi (misal: `dr.rian`) maupun username alias peranan (misal: `dokter`, `perawat`, `admin`).

---

## 📋 Detail Profil & Matriks Hak Akses (*RBAC*)

### 1. Administrator SIMRS
* **User ID**: `usr-admin`
* **Username**: `admin`
* **Password**: `admin123`
* **Peran (Role)**: `admin`
* **Faskes Utama**: RS Umum Daerah Sehat Sejahtera (`fac-rsud-01`)
* **Wewenang & Hak Akses**:
  - Mengelola data master faskes dan beralih antar faskes (*Multi-Facility Switching*).
  - Manajemen akun tenaga kesehatan dan staf administrasi.
  - Akses pemeliharaan kamus master medis:
    - Master Kamus Obat & Alkes KFA Kemenkes (`master_medications`).
    - Master Kamus Diagnosa ICD-10 (`master_icd10`).
    - Master Kamus Tindakan Medis ICD-9-CM (`master_icd9`).
    - Master Poliklinik & Ruang Pelayanan (`departments`).
  - Monitoring antrean sinkronisasi SATUSEHAT (*Outbox Engine & Sync Logs*).
  - Pengawasan log audit jejak rekam medis & keamanan sistem.

---

### 2. Dokter Penanggung Jawab Pelayanan (DPJP)
* **User ID**: `usr-dr-rian`
* **Username**: `dr.rian`
* **Password**: `password123`
* **Peran (Role)**: `doctor`
* **Spesialisasi**: Dokter Spesialis Penyakit Dalam (Sp.PD)
* **SIP**: `SIP.446/089/DS/Dinkes/2026`
* **IHS Practitioner ID**: `N10000001`
* **Poli Default**: Poli Penyakit Dalam (`dept-rs-01`)
* **Wewenang & Hak Akses**:
  - Melihat antrean pasien pada poliklinik yang ditugaskan.
  - Memulai proses konsultasi dan pemeriksaan pasien rawat jalan.
  - Pengisian Rekam Medis Elektronik (RME) terintegrasi:
    - Anamnesis / Keluhan Utama (*Subjective*).
    - Pemeriksaan Fisik & Review TTV (*Objective*).
    - Penetapan Diagnosis Primer & Sekunder ICD-10 Kemenkes (*Assessment*).
    - Penentuan Tindakan Medis ICD-9-CM & Rencana Terapi (*Plan*).
    - E-Resep Obat dengan kode KFA Kemenkes RI.
    - Pembuatan Order Penunjang (Laboratorium Darah & Radiologi Thorax).
  - Finalisasi & Penguncian Rekam Medis (*Medical Record Immutability* sesuai **Permenkes No. 24 Tahun 2022**).
  - Pencetakan Lembar Resume Medis, Resep Ber-QR Code, dan Surat Kontrol.

---

### 3. Perawat / Tenaga Keperawatan
* **User ID**: `usr-nurse-siti`
* **Username**: `ns.siti`
* **Password**: `password123`
* **Peran (Role)**: `nurse`
* **Jabatan**: Perawat Rawat Jalan Poliklinik
* **SIP**: `SIP.446/102/SKEP/Dinkes/2026`
* **IHS Practitioner ID**: `N10000001`
* **Poli Default**: Poli Penyakit Dalam (`dept-rs-01`)
* **Wewenang & Hak Akses**:
  - Manajemen panggil antrean pasien poliklinik.
  - Skrining Triase Keperawatan awal (*Awal Kedatangan Pasien*).
  - Pencatatan Tanda-Tanda Vital (TTV):
    - Tekanan Darah (Sistolik / Diastolik).
    - Frekuensi Nadi (bpm) & Laju Pernafasan (RR / menit).
    - Suhu Tubuh (°C) & Saturasi Oksigen (SpO2 %).
    - Berat Badan (kg), Tinggi Badan (cm), dan kalkulasi otomatis IMT (*BMI*).
  - Skrining Riwayat Alergi (Obat / Makanan / Lingkungan).
  - Mengubah status antrean pasien menjadi `Menunggu Dokter`.

---

## 🏢 Fasilitas Kesehatan (*Facilities*) untuk Uji Multi-Faskes

Sistem mendukung arsitektur multi-faskes. Anda dapat berganti faskes secara dinamis melalui menu header (tersedia untuk role `admin`):

| ID Faskes | Nama Fasilitas Kesehatan | Tipe Faskes | SATUSEHAT Org ID | No. Izin Operasional |
| :--- | :--- | :--- | :--- | :--- |
| `fac-rsud-01` | **RS Umum Daerah Sehat Sejahtera** | Rumah Sakit | `b15a7ae7-f366-4a84-8385-0b8196c05002` | `440/012/Dinkes/RS-B/2024` |
| `fac-klinik-01` | **Klinik Pratama Medixia Sehat** | Klinik Pratama | `b15a7ae7-f366-4a84-8385-0b8196c05002` | `503/008/Klinik-Pratama/DPMPTSP/2025` |
| `fac-klinik-02` | **Klinik Pratama Husada Mandiri** | Klinik Pratama | `b15a7ae7-f366-4a84-8385-0b8196c05002` | `503/021/Klinik-Husada/DPMPTSP/2026` |

---

## 🩺 Daftar Poliklinik untuk Pengujian Filter & Routing Antrean

| ID Unit | Nama Poliklinik | Ruang Layanan | Kuota Pasien | Dokter Jaga Default |
| :--- | :--- | :--- | :--- | :--- |
| `dept-rs-01` | **Poli Penyakit Dalam** | Ruang 204 (Lt. 2) | 35 pasien | dr. Rian Pratama, Sp.PD |
| `dept-rs-02` | **Poli Umum** | Ruang 101 (Lt. 1) | 50 pasien | dr. Amanda Putri, M.Biomed |
| `dept-rs-03` | **Poli Anak (Pediatri)** | Ruang 208 (Lt. 2) | 30 pasien | dr. Maya Anggraini, Sp.A |
| `dept-rs-04` | **Poli Gigi & Mulut** | Ruang 105 (Lt. 1) | 25 pasien | drg. Kevin Tanuwidjaja |
| `dept-rs-05` | **Poli Jantung & Pembuluh Darah** | Ruang 301 (Lt. 3) | 20 pasien | dr. Rian Hidayat, Sp.JP |
| `dept-rs-06` | **Poli Mata** | Ruang 107 (Lt. 1) | 25 pasien | dr. Nadia Putri, Sp.M |

---

## 🧪 Skenario Pengujian Alur Klinis Lengkap (*End-to-End Test*)

Berikut alur rekomendasi untuk menguji sistem dari awal hingga akhir:

```
[1. Login Perawat: ns.siti]
        │
        ▼
[2. Panggil Antrean & Input Tanda Vital (TTV)]
        │
        ▼
[3. Ganti Akun -> Login Dokter: dr.rian]
        │
        ▼
[4. Periksa Pasien -> Isi RME SOAP -> Diagnosa ICD-10 & Resep KFA]
        │
        ▼
[5. Selesaikan Pemeriksaan -> Kunci RME (Permenkes 24/2022)]
        │
        ▼
[6. Login Admin: admin -> Cek Status Outbox & Log Sinkronisasi SATUSEHAT]
```

### Langkah Skenario Pengujian:
1. **Langkah 1 (Asesmen Perawat)**:
   - Buka `/login`, masukkan username `ns.siti` dan password `password123`.
   - Buka dashboard antrean, pilih pasien dengan status antrean terdepan.
   - Buka tab asesmen, isi nilai TTV (misal TD: `120/80`, Nadi: `82`, Suhu: `36.7`, Berat Badan: `65`, Tinggi: `170`).
   - Simpan data TTV.

2. **Langkah 2 (Pemeriksaan DPJP)**:
   - Logout, lalu login dengan username `dr.rian` dan password `password123`.
   - Klik pasien yang sudah memiliki data TTV dari perawat.
   - Di form RME, verifikasi bahwa data TTV dari perawat otomatis muncul.
   - Ketik keluhan (misal: *"Pasien mengeluh pusing dan tengkuk tegang sejak 3 hari"*).
   - Masukkan Diagnosa ICD-10: cari `I10` (*Essential Hypertension*).
   - Masukkan Resep Obat KFA: cari `Amlodipine 10 mg` atau `Paracetamol 500 mg`.
   - Simpan rekam medis.
   - Klik **"Selesai & Kunci Berkas RME"** (memenuhi kepatuhan Permenkes 24/2022).

3. **Langkah 3 (Audit & Sinkronisasi SATUSEHAT)**:
   - Login dengan username `admin` dan password `admin123`.
   - Buka tab atau modal sinkronisasi SATUSEHAT.
   - Pastikan bundle FHIR (*Encounter, Condition, Observation, MedicationRequest*) tersimpan di antrean outbox dengan aman.

---

## 🛠️ Perintah Eksekusi Database (*Database Maintenance*)

Jika data pengujian perlu di-reset atau diperbarui:

```bash
# 1. Menjalankan Seeder Master Data Saja (Faskes, Poli, User, Kamus KFA & ICD)
npm run db:seed:master

# 2. Menjalankan Full Seeder (Master Data + Transaksi Pasien, Kunjungan, RME, & Antrean)
npm run db:seed

# 3. Membersihkan Seluruh Data Transaksi (Tanpa Menghapus Struktur Tabel)
npm run db:clean
```
