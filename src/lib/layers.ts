import type { LayerId, EditableLayer, PlaceCategory } from "./types";

export interface LayerConfig {
  id: LayerId;
  label: string;
  file: string;
  defaultVisible: boolean;
  minZoom: number;
  editable: boolean;
  legendColor: string;
  kind: "fill" | "line" | "point";
  description: string;
}

export const LAYERS: LayerConfig[] = [
  {
    id: "constituency",
    label: "Constituency boundary",
    file: "/data/constituency.geojson",
    defaultVisible: true,
    minZoom: 0,
    editable: false,
    legendColor: "#0f766e",
    kind: "line",
    description: "Tanur Assembly Constituency (No. 44).",
  },
  {
    id: "local_bodies",
    label: "Local bodies",
    file: "/data/local_bodies.geojson",
    defaultVisible: true,
    minZoom: 0,
    editable: false,
    legendColor: "#2563eb",
    kind: "fill",
    description: "1 municipality + 5 grama panchayats, each shown in its own colour.",
  },
  {
    id: "wards",
    label: "Wards",
    file: "/data/wards.geojson",
    defaultVisible: false,
    minZoom: 12,
    editable: false,
    legendColor: "#7c3aed",
    kind: "fill",
    description: "147 electoral wards (2024 delimitation).",
  },
  {
    id: "water",
    label: "Water bodies",
    file: "/data/water.geojson",
    defaultVisible: true,
    minZoom: 0,
    editable: false,
    legendColor: "#0ea5e9",
    kind: "fill",
    description: "Rivers, backwaters, ponds and canals.",
  },
  {
    id: "roads",
    label: "Roads",
    file: "/data/roads.geojson",
    defaultVisible: true,
    minZoom: 11,
    editable: true,
    legendColor: "#ea580c",
    kind: "line",
    description: "Road network from OpenStreetMap. Click a road to view or edit.",
  },
  {
    id: "railway",
    label: "Railway",
    file: "/data/railway.geojson",
    defaultVisible: true,
    minZoom: 10,
    editable: false,
    legendColor: "#475569",
    kind: "line",
    description: "Shoranur–Mangaluru line and stations.",
  },
  {
    id: "bridges",
    label: "Bridges",
    file: "/data/bridges.geojson",
    defaultVisible: true,
    minZoom: 10,
    editable: true,
    legendColor: "#e11d48",
    kind: "point",
    description: "Seed from OSM — incomplete. Administrators add the rest.",
  },
  {
    id: "places",
    label: "Important places",
    file: "/data/places.geojson",
    defaultVisible: false,
    minZoom: 12,
    editable: true,
    legendColor: "#0891b2",
    kind: "point",
    description: "Schools, health facilities and government offices.",
  },
];

export const layerById = (id: LayerId) => LAYERS.find((l) => l.id === id)!;

export const EDITABLE_LAYERS: EditableLayer[] = ["roads", "bridges", "places"];

/** Distinct colour per local body (iOS-flavoured, high separation, print-safe). */
export const LOCAL_BODY_COLORS: Record<string, string> = {
  tanur: "#2563eb", // municipality — blue
  ozhur: "#0d9488", // teal
  ponmundam: "#d97706", // amber
  tanalur: "#7c3aed", // violet
  niramaruthoor: "#db2777", // pink
  cheriyamundam: "#16a34a", // green
};

export const SELECTED_ROAD_COLOR = "#16a34a";

export const PLACE_CATEGORIES: Record<
  PlaceCategory,
  { label: string; color: string }
> = {
  school: { label: "School", color: "#2563eb" },
  health: { label: "Health facility", color: "#e11d48" },
  government: { label: "Government office", color: "#0f766e" },
  public: { label: "Public institution", color: "#7c3aed" },
};

export const ROAD_STYLE: Record<
  string,
  { color: string; width: number; label: string }
> = {
  highway: { color: "#e8590c", width: 3.4, label: "National / State Highway" },
  major: { color: "#f08c00", width: 2.6, label: "Major road (MDR)" },
  connector: { color: "#f4a259", width: 1.9, label: "Connector road" },
  local: { color: "#9aa4b2", width: 1, label: "Local road" },
  service: { color: "#c2cad4", width: 0.8, label: "Service road" },
  track: { color: "#c2cad4", width: 0.8, label: "Track" },
  path: { color: "#cfd6de", width: 0.6, label: "Path" },
};
