import { z } from "zod";
const text = z.string().nullable();
const number = z.number().nullable();
const boolean = z.boolean().nullable();
const recallSchema = z.object({
  reference: z.string(),
  statusCode: text,
  status: text,
  publicationDate: text,
  producer: text,
  producerReference: text,
  defect: text,
  consequences: text,
  remedy: text,
  risks: z.array(z.string()),
  url: text,
  phone: text,
});
export const vehicleSchema = z.object({
  licensePlate: z.string(),
  make: z.string(),
  model: text,
  vehicleType: text,
  bodyType: text,
  firstRegistrationDate: text,
  firstRegistrationNetherlandsDate: text,
  apkExpiryDate: text,
  fuelTypes: z.array(z.string()),
  fuels: z
    .array(
      z.object({
        sequence: number,
        name: text,
        powerKw: number,
        powerHp: number,
        continuousPowerKw: number,
        electricPowerKw: number,
        consumptionNedc: number,
        consumptionWltp: number,
        consumptionWeightedWltp: number,
        consumptionCity: number,
        consumptionHighway: number,
        co2Nedc: number,
        co2WeightedNedc: number,
        co2Wltp: number,
        co2WeightedWltp: number,
        emissionClass: text,
        particulateGKm: number,
        particulateWltp: number,
        electricConsumptionWhKm: number,
        electricRangeKm: number,
        hybridClass: text,
      }),
    )
    .default([]),
  bodies: z
    .array(z.object({ sequence: number, code: text, description: text }))
    .default([]),
  bodySpecifications: z
    .array(
      z.object({
        sequence: number,
        code: text,
        description: text,
        specificationSequence: number,
      }),
    )
    .default([]),
  vehicleClasses: z
    .array(
      z.object({
        bodySequence: number,
        sequence: number,
        code: text,
        description: text,
      }),
    )
    .default([]),
  waitingForInspection: boolean.default(null),
  payloadDerived: z.boolean().default(true),
  originalDimensions: z.record(z.string(), z.string()).default({}),
  apkHistory: z
    .object({
      inspections: z
        .array(
          z.object({
            key: z.string(),
            date: z.string(),
            time: text,
            recognitionCode: text,
            recognition: text,
            report: text,
            expiryDate: text,
            hasNotification: z.boolean(),
            defects: z.array(
              z.object({
                code: z.string(),
                description: text,
                count: number,
                category: text,
              }),
            ),
          }),
        )
        .default([]),
      notificationsAvailable: z.boolean().default(false),
      defectsAvailable: z.boolean().default(false),
      descriptionsAvailable: z.boolean().default(false),
      truncated: z.boolean().default(false),
    })
    .prefault({}),
  analysis: z
    .object({
      calculatedAt: text.default(null),
      ageMonths: number.default(null),
      importAgeDays: number.default(null),
      registrationDurationDays: number.default(null),
      apkStatus: z.string().default("unknown"),
      apkDaysRemaining: number.default(null),
      apkExempt: z.boolean().default(false),
      apkNoticeDays: z.number().default(60),
      apkUrgentDays: z.number().default(30),
      powerHpPerTon: number.default(null),
      powerWeightBasis: z.string().default("massa rijklaar"),
      inspectionCount: z.number().default(0),
      inspectionsWithDefects: z.number().default(0),
      defectCount: z.number().default(0),
      defectCountComplete: z.boolean().default(true),
      warnings: z
        .array(
          z.object({
            code: z.string(),
            severity: z.enum(["info", "warning", "critical"]),
            title: z.string(),
            description: z.string(),
          }),
        )
        .default([]),
    })
    .prefault({}),
  powerKw: number,
  powerHp: number,
  electricPowerKw: number,
  massKg: number,
  readyMassKg: number,
  maxMassKg: number,
  payloadKg: number,
  catalogPrice: number,
  bpm: number,
  colorPrimary: text,
  colorSecondary: text.default(null),
  registrationDate: text.default(null),
  wamInsured: boolean.default(null),
  typeCode: text.default(null),
  variant: text.default(null),
  version: text.default(null),
  typeApprovalNumber: text.default(null),
  europeanCategory: text.default(null),
  bodyCode: text.default(null),
  numberOfWheels: number.default(null),
  standingPlaces: number.default(null),
  technicalMaxMassKg: number.default(null),
  combinationMaxMassKg: number.default(null),
  couplingMaxLoadKg: number.default(null),
  odometerJudgment: text.default(null),
  odometerJudgmentCode: text.default(null),
  odometerExplanation: text.default(null),
  odometerLastYear: number.default(null),
  recalls: z.array(recallSchema).default([]),
  possibleRecalls: z.array(recallSchema).default([]),
  possibleRecallsAvailable: z.boolean().default(false),
  recallDetailsAvailable: z.boolean().default(false),
  axes: z
    .array(
      z.object({
        number,
        position: text,
        trackCm: number,
        maxMassKg: number,
        technicalMaxMassKg: number.default(null),
        driven: boolean.default(null),
        liftable: boolean.default(null),
        braked: boolean.default(null),
        suspensionCode: text.default(null),
      }),
    )
    .default([]),
  typeApproval: z
    .object({
      matched: z.boolean().default(false),
      transmissionCode: text.default(null),
      transmission: text.default(null),
      gears: number.default(null),
      lengthMm: number.default(null),
      widthMm: number.default(null),
      heightMm: number.default(null),
      wheelbaseMm: number.default(null),
    })
    .prefault({}),
  consumptionWltp: number.default(null),
  consumptionCity: number.default(null),
  consumptionHighway: number.default(null),
  emissionsCo2Wltp: number.default(null),
  emissionsCo2Nedc: number.default(null),
  particulateEmissionsWltp: number.default(null),
  particulateEmissions: number.default(null),
  noiseStationaryDb: number.default(null),
  noiseDrivingDb: number.default(null),
  noiseRpm: number.default(null),
  environmentalApproval: text.default(null),
  electricRangeKm: number.default(null),
  hybridClass: text.default(null),
  consumptionWeightedWltp: number.default(null),
  emissionsCo2WeightedWltp: number.default(null),
  numberOfSeats: number,
  numberOfDoors: number,
  engineCapacityCc: number,
  cylinders: number,
  emissionsCo2: number,
  emissionClass: text,
  consumptionCombined: number,
  electricConsumption: number,
  lengthCm: number,
  widthCm: number,
  heightCm: number,
  wheelbaseCm: number,
  towingBrakedKg: number,
  towingUnbrakedKg: number,
  maxSpeedKmh: number,
  isImport: boolean,
  isExported: boolean,
  isTaxi: boolean,
  recallPending: boolean,
  registrationPossible: boolean,
  source: z.object({
    name: z.string(),
    datasets: z.array(z.string()),
    fetchedAt: z.string(),
    missingFields: z.array(z.string()),
    derivedFields: z.array(z.string()),
    warnings: z.array(z.string()),
    schemaVersion: z.number().default(1),
    partial: z.boolean().default(false),
    unavailableSections: z.array(z.string()).default([]),
    sections: z
      .record(
        z.string(),
        z.object({
          datasets: z.array(z.string()),
          fetchedAt: z.string(),
          available: z.boolean(),
          truncated: z.boolean(),
          recordCount: z.number(),
        }),
      )
      .default({}),
  }),
});
export type Vehicle = z.infer<typeof vehicleSchema>;
