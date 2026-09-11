import { OutpatientEncounter, PatientProfile, FhirConsent } from "./types";

export function generateFhirEncounter(
  patient: PatientProfile,
  encounter: OutpatientEncounter
) {
  const hospitalOrgId = encounter.hospitalOrgId || "10000004";
  const hospitalName = encounter.hospitalName || "RS Umum Daerah Sehat Sejahtera";
  const clinicDepartment = encounter.clinicDepartment || "Poli Umum";
  const visitDate = encounter.visitDate || new Date().toISOString();
  const encounterId = encounter.id || `ENC-${Date.now().toString(36)}`;

  return {
    resourceType: "Encounter",
    identifier: [
      {
        system: `http://sys-ids.kemkes.go.id/encounter/${hospitalOrgId}`,
        value: encounterId,
      },
    ],
    status: "finished",
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: "AMB",
      display: "ambulatory",
    },
    subject: {
      reference: `Patient/${patient.id}`,
      display: patient.name,
    },
    participant: [
      {
        type: [
          {
            coding: [
              {
                system:
                  "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                code: "ATND",
                display: "attender",
              },
            ],
          },
        ],
        individual: {
          reference: `Practitioner/${encounter.doctorIhsId || "N10009841"}`,
          display: encounter.doctorName || "dr. Dokter Pemeriksa",
        },
      },
    ],
    period: {
      start: visitDate,
      end: new Date(
        new Date(visitDate).getTime() + 45 * 60000
      ).toISOString(),
    },
    location: [
      {
        location: {
          reference: `Location/${hospitalOrgId}-${clinicDepartment.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          display: `Ruang Pelayanan ${clinicDepartment} - ${hospitalName}`,
        },
      },
    ],
    serviceProvider: {
      reference: `Organization/${hospitalOrgId}`,
      display: hospitalName,
    },
  };
}

export function generateFhirObservations(
  patient: PatientProfile,
  encounter: OutpatientEncounter
) {
  const encRef = encounter.satusehatEncounterId || encounter.id || "ENC-DEFAULT";
  const v = encounter.vitals || {
    systolic: 120,
    diastolic: 80,
    heartRate: 80,
    temperature: 36.5,
    respiratoryRate: 18,
    oxygenSaturation: 98,
    weightKg: 60,
    heightCm: 165,
  };
  const visitDate = encounter.visitDate || new Date().toISOString();
  const observations = [];

  // 1. Blood Pressure (Systolic & Diastolic)
  observations.push({
    resourceType: "Observation",
    status: "final",
    category: [
      {
        coding: [
          {
            system:
              "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "vital-signs",
            display: "Vital Signs",
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "85354-9",
          display: "Blood pressure panel with all children optional",
        },
      ],
    },
    subject: { reference: `Patient/${patient.id}`, display: patient.name },
    encounter: { reference: `Encounter/${encRef}` },
    effectiveDateTime: encounter.visitDate,
    component: [
      {
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "8480-6",
              display: "Systolic blood pressure",
            },
          ],
        },
        valueQuantity: {
          value: v.systolic,
          unit: "mm[Hg]",
          system: "http://unitsofmeasure.org",
          code: "mm[Hg]",
        },
      },
      {
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "8462-4",
              display: "Diastolic blood pressure",
            },
          ],
        },
        valueQuantity: {
          value: v.diastolic,
          unit: "mm[Hg]",
          system: "http://unitsofmeasure.org",
          code: "mm[Hg]",
        },
      },
    ],
  });

  // 2. Heart Rate
  observations.push({
    resourceType: "Observation",
    status: "final",
    category: [
      {
        coding: [
          {
            system:
              "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "vital-signs",
            display: "Vital Signs",
          },
        ],
      },
    ],
    code: {
      coding: [
        { system: "http://loinc.org", code: "8867-4", display: "Heart rate" },
      ],
    },
    subject: { reference: `Patient/${patient.id}` },
    encounter: { reference: `Encounter/${encRef}` },
    effectiveDateTime: encounter.visitDate,
    valueQuantity: {
      value: v.heartRate,
      unit: "beats/minute",
      system: "http://unitsofmeasure.org",
      code: "/min",
    },
  });

  // 3. Body Temperature
  observations.push({
    resourceType: "Observation",
    status: "final",
    category: [
      {
        coding: [
          {
            system:
              "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "vital-signs",
            display: "Vital Signs",
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "8310-5",
          display: "Body temperature",
        },
      ],
    },
    subject: { reference: `Patient/${patient.id}` },
    encounter: { reference: `Encounter/${encRef}` },
    effectiveDateTime: encounter.visitDate,
    valueQuantity: {
      value: v.temperature,
      unit: "C",
      system: "http://unitsofmeasure.org",
      code: "Cel",
    },
  });

  // 4. Oxygen Saturation (SpO2)
  observations.push({
    resourceType: "Observation",
    status: "final",
    category: [
      {
        coding: [
          {
            system:
              "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "vital-signs",
            display: "Vital Signs",
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "59408-5",
          display: "Oxygen saturation in Arterial blood by Pulse oximetry",
        },
      ],
    },
    subject: { reference: `Patient/${patient.id}` },
    encounter: { reference: `Encounter/${encRef}` },
    effectiveDateTime: encounter.visitDate,
    valueQuantity: {
      value: v.oxygenSaturation,
      unit: "%",
      system: "http://unitsofmeasure.org",
      code: "%",
    },
  });

  // 5. Respiratory Rate (Laju Pernapasan)
  if (v.respiratoryRate) {
    observations.push({
      resourceType: "Observation",
      status: "final",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "vital-signs",
              display: "Vital Signs",
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "9279-1",
            display: "Respiratory rate",
          },
        ],
      },
      subject: { reference: `Patient/${patient.id}` },
      encounter: { reference: `Encounter/${encRef}` },
      effectiveDateTime: encounter.visitDate,
      valueQuantity: {
        value: v.respiratoryRate,
        unit: "breaths/minute",
        system: "http://unitsofmeasure.org",
        code: "/min",
      },
    });
  }

  // 6. Body Weight (Berat Badan)
  if (v.weightKg) {
    observations.push({
      resourceType: "Observation",
      status: "final",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "vital-signs",
              display: "Vital Signs",
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "29463-7",
            display: "Body weight",
          },
        ],
      },
      subject: { reference: `Patient/${patient.id}` },
      encounter: { reference: `Encounter/${encRef}` },
      effectiveDateTime: encounter.visitDate,
      valueQuantity: {
        value: v.weightKg,
        unit: "kg",
        system: "http://unitsofmeasure.org",
        code: "kg",
      },
    });
  }

  // 7. Body Height (Tinggi Badan)
  if (v.heightCm) {
    observations.push({
      resourceType: "Observation",
      status: "final",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "vital-signs",
              display: "Vital Signs",
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "8302-2",
            display: "Body height",
          },
        ],
      },
      subject: { reference: `Patient/${patient.id}` },
      encounter: { reference: `Encounter/${encRef}` },
      effectiveDateTime: encounter.visitDate,
      valueQuantity: {
        value: v.heightCm,
        unit: "cm",
        system: "http://unitsofmeasure.org",
        code: "cm",
      },
    });
  }

  // 8. Body Mass Index (BMI)
  if (v.bmi || (v.weightKg && v.heightCm)) {
    const bmiVal = v.bmi || Number((v.weightKg / Math.pow(v.heightCm / 100, 2)).toFixed(1));
    observations.push({
      resourceType: "Observation",
      status: "final",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "vital-signs",
              display: "Vital Signs",
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "39156-5",
            display: "Body mass index (BMI) [Ratio]",
          },
        ],
      },
      subject: { reference: `Patient/${patient.id}` },
      encounter: { reference: `Encounter/${encRef}` },
      effectiveDateTime: encounter.visitDate,
      valueQuantity: {
        value: bmiVal,
        unit: "kg/m2",
        system: "http://unitsofmeasure.org",
        code: "kg/m2",
      },
    });
  }

  // 9. Laboratory Observations (LOINC)
  if (encounter.labResults && encounter.labResults.length > 0) {
    encounter.labResults.forEach((lab) => {
      const isNumeric = !isNaN(Number(lab.value));
      observations.push({
        resourceType: "Observation",
        status: "final",
        category: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/observation-category",
                code: "laboratory",
                display: "Laboratory",
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: lab.testCode || "11502-2",
              display: lab.testName,
            },
          ],
          text: lab.testName,
        },
        subject: { reference: `Patient/${patient.id}`, display: patient.name },
        encounter: { reference: `Encounter/${encRef}` },
        effectiveDateTime: lab.resultDate || encounter.visitDate,
        performer: [
          {
            display: lab.performer || `Analis Lab ${encounter.hospitalName}`,
          },
        ],
        ...(isNumeric
          ? {
              valueQuantity: {
                value: Number(lab.value),
                unit: lab.unit,
                system: "http://unitsofmeasure.org",
                code: lab.unit,
              },
            }
          : {
              valueString: lab.value,
            }),
        interpretation: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                code:
                  lab.flag === "high"
                    ? "H"
                    : lab.flag === "low"
                    ? "L"
                    : lab.flag === "critical"
                    ? "AA"
                    : "N",
                display:
                  lab.flag === "high"
                    ? "High"
                    : lab.flag === "low"
                    ? "Low"
                    : lab.flag === "critical"
                    ? "Critically Abnormal"
                    : "Normal",
              },
            ],
          },
        ],
        referenceRange: [
          {
            text: lab.referenceRange,
          },
        ],
      });
    });
  }

  return observations;
}

export function generateFhirConditions(
  patient: PatientProfile,
  encounter: OutpatientEncounter
) {
  const encRef = encounter.satusehatEncounterId || encounter.id || "ENC-DEFAULT";
  const diags = encounter.diagnoses && encounter.diagnoses.length > 0 ? encounter.diagnoses : [
    {
      type: "primary" as const,
      code: "I10",
      display: "Essential (primary) hypertension",
      patientFriendlyName: "Hipertensi Primer",
      clinicalStatus: "active" as const,
    }
  ];

  return diags.map((diag) => ({
    resourceType: "Condition",
    clinicalStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
          code: diag.clinicalStatus || "active",
          display: diag.clinicalStatus || "Active",
        },
      ],
    },
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/condition-category",
            code: "encounter-diagnosis",
            display: "Encounter Diagnosis",
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: "http://hl7.org/fhir/sid/icd-10",
          code: diag.code || "I10",
          display: diag.display || "Essential (primary) hypertension",
        },
      ],
    },
    subject: {
      reference: `Patient/${patient.id}`,
      display: patient.name,
    },
    encounter: {
      reference: `Encounter/${encRef}`,
    },
  }));
}

export function generateFhirProcedures(
  patient: PatientProfile,
  encounter: OutpatientEncounter
) {
  const encRef = encounter.satusehatEncounterId || encounter.id || "ENC-DEFAULT";
  const procs = encounter.procedures && encounter.procedures.length > 0 ? encounter.procedures : [
    {
      code: "89.07",
      display: "Consultation, described as comprehensive",
      category: "Konsultasi & Edukasi",
    }
  ];

  return procs.map((proc) => ({
    resourceType: "Procedure",
    status: "completed",
    category: {
      coding: [
        {
          system: "http://snomed.info/sct",
          code: "387713003",
          display: "Surgical procedure",
        },
      ],
    },
    code: {
      coding: [
        {
          system: "http://hl7.org/fhir/sid/icd-9-cm",
          code: proc.code || "89.07",
          display: proc.display || "Consultation, described as comprehensive",
        },
      ],
    },
    subject: {
      reference: `Patient/${patient.id}`,
      display: patient.name,
    },
    encounter: {
      reference: `Encounter/${encRef}`,
    },
    performedDateTime: encounter.visitDate || new Date().toISOString(),
    performer: [
      {
        actor: {
          reference: `Practitioner/${encounter.doctorIhsId || "N10009841"}`,
          display: encounter.doctorName || "dr. Dokter Pemeriksa",
        },
      },
    ],
  }));
}

export function generateFhirAllergyIntolerance(
  patient: PatientProfile
) {
  const allergies = patient.allergies && patient.allergies.length > 0 ? patient.allergies : ["Tidak ada riwayat alergi obat/makanan"];
  return allergies.map((allergy) => ({
    resourceType: "AllergyIntolerance",
    clinicalStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
          code: "active",
          display: "Active",
        },
      ],
    },
    verificationStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification",
          code: "confirmed",
          display: "Confirmed",
        },
      ],
    },
    category: ["medication"],
    code: {
      coding: [
        {
          system: "http://snomed.info/sct",
          code: "764146007",
          display: allergy,
        },
      ],
      text: allergy,
    },
    patient: {
      reference: `Patient/${patient.id}`,
      display: patient.name,
    },
  }));
}

export function generateFhirCarePlan(
  patient: PatientProfile,
  encounter: OutpatientEncounter
) {
  const encRef = encounter.satusehatEncounterId || encounter.id || "ENC-DEFAULT";
  const instruction = encounter.followUpPlan?.instruction || "Kontrol rutin bila keluhan berlanjut.";
  const nextVisitDate = encounter.followUpPlan?.nextVisitDate || new Date(Date.now() + 30 * 86400000).toISOString();

  return {
    resourceType: "CarePlan",
    status: "active",
    intent: "plan",
    title: "Rencana Tindak Lanjut Rawat Jalan",
    description: instruction,
    subject: {
      reference: `Patient/${patient.id}`,
      display: patient.name,
    },
    encounter: {
      reference: `Encounter/${encRef}`,
    },
    created: encounter.visitDate || new Date().toISOString(),
    author: {
      reference: `Practitioner/${encounter.doctorIhsId || "N10009841"}`,
      display: encounter.doctorName || "dr. Dokter Pemeriksa",
    },
    activity: [
      {
        detail: {
          kind: "Appointment",
          status: "scheduled",
          description: instruction,
          scheduledPeriod: {
            start: nextVisitDate,
          },
        },
      },
    ],
  };
}

export function generateFhirMedicationRequests(
  patient: PatientProfile,
  encounter: OutpatientEncounter
) {
  const encRef = encounter.satusehatEncounterId || encounter.id || "ENC-DEFAULT";
  const prescriptions = encounter.prescriptions && encounter.prescriptions.length > 0 ? encounter.prescriptions : [
    {
      id: "rx-default",
      kfaCode: "93000182",
      medicationName: "Amlodipine 5 mg Tablet",
      form: "Tablet",
      dosage: "5 mg",
      frequency: "1x1",
      timing: "Sesudah Makan" as const,
      quantity: 30,
      unit: "tablet",
      durationDays: 30,
      instructions: "Minum teratur tiap pagi",
    }
  ];

  return prescriptions.map((med) => ({
    resourceType: "MedicationRequest",
    status: "active",
    intent: "order",
    medicationCodeableConcept: {
      coding: [
        {
          system: "http://sys-ids.kemkes.go.id/kfa",
          code: med.kfaCode || "93000182",
          display: med.medicationName || "Amlodipine 5 mg Tablet",
        },
      ],
    },
    subject: {
      reference: `Patient/${patient.id}`,
      display: patient.name,
    },
    encounter: {
      reference: `Encounter/${encRef}`,
    },
    authoredOn: encounter.visitDate || new Date().toISOString(),
    dosageInstruction: [
      {
        text: `${med.frequency || "1x1"} - ${med.timing || "Sesudah Makan"}. ${med.instructions || ""}`,
      },
    ],
    dispenseRequest: {
      quantity: {
        value: med.quantity ?? 1,
        unit: med.unit || "tablet",
      },
      expectedSupplyDuration: {
        value: med.durationDays ?? 30,
        unit: "days",
      },
    },
  }));
}

export function generateFhirComposition(
  patient: PatientProfile,
  encounter: OutpatientEncounter
) {
  const encRef = encounter.satusehatEncounterId || encounter.id || "ENC-DEFAULT";
  const hospitalOrgId = encounter.hospitalOrgId || "10000004";
  const hospitalName = encounter.hospitalName || "RS Umum Daerah Sehat Sejahtera";
  const v = encounter.vitals || {
    systolic: 120,
    diastolic: 80,
    heartRate: 80,
    temperature: 36.5,
    oxygenSaturation: 98,
  };
  const primaryDiag = (encounter.diagnoses || []).find((d) => d.type === "primary")?.display || "Hipertensi Primer";
  const proceduresText = (encounter.procedures && encounter.procedures.length > 0)
    ? encounter.procedures.map((p) => `${p.code} - ${p.display}`).join(", ")
    : "89.07 - Konsultasi Klinis Terpadu";
  const medsText = (encounter.prescriptions && encounter.prescriptions.length > 0)
    ? encounter.prescriptions.map((m) => `${m.medicationName} (${m.frequency})`).join("; ")
    : "Terapi obat oral sesuai resep dokter";
  const followUpText = encounter.followUpPlan?.instruction || "Kontrol rutin bila keluhan berlanjut";

  return {
    resourceType: "Composition",
    identifier: {
      system: `http://sys-ids.kemkes.go.id/composition/${hospitalOrgId}`,
      value: `comp-${encounter.id || "ENC-DEFAULT"}`,
    },
    status: "final",
    type: {
      coding: [
        {
          system: "http://loinc.org",
          code: "88645-7",
          display: "Outpatient hospital Discharge summary",
        },
      ],
    },
    category: [
      {
        coding: [
          {
            system: "http://loinc.org",
            code: "LP173421-1",
            display: "Report",
          },
        ],
      },
    ],
    subject: {
      reference: `Patient/${patient.id}`,
      display: patient.name,
    },
    encounter: {
      reference: `Encounter/${encRef}`,
    },
    date: encounter.visitDate || new Date().toISOString(),
    author: [
      {
        reference: `Practitioner/${encounter.doctorIhsId || "N10009841"}`,
        display: encounter.doctorName || "dr. Dokter Pemeriksa",
      },
    ],
    title: `Resume Medis Rawat Jalan - ${patient.name}`,
    custodian: {
      reference: `Organization/${hospitalOrgId}`,
      display: hospitalName,
    },
    section: [
      {
        title: "Anamnesis",
        code: {
          coding: [
            {
              system: "http://terminology.kemkes.go.id",
              code: "TK000003",
              display: "Anamnesis",
            },
          ],
        },
        text: {
          status: "generated",
          div: `<div xmlns="http://www.w3.org/1999/xhtml"><p><strong>Keluhan Utama:</strong> ${encounter.chiefComplaint || "-"}</p><p><strong>Anamnesis:</strong> ${encounter.anamnesis || "-"}</p></div>`,
        },
      },
      {
        title: "Pemeriksaan Fisik",
        code: {
          coding: [
            {
              system: "http://terminology.kemkes.go.id",
              code: "TK000007",
              display: "Pemeriksaan Fisik",
            },
          ],
        },
        text: {
          status: "generated",
          div: `<div xmlns="http://www.w3.org/1999/xhtml"><p>Tensi: ${v.systolic}/${v.diastolic} mmHg, HR: ${v.heartRate} bpm, Temp: ${v.temperature}°C, SpO2: ${v.oxygenSaturation}%</p></div>`,
        },
      },
      {
        title: "Diagnosis",
        code: {
          coding: [
            {
              system: "http://terminology.kemkes.go.id",
              code: "TK000004",
              display: "Diagnosis",
            },
          ],
        },
        text: {
          status: "generated",
          div: `<div xmlns="http://www.w3.org/1999/xhtml"><p>Diagnosis Primer: ${primaryDiag}</p></div>`,
        },
      },
      {
        title: "Tindakan/Prosedur Medis",
        code: {
          coding: [
            {
              system: "http://terminology.kemkes.go.id",
              code: "TK000005",
              display: "Tindakan/Prosedur Medis",
            },
          ],
        },
        text: {
          status: "generated",
          div: `<div xmlns="http://www.w3.org/1999/xhtml"><p>${proceduresText}</p></div>`,
        },
      },
      {
        title: "Farmasi & Obat Pulang",
        code: {
          coding: [
            {
              system: "http://terminology.kemkes.go.id",
              code: "TK000013",
              display: "Obat",
            },
          ],
        },
        text: {
          status: "generated",
          div: `<div xmlns="http://www.w3.org/1999/xhtml"><p>${medsText}</p></div>`,
        },
      },
      {
        title: "Rencana Tindak Lanjut",
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "8653-8",
              display: "Hospital Discharge instructions",
            },
          ],
        },
        text: {
          status: "generated",
          div: `<div xmlns="http://www.w3.org/1999/xhtml"><p>${followUpText}</p></div>`,
        },
      },
    ],
  };
}

export function generateFhirServiceRequests(
  patient: PatientProfile,
  encounter: OutpatientEncounter
) {
  if (!encounter.diagnosticOrders || encounter.diagnosticOrders.length === 0) {
    return [];
  }
  const encRef = encounter.satusehatEncounterId || encounter.id;

  return encounter.diagnosticOrders.map((order) => ({
    resourceType: "ServiceRequest",
    status: order.status === "cancelled" ? "revoked" : "active",
    intent: "order",
    priority: order.priority,
    category: [
      {
        coding: [
          {
            system: "http://snomed.info/sct",
            code: order.category === "laboratory" ? "108252007" : "363679005",
            display:
              order.category === "laboratory"
                ? "Laboratory procedure"
                : "Imaging",
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: order.testCode,
          display: order.testName,
        },
      ],
      text: order.testName,
    },
    subject: {
      reference: `Patient/${patient.id}`,
      display: patient.name,
    },
    encounter: {
      reference: `Encounter/${encRef}`,
    },
    occurrenceDateTime: order.orderDate || encounter.visitDate,
    requester: {
      reference: `Practitioner/${encounter.doctorIhsId || "N10009841"}`,
      display: order.doctorName || encounter.doctorName,
    },
    patientInstruction: order.clinicalNotes,
  }));
}

export function generateFhirDiagnosticReports(
  patient: PatientProfile,
  encounter: OutpatientEncounter
) {
  const reports = [];
  const encRef = encounter.satusehatEncounterId || encounter.id;

  // Laboratory Report
  if (encounter.labResults && encounter.labResults.length > 0) {
    reports.push({
      resourceType: "DiagnosticReport",
      status: "final",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v2-0074",
              code: "LAB",
              display: "Laboratory",
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "11502-2",
            display: "Laboratory report",
          },
        ],
      },
      subject: {
        reference: `Patient/${patient.id}`,
        display: patient.name,
      },
      encounter: {
        reference: `Encounter/${encRef}`,
      },
      effectiveDateTime: encounter.visitDate,
      conclusion: encounter.labResults
        .map(
          (r) =>
            `${r.testName}: ${r.value} ${r.unit} (${r.flag.toUpperCase()}, Rujukan: ${r.referenceRange})`
        )
        .join("; "),
      performer: [
        {
          reference: `Organization/${encounter.hospitalOrgId}`,
          display: `Instalasi Laboratorium ${encounter.hospitalName}`,
        },
      ],
    });
  }

  // Radiology Report
  if (encounter.radiologyResults && encounter.radiologyResults.length > 0) {
    encounter.radiologyResults.forEach((rad) => {
      reports.push({
        resourceType: "DiagnosticReport",
        status: "final",
        category: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/v2-0074",
                code: "RAD",
                display: "Radiology",
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: rad.examCode,
              display: rad.examName,
            },
          ],
        },
        subject: {
          reference: `Patient/${patient.id}`,
          display: patient.name,
        },
        encounter: {
          reference: `Encounter/${encounter.id}`,
        },
        effectiveDateTime: rad.resultDate || encounter.visitDate,
        conclusion: `${rad.conclusion} (Temuan: ${rad.findings})`,
        performer: [
          {
            display: rad.radiologistName,
          },
        ],
      });
    });
  }

  return reports;
}

export function generateFhirConsent(
  patient: PatientProfile,
  encounter?: OutpatientEncounter
): FhirConsent {
  const isOptIn = (encounter?.consentStatus || patient.satusehatConsent || "opt-in") === "opt-in";
  const orgId = encounter?.hospitalOrgId || "10000004";
  const orgName = encounter?.hospitalName || "RS Umum Daerah Sehat Sejahtera";
  const dateStr = encounter?.visitDate || new Date().toISOString();

  return {
    resourceType: "Consent",
    status: "active",
    scope: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/consentscope",
          code: "patient-privacy",
          display: "Privacy Consent",
        },
      ],
    },
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
            code: "IDS",
            display: "Information Disclosure",
          },
        ],
      },
    ],
    patient: {
      reference: `Patient/${patient.id}`,
      display: patient.name,
    },
    dateTime: dateStr,
    performer: [
      {
        reference: `Patient/${patient.id}`,
        display: patient.name,
      },
    ],
    organization: [
      {
        reference: `Organization/${orgId}`,
        display: orgName,
      },
    ],
    policy: [
      {
        uri: "https://satusehat.kemkes.go.id/consent-policy",
      },
    ],
    provision: {
      type: isOptIn ? "permit" : "deny",
      period: {
        start: dateStr.split("T")[0],
        end: new Date(new Date(dateStr).getTime() + 365 * 86400000).toISOString().split("T")[0],
      },
      data: [
        { meaning: "instance", reference: { reference: "Encounter" } },
        { meaning: "instance", reference: { reference: "Condition" } },
        { meaning: "instance", reference: { reference: "Observation" } },
        { meaning: "instance", reference: { reference: "Procedure" } },
        { meaning: "instance", reference: { reference: "MedicationRequest" } },
        { meaning: "instance", reference: { reference: "ServiceRequest" } },
        { meaning: "instance", reference: { reference: "DiagnosticReport" } },
      ],
    },
  };
}

export function generateFhirBundle(
  patient: PatientProfile,
  encounter: OutpatientEncounter
) {
  const encounterRes = generateFhirEncounter(patient, encounter);
  const observations = generateFhirObservations(patient, encounter);
  const conditions = generateFhirConditions(patient, encounter);
  const procedures = generateFhirProcedures(patient, encounter);
  const allergies = generateFhirAllergyIntolerance(patient);
  const carePlan = generateFhirCarePlan(patient, encounter);
  const medications = generateFhirMedicationRequests(patient, encounter);
  const serviceRequests = generateFhirServiceRequests(patient, encounter);
  const diagnosticReports = generateFhirDiagnosticReports(patient, encounter);
  const consent = generateFhirConsent(patient, encounter);
  const composition = generateFhirComposition(patient, encounter);

  const allResources = [
    consent,
    encounterRes,
    ...observations,
    ...conditions,
    ...procedures,
    ...allergies,
    carePlan,
    ...medications,
    ...serviceRequests,
    ...diagnosticReports,
    composition,
  ];

  return {
    resourceType: "Bundle",
    type: "transaction",
    entry: allResources.map((res) => ({
      fullUrl: `urn:uuid:${Math.random().toString(36).substring(2)}`,
      resource: res,
      request: {
        method: "POST",
        url: res.resourceType,
      },
    })),
  };
}
