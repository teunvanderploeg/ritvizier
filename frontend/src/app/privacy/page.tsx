import Link from "next/link";
export const metadata = {
  title: "Privacy",
  description:
    "Lees hoe RitVizier omgaat met kentekenzoekopdrachten en lokale browseropslag. Zonder account, advertentietrackers of analytische cookies.",
  alternates: { canonical: "/privacy" },
};
export default function PrivacyPage() {
  return (
    <article className="container prose-page">
      <h1>Privacy</h1>
      <p>
        RitVizier werkt zonder account. We gebruiken geen advertentietrackers of
        analytische cookies.
      </p>
      <h2>Wat staat er op je apparaat?</h2>
      <p>
        Recente zoekopdrachten, opgeslagen auto’s, je vergelijking en je
        themavoorkeur worden lokaal in je browser bewaard. Je kunt recente
        zoekopdrachten wissen via <Link href="/opgeslagen">Opgeslagen</Link>. Je
        kunt alle lokale gegevens verwijderen via de instellingen van je
        browser.
      </p>
      <h2>Wat versturen we bij een zoekopdracht?</h2>
      <p>
        Het ingevoerde kenteken gaat via onze backend naar RDW Open Data.
        Voertuiggegevens kunnen tijdelijk worden opgeslagen zodat dezelfde
        informatie niet steeds opnieuw hoeft te worden opgehaald. De server
        gebruikt het IP-adres van de verbinding om te veel aanvragen tegen te
        houden.
      </p>
      <h2>Geen gegevens van eigenaren</h2>
      <p>
        We tonen openbare voertuiggegevens. We hebben geen namen, adressen of
        andere persoonsgegevens van voertuigeigenaren. Een kentekencheck geeft
        geen inzicht in private schade- of onderhoudshistorie.
      </p>
      <h2>Een kostenberekening</h2>
      <p>
        De waarden die je invult worden naar onze backend gestuurd om de
        inschatting te berekenen. Ze worden niet in een gebruikersprofiel
        opgeslagen.
      </p>
      <h2>Externe bronnen</h2>
      <p>
        Als je een externe link opent, bijvoorbeeld naar de RDW of
        Belastingdienst, gelden de privacyregels van die website.
      </p>
    </article>
  );
}
