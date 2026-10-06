"use client";
import Link from "next/link";
import { useState } from "react";
import { Bookmark, Clock3, ArrowRight, Trash2, Search } from "lucide-react";
import { useCollection } from "@/components/search/RecentSearches";
import { LicensePlateBadge } from "@/components/search/LicensePlateBadge";
import { formatPlate } from "@/lib/plates";
import { titleCase, fuelLabel, numeric } from "@/lib/formatting";
import { writeVehicles } from "@/lib/storage";
export function VehicleLibrary() {
  const [tab, setTab] = useState<"favourites" | "recent">("favourites"); const [notice, setNotice] = useState("");
  const favourites = useCollection("favourites"); const recent = useCollection("recent"); const vehicles = tab === "favourites" ? favourites : recent;
  return <><div className="library-tabs"><button aria-pressed={tab === "favourites"} onClick={() => setTab("favourites")}><Bookmark size={17}/>Opgeslagen <span>{favourites.length}</span></button><button aria-pressed={tab === "recent"} onClick={() => setTab("recent")}><Clock3 size={17}/>Recent bekeken <span>{recent.length}</span></button></div>
    {notice && <p role="alert" className="form-error">{notice}</p>}
    {vehicles.length ? <><div className="library-grid">{vehicles.map(v => <article className="library-vehicle" key={v.licensePlate}><div className="library-vehicle-top"><LicensePlateBadge plate={v.licensePlate} small/><button className="icon-button" aria-label={`Verwijder ${formatPlate(v.licensePlate)}`} onClick={() => { if (!writeVehicles(tab, vehicles.filter(item => item.licensePlate !== v.licensePlate))) setNotice("Verwijderen lukt niet. Controleer de lokale opslag van je browser."); }}><Trash2 size={17}/></button></div><span className="eyebrow">{v.make}</span><h2>{titleCase(v.model)}</h2><p>{v.firstRegistrationDate?.slice(0,4) || "Bouwjaar onbekend"} · {fuelLabel(v.fuelTypes)} · {numeric(v.powerKw, "kW")}</p><Link className="library-open" href={`/auto/${formatPlate(v.licensePlate)}`}>Bekijk voertuig <ArrowRight size={17}/></Link><small>Opgeslagen op dit apparaat. Open voor actuele gegevens.</small></article>)}</div>{tab === "recent" && <button className="text-button" onClick={() => { if (!writeVehicles("recent", [])) setNotice("Wissen lukt niet. Controleer de lokale opslag van je browser."); }}>Alle recente zoekopdrachten wissen</button>}</> : <div className="empty-state"><div className="feature-icon blue">{tab === "favourites" ? <Bookmark size={26}/> : <Clock3 size={26}/>}</div><h2>{tab === "favourites" ? "Je favoriete auto’s, bij elkaar." : "Hier vind je je vorige checks."}</h2><p>{tab === "favourites" ? "Sla een auto op vanuit de kentekencheck. Je vindt hem hier terug, zonder een account aan te maken." : "Na een kentekencheck kun je het voertuig hier eenvoudig opnieuw openen."}</p><Link className="button" href="/#kenteken"><Search size={17}/>Zoek een kenteken</Link></div>}
    <p className="local-storage-note">Deze lijst staat alleen in je browser. Als je browsergegevens wist of een ander apparaat gebruikt, is de lijst daar niet beschikbaar.</p></>;
}
