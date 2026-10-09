import Link from "next/link";
import mark from "./mark.json";
export function BrandMark() {
  return (
    <svg viewBox={mark.viewBox} fill="none" aria-hidden="true">
      <path d={mark.shape} fill="currentColor" fillRule="evenodd" />
      <path
        d={mark.road}
        stroke="#f7cd4a"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function BrandLogo() {
  return (
    <Link
      href="/"
      className="brand"
      aria-label="RitVizier, naar de startpagina"
    >
      <BrandMark />
      <span>RitVizier</span>
    </Link>
  );
}
