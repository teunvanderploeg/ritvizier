import Link from "next/link";
import {
  ArrowRight,
  Check,
  ShieldCheck,
  FileText,
  CalendarCheck2,
  Coins,
  Columns2,
  ArrowUpRight,
  LockKeyhole,
} from "lucide-react";
import { LicensePlateInput } from "@/components/search/LicensePlateInput";
import { RecentSearches } from "@/components/search/RecentSearches";
import { VehiclePreview } from "@/components/vehicle/VehiclePreview";
export const metadata = { alternates: { canonical: "/" } };
export default function Home() {
  return (
    <>
      <section className="container home-hero">
        <div className="hero-copy">
          <div className="intro-pill">
            <span className="status-dot" />
            Je volgende rit begint met inzicht
          </div>
          <h1>
            Ontdek wat er
            <br className="desktop-break" /> achter een
            <br className="desktop-break" /> <span>kenteken zit.</span>
          </h1>
          <p className="hero-description">
            Van APK tot vermogen. Alle openbare autogegevens helder op één plek.
            Zo weet je waar je aan toe bent.
          </p>
          <LicensePlateInput />
          <div className="search-assurances">
            <span>
              <Check size={15} />
              Altijd gratis
            </span>
            <span>
              <Check size={15} />
              Geen account nodig
            </span>
            <span>
              <Check size={15} />
              Officiële RDW-data
            </span>
          </div>
          <RecentSearches />
        </div>
        <VehiclePreview />
      </section>
      <div className="container trust-strip">
        <div>
          <ShieldCheck size={24} />
          <span>
            <strong>Een goed begin. Een betrouwbare bron.</strong>
            <span>Voertuiggegevens rechtstreeks uit RDW Open Data.</span>
          </span>
        </div>
        <Link href="/over#bronnen">
          Zo komen we aan onze gegevens <ArrowUpRight size={16} />
        </Link>
      </div>
      <section className="container insight-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">MINDER ZOEKEN. MEER WETEN.</span>
            <h2>Je auto, zonder de vraagtekens.</h2>
          </div>
          <p>
            Handig als je een auto koopt.
            <br />
            Net zo handig als je er al één hebt.
          </p>
        </div>
        <div className="feature-grid">
          {[
            {
              icon: FileText,
              title: "Alles onder de motorkap",
              text: "Van brandstof en vermogen tot gewicht en trekvermogen. De specificaties, met uitleg die je begrijpt.",
              className: "blue",
            },
            {
              icon: CalendarCheck2,
              title: "Grip op APK & registratie",
              text: "Zie de APK-datum, eerste toelating en of een auto is geïmporteerd. Gewoon op basis van openbare data.",
              className: "teal",
            },
            {
              icon: Coins,
              title: "Weet wat je rijdt",
              text: "Krijg inzicht in je maandelijkse autokosten. Pas kilometers en andere aannames aan jouw situatie aan.",
              className: "amber",
            },
          ].map(({ icon: Icon, title, text, className }) => (
            <article key={title} className="feature-item">
              <div className={`feature-icon ${className}`}>
                <Icon size={23} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="container tools-section" aria-label="Meer inzicht">
        <Link href="/vergelijken" className="tool-panel compare-panel">
          <div className="panel-top">
            <Columns2 size={24} />
            <span>DE JUISTE KEUZE</span>
            <ArrowUpRight size={22} />
          </div>
          <h2>
            Twee auto’s.
            <br />
            Eén helder vergelijk.
          </h2>
          <p>
            Zet de verschillen naast elkaar.
            <br />
            En ontdek welke auto bij je past.
          </p>
          <span className="panel-link">
            Auto’s vergelijken <ArrowRight size={17} />
          </span>
          <div className="comparison-art" aria-hidden="true">
            <div>
              <span>A</span>
              <i />
              <i />
              <i />
            </div>
            <div>
              <span>B</span>
              <i />
              <i />
              <i />
            </div>
          </div>
        </Link>
        <Link href="/kosten" className="tool-panel costs-panel">
          <div className="panel-top">
            <Coins size={24} />
            <span>INZICHT IN JE KOSTEN</span>
            <ArrowUpRight size={22} />
          </div>
          <h2>
            Wat kost jouw auto
            <br />
            écht per maand?
          </h2>
          <p>
            Maak een eigen kosteninschatting.
            <br />
            Geen verrassingen aan het einde van de rit.
          </p>
          <span className="panel-link">
            Bereken je autokosten <ArrowRight size={17} />
          </span>
          <div className="cost-art" aria-hidden="true">
            <span>JOUW MAANDLASTEN</span>
            <div>
              <i />
              <i />
              <i />
              <i />
            </div>
            <span>Een inschatting op basis van jouw invoer</span>
          </div>
        </Link>
      </section>
      <div className="container privacy-note">
        <LockKeyhole size={17} />
        <p>
          Jouw zoekopdrachten blijven van jou. Geen account, geen tracking, geen
          gegevens van eigenaren.
        </p>
        <Link href="/privacy">
          Meer over privacy <ArrowUpRight size={14} />
        </Link>
      </div>
    </>
  );
}
