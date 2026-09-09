"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import maplibregl, { type MapGeoJSONFeature, type LngLatLike } from "maplibre-gl";
import type { FeatureCollection, Geometry } from "geojson";
import {
  LAYERS,
  ROAD_STYLE,
  PLACE_CATEGORIES,
  LOCAL_BODY_COLORS,
  SELECTED_ROAD_COLOR,
} from "@/lib/layers";
import type { LayerId, GeoFeature, Selection } from "@/lib/types";

const BASEMAP =
  process.env.NEXT_PUBLIC_BASEMAP_STYLE_URL ||
  "https://tiles.openfreemap.org/styles/liberty";

// The map ALWAYS boots on this dependency-free style so the constituency data
// renders even with no internet. "Streets" swaps in the configured basemap.
const BASE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {},
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#eaeef1" } },
  ],
};

const FIRST_APP_LAYER = "mask-outside";

export interface DrawState {
  mode: "point" | "line";
  layer: "roads" | "bridges" | "places";
}

export interface MapHandle {
  flyToFeature: (f: GeoFeature) => void;
  finishDrawing: () => void;
  undoVertex: () => void;
  getMap: () => maplibregl.Map | null;
}

interface Props {
  collections: Record<LayerId, FeatureCollection>;
  visibility: Record<LayerId, boolean>;
  selected: Selection | null;
  draw: DrawState | null;
  localBodyBorderOnly: boolean;
  onSelect: (s: Selection | null) => void;
  onDrawComplete: (geometry: Geometry) => void;
  onReady?: () => void;
  onZoom?: (z: number) => void;
}

const INTERACTIVE_ORDER: LayerId[] = [
  "places",
  "bridges",
  "railway",
  "roads",
  "wards",
  "local_bodies",
];

const MapView = forwardRef<MapHandle, Props>(function MapView(
  {
    collections,
    visibility,
    selected,
    draw,
    localBodyBorderOnly,
    onSelect,
    onDrawComplete,
    onReady,
    onZoom,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const loadedRef = useRef(false);
  const drawRef = useRef<DrawState | null>(null);
  const vertsRef = useRef<[number, number][]>([]);
  const collectionsRef = useRef(collections);
  const selectedRef = useRef(selected);
  const visibilityRef = useRef(visibility);
  const prevRoadIdRef = useRef<string | null>(null);
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);
  const [basemap, setBasemap] = useState<"plain" | "streets">("plain");
  const [basemapBusy, setBasemapBusy] = useState(false);

  drawRef.current = draw;
  collectionsRef.current = collections;
  selectedRef.current = selected;
  visibilityRef.current = visibility;

  /* ----------------------------- bootstrap ----------------------------- */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      center: [75.91, 10.96],
      zoom: 11.4,
      attributionControl: false,
      maxZoom: 18,
      dragRotate: false,
      pitchWithRotate: false,
    });
    mapRef.current = map;
    if (typeof window !== "undefined") {
      (window as unknown as { __map: maplibregl.Map }).__map = map;
    }
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    const loadMask = () => {
      const mask = map.getSource("constituency_mask") as maplibregl.GeoJSONSource | undefined;
      if (!mask) return;
      fetch("/data/constituency_mask.geojson")
        .then((r) => r.json())
        .then((d) => mask.setData(d))
        .catch(() => {});
    };

    let didFit = false;
    const ro = new ResizeObserver(() => {
      map.resize();
      if (!didFit && containerRef.current && containerRef.current.clientWidth > 100) {
        didFit = true;
        fitToConstituency(map);
      }
      map.triggerRepaint();
    });
    if (containerRef.current) ro.observe(containerRef.current);

    map.on("load", () => {
      loadedRef.current = true;
      ensureAppLayers(map);
      pushData(map);
      loadMask();
      fitToConstituency(map);
      wireInteractions(map);
      onReady?.();
      onZoom?.(map.getZoom());
      // Kick the render loop — in a flex layout the canvas can boot at 0×0,
      // and while glyphs/tiles are still resolving maplibre may defer its
      // first paint until an interaction. redraw() forces a synchronous frame.
      let kicks = 0;
      const kick = setInterval(() => {
        try {
          map.resize();
          map.redraw();
        } catch {
          /* ignore */
        }
        if (++kicks > 16) clearInterval(kick);
      }, 250);
    });
    map.on("styledata", () => {
      if (loadedRef.current && !map.getLayer(FIRST_APP_LAYER)) {
        ensureAppLayers(map);
        pushData(map);
        loadMask();
        applySelection(map);
      }
    });
    map.on("zoom", () => onZoom?.(map.getZoom()));

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----------------------------- data sync ----------------------------- */
  const pushData = useCallback((map: maplibregl.Map) => {
    for (const l of LAYERS) {
      const src = map.getSource(l.id) as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData(collectionsRef.current[l.id] as FeatureCollection);
    }
    applyVisibility(map);
    applyBorderOnly(map);
    updateHighlight(map);
    updateDrawPreview(map);
  }, []);

  useEffect(() => {
    if (mapRef.current && loadedRef.current) pushData(mapRef.current);
  }, [collections, pushData]);

  /* --------------------------- visibility ---------------------------- */
  const applyVisibility = useCallback((map: maplibregl.Map) => {
    for (const l of LAYERS) {
      const vis = visibilityRef.current[l.id] ? "visible" : "none";
      for (const sub of styleLayerIds(l.id)) {
        if (map.getLayer(sub)) map.setLayoutProperty(sub, "visibility", vis);
      }
    }
  }, []);
  useEffect(() => {
    if (mapRef.current && loadedRef.current) applyVisibility(mapRef.current);
  }, [visibility, applyVisibility]);

  /* ------------------------ local-body border-only ------------------- */
  const applyBorderOnly = useCallback((map: maplibregl.Map) => {
    if (!map.getLayer("local_bodies-fill")) return;
    map.setPaintProperty(
      "local_bodies-fill",
      "fill-opacity",
      localBodyBorderOnly ? 0 : 0.14
    );
  }, [localBodyBorderOnly]);
  useEffect(() => {
    if (mapRef.current && loadedRef.current) applyBorderOnly(mapRef.current);
  }, [localBodyBorderOnly, applyBorderOnly]);

  /* --------------------------- selection ---------------------------- */
  const applySelection = useCallback((map: maplibregl.Map) => {
    // clear previous road highlight
    if (prevRoadIdRef.current && map.getSource("roads")) {
      try {
        map.setFeatureState(
          { source: "roads", id: prevRoadIdRef.current },
          { selected: false }
        );
      } catch {
        /* ignore */
      }
      prevRoadIdRef.current = null;
    }
    const sel = selectedRef.current;
    if (sel?.layer === "roads" && sel.feature.properties.id && map.getSource("roads")) {
      const id = String(sel.feature.properties.id);
      try {
        map.setFeatureState({ source: "roads", id }, { selected: true });
        prevRoadIdRef.current = id;
      } catch {
        /* ignore */
      }
    }
    updateHighlight(map);
  }, []);
  useEffect(() => {
    if (mapRef.current && loadedRef.current) applySelection(mapRef.current);
  }, [selected, applySelection]);

  const updateHighlight = useCallback((map: maplibregl.Map) => {
    const src = map.getSource("__highlight") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    const sel = selectedRef.current;
    // roads use the green feature-state highlight, not the amber overlay
    const show = sel && sel.layer !== "roads";
    src.setData(
      show
        ? { type: "FeatureCollection", features: [sel!.feature as GeoJSON.Feature] }
        : { type: "FeatureCollection", features: [] }
    );
  }, []);

  /* ----------------------------- basemap ----------------------------- */
  const switchBasemap = useCallback(async (kind: "plain" | "streets") => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    setBasemapBusy(true);
    try {
      if (kind === "plain") {
        map.setStyle(BASE_STYLE, { diff: false });
        setBasemap("plain");
        return;
      }
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(BASEMAP, { mode: "cors", signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(String(res.status));
      const style = (await res.json()) as maplibregl.StyleSpecification;
      map.setStyle(style, { diff: false });
      setBasemap("streets");
      await new Promise((r) => setTimeout(r, 8000));
      if (mapRef.current && !mapRef.current.areTilesLoaded()) {
        mapRef.current.setStyle(BASE_STYLE, { diff: false });
        setBasemap("plain");
      }
    } catch {
      setBasemap("plain");
    } finally {
      setBasemapBusy(false);
    }
  }, []);

  /* ----------------------------- draw mode --------------------------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    map.getCanvas().style.cursor = draw ? "crosshair" : "";
    if (!draw) {
      vertsRef.current = [];
      updateDrawPreview(map);
    }
    rerender();
  }, [draw]);

  function updateDrawPreview(map: maplibregl.Map) {
    const src = map.getSource("__draw") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    const verts = vertsRef.current;
    const features: GeoJSON.Feature[] = verts.map((c) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: c },
      properties: {},
    }));
    if (verts.length >= 2) {
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: verts },
        properties: {},
      });
    }
    src.setData({ type: "FeatureCollection", features });
  }

  const finishDrawing = useCallback(() => {
    const map = mapRef.current;
    const d = drawRef.current;
    if (!map || !d || d.mode !== "line") return;
    if (vertsRef.current.length < 2) return;
    onDrawComplete({ type: "LineString", coordinates: [...vertsRef.current] });
    vertsRef.current = [];
    updateDrawPreview(map);
  }, [onDrawComplete]);

  const undoVertex = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    vertsRef.current = vertsRef.current.slice(0, -1);
    updateDrawPreview(map);
    rerender();
  }, []);

  /* --------------------------- interactions -------------------------- */
  function wireInteractions(map: maplibregl.Map) {
    map.on("click", (e) => {
      const d = drawRef.current;
      if (d) {
        const c: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        if (d.mode === "point") onDrawComplete({ type: "Point", coordinates: c });
        else {
          vertsRef.current = [...vertsRef.current, c];
          updateDrawPreview(map);
          rerender();
        }
        return;
      }
      onSelect(pickFeature(map, e.point));
    });

    map.on("dblclick", (e) => {
      if (drawRef.current?.mode === "line") {
        e.preventDefault();
        finishDrawing();
      }
    });

    const hoverLayers = [
      "places-circle",
      "bridges-circle",
      "roads-hit",
      "wards-fill",
      "local_bodies-fill",
      "railway-station",
    ];
    for (const id of hoverLayers) {
      map.on("mouseenter", id, () => {
        if (!drawRef.current) map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", id, () => {
        if (!drawRef.current) map.getCanvas().style.cursor = "";
      });
    }
  }

  function pickFeature(map: maplibregl.Map, pt: maplibregl.PointLike): Selection | null {
    for (const layerId of INTERACTIVE_ORDER) {
      if (!visibilityRef.current[layerId]) continue;
      const ids = styleLayerIds(layerId).filter((id) => map.getLayer(id));
      const feats = map.queryRenderedFeatures(expandPoint(pt), { layers: ids });
      if (feats.length) {
        const f = feats[0] as MapGeoJSONFeature;
        // promoteId moves `id` off properties onto feature.id — restore it.
        const props = {
          ...(f.properties as GeoFeature["properties"]),
          id: (f.id as string | undefined) ?? (f.properties.id as string),
        };
        return { layer: layerId, feature: { type: "Feature", geometry: f.geometry, properties: props } };
      }
    }
    return null;
  }

  /* --------------------------- imperative --------------------------- */
  useImperativeHandle(ref, () => ({
    flyToFeature: (f: GeoFeature) => {
      const map = mapRef.current;
      if (!map) return;
      const b = boundsOf(f.geometry);
      if (b) map.fitBounds(b, { padding: 90, maxZoom: 16, duration: 700 });
    },
    finishDrawing,
    undoVertex,
    getMap: () => mapRef.current,
  }));

  const vcount = vertsRef.current.length;

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      <div className="pointer-events-auto absolute bottom-9 right-2.5 z-10 flex overflow-hidden rounded-xl border border-black/5 bg-white/90 text-[11px] font-semibold shadow-[0_2px_12px_rgba(15,23,42,0.12)] backdrop-blur">
        {(["plain", "streets"] as const).map((k) => (
          <button
            key={k}
            disabled={basemapBusy}
            onClick={() => switchBasemap(k)}
            className={`px-3 py-1.5 capitalize transition-colors ${
              basemap === k
                ? "bg-brand text-white"
                : "text-ink-soft hover:bg-black/[0.04]"
            }`}
          >
            {k === "streets" && basemapBusy ? "loading…" : k}
          </button>
        ))}
      </div>

      {draw?.mode === "line" && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full border border-black/5 bg-white/95 px-3.5 py-1.5 text-xs shadow-panel backdrop-blur animate-fade-in">
          <span className="font-semibold text-brand">Drawing road</span>
          <span className="mx-2 text-ink-faint">·</span>
          {vcount} point{vcount === 1 ? "" : "s"}
          <span className="mx-2 text-ink-faint">·</span>
          click to add, double-click to finish
        </div>
      )}
      {draw?.mode === "point" && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full border border-black/5 bg-white/95 px-3.5 py-1.5 text-xs shadow-panel backdrop-blur animate-fade-in">
          <span className="font-semibold text-brand">Click the map</span> to place the{" "}
          {draw.layer === "bridges" ? "bridge" : "location"}
        </div>
      )}
    </div>
  );
});

export default MapView;

/* ========================================================================== */
/*  Style layers                                                               */
/* ========================================================================== */

function styleLayerIds(id: LayerId): string[] {
  switch (id) {
    case "constituency":
      return ["constituency-line", "constituency-line-halo"];
    case "local_bodies":
      return [
        "local_bodies-fill",
        "local_bodies-line-halo",
        "local_bodies-line",
        "local_bodies-label",
      ];
    case "wards":
      return ["wards-fill", "wards-line", "wards-label"];
    case "water":
      return ["water-fill", "water-line"];
    case "roads":
      return ["roads-casing", "roads-line", "roads-selected", "roads-hit", "roads-label"];
    case "railway":
      return ["railway-line", "railway-dash", "railway-station", "railway-label"];
    case "bridges":
      return ["bridges-halo", "bridges-circle", "bridges-label"];
    case "places":
      return ["places-circle", "places-label"];
    default:
      return [];
  }
}

const emptyFC = (): FeatureCollection => ({ type: "FeatureCollection", features: [] });

const lbColorMatch = (): maplibregl.ExpressionSpecification => {
  const m: unknown[] = ["match", ["get", "local_body_id"]];
  for (const [id, color] of Object.entries(LOCAL_BODY_COLORS)) m.push(id, color);
  m.push("#64748b");
  return m as maplibregl.ExpressionSpecification;
};

function ensureAppLayers(map: maplibregl.Map) {
  const gj = (id: string) =>
    !map.getSource(id) &&
    map.addSource(id, { type: "geojson", data: emptyFC(), promoteId: "id" });
  for (const l of LAYERS) gj(l.id);
  gj("constituency_mask");
  gj("__highlight");
  gj("__draw");

  const add = (layer: maplibregl.LayerSpecification, before?: string) => {
    if (!map.getLayer(layer.id))
      map.addLayer(layer, before && map.getLayer(before) ? before : undefined);
  };

  /* ---- mask: grey-out everything outside the constituency ---- */
  add({
    id: "mask-outside",
    type: "fill",
    source: "constituency_mask",
    paint: { "fill-color": "#aeb8c2", "fill-opacity": 0.55 },
  });

  /* ---- water ---- */
  add({
    id: "water-fill",
    type: "fill",
    source: "water",
    filter: ["match", ["geometry-type"], ["Polygon", "MultiPolygon"], true, false],
    paint: { "fill-color": "#bfe3f5", "fill-outline-color": "#8fcdea" },
  });
  add({
    id: "water-line",
    type: "line",
    source: "water",
    filter: ["match", ["geometry-type"], ["LineString", "MultiLineString"], true, false],
    paint: {
      "line-color": "#7cc4e4",
      "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.8, 16, 3],
    },
  });

  /* ---- local bodies ---- */
  add({
    id: "local_bodies-fill",
    type: "fill",
    source: "local_bodies",
    paint: { "fill-color": lbColorMatch(), "fill-opacity": 0.14 },
  });
  add({
    id: "local_bodies-label",
    type: "symbol",
    source: "local_bodies",
    layout: {
      "text-field": ["get", "name"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 10, 11, 14, 15],
      "text-transform": "uppercase",
      "text-letter-spacing": 0.12,
      "text-font": ["Noto Sans Bold", "Open Sans Bold"],
      "symbol-placement": "point",
    },
    paint: {
      "text-color": lbColorMatch(),
      "text-halo-color": "#ffffff",
      "text-halo-width": 2,
      "text-halo-blur": 0.5,
    },
  });

  /* ---- wards ---- */
  add({
    id: "wards-fill",
    type: "fill",
    source: "wards",
    minzoom: 11,
    paint: {
      "fill-color": "#8b5cf6",
      "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.22, 0.06],
    },
  });
  add({
    id: "wards-line",
    type: "line",
    source: "wards",
    minzoom: 11,
    paint: { "line-color": "#8b5cf6", "line-width": 0.8, "line-opacity": 0.5 },
  });
  add({
    id: "wards-label",
    type: "symbol",
    source: "wards",
    minzoom: 13.5,
    layout: {
      "text-field": ["coalesce", ["get", "ward_name"], ["concat", "Ward ", ["get", "ward_no"]]],
      "text-size": 10.5,
      "text-font": ["Noto Sans Regular", "Open Sans Regular"],
    },
    paint: { "text-color": "#5b21b6", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
  });

  /* ---- roads ---- */
  const catNum = (
    hw: number,
    mj: number,
    cn: number,
    lc: number,
    other: number
  ): maplibregl.ExpressionSpecification => [
    "match",
    ["get", "category"],
    "highway", hw,
    "major", mj,
    "connector", cn,
    "local", lc,
    other,
  ];
  const roadWidth: maplibregl.ExpressionSpecification = [
    "interpolate", ["linear"], ["zoom"],
    11, catNum(2.4, 1.8, 1.1, 0.6, 0.5),
    14, catNum(5, 3.6, 2.4, 1.3, 1),
    17, catNum(11, 8.5, 6, 3, 2),
  ];
  const roadCasing: maplibregl.ExpressionSpecification = [
    "interpolate", ["linear"], ["zoom"],
    12, catNum(4.5, 3.6, 2.8, 2, 1.8),
    17, catNum(14, 11.5, 8.5, 5, 3.5),
  ];
  const roadColor: maplibregl.ExpressionSpecification = [
    "match",
    ["get", "category"],
    "highway", ROAD_STYLE.highway.color,
    "major", ROAD_STYLE.major.color,
    "connector", ROAD_STYLE.connector.color,
    "service", ROAD_STYLE.service.color,
    "track", ROAD_STYLE.track.color,
    "path", ROAD_STYLE.path.color,
    ROAD_STYLE.local.color,
  ];
  add({
    id: "roads-casing",
    type: "line",
    source: "roads",
    minzoom: 12,
    layout: { "line-cap": "round", "line-join": "round" },
    filter: ["match", ["get", "category"], ["highway", "major", "connector"], true, false],
    paint: { "line-color": "#ffffff", "line-width": roadCasing, "line-opacity": 0.9 },
  });
  add({
    id: "roads-line",
    type: "line",
    source: "roads",
    minzoom: 11,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": roadColor,
      "line-width": roadWidth,
      "line-opacity": [
        "interpolate", ["linear"], ["zoom"],
        11, catNum(0.95, 0.9, 0.75, 0.28, 0.22),
        13.5, catNum(0.98, 0.95, 0.85, 0.75, 0.55),
      ],
    },
  });
  // Selected road — a dedicated overlay (feature-state can't be used in filters,
  // so it drives opacity instead; width stays a single zoom interpolate).
  add({
    id: "roads-selected",
    type: "line",
    source: "roads",
    minzoom: 10,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": SELECTED_ROAD_COLOR,
      "line-width": ["interpolate", ["linear"], ["zoom"], 11, 4, 17, 13],
      "line-opacity": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        0.95,
        0,
      ],
    },
  });
  add({
    id: "roads-hit",
    type: "line",
    source: "roads",
    minzoom: 11,
    paint: { "line-color": "#000", "line-opacity": 0, "line-width": 14 },
  });
  add({
    id: "roads-label",
    type: "symbol",
    source: "roads",
    minzoom: 12.5,
    filter: ["==", ["get", "named"], true],
    layout: {
      "symbol-placement": "line",
      "text-field": ["coalesce", ["get", "name_ml"], ["get", "name"]],
      "text-size": ["interpolate", ["linear"], ["zoom"], 12.5, 10, 16, 12.5],
      "text-font": ["Noto Sans Regular", "Open Sans Regular"],
    },
    paint: { "text-color": "#9a3412", "text-halo-color": "#ffffff", "text-halo-width": 1.8 },
  });

  /* ---- railway ---- */
  add({
    id: "railway-line",
    type: "line",
    source: "railway",
    filter: ["==", ["geometry-type"], "LineString"],
    paint: { "line-color": "#5b6472", "line-width": 2.2 },
  });
  add({
    id: "railway-dash",
    type: "line",
    source: "railway",
    filter: ["==", ["geometry-type"], "LineString"],
    paint: { "line-color": "#ffffff", "line-width": 1.4, "line-dasharray": [3, 3] },
  });
  add({
    id: "railway-station",
    type: "circle",
    source: "railway",
    filter: ["==", ["geometry-type"], "Point"],
    paint: {
      "circle-radius": 5,
      "circle-color": "#334155",
      "circle-stroke-color": "#fff",
      "circle-stroke-width": 2.5,
    },
  });
  add({
    id: "railway-label",
    type: "symbol",
    source: "railway",
    filter: ["==", ["geometry-type"], "Point"],
    layout: {
      "text-field": ["get", "name"],
      "text-size": 11,
      "text-offset": [0, 1.3],
      "text-anchor": "top",
      "text-font": ["Noto Sans Bold", "Open Sans Bold"],
    },
    paint: { "text-color": "#334155", "text-halo-color": "#ffffff", "text-halo-width": 1.8 },
  });

  /* ---- bridges ---- */
  add({
    id: "bridges-halo",
    type: "circle",
    source: "bridges",
    minzoom: 10,
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 6, 16, 13],
      "circle-color": "#e11d48",
      "circle-opacity": 0.14,
    },
  });
  add({
    id: "bridges-circle",
    type: "circle",
    source: "bridges",
    minzoom: 10,
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 3.6, 16, 7],
      "circle-color": "#e11d48",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2,
    },
  });
  add({
    id: "bridges-label",
    type: "symbol",
    source: "bridges",
    minzoom: 13.5,
    filter: ["==", ["get", "named"], true],
    layout: {
      "text-field": ["get", "name"],
      "text-size": 10,
      "text-offset": [0, 1.2],
      "text-anchor": "top",
      "text-font": ["Noto Sans Regular", "Open Sans Regular"],
    },
    paint: { "text-color": "#9f1239", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
  });

  /* ---- places ---- */
  const placeColor: maplibregl.ExpressionSpecification = [
    "match",
    ["get", "category"],
    "school", PLACE_CATEGORIES.school.color,
    "health", PLACE_CATEGORIES.health.color,
    "government", PLACE_CATEGORIES.government.color,
    "public", PLACE_CATEGORIES.public.color,
    "#64748b",
  ];
  add({
    id: "places-circle",
    type: "circle",
    source: "places",
    minzoom: 11,
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 3, 16, 6.5],
      "circle-color": placeColor,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.8,
    },
  });
  add({
    id: "places-label",
    type: "symbol",
    source: "places",
    minzoom: 14.5,
    layout: {
      "text-field": ["get", "name"],
      "text-size": 10,
      "text-offset": [0, 1],
      "text-anchor": "top",
      "text-font": ["Noto Sans Regular", "Open Sans Regular"],
      "text-max-width": 9,
    },
    paint: { "text-color": "#334155", "text-halo-color": "#ffffff", "text-halo-width": 1.4 },
  });

  /* ---- local-body borders (above roads so they read clearly) ---- */
  add({
    id: "local_bodies-line-halo",
    type: "line",
    source: "local_bodies",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: {
      "line-color": "#ffffff",
      "line-width": ["interpolate", ["linear"], ["zoom"], 10, 3.5, 14, 6.5],
      "line-opacity": 0.8,
    },
  });
  add({
    id: "local_bodies-line",
    type: "line",
    source: "local_bodies",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: {
      "line-color": lbColorMatch(),
      "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.8, 14, 3.5],
      "line-opacity": 1,
      "line-dasharray": [2.5, 1.2],
    },
  });

  /* ---- constituency outline (on top of fills) ---- */
  add({
    id: "constituency-line-halo",
    type: "line",
    source: "constituency",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#ffffff", "line-width": 6, "line-opacity": 0.65 },
  });
  add({
    id: "constituency-line",
    type: "line",
    source: "constituency",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#0f766e", "line-width": 3, "line-opacity": 0.95 },
  });

  /* ---- selection overlay (polygons / points) ---- */
  add({
    id: "highlight-fill",
    type: "fill",
    source: "__highlight",
    filter: ["match", ["geometry-type"], ["Polygon", "MultiPolygon"], true, false],
    paint: { "fill-color": "#f59e0b", "fill-opacity": 0.16 },
  });
  add({
    id: "highlight-line",
    type: "line",
    source: "__highlight",
    filter: [
      "match",
      ["geometry-type"],
      ["LineString", "MultiLineString", "Polygon", "MultiPolygon"],
      true,
      false,
    ],
    paint: { "line-color": "#f59e0b", "line-width": 3.5, "line-opacity": 0.95 },
  });
  add({
    id: "highlight-point",
    type: "circle",
    source: "__highlight",
    filter: ["==", ["geometry-type"], "Point"],
    paint: {
      "circle-radius": 11,
      "circle-color": "#f59e0b",
      "circle-opacity": 0.22,
      "circle-stroke-color": "#f59e0b",
      "circle-stroke-width": 2.5,
    },
  });

  /* ---- draw preview ---- */
  add({
    id: "draw-line",
    type: "line",
    source: "__draw",
    paint: { "line-color": "#0f766e", "line-width": 2.5, "line-dasharray": [2, 1] },
  });
  add({
    id: "draw-point",
    type: "circle",
    source: "__draw",
    filter: ["==", ["geometry-type"], "Point"],
    paint: {
      "circle-radius": 4,
      "circle-color": "#0f766e",
      "circle-stroke-color": "#fff",
      "circle-stroke-width": 2,
    },
  });
}

/* ========================================================================== */
/*  Helpers                                                                    */
/* ========================================================================== */

function fitToConstituency(map: maplibregl.Map) {
  map.resize();
  map.fitBounds(new maplibregl.LngLatBounds([75.845, 10.888], [75.985, 11.026]), {
    padding: { top: 24, bottom: 24, left: 16, right: 16 },
    duration: 0,
  });
}

function expandPoint(pt: maplibregl.PointLike): [maplibregl.PointLike, maplibregl.PointLike] {
  const p = pt as { x: number; y: number };
  return [
    [p.x - 7, p.y - 7],
    [p.x + 7, p.y + 7],
  ];
}

function boundsOf(g: Geometry): [LngLatLike, LngLatLike] | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const walk = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === "number") {
      const [x, y] = c as [number, number];
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    } else if (Array.isArray(c)) c.forEach(walk);
  };
  if ("coordinates" in g) walk(g.coordinates);
  if (!isFinite(minX)) return null;
  if (minX === maxX && minY === maxY) {
    const d = 0.004;
    return [[minX - d, minY - d], [maxX + d, maxY + d]];
  }
  return [[minX, minY], [maxX, maxY]];
}
