import { db } from "../index";
import {
  encounters,
  vitals,
  diagnoses,
  procedures,
  prescriptions,
  diagnosticOrders,
  labResults,
  radiologyResults,
  satusehatSyncLogs,
  medicalAddendums,
  patients,
} from "../schema";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { MemoryCache, CACHE_CONFIG, InvalidationService } from "@/lib/cache";
import {
  OutpatientEncounter,
  VitalSigns,
  DiagnosisItem,
  ProcedureItem,
  PrescriptionItem,
  DiagnosticOrder,
  LabResult,
  RadiologyResult,
  ResourceSyncItem,
  MedicalAddendum,
  SyncStatusType,
} from "@/lib/satusehat/types";

function buildEncounter(row: typeof encounters.$inferSelect): OutpatientEncounter {
  const encounterId = row.id;

  // 1. Fetch Vitals
  const vitRow = db.select().from(vitals).where(eq(vitals.encounterId, encounterId)).get();
  const vitalsData: VitalSigns | undefined = vitRow
    ? {
        systolic: vitRow.systolic,
        diastolic: vitRow.diastolic,
        heartRate: vitRow.heartRate,
        temperature: vitRow.temperature,
        respiratoryRate: vitRow.respiratoryRate,
        oxygenSaturation: vitRow.oxygenSaturation,
        weightKg: vitRow.weightKg,
        heightCm: vitRow.heightCm,
        bmi: vitRow.bmi || undefined,
        physicalExamNotes: vitRow.physicalExamNotes || undefined,
      }
    : undefined;

  // 2. Fetch Diagnoses
  const diagRows = db.select().from(diagnoses).where(eq(diagnoses.encounterId, encounterId)).all();
  const diagnosesData: DiagnosisItem[] = diagRows.map((d: typeof diagnoses.$inferSelect) => ({
    id: d.id,
    type: d.type as "primary" | "secondary",
    code: d.code,
    display: d.display,
    patientFriendlyName: d.patientFriendlyName,
    system: d.system || "http://hl7.org/fhir/sid/icd-10",
    clinicalStatus: (d.clinicalStatus as DiagnosisItem["clinicalStatus"]) || "active",
  }));

  // 3. Fetch Procedures
  const procRows = db.select().from(procedures).where(eq(procedures.encounterId, encounterId)).all();
  const proceduresData: ProcedureItem[] = procRows.map((p: typeof procedures.$inferSelect) => ({
    id: p.id,
    code: p.code,
    display: p.display,
    category: p.category,
    notes: p.notes || undefined,
  }));

  // 4. Fetch Prescriptions
  const rxRows = db.select().from(prescriptions).where(eq(prescriptions.encounterId, encounterId)).all();
  const prescriptionsData: PrescriptionItem[] = rxRows.map((rx: typeof prescriptions.$inferSelect) => ({
    id: rx.id,
    kfaCode: rx.kfaCode,
    medicationName: rx.medicationName,
    form: rx.form,
    dosage: rx.dosage,
    frequency: rx.frequency,
    timing: rx.timing as PrescriptionItem["timing"],
    schedule: {
      morning: Boolean(rx.morning),
      afternoon: Boolean(rx.afternoon),
      evening: Boolean(rx.evening),
      night: Boolean(rx.night),
    },
    quantity: rx.quantity,
    unit: rx.unit,
    durationDays: rx.durationDays,
    instructions: rx.instructions,
  }));

  // 5. Fetch Diagnostic Orders
  const orderRows = db
    .select()
    .from(diagnosticOrders)
    .where(eq(diagnosticOrders.encounterId, encounterId))
    .all();
  const diagnosticOrdersData: DiagnosticOrder[] = orderRows.map((o: typeof diagnosticOrders.$inferSelect) => ({
    id: o.id,
    testCode: o.testCode,
    testName: o.testName,
    category: o.category as "laboratory" | "radiology",
    status: o.status as DiagnosticOrder["status"],
    priority: o.priority as "routine" | "urgent" | "stat",
    orderDate: o.orderDate,
    doctorName: o.doctorName,
    clinicalNotes: o.clinicalNotes || undefined,
  }));

  // 6. Fetch Lab Results
  const labRows = db.select().from(labResults).where(eq(labResults.encounterId, encounterId)).all();
  const labResultsData: LabResult[] = labRows.map((lr: typeof labResults.$inferSelect) => ({
    id: lr.id,
    testCode: lr.testCode,
    testName: lr.testName,
    category: lr.category,
    value: lr.value,
    unit: lr.unit,
    referenceRange: lr.referenceRange,
    flag: lr.flag as "normal" | "high" | "low" | "critical",
    resultDate: lr.resultDate,
    performer: lr.performer,
    notes: lr.notes || undefined,
  }));

  // 7. Fetch Radiology Results
  const radRows = db
    .select()
    .from(radiologyResults)
    .where(eq(radiologyResults.encounterId, encounterId))
    .all();
  const radiologyResultsData: RadiologyResult[] = radRows.map((rad: typeof radiologyResults.$inferSelect) => ({
    id: rad.id,
    examCode: rad.examCode,
    examName: rad.examName,
    modality: rad.modality as RadiologyResult["modality"],
    findings: rad.findings,
    conclusion: rad.conclusion,
    radiologistName: rad.radiologistName,
    resultDate: rad.resultDate,
  }));

  // 8. Fetch Sync Logs (Breakdown)
  const syncRows = db
    .select()
    .from(satusehatSyncLogs)
    .where(eq(satusehatSyncLogs.encounterId, encounterId))
    .all();
  const syncBreakdownData: ResourceSyncItem[] = syncRows.map((sb: typeof satusehatSyncLogs.$inferSelect) => ({
    resourceType: sb.resourceType,
    label: sb.label,
    category: sb.category || undefined,
    standard: sb.standard,
    status: sb.status as "synced" | "failed" | "pending",
    httpStatus: sb.httpStatus || undefined,
    fhirId: sb.fhirId || undefined,
    errorMessage: sb.errorMessage || undefined,
    retryCount: sb.retryCount || 0,
    lastAttempt: sb.lastAttempt || undefined,
    details: sb.details ? JSON.parse(sb.details) : undefined,
  }));

  // 9. Fetch Medical Addendums
  const addendumRows = db
    .select()
    .from(medicalAddendums)
    .where(eq(medicalAddendums.encounterId, encounterId))
    .all();
  const addendumsData: MedicalAddendum[] = addendumRows.map((a: typeof medicalAddendums.$inferSelect) => ({
    id: a.id,
    timestamp: a.timestamp,
    authorName: a.authorName,
    authorRole: a.authorRole,
    noteText: a.noteText,
  }));

  return {
    id: row.id,
    patientId: row.patientId || undefined,
    satusehatEncounterId: row.satusehatEncounterId || undefined,
    visitDate: row.visitDate,
    clinicDepartment: row.clinicDepartment,
    doctorName: row.doctorName,
    doctorSip: row.doctorSip,
    doctorIhsId: row.doctorIhsId || undefined,
    hospitalName: row.hospitalName,
    hospitalOrgId: row.hospitalOrgId,
    chiefComplaint: row.chiefComplaint,
    anamnesis: row.anamnesis,
    vitals: vitalsData,
    diagnoses: diagnosesData,
    procedures: proceduresData,
    prescriptions: prescriptionsData,
    diagnosticOrders: diagnosticOrdersData.length > 0 ? diagnosticOrdersData : undefined,
    labResults: labResultsData.length > 0 ? labResultsData : undefined,
    radiologyResults: radiologyResultsData.length > 0 ? radiologyResultsData : undefined,
    followUpPlan: {
      instruction: row.followUpInstruction,
      nextVisitDate: row.nextVisitDate || undefined,
      referredTo: row.referredTo || undefined,
    },
    dischargeDisposition: row.dischargeDisposition || "Pulang Berobat Jalan",
    encounterStatus: (row.encounterStatus as OutpatientEncounter["encounterStatus"]) || "finished",
    queueNumber: row.queueNumber || undefined,
    consentStatus: (row.consentStatus as "opt-in" | "opt-out") || "opt-in",
    syncStatus: (row.syncStatus as SyncStatusType) || "synced",
    syncedAt: row.syncedAt || undefined,
    syncBreakdown: syncBreakdownData.length > 0 ? syncBreakdownData : undefined,
    isLocked: Boolean(row.isLocked),
    lockedAt: row.lockedAt || undefined,
    lockedBy: row.lockedBy || undefined,
    addendums: addendumsData.length > 0 ? addendumsData : undefined,
  };
}

/**
 * High-Performance Batch Eager Loading:
 * Eliminates N*9+1 query explosion by running 10 collective queries total for N encounters.
 */
function buildEncountersBatch(encounterRows: (typeof encounters.$inferSelect)[]): OutpatientEncounter[] {
  if (!encounterRows || encounterRows.length === 0) return [];
  if (encounterRows.length === 1) return [buildEncounter(encounterRows[0])];

  const encounterIds = encounterRows.map((r) => r.id);

  // Run 9 batch queries using inArray
  const [
    allVitals,
    allDiagnoses,
    allProcedures,
    allPrescriptions,
    allDiagOrders,
    allLabResults,
    allRadResults,
    allSyncLogs,
    allAddendums,
  ] = [
    db.select().from(vitals).where(inArray(vitals.encounterId, encounterIds)).all(),
    db.select().from(diagnoses).where(inArray(diagnoses.encounterId, encounterIds)).all(),
    db.select().from(procedures).where(inArray(procedures.encounterId, encounterIds)).all(),
    db.select().from(prescriptions).where(inArray(prescriptions.encounterId, encounterIds)).all(),
    db.select().from(diagnosticOrders).where(inArray(diagnosticOrders.encounterId, encounterIds)).all(),
    db.select().from(labResults).where(inArray(labResults.encounterId, encounterIds)).all(),
    db.select().from(radiologyResults).where(inArray(radiologyResults.encounterId, encounterIds)).all(),
    db.select().from(satusehatSyncLogs).where(inArray(satusehatSyncLogs.encounterId, encounterIds)).all(),
    db.select().from(medicalAddendums).where(inArray(medicalAddendums.encounterId, encounterIds)).all(),
  ];

  // Group in O(N) Maps
  const vitalsMap = new Map<string, VitalSigns>();
  for (const vitRow of allVitals) {
    vitalsMap.set(vitRow.encounterId, {
      systolic: vitRow.systolic,
      diastolic: vitRow.diastolic,
      heartRate: vitRow.heartRate,
      temperature: vitRow.temperature,
      respiratoryRate: vitRow.respiratoryRate,
      oxygenSaturation: vitRow.oxygenSaturation,
      weightKg: vitRow.weightKg,
      heightCm: vitRow.heightCm,
      bmi: vitRow.bmi || undefined,
      physicalExamNotes: vitRow.physicalExamNotes || undefined,
    });
  }

  const diagnosesMap = new Map<string, DiagnosisItem[]>();
  for (const d of allDiagnoses) {
    const list = diagnosesMap.get(d.encounterId) || [];
    list.push({
      id: d.id,
      type: d.type as "primary" | "secondary",
      code: d.code,
      display: d.display,
      patientFriendlyName: d.patientFriendlyName,
      system: d.system || "http://hl7.org/fhir/sid/icd-10",
      clinicalStatus: (d.clinicalStatus as DiagnosisItem["clinicalStatus"]) || "active",
    });
    diagnosesMap.set(d.encounterId, list);
  }

  const proceduresMap = new Map<string, ProcedureItem[]>();
  for (const p of allProcedures) {
    const list = proceduresMap.get(p.encounterId) || [];
    list.push({
      id: p.id,
      code: p.code,
      display: p.display,
      category: p.category,
      notes: p.notes || undefined,
    });
    proceduresMap.set(p.encounterId, list);
  }

  const prescriptionsMap = new Map<string, PrescriptionItem[]>();
  for (const rx of allPrescriptions) {
    const list = prescriptionsMap.get(rx.encounterId) || [];
    list.push({
      id: rx.id,
      kfaCode: rx.kfaCode,
      medicationName: rx.medicationName,
      form: rx.form,
      dosage: rx.dosage,
      frequency: rx.frequency,
      timing: rx.timing as PrescriptionItem["timing"],
      schedule: {
        morning: Boolean(rx.morning),
        afternoon: Boolean(rx.afternoon),
        evening: Boolean(rx.evening),
        night: Boolean(rx.night),
      },
      quantity: rx.quantity,
      unit: rx.unit,
      durationDays: rx.durationDays,
      instructions: rx.instructions,
    });
    prescriptionsMap.set(rx.encounterId, list);
  }

  const ordersMap = new Map<string, DiagnosticOrder[]>();
  for (const o of allDiagOrders) {
    const list = ordersMap.get(o.encounterId) || [];
    list.push({
      id: o.id,
      testCode: o.testCode,
      testName: o.testName,
      category: o.category as "laboratory" | "radiology",
      status: o.status as DiagnosticOrder["status"],
      priority: o.priority as "routine" | "urgent" | "stat",
      orderDate: o.orderDate,
      doctorName: o.doctorName,
      clinicalNotes: o.clinicalNotes || undefined,
    });
    ordersMap.set(o.encounterId, list);
  }

  const labMap = new Map<string, LabResult[]>();
  for (const lr of allLabResults) {
    const list = labMap.get(lr.encounterId) || [];
    list.push({
      id: lr.id,
      testCode: lr.testCode,
      testName: lr.testName,
      category: lr.category,
      value: lr.value,
      unit: lr.unit,
      referenceRange: lr.referenceRange,
      flag: lr.flag as "normal" | "high" | "low" | "critical",
      resultDate: lr.resultDate,
      performer: lr.performer,
      notes: lr.notes || undefined,
    });
    labMap.set(lr.encounterId, list);
  }

  const radMap = new Map<string, RadiologyResult[]>();
  for (const rad of allRadResults) {
    const list = radMap.get(rad.encounterId) || [];
    list.push({
      id: rad.id,
      examCode: rad.examCode,
      examName: rad.examName,
      modality: rad.modality as RadiologyResult["modality"],
      findings: rad.findings,
      conclusion: rad.conclusion,
      radiologistName: rad.radiologistName,
      resultDate: rad.resultDate,
    });
    radMap.set(rad.encounterId, list);
  }

  const syncMap = new Map<string, ResourceSyncItem[]>();
  for (const sb of allSyncLogs) {
    const list = syncMap.get(sb.encounterId) || [];
    list.push({
      resourceType: sb.resourceType,
      label: sb.label,
      category: sb.category || undefined,
      standard: sb.standard,
      status: sb.status as "synced" | "failed" | "pending",
      httpStatus: sb.httpStatus || undefined,
      fhirId: sb.fhirId || undefined,
      errorMessage: sb.errorMessage || undefined,
      retryCount: sb.retryCount || 0,
      lastAttempt: sb.lastAttempt || undefined,
      details: sb.details ? JSON.parse(sb.details) : undefined,
    });
    syncMap.set(sb.encounterId, list);
  }

  const addendumMap = new Map<string, MedicalAddendum[]>();
  for (const a of allAddendums) {
    const list = addendumMap.get(a.encounterId) || [];
    list.push({
      id: a.id,
      timestamp: a.timestamp,
      authorName: a.authorName,
      authorRole: a.authorRole,
      noteText: a.noteText,
    });
    addendumMap.set(a.encounterId, list);
  }

  // Construct OutpatientEncounter objects in memory in O(N)
  return encounterRows.map((row) => {
    const encId = row.id;
    const diagList = diagnosesMap.get(encId) || [];
    const procList = proceduresMap.get(encId) || [];
    const rxList = prescriptionsMap.get(encId) || [];
    const ordList = ordersMap.get(encId);
    const labList = labMap.get(encId);
    const radList = radMap.get(encId);
    const syncList = syncMap.get(encId);
    const addList = addendumMap.get(encId);

    return {
      id: row.id,
      patientId: row.patientId || undefined,
      satusehatEncounterId: row.satusehatEncounterId || undefined,
      visitDate: row.visitDate,
      clinicDepartment: row.clinicDepartment,
      doctorName: row.doctorName,
      doctorSip: row.doctorSip,
      doctorIhsId: row.doctorIhsId || undefined,
      hospitalName: row.hospitalName,
      hospitalOrgId: row.hospitalOrgId,
      chiefComplaint: row.chiefComplaint,
      anamnesis: row.anamnesis,
      vitals: vitalsMap.get(encId),
      diagnoses: diagList,
      procedures: procList,
      prescriptions: rxList,
      diagnosticOrders: ordList && ordList.length > 0 ? ordList : undefined,
      labResults: labList && labList.length > 0 ? labList : undefined,
      radiologyResults: radList && radList.length > 0 ? radList : undefined,
      followUpPlan: {
        instruction: row.followUpInstruction,
        nextVisitDate: row.nextVisitDate || undefined,
        referredTo: row.referredTo || undefined,
      },
      dischargeDisposition: row.dischargeDisposition || "Pulang Berobat Jalan",
      encounterStatus: (row.encounterStatus as OutpatientEncounter["encounterStatus"]) || "finished",
      queueNumber: row.queueNumber || undefined,
      consentStatus: (row.consentStatus as "opt-in" | "opt-out") || "opt-in",
      syncStatus: (row.syncStatus as SyncStatusType) || "synced",
      syncedAt: row.syncedAt || undefined,
      syncBreakdown: syncList && syncList.length > 0 ? syncList : undefined,
      isLocked: Boolean(row.isLocked),
      lockedAt: row.lockedAt || undefined,
      lockedBy: row.lockedBy || undefined,
      addendums: addList && addList.length > 0 ? addList : undefined,
    };
  });
}

export const EncounterRepository = {
  getAll(): OutpatientEncounter[] {
    return MemoryCache.getOrSet(
      CACHE_CONFIG.KEYS.ENCOUNTER_ALL,
      () => {
        const rows = db.select().from(encounters).orderBy(desc(encounters.visitDate)).all();
        return buildEncountersBatch(rows);
      },
      CACHE_CONFIG.TTL.MEDIUM
    );
  },

  getById(id: string): OutpatientEncounter | null {
    if (!id) return null;
    return MemoryCache.getOrSet(
      CACHE_CONFIG.KEYS.ENCOUNTER_SINGLE(id),
      () => {
        const row = db.select().from(encounters).where(eq(encounters.id, id)).get();
        return row ? buildEncounter(row) : null;
      },
      CACHE_CONFIG.TTL.MEDIUM
    );
  },

  getByPatientId(patientId: string): OutpatientEncounter[] {
    if (!patientId) return [];
    return MemoryCache.getOrSet(
      CACHE_CONFIG.KEYS.ENCOUNTER_PATIENT(patientId),
      () => {
        const rows = db
          .select()
          .from(encounters)
          .where(eq(encounters.patientId, patientId))
          .orderBy(desc(encounters.visitDate))
          .all();
        return buildEncountersBatch(rows);
      },
      CACHE_CONFIG.TTL.MEDIUM
    );
  },

  create(enc: OutpatientEncounter, patientId: string): OutpatientEncounter {
    const encounterId = enc.id || `ENC-${Date.now().toString(36).toUpperCase()}`;
    const now = new Date().toISOString();

    const existing = db.select().from(encounters).where(eq(encounters.id, encounterId)).get();

    if (existing) {
      // 1. Delete previous child rows for this encounter to ensure clean upsert
      db.delete(vitals).where(eq(vitals.encounterId, encounterId)).run();
      db.delete(diagnoses).where(eq(diagnoses.encounterId, encounterId)).run();
      db.delete(procedures).where(eq(procedures.encounterId, encounterId)).run();
      db.delete(prescriptions).where(eq(prescriptions.encounterId, encounterId)).run();
      db.delete(diagnosticOrders).where(eq(diagnosticOrders.encounterId, encounterId)).run();
      db.delete(labResults).where(eq(labResults.encounterId, encounterId)).run();
      db.delete(radiologyResults).where(eq(radiologyResults.encounterId, encounterId)).run();
      db.delete(satusehatSyncLogs).where(eq(satusehatSyncLogs.encounterId, encounterId)).run();
      if (enc.addendums && enc.addendums.length > 0) {
        db.delete(medicalAddendums).where(eq(medicalAddendums.encounterId, encounterId)).run();
      }

      // 2. Update Encounter Master
      db.update(encounters)
        .set({
          patientId,
          satusehatEncounterId:
            enc.satusehatEncounterId !== undefined
              ? enc.satusehatEncounterId
              : existing.satusehatEncounterId,
          visitDate: enc.visitDate || existing.visitDate,
          clinicDepartment: enc.clinicDepartment || existing.clinicDepartment,
          doctorName: enc.doctorName || existing.doctorName,
          doctorSip: enc.doctorSip || existing.doctorSip,
          doctorIhsId: enc.doctorIhsId || existing.doctorIhsId,
          hospitalName: enc.hospitalName || existing.hospitalName,
          hospitalOrgId: enc.hospitalOrgId || existing.hospitalOrgId,
          chiefComplaint: enc.chiefComplaint || existing.chiefComplaint,
          anamnesis: enc.anamnesis || existing.anamnesis,
          followUpInstruction:
            enc.followUpPlan?.instruction || existing.followUpInstruction,
          nextVisitDate:
            enc.followUpPlan?.nextVisitDate !== undefined
              ? enc.followUpPlan?.nextVisitDate
              : existing.nextVisitDate,
          referredTo:
            enc.followUpPlan?.referredTo !== undefined
              ? enc.followUpPlan?.referredTo
              : existing.referredTo,
          dischargeDisposition:
            enc.dischargeDisposition || existing.dischargeDisposition,
          encounterStatus: enc.encounterStatus || existing.encounterStatus,
          queueNumber:
            enc.queueNumber !== undefined ? enc.queueNumber : existing.queueNumber,
          consentStatus: enc.consentStatus || existing.consentStatus,
          syncStatus: enc.syncStatus || existing.syncStatus,
          syncedAt: enc.syncedAt !== undefined ? enc.syncedAt : existing.syncedAt,
          isLocked:
            enc.isLocked !== undefined
              ? Boolean(enc.isLocked)
              : Boolean(existing.isLocked),
          lockedAt:
            enc.lockedAt !== undefined ? enc.lockedAt : existing.lockedAt,
          lockedBy:
            enc.lockedBy !== undefined ? enc.lockedBy : existing.lockedBy,
          updatedAt: now,
        })
        .where(eq(encounters.id, encounterId))
        .run();
    } else {
      // Insert fresh master row
      db.insert(encounters)
        .values({
          id: encounterId,
          patientId,
          satusehatEncounterId: enc.satusehatEncounterId || null,
          visitDate: enc.visitDate || now,
          clinicDepartment: enc.clinicDepartment || "Poli Umum",
          doctorName: enc.doctorName || "dr. Dokter Pemeriksa",
          doctorSip: enc.doctorSip || "SIP-DEFAULT-01",
          doctorIhsId: enc.doctorIhsId || "N10009841",
          hospitalName: enc.hospitalName || "RS Umum Daerah Sehat Sejahtera",
          hospitalOrgId: enc.hospitalOrgId || "10000004",
          chiefComplaint: enc.chiefComplaint || "-",
          anamnesis: enc.anamnesis || "-",
          followUpInstruction:
            enc.followUpPlan?.instruction || "Kontrol rutin bila keluhan berlanjut.",
          nextVisitDate: enc.followUpPlan?.nextVisitDate || null,
          referredTo: enc.followUpPlan?.referredTo || null,
          dischargeDisposition:
            enc.dischargeDisposition || "Pulang Berobat Jalan",
          encounterStatus: enc.encounterStatus || "finished",
          queueNumber: enc.queueNumber || null,
          consentStatus: enc.consentStatus || "opt-in",
          syncStatus: enc.syncStatus || "synced",
          syncedAt: enc.syncedAt || now,
          isLocked: Boolean(enc.isLocked),
          lockedAt: enc.lockedAt || null,
          lockedBy: enc.lockedBy || null,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }

    // 2. Insert Vitals
    if (enc.vitals) {
      db.insert(vitals)
        .values({
          id: `vit-${encounterId}-${Date.now().toString(36)}`,
          encounterId,
          systolic: enc.vitals.systolic ?? 120,
          diastolic: enc.vitals.diastolic ?? 80,
          heartRate: enc.vitals.heartRate ?? 80,
          temperature: enc.vitals.temperature ?? 36.5,
          respiratoryRate: enc.vitals.respiratoryRate ?? 18,
          oxygenSaturation: enc.vitals.oxygenSaturation ?? 98,
          weightKg: enc.vitals.weightKg ?? 60,
          heightCm: enc.vitals.heightCm ?? 165,
          bmi: enc.vitals.bmi || null,
          physicalExamNotes: enc.vitals.physicalExamNotes || null,
        })
        .run();
    }

    // 3. Insert Diagnoses
    if (enc.diagnoses && enc.diagnoses.length > 0) {
      for (let i = 0; i < enc.diagnoses.length; i++) {
        const d = enc.diagnoses[i];
        const diagId =
          d.id && !d.id.startsWith("diag-")
            ? d.id
            : `diag-${encounterId}-${i}-${Date.now().toString(36)}`;
        db.insert(diagnoses)
          .values({
            id: diagId,
            encounterId,
            type: d.type || "primary",
            code: d.code,
            display: d.display || d.code,
            patientFriendlyName: d.patientFriendlyName || d.display || d.code,
            system: d.system || "http://hl7.org/fhir/sid/icd-10",
            clinicalStatus: d.clinicalStatus || "active",
          })
          .run();
      }
    }

    // 4. Insert Procedures
    if (enc.procedures && enc.procedures.length > 0) {
      for (let i = 0; i < enc.procedures.length; i++) {
        const p = enc.procedures[i];
        const procId =
          p.id && !p.id.startsWith("proc-")
            ? p.id
            : `proc-${encounterId}-${i}-${Date.now().toString(36)}`;
        db.insert(procedures)
          .values({
            id: procId,
            encounterId,
            code: p.code,
            display: p.display || p.code,
            category: p.category || "Tindakan Medis",
            notes: p.notes || null,
          })
          .run();
      }
    }

    // 5. Insert Prescriptions
    if (enc.prescriptions && enc.prescriptions.length > 0) {
      for (let i = 0; i < enc.prescriptions.length; i++) {
        const rx = enc.prescriptions[i];
        const rxId =
          rx.id && !rx.id.startsWith("rx-")
            ? rx.id
            : `rx-${encounterId}-${i}-${Date.now().toString(36)}`;
        db.insert(prescriptions)
          .values({
            id: rxId,
            encounterId,
            kfaCode: rx.kfaCode || "93000182",
            medicationName: rx.medicationName || "Obat",
            form: rx.form || "Tablet",
            dosage: rx.dosage || "1 tab",
            frequency: rx.frequency || "3x1",
            timing: rx.timing || "Sesudah Makan",
            morning: Boolean(rx.schedule?.morning),
            afternoon: Boolean(rx.schedule?.afternoon),
            evening: Boolean(rx.schedule?.evening),
            night: Boolean(rx.schedule?.night),
            quantity: rx.quantity ?? 1,
            unit: rx.unit || "tablet",
            durationDays: rx.durationDays ?? 3,
            instructions: rx.instructions || "Minum teratur",
          })
          .run();
      }
    }

    // 6. Insert Diagnostic Orders
    if (enc.diagnosticOrders && enc.diagnosticOrders.length > 0) {
      for (let i = 0; i < enc.diagnosticOrders.length; i++) {
        const o = enc.diagnosticOrders[i];
        const ordId =
          o.id && !o.id.startsWith("ord-")
            ? o.id
            : `ord-${encounterId}-${i}-${Date.now().toString(36)}`;
        db.insert(diagnosticOrders)
          .values({
            id: ordId,
            encounterId,
            testCode: o.testCode,
            testName: o.testName || o.testCode,
            category: o.category || "laboratory",
            status: o.status || "ordered",
            priority: o.priority || "routine",
            orderDate: o.orderDate || now,
            doctorName: o.doctorName || enc.doctorName || "dr. Dokter Pemeriksa",
            clinicalNotes: o.clinicalNotes || null,
          })
          .run();
      }
    }

    // 7. Insert Lab Results
    if (enc.labResults && enc.labResults.length > 0) {
      for (let i = 0; i < enc.labResults.length; i++) {
        const lr = enc.labResults[i];
        const labId =
          lr.id && !lr.id.startsWith("lab-")
            ? lr.id
            : `lab-${encounterId}-${i}-${Date.now().toString(36)}`;
        db.insert(labResults)
          .values({
            id: labId,
            encounterId,
            testCode: lr.testCode,
            testName: lr.testName || lr.testCode,
            category: lr.category || "Kimia Darah",
            value: String(lr.value),
            unit: lr.unit || "-",
            referenceRange: lr.referenceRange || "-",
            flag: lr.flag || "normal",
            resultDate: lr.resultDate || now,
            performer: lr.performer || "Laboratorium RS",
            notes: lr.notes || null,
          })
          .run();
      }
    }

    // 8. Insert Radiology Results
    if (enc.radiologyResults && enc.radiologyResults.length > 0) {
      for (let i = 0; i < enc.radiologyResults.length; i++) {
        const rad = enc.radiologyResults[i];
        const radId =
          rad.id && !rad.id.startsWith("rad-")
            ? rad.id
            : `rad-${encounterId}-${i}-${Date.now().toString(36)}`;
        db.insert(radiologyResults)
          .values({
            id: radId,
            encounterId,
            examCode: rad.examCode,
            examName: rad.examName || rad.examCode,
            modality: rad.modality || "CR",
            findings: rad.findings || "-",
            conclusion: rad.conclusion || "-",
            radiologistName: rad.radiologistName || "dr. Radiologi, Sp.Rad",
            resultDate: rad.resultDate || now,
          })
          .run();
      }
    }

    // 9. Insert Sync Logs
    if (enc.syncBreakdown && enc.syncBreakdown.length > 0) {
      for (let i = 0; i < enc.syncBreakdown.length; i++) {
        const sb = enc.syncBreakdown[i];
        db.insert(satusehatSyncLogs)
          .values({
            id: `sync-${encounterId}-${i}-${Date.now().toString(36)}`,
            encounterId,
            resourceType: sb.resourceType,
            label: sb.label,
            category: sb.category || null,
            standard: sb.standard || "HL7 FHIR R4",
            status: sb.status || "synced",
            httpStatus: sb.httpStatus || 201,
            fhirId: sb.fhirId || null,
            errorMessage: sb.errorMessage || null,
            retryCount: sb.retryCount || 0,
            lastAttempt: sb.lastAttempt || now,
            details: sb.details ? JSON.stringify(sb.details) : null,
          })
          .run();
      }
    }

    // 10. Insert Medical Addendums (if any)
    if (enc.addendums && enc.addendums.length > 0) {
      for (let i = 0; i < enc.addendums.length; i++) {
        const ad = enc.addendums[i];
        const adId =
          ad.id && !ad.id.startsWith("add-")
            ? ad.id
            : `add-${encounterId}-${i}-${Date.now().toString(36)}`;
        db.insert(medicalAddendums)
          .values({
            id: adId,
            encounterId,
            timestamp: ad.timestamp || now,
            authorName: ad.authorName,
            authorRole: ad.authorRole,
            noteText: ad.noteText,
          })
          .run();
      }
    }

    // 11. Update Patient Last Visit Metadata
    const primaryDiag = enc.diagnoses?.find((d) => d.type === "primary");
    const visitDatePart = (enc.visitDate || now).split("T")[0];
    db.update(patients)
      .set({
        lastVisitDate: visitDatePart,
        lastVisitDepartment: enc.clinicDepartment || "Poli Umum",
        lastVisitDoctor: enc.doctorName || "dr. Dokter Pemeriksa",
        lastVisitDiagnosis: primaryDiag
          ? `${primaryDiag.patientFriendlyName} (${primaryDiag.code})`
          : undefined,
        totalVisitsCount: sql`total_visits_count + 1`,
        updatedAt: now,
      })
      .where(eq(patients.id, patientId))
      .run();

    InvalidationService.invalidateEncounter(encounterId, patientId);
    return this.getById(encounterId)!;
  },

  addAddendum(
    encounterId: string,
    addendum: { authorName: string; authorRole: string; noteText: string }
  ): MedicalAddendum | null {
    const now = new Date().toISOString();
    const id = `add-${encounterId}-${Date.now().toString(36)}`;
    db.insert(medicalAddendums)
      .values({
        id,
        encounterId,
        timestamp: now,
        authorName: addendum.authorName,
        authorRole: addendum.authorRole,
        noteText: addendum.noteText,
      })
      .run();

    InvalidationService.invalidateEncounter(encounterId);

    return {
      id,
      timestamp: now,
      authorName: addendum.authorName,
      authorRole: addendum.authorRole,
      noteText: addendum.noteText,
    };
  },

  update(id: string, partial: Partial<OutpatientEncounter>): OutpatientEncounter | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const valuesToUpdate: Partial<typeof encounters.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (partial.satusehatEncounterId !== undefined)
      valuesToUpdate.satusehatEncounterId = partial.satusehatEncounterId;
    if (partial.syncStatus !== undefined) valuesToUpdate.syncStatus = partial.syncStatus;
    if (partial.syncedAt !== undefined) valuesToUpdate.syncedAt = partial.syncedAt;
    if (partial.encounterStatus !== undefined)
      valuesToUpdate.encounterStatus = partial.encounterStatus;
    if (partial.isLocked !== undefined) valuesToUpdate.isLocked = Boolean(partial.isLocked);
    if (partial.lockedAt !== undefined) valuesToUpdate.lockedAt = partial.lockedAt;
    if (partial.lockedBy !== undefined) valuesToUpdate.lockedBy = partial.lockedBy;

    db.update(encounters).set(valuesToUpdate).where(eq(encounters.id, id)).run();

    // Handle diagnostic orders if provided
    if (partial.diagnosticOrders && partial.diagnosticOrders.length > 0) {
      const existingOrders = db
        .select()
        .from(diagnosticOrders)
        .where(eq(diagnosticOrders.encounterId, id))
        .all();
      const existingIds = new Set(existingOrders.map((o) => o.id));

      for (const ord of partial.diagnosticOrders) {
        if (!existingIds.has(ord.id)) {
          db.insert(diagnosticOrders)
            .values({
              id: ord.id,
              encounterId: id,
              testCode: ord.testCode,
              testName: ord.testName,
              category: ord.category,
              status: ord.status,
              priority: ord.priority,
              orderDate: ord.orderDate,
              doctorName: ord.doctorName,
              clinicalNotes: ord.clinicalNotes || null,
            })
            .run();
        }
      }
    }

    // Handle lab results if provided
    if (partial.labResults && partial.labResults.length > 0) {
      const existingLab = db
        .select()
        .from(labResults)
        .where(eq(labResults.encounterId, id))
        .all();
      const existingIds = new Set(existingLab.map((l) => l.id));

      for (const lr of partial.labResults) {
        if (!existingIds.has(lr.id)) {
          db.insert(labResults)
            .values({
              id: lr.id,
              encounterId: id,
              testCode: lr.testCode,
              testName: lr.testName,
              category: lr.category,
              value: String(lr.value),
              unit: lr.unit,
              referenceRange: lr.referenceRange,
              flag: lr.flag,
              resultDate: lr.resultDate,
              performer: lr.performer,
              notes: lr.notes || null,
            })
            .run();
        }
      }
    }

    // Handle radiology results if provided
    if (partial.radiologyResults && partial.radiologyResults.length > 0) {
      const existingRad = db
        .select()
        .from(radiologyResults)
        .where(eq(radiologyResults.encounterId, id))
        .all();
      const existingIds = new Set(existingRad.map((r) => r.id));

      for (const rad of partial.radiologyResults) {
        if (!existingIds.has(rad.id)) {
          db.insert(radiologyResults)
            .values({
              id: rad.id,
              encounterId: id,
              examCode: rad.examCode,
              examName: rad.examName,
              modality: rad.modality,
              findings: rad.findings,
              conclusion: rad.conclusion,
              radiologistName: rad.radiologistName,
              resultDate: rad.resultDate,
            })
            .run();
        }
      }
    }

    InvalidationService.invalidateEncounter(id, existing.patientId);
    return this.getById(id);
  },

  lock(id: string, lockedBy: string): OutpatientEncounter | null {
    const now = new Date().toISOString();
    return this.update(id, {
      isLocked: true,
      lockedAt: now,
      lockedBy,
    });
  },
};
