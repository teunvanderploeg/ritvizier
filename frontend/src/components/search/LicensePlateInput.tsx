"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, X, AlertCircle } from "lucide-react";
import { plateSchema, formatPlate } from "@/lib/plates";
export function LicensePlateInput({ compact = false }: { compact?: boolean }) {
  const [value, setValue] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const router = useRouter();
  function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    const result = plateSchema.safeParse(value);
    if (!result.success) { setError(result.error.issues[0].message); return; }
    setBusy(true); setError(""); router.push(`/auto/${formatPlate(result.data)}`);
  }
  return <form onSubmit={submit} className={`search-form ${compact ? "search-compact" : ""}`} id={compact ? undefined : "kenteken"} noValidate>
    {!compact && <label htmlFor="plate-input">Van welke auto wil je meer weten?</label>}
    <div className="search-controls"><div className="plate-input-wrap"><div className="nl-strip" aria-hidden="true"><span className="eu-stars">✦</span>NL</div>
      <input id={compact ? "compact-plate-input" : "plate-input"} aria-label="Kenteken" aria-invalid={!!error} aria-describedby={error ? "plate-error" : undefined} value={value} onChange={e => { setValue(e.target.value.toUpperCase()); setError(""); }} onBlur={() => { if (plateSchema.safeParse(value).success) setValue(formatPlate(value)); }} placeholder="AB-123-C" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={12}/>
      {value && <button type="button" className="icon-button clear-plate" aria-label="Kenteken wissen" onClick={() => { setValue(""); setError(""); document.getElementById(compact ? "compact-plate-input" : "plate-input")?.focus(); }}><X size={18}/></button>}
    </div><button className="button search-button" disabled={busy}>{busy ? "Gegevens ophalen…" : compact ? "Zoeken" : "Kenteken controleren"}<ArrowRight size={19}/></button></div>
    {error && <p className="form-error" id="plate-error" role="alert"><AlertCircle size={17}/>{error}</p>}
  </form>;
}
