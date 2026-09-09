"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Geometry } from "geojson";
import MapView, { type MapHandle, type DrawState } from "@/components/MapView";
import { Header } from "@/components/Header";
import { LayerPanel } from "@/components/LayerPanel";
import { Legend } from "@/components/Legend";
import { SearchBar } from "@/components/SearchBar";
import { DetailsPanel } from "@/components/DetailsPanel";
import { AdminToolbar } from "@/components/AdminToolbar";
import { NewFeatureDialog } from "@/components/NewFeatureDialog";
import { LAYERS } from "@/lib/layers";
import { useGisData } from "@/lib/useGisData";
import { useAuth } from "@/lib/auth";
import type { EditableLayer, LayerId, Selection } from "@/lib/types";

const initialVisibility = () =>
  Object.fromEntries(LAYERS.map((l) => [l.id, l.defaultVisible])) as Record<
    LayerId,
    boolean
  >;

export default function HomePage() {
  const gis = useGisData();
  const { isAdmin } = useAuth();
  const mapRef = useRef<MapHandle>(null);

  const [visibility, setVisibility] = useState<Record<LayerId, boolean>>(initialVisibility);
  const [localBodyBorderOnly, setLocalBodyBorderOnly] = useState(false);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [draw, setDraw] = useState<DrawState | null>(null);
  const [pending, setPending] = useState<{ layer: EditableLayer; geometry: Geometry } | null>(null);
  const [zoom, setZoom] = useState(11.4);
  const [mobilePanel, setMobilePanel] = useState<"map" | "layers">("map");

  const toggleLayer = useCallback((id: LayerId) => {
    setVisibility((v) => ({ ...v, [id]: !v[id] }));
  }, []);

  const handleSelect = useCallback((s: Selection | null) => {
    setSelected(s);
    if (s) setDraw(null);
  }, []);

  const startDraw = useCallback(
    (mode: "point" | "line", layer: EditableLayer) => {
      setSelected(null);
      setDraw({ mode, layer });
    },
    []
  );

  const handleDrawComplete = useCallback(
    (geometry: Geometry) => {
      if (!draw) return;
      setPending({ layer: draw.layer, geometry });
      setDraw(null);
    },
    [draw]
  );

  const flyTo = useCallback((s: Selection) => {
    setSelected(s);
    if (!visibility[s.layer]) setVisibility((v) => ({ ...v, [s.layer]: true }));
    mapRef.current?.flyToFeature(s.feature);
    setMobilePanel("map");
  }, [visibility]);

  const zoomHint = useMemo(() => {
    const hidden = LAYERS.filter(
      (l) => visibility[l.id] && zoom < l.minZoom - 0.5
    );
    return hidden.length
      ? `Zoom in to see: ${hidden.map((l) => l.label).join(", ")}`
      : null;
  }, [visibility, zoom]);

  return (
    <div className="flex h-full flex-col bg-surface-muted">
      <Header
        constituency={gis.collections.constituency?.features?.[0]?.properties as Record<string, unknown> | undefined}
      >
        <SearchBar collections={gis.collections} onPick={flyTo} />
      </Header>

      <div className="relative flex min-h-0 flex-1">
        {/* Left rail */}
        <aside
          className={`${
            mobilePanel === "layers" ? "flex" : "hidden"
          } absolute inset-0 z-20 flex-col gap-3 overflow-y-auto bg-surface-muted p-3 md:static md:z-0 md:flex md:w-72 md:shrink-0 md:border-r md:border-line panel-scroll`}
        >
          <LayerPanel
            visibility={visibility}
            onToggle={toggleLayer}
            manifestLayers={gis.collections}
            zoom={zoom}
            localBodyBorderOnly={localBodyBorderOnly}
            onToggleBorderOnly={() => setLocalBodyBorderOnly((v) => !v)}
          />
          <Legend />
          {isAdmin && (
            <AdminToolbar
              activeDraw={draw}
              onStartDraw={startDraw}
              onFinishLine={() => mapRef.current?.finishDrawing()}
              onUndoVertex={() => mapRef.current?.undoVertex()}
              onCancel={() => setDraw(null)}
            />
          )}
        </aside>

        {/* Map */}
        <main className="relative min-w-0 flex-1">
          {gis.error && (
            <div className="absolute inset-x-0 top-0 z-30 bg-red-50 px-4 py-2 text-sm text-red-700">
              Failed to load map data: {gis.error}
            </div>
          )}
          {!gis.ready && !gis.error && (
            <div className="absolute inset-0 z-30 grid place-items-center bg-surface-muted">
              <div className="text-sm text-ink-faint">Loading constituency data…</div>
            </div>
          )}
          <MapView
            ref={mapRef}
            collections={gis.collections}
            visibility={visibility}
            selected={selected}
            draw={draw}
            localBodyBorderOnly={localBodyBorderOnly}
            onSelect={handleSelect}
            onDrawComplete={handleDrawComplete}
            onZoom={setZoom}
          />
          {zoomHint && (
            <div className="pointer-events-none absolute bottom-8 left-1/2 z-10 -translate-x-1/2 rounded-full bg-ink/80 px-3 py-1 text-xs text-white">
              {zoomHint}
            </div>
          )}

          {/* Mobile toggle */}
          <button
            onClick={() => setMobilePanel((p) => (p === "map" ? "layers" : "map"))}
            className="absolute bottom-4 left-4 z-10 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium shadow-panel md:hidden"
          >
            {mobilePanel === "map" ? "Layers & legend" : "Back to map"}
          </button>
        </main>

        {/* Details */}
        {selected && (
          <DetailsPanel
            selection={selected}
            records={gis.records}
            onClose={() => setSelected(null)}
            onSaved={(layer, rec) => {
              gis.applyRecord(layer, rec);
            }}
          />
        )}
      </div>

      {pending && (
        <NewFeatureDialog
          layer={pending.layer}
          geometry={pending.geometry}
          collections={gis.collections}
          onClose={() => setPending(null)}
          onCreated={(layer, rec) => {
            gis.applyRecord(layer, rec);
            setPending(null);
          }}
        />
      )}
    </div>
  );
}
