import { NextResponse } from "next/server";
import { plateSchema } from "@/lib/plates";
import { backendRequest } from "@/lib/server-proxy";

export async function GET(_: Request, context: { params: Promise<{ plate: string }> }) {
  const { plate } = await context.params;
  const result = plateSchema.safeParse(plate);
  if (!result.success) return NextResponse.json({ detail: result.error.issues[0].message }, { status: 422 });
  return backendRequest(`/api/vehicles/${result.data}`);
}
