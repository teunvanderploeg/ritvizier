import { z } from "zod";
import { vehicleSchema, type Vehicle } from "@/types/vehicle";
export type Collection = "recent" | "favourites" | "comparison";
export function readVehicles(collection: Collection): Vehicle[] {
  try { return z.array(vehicleSchema).parse(JSON.parse(localStorage.getItem(`ritvizier:${collection}`) || "[]")); }
  catch { return []; }
}
export function writeVehicles(collection: Collection, vehicles: Vehicle[]) {
  try { localStorage.setItem(`ritvizier:${collection}`, JSON.stringify(vehicles)); window.dispatchEvent(new Event("ritvizier:storage")); return true; }
  catch { return false; }
}
export function addVehicle(collection: Collection, vehicle: Vehicle) {
  const existing = readVehicles(collection).filter(item => item.licensePlate !== vehicle.licensePlate);
  return writeVehicles(collection, [vehicle, ...existing].slice(0, collection === "comparison" ? 3 : collection === "recent" ? 8 : 50));
}
