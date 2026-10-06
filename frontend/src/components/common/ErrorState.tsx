import Link from "next/link";
import { AlertCircle, ArrowLeft, RotateCcw } from "lucide-react";
import { LicensePlateInput } from "@/components/search/LicensePlateInput";
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <section className="container error-state"><div className="feature-icon amber"><AlertCircle size={25}/></div><h1>Even geen helder beeld.</h1><p role="alert">{message}</p>{onRetry && <button className="button button-secondary" onClick={onRetry}><RotateCcw size={16}/>Opnieuw proberen</button>}<div className="error-search"><LicensePlateInput compact/></div><Link href="/" className="back-link"><ArrowLeft size={16}/>Terug naar de kentekencheck</Link></section>;
}
