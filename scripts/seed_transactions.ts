import postgres from "postgres";
import {
  MOCK_PATIENT,
  SAMPLE_PATIENTS,
  ALL_SAMPLE_ENCOUNTERS,
  INITIAL_WORKLIST,
} from "./fixtures/mock-data";
import { PatientProfile } from "../src/lib/satusehat/types";
import { seedMasterData } from "./seed_master";

// ============================================================================
// SIMRS MEDIXIA & SATUSEHAT - RE-ENGINEERED TRANSACTION DATA SEEDER
// Standar Kemenkes RI, Permenkes No. 24/2022, HL7 FHIR R4
// Mengisi data transaksi operasional: Pasien, Kunjungan RME, Vitals, Diagnosa,
// Tindakan, Resep Obat & Mutasi Stok, Order Lab & Radiologi, Addendum, Antrean,
// serta Audit Log dan Outbox SATUSEHAT.
// ============================================================================

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:admin@localhost:5432/medixia_simrs";

const sql = postgres(connectionString, {
  max: 1,
  idle_timeout: 10,
  prepare: false,
  onnotice: () => {}, // Filter PostgreSQL notices agar log terminal bersih
});

export async function seedTransactionData() {
  const startTime = Date.now();
  console.log("\n==========================================================");
  console.log("📋 SIMRS & SATUSEHAT - RE-SEED DATA TRANSAKSI KLINIS");
  console.log(
    `🔌 URL Database: ${connectionString.replace(/:[^:@]+@/, ":****@")}`,
  );
  console.log("==========================================================\n");

  try {
    // ------------------------------------------------------------------------
    // 1. Verifikasi Ketersediaan Data Master (Faskes, Poli, User, Kamus KFA)
    // ------------------------------------------------------------------------
    console.log("🔍 Memverifikasi ketersediaan Master Data di database...");
    const facCountRes =
      await sql`SELECT COUNT(*)::int as count FROM facilities`;
    const userCountRes = await sql`SELECT COUNT(*)::int as count FROM users`;

    if (
      (facCountRes[0]?.count || 0) === 0 ||
      (userCountRes[0]?.count || 0) === 0
    ) {
      console.log(
        "⚠️ Master Data belum lengkap. Menjalankan seed master data terlebih dahulu...",
      );
      await seedMasterData();
    }

    // ------------------------------------------------------------------------
    // 2. Bersihkan Data Transaksi Lama (Clean Transactions)
    // ------------------------------------------------------------------------
    console.log(
      "🧹 Mengosongkan data transaksi operasional lama (Truncate CASCADE)...",
    );
    await sql.unsafe(`
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

      -- Reset atomic sequences ke nomor awal
      ALTER SEQUENCE IF EXISTS reg_number_seq RESTART WITH 1;
      ALTER SEQUENCE IF EXISTS mrn_seq RESTART WITH 100001;

      -- Normalisasi stok fisik obat ke baseline
      UPDATE master_medications SET stock = 100 WHERE stock != 100;
    `);
    console.log("✅ Data transaksi lama berhasil dibersihkan.");

    // ------------------------------------------------------------------------
    // 3. Seeding Data Pasien (Master Patient Index - Operasional)
    // ------------------------------------------------------------------------
    console.log("👤 Menyinkronkan Data Profil Pasien (patients)...");
    const allPatients: PatientProfile[] = [
      MOCK_PATIENT,
      ...SAMPLE_PATIENTS.filter((p) => p.id !== MOCK_PATIENT.id),
    ];

    let patientCount = 0;
    for (const p of allPatients) {
      await sql`
        INSERT INTO patients (
          id, nik, mrn, ihs_number, name, gender, birth_date, phone, address, blood_type,
          allergies, emergency_contact_name, emergency_contact_relation, emergency_contact_phone,
          payment_payer, last_visit_date, last_visit_department, last_visit_doctor, last_visit_diagnosis,
          total_visits_count, patient_status, inpatient_details, satusehat_consent
        ) VALUES (
          ${p.id}, ${p.nik}, ${p.mrn}, ${p.ihsNumber || (p.id.startsWith("P") ? p.id : null)},
          ${p.name}, ${p.gender}, ${p.birthDate}, ${p.phone}, ${p.address}, ${p.bloodType},
          ${JSON.stringify(p.allergies || [])},
          ${p.emergencyContact?.name || "-"},
          ${p.emergencyContact?.relation || "-"},
          ${p.emergencyContact?.phone || "-"},
          ${p.paymentPayer || "BPJS Kesehatan"},
          ${p.lastVisitDate || null},
          ${p.lastVisitDepartment || null},
          ${p.lastVisitDoctor || null},
          ${p.lastVisitDiagnosis || null},
          ${p.totalVisitsCount || 1},
          ${p.patientStatus || "outpatient"},
          ${p.inpatientDetails ? JSON.stringify(p.inpatientDetails) : null},
          ${p.satusehatConsent || "opt-in"}
        )
        ON CONFLICT (id) DO UPDATE SET
          nik = EXCLUDED.nik,
          mrn = EXCLUDED.mrn,
          name = EXCLUDED.name,
          gender = EXCLUDED.gender,
          birth_date = EXCLUDED.birth_date,
          phone = EXCLUDED.phone,
          address = EXCLUDED.address,
          blood_type = EXCLUDED.blood_type,
          allergies = EXCLUDED.allergies,
          ihs_number = EXCLUDED.ihs_number,
          payment_payer = EXCLUDED.payment_payer,
          last_visit_date = EXCLUDED.last_visit_date,
          last_visit_department = EXCLUDED.last_visit_department,
          last_visit_doctor = EXCLUDED.last_visit_doctor,
          last_visit_diagnosis = EXCLUDED.last_visit_diagnosis,
          total_visits_count = EXCLUDED.total_visits_count,
          patient_status = EXCLUDED.patient_status,
          inpatient_details = EXCLUDED.inpatient_details,
          satusehat_consent = EXCLUDED.satusehat_consent,
          updated_at = CURRENT_TIMESTAMP;
      `;
      patientCount++;
    }

    // ------------------------------------------------------------------------
    // 4. Seeding Kunjungan RME, Vitals, Diagnosa, Resep, Lab, dan Log
    // ------------------------------------------------------------------------
    console.log("📋 Menyinkronkan Kunjungan RME & Rekam Medis (encounters)...");
    let encounterCount = 0;
    let vitalsCount = 0;
    let diagnosisCount = 0;
    let procedureCount = 0;
    let prescriptionCount = 0;
    let stockMutationCount = 0;
    let diagnosticOrderCount = 0;
    let labCount = 0;
    let radiologyCount = 0;
    let addendumCount = 0;
    let syncLogCount = 0;

    const validPatientIds = new Set(allPatients.map((p) => p.id));
    const fallbackPatientId = MOCK_PATIENT.id;

    for (const enc of ALL_SAMPLE_ENCOUNTERS) {
      const patientId =
        enc.patientId && validPatientIds.has(enc.patientId)
          ? enc.patientId
          : fallbackPatientId;
      const facilityId = enc.facilityId || "fac-rsud-01";
      const deptId =
        enc.departmentId ||
        (enc.clinicDepartment.includes("Penyakit Dalam")
          ? "dept-rs-01"
          : enc.clinicDepartment.includes("Umum")
            ? "dept-rs-02"
            : enc.clinicDepartment.includes("Anak")
              ? "dept-rs-03"
              : enc.clinicDepartment.includes("Gigi")
                ? "dept-rs-04"
                : enc.clinicDepartment.includes("Jantung") ||
                    enc.clinicDepartment.includes("Bedah")
                  ? "dept-rs-05"
                  : enc.clinicDepartment.includes("Mata")
                    ? "dept-rs-06"
                    : "dept-rs-01");
      const doctorId = enc.doctorId || "usr-dr-rian";
      const isFinished = (enc.encounterStatus || "finished") === "finished";
      const isLocked = enc.isLocked !== undefined ? enc.isLocked : isFinished;
      const lockedAt = isLocked ? enc.lockedAt || enc.visitDate : null;
      const lockedBy = isLocked ? enc.lockedBy || enc.doctorName : null;

      await sql`
        INSERT INTO encounters (
          id, patient_id, facility_id, department_id, doctor_id, satusehat_encounter_id, visit_date, clinic_department,
          doctor_name, doctor_sip, doctor_ihs_id,
          chief_complaint, anamnesis, follow_up_instruction, next_visit_date, referred_to,
          discharge_disposition, encounter_status, queue_number, registration_number, consent_status,
          sync_status, synced_at, is_locked, locked_at, locked_by
        ) VALUES (
          ${enc.id}, ${patientId}, ${facilityId}, ${deptId}, ${doctorId}, ${enc.satusehatEncounterId || null}, ${enc.visitDate}, ${enc.clinicDepartment},
          ${enc.doctorName}, ${enc.doctorSip}, ${enc.doctorIhsId || "10001354453"},
          ${enc.chiefComplaint}, ${enc.anamnesis}, ${enc.followUpPlan?.instruction || "Kontrol rutin bila keluhan berlanjut."},
          ${enc.followUpPlan?.nextVisitDate || null}, ${enc.followUpPlan?.referredTo || null},
          ${enc.dischargeDisposition || "Pulang Berobat Jalan"}, ${enc.encounterStatus || "finished"},
          ${enc.queueNumber || null}, ${enc.registrationNumber || null}, ${enc.consentStatus || "opt-in"},
          ${enc.syncStatus || "synced"}, ${enc.syncedAt || enc.visitDate}, ${isLocked}, ${lockedAt}, ${lockedBy}
        )
        ON CONFLICT (id) DO UPDATE SET
          patient_id = EXCLUDED.patient_id,
          facility_id = EXCLUDED.facility_id,
          department_id = EXCLUDED.department_id,
          doctor_id = EXCLUDED.doctor_id,
          satusehat_encounter_id = EXCLUDED.satusehat_encounter_id,
          encounter_status = EXCLUDED.encounter_status,
          sync_status = EXCLUDED.sync_status,
          synced_at = EXCLUDED.synced_at,
          is_locked = EXCLUDED.is_locked,
          locked_at = EXCLUDED.locked_at,
          locked_by = EXCLUDED.locked_by,
          updated_at = CURRENT_TIMESTAMP;
      `;
      encounterCount++;

      // 4.1 Vitals
      if (enc.vitals) {
        await sql`
          INSERT INTO vitals (
            id, encounter_id, systolic, diastolic, heart_rate, temperature,
            respiratory_rate, oxygen_saturation, weight_kg, height_cm, bmi, physical_exam_notes,
            satusehat_bp_id, satusehat_hr_id, satusehat_temp_id, satusehat_rr_id, satusehat_spo2_id,
            satusehat_weight_id, satusehat_height_id, satusehat_bmi_id
          ) VALUES (
            ${`vit-${enc.id}`}, ${enc.id}, ${enc.vitals.systolic}, ${enc.vitals.diastolic},
            ${enc.vitals.heartRate}, ${enc.vitals.temperature}, ${enc.vitals.respiratoryRate},
            ${enc.vitals.oxygenSaturation}, ${enc.vitals.weightKg}, ${enc.vitals.heightCm},
            ${enc.vitals.bmi || null}, ${enc.vitals.physicalExamNotes || null},
            ${enc.vitals.satusehatBpId || null}, ${enc.vitals.satusehatHrId || null},
            ${enc.vitals.satusehatTempId || null}, ${enc.vitals.satusehatRrId || null},
            ${enc.vitals.satusehatSpo2Id || null}, ${enc.vitals.satusehatWeightId || null},
            ${enc.vitals.satusehatHeightId || null}, ${enc.vitals.satusehatBmiId || null}
          )
          ON CONFLICT (id) DO UPDATE SET
            systolic = EXCLUDED.systolic,
            diastolic = EXCLUDED.diastolic,
            heart_rate = EXCLUDED.heart_rate,
            temperature = EXCLUDED.temperature;
        `;
        vitalsCount++;
      }

      // 4.2 Diagnoses (ICD-10)
      if (enc.diagnoses && enc.diagnoses.length > 0) {
        for (let i = 0; i < enc.diagnoses.length; i++) {
          const d = enc.diagnoses[i];
          await sql`
            INSERT INTO diagnoses (
              id, encounter_id, type, code, display, patient_friendly_name, system, clinical_status, satusehat_condition_id
            ) VALUES (
              ${d.id || `diag-${enc.id}-${i}`}, ${enc.id}, ${d.type}, ${d.code}, ${d.display},
              ${d.patientFriendlyName}, ${d.system || "http://hl7.org/fhir/sid/icd-10"},
              ${d.clinicalStatus || "active"}, ${d.satusehatConditionId || null}
            ) ON CONFLICT (id) DO NOTHING;
          `;
          diagnosisCount++;
        }
      }

      // 4.3 Procedures (ICD-9-CM)
      if (enc.procedures && enc.procedures.length > 0) {
        for (let i = 0; i < enc.procedures.length; i++) {
          const p = enc.procedures[i];
          await sql`
            INSERT INTO procedures (
              id, encounter_id, code, display, category, notes, satusehat_procedure_id
            ) VALUES (
              ${p.id || `proc-${enc.id}-${i}`}, ${enc.id}, ${p.code}, ${p.display},
              ${p.category}, ${p.notes || null}, ${p.satusehatProcedureId || null}
            ) ON CONFLICT (id) DO NOTHING;
          `;
          procedureCount++;
        }
      }

      // 4.4 Prescriptions & Stock Mutations
      if (enc.prescriptions && enc.prescriptions.length > 0) {
        for (let i = 0; i < enc.prescriptions.length; i++) {
          const m = enc.prescriptions[i];
          const rxId = m.id || `rx-${enc.id}-${i}`;
          const isDispensed = m.dispenseStatus === "dispensed" || isFinished;
          const dispenseStatus = isDispensed
            ? "dispensed"
            : m.dispenseStatus || "pending_review";

          await sql`
            INSERT INTO prescriptions (
              id, encounter_id, kfa_code, medication_name, form, dosage, frequency, timing,
              morning, afternoon, evening, night, quantity, unit, duration_days, instructions,
              satusehat_medication_request_id, satusehat_medication_id, dispense_status,
              reviewed_by, reviewed_at, prepared_by, prepared_at, dispensed_by, dispensed_at,
              satusehat_medication_dispense_id, etiquette_type, batch_number, expiry_date, counseling_notes
            ) VALUES (
              ${rxId}, ${enc.id}, ${m.kfaCode}, ${m.medicationName}, ${m.form}, ${m.dosage}, ${m.frequency}, ${m.timing},
              ${Boolean(m.schedule?.morning)}, ${Boolean(m.schedule?.afternoon)}, ${Boolean(m.schedule?.evening)}, ${Boolean(m.schedule?.night)},
              ${m.quantity}, ${m.unit}, ${m.durationDays}, ${m.instructions},
              ${m.satusehatMedicationRequestId || null}, ${m.satusehatMedicationId || null}, ${dispenseStatus},
              ${isDispensed ? "apt.aditya" : null}, ${isDispensed ? enc.visitDate : null},
              ${isDispensed ? "apt.aditya" : null}, ${isDispensed ? enc.visitDate : null},
              ${isDispensed ? "apt.aditya" : null}, ${isDispensed ? enc.visitDate : null},
              ${m.satusehatMedicationDispenseId || null}, ${m.etiquetteType || "white"},
              ${m.batchNumber || "BCH-2026-09"}, ${m.expiryDate || "2027-12-31"},
              ${m.counselingNotes || "Diminum sesudah makan secara teratur."}
            ) ON CONFLICT (id) DO NOTHING;
          `;
          prescriptionCount++;

          // Jika resep sudah diserahkan / dispensed, rekam mutasi stok farmasi
          if (isDispensed) {
            const mutId = `mut-${rxId}`;
            const qty = Number(m.quantity) || 10;
            await sql`
              INSERT INTO stock_mutations (
                id, medication_id, kfa_code, type, quantity, stock_before, stock_after,
                reference_type, reference_id, notes, created_by, created_at
              ) VALUES (
                ${mutId}, ${`med-kfa-${m.kfaCode}`}, ${m.kfaCode}, 'dispense', ${-qty},
                100, ${100 - qty}, 'prescription', ${rxId},
                ${`Penyerahan resep rawat jalan ${enc.registrationNumber || enc.id}`},
                'apt.aditya', ${enc.visitDate}
              ) ON CONFLICT (id) DO NOTHING;
            `;
            stockMutationCount++;
          }
        }
      }

      // 4.5 Diagnostic Orders
      if (enc.diagnosticOrders && enc.diagnosticOrders.length > 0) {
        for (let i = 0; i < enc.diagnosticOrders.length; i++) {
          const o = enc.diagnosticOrders[i];
          await sql`
            INSERT INTO diagnostic_orders (
              id, encounter_id, test_code, test_name, category, status, priority, order_date, doctor_name, clinical_notes,
              satusehat_service_request_id
            ) VALUES (
              ${o.id || `ord-${enc.id}-${i}`}, ${enc.id}, ${o.testCode}, ${o.testName}, ${o.category},
              ${o.status}, ${o.priority}, ${o.orderDate}, ${o.doctorName}, ${o.clinicalNotes || null},
              ${o.satusehatServiceRequestId || null}
            ) ON CONFLICT (id) DO NOTHING;
          `;
          diagnosticOrderCount++;
        }
      }

      // 4.6 Lab Results
      if (enc.labResults && enc.labResults.length > 0) {
        for (let i = 0; i < enc.labResults.length; i++) {
          const lr = enc.labResults[i];
          await sql`
            INSERT INTO lab_results (
              id, encounter_id, test_code, test_name, category, value, unit, reference_range, flag,
              result_date, performer, notes, satusehat_observation_id, satusehat_diagnostic_report_id
            ) VALUES (
              ${lr.id || `lab-${enc.id}-${i}`}, ${enc.id}, ${lr.testCode}, ${lr.testName}, ${lr.category},
              ${String(lr.value)}, ${lr.unit}, ${lr.referenceRange}, ${lr.flag}, ${lr.resultDate},
              ${lr.performer}, ${lr.notes || null},
              ${lr.satusehatObservationId || null}, ${lr.satusehatDiagnosticReportId || null}
            ) ON CONFLICT (id) DO NOTHING;
          `;
          labCount++;
        }
      }

      // 4.7 Radiology Results
      if (enc.radiologyResults && enc.radiologyResults.length > 0) {
        for (let i = 0; i < enc.radiologyResults.length; i++) {
          const rad = enc.radiologyResults[i];
          await sql`
            INSERT INTO radiology_results (
              id, encounter_id, exam_code, exam_name, modality, findings, conclusion, radiologist_name, result_date,
              satusehat_observation_id, satusehat_diagnostic_report_id
            ) VALUES (
              ${rad.id || `rad-${enc.id}-${i}`}, ${enc.id}, ${rad.examCode}, ${rad.examName}, ${rad.modality},
              ${rad.findings}, ${rad.conclusion}, ${rad.radiologistName}, ${rad.resultDate},
              ${rad.satusehatObservationId || null}, ${rad.satusehatDiagnosticReportId || null}
            ) ON CONFLICT (id) DO NOTHING;
          `;
          radiologyCount++;
        }
      }

      // 4.8 Medical Addendums
      if (enc.addendums && enc.addendums.length > 0) {
        for (let i = 0; i < enc.addendums.length; i++) {
          const add = enc.addendums[i];
          await sql`
            INSERT INTO medical_addendums (
              id, encounter_id, timestamp, author_name, author_role, note_text
            ) VALUES (
              ${add.id || `add-${enc.id}-${i}`}, ${enc.id}, ${add.timestamp}, ${add.authorName}, ${add.authorRole}, ${add.noteText}
            ) ON CONFLICT (id) DO NOTHING;
          `;
          addendumCount++;
        }
      }

      // 4.9 SATUSEHAT Sync Logs
      if (enc.syncBreakdown && enc.syncBreakdown.length > 0) {
        for (let i = 0; i < enc.syncBreakdown.length; i++) {
          const sb = enc.syncBreakdown[i];
          await sql`
            INSERT INTO satusehat_sync_logs (
              id, encounter_id, resource_type, label, category, standard, status, http_status, fhir_id,
              error_message, retry_count, last_attempt, details
            ) VALUES (
              ${`sync-${enc.id}-${i}`}, ${enc.id}, ${sb.resourceType}, ${sb.label}, ${sb.category || null},
              ${sb.standard}, ${sb.status}, ${sb.httpStatus || 201}, ${sb.fhirId || null},
              ${sb.errorMessage || null}, ${sb.retryCount || 0}, ${sb.lastAttempt || enc.visitDate},
              ${sb.details ? JSON.stringify(sb.details) : null}
            ) ON CONFLICT (id) DO NOTHING;
          `;
          syncLogCount++;
        }
      }
    }

    // ------------------------------------------------------------------------
    // 5. Seeding Antrean Poliklinik Hari Ini (queue_items)
    // ------------------------------------------------------------------------
    console.log(
      "🎟️  Menyinkronkan Antrean Poliklinik Hari Ini (queue_items)...",
    );
    let queueCount = 0;
    const todayStr = new Date().toISOString().split("T")[0];

    for (const q of INITIAL_WORKLIST) {
      // Pastikan pasien antrean tersedia di tabel patients
      await sql`
        INSERT INTO patients (
          id, nik, mrn, ihs_number, name, gender, birth_date, phone, address, blood_type,
          allergies, emergency_contact_name, emergency_contact_relation, emergency_contact_phone,
          payment_payer, last_visit_date, last_visit_department, last_visit_doctor, last_visit_diagnosis,
          total_visits_count, patient_status, satusehat_consent
        ) VALUES (
          ${q.patient.id}, ${q.patient.nik}, ${q.patient.mrn}, ${q.patient.ihsNumber || (q.patient.id.startsWith("P") ? q.patient.id : null)},
          ${q.patient.name}, ${q.patient.gender}, ${q.patient.birthDate}, ${q.patient.phone}, ${q.patient.address}, ${q.patient.bloodType},
          ${JSON.stringify(q.patient.allergies || [])},
          ${q.patient.emergencyContact?.name || "-"},
          ${q.patient.emergencyContact?.relation || "-"},
          ${q.patient.emergencyContact?.phone || "-"},
          ${q.patient.paymentPayer || "BPJS Kesehatan"},
          ${q.patient.lastVisitDate || null},
          ${q.patient.lastVisitDepartment || null},
          ${q.patient.lastVisitDoctor || null},
          ${q.patient.lastVisitDiagnosis || null},
          ${q.patient.totalVisitsCount || 1},
          ${q.patient.patientStatus || "outpatient"},
          ${q.patient.satusehatConsent || "opt-in"}
        ) ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          ihs_number = EXCLUDED.ihs_number;
      `;

      const deptId =
        q.departmentId ||
        (q.department.includes("Penyakit Dalam")
          ? "dept-rs-01"
          : q.department.includes("Umum")
            ? "dept-rs-02"
            : q.department.includes("Anak")
              ? "dept-rs-03"
              : q.department.includes("Gigi")
                ? "dept-rs-04"
                : q.department.includes("Jantung") ||
                    q.department.includes("Bedah")
                  ? "dept-rs-05"
                  : q.department.includes("Mata")
                    ? "dept-rs-06"
                    : "dept-rs-01");
      const doctorId = q.doctorId || "usr-dr-rian";

      await sql`
        INSERT INTO queue_items (
          id, queue_number, registration_number, patient_id, department_id, doctor_id, encounter_id,
          department, doctor, room, arrival_time, arrival_timestamp, chief_complaint, status,
          satusehat_status, satusehat_consent, triage_priority, payment_payer, queue_date
        ) VALUES (
          ${q.id}, ${q.queueNumber}, ${q.registrationNumber || null}, ${q.patient.id}, ${deptId}, ${doctorId},
          ${q.encounterId || null}, ${q.department}, ${q.doctor}, ${q.room},
          ${q.arrivalTime}, ${q.arrivalTimestamp || Date.now()}, ${q.chiefComplaint}, ${q.status},
          ${q.satusehatStatus}, ${q.satusehatConsent || "opt-in"}, ${q.triagePriority || "regular"},
          ${q.patient.paymentPayer || "BPJS Kesehatan"}, ${todayStr}
        )
        ON CONFLICT (id) DO UPDATE SET
          department_id = EXCLUDED.department_id,
          doctor_id = EXCLUDED.doctor_id,
          encounter_id = EXCLUDED.encounter_id,
          status = EXCLUDED.status,
          satusehat_status = EXCLUDED.satusehat_status,
          triage_priority = EXCLUDED.triage_priority;
      `;
      queueCount++;
    }

    // ------------------------------------------------------------------------
    // 6. Seeding Antrean Outbox SATUSEHAT Resiliensi (satusehat_outbox)
    // ------------------------------------------------------------------------
    console.log(
      "📤 Menyinkronkan Antrean Resiliensi Outbox SATUSEHAT (satusehat_outbox)...",
    );
    let outboxCount = 0;
    const samplePendingEnc =
      ALL_SAMPLE_ENCOUNTERS.find(
        (e) => e.syncStatus === "pending" || e.syncStatus === "partial_failed",
      ) || ALL_SAMPLE_ENCOUNTERS[0];
    if (samplePendingEnc) {
      await sql`
        INSERT INTO satusehat_outbox (
          id, encounter_id, resource_type, payload, status, retry_count, max_retries, next_retry_at, error_message
        ) VALUES (
          ${`box-${samplePendingEnc.id}-001`}, ${samplePendingEnc.id}, 'encounter_bundle',
          ${JSON.stringify({ encounterId: samplePendingEnc.id, syncTarget: "SATUSEHAT", timestamp: new Date().toISOString() })},
          'pending', 0, 5, ${new Date(Date.now() + 60000).toISOString()}, null
        ) ON CONFLICT (id) DO NOTHING;
      `;
      outboxCount++;
    }

    // ------------------------------------------------------------------------
    // 7. Update Sequence Atomik ke Nomor Terakhir
    // ------------------------------------------------------------------------
    await sql.unsafe(`
      SELECT setval('reg_number_seq', COALESCE((SELECT COUNT(*) FROM encounters), 1), true);
      SELECT setval('mrn_seq', COALESCE(100000 + (SELECT COUNT(*) FROM patients), 100001), true);
    `);

    const elapsed = Date.now() - startTime;

    console.log(
      "\n==================================================================================",
    );
    console.log("📊 RINGKASAN RE-SEEDED DATA TRANSAKSI SIMRS & SATUSEHAT:");
    console.log(
      "----------------------------------------------------------------------------------",
    );
    console.log(
      `| 👤 Master Patient Index (patients)      : ${patientCount} pasien`,
    );
    console.log(
      `| 📋 Kunjungan RME (encounters)           : ${encounterCount} rekam medis`,
    );
    console.log(
      `| ❤️  Tanda Vital Fisik (vitals)           : ${vitalsCount} observasi`,
    );
    console.log(
      `| 🩺 Diagnosa Klinis ICD-10 (diagnoses)   : ${diagnosisCount} record`,
    );
    console.log(
      `| 🔪 Tindakan Medis ICD-9 (procedures)    : ${procedureCount} record`,
    );
    console.log(
      `| 💊 Resep Obat Elektronik (prescriptions): ${prescriptionCount} resep`,
    );
    console.log(
      `| 📦 Mutasi Stok Farmasi (stock_mutations): ${stockMutationCount} mutasi`,
    );
    console.log(
      `| 🧪 Order Penunjang (diagnostic_orders)  : ${diagnosticOrderCount} order`,
    );
    console.log(
      `| 🔬 Hasil Uji Laboratorium (lab_results) : ${labCount} hasil`,
    );
    console.log(
      `| 🩻 Hasil Radiologi (radiology_results)  : ${radiologyCount} hasil`,
    );
    console.log(
      `| 📝 Catatan Tambahan (medical_addendums) : ${addendumCount} catatan`,
    );
    console.log(
      `| 🎟️  Antrean Poliklinik (queue_items)     : ${queueCount} antrean hari ini`,
    );
    console.log(
      `| ☁️  Log Audit FHIR (satusehat_sync_logs) : ${syncLogCount} log audit`,
    );
    console.log(
      `| 📤 Antrean Outbox (satusehat_outbox)    : ${outboxCount} payload retry`,
    );
    console.log(
      "----------------------------------------------------------------------------------",
    );
    console.log(
      `🎉 SELURUH DATA TRANSAKSI BERHASIL DI-SEED DALAM ${elapsed}ms!`,
    );
    console.log(
      "💡 Seluruh data klinis 100% siap digunakan dan selaras dengan sistem saat ini.\n",
    );
  } catch (error) {
    console.error("\n❌ Gagal melakukan seeding data transaksi SIMRS:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Jalankan jika dipanggil langsung
if (require.main === module || process.argv[1]?.includes("seed_transactions")) {
  seedTransactionData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
