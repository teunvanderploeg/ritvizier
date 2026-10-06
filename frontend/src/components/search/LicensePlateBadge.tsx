import { formatPlate } from "@/lib/plates";
export function LicensePlateBadge({ plate, small = false }: { plate: string; small?: boolean }) {
  return <span className={`plate-badge ${small ? "plate-small" : ""}`} aria-label={`Kenteken ${formatPlate(plate)}`}><span className="nl-strip"><span className="eu-stars">✦</span>NL</span><span>{formatPlate(plate)}</span></span>;
}
