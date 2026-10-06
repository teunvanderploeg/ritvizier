import { NextResponse } from "next/server";
import { z } from "zod";
import { backendRequest } from "@/lib/server-proxy";
const schema = z.object({
  annualKm: z.number().min(0).max(200000),
  consumption: z.number().min(0).max(200),
  energyPrice: z.number().min(0).max(20),
  insuranceMonthly: z.number().min(0).max(2000),
  maintenanceMonthly: z.number().min(0).max(2000),
  roadTaxMonthly: z.number().min(0).max(2000),
});
export async function POST(request: Request) {
  try {
    const body = schema.safeParse(await request.json());
    if (!body.success)
      return NextResponse.json(
        { detail: "Controleer de waarden in je berekening." },
        { status: 422 },
      );
    return backendRequest("/api/costs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body.data),
    });
  } catch {
    return NextResponse.json(
      { detail: "Controleer de waarden in je berekening." },
      { status: 422 },
    );
  }
}
