"use client";

import { useEffect, useMemo, useState } from "react";
import * as turf from "@turf/turf";
import { EDITABLE_LAYERS } from "@/lib/layers";
import { useAuth } from "@/lib/auth";
import { loadAudit, saveRecord, setArchived } from "@/lib/store";
import type {
  AuditEntry,
  EditableLayer,
  FeatureRecord,
  LayerId,
  Selection,
} from "@/lib/types";

interface FieldDef {
  key: string;
  label: string;
  editable?: boolean;
  type?: "text" | "textarea";
}

const FIELDS: Partial<Record<LayerId, FieldDef[]>> = {
  roads: [
    { key: "name", label: "Road name", editable: true },
    { key: "start_point", label: "Start", editable: true },
    { key: "end_point", label: "End", editable: true },
    { key: "ref", label: "Route number" },
    { key: "category", label: "Category" },
    { key: "local_body", label: "Local body" },
    { key: "ward_name", label: "Ward" },
    { key: "surface", label: "Surface" },
    { key: "notes", label: "Notes", editable: true, type: "textarea" },
  ],
  bridges: [
    { key: "name", label: "Bridge name", editable: true },
    { key: "road", label: "Road", editable: true },
    { key: "structure", label: "Structure" },
    { key: "local_body", label: "Local body", editable: true },
    { key: "ward_name", label: "Ward", editable: true },
    { key: "notes", label: "Notes", editable: true, type: "textarea" },
  ],
  places: [
    { key: "name", label: "Name", editable: true },
    { key: "subtype", label: "Type", editable: true },
    { key: "operator_type", label: "Managed by", editable: true },
    { key: "address", label: "Address", editable: true },
    { key: "phone", label: "Phone", editable: true },
    { key: "website", label: "Website", editable: true },
    { key: "local_body", label: "Local body", editable: true },
    { key: "ward_name", label: "Ward", editable: true },
    { key: "notes", label: "Notes", editable: true, type: "textarea" },
  ],
  wards: [
    { key: "ward_no", label: "Ward number" },
    { key: "ward_name", label: "Ward name" },
    { key: "local_body", label: "Local body" },
    { key: "lsgd_type", label: "Type" },
  ],
  local_bodies: [
    { key: "name", label: "Name" },
    { key: "name_ml", label: "Name (Malayalam)" },
    { key: "lsgd_type", label: "Type" },
    { key: "ward_count", label: "Wards" },
    { key: "lsgi_code", label: "LSGI code" },
  ],
  railway: [
    { key: "name", label: "Name" },
    { key: "station_code", label: "Station code" },
    { key: "operator", label: "Operator" },
  ],
  water: [
    { key: "name", label: "Name" },
    { key: "kind", label: "Type" },
    { key: "waterway", label: "Waterway" },
  ],
  constituency: [
    { key: "number", label: "Constituency number" },
    { key: "district", label: "District" },
    { key: "taluk", label: "Taluk" },
    { key: "local_body_count", label: "Local bodies" },
    { key: "ward_count", label: "Wards" },
    { key: "area_km2", label: "Area (km²)" },
  ],
};

const TITLE: Record<LayerId, string> = {
  constituency: "Constituency",
  local_bodies: "Local body",
  wards: "Ward",
  water: "Water body",
  roads: "Road details",
  railway: "Railway",
  bridges: "Bridge details",
  places: "Place details",
};

export function DetailsPanel({
  selection,
  records,
  onClose,
  onSaved,
}: {
  selection: Selection;
  records: Record<EditableLayer, Record<string, FeatureRecord>>;
  onClose: () => void;
  onSaved: (layer: EditableLayer, record: FeatureRecord) => void;
}) {
  const { user, isAdmin } = useAuth();
  const { layer, feature } = selection;
  // Locally overlay a just-saved patch so the panel reflects it immediately,
  // without waiting for the parent's selection object to be re-derived.
  const [overrides, setOverrides] = useState<Record<string, unknown>>({});
  const props = { ...feature.properties, ...overrides };
  const fields = FIELDS[layer] ?? [];
  const isEditable = EDITABLE_LAYERS.includes(layer as EditableLayer);
  const canEdit = isAdmin && isEditable;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [audit, setAudit] = useState<AuditEntry[] | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  const featureId = String(props.id ?? "");

  useEffect(() => {
    setEditing(false);
    setShowAudit(false);
    setAudit(null);
    setOverrides({});
    setForm(
      Object.fromEntries(
        fields
          .filter((f) => f.editable)
          .map((f) => [f.key, String(feature.properties[f.key] ?? "")])
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureId]);

  const displayName = useMemo(() => {
    if (layer === "wards") return `Ward ${props.ward_no}${props.ward_name ? ` – ${props.ward_name}` : ""}`;
    if (layer === "constituency") return `${props.name} (No. ${props.number})`;
    const n = String(props.name ?? "").trim();
    return n || (layer === "roads" ? "Unnamed Road" : layer === "bridges" ? "Unnamed Bridge" : "Unnamed");
  }, [layer, props]);

  const googleMapsUrl = useMemo(() => {
    try {
      const [lng, lat] = turf.centroid(feature as unknown as turf.AllGeoJSON).geometry.coordinates;
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    } catch {
      return null;
    }
  }, [feature]);

  const dirty = useMemo(
    () => fields.some((f) => f.editable && String(props[f.key] ?? "") !== (form[f.key] ?? "")),
    [fields, form, props]
  );

  async function handleSave() {
    if (!user || !dirty) return;
    setBusy(true);
    try {
      const patch: Partial<FeatureRecord> = {};
      const previous: Record<string, unknown> = {};
      for (const f of fields) {
        if (!f.editable) continue;
        const next = (form[f.key] ?? "").trim();
        const prev = String(props[f.key] ?? "");
        if (next !== prev) {
          (patch as Record<string, unknown>)[f.key] = next;
          previous[f.key] = prev;
        }
      }
      const rec = await saveRecord({
        layer: layer as EditableLayer,
        featureId,
        featureName: displayName,
        patch,
        previous,
        user,
      });
      onSaved(layer as EditableLayer, { ...rec, ...patch });
      setOverrides((o) => ({ ...o, ...patch }));
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive() {
    if (!user) return;
    if (!confirm("Archive this feature? It will be hidden from the map. This can be undone from the audit trail.")) return;
    setBusy(true);
    try {
      const rec = await setArchived({
        layer: layer as EditableLayer,
        featureId,
        featureName: displayName,
        archived: true,
        user,
      });
      onSaved(layer as EditableLayer, { ...rec, archived: true });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function openAudit() {
    setShowAudit((s) => !s);
    if (!audit) setAudit(await loadAudit(featureId));
  }

  return (
    <aside className="absolute inset-x-0 bottom-0 z-30 flex max-h-[75vh] flex-col rounded-t-2xl border-t border-line bg-white shadow-panel animate-fade-in md:static md:inset-auto md:max-h-none md:w-80 md:shrink-0 md:rounded-none md:border-l md:border-t-0 lg:w-96">
      <div className="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
            {TITLE[layer]}
          </p>
          <h2 className="truncate text-base font-semibold text-ink">{displayName}</h2>
          <div className="mt-1 flex flex-wrap gap-1">
            {Boolean(props.edited) && (
              <span className="rounded bg-brand-light px-1.5 py-0.5 text-[10px] font-medium text-brand-dark">
                edited in app
              </span>
            )}
            {Boolean(props.manualEntry) && (
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                added by administrator
              </span>
            )}
            {props.verified === false && !props.manualEntry && (
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                unverified
              </span>
            )}
          </div>
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-[11px] font-medium text-ink-soft hover:bg-surface-sunken"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              Open in Google Maps
            </a>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-ink-faint hover:bg-surface-sunken"
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 panel-scroll">
        <dl className="space-y-2.5">
          {fields.map((f) => {
            const raw = props[f.key];
            const value = raw === undefined || raw === null || raw === "" ? "—" : String(raw);
            const showEditor = editing && f.editable;
            return (
              <div key={f.key}>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                  {f.label}
                </dt>
                {showEditor ? (
                  f.type === "textarea" ? (
                    <textarea
                      value={form[f.key] ?? ""}
                      onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-line px-2.5 py-1.5 text-sm outline-none focus:border-brand"
                    />
                  ) : (
                    <input
                      value={form[f.key] ?? ""}
                      onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                      placeholder={f.key === "name" ? "Enter a name" : ""}
                      className="mt-1 w-full rounded-lg border border-line px-2.5 py-1.5 text-sm outline-none focus:border-brand"
                    />
                  )
                ) : (
                  <dd className={`mt-0.5 text-sm ${value === "—" ? "text-ink-faint" : "text-ink"}`}>
                    {f.key === "website" && value !== "—" ? (
                      <a href={value} target="_blank" rel="noreferrer" className="text-brand underline">
                        {value}
                      </a>
                    ) : (
                      value
                    )}
                  </dd>
                )}
              </div>
            );
          })}
        </dl>

        <div className="mt-4 space-y-1 border-t border-line pt-3 text-[11px] text-ink-faint">
          {props.source ? <p>Source: {String(props.source)}</p> : null}
          {props.license ? <p>Licence: {String(props.license)}</p> : null}
          {props.osm_id ? (
            <p>
              OSM:{" "}
              <a
                className="underline"
                target="_blank"
                rel="noreferrer"
                href={`https://www.openstreetmap.org/${String(props.id).includes("n") ? "node" : "way"}/${props.osm_id}`}
              >
                {String(props.osm_id)}
              </a>
            </p>
          ) : null}
          {props.updatedByEmail ? (
            <p>
              Last edited by {String(props.updatedByEmail)}
              {props.updatedAt ? ` · ${new Date(Number(props.updatedAt)).toLocaleString()}` : ""}
            </p>
          ) : null}
        </div>

        {isEditable && (
          <button
            onClick={openAudit}
            className="mt-3 text-xs font-medium text-brand hover:underline"
          >
            {showAudit ? "Hide" : "View"} change history
          </button>
        )}
        {showAudit && (
          <ul className="mt-2 space-y-1.5 rounded-lg bg-surface-muted p-2 text-[11px]">
            {audit === null && <li className="text-ink-faint">Loading…</li>}
            {audit?.length === 0 && <li className="text-ink-faint">No recorded changes.</li>}
            {audit?.map((a, i) => (
              <li key={a.id ?? i} className="border-b border-line/60 pb-1 last:border-0">
                <span className="font-medium capitalize text-ink">{a.action}</span>
                {a.field ? <span className="text-ink-soft"> · {a.field}</span> : null}
                {a.field && a.field !== "geometry" ? (
                  <span className="text-ink-faint">
                    {" "}
                    “{String(a.oldValue ?? "—")}” → “{String(a.newValue ?? "—")}”
                  </span>
                ) : null}
                <span className="block text-ink-faint">
                  {a.changedByEmail || a.changedBy} · {new Date(a.changedAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canEdit && (
        <div className="flex items-center gap-2 border-t border-line px-4 py-3">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={busy || !dirty}
                className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-40"
              >
                {busy ? "Saving…" : "Save changes"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setForm(
                    Object.fromEntries(
                      fields.filter((f) => f.editable).map((f) => [f.key, String(props[f.key] ?? "")])
                    )
                  );
                }}
                className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-sunken"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
              >
                Edit
              </button>
              <button
                onClick={handleArchive}
                disabled={busy}
                className="ml-auto rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Archive
              </button>
            </>
          )}
        </div>
      )}

      {!isAdmin && isEditable && (
        <p className="border-t border-line px-4 py-2 text-[11px] text-ink-faint">
          Sign in as an administrator to edit this feature.
        </p>
      )}
    </aside>
  );
}
