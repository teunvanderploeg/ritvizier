import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-top">
        <BrandLogo />
        <div className="footer-links">
          <Link href="/over">Over RitVizier</Link>
          <Link href="/privacy">Privacy</Link>
          <a href="https://opendata.rdw.nl/" target="_blank" rel="noreferrer">
            Open voertuigdata <ArrowUpRight size={14} />
          </a>
        </div>
        <span>© {new Date().getFullYear()} RitVizier</span>
      </div>
    </footer>
  );
}
