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
  departments,
  users,
  facilities,
} from "../schema";
import { eq, desc, sql, inArray, and } from "drizzle-orm";
import { MemoryCache, CACHE_CONFIG, InvalidationService } from "@/lib/cache";
import { generatePrefixedId, getLocalDateString } from "@/lib/id-generator";
import { getNextRegistrationNumber } from "../sequence";
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

async function buildEncounter(row: typeof encounters.$inferSelect): Promise<OutpatientEncounter> {
  const encounterId = row.id;

  // Run child queries concurrently
  const [
    vitRows,
    diagRows,
    procRows,
    rxRows,
    orderRows,
    labRows,
    radRows,
    syncRows,
    addendumRows,
  ] = await Promise.all([
    db.select().from(vitals).where(eq(vitals.encounterId, encounterId)).limit(1),
    db.select().from(diagnoses).where(eq(diagnoses.encounterId, encounterId)),
    db.select().from(procedures).where(eq(procedures.encounterId, encounterId)),
    db.select().from(prescriptions).where(eq(prescriptions.encounterId, encounterId)),
    db.select().from(diagnosticOrders).where(eq(diagnosticOrders.encounterId, encounterId)),
    db.select().from(labResults).where(eq(labResults.encounterId, encounterId)),
    db.select().from(radiologyResults).where(eq(radiologyResults.encounterId, encounterId)),
    db.select().from(satusehatSyncLogs).where(eq(satusehatSyncLogs.encounterId, encounterId)),
    db.select().from(medicalAddendums).where(eq(medicalAddendums.encounterId, encounterId)),
  ]);

  const vitRow = vitRows[0];
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
        satusehatBpId: vitRow.satusehatBpId || undefined,
        satusehatHrId: vitRow.satusehatHrId || undefined,
        satusehatTempId: vitRow.satusehatTempId || undefined,
        satusehatRrId: vitRow.satusehatRrId || undefined,
        satusehatSpo2Id: vitRow.satusehatSpo2Id || undefined,
        satusehatWeightId: vitRow.satusehatWeightId || undefined,
        satusehatHeightId: vitRow.satusehatHeightId || undefined,
        satusehatBmiId: vitRow.satusehatBmiId || undefined,
      }
    : undefined;

  const diagnosesData: DiagnosisItem[] = diagRows.map((d: typeof diagnoses.$inferSelect) => ({
    id: d.id,
    type: d.type as "primary" | "secondary",
    code: d.code,
    display: d.display,
    patientFriendlyName: d.patientFriendlyName,
    system: d.system || "http://hl7.org/fhir/sid/icd-10",
    clinicalStatus: (d.clinicalStatus as DiagnosisItem["clinicalStatus"]) || "active",
    satusehatConditionId: d.satusehatConditionId || undefined,
  }));

  const proceduresData: ProcedureItem[] = procRows.map((p: typeof procedures.$inferSelect) => ({
    id: p.id,
    code: p.code,
    display: p.display,
    category: p.category,
    notes: p.notes || undefined,
    satusehatProcedureId: p.satusehatProcedureId || undefined,
  }));

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
    satusehatMedicationRequestId: rx.satusehatMedicationRequestId || undefined,
    satusehatMedicationId: rx.satusehatMedicationId || undefined,
  }));

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
    satusehatServiceRequestId: o.satusehatServiceRequestId || undefined,
  }));

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
    satusehatObservationId: lr.satusehatObservationId || undefined,
    satusehatDiagnosticReportId: lr.satusehatDiagnosticReportId || undefined,
  }));

  const radiologyResultsData: RadiologyResult[] = radRows.map((rad: typeof radiologyResults.$inferSelect) => ({
    id: rad.id,
    examCode: rad.examCode,
    examName: rad.examName,
    modality: rad.modality as RadiologyResult["modality"],
    findings: rad.findings,
    conclusion: rad.conclusion,
    radiologistName: rad.radiologistName,
    resultDate: rad.resultDate,
    satusehatObservationId: rad.satusehatObservationId || undefined,
    satusehatDiagnosticReportId: rad.satusehatDiagnosticReportId || undefined,
  }));

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
    facilityId: row.facilityId || undefined,
    departmentId: row.departmentId || undefined,
    doctorId: row.doctorId || undefined,
    satusehatEncounterId: row.satusehatEncounterId || undefined,
    visitDate: row.visitDate,
    clinicDepartment: row.clinicDepartment,
    doctorName: row.doctorName,
    doctorSip: row.doctorSip,
    doctorIhsId: row.doctorIhsId || undefined,
    hospitalName: process.env.NEXT_PUBLIC_HOSPITAL_NAME || "RS Umum Daerah Sehat Sejahtera",
    hospitalOrgId: process.env.SATUSEHAT_ORG_ID || "b15a7ae7-f366-4a84-8385-0b8196c05002",
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
    registrationNumber: row.registrationNumber || undefined,
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
 * High-Performance Batch Eager Loading for multiple encounters
 */
async function buildEncountersBatch(encounterRows: (typeof encounters.$inferSelect)[]): Promise<OutpatientEncounter[]> {
  if (!encounterRows || encounterRows.length === 0) return [];
  if (encounterRows.length === 1) return [await buildEncounter(encounterRows[0])];

  const encounterIds = encounterRows.map((r) => r.id);

  // Run 9 batch queries concurrently using inArray
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
  ] = await Promise.all([
    db.select().from(vitals).where(inArray(vitals.encounterId, encounterIds)),
    db.select().from(diagnoses).where(inArray(diagnoses.encounterId, encounterIds)),
    db.select().from(procedures).where(inArray(procedures.encounterId, encounterIds)),
    db.select().from(prescriptions).where(inArray(prescriptions.encounterId, encounterIds)),
    db.select().from(diagnosticOrders).where(inArray(diagnosticOrders.encounterId, encounterIds)),
    db.select().from(labResults).where(inArray(labResults.encounterId, encounterIds)),
    db.select().from(radiologyResults).where(inArray(radiologyResults.encounterId, encounterIds)),
    db.select().from(satusehatSyncLogs).where(inArray(satusehatSyncLogs.encounterId, encounterIds)),
    db.select().from(medicalAddendums).where(inArray(medicalAddendums.encounterId, encounterIds)),
  ]);

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
      satusehatBpId: vitRow.satusehatBpId || undefined,
      satusehatHrId: vitRow.satusehatHrId || undefined,
      satusehatTempId: vitRow.satusehatTempId || undefined,
      satusehatRrId: vitRow.satusehatRrId || undefined,
      satusehatSpo2Id: vitRow.satusehatSpo2Id || undefined,
      satusehatWeightId: vitRow.satusehatWeightId || undefined,
      satusehatHeightId: vitRow.satusehatHeightId || undefined,
      satusehatBmiId: vitRow.satusehatBmiId || undefined,
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
      satusehatConditionId: d.satusehatConditionId || undefined,
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
      satusehatProcedureId: p.satusehatProcedureId || undefined,
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
      satusehatMedicationRequestId: rx.satusehatMedicationRequestId || undefined,
      satusehatMedicationId: rx.satusehatMedicationId || undefined,
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
      satusehatServiceRequestId: o.satusehatServiceRequestId || undefined,
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
      satusehatObservationId: lr.satusehatObservationId || undefined,
      satusehatDiagnosticReportId: lr.satusehatDiagnosticReportId || undefined,
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
      satusehatObservationId: rad.satusehatObservationId || undefined,
      satusehatDiagnosticReportId: rad.satusehatDiagnosticReportId || undefined,
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

  // Construct OutpatientEncounter objects in memory
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
      facilityId: row.facilityId || undefined,
      departmentId: row.departmentId || undefined,
      doctorId: row.doctorId || undefined,
      satusehatEncounterId: row.satusehatEncounterId || undefined,
      visitDate: row.visitDate,
      clinicDepartment: row.clinicDepartment,
      doctorName: row.doctorName,
      doctorSip: row.doctorSip,
      doctorIhsId: row.doctorIhsId || undefined,
      hospitalName: process.env.NEXT_PUBLIC_HOSPITAL_NAME || "RS Umum Daerah Sehat Sejahtera",
      hospitalOrgId: process.env.SATUSEHAT_ORG_ID || "b15a7ae7-f366-4a84-8385-0b8196c05002",
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
      registrationNumber: row.registrationNumber || undefined,
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
  async getAll(): Promise<OutpatientEncounter[]> {
    return MemoryCache.getOrSetAsync(
      CACHE_CONFIG.KEYS.ENCOUNTER_ALL,
      async () => {
        const rows = await db.select().from(encounters).orderBy(desc(encounters.visitDate));
        return await buildEncountersBatch(rows);
      },
      CACHE_CONFIG.TTL.MEDIUM
    );
  },

  async getById(id: string): Promise<OutpatientEncounter | null> {
    if (!id) return null;
    return MemoryCache.getOrSetAsync(
      CACHE_CONFIG.KEYS.ENCOUNTER_SINGLE(id),
      async () => {
        const rows = await db.select().from(encounters).where(eq(encounters.id, id)).limit(1);
        return rows[0] ? await buildEncounter(rows[0]) : null;
      },
      CACHE_CONFIG.TTL.MEDIUM
    );
  },

  async getByPatientId(patientId: string): Promise<OutpatientEncounter[]> {
    if (!patientId) return [];
    return MemoryCache.getOrSetAsync(
      CACHE_CONFIG.KEYS.ENCOUNTER_PATIENT(patientId),
      async () => {
        const rows = await db
          .select()
          .from(encounters)
          .where(eq(encounters.patientId, patientId))
          .orderBy(desc(encounters.visitDate));
        return await buildEncountersBatch(rows);
      },
      CACHE_CONFIG.TTL.MEDIUM
    );
  },

  async create(enc: OutpatientEncounter, patientId: string): Promise<OutpatientEncounter> {
    const encounterId = enc.id || generatePrefixedId("enc_");
    const now = new Date().toISOString();

    const existingRows = await db.select().from(encounters).where(eq(encounters.id, encounterId)).limit(1);
    const existing = existingRows[0];

    // 1. Resolve facilityId strictly (from encounter -> existing encounter -> facilities table lookup by org/name -> active default)
    let resolvedFacilityId = enc.facilityId || existing?.facilityId || null;
    if (!resolvedFacilityId && (enc.hospitalOrgId || enc.hospitalName)) {
      if (enc.hospitalOrgId) {
        const facByOrg = await db
          .select({ id: facilities.id })
          .from(facilities)
          .where(eq(facilities.satusehatOrgId, enc.hospitalOrgId))
          .limit(1);
        if (facByOrg.length > 0) resolvedFacilityId = facByOrg[0].id;
      }
      if (!resolvedFacilityId && enc.hospitalName) {
        const facByName = await db
          .select({ id: facilities.id })
          .from(facilities)
          .where(eq(facilities.name, enc.hospitalName))
          .limit(1);
        if (facByName.length > 0) resolvedFacilityId = facByName[0].id;
      }
    }
    if (!resolvedFacilityId) {
      const activeFac = await db
        .select({ id: facilities.id })
        .from(facilities)
        .where(eq(facilities.isActive, true))
        .limit(1);
      resolvedFacilityId = activeFac[0]?.id || null;
    }

    // 2. Resolve departmentId strictly within resolvedFacilityId
    let resolvedDepartmentId = enc.departmentId || existing?.departmentId || null;
    const targetDeptName = enc.clinicDepartment || existing?.clinicDepartment;
    if (!resolvedDepartmentId && targetDeptName && resolvedFacilityId) {
      const deptRows = await db
        .select({ id: departments.id })
        .from(departments)
        .where(
          and(
            eq(departments.name, targetDeptName),
            eq(departments.facilityId, resolvedFacilityId)
          )
        )
        .limit(1);
      if (deptRows.length > 0) {
        resolvedDepartmentId = deptRows[0].id;
      }
    }

    // 3. Resolve doctorId strictly within resolvedFacilityId and/or valid credentials
    let resolvedDoctorId = enc.doctorId || existing?.doctorId || null;
    const targetDocName = enc.doctorName || existing?.doctorName;
    if (!resolvedDoctorId && (targetDocName || enc.doctorSip || enc.doctorIhsId)) {
      if (targetDocName && resolvedFacilityId) {
        const docCleanName = targetDocName.split(" (")[0].trim();
        const userRows = await db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.name, docCleanName),
              eq(users.facilityId, resolvedFacilityId)
            )
          )
          .limit(1);
        if (userRows.length > 0) {
          resolvedDoctorId = userRows[0].id;
        }
      }
      if (!resolvedDoctorId && enc.doctorSip) {
        const userBySip = await db
          .select({ id: users.id })
          .from(users)
          .where(
            resolvedFacilityId
              ? and(eq(users.sip, enc.doctorSip), eq(users.facilityId, resolvedFacilityId))
              : eq(users.sip, enc.doctorSip)
          )
          .limit(1);
        if (userBySip.length > 0) {
          resolvedDoctorId = userBySip[0].id;
        }
      }
      if (!resolvedDoctorId && enc.doctorIhsId) {
        const userByIhs = await db
          .select({ id: users.id })
          .from(users)
          .where(
            resolvedFacilityId
              ? and(eq(users.ihsPractitionerId, enc.doctorIhsId), eq(users.facilityId, resolvedFacilityId))
              : eq(users.ihsPractitionerId, enc.doctorIhsId)
          )
          .limit(1);
        if (userByIhs.length > 0) {
          resolvedDoctorId = userByIhs[0].id;
        }
      }
    }

    const regNumToUse =
      enc.registrationNumber ||
      existing?.registrationNumber ||
      (await getNextRegistrationNumber(enc.visitDate || now, "RJ"));

    // Wrap all writes in an atomic database transaction to prevent orphan records on partial failure
    await db.transaction(async (tx) => {
      if (existing) {
        // 1. Delete previous child rows for this encounter to ensure clean upsert
        await Promise.all([
          tx.delete(vitals).where(eq(vitals.encounterId, encounterId)),
          tx.delete(diagnoses).where(eq(diagnoses.encounterId, encounterId)),
          tx.delete(procedures).where(eq(procedures.encounterId, encounterId)),
          tx.delete(prescriptions).where(eq(prescriptions.encounterId, encounterId)),
          tx.delete(diagnosticOrders).where(eq(diagnosticOrders.encounterId, encounterId)),
          tx.delete(labResults).where(eq(labResults.encounterId, encounterId)),
          tx.delete(radiologyResults).where(eq(radiologyResults.encounterId, encounterId)),
          tx.delete(satusehatSyncLogs).where(eq(satusehatSyncLogs.encounterId, encounterId)),
          enc.addendums && enc.addendums.length > 0
            ? tx.delete(medicalAddendums).where(eq(medicalAddendums.encounterId, encounterId))
            : Promise.resolve(),
        ]);

        // 2. Update Encounter Master
        await tx
          .update(encounters)
          .set({
            patientId,
            facilityId: resolvedFacilityId,
            departmentId: resolvedDepartmentId,
            doctorId: resolvedDoctorId,
            satusehatEncounterId:
              enc.satusehatEncounterId !== undefined
                ? enc.satusehatEncounterId
                : existing.satusehatEncounterId,
            visitDate: enc.visitDate || existing.visitDate,
            clinicDepartment: enc.clinicDepartment || existing.clinicDepartment,
            doctorName: enc.doctorName || existing.doctorName,
            doctorSip: enc.doctorSip || existing.doctorSip,
            doctorIhsId: enc.doctorIhsId || existing.doctorIhsId,
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
            registrationNumber:
              enc.registrationNumber !== undefined ? enc.registrationNumber : existing.registrationNumber,
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
          .where(eq(encounters.id, encounterId));
      } else {
        // Insert fresh master row
        await tx.insert(encounters).values({
          id: encounterId,
          patientId,
          facilityId: resolvedFacilityId,
          departmentId: resolvedDepartmentId,
          doctorId: resolvedDoctorId,
          satusehatEncounterId: enc.satusehatEncounterId || null,
          visitDate: enc.visitDate || now,
          clinicDepartment: enc.clinicDepartment || "Poli Umum",
          doctorName: enc.doctorName || "dr. Dokter Pemeriksa",
          doctorSip: enc.doctorSip || "SIP-DEFAULT-01",
          doctorIhsId: enc.doctorIhsId || "N10009841",
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
          registrationNumber: regNumToUse,
          consentStatus: enc.consentStatus || "opt-in",
          syncStatus: enc.syncStatus || "synced",
          syncedAt: enc.syncedAt || now,
          isLocked: Boolean(enc.isLocked),
          lockedAt: enc.lockedAt || null,
          lockedBy: enc.lockedBy || null,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Insert Vitals
      if (enc.vitals) {
        await tx.insert(vitals).values({
          id: generatePrefixedId("vit_"),
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
          satusehatBpId: enc.vitals.satusehatBpId || null,
          satusehatHrId: enc.vitals.satusehatHrId || null,
          satusehatTempId: enc.vitals.satusehatTempId || null,
          satusehatRrId: enc.vitals.satusehatRrId || null,
          satusehatSpo2Id: enc.vitals.satusehatSpo2Id || null,
          satusehatWeightId: enc.vitals.satusehatWeightId || null,
          satusehatHeightId: enc.vitals.satusehatHeightId || null,
          satusehatBmiId: enc.vitals.satusehatBmiId || null,
        });
      }

      // Insert Diagnoses
      if (enc.diagnoses && enc.diagnoses.length > 0) {
        for (let i = 0; i < enc.diagnoses.length; i++) {
          const d = enc.diagnoses[i];
          const diagId =
            d.id && !d.id.startsWith("diag-") && !d.id.startsWith("diag_")
              ? d.id
              : generatePrefixedId("diag_");
          await tx.insert(diagnoses).values({
            id: diagId,
            encounterId,
            type: d.type || "primary",
            code: d.code,
            display: d.display || d.code,
            patientFriendlyName: d.patientFriendlyName || d.display || d.code,
            system: d.system || "http://hl7.org/fhir/sid/icd-10",
            clinicalStatus: d.clinicalStatus || "active",
            satusehatConditionId: d.satusehatConditionId || null,
          });
        }
      }

      // Insert Procedures
      if (enc.procedures && enc.procedures.length > 0) {
        for (let i = 0; i < enc.procedures.length; i++) {
          const p = enc.procedures[i];
          const procId =
            p.id && !p.id.startsWith("proc-") && !p.id.startsWith("proc_")
              ? p.id
              : generatePrefixedId("proc_");
          await tx.insert(procedures).values({
            id: procId,
            encounterId,
            code: p.code,
            display: p.display || p.code,
            category: p.category || "Tindakan Medis",
            notes: p.notes || null,
            satusehatProcedureId: p.satusehatProcedureId || null,
          });
        }
      }

      // Insert Prescriptions
      if (enc.prescriptions && enc.prescriptions.length > 0) {
        for (let i = 0; i < enc.prescriptions.length; i++) {
          const rx = enc.prescriptions[i];
          const rxId =
            rx.id && !rx.id.startsWith("rx-") && !rx.id.startsWith("rx_")
              ? rx.id
              : generatePrefixedId("rx_");
          await tx.insert(prescriptions).values({
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
            satusehatMedicationRequestId: rx.satusehatMedicationRequestId || null,
            satusehatMedicationId: rx.satusehatMedicationId || null,
          });
        }
      }

      // Insert Diagnostic Orders
      if (enc.diagnosticOrders && enc.diagnosticOrders.length > 0) {
        for (let i = 0; i < enc.diagnosticOrders.length; i++) {
          const o = enc.diagnosticOrders[i];
          const ordId =
            o.id && !o.id.startsWith("ord-") && !o.id.startsWith("ord_")
              ? o.id
              : generatePrefixedId("ord_");
          await tx.insert(diagnosticOrders).values({
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
            satusehatServiceRequestId: o.satusehatServiceRequestId || null,
          });
        }
      }

      // Insert Lab Results
      if (enc.labResults && enc.labResults.length > 0) {
        for (let i = 0; i < enc.labResults.length; i++) {
          const lr = enc.labResults[i];
          const labId =
            lr.id && !lr.id.startsWith("lab-") && !lr.id.startsWith("lab_")
              ? lr.id
              : generatePrefixedId("lab_");
          await tx.insert(labResults).values({
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
            satusehatObservationId: lr.satusehatObservationId || null,
            satusehatDiagnosticReportId: lr.satusehatDiagnosticReportId || null,
          });
        }
      }

      // Insert Radiology Results
      if (enc.radiologyResults && enc.radiologyResults.length > 0) {
        for (let i = 0; i < enc.radiologyResults.length; i++) {
          const rad = enc.radiologyResults[i];
          const radId =
            rad.id && !rad.id.startsWith("rad-") && !rad.id.startsWith("rad_")
              ? rad.id
              : generatePrefixedId("rad_");
          await tx.insert(radiologyResults).values({
            id: radId,
            encounterId,
            examCode: rad.examCode,
            examName: rad.examName || rad.examCode,
            modality: rad.modality || "CR",
            findings: rad.findings || "-",
            conclusion: rad.conclusion || "-",
            radiologistName: rad.radiologistName || "dr. Radiologi, Sp.Rad",
            resultDate: rad.resultDate || now,
            satusehatObservationId: rad.satusehatObservationId || null,
            satusehatDiagnosticReportId: rad.satusehatDiagnosticReportId || null,
          });
        }
      }

      // Insert Sync Logs
      if (enc.syncBreakdown && enc.syncBreakdown.length > 0) {
        for (let i = 0; i < enc.syncBreakdown.length; i++) {
          const sb = enc.syncBreakdown[i];
          await tx.insert(satusehatSyncLogs).values({
            id: generatePrefixedId("sync_"),
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
          });
        }
      }

      // Insert Medical Addendums (if any)
      if (enc.addendums && enc.addendums.length > 0) {
        for (let i = 0; i < enc.addendums.length; i++) {
          const ad = enc.addendums[i];
          const adId =
            ad.id && !ad.id.startsWith("add-") && !ad.id.startsWith("add_")
              ? ad.id
              : generatePrefixedId("add_");
          await tx.insert(medicalAddendums).values({
            id: adId,
            encounterId,
            timestamp: ad.timestamp || now,
            authorName: ad.authorName,
            authorRole: ad.authorRole,
            noteText: ad.noteText,
          });
        }
      }

      // Update Patient Last Visit Metadata
      const primaryDiag = enc.diagnoses?.find((d) => d.type === "primary");
      const visitDatePart = getLocalDateString(enc.visitDate || now);
      await tx
        .update(patients)
        .set({
          lastVisitDate: visitDatePart,
          lastVisitDepartment: enc.clinicDepartment || "Poli Umum",
          lastVisitDoctor: enc.doctorName || "dr. Dokter Pemeriksa",
          lastVisitDiagnosis: primaryDiag
            ? `${primaryDiag.patientFriendlyName} (${primaryDiag.code})`
            : undefined,
          totalVisitsCount: sql`(SELECT COUNT(*)::int FROM encounters WHERE encounters.patient_id = ${patientId})`,
          updatedAt: now,
        })
        .where(eq(patients.id, patientId));
    });

    InvalidationService.invalidateEncounter(encounterId, patientId);
    const result = await this.getById(encounterId);
    return result!;
  },

  async addAddendum(
    encounterId: string,
    addendum: { authorName: string; authorRole: string; noteText: string }
  ): Promise<MedicalAddendum | null> {
    const now = new Date().toISOString();
    const id = generatePrefixedId("add_");
    await db.insert(medicalAddendums).values({
      id,
      encounterId,
      timestamp: now,
      authorName: addendum.authorName,
      authorRole: addendum.authorRole,
      noteText: addendum.noteText,
    });

    InvalidationService.invalidateEncounter(encounterId);

    return {
      id,
      timestamp: now,
      authorName: addendum.authorName,
      authorRole: addendum.authorRole,
      noteText: addendum.noteText,
    };
  },

  async update(id: string, partial: Partial<OutpatientEncounter>): Promise<OutpatientEncounter | null> {
    const existing = await this.getById(id);
    if (!existing) {
      if (partial.patientId) {
        return await this.create(
          { ...partial, id } as OutpatientEncounter,
          partial.patientId
        );
      }
      return null;
    }

    const valuesToUpdate: Partial<typeof encounters.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (partial.facilityId !== undefined) valuesToUpdate.facilityId = partial.facilityId;
    if (partial.departmentId !== undefined) valuesToUpdate.departmentId = partial.departmentId;
    if (partial.doctorId !== undefined) valuesToUpdate.doctorId = partial.doctorId;
    if (partial.satusehatEncounterId !== undefined)
      valuesToUpdate.satusehatEncounterId = partial.satusehatEncounterId;
    if (partial.syncStatus !== undefined) valuesToUpdate.syncStatus = partial.syncStatus;
    if (partial.syncedAt !== undefined) valuesToUpdate.syncedAt = partial.syncedAt;
    if (partial.encounterStatus !== undefined)
      valuesToUpdate.encounterStatus = partial.encounterStatus;
    if (partial.isLocked !== undefined) valuesToUpdate.isLocked = Boolean(partial.isLocked);
    if (partial.lockedAt !== undefined) valuesToUpdate.lockedAt = partial.lockedAt;
    if (partial.lockedBy !== undefined) valuesToUpdate.lockedBy = partial.lockedBy;

    await db.update(encounters).set(valuesToUpdate).where(eq(encounters.id, id));

    // Handle diagnostic orders if provided
    if (partial.diagnosticOrders && partial.diagnosticOrders.length > 0) {
      const existingOrders = await db
        .select()
        .from(diagnosticOrders)
        .where(eq(diagnosticOrders.encounterId, id));
      const existingIds = new Set(existingOrders.map((o) => o.id));

      for (const ord of partial.diagnosticOrders) {
        if (!existingIds.has(ord.id)) {
          await db.insert(diagnosticOrders).values({
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
            satusehatServiceRequestId: ord.satusehatServiceRequestId || null,
          });
        } else {
          await db
            .update(diagnosticOrders)
            .set({
              testCode: ord.testCode,
              testName: ord.testName,
              category: ord.category,
              status: ord.status,
              priority: ord.priority,
              clinicalNotes: ord.clinicalNotes || null,
              satusehatServiceRequestId: ord.satusehatServiceRequestId || undefined,
            })
            .where(eq(diagnosticOrders.id, ord.id));
        }
      }
    }

    // Handle lab results if provided
    if (partial.labResults && partial.labResults.length > 0) {
      const existingLab = await db
        .select()
        .from(labResults)
        .where(eq(labResults.encounterId, id));
      const existingIds = new Set(existingLab.map((l) => l.id));

      for (const lr of partial.labResults) {
        if (!existingIds.has(lr.id)) {
          await db.insert(labResults).values({
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
            satusehatObservationId: lr.satusehatObservationId || null,
            satusehatDiagnosticReportId: lr.satusehatDiagnosticReportId || null,
          });
        } else {
          await db
            .update(labResults)
            .set({
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
              satusehatObservationId: lr.satusehatObservationId || undefined,
              satusehatDiagnosticReportId: lr.satusehatDiagnosticReportId || undefined,
            })
            .where(eq(labResults.id, lr.id));
        }
      }
    }

    // Handle radiology results if provided
    if (partial.radiologyResults && partial.radiologyResults.length > 0) {
      const existingRad = await db
        .select()
        .from(radiologyResults)
        .where(eq(radiologyResults.encounterId, id));
      const existingIds = new Set(existingRad.map((r) => r.id));

      for (const rad of partial.radiologyResults) {
        if (!existingIds.has(rad.id)) {
          await db.insert(radiologyResults).values({
            id: rad.id,
            encounterId: id,
            examCode: rad.examCode,
            examName: rad.examName,
            modality: rad.modality,
            findings: rad.findings,
            conclusion: rad.conclusion,
            radiologistName: rad.radiologistName,
            resultDate: rad.resultDate,
            satusehatObservationId: rad.satusehatObservationId || null,
            satusehatDiagnosticReportId: rad.satusehatDiagnosticReportId || null,
          });
        } else {
          await db
            .update(radiologyResults)
            .set({
              examCode: rad.examCode,
              examName: rad.examName,
              modality: rad.modality,
              findings: rad.findings,
              conclusion: rad.conclusion,
              radiologistName: rad.radiologistName,
              resultDate: rad.resultDate,
              satusehatObservationId: rad.satusehatObservationId || undefined,
              satusehatDiagnosticReportId: rad.satusehatDiagnosticReportId || undefined,
            })
            .where(eq(radiologyResults.id, rad.id));
        }
      }
    }

    // Handle addendums if provided (append-only immutability Permenkes 24/2022)
    if (partial.addendums && partial.addendums.length > 0) {
      const existingAddendums = await db
        .select()
        .from(medicalAddendums)
        .where(eq(medicalAddendums.encounterId, id));
      const existingIds = new Set(existingAddendums.map((a) => a.id));

      for (const add of partial.addendums) {
        if (!existingIds.has(add.id)) {
          await db.insert(medicalAddendums).values({
            id: add.id || generatePrefixedId("add_"),
            encounterId: id,
            timestamp: add.timestamp || new Date().toISOString(),
            authorName: add.authorName,
            authorRole: add.authorRole,
            noteText: add.noteText,
          });
        }
      }
    }

    InvalidationService.invalidateEncounter(id, existing.patientId);
    return await this.getById(id);
  },

  async lock(id: string, lockedBy: string): Promise<OutpatientEncounter | null> {
    const now = new Date().toISOString();
    return await this.update(id, {
      isLocked: true,
      lockedAt: now,
      lockedBy,
    });
  },
};
