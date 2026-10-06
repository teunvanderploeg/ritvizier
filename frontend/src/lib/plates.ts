import { z } from "zod";

const sidecodes = [
  [/^([A-Z]{2})(\d{2})(\d{2})$/, "$1-$2-$3"],
  [/^(\d{2})(\d{2})([A-Z]{2})$/, "$1-$2-$3"],
  [/^(\d{2})([A-Z]{2})(\d{2})$/, "$1-$2-$3"],
  [/^([A-Z]{2})(\d{2})([A-Z]{2})$/, "$1-$2-$3"],
  [/^([A-Z]{2})([A-Z]{2})(\d{2})$/, "$1-$2-$3"],
  [/^(\d{2})([A-Z]{2})([A-Z]{2})$/, "$1-$2-$3"],
  [/^(\d{2})([A-Z]{3})(\d)$/, "$1-$2-$3"],
  [/^(\d)([A-Z]{3})(\d{2})$/, "$1-$2-$3"],
  [/^([A-Z]{2})(\d{3})([A-Z])$/, "$1-$2-$3"],
  [/^([A-Z])(\d{3})([A-Z]{2})$/, "$1-$2-$3"],
  [/^([A-Z]{3})(\d{2})([A-Z])$/, "$1-$2-$3"],
  [/^([A-Z])(\d{2})([A-Z]{3})$/, "$1-$2-$3"],
  [/^(\d)([A-Z]{2})(\d{3})$/, "$1-$2-$3"],
  [/^(\d{3})([A-Z]{2})(\d)$/, "$1-$2-$3"],
] as const;

export function normalizePlate(value: string) { return value.toUpperCase().replace(/[\s-]/g, ""); }
export function formatPlate(value: string) {
  const normalized = normalizePlate(value);
  const pattern = sidecodes.find(([regex]) => regex.test(normalized));
  return pattern ? normalized.replace(pattern[0], pattern[1]) : normalized;
}
export const plateSchema = z.string().transform(normalizePlate).refine(
  (value) => sidecodes.some(([regex]) => regex.test(value)),
  "Dit kenteken lijkt niet geldig. Controleer het kenteken en probeer opnieuw.",
);
