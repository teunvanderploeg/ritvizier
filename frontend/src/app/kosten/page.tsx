import { CostEstimator } from "@/features/ownership-costs/CostEstimator";
export const metadata = { title: "Autokosten berekenen", alternates: { canonical: "/kosten" } };
export default function CostsPage() { return <section className="container inner-page"><span className="eyebrow">INZICHT IN JE KOSTEN</span><h1>Grip op je maandlasten.</h1><p className="page-description">Een auto kost meer dan brandstof alleen. Maak een kosteninschatting met jouw kilometers en vaste lasten.</p><CostEstimator/></section>; }
