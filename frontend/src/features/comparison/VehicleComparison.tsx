"use client";
import { useState } from "react";
import Link from "next/link";
import { Columns2, Plus, X, ArrowRight, Info } from "lucide-react";
import { useCollection } from "@/components/search/RecentSearches";
import { LicensePlateBadge } from "@/components/search/LicensePlateBadge";
import { plateSchema, formatPlate } from "@/lib/plates";
import { fetchVehicle } from "@/lib/api";
import { addVehicle, writeVehicles } from "@/lib/storage";
import { currency, date, fuelLabel, numeric, titleCase } from "@/lib/formatting";
import type { Vehicle } from "@/types/vehicle";
const metrics: { label: string; format: (vehicle: Vehicle) => string }[] = [
  { label: "Bouwjaar", format: v => v.firstRegistrationDate?.slice(0,4) || "Niet beschikbaar" },
  { label: "Brandstof", format: v => fuelLabel(v.fuelTypes) },
  { label: "Vermogen", format: v => numeric(v.powerKw, "kW") },
  { label: "Vermogen in pk (berekend)", format: v => numeric(v.powerHp, "pk") },
  { label: "Gewicht leeg", format: v => numeric(v.massKg, "kg") },
  { label: "CO₂-uitstoot", format: v => numeric(v.emissionsCo2, "g/km") },
  { label: "APK geldig tot", format: v => date(v.apkExpiryDate) },
  { label: "Catalogusprijs", format: v => currency(v.catalogPrice) },
  { label: "Lengte", format: v => numeric(v.lengthCm, "cm") },
  { label: "Breedte", format: v => numeric(v.widthCm, "cm") },
  { label: "Trekgewicht geremd", format: v => numeric(v.towingBrakedKg, "kg") },
  { label: "Zitplaatsen", format: v => numeric(v.numberOfSeats) },
];
export function VehicleComparison() {
  const vehicles = useCollection("comparison"); const favourites = useCollection("favourites");
  const [input, setInput] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return;
    if (vehicles.length >= 3) { setError("Je kunt maximaal drie auto’s vergelijken. Verwijder eerst een auto."); return; }
    const result = plateSchema.safeParse(input);
    if (!result.success) { setError(result.error.issues[0].message); return; }
    if (vehicles.some(v => v.licensePlate === result.data)) { setError("Deze auto staat al in je vergelijking."); return; }
    setBusy(true); setError("");
    try { const vehicle = await fetchVehicle(result.data); if (!addVehicle("comparison", vehicle)) throw new Error("Opslaan lukt niet. Controleer de lokale opslag van je browser."); setInput(""); }
    catch(e) { setError(e instanceof Error ? e.message : "De voertuiggegevens zijn tijdelijk niet beschikbaar."); }
    finally { setBusy(false); }
  }
  function addSaved(vehicle: Vehicle) { if (vehicles.length >= 3) { setError("Je kunt maximaal drie auto’s vergelijken."); return; } if (!addVehicle("comparison", vehicle)) setError("Opslaan lukt niet. Controleer de lokale opslag van je browser."); }
  function remove(plate: string) { if (!writeVehicles("comparison", vehicles.filter(v => v.licensePlate !== plate))) setError("Verwijderen lukt niet. Controleer de lokale opslag van je browser."); }
  return <><div className="comparison-search"><form onSubmit={submit}><label htmlFor="compare-plate">Voeg een auto toe</label><div><input id="compare-plate" aria-label="Kenteken voor vergelijking" placeholder="AB-123-C" value={input} onChange={e => { setInput(e.target.value.toUpperCase()); setError(""); }} maxLength={12} autoCapitalize="characters" spellCheck={false}/><button className="button" disabled={busy || vehicles.length >= 3}><Plus size={17}/>{busy ? "Ophalen…" : "Toevoegen"}</button></div></form><span className="comparison-count">{vehicles.length} van 3 auto’s</span></div>{error && <p role="alert" className="form-error">{error}</p>}
    {favourites.some(f => !vehicles.some(v => f.licensePlate === v.licensePlate)) && vehicles.length < 3 && <div className="saved-suggestions"><span>Uit je opgeslagen auto’s</span>{favourites.filter(f => !vehicles.some(v => f.licensePlate === v.licensePlate)).slice(0,4).map(v => <button key={v.licensePlate} className="button button-secondary" onClick={() => addSaved(v)}><Plus size={14}/>{formatPlate(v.licensePlate)}</button>)}</div>}
    {vehicles.length ? <><div className="comparison-grid" style={{ "--vehicle-count": vehicles.length } as React.CSSProperties}>{vehicles.map(v => <article className="comparison-vehicle" key={v.licensePlate}><div className="comparison-vehicle-title"><div><span className="eyebrow">{v.make}</span><h2>{titleCase(v.model)}</h2><LicensePlateBadge plate={v.licensePlate} small/></div><button className="icon-button" aria-label={`Verwijder ${formatPlate(v.licensePlate)} uit vergelijking`} onClick={() => remove(v.licensePlate)}><X size={19}/></button></div><dl>{metrics.map(({ label, format }) => <div className="comparison-metric" key={label}><dt>{label}</dt><dd>{format(v)}</dd></div>)}</dl><Link className="library-open" href={`/auto/${formatPlate(v.licensePlate)}`}>Alle voertuiggegevens <ArrowRight size={16}/></Link></article>)}</div>{vehicles.length === 1 && <p className="comparison-hint"><Info size={17}/>Voeg nog een auto toe om de verschillen te bekijken.</p>}<p className="local-storage-note">Gebaseerd op de laatst opgehaalde RDW-gegevens per auto. Open een voertuigpagina voor actuele informatie. Kosten hangen af van je eigen aannames. Bereken ze per voertuig via het tabblad Kosten.</p></> : <div className="empty-state"><div className="feature-icon blue"><Columns2 size={28}/></div><h2>Welke auto past bij jou?</h2><p>Voeg twee of drie kentekens toe. Vergelijk vermogen, gewicht, APK en andere specificaties overzichtelijk naast elkaar.</p><div className="comparison-empty-art" aria-hidden="true"><div>A</div><span>of</span><div>B</div></div></div>}
  </>;
}
