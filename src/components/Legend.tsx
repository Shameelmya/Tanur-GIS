"use client";

import { useEffect, useState } from "react";
import { ROAD_STYLE, PLACE_CATEGORIES, EXTRA_ICONS } from "@/lib/layers";
import { iconDataUrl } from "@/lib/mapIcons";

/** The exact same pin icon used on the map — rendered client-side (canvas),
 * so it's filled in once mounted rather than during server render. */
function PinSwatch({ icon, color }: { icon: string; color: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => setSrc(iconDataUrl(icon)), [icon]);
  if (!src) {
    return (
      <span
        className="inline-block h-[18px] w-[18px] shrink-0 rounded-full"
        style={{ background: color }}
      />
    );
  }
  return <img src={src} alt="" width={18} height={18} className="shrink-0" />;
}

export function Legend() {
  const [open, setOpen] = useState(true);
  return (
    <section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white/95 shadow-panel backdrop-blur">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-faint"
      >
        Legend
        <span className="text-ink-faint">{open ? "–" : "+"}</span>
      </button>
      {open && (
        <div className="space-y-3.5 border-t border-black/[0.05] px-4 py-3 text-xs">
          <div>
            <p className="mb-1.5 font-medium text-ink-soft">Roads</p>
            <ul className="space-y-1.5">
              {Object.entries(ROAD_STYLE)
                .filter(([k]) => ["highway", "major", "connector", "local"].includes(k))
                .map(([k, s]) => (
                  <li key={k} className="flex items-center gap-2">
                    <span
                      className="inline-block w-6 shrink-0 rounded-full"
                      style={{ background: s.color, height: Math.max(2.5, s.width) }}
                    />
                    <span className="text-ink-faint">{s.label}</span>
                  </li>
                ))}
              <li className="flex items-center gap-2">
                <span className="inline-block h-[3px] w-6 shrink-0 rounded-full bg-[#12B76A]" />
                <span className="text-ink-faint">Selected road</span>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-1.5 font-medium text-ink-soft">Important places</p>
            <ul className="grid grid-cols-2 gap-1.5">
              {Object.values(PLACE_CATEGORIES).map((v) => (
                <li key={v.label} className="flex items-center gap-1.5">
                  <PinSwatch icon={v.icon} color={v.color} />
                  <span className="text-ink-faint">{v.label}</span>
                </li>
              ))}
              {EXTRA_ICONS.map((v) => (
                <li key={v.label} className="flex items-center gap-1.5">
                  <PinSwatch icon={v.icon} color={v.color} />
                  <span className="text-ink-faint">{v.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="rounded-lg bg-surface-muted px-2.5 py-1.5 text-[10.5px] leading-snug text-ink-faint">
            Tip: press and hold a place or bridge marker for 3 seconds to open
            directions in Google Maps.
          </p>
        </div>
      )}
    </section>
  );
}
