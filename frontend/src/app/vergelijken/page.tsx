import { VehicleComparison } from "@/features/comparison/VehicleComparison";
export const metadata = {
  title: "Auto’s vergelijken",
  alternates: { canonical: "/vergelijken" },
};
export default function ComparePage() {
  return (
    <section className="container inner-page">
      <h1>Auto’s vergelijken</h1>
      <p className="page-description">
        Bekijk de specificaties van maximaal drie auto’s naast elkaar.
      </p>
      <VehicleComparison />
    </section>
  );
}
