import { CostEstimator } from "@/features/ownership-costs/CostEstimator";
export const metadata = {
  title: "Autokosten berekenen",
  description:
    "Bereken je autokosten per maand en per jaar met jouw kilometers, brandstofkosten, verzekering en onderhoud. Wegenbelasting voor ondersteunde auto's.",
  alternates: { canonical: "/kosten" },
};
export default function CostsPage() {
  return (
    <section className="container inner-page">
      <h1>Autokosten berekenen</h1>
      <p className="page-description">
        Bereken je maandlasten met jouw kilometers en vaste lasten.
      </p>
      <CostEstimator />
    </section>
  );
}
