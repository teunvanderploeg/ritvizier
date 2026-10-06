import { VehicleLibrary } from "@/features/favourites/VehicleLibrary";
export const metadata = {
  title: "Opgeslagen auto’s",
  robots: { index: false },
  alternates: { canonical: "/opgeslagen" },
};
export default function SavedPage() {
  return (
    <section className="container inner-page">
      <span className="eyebrow">JOUW AUTO’S</span>
      <h1>Bewaar je blikvangers.</h1>
      <p className="page-description">
        Favorieten en recente zoekopdrachten. Gewoon op dit apparaat.
      </p>
      <VehicleLibrary />
    </section>
  );
}
