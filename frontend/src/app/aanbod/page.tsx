import { ListingSearch } from "@/features/listings/ListingSearch";

export const metadata = {
  title: "Autoaanbod zoeken",
  alternates: { canonical: "/aanbod" },
};

export default function ListingsPage() {
  return (
    <div className="container inner-page">
      <h1>Autoaanbod</h1>
      <ListingSearch />
    </div>
  );
}
