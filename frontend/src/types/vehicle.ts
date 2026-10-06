import { z } from "zod";
const text = z.string().nullable();
const number = z.number().nullable();
const boolean = z.boolean().nullable();
export const vehicleSchema = z.object({
  licensePlate: z.string(), make: z.string(), model: text, vehicleType: text, bodyType: text,
  firstRegistrationDate: text, firstRegistrationNetherlandsDate: text, apkExpiryDate: text,
  fuelTypes: z.array(z.string()), powerKw: number, powerHp: number, electricPowerKw: number,
  massKg: number, readyMassKg: number, maxMassKg: number, payloadKg: number, catalogPrice: number,
  bpm: number, colorPrimary: text, numberOfSeats: number, numberOfDoors: number,
  engineCapacityCc: number, cylinders: number, emissionsCo2: number, emissionClass: text,
  consumptionCombined: number, electricConsumption: number, lengthCm: number, widthCm: number,
  heightCm: number, wheelbaseCm: number, towingBrakedKg: number, towingUnbrakedKg: number,
  maxSpeedKmh: number, isImport: boolean, isExported: boolean, isTaxi: boolean,
  recallPending: boolean, registrationPossible: boolean,
  source: z.object({ name: z.string(), datasets: z.array(z.string()), fetchedAt: z.string(),
    missingFields: z.array(z.string()), derivedFields: z.array(z.string()), warnings: z.array(z.string()) }),
});
export type Vehicle = z.infer<typeof vehicleSchema>;
