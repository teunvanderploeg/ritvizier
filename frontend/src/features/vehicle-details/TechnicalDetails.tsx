import { ChevronDown } from "lucide-react";
import type { Vehicle } from "@/types/vehicle";
import { numeric } from "@/lib/formatting";
import { VehicleDataRow as Row } from "@/components/vehicle/VehicleDataRow";

function flag(value: boolean | null) {
  return value == null ? "Niet geregistreerd" : value ? "Ja" : "Nee";
}
export function TechnicalDetails({ vehicle: v }: { vehicle: Vehicle }) {
  return (
    <div className="data-grid">
      {v.bodies.length > 0 && (
        <section className="data-section">
          <h2>Geregistreerde carrosserieën</h2>
          {v.bodies.map((body, index) => (
            <dl key={`${body.sequence}-${index}`}>
              <Row
                label={`Carrosserie ${body.sequence ?? index + 1}`}
                value={body.description || body.code || "Niet geregistreerd"}
              />
              {body.description && body.code && (
                <Row label="Europese carrosseriecode" value={body.code} />
              )}
            </dl>
          ))}
        </section>
      )}
      {v.bodySpecifications.length > 0 && (
        <section className="data-section">
          <h2>Carrosseriespecificaties</h2>
          <dl>
            {v.bodySpecifications.map((body, index) => (
              <Row
                key={`${body.sequence}-${index}`}
                label={`Specificatie ${body.specificationSequence ?? index + 1}`}
                value={body.description || body.code || "Niet geregistreerd"}
              />
            ))}
          </dl>
        </section>
      )}
      {v.vehicleClasses.length > 0 && (
        <section className="data-section">
          <h2>Aanvullende voertuigklassen</h2>
          <dl>
            {v.vehicleClasses.map((item, index) => (
              <Row
                key={`${item.sequence}-${index}`}
                label={`Klasse ${item.code ?? index + 1}`}
                value={item.description || item.code || "Niet geregistreerd"}
              />
            ))}
          </dl>
        </section>
      )}
      {v.axes.length > 0 && (
        <section className="data-section technical-axes">
          <h2>Technische details per as</h2>
          {v.axes.map((axle, index) => (
            <details
              className="technical-disclosure"
              key={`${axle.number}-${index}`}
            >
              <summary>
                As {axle.number ?? index + 1}
                {axle.position === "V"
                  ? " · Vooras"
                  : axle.position === "A"
                    ? " · Achteras"
                    : ""}
                <ChevronDown size={18} />
              </summary>
              <dl>
                <Row label="Spoorbreedte" value={numeric(axle.trackCm, "cm")} />
                <Row
                  label="Wettelijke maximum aslast"
                  value={numeric(axle.maxMassKg, "kg")}
                />
                <Row
                  label="Technische maximum aslast"
                  value={numeric(axle.technicalMaxMassKg, "kg")}
                />
                {axle.driven != null && (
                  <Row label="Aangedreven" value={flag(axle.driven)} />
                )}
                {axle.liftable != null && (
                  <Row label="Hefbaar" value={flag(axle.liftable)} />
                )}
                {axle.braked != null && (
                  <Row label="Geremd" value={flag(axle.braked)} />
                )}
                {axle.suspensionCode && (
                  <Row
                    label="Vering"
                    value={
                      (
                        {
                          L: "Luchtvering",
                          G: "Gelijkwaardig aan luchtvering",
                          A: "Anders dan luchtvering",
                        } as Record<string, string>
                      )[axle.suspensionCode] || axle.suspensionCode
                    }
                  />
                )}
              </dl>
            </details>
          ))}
        </section>
      )}
      {!v.bodies.length &&
        !v.bodySpecifications.length &&
        !v.vehicleClasses.length &&
        !v.axes.length && (
          <p className="data-note">
            Voor dit voertuig zijn geen aanvullende technische records
            beschikbaar.
          </p>
        )}
    </div>
  );
}
