import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  Columns2,
  Calculator,
  Gauge,
  CalendarCheck2,
  Wallet,
} from "lucide-react";
import { LicensePlateInput } from "@/components/search/LicensePlateInput";
import { RecentSearches } from "@/components/search/RecentSearches";
import styles from "./page.module.css";

export const metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <div className={styles.home}>
      <section className={`container ${styles.hero}`}>
        <div className={styles.copy}>
          <h1>
            Check je
            <br />
            kenteken.
          </h1>
          <p className={styles.description}>
            Bekijk de specificaties, APK en kosten van je auto.
          </p>
          <div className={styles.search}>
            <LicensePlateInput />
            <p className={styles.note}>Gratis en zonder account.</p>
            <RecentSearches />
          </div>
        </div>
        <div className={styles.visual} aria-hidden="true">
          <Image
            src="/images/hero-car.webp"
            alt=""
            fill
            sizes="(min-width: 900px) 50vw, 100vw"
            loading="eager"
            className={styles.car}
          />
        </div>
      </section>

      <section
        className={`container ${styles.details}`}
        aria-label="Wat je kunt bekijken"
      >
        <div className={styles.facts}>
          <div>
            <Gauge size={23} aria-hidden="true" />
            <h2>Voertuiggegevens</h2>
            <p>Van brandstof en vermogen tot trekgewicht.</p>
          </div>
          <div>
            <CalendarCheck2 size={23} aria-hidden="true" />
            <h2>APK & historie</h2>
            <p>Keuringsmeldingen, registratie en terugroepacties.</p>
          </div>
          <div>
            <Wallet size={23} aria-hidden="true" />
            <h2>Autokosten</h2>
            <p>Een inschatting met jouw kilometers en vaste lasten.</p>
          </div>
        </div>
        <p className={styles.source}>
          Gebaseerd op openbare RDW-gegevens.
          <Link href="/over#bronnen">Over onze bronnen</Link>
        </p>
      </section>

      <nav
        className={`container ${styles.tools}`}
        aria-label="Meer hulpmiddelen"
      >
        <Link href="/vergelijken" className={styles.tool}>
          <Columns2 size={22} aria-hidden="true" />
          <div>
            <h2>Auto’s vergelijken</h2>
            <p>Tot drie kentekens naast elkaar.</p>
          </div>
          <ArrowUpRight size={19} aria-hidden="true" />
        </Link>
        <Link href="/kosten" className={styles.tool}>
          <Calculator size={22} aria-hidden="true" />
          <div>
            <h2>Autokosten berekenen</h2>
            <p>Wat ben je per maand kwijt?</p>
          </div>
          <ArrowUpRight size={19} aria-hidden="true" />
        </Link>
      </nav>
    </div>
  );
}
