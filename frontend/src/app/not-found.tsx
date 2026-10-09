import Link from "next/link";
export default function NotFound() {
  return (
    <section className="container error-state">
      <h1>Pagina niet gevonden</h1>
      <p>De pagina die je zoekt is niet gevonden.</p>
      <Link href="/" className="button">
        Terug naar de kentekencheck
      </Link>
    </section>
  );
}
