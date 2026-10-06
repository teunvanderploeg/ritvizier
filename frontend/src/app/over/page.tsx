import { ArrowUpRight } from "lucide-react";
export const metadata = {
  title: "Over RitVizier & onze bronnen",
  alternates: { canonical: "/over" },
};
export default function AboutPage() {
  return (
    <article className="container prose-page">
      <span className="eyebrow">OVER RITVIZIER</span>
      <h1>
        Alles over je auto.
        <br />
        Helder in beeld.
      </h1>
      <p>
        Een kenteken is het begin. RitVizier brengt openbare voertuiggegevens
        bij elkaar, met uitleg en hulpmiddelen om auto’s te vergelijken en je
        kosten in te schatten.
      </p>
      <h2 id="bronnen">Waar komen de gegevens vandaan?</h2>
      <p>
        We combineren officiële datasets van RDW Open Data. De
        voertuigregistratie levert onder meer merk, toelating, APK, gewicht en
        afmetingen. De brandstofdataset levert beschikbare motor-, brandstof- en
        emissiegegevens. Aanvullende datasets leveren asgegevens, carrosserie,
        tellerstandtoelichting en gekoppelde terugroepacties. Waar de exacte
        typegoedkeuring, variant en uitvoering overeenkomen, halen we ook
        transmissie en preciezere afmetingen op.
      </p>
      <ul>
        <li>
          <a
            href="https://opendata.rdw.nl/Voertuigen/Open-Data-RDW-Gekentekende_voertuigen/m9d7-ebf2"
            target="_blank"
            rel="noreferrer"
          >
            Gekentekende voertuigen <ArrowUpRight size={14} />
          </a>
        </li>
        <li>
          <a
            href="https://opendata.rdw.nl/Voertuigen/Open-Data-RDW-Gekentekende_voertuigen_brandstof/8ys7-d773"
            target="_blank"
            rel="noreferrer"
          >
            Brandstofgegevens <ArrowUpRight size={14} />
          </a>
        </li>
      </ul>
      <h2>Hoe actueel zijn de gegevens?</h2>
      <p>
        Op iedere voertuigpagina staat wanneer de gegevens zijn opgehaald. We
        bewaren resultaten meestal maximaal zes uur om de openbare API te
        ontlasten. Wijzigingen in het RDW-register zijn daardoor niet altijd
        direct zichtbaar.
      </p>
      <h2>Officiële gegevens en berekeningen</h2>
      <p>
        Paardenkracht wordt omgerekend uit kilowatt. Laadvermogen wordt berekend
        uit massa’s. De importindicatie volgt uit de registratiedatums. Deze
        waarden worden als berekend aangeduid.
      </p>
      <p>
        De kostenberekening is een scenario op basis van jouw invoer. Verbruik
        wordt waar mogelijk vooraf ingevuld met RDW-gegevens. Voor gewone
        personenauto’s berekenen we een wegenbelastingindicatie met massa
        rijklaar, brandstof en jouw woonprovincie, op basis van de
        gecontroleerde tarieftabellen van de Belastingdienst voor juli–december
        2026. Bijzondere tarieven en persoonlijke vrijstellingen vragen een
        aparte controle.
      </p>
      <h2>Wat een kentekencheck je niet vertelt</h2>
      <p>
        Het officiële tellerstandoordeel is beschikbaar, de exacte
        kilometerstand en volledige meetreeks zijn niet openbaar. Commerciële
        optiepakketten, schadehistorie, het aantal eigenaren en
        onderhoudsbewijzen worden niet geleverd door onze gekoppelde bronnen.
      </p>
      <h2>Onafhankelijk</h2>
      <p>RitVizier is een zelfstandig product en geen onderdeel van de RDW.</p>
    </article>
  );
}
