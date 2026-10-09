"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Clock3, X, ArrowUpRight } from "lucide-react";
import { readVehicles, writeVehicles, type Collection } from "@/lib/storage";
import { formatPlate } from "@/lib/plates";
import { titleCase } from "@/lib/formatting";
import { LicensePlateBadge } from "./LicensePlateBadge";
function subscribe(callback: () => void) {
  window.addEventListener("ritvizier:storage", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("ritvizier:storage", callback);
    window.removeEventListener("storage", callback);
  };
}
export function useCollection(collection: Collection) {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(`ritvizier:${collection}`) || "[]";
      } catch {
        return "[]";
      }
    },
    () => "[]",
  );
  return raw === "[]" ? [] : readVehicles(collection);
}
export function RecentSearches() {
  const recent = useCollection("recent");
  if (!recent.length) return null;
  return (
    <section className="recent-searches" aria-label="Recent bekeken">
      <div className="recent-heading">
        <span>
          <Clock3 size={16} />
          Recent bekeken
        </span>
        <button
          className="text-button"
          onClick={() => writeVehicles("recent", [])}
        >
          Geschiedenis wissen
        </button>
      </div>
      <div className="recent-list">
        {recent.slice(0, 3).map((v) => (
          <div className="recent-item" key={v.licensePlate}>
            <Link href={`/auto/${formatPlate(v.licensePlate)}`}>
              <LicensePlateBadge plate={v.licensePlate} small />
              <span>
                {titleCase(v.make)} {titleCase(v.model)}
              </span>
              <ArrowUpRight size={15} />
            </Link>
            <button
              className="icon-button"
              aria-label={`Verwijder ${formatPlate(v.licensePlate)} uit recent bekeken`}
              onClick={() =>
                writeVehicles(
                  "recent",
                  recent.filter((item) => item.licensePlate !== v.licensePlate),
                )
              }
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
