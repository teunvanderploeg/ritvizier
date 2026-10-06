import { NextResponse } from "next/server";
import { z } from "zod";
import { plateSchema } from "@/lib/plates";
import { backendRequest } from "@/lib/server-proxy";

const schema = z.object({
  licensePlate: plateSchema,
  province: z.enum([
    "DR",
    "FL",
    "FR",
    "GL",
    "GR",
    "LI",
    "NB",
    "NH",
    "OV",
    "UT",
    "ZL",
    "ZH",
  ]),
  particulateSurcharge: z.boolean().nullable().optional(),
  gasInstallation: z.enum(["G3", "other"]).nullable().optional(),
});
export async function POST(request: Request) {
  try {
    const body = schema.safeParse(await request.json());
    if (!body.success)
      return NextResponse.json(
        { detail: "Kies je provincie en controleer het kenteken." },
        { status: 422 },
      );
    return backendRequest("/api/road-tax", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body.data),
    });
  } catch {
    return NextResponse.json(
      { detail: "Controleer de invoer voor de wegenbelasting." },
      { status: 422 },
    );
  }
}
