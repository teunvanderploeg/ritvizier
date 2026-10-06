import Link from "next/link";
import { ArrowUpRight, Check, ShieldCheck, Fuel, Zap, CalendarDays } from "lucide-react";
import { VehicleIllustration } from "@/components/brand/VehicleIllustration";
import { LicensePlateBadge } from "@/components/search/LicensePlateBadge";
export function VehiclePreview() {
  return <div className="hero-visual"><div className="visual-grid"/><div className="visual-orbit orbit-one"/><div className="visual-orbit orbit-two"/>
    <div className="floating-source"><span className="source-check"><ShieldCheck size={17}/></span><div><strong>Rechtstreeks van de RDW</strong><span>Openbare voertuiggegevens</span></div><Check size={16}/></div>
    <Link href="/auto/GZS-88-X" className="vehicle-preview" aria-label="Bekijk de voorbeeldcheck van Volkswagen Golf GZS-88-X">
      <div className="preview-top"><span className="eyebrow">JOUW AUTO IN BEELD</span><ArrowUpRight size={20}/></div>
      <div className="preview-car-scene"><div className="scene-horizon"/><VehicleIllustration/><span className="scene-caption">Illustratie</span></div>
      <div className="preview-vehicle-title"><div><span className="vehicle-make">VOLKSWAGEN</span><h3>Golf</h3></div><LicensePlateBadge plate="GZS88X" small/></div>
      <div className="preview-stats"><div><CalendarDays size={17}/><span>Bouwjaar<strong>2023</strong></span></div><div><Fuel size={17}/><span>Brandstof<strong>Hybride</strong></span></div><div><Zap size={17}/><span>Vermogen<strong>150 pk</strong></span></div></div>
      <div className="preview-bottom"><span className="status-dot"/>Bekijk deze kentekencheck <ArrowUpRight size={15}/></div>
    </Link><div className="floating-apk"><span><Check size={17}/></span><div><strong>APK in één oogopslag</strong><p>Weet wanneer je weer moet keuren.</p></div></div>
    <span className="visual-caption">Een voorproefje van je kentekencheck</span>
  </div>;
}
