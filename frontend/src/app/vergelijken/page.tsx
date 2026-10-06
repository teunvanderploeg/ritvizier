import { VehicleComparison } from "@/features/comparison/VehicleComparison";
export const metadata = { title: "Auto’s vergelijken", alternates: { canonical: "/vergelijken" } };
export default function ComparePage() { return <section className="container inner-page"><span className="eyebrow">DE JUISTE KEUZE</span><h1>Zet je opties naast elkaar.</h1><p className="page-description">Vergelijk tot drie auto’s op de gegevens die er voor jou toe doen.</p><VehicleComparison/></section>; }
