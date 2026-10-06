export function numeric(value: number | null | undefined, unit = "") {
  return value == null
    ? "Niet beschikbaar"
    : `${new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 }).format(value)}${unit ? ` ${unit}` : ""}`;
}
export function currency(value: number | null | undefined, decimals = 0) {
  return value == null
    ? "Niet beschikbaar"
    : new Intl.NumberFormat("nl-NL", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: decimals,
      }).format(value);
}
export function date(value: string | null) {
  if (!value) return "Niet beschikbaar";
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Amsterdam",
  }).format(new Date(value));
}
export function titleCase(value: string | null | undefined) {
  return value
    ? value.toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())
    : "Niet beschikbaar";
}
export function fuelLabel(fuels: string[]) {
  if (fuels.includes("Elektriciteit") && fuels.length > 1)
    return `Hybride · ${fuels.filter((f) => f !== "Elektriciteit").join(" / ")}`;
  return fuels.join(" / ") || "Niet beschikbaar";
}
