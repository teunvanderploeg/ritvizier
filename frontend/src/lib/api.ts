import { vehicleSchema, type Vehicle } from "@/types/vehicle";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function fetchVehicle(
  plate: string,
  signal?: AbortSignal,
): Promise<Vehicle> {
  const response = await fetch(`/api/vehicles/${encodeURIComponent(plate)}`, {
    signal,
  });
  const body = await response.json();
  if (!response.ok)
    throw new ApiError(
      typeof body.detail === "string"
        ? body.detail
        : "De voertuiggegevens zijn tijdelijk niet beschikbaar. Probeer het zo opnieuw.",
      response.status,
    );
  const result = vehicleSchema.safeParse(body);
  if (!result.success)
    throw new ApiError(
      "We konden de voertuiggegevens niet goed verwerken. Probeer het zo opnieuw.",
      503,
    );
  return result.data;
}
