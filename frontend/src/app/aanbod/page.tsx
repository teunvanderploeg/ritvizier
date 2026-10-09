import { ListingSearch } from "@/features/listings/ListingSearch";

export const metadata = {
  title: "Autoaanbod zoeken",
  description:
    "Zoek in het beschikbare geïmporteerde autoaanbod met filters voor merk, prijs en bouwjaar. Advertenties zijn alleen beschikbaar met een actuele aanbodbron.",
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
