import type { LayerId, EditableLayer, PlaceCategory } from "./types";
import { ICON_COLORS } from "./mapIcons";

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
    legendColor: "#0EA5A0",
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
    legendColor: "#FF7A00",
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
    legendColor: "#FB923C",
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
    legendColor: "#8B5CF6",
    kind: "point",
    description: "Schools, health facilities and government offices.",
  },
];

export const layerById = (id: LayerId) => LAYERS.find((l) => l.id === id)!;

export const EDITABLE_LAYERS: EditableLayer[] = ["roads", "bridges", "places"];

/** Distinct, modern colour per local body — high separation, print-safe. */
export const LOCAL_BODY_COLORS: Record<string, string> = {
  tanur: "#4F7CFF", // municipality — indigo-blue
  ozhur: "#12B7B0", // teal
  ponmundam: "#FFA53D", // amber
  tanalur: "#9B6BFF", // violet
  niramaruthoor: "#FF5C93", // rose
  cheriyamundam: "#31C48D", // green
};

/** Google-Directions-style green used for a clicked/selected road. */
export const SELECTED_ROAD_COLOR = "#12B76A";

export const PLACE_CATEGORIES: Record<
  PlaceCategory,
  { label: string; color: string; icon: string }
> = {
  school: { label: "School / college", color: ICON_COLORS["pin-school"], icon: "pin-school" },
  health: { label: "Health facility", color: ICON_COLORS["pin-health"], icon: "pin-health" },
  government: { label: "Government office", color: ICON_COLORS["pin-government"], icon: "pin-government" },
  public: { label: "Public institution", color: ICON_COLORS["pin-public"], icon: "pin-public" },
};

/** Extra marker kinds shown in the legend alongside the four broad categories. */
export const EXTRA_ICONS: { label: string; icon: string; color: string }[] = [
  { label: "Police station", icon: "pin-police", color: ICON_COLORS["pin-police"] },
  { label: "Post office", icon: "pin-post", color: ICON_COLORS["pin-post"] },
  { label: "Court", icon: "pin-court", color: ICON_COLORS["pin-court"] },
  { label: "Fire station", icon: "pin-fire", color: ICON_COLORS["pin-fire"] },
  { label: "Bridge", icon: "pin-bridge", color: ICON_COLORS["pin-bridge"] },
  { label: "Railway station", icon: "pin-railway", color: ICON_COLORS["pin-railway"] },
];

export type RoadCategory = "highway" | "major" | "connector" | "local" | "service" | "track" | "path";

export const ROAD_STYLE: Record<
  RoadCategory,
  { color: string; width: number; label: string }
> = {
  highway: { color: "#FF7A00", width: 3.4, label: "National / State Highway" },
  major: { color: "#FFA940", width: 2.6, label: "Major road (MDR)" },
  connector: { color: "#FFC069", width: 1.9, label: "Connector road" },
  local: { color: "#98A2B3", width: 1, label: "Local road (Gramin)" },
  service: { color: "#CBD3DB", width: 0.8, label: "Service road" },
  track: { color: "#CBD3DB", width: 0.8, label: "Track" },
  path: { color: "#D8DEE5", width: 0.6, label: "Path" },
};

export const ROAD_CATEGORIES = Object.keys(ROAD_STYLE) as RoadCategory[];
