/**
 * Validation Engine for SATUSEHAT RME & Clinical Workflow
 * Sesuai Permenkes No. 24/2022 & HL7 FHIR R4 Kemenkes RI
 */

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export interface VitalSignAlert {
  field: 'bloodPressure' | 'heartRate' | 'respiratoryRate' | 'temperature' | 'oxygenSaturation';
  level: 'normal' | 'warning' | 'critical';
  label: string;
  message: string;
}

/**
 * Validasi Format NIK (Nomor Induk Kependudukan)
 * - Harus 16 digit numerik
 * - Mengikuti kaidah kode wilayah 6 digit + tgl lahir 6 digit + urut 4 digit
 */
export function validateNIK(nik: string): ValidationResult {
  const cleanNik = nik.trim();
  if (!cleanNik) {
    return { isValid: false, message: 'NIK wajib diisi (16 digit angka).' };
  }
  if (!/^\d{16}$/.test(cleanNik)) {
    return { 
      isValid: false, 
      message: `NIK harus terdiri dari tepat 16 digit angka (saat ini ${cleanNik.length} digit).` 
    };
  }
  // Cek kode provinsi awal (11-96 di Indonesia)
  const provCode = parseInt(cleanNik.substring(0, 2), 10);
  if (provCode < 11 || provCode > 96) {
    return { isValid: false, message: 'Format kode wilayah provinsi NIK tidak valid.' };
  }
  return { isValid: true };
}

/**
 * Validasi Format Nomor SATUSEHAT IHS (Patient / Practitioner)
 * - Format resmi Kemenkes: P diikuti 10 digit angka (contoh: P1002345678) atau format numeric 10-12 digit
 */
export function validateIHS(ihs: string): ValidationResult {
  const cleanIhs = ihs.trim();
  if (!cleanIhs) {
    return { isValid: false, message: 'Nomor IHS SATUSEHAT belum terisi.' };
  }
  if (/^P\d{10}$/.test(cleanIhs) || /^1000\d{6,10}$/.test(cleanIhs) || /^[0-9a-fA-F-]{36}$/.test(cleanIhs)) {
    return { isValid: true };
  }
  return { 
    isValid: false, 
    message: 'Format IHS tidak valid (contoh: P1002345678 atau format ID SATUSEHAT resmi).' 
  };
}

/**
 * Validasi Nomor Kartu BPJS / JKN
 * - Wajib 13 digit angka jika isRequired = true atau jika diisi
 */
export function validateBPJS(noBpjs: string, isRequired = false): ValidationResult {
  const clean = noBpjs.trim();
  if (!clean) {
    if (isRequired) {
      return { isValid: false, message: 'Nomor kartu BPJS Kesehatan (13 digit) wajib diisi untuk penjamin BPJS.' };
    }
    return { isValid: true };
  }
  if (!/^\d+$/.test(clean)) {
    return {
      isValid: false,
      message: 'Nomor kartu BPJS hanya boleh berisi angka.',
    };
  }
  if (clean.length !== 13) {
    return { 
      isValid: false, 
      message: `Nomor kartu BPJS harus 13 digit angka (saat ini ${clean.length} digit).` 
    };
  }
  return { isValid: true };
}

/**
 * Validasi Nomor Telepon Indonesia
 */
export function validatePhone(phone: string): ValidationResult {
  const clean = phone.trim().replace(/[\s-]/g, '');
  if (!clean) return { isValid: true }; // Optional
  if (!/^(\+62|62|08)\d{8,12}$/.test(clean)) {
    return { isValid: false, message: 'Format nomor telepon tidak valid (contoh: 081234567890).' };
  }
  return { isValid: true };
}

/**
 * Sanitasi Input Nomor Telepon Real-time
 * Hanya mempertahankan karakter angka dan tanda '+' jika di posisi pertama.
 * Mencegah karakter alfabet atau simbol non-telepon masuk ke state.
 */
export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/[^\d+]/g, '');
  if (clean.includes('+')) {
    const hasLeadingPlus = clean.startsWith('+');
    clean = clean.replace(/\+/g, '');
    if (hasLeadingPlus) {
      clean = '+' + clean;
    }
  }
  // Batasi panjang maksimum standar nomor telepon internasional (E.164: maks 15 digit angka + optional '+')
  const maxLength = clean.startsWith('+') ? 16 : 15;
  return clean.slice(0, maxLength);
}

/**
 * Validasi Rentang Fisiologis Tanda-Tanda Vital & Early Warning
 */
export function evaluateVitalSigns(vitals: {
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
}): { isValid: boolean; alerts: VitalSignAlert[] } {
  const alerts: VitalSignAlert[] = [];

  // Tekanan Darah
  if (vitals.systolic !== undefined && vitals.diastolic !== undefined) {
    const s = Number(vitals.systolic);
    const d = Number(vitals.diastolic);
    if (s <= d && s > 0 && d > 0) {
      alerts.push({
        field: 'bloodPressure',
        level: 'critical',
        label: 'Nilai Tidak Logis',
        message: 'Tekanan Sistolik harus lebih tinggi daripada Diastolik.'
      });
    } else if (s >= 180 || d >= 120) {
      alerts.push({
        field: 'bloodPressure',
        level: 'critical',
        label: 'Krisis Hipertensi',
        message: 'Tekanan darah sangat tinggi (≥180/120 mmHg). Waspada komplikasi akut!'
      });
    } else if (s >= 140 || d >= 90) {
      alerts.push({
        field: 'bloodPressure',
        level: 'warning',
        label: 'Hipertensi Stage 2',
        message: 'Tekanan darah di atas normal (≥140/90 mmHg).'
      });
    } else if (s < 90 || d < 60) {
      alerts.push({
        field: 'bloodPressure',
        level: 'warning',
        label: 'Hipotensi',
        message: 'Tekanan darah rendah (<90/60 mmHg).'
      });
    } else if (s > 0 && d > 0) {
      alerts.push({
        field: 'bloodPressure',
        level: 'normal',
        label: 'Normotensif',
        message: 'Tekanan darah dalam batas normal.'
      });
    }
  }

  // Frekuensi Nadi
  if (vitals.heartRate !== undefined && Number(vitals.heartRate) > 0) {
    const hr = Number(vitals.heartRate);
    if (hr > 130) {
      alerts.push({
        field: 'heartRate',
        level: 'critical',
        label: 'Takikardia Berat',
        message: `Nadi sangat cepat (${hr} bpm). Pantau EKG & hemodinamik.`
      });
    } else if (hr > 100) {
      alerts.push({
        field: 'heartRate',
        level: 'warning',
        label: 'Takikardia',
        message: `Nadi meningkat (${hr} bpm). Batas normal 60-100 bpm.`
      });
    } else if (hr < 50) {
      alerts.push({
        field: 'heartRate',
        level: 'warning',
        label: 'Bradikardia',
        message: `Nadi lambat (${hr} bpm). Batas normal 60-100 bpm.`
      });
    } else {
      alerts.push({
        field: 'heartRate',
        level: 'normal',
        label: 'Normal',
        message: 'Frekuensi nadi dalam batas normal (60-100 bpm).'
      });
    }
  }

  // Laju Pernapasan
  if (vitals.respiratoryRate !== undefined && Number(vitals.respiratoryRate) > 0) {
    const rr = Number(vitals.respiratoryRate);
    if (rr >= 30) {
      alerts.push({
        field: 'respiratoryRate',
        level: 'critical',
        label: 'Takipnea Berat',
        message: `Laju napas tinggi (${rr} x/m). Waspada distres pernapasan!`
      });
    } else if (rr > 22) {
      alerts.push({
        field: 'respiratoryRate',
        level: 'warning',
        label: 'Takipnea',
        message: `Laju napas meningkat (${rr} x/m). Batas normal 12-20 x/m.`
      });
    } else if (rr < 10) {
      alerts.push({
        field: 'respiratoryRate',
        level: 'critical',
        label: 'Bradipnea',
        message: `Laju napas rendah (${rr} x/m). Risiko depresi napas.`
      });
    } else {
      alerts.push({
        field: 'respiratoryRate',
        level: 'normal',
        label: 'Normal',
        message: 'Laju pernapasan normal (12-20 x/m).'
      });
    }
  }

  // Suhu Tubuh
  if (vitals.temperature !== undefined && Number(vitals.temperature) > 0) {
    const temp = Number(vitals.temperature);
    if (temp >= 39.0) {
      alerts.push({
        field: 'temperature',
        level: 'critical',
        label: 'Demam Tinggi (Hipertermia)',
        message: `Suhu ${temp}°C sangat tinggi. Pertimbangkan antipiretik & kompres segera.`
      });
    } else if (temp >= 37.5) {
      alerts.push({
        field: 'temperature',
        level: 'warning',
        label: 'Subfebris (Demam)',
        message: `Suhu ${temp}°C di atas batas normal (>37.2°C).`
      });
    } else if (temp < 35.5) {
      alerts.push({
        field: 'temperature',
        level: 'warning',
        label: 'Hipotermia',
        message: `Suhu ${temp}°C di bawah normal (<36.0°C).`
      });
    } else {
      alerts.push({
        field: 'temperature',
        level: 'normal',
        label: 'Afebris (Normal)',
        message: 'Suhu tubuh normal (36.0 - 37.5°C).'
      });
    }
  }

  // Saturasi Oksigen
  if (vitals.oxygenSaturation !== undefined && Number(vitals.oxygenSaturation) > 0) {
    const spo2 = Number(vitals.oxygenSaturation);
    if (spo2 < 90) {
      alerts.push({
        field: 'oxygenSaturation',
        level: 'critical',
        label: 'Hipoksemia Kritis',
        message: `SpO2 ${spo2}% kritis (<90%). Berikan terapi oksigen darurat!`
      });
    } else if (spo2 < 95) {
      alerts.push({
        field: 'oxygenSaturation',
        level: 'warning',
        label: 'Hipoksia Ringan',
        message: `SpO2 ${spo2}% di bawah target optimal (≥95%).`
      });
    } else {
      alerts.push({
        field: 'oxygenSaturation',
        level: 'normal',
        label: 'Normal',
        message: 'Saturasi oksigen optimal (≥95%).'
      });
    }
  }

  const hasCritical = alerts.some(a => a.level === 'critical' && a.label === 'Nilai Tidak Logis');
  return {
    isValid: !hasCritical,
    alerts
  };
}

/**
 * Cek Silang Alergi Obat (CPOE Drug Allergy Cross-Check)
 * Membandingkan obat yang diresepkan dengan riwayat alergi pasien.
 */
export function checkDrugAllergyConflict(
  patientAllergies: string[] | undefined,
  medicationName: string
): { hasConflict: boolean; conflictingAllergens: string[]; message?: string } {
  if (!patientAllergies || patientAllergies.length === 0 || !medicationName) {
    return { hasConflict: false, conflictingAllergens: [] };
  }

  const medLower = medicationName.toLowerCase();
  
  // Mapping golongan / sinonim alergen umum
  const allergyGroups: Record<string, string[]> = {
    'penicillin': ['penicillin', 'amoxicillin', 'ampicillin', 'amoxan', 'augmentin'],
    'amoxicillin': ['penicillin', 'amoxicillin', 'ampicillin', 'amoxan'],
    'sulfa': ['sulfamethoxazole', 'cotrimoxazole', 'bactrim', 'sulfadiazine'],
    'nsaid': ['aspirin', 'ibuprofen', 'asam mefenamat', 'mefenamic', 'ketorolac', 'diclofenac', 'natrium diklofenak', 'meloxicam'],
    'aspirin': ['aspirin', 'acetosal', 'ibuprofen', 'asam mefenamat', 'diclofenac'],
    'paracetamol': ['paracetamol', 'panadol', 'sanmol', 'acetaminophen'],
    'ciprofloxacin': ['ciprofloxacin', 'levofloxacin', 'ofloxacin', 'quinolone'],
    'cephalosporin': ['cefixime', 'ceftriaxone', 'cefadroxil', 'cefotaxime']
  };

  const conflicts: string[] = [];

  for (const allergy of patientAllergies) {
    const allgLower = allergy.toLowerCase().trim();
    if (!allgLower || allgLower.includes('tidak ada') || allgLower.includes('none')) continue;

    // Direct substring match
    if (medLower.includes(allgLower) || allgLower.includes(medLower)) {
      conflicts.push(allergy);
      continue;
    }

    // Check cross-reactivity group
    for (const [groupKey, members] of Object.entries(allergyGroups)) {
      const allergyMatchesGroup = allgLower.includes(groupKey) || members.some(m => allgLower.includes(m));
      const medMatchesGroup = medLower.includes(groupKey) || members.some(m => medLower.includes(m));
      if (allergyMatchesGroup && medMatchesGroup) {
        conflicts.push(`${allergy} (Golongan ${groupKey.toUpperCase()})`);
        break;
      }
    }
  }

  const uniqueConflicts = Array.from(new Set(conflicts));
  if (uniqueConflicts.length > 0) {
    return {
      hasConflict: true,
      conflictingAllergens: uniqueConflicts,
      message: `⚠️ PERINGATAN KESELAMATAN: Obat "${medicationName}" berpotensi memicu reaksi alergi pasien (${uniqueConflicts.join(', ')})!`
    };
  }

  return { hasConflict: false, conflictingAllergens: [] };
}

/**
 * Validasi Kelengkapan Rekam Medis Sebelum Finalisasi (Permenkes 24/2022)
 */
export function validateEncounterCompletion(params: {
  hasPrimaryDiagnosis: boolean;
  hasChiefComplaint: boolean;
  hasVitalSigns: boolean;
  hasPractitioner: boolean;
}): { canComplete: boolean; missingRequirements: string[] } {
  const missing: string[] = [];

  if (!params.hasChiefComplaint) {
    missing.push('Keluhan Utama (Anamnesis)');
  }
  if (!params.hasVitalSigns) {
    missing.push('Pemeriksaan Fisik & TTV');
  }
  if (!params.hasPrimaryDiagnosis) {
    missing.push('Diagnosa Utama ICD-10 (Primary Condition)');
  }
  if (!params.hasPractitioner) {
    missing.push('Dokter DPJP Penanggung Jawab');
  }

  return {
    canComplete: missing.length === 0,
    missingRequirements: missing
  };
}
