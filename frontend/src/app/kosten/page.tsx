import { CostEstimator } from "@/features/ownership-costs/CostEstimator";
export const metadata = {
  title: "Autokosten berekenen",
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
