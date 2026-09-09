"use client";

import { useMemo, useState } from "react";
import type { FeatureCollection, Geometry, Point } from "geojson";
import * as turf from "@turf/turf";
import { useAuth } from "@/lib/auth";
import { createFeature } from "@/lib/store";
import type { EditableLayer, FeatureRecord, GeoFeature, LayerId } from "@/lib/types";

const CONFIG: Record<
  EditableLayer,
  { title: string; fields: { key: string; label: string; required?: boolean; options?: string[] }[] }
> = {
  roads: {
    title: "New road",
    fields: [
      { key: "name", label: "Road name" },
      { key: "start_point", label: "Start" },
      { key: "end_point", label: "End" },
      { key: "category", label: "Category", options: ["major", "connector", "local"] },
      { key: "notes", label: "Notes" },
    ],
  },
  bridges: {
    title: "New bridge",
    fields: [
      { key: "name", label: "Bridge name" },
      { key: "road", label: "Road it carries" },
      { key: "notes", label: "Notes" },
    ],
  },
  places: {
    title: "New important place",
    fields: [
      { key: "name", label: "Name", required: true },
      {
        key: "category",
        label: "Category",
        required: true,
        options: ["school", "health", "government", "public"],
      },
      { key: "subtype", label: "Type (e.g. Higher Secondary School)" },
      { key: "operator_type", label: "Managed by", options: ["government", "private"] },
      { key: "address", label: "Address" },
      { key: "notes", label: "Notes" },
    ],
  },
};

export function NewFeatureDialog({
  layer,
  geometry,
  collections,
  onClose,
  onCreated,
}: {
  layer: EditableLayer;
  geometry: Geometry;
  collections: Record<LayerId, FeatureCollection>;
  onClose: () => void;
  onCreated: (layer: EditableLayer, record: FeatureRecord) => void;
}) {
  const { user } = useAuth();
  const cfg = CONFIG[layer];
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Auto-detect local body + ward from the geometry.
  const context = useMemo(() => {
    const pt =
      geometry.type === "Point"
        ? turf.point((geometry as Point).coordinates)
        : turf.center(turf.feature(geometry));
    const ward = (collections.wards?.features as GeoFeature[] | undefined)?.find((w) => {
      try {
        return turf.booleanPointInPolygon(
          pt,
          w as unknown as GeoJSON.Feature<GeoJSON.Polygon>
        );
      } catch {
        return false;
      }
    });
    return {
      local_body: ward?.properties.local_body ? String(ward.properties.local_body) : "",
      local_body_id: ward?.properties.local_body_id ? String(ward.properties.local_body_id) : "",
      ward_no: ward?.properties.ward_no != null ? String(ward.properties.ward_no) : "",
      ward_name: ward?.properties.ward_name ? String(ward.properties.ward_name) : "",
    };
  }, [geometry, collections]);

  async function submit() {
    if (!user) return;
    const missing = cfg.fields.filter((f) => f.required && !(form[f.key] ?? "").trim());
    if (missing.length) {
      alert(`Required: ${missing.map((m) => m.label).join(", ")}`);
      return;
    }
    setBusy(true);
    try {
      const feature: GeoFeature = {
        type: "Feature",
        geometry,
        properties: {
          id: "",
          ...context,
          ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])),
          verified: false,
          named: Boolean((form.name ?? "").trim()),
          source: "Manual entry (administrator)",
          source_date: new Date().toISOString().slice(0, 10),
        },
      };
      const rec = await createFeature({ layer, feature, user });
      onCreated(layer, rec);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white shadow-panel animate-fade-in">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-base font-semibold text-ink">{cfg.title}</h2>
          <button onClick={onClose} className="rounded p-1 text-ink-faint hover:bg-surface-sunken">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto px-4 py-3 panel-scroll">
          <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-ink-faint">
            Location captured ·{" "}
            {context.local_body
              ? `${context.local_body}${context.ward_no ? `, Ward ${context.ward_no}` : ""}`
              : "outside mapped wards"}
          </p>
          {cfg.fields.map((f) => (
            <label key={f.key} className="block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                {f.label}
                {f.required && <span className="text-red-500"> *</span>}
              </span>
              {f.options ? (
                <select
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-line px-2.5 py-1.5 text-sm outline-none focus:border-brand"
                >
                  <option value="">Select…</option>
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-line px-2.5 py-1.5 text-sm outline-none focus:border-brand"
                />
              )}
            </label>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-line px-4 py-3">
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-40"
          >
            {busy ? "Saving…" : "Create"}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-sunken"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
