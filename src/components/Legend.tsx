"use client";

import { useState } from "react";
import { ROAD_STYLE, PLACE_CATEGORIES } from "@/lib/layers";

export function Legend() {
  const [open, setOpen] = useState(true);
  return (
    <section className="rounded-xl border border-line bg-white shadow-panel">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-faint"
      >
        Legend
        <span className="text-ink-faint">{open ? "–" : "+"}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-line px-3 py-2.5 text-xs">
          <div>
            <p className="mb-1 font-medium text-ink-soft">Roads</p>
            <ul className="space-y-1">
              {Object.entries(ROAD_STYLE)
                .filter(([k]) => ["highway", "major", "connector", "local"].includes(k))
                .map(([k, s]) => (
                  <li key={k} className="flex items-center gap-2">
                    <span
                      className="inline-block h-1 w-6 rounded-full"
                      style={{ background: s.color, height: Math.max(2, s.width) }}
                    />
                    <span className="text-ink-faint">{s.label}</span>
                  </li>
                ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 font-medium text-ink-soft">Important places</p>
            <ul className="grid grid-cols-2 gap-1">
              {Object.entries(PLACE_CATEGORIES).map(([k, v]) => (
                <li key={k} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full border border-white"
                    style={{ background: v.color, boxShadow: "0 0 0 1px #cbd5e1" }}
                  />
                  <span className="text-ink-faint">{v.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#dc2626] ring-1 ring-[#cbd5e1]" />
            <span className="text-ink-faint">Bridge (seed / added)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-6 rounded-full bg-[#475569]" />
            <span className="text-ink-faint">Railway</span>
          </div>
        </div>
      )}
    </section>
  );
}
