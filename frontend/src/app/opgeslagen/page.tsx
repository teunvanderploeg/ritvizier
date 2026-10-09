import { VehicleLibrary } from "@/features/favourites/VehicleLibrary";
export const metadata = {
  title: "Opgeslagen auto’s",
  robots: { index: false },
  alternates: { canonical: "/opgeslagen" },
};
export default function SavedPage() {
  return (
    <section className="container inner-page">
      <h1>Opgeslagen auto’s</h1>
      <p className="page-description">
        Favorieten en recente zoekopdrachten op dit apparaat.
      </p>
      <VehicleLibrary />
    </section>
  );
}
