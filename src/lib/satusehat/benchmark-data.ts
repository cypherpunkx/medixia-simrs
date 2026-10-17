// ============================================================================
// OFFICIAL SATUSEHAT KEMENKES BENCHMARK DATASETS (Sandbox Reference)
// Standar Kemenkes RI, DTO Kemenkes, FHIR HL7 R4
// Berisi data praktisi dan pasien sandbox terverifikasi resmi dari Kemenkes
// ============================================================================

export interface BenchmarkPractitioner {
  nik: string;
  name: string;
  gender: "male" | "female";
  birthDate: string;
  ihsPractitionerId: string;
  profession: string;
  department: string;
}

export interface BenchmarkPatient {
  nik: string;
  name: string;
  gender: "male" | "female";
  birthDate: string;
  ihsNumber: string;
  nikIbu?: string;
}

export const SATUSEHAT_OFFICIAL_PRACTITIONERS: BenchmarkPractitioner[] = [
  { nik: "7209061211900001", name: "dr. Alexander", gender: "male", birthDate: "1994-01-01", ihsPractitionerId: "10009880728", profession: "Dokter Umum", department: "Poli Umum" },
  { nik: "3322071302900002", name: "dr. Yoga Yandika, Sp.A", gender: "male", birthDate: "1995-02-02", ihsPractitionerId: "10006926841", profession: "Dokter Spesialis Anak", department: "Poli Anak (Pediatri)" },
  { nik: "3171071609900003", name: "dr. Syarifuddin, Sp.PD.", gender: "male", birthDate: "1988-03-03", ihsPractitionerId: "10001354453", profession: "Dokter Spesialis Penyakit Dalam", department: "Poli Penyakit Dalam" },
  { nik: "3207192310600004", name: "dr. Nicholas Evan, Sp.B.", gender: "male", birthDate: "1986-04-04", ihsPractitionerId: "10010910332", profession: "Dokter Spesialis Bedah", department: "Poli Jantung & Pembuluh Darah" },
  { nik: "6408130207800005", name: "dr. Dito Arifin, Sp.M.", gender: "male", birthDate: "1985-05-05", ihsPractitionerId: "10018180913", profession: "Dokter Spesialis Mata", department: "Poli Mata" },
  { nik: "3217040109800006", name: "dr. Olivia Kirana, Sp.OG", gender: "female", birthDate: "1984-06-06", ihsPractitionerId: "10002074224", profession: "Dokter Spesialis Obstetri & Ginekologi", department: "Poli Kandungan" },
  { nik: "3519111703800007", name: "dr. Alicia Chrissy, Sp.N.", gender: "female", birthDate: "1982-07-07", ihsPractitionerId: "10012572188", profession: "Dokter Spesialis Neurologi (Saraf)", department: "Poli Saraf" },
  { nik: "5271002009700008", name: "dr. Nathalie Tan, Sp.PK.", gender: "female", birthDate: "1981-08-08", ihsPractitionerId: "10018452434", profession: "Dokter Spesialis Patologi Klinik", department: "Instalasi Laboratorium" },
  { nik: "3313096403900009", name: "Sheila Annisa, S.Kep", gender: "female", birthDate: "1980-09-09", ihsPractitionerId: "10014058550", profession: "Perawat Klinis", department: "Poli Penyakit Dalam" },
  { nik: "3578083008700010", name: "apt. Aditya Pradhana, S.Farm.", gender: "female", birthDate: "1980-10-10", ihsPractitionerId: "10001915884", profession: "Apoteker Farmasi Klinis", department: "Instalasi Farmasi" },
];

export const SATUSEHAT_OFFICIAL_PATIENTS: BenchmarkPatient[] = [
  { nik: "9271060312000001", name: "Ardianto Putra", gender: "male", birthDate: "1992-01-09", ihsNumber: "P02478375538" },
  { nik: "9204014804000002", name: "Claudia Sintia", gender: "female", birthDate: "1989-11-03", ihsNumber: "P03647103112" },
  { nik: "9104224509000003", name: "Elizabeth Dior", gender: "female", birthDate: "1976-07-07", ihsNumber: "P00805884304" },
  { nik: "9104223107000004", name: "Dr. Alan Bagus Prasetya", gender: "male", birthDate: "1977-09-03", ihsNumber: "P00912894463" },
  { nik: "9104224606000005", name: "Ghina Assyifa", gender: "female", birthDate: "2004-08-21", ihsNumber: "P01654557057" },
  { nik: "9104025209000006", name: "Salsabilla Anjani Rizki", gender: "female", birthDate: "2001-04-16", ihsNumber: "P02280547535" },
  { nik: "9201076001000007", name: "Theodore Elisjah", gender: "female", birthDate: "1985-09-18", ihsNumber: "P01836748436" },
  { nik: "9201394901000008", name: "Sonia Herdianti", gender: "female", birthDate: "1996-06-08", ihsNumber: "P00883356749" },
  { nik: "9201076407000009", name: "Nancy Wang", gender: "female", birthDate: "1955-10-10", ihsNumber: "P01058967035" },
  { nik: "9210060207000010", name: "Syarif Muhammad", gender: "male", birthDate: "1988-11-02", ihsNumber: "P02428473601" },
  { nik: "3674000011112220", name: "By. Ny. Claudia Sintia", gender: "male", birthDate: "2023-05-24", ihsNumber: "P02029103384", nikIbu: "9204014804000002" },
];
