import type { Feature, Geometry, FeatureCollection } from "geojson";

export type LayerId =
  | "constituency"
  | "local_bodies"
  | "wards"
  | "water"
  | "roads"
  | "railway"
  | "bridges"
  | "places";

/** Editable feature categories that map to Firestore collections. */
export type EditableLayer = "roads" | "bridges" | "places";

export type PlaceCategory = "school" | "health" | "government" | "public";

/** Base (geometry-source) properties common to all features. */
export interface BaseProps {
  id: string;
  name?: string;
  source?: string;
  license?: string;
  source_date?: string;
  verified?: boolean;
  [key: string]: unknown;
}

export type GeoFeature = Feature<Geometry, BaseProps>;
export type GeoData = FeatureCollection<Geometry, BaseProps>;

/** A Firestore metadata override / admin-added record. */
export interface FeatureRecord {
  featureId: string;
  layer: EditableLayer;
  /** Editable fields shown in the details panel. */
  name?: string;
  start_point?: string;
  end_point?: string;
  category?: string;
  subtype?: string;
  road?: string;
  local_body?: string;
  local_body_id?: string;
  ward_no?: number | string;
  ward_name?: string;
  operator_type?: string;
  address?: string;
  phone?: string;
  website?: string;
  notes?: string;
  /** Present only for admin-added or geometry-edited features. */
  geometry?: Geometry;
  /** True for records created in-app (not from a static source file). */
  manualEntry?: boolean;
  archived?: boolean;
  source?: string;
  createdBy?: string;
  createdByEmail?: string;
  createdAt?: number;
  updatedBy?: string;
  updatedByEmail?: string;
  updatedAt?: number;
}

export interface AuditEntry {
  id?: string;
  featureId: string;
  layer: string;
  featureName?: string;
  action: "create" | "update" | "archive" | "restore";
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  changedBy: string;
  changedByEmail?: string;
  changedAt: number;
}

export type UserRole = "viewer" | "admin";

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
}

export interface LayerMeta {
  name: string;
  features: number;
  source?: string;
  license?: string;
  status?: string;
  [key: string]: unknown;
}

export interface Manifest {
  generated: string;
  constituency: Record<string, unknown>;
  layers: LayerMeta[];
  attribution: string[];
}

/** A unified selection object passed to the details panel. */
export interface Selection {
  layer: LayerId;
  feature: GeoFeature;
}
