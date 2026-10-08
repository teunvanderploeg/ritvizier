"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Search, Bookmark, Columns2 } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
export function Header() {
  const path = usePathname();
  const links = [
    { href: "/", label: "Kentekencheck", icon: Search },
    { href: "/aanbod", label: "Autoaanbod", icon: Search },
    { href: "/vergelijken", label: "Vergelijken", icon: Columns2 },
    { href: "/opgeslagen", label: "Opgeslagen", icon: Bookmark },
  ];
  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <BrandLogo />
          <nav className="desktop-nav" aria-label="Hoofdnavigatie">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  path === link.href ||
                  (link.href === "/" && path.startsWith("/auto/"))
                    ? "active"
                    : ""
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <ThemeToggle />
            <Link className="button header-cta" href="/#kenteken">
              Check je kenteken <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>
      <nav className="mobile-nav" aria-label="Mobiele navigatie">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={path === href ? "active" : ""}
          >
            <Icon size={19} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
