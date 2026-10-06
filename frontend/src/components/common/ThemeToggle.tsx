"use client";
import { useState, useSyncExternalStore } from "react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
type Theme = "light" | "dark" | "system";
function subscribe(callback: () => void) { window.addEventListener("ritvizier:theme", callback); return () => window.removeEventListener("ritvizier:theme", callback); }
function snapshot() { try { return localStorage.getItem("ritvizier:theme") || "system"; } catch { return "system"; } }
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "system");
  const [open, setOpen] = useState(false);
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  function select(value: Theme) {
    try { localStorage.setItem("ritvizier:theme", value); } catch { /* Continue without persistence. */ }
    const dark = value === "dark" || value === "system" && matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    window.dispatchEvent(new Event("ritvizier:theme")); setOpen(false);
  }
  return <div className="theme-control" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
    <button className="icon-button theme-button" aria-label="Kleurthema kiezen" aria-expanded={open} onClick={() => setOpen(!open)}><Icon size={19}/></button>
    {open && <div className="theme-menu" onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}>
      {([['light', 'Licht', Sun], ['dark', 'Donker', Moon], ['system', 'Systeem', Monitor]] as const).map(([value, label, ItemIcon]) =>
        <button key={value} onClick={() => select(value)} aria-pressed={theme === value}><ItemIcon size={17}/>{label}{theme === value && <Check size={15}/>}</button>)}
    </div>}
  </div>;
}
