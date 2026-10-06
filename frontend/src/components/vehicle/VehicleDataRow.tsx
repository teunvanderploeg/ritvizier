import { Info } from "lucide-react";
export function VehicleDataRow({
  label,
  value,
  explanation,
  derived = false,
}: {
  label: string;
  value: React.ReactNode;
  explanation?: string;
  derived?: boolean;
}) {
  return (
    <div className="data-row">
      <dt>
        <span>
          {label}
          {derived && <span className="derived-tag">Berekend</span>}
        </span>
        {explanation && (
          <details className="field-help">
            <summary aria-label={`Uitleg over ${label}`}>
              <Info size={14} />
            </summary>
            <p>{explanation}</p>
          </details>
        )}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}
