import { NextResponse } from "next/server";
import { backendRequest } from "@/lib/server-proxy";

const allowed = new Set([
  "make",
  "model",
  "fuel",
  "transmission",
  "location",
  "year_min",
  "year_max",
  "price_max",
  "mileage_max",
  "page",
  "sort",
]);

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (
    [...params].some(
      ([key, value]) => !allowed.has(key) || value.length > 150,
    ) ||
    request.url.length > 2500
  ) {
    return NextResponse.json(
      { detail: "Controleer de zoekfilters." },
      { status: 422 },
    );
  }
  return backendRequest(`/api/listings?${params.toString()}`);
}
