"use client";

import type { FeatureCollection } from "geojson";
import { LAYERS, LOCAL_BODY_COLORS } from "@/lib/layers";
import type { LayerId } from "@/lib/types";

export function LayerPanel({
  visibility,
  onToggle,
  manifestLayers,
  zoom,
  localBodyBorderOnly,
  onToggleBorderOnly,
}: {
  visibility: Record<LayerId, boolean>;
  onToggle: (id: LayerId) => void;
  manifestLayers: Record<LayerId, FeatureCollection>;
  zoom: number;
  localBodyBorderOnly: boolean;
  onToggleBorderOnly: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white/95 shadow-panel backdrop-blur">
      <h2 className="px-4 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-faint">
        Map layers
      </h2>
      <ul>
        {LAYERS.map((l) => {
          const count = manifestLayers[l.id]?.features?.length ?? 0;
          const on = visibility[l.id];
          const dim = on && zoom < l.minZoom - 0.5;
          return (
            <li key={l.id} className="border-t border-black/[0.05] first:border-t-0">
              <label className="flex cursor-pointer items-start gap-3 px-4 py-2.5 transition-colors hover:bg-black/[0.02]">
                <Toggle checked={on} onChange={() => onToggle(l.id)} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]"
                      style={{ background: l.legendColor }}
                    />
                    <span className="text-[13px] font-medium text-ink">{l.label}</span>
                    <span className="ml-auto text-[11px] tabular-nums text-ink-faint">{count}</span>
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-ink-faint">
                    {dim ? (
                      <span className="text-amber-600">Zoom in to display</span>
                    ) : (
                      l.description
                    )}
                  </span>

                  {l.id === "local_bodies" && on && (
                    <span className="mt-2 block" onClick={(e) => e.preventDefault()}>
                      <span className="mb-1.5 flex flex-wrap gap-x-2.5 gap-y-1">
                        {Object.entries(LOCAL_BODY_COLORS).map(([id, c]) => (
                          <span key={id} className="flex items-center gap-1 text-[10px] text-ink-faint">
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ background: c }}
                            />
                            {labelFor(id)}
                          </span>
                        ))}
                      </span>
                      <button
                        onClick={onToggleBorderOnly}
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                          localBodyBorderOnly
                            ? "border-brand bg-brand-light text-brand-dark"
                            : "border-black/10 text-ink-soft hover:bg-black/[0.03]"
                        }`}
                      >
                        {localBodyBorderOnly ? "Showing borders only" : "Show borders only"}
                      </button>
                    </span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function labelFor(id: string) {
  return (
    {
      tanur: "Tanur",
      ozhur: "Ozhur",
      ponmundam: "Ponmundam",
      tanalur: "Thanaloor",
      niramaruthoor: "Niramaruthoor",
      cheriyamundam: "Cheriyamundam",
    } as Record<string, string>
  )[id] ?? id;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        e.preventDefault();
        onChange();
      }}
      className={`mt-0.5 flex h-[22px] w-[38px] shrink-0 items-center rounded-full px-[2px] transition-colors ${
        checked ? "bg-brand" : "bg-black/15"
      }`}
    >
      <span
        className={`h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-[16px]" : "translate-x-0"
        }`}
      />
    </button>
  );
}
