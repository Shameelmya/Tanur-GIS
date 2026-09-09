"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FeatureCollection } from "geojson";
import { LAYERS, EDITABLE_LAYERS } from "./layers";
import { loadAllRecords, mergeFeature } from "./store";
import type { EditableLayer, FeatureRecord, GeoFeature, LayerId } from "./types";

export interface GisData {
  ready: boolean;
  error: string | null;
  /** Merged (geometry + Firestore overrides) collections, keyed by layer id. */
  collections: Record<LayerId, FeatureCollection>;
  /** Firestore/local records by layer then featureId. */
  records: Record<EditableLayer, Record<string, FeatureRecord>>;
  reload: () => void;
  /** Optimistically apply a record locally and refresh derived data. */
  applyRecord: (layer: EditableLayer, record: FeatureRecord) => void;
}

const empty = (): FeatureCollection => ({ type: "FeatureCollection", features: [] });

export function useGisData(): GisData {
  const [raw, setRaw] = useState<Record<LayerId, FeatureCollection> | null>(null);
  const [records, setRecords] = useState<
    Record<EditableLayer, Record<string, FeatureRecord>>
  >({ roads: {}, bridges: {}, places: {} });
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const entries = await Promise.all(
          LAYERS.map(async (l) => {
            const res = await fetch(l.file);
            if (!res.ok) throw new Error(`${l.file}: ${res.status}`);
            return [l.id, (await res.json()) as FeatureCollection] as const;
          })
        );
        const recs = await loadAllRecords();
        if (cancelled) return;
        setRaw(Object.fromEntries(entries) as Record<LayerId, FeatureCollection>);
        setRecords(recs);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const applyRecord = useCallback(
    (layer: EditableLayer, record: FeatureRecord) => {
      setRecords((prev) => ({
        ...prev,
        [layer]: { ...prev[layer], [record.featureId]: record },
      }));
    },
    []
  );

  const collections = useMemo<Record<LayerId, FeatureCollection>>(() => {
    const out = Object.fromEntries(
      LAYERS.map((l) => [l.id, empty()])
    ) as Record<LayerId, FeatureCollection>;
    if (!raw) return out;

    for (const l of LAYERS) {
      const base = raw[l.id];
      if (!base) continue;
      const isEditable = EDITABLE_LAYERS.includes(l.id as EditableLayer);
      const layerRecords = isEditable ? records[l.id as EditableLayer] : {};
      const usedRecordIds = new Set<string>();

      const features: GeoFeature[] = (base.features as GeoFeature[])
        .map((f) => {
          const rec = layerRecords[f.properties.id];
          if (rec) usedRecordIds.add(f.properties.id);
          return mergeFeature(f, rec);
        })
        .filter((f) => !f.properties.archived);

      // Manual (admin-added) features that have no base geometry entry.
      if (isEditable) {
        for (const [id, rec] of Object.entries(layerRecords)) {
          if (usedRecordIds.has(id) || rec.archived || !rec.geometry) continue;
          features.push({
            type: "Feature",
            geometry: rec.geometry,
            properties: {
              ...(rec as unknown as Record<string, unknown>),
              id: rec.featureId,
              edited: true,
              manualEntry: true,
            },
          } as GeoFeature);
        }
      }

      out[l.id] = { type: "FeatureCollection", features };
    }
    return out;
  }, [raw, records]);

  return {
    ready: Boolean(raw),
    error,
    collections,
    records,
    reload,
    applyRecord,
  };
}
