import { ChevronDown, ArrowUpRight } from "lucide-react";
import type { Vehicle } from "@/types/vehicle";
import { date } from "@/lib/formatting";
import { safeSourceUrl } from "./timeline";

export function PossibleRecalls({ vehicle }: { vehicle: Vehicle }) {
  if (!vehicle.possibleRecalls.length) return null;
  return (
    <section className="possible-recalls">
      <h2>Mogelijke acties voor merk en model</h2>
      <p className="section-description">
        Deze acties matchen alleen merk en model. Ze zijn niet als open actie
        aan dit kenteken gekoppeld. Uitvoering en productieperiode bepalen of ze
        van toepassing zijn; controleer dit bij de merkdealer.
      </p>
      <div className="recall-list">
        {vehicle.possibleRecalls.map((recall) => (
          <details
            className="possible-recall-card technical-disclosure"
            key={recall.reference}
          >
            <summary>
              <span>
                <strong>{recall.reference}</strong>
                <small>{date(recall.publicationDate)}</small>
              </span>
              <ChevronDown size={18} />
            </summary>
            <div className="possible-recall-body">
              {recall.defect && <p>{recall.defect}</p>}
              {recall.risks.length > 0 && (
                <p>
                  <strong>Mogelijk risico:</strong> {recall.risks.join(" · ")}
                </p>
              )}
              {recall.remedy && (
                <p>
                  <strong>Hersteladvies:</strong> {recall.remedy}
                </p>
              )}
              {!recall.defect && (
                <p>De omschrijving van deze actie is niet beschikbaar.</p>
              )}
              {safeSourceUrl(recall.url) && (
                <a
                  className="source-link"
                  href={safeSourceUrl(recall.url)!}
                  target="_blank"
                  rel="noreferrer"
                >
                  Informatie van de producent <ArrowUpRight size={14} />
                </a>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
