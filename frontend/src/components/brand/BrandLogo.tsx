import Link from "next/link";
export function BrandMark() {
  return <svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><rect width="40" height="40" rx="11" fill="currentColor"/><path d="M8 12h7l5 12 5-12h7L21.8 31h-3.6L8 12Z" fill="white"/><path d="m19 9 1 3 1-3h-2Z" fill="#B9C9FF"/><path d="m19.3 15 .7 2 .7-2h-1.4Z" fill="#2457F5"/></svg>;
}
export function BrandLogo() { return <Link href="/" className="brand" aria-label="RitVizier, naar de startpagina"><BrandMark/><span>Rit<span className="brand-light">Vizier</span><span className="brand-dot">.</span></span></Link>; }
