import type { Metadata } from "next";
import { cache } from "react";
import { plateSchema, formatPlate } from "@/lib/plates";
import { vehicleSchema } from "@/types/vehicle";
import { titleCase } from "@/lib/formatting";
import { VehicleDetail } from "@/features/vehicle-details/VehicleDetail";
const getData = cache(async (plate: string) => {
  const normalized = plateSchema.safeParse(plate);
  if (!normalized.success)
    return { vehicle: null, error: normalized.error.issues[0].message };
  try {
    const response = await fetch(
      `${process.env.BACKEND_URL || "http://127.0.0.1:8000"}/api/vehicles/${normalized.data}`,
      { cache: "no-store", signal: AbortSignal.timeout(18000) },
    );
    const data = await response.json();
    if (!response.ok)
      return {
        vehicle: null,
        error:
          typeof data.detail === "string"
            ? data.detail
            : "De voertuiggegevens zijn tijdelijk niet beschikbaar.",
      };
    return { vehicle: vehicleSchema.parse(data), error: undefined };
  } catch {
    return {
      vehicle: null,
      error:
        "De voertuiggegevens zijn tijdelijk niet beschikbaar. Probeer het zo opnieuw.",
    };
  }
});
export async function generateMetadata({
  params,
}: {
  params: Promise<{ plate: string }>;
}): Promise<Metadata> {
  const { plate } = await params;
  const { vehicle } = await getData(plate);
  return {
    title: vehicle
      ? `${titleCase(vehicle.make)} ${titleCase(vehicle.model)} ${formatPlate(plate)} | Specificaties & APK`
      : "Kentekencheck",
    robots: { index: !!vehicle, follow: !!vehicle },
    alternates: { canonical: `/auto/${formatPlate(plate)}` },
  };
}
export default async function VehiclePage({
  params,
}: {
  params: Promise<{ plate: string }>;
}) {
  const { plate } = await params;
  const data = await getData(plate);
  return (
    <VehicleDetail
      key={plate}
      plate={plate}
      initialVehicle={data.vehicle}
      initialError={data.error}
    />
  );
}
