import { ListingSearch } from "@/features/listings/ListingSearch";

export const metadata = {
  title: "Autoaanbod zoeken",
  alternates: { canonical: "/aanbod" },
};

export default function ListingsPage() {
  return (
    <div className="container inner-page">
      <span className="eyebrow">NEDERLANDS AUTOAANBOD</span>
      <h1>Vind en vergelijk autoaanbod.</h1>
      <ListingSearch />
    </div>
  );
}
