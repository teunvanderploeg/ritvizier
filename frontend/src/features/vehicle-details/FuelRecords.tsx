import type { Vehicle } from "@/types/vehicle";
import { numeric } from "@/lib/formatting";
import { VehicleDataRow as Row } from "@/components/vehicle/VehicleDataRow";

export function FuelRecords({ vehicle }: { vehicle: Vehicle }) {
  if (!vehicle.fuels.length) return null;
  return (
    <section className="fuel-records">
      <h2>Registratie per brandstof</h2>
      <p className="section-description">
        Iedere brandstofregistratie staat apart. Vermogens worden niet opgeteld
        tot een verondersteld systeemvermogen.
      </p>
      <div className="data-grid">
        {vehicle.fuels.map((fuel, index) => (
          <section
            className="fuel-record data-section"
            key={`${fuel.sequence}-${index}`}
          >
            <h3>
              {fuel.name || "Brandstof niet vermeld"}{" "}
              <span>Registratie {fuel.sequence ?? index + 1}</span>
            </h3>
            <dl>
              {fuel.powerKw != null && (
                <Row
                  label="Netto maximumvermogen"
                  value={numeric(fuel.powerKw, "kW")}
                />
              )}
              {fuel.powerHp != null && (
                <Row
                  label="Paardenkracht"
                  value={numeric(fuel.powerHp, "pk")}
                  derived
                />
              )}
              {fuel.electricPowerKw != null && (
                <Row
                  label="Netto elektrisch vermogen"
                  value={numeric(fuel.electricPowerKw, "kW")}
                />
              )}
              {fuel.continuousPowerKw != null && (
                <Row
                  label="Continu elektrisch vermogen"
                  value={numeric(fuel.continuousPowerKw, "kW")}
                />
              )}
              {fuel.consumptionWltp != null && (
                <Row
                  label="Verbruik WLTP"
                  value={numeric(fuel.consumptionWltp, "l/100 km")}
                />
              )}
              {fuel.consumptionNedc != null && (
                <Row
                  label="Verbruik NEDC"
                  value={numeric(fuel.consumptionNedc, "l/100 km")}
                />
              )}
              {fuel.consumptionWeightedWltp != null && (
                <Row
                  label="Gewogen verbruik WLTP"
                  value={numeric(fuel.consumptionWeightedWltp, "l/100 km")}
                />
              )}
              {fuel.consumptionCity != null && (
                <Row
                  label="Verbruik stad NEDC"
                  value={numeric(fuel.consumptionCity, "l/100 km")}
                />
              )}
              {fuel.consumptionHighway != null && (
                <Row
                  label="Verbruik buitenweg NEDC"
                  value={numeric(fuel.consumptionHighway, "l/100 km")}
                />
              )}
              {fuel.co2Wltp != null && (
                <Row label="CO₂ WLTP" value={numeric(fuel.co2Wltp, "g/km")} />
              )}
              {fuel.co2Nedc != null && (
                <Row label="CO₂ NEDC" value={numeric(fuel.co2Nedc, "g/km")} />
              )}
              {fuel.co2WeightedWltp != null && (
                <Row
                  label="Gewogen CO₂ WLTP"
                  value={numeric(fuel.co2WeightedWltp, "g/km")}
                />
              )}
              {fuel.co2WeightedNedc != null && (
                <Row
                  label="Gewogen CO₂ NEDC"
                  value={numeric(fuel.co2WeightedNedc, "g/km")}
                />
              )}
              {fuel.emissionClass && (
                <Row label="Emissieklasse" value={fuel.emissionClass} />
              )}
              {fuel.particulateGKm != null && (
                <Row
                  label="Deeltjes NEDC"
                  value={numeric(fuel.particulateGKm, "g/km")}
                />
              )}
              {fuel.electricConsumptionWhKm != null && (
                <Row
                  label="Elektrisch verbruik, bronwaarde"
                  value={numeric(fuel.electricConsumptionWhKm, "Wh/km")}
                />
              )}
              {fuel.electricRangeKm != null && (
                <Row
                  label="Elektrische actieradius WLTP"
                  value={numeric(fuel.electricRangeKm, "km")}
                />
              )}
              {fuel.hybridClass && (
                <Row label="Hybrideklasse" value={fuel.hybridClass} />
              )}
            </dl>
          </section>
        ))}
      </div>
    </section>
  );
}
