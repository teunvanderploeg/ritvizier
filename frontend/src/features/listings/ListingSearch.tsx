"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { listingResultsSchema, type ListingResults } from "@/types/listings";
import type { Vehicle } from "@/types/vehicle";
import { currency, numeric } from "@/lib/formatting";

function dateTime(value: string) {
  return new Date(value).toLocaleString("nl-NL", {
    timeZone: "Europe/Amsterdam",
  });
}

export function ListingSearch({ vehicle }: { vehicle?: Vehicle }) {
  const [result, setResult] = useState<ListingResults | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const controller = useRef<AbortController | null>(null);
  const year = vehicle?.firstRegistrationDate?.slice(0, 4);
  const transmission = vehicle?.typeApproval.transmission;

  async function search(page = 1) {
    if (!form.current || !form.current.reportValidity()) return;
    const values = new FormData(form.current);
    const params = new URLSearchParams();
    for (const [key, value] of values.entries()) {
      if (typeof value === "string" && value.trim())
        params.set(key, value.trim());
    }
    params.set("page", String(page));
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(`/api/listings?${params}`, {
        signal: request.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Controleer de zoekfilters en probeer opnieuw.",
        );
      setResult(listingResultsSchema.parse(data));
    } catch (exception) {
      if (!request.signal.aborted)
        setError(
          exception instanceof Error && exception.name !== "ZodError"
            ? exception.message
            : "Het aanbod is tijdelijk niet beschikbaar.",
        );
    } finally {
      if (!request.signal.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    return () => controller.current?.abort();
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    void search();
  }

  return (
    <section
      className="listing-search"
      aria-label={vehicle ? "Vergelijkbaar aanbod" : "Autoaanbod zoeken"}
    >
      {vehicle && <h2>Vergelijkbaar aanbod</h2>}
      <p className="page-description">
        {vehicle
          ? "Zoek advertenties met hetzelfde merk en model. Pas de filters aan om de vergelijking te verfijnen."
          : "Zoek Nederlands autoaanbod en bekijk de bronadvertenties bij elkaar."}{" "}
        Gevonden dubbele advertenties verschijnen als één auto met alle
        bronlinks.
      </p>
      <form ref={form} className="listing-filters" onSubmit={submit}>
        <label>
          Merk
          <input
            name="make"
            defaultValue={vehicle?.make || ""}
            maxLength={100}
            placeholder="Bijvoorbeeld MINI"
          />
        </label>
        <label>
          Model
          <input
            name="model"
            defaultValue={vehicle?.model || ""}
            maxLength={150}
            placeholder="Bijvoorbeeld Countryman"
          />
        </label>
        <label>
          Vanaf bouwjaar
          <input
            name="year_min"
            type="number"
            min="1886"
            max="2100"
            defaultValue={year ? Number(year) - 2 : ""}
          />
        </label>
        <label>
          Tot bouwjaar
          <input
            name="year_max"
            type="number"
            min="1886"
            max="2100"
            defaultValue={year ? Number(year) + 2 : ""}
          />
        </label>
        <label>
          Maximale vraagprijs in euro
          <input name="price_max" type="number" min="1" max="10000000" />
        </label>
        <label>
          Maximale kilometerstand
          <input name="mileage_max" type="number" min="0" max="3000000" />
        </label>
        <label>
          Brandstof
          <select
            name="fuel"
            defaultValue={
              vehicle?.fuelTypes.length === 1 ? vehicle.fuelTypes[0] : ""
            }
          >
            <option value="">Alle brandstoffen</option>
            {Array.from(
              new Set([
                "Benzine",
                "Diesel",
                "Elektriciteit",
                "Hybride",
                "LPG",
                ...(vehicle?.fuelTypes || []),
              ]),
            ).map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Transmissie
          <select name="transmission" defaultValue={transmission || ""}>
            <option value="">Alle transmissies</option>
            {Array.from(
              new Set([
                "Automaat",
                "Handgeschakeld",
                ...(transmission ? [transmission] : []),
              ]),
            ).map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Plaats
          <input name="location" maxLength={150} placeholder="Alle plaatsen" />
        </label>
        <label>
          Sorteren
          <select name="sort">
            <option value="recent">Recent waargenomen</option>
            <option value="price">Laagste vraagprijs</option>
          </select>
        </label>
        <button className="button" disabled={loading}>
          {loading ? "Aanbod zoeken…" : "Zoek aanbod"}
        </button>
      </form>
      <div aria-live="polite" aria-busy={loading}>
        {loading && (
          <p role="status">Advertenties worden opgehaald en gegroepeerd.</p>
        )}
        {error && (
          <p className="notice" role="alert">
            {error}
          </p>
        )}
        {result && !result.available && (
          <div className="data-section listing-empty">
            <h3>Aanbod niet beschikbaar</h3>
            <p>{result.reason}</p>
            <p>
              De kentekencheck blijft beschikbaar. We tonen pas advertenties
              zodra een actuele bron is aangesloten.
            </p>
          </div>
        )}
        {result?.available && (
          <>
            <p role="status">
              {result.total} {result.total === 1 ? "auto" : "auto’s"} uit{" "}
              {result.advertCount}{" "}
              {result.advertCount === 1 ? "advertentie" : "advertenties"}.{" "}
              {result.updatedAt &&
                `Bron bijgewerkt op ${dateTime(result.updatedAt)}.`}
            </p>
            {result.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
            <p className="listing-explanation">
              Vraagprijzen en kilometerstanden komen uit advertenties en zijn
              niet door ons geverifieerd. Vergelijk ook uitvoering en staat.
              Onzekere duplicaten blijven apart staan.
            </p>
            {!result.total && (
              <p>Geen passend aanbod. Probeer ruimere filters.</p>
            )}
            <div className="listing-grid">
              {result.groups.map((group) => (
                <article className="data-section listing-card" key={group.id}>
                  <h3>
                    {group.listing.make} {group.listing.model}
                  </h3>
                  <p>{group.listing.trim || "Uitvoering niet vermeld"}</p>
                  <strong className="listing-price">
                    {currency(group.listing.price)}
                  </strong>
                  <dl>
                    <div>
                      <dt>Bouwjaar</dt>
                      <dd>{group.listing.year ?? "Niet vermeld"}</dd>
                    </div>
                    <div>
                      <dt>Kilometerstand</dt>
                      <dd>{numeric(group.listing.mileage, "km")}</dd>
                    </div>
                    <div>
                      <dt>Brandstof</dt>
                      <dd>{group.listing.fuel || "Niet vermeld"}</dd>
                    </div>
                    <div>
                      <dt>Transmissie</dt>
                      <dd>{group.listing.transmission || "Niet vermeld"}</dd>
                    </div>
                    <div>
                      <dt>Verkoper</dt>
                      <dd>{group.listing.seller || "Niet vermeld"}</dd>
                    </div>
                    <div>
                      <dt>Plaats</dt>
                      <dd>{group.listing.location || "Niet vermeld"}</dd>
                    </div>
                  </dl>
                  <details className="listing-sources">
                    <summary>
                      {group.offers.length} bronadvertentie
                      {group.offers.length === 1 ? "" : "s"}
                    </summary>
                    {group.matchReasons.length > 0 && (
                      <p>
                        Gegroepeerd op basis van:{" "}
                        {group.matchReasons.join(", ").toLowerCase()}.
                      </p>
                    )}
                    <ul>
                      {group.offers.map((offer, index) => (
                        <li key={`${offer.source}:${offer.sourceId}:${index}`}>
                          <a
                            href={offer.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Bekijk op ${offer.source}, opent in een nieuw tabblad`}
                          >
                            Bekijk op {offer.source}
                            <span aria-hidden="true"> ↗</span>
                          </a>
                          <span>
                            {currency(offer.price)} ·{" "}
                            {numeric(offer.mileage, "km")}
                          </span>
                          <small>
                            Waargenomen op {dateTime(offer.observedAt)}
                          </small>
                        </li>
                      ))}
                    </ul>
                  </details>
                </article>
              ))}
            </div>
            {result.total > result.pageSize && (
              <nav
                className="listing-pagination"
                aria-label="Resultaatpagina’s"
              >
                <button
                  className="button button-secondary"
                  disabled={loading || result.page === 1}
                  onClick={() => void search(result.page - 1)}
                >
                  Vorige
                </button>
                <span>
                  Pagina {result.page} van{" "}
                  {Math.ceil(result.total / result.pageSize)}
                </span>
                <button
                  className="button button-secondary"
                  disabled={
                    loading || result.page * result.pageSize >= result.total
                  }
                  onClick={() => void search(result.page + 1)}
                >
                  Volgende
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </section>
  );
}
