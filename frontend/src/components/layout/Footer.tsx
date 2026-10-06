import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-top">
        <div>
          <BrandLogo />
          <p>Alles over je auto. Helder in beeld.</p>
        </div>
        <div className="footer-links">
          <Link href="/over">Over RitVizier</Link>
          <Link href="/privacy">Privacy</Link>
          <a href="https://opendata.rdw.nl/" target="_blank" rel="noreferrer">
            RDW Open Data <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} RitVizier</span>
        <span>Gemaakt voor de weg vooruit.</span>
      </div>
    </footer>
  );
}
