import { CalendarCheck2, ChevronDown, Info } from "lucide-react";
import type { Vehicle } from "@/types/vehicle";
import { date, numeric } from "@/lib/formatting";

export function ApkHistory({ vehicle: v }: { vehicle: Vehicle }) {
  const history = v.apkHistory;
  const hasData = history.inspections.length > 0;
  return (
    <section className="inspection-history">
      <div className="section-title">
        <h2>APK- en technische historie</h2>
      </div>
      <p className="section-description">
        Geregistreerde keuringsmeldingen en geconstateerde gebreken. Dit is
        historische informatie, geen beoordeling van de huidige staat of
        schadeverleden.
      </p>
      {hasData && (
        <dl className="history-stats">
          <div>
            <dt>Keuringsmeldingen</dt>
            <dd>{numeric(v.analysis.inspectionCount)}</dd>
          </div>
          <div>
            <dt>Meldingen met gebreken</dt>
            <dd>{numeric(v.analysis.inspectionsWithDefects)}</dd>
          </div>
          <div>
            <dt>Geregistreerde gebreken</dt>
            <dd>
              {v.analysis.defectCountComplete
                ? numeric(v.analysis.defectCount)
                : "Aantal niet volledig"}
            </dd>
          </div>
        </dl>
      )}
      {(!history.notificationsAvailable ||
        !history.defectsAvailable ||
        history.truncated) && (
        <p className="data-note">
          <Info size={16} />
          {history.truncated
            ? "Er zijn meer records dan binnen deze check kunnen worden getoond. "
            : ""}
          {!history.notificationsAvailable
            ? "De keuringsmeldingen zijn niet beschikbaar. "
            : ""}
          {!history.defectsAvailable
            ? "De gebrekenregistraties zijn niet beschikbaar. "
            : ""}
          De beschikbare gegevens hieronder blijven zichtbaar.
        </p>
      )}
      {!hasData && (
        <div className="history-empty">
          <CalendarCheck2 size={26} />
          <h3>
            {history.notificationsAvailable && history.defectsAvailable
              ? "Geen openbare APK-meldingen gevonden"
              : "APK-historie niet beschikbaar"}
          </h3>
          <p>
            Een ontbrekend record bewijst geen probleemloze keuring. De
            beschikbare open data is geen volledige onderhouds- of
            schadehistorie.
          </p>
        </div>
      )}
      <ol className="inspection-timeline">
        {history.inspections.map((event, index) => (
          <li key={event.key}>
            <details className="inspection-event" open={index < 2}>
              <summary>
                <span className="inspection-marker">
                  <CalendarCheck2 size={18} />
                </span>
                <span>
                  <strong>{date(event.date)}</strong>
                  <small>
                    {event.hasNotification
                      ? event.report || "Keuringsmelding"
                      : "Gebrekenmelding zonder gekoppelde keuring"}
                    {event.time ? ` · ${event.time}` : ""}
                  </small>
                </span>
                <span className="inspection-event-count">
                  {event.defects.length
                    ? `${event.defects.length} gebrekcode${event.defects.length === 1 ? "" : "s"}`
                    : "Geen gebrekrecords"}
                </span>
                <ChevronDown size={18} />
              </summary>
              <div className="inspection-event-body">
                {event.expiryDate && (
                  <p className="inspection-expiry">
                    Geregistreerde vervaldatum bij deze melding:{" "}
                    {date(event.expiryDate)}.
                  </p>
                )}
                {event.defects.length ? (
                  <ul className="inspection-defects">
                    {event.defects.map((defect) => (
                      <li key={defect.code}>
                        <div>
                          <strong>
                            {defect.description ||
                              "Officiële omschrijving niet beschikbaar"}
                          </strong>
                          <small>
                            Gebrekcode {defect.code}
                            {defect.category ? ` · ${defect.category}` : ""}
                          </small>
                        </div>
                        <span>
                          {defect.count != null
                            ? `${numeric(defect.count)} ×`
                            : "Aantal onbekend"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="inspection-no-defects">
                    {history.defectsAvailable
                      ? "Geen gebrekrecords bij deze melding gevonden in de beschikbare open data."
                      : "Of bij deze melding gebreken zijn geregistreerd, is momenteel niet bekend."}
                  </p>
                )}
              </div>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}
