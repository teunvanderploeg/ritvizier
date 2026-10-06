import type { Vehicle } from "@/types/vehicle";

export function amsterdamToday() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Amsterdam",
  }).format(new Date());
}
export function elapsedMonths(from: string | null, to: string): number | null {
  if (!from || from > to) return null;
  const a = from.split("-").map(Number),
    b = to.split("-").map(Number);
  return Math.max(0, (b[0] - a[0]) * 12 + b[1] - a[1] - (b[2] < a[2] ? 1 : 0));
}
export function duration(months: number | null) {
  if (months == null) return "Niet beschikbaar";
  return `${Math.floor(months / 12)} jaar en ${months % 12} maanden`;
}
export function apkStatus(v: Vehicle, today = amsterdamToday()) {
  const months = elapsedMonths(v.firstRegistrationDate, today);
  // RDW exempts light passenger cars aged 50+; special/heavy categories remain unknown here.
  const exempt =
    v.vehicleType === "Personenauto" &&
    v.maxMassKg != null &&
    v.maxMassKg <= 3500 &&
    months != null &&
    months >= 600;
  const days = v.apkExpiryDate
    ? Math.round((Date.parse(v.apkExpiryDate) - Date.parse(today)) / 86400000)
    : null;
  const status = exempt
    ? "Niet APK-plichtig"
    : days == null
      ? "Niet beschikbaar"
      : days < 0
        ? "Verlopen"
        : days <= 30
          ? "Verloopt binnenkort"
          : "Geldig";
  return {
    days: exempt ? null : days,
    status,
    exempt,
    warning: !exempt && days != null && days <= 30,
  };
}
export function vehicleColors(v: Vehicle) {
  return (
    [v.colorPrimary, v.colorSecondary]
      .filter(Boolean)
      .map((c) => c!.toLowerCase().replace(/^./, (l) => l.toUpperCase()))
      .join(" / ") || "Niet beschikbaar"
  );
}
export function safeSourceUrl(url: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url.startsWith("www.") ? `https://${url}` : url);
    return ["https:", "http:"].includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}
