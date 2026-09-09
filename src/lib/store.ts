"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  query,
  orderBy,
  limit as fsLimit,
  serverTimestamp,
} from "firebase/firestore";
import { db, firebaseEnabled } from "./firebase";
import type {
  AuditEntry,
  EditableLayer,
  FeatureRecord,
  GeoFeature,
  AppUser,
} from "./types";

/* -------------------------------------------------------------------------- */
/*  Local fallback (demo mode) — used only when Firebase is not configured.    */
/*  Lets the edit workflow be demonstrated; clearly flagged in the UI.         */
/* -------------------------------------------------------------------------- */

const LS_RECORDS = "tanur-gis:records";
const LS_AUDIT = "tanur-gis:audit";

function lsRead<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]") as T[];
  } catch {
    return [];
  }
}
function lsWrite<T>(key: string, rows: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(rows));
  } catch {
    /* ignore quota / private mode */
  }
}

/* -------------------------------------------------------------------------- */
/*  Records                                                                    */
/* -------------------------------------------------------------------------- */

export async function loadRecords(
  layer: EditableLayer
): Promise<Record<string, FeatureRecord>> {
  const out: Record<string, FeatureRecord> = {};
  if (firebaseEnabled && db) {
    const snap = await getDocs(collection(db, layer));
    snap.forEach((d) => {
      out[d.id] = { ...(d.data() as FeatureRecord), featureId: d.id, layer };
    });
  } else {
    for (const r of lsRead<FeatureRecord>(LS_RECORDS)) {
      if (r.layer === layer) out[r.featureId] = r;
    }
  }
  return out;
}

export async function loadAllRecords(): Promise<
  Record<EditableLayer, Record<string, FeatureRecord>>
> {
  const [roads, bridges, places] = await Promise.all([
    loadRecords("roads"),
    loadRecords("bridges"),
    loadRecords("places"),
  ]);
  return { roads, bridges, places };
}

interface SaveOpts {
  layer: EditableLayer;
  featureId: string;
  featureName: string;
  patch: Partial<FeatureRecord>;
  /** Previous values for the changed fields, for the audit trail. */
  previous: Record<string, unknown>;
  user: AppUser;
  action?: AuditEntry["action"];
}

export async function saveRecord(opts: SaveOpts): Promise<FeatureRecord> {
  const { layer, featureId, patch, previous, user, action = "update" } = opts;
  const now = Date.now();
  const meta = {
    updatedBy: user.uid,
    updatedByEmail: user.email ?? "",
    updatedAt: now,
  };

  let record: FeatureRecord;

  if (firebaseEnabled && db) {
    const ref = doc(db, layer, featureId);
    const snap = await getDoc(ref);
    const firstWrite = !snap.exists()
      ? {
          featureId,
          layer,
          createdBy: user.uid,
          createdByEmail: user.email ?? "",
          createdAt: now,
        }
      : {};
    await setDoc(ref, { ...firstWrite, ...patch, ...meta }, { merge: true });
    record = { featureId, layer, ...patch, ...meta } as FeatureRecord;
  } else {
    const rows = lsRead<FeatureRecord>(LS_RECORDS);
    const idx = rows.findIndex((r) => r.featureId === featureId && r.layer === layer);
    if (idx >= 0) {
      rows[idx] = { ...rows[idx], ...patch, ...meta };
      record = rows[idx];
    } else {
      record = {
        featureId,
        layer,
        createdBy: user.uid,
        createdByEmail: user.email ?? "",
        createdAt: now,
        ...patch,
        ...meta,
      } as FeatureRecord;
      rows.push(record);
    }
    lsWrite(LS_RECORDS, rows);
  }

  // Audit entries — one per changed field.
  const entries: AuditEntry[] = Object.keys(patch)
    .filter((k) => !["geometry"].includes(k))
    .map((field) => ({
      featureId,
      layer,
      featureName: opts.featureName,
      action,
      field,
      oldValue: previous[field] ?? null,
      newValue: (patch as Record<string, unknown>)[field] ?? null,
      changedBy: user.uid,
      changedByEmail: user.email ?? "",
      changedAt: now,
    }));
  if (patch.geometry) {
    entries.push({
      featureId,
      layer,
      featureName: opts.featureName,
      action,
      field: "geometry",
      changedBy: user.uid,
      changedByEmail: user.email ?? "",
      changedAt: now,
    });
  }
  await writeAudit(entries);

  return record;
}

export async function createFeature(opts: {
  layer: EditableLayer;
  feature: GeoFeature;
  user: AppUser;
}): Promise<FeatureRecord> {
  const { layer, feature, user } = opts;
  const now = Date.now();
  const featureId = `manual-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const record: FeatureRecord = {
    featureId,
    layer,
    manualEntry: true,
    source: "Manual entry (administrator)",
    geometry: feature.geometry,
    name: (feature.properties.name as string) || "",
    ...(feature.properties as Partial<FeatureRecord>),
    createdBy: user.uid,
    createdByEmail: user.email ?? "",
    createdAt: now,
    updatedBy: user.uid,
    updatedByEmail: user.email ?? "",
    updatedAt: now,
  };

  if (firebaseEnabled && db) {
    await setDoc(doc(db, layer, featureId), record);
  } else {
    const rows = lsRead<FeatureRecord>(LS_RECORDS);
    rows.push(record);
    lsWrite(LS_RECORDS, rows);
  }

  await writeAudit([
    {
      featureId,
      layer,
      featureName: record.name || "(unnamed)",
      action: "create",
      changedBy: user.uid,
      changedByEmail: user.email ?? "",
      changedAt: now,
    },
  ]);
  return record;
}

export async function setArchived(opts: {
  layer: EditableLayer;
  featureId: string;
  featureName: string;
  archived: boolean;
  user: AppUser;
}) {
  return saveRecord({
    layer: opts.layer,
    featureId: opts.featureId,
    featureName: opts.featureName,
    patch: { archived: opts.archived },
    previous: { archived: !opts.archived },
    user: opts.user,
    action: opts.archived ? "archive" : "restore",
  });
}

/* -------------------------------------------------------------------------- */
/*  Audit trail                                                                */
/* -------------------------------------------------------------------------- */

async function writeAudit(entries: AuditEntry[]) {
  if (!entries.length) return;
  if (firebaseEnabled && db) {
    await Promise.all(
      entries.map((e) =>
        addDoc(collection(db!, "audit_logs"), { ...e, _ts: serverTimestamp() })
      )
    );
  } else {
    const rows = lsRead<AuditEntry>(LS_AUDIT);
    rows.push(...entries);
    lsWrite(LS_AUDIT, rows);
  }
}

export async function loadAudit(featureId?: string): Promise<AuditEntry[]> {
  if (firebaseEnabled && db) {
    const q = query(
      collection(db, "audit_logs"),
      orderBy("changedAt", "desc"),
      fsLimit(200)
    );
    const snap = await getDocs(q);
    const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as AuditEntry) }));
    return featureId ? rows.filter((r) => r.featureId === featureId) : rows;
  }
  const rows = lsRead<AuditEntry>(LS_AUDIT).sort((a, b) => b.changedAt - a.changedAt);
  return featureId ? rows.filter((r) => r.featureId === featureId) : rows;
}

/* -------------------------------------------------------------------------- */
/*  Merge static geometry + Firestore overrides                                */
/* -------------------------------------------------------------------------- */

export function mergeFeature(
  base: GeoFeature,
  record: FeatureRecord | undefined
): GeoFeature {
  if (!record) return base;
  const props = { ...base.properties };
  for (const [k, v] of Object.entries(record)) {
    if (["featureId", "layer", "geometry"].includes(k)) continue;
    if (v === undefined || v === null || v === "") continue;
    props[k] = v as unknown;
  }
  props.edited = true;
  return {
    ...base,
    geometry: record.geometry ?? base.geometry,
    properties: props,
  };
}
