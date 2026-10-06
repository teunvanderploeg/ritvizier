import Link from "next/link";
export default function NotFound() { return <section className="container error-state"><span className="eyebrow">404</span><h1>Deze afslag bestaat niet.</h1><p>De pagina die je zoekt is niet gevonden.</p><Link href="/" className="button">Terug naar de kentekencheck</Link></section>; }
