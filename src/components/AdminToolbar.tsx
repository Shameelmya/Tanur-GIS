"use client";

import { useRef, useState } from "react";
import type { DrawState } from "@/components/MapView";
import { parseLatLng } from "@/lib/geo";
import { parseKmlLineString } from "@/lib/kml";
import type { EditableLayer } from "@/lib/types";

const ACTIONS: { mode: "point" | "line"; layer: EditableLayer; label: string }[] = [
  { mode: "line", layer: "roads", label: "Add road" },
  { mode: "point", layer: "bridges", label: "Add bridge" },
  { mode: "point", layer: "places", label: "Add place" },
];

const COORD_LAYERS: { layer: EditableLayer; label: string }[] = [
  { layer: "places", label: "Place" },
  { layer: "bridges", label: "Bridge" },
];

export function AdminToolbar({
  activeDraw,
  onStartDraw,
  onFinishLine,
  onUndoVertex,
  onCancel,
  onAddAtCoordinates,
  onAddRoadFromKml,
}: {
  activeDraw: DrawState | null;
  onStartDraw: (mode: "point" | "line", layer: EditableLayer) => void;
  onFinishLine: () => void;
  onUndoVertex: () => void;
  onCancel: () => void;
  onAddAtCoordinates: (layer: EditableLayer, lat: number, lng: number) => void;
  onAddRoadFromKml: (coordinates: [number, number][], name: string | null) => void;
}) {
  const [coordLayer, setCoordLayer] = useState<EditableLayer>("places");
  const [coordText, setCoordText] = useState("");
  const [coordError, setCoordError] = useState<string | null>(null);
  const [kmlError, setKmlError] = useState<string | null>(null);
  const kmlInputRef = useRef<HTMLInputElement>(null);

  function submitCoordinates() {
    const parsed = parseLatLng(coordText);
    if (!parsed) {
      setCoordError("Paste coordinates like 11.0021, 75.8734");
      return;
    }
    setCoordError(null);
    setCoordText("");
    onAddAtCoordinates(coordLayer, parsed.lat, parsed.lng);
  }

  async function handleKmlFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    const parsed = parseKmlLineString(text);
    if (!parsed) {
      setKmlError("No road line found in that KML file.");
      return;
    }
    setKmlError(null);
    onAddRoadFromKml(parsed.coordinates, parsed.name);
  }

  return (
    <section className="rounded-xl border border-brand/30 bg-brand-light/40 shadow-panel">
      <h2 className="flex items-center gap-1.5 border-b border-brand/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-brand-dark">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        Administrator tools
      </h2>

      {activeDraw ? (
        <div className="space-y-2 px-3 py-2.5 text-sm">
          <p className="text-ink-soft">
            {activeDraw.mode === "line"
              ? "Click the map to trace the road. Double-click or Finish to complete."
              : "Click the map to place the marker."}
          </p>
          <div className="flex flex-wrap gap-2">
            {activeDraw.mode === "line" && (
              <>
                <button
                  onClick={onFinishLine}
                  className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark"
                >
                  Finish
                </button>
                <button
                  onClick={onUndoVertex}
                  className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface-sunken"
                >
                  Undo point
                </button>
              </>
            )}
            <button
              onClick={onCancel}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5 px-3 py-2.5">
          <div className="flex flex-wrap gap-2">
            {ACTIONS.map((a) => (
              <button
                key={a.label}
                onClick={() => onStartDraw(a.mode, a.layer)}
                className="rounded-lg border border-brand/40 bg-white px-2.5 py-1.5 text-xs font-medium text-brand-dark hover:bg-brand-light"
              >
                + {a.label}
              </button>
            ))}
            <button
              onClick={() => kmlInputRef.current?.click()}
              className="rounded-lg border border-brand/40 bg-white px-2.5 py-1.5 text-xs font-medium text-brand-dark hover:bg-brand-light"
            >
              + Add road using KML
            </button>
            <input
              ref={kmlInputRef}
              type="file"
              accept=".kml,application/vnd.google-earth.kml+xml"
              className="hidden"
              onChange={handleKmlFile}
            />
          </div>
          {kmlError && <p className="text-[11px] text-red-600">{kmlError}</p>}

          <div className="space-y-1.5 border-t border-brand/20 pt-2.5">
            <p className="text-[11px] font-medium text-ink-soft">
              Add from Google Maps coordinates
            </p>
            <div className="flex gap-1">
              {COORD_LAYERS.map((p) => (
                <button
                  key={p.layer}
                  onClick={() => setCoordLayer(p.layer)}
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    coordLayer === p.layer
                      ? "border-brand bg-brand text-white"
                      : "border-line bg-white text-ink-soft hover:bg-surface-sunken"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                value={coordText}
                onChange={(e) => {
                  setCoordText(e.target.value);
                  setCoordError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitCoordinates();
                }}
                placeholder="11.0021, 75.8734"
                className="min-w-0 flex-1 rounded-lg border border-line px-2 py-1.5 text-xs outline-none focus:border-brand"
              />
              <button
                onClick={submitCoordinates}
                className="shrink-0 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-dark"
              >
                Go
              </button>
            </div>
            {coordError && <p className="text-[11px] text-red-600">{coordError}</p>}
          </div>
        </div>
      )}
    </section>
  );
}
