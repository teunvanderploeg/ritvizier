import { NextResponse } from "next/server";
export async function backendRequest(path: string, options?: RequestInit) {
  try {
    const response = await fetch(`${process.env.BACKEND_URL || "http://127.0.0.1:8000"}${path}`, {
      ...options, cache: "no-store", signal: AbortSignal.timeout(18000),
    });
    const body: unknown = await response.json();
    return NextResponse.json(body, { status: response.status, headers: {
      "Cache-Control": "no-store", ...(response.status === 429 ? { "Retry-After": "60" } : {}),
    } });
  } catch {
    return NextResponse.json({ detail: "De voertuiggegevens zijn tijdelijk niet beschikbaar. Probeer het zo opnieuw." }, { status: 503 });
  }
}
