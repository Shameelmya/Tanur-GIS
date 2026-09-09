"use client";

import { useMemo, useRef, useState } from "react";
import type { FeatureCollection } from "geojson";
import { LAYERS } from "@/lib/layers";
import type { GeoFeature, LayerId, Selection } from "@/lib/types";

interface Row {
  label: string;
  sublabel: string;
  layer: LayerId;
  feature: GeoFeature;
}

const SEARCHABLE: LayerId[] = ["roads", "bridges", "places", "wards", "local_bodies"];

export function SearchBar({
  collections,
  onPick,
}: {
  collections: Record<LayerId, FeatureCollection>;
  onPick: (s: Selection) => void;
}) {
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const index = useMemo<Row[]>(() => {
    const rows: Row[] = [];
    for (const layerId of SEARCHABLE) {
      const fc = collections[layerId];
      if (!fc) continue;
      const cfg = LAYERS.find((l) => l.id === layerId)!;
      const seen = new Set<string>();
      for (const f of fc.features as GeoFeature[]) {
        const p = f.properties;
        let label = "";
        let sub = cfg.label;
        if (layerId === "roads") {
          if (!p.named) continue;
          label = String(p.name);
          if (seen.has(label)) continue;
          seen.add(label);
          sub = p.ref ? `Road · ${p.ref}` : "Road";
        } else if (layerId === "bridges") {
          if (!p.named) continue;
          label = String(p.name);
          sub = "Bridge";
        } else if (layerId === "places") {
          label = String(p.name);
          sub = String(p.subtype || "Place");
        } else if (layerId === "wards") {
          label = `${p.local_body} — Ward ${p.ward_no}${p.ward_name ? ` (${p.ward_name})` : ""}`;
          sub = "Ward";
        } else if (layerId === "local_bodies") {
          label = String(p.name);
          sub = p.type === "municipality" ? "Municipality" : "Grama Panchayat";
        }
        if (!label) continue;
        rows.push({ label, sublabel: sub, layer: layerId, feature: f });
      }
    }
    return rows;
  }, [collections]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    return index
      .filter((r) => r.label.toLowerCase().includes(term))
      .sort((a, b) => a.label.toLowerCase().indexOf(term) - b.label.toLowerCase().indexOf(term))
      .slice(0, 12);
  }, [q, index]);

  const choose = (r: Row) => {
    onPick({ layer: r.layer, feature: r.feature });
    setQ("");
    setFocus(false);
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-muted px-3 py-1.5 focus-within:border-brand focus-within:bg-white">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-faint" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
            if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
            if (e.key === "Enter" && results[active]) choose(results[active]);
            if (e.key === "Escape") setFocus(false);
          }}
          placeholder="Search roads, wards, schools, bridges…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink-faint"
        />
      </div>
      {focus && results.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-40 mt-1 max-h-80 overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-panel panel-scroll">
          {results.map((r, i) => (
            <li key={`${r.layer}-${r.label}-${i}`}>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(r)}
                className={`flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm ${
                  i === active ? "bg-brand-light" : "hover:bg-surface-muted"
                }`}
              >
                <span className="truncate text-ink">{r.label}</span>
                <span className="shrink-0 text-[11px] text-ink-faint">{r.sublabel}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {focus && q.trim().length >= 2 && results.length === 0 && (
        <div className="absolute inset-x-0 top-full z-40 mt-1 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink-faint shadow-panel">
          No matches for “{q}”.
        </div>
      )}
    </div>
  );
}
