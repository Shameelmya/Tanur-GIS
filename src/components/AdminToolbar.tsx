"use client";

import type { DrawState } from "@/components/MapView";
import type { EditableLayer } from "@/lib/types";

const ACTIONS: { mode: "point" | "line"; layer: EditableLayer; label: string }[] = [
  { mode: "line", layer: "roads", label: "Add road" },
  { mode: "point", layer: "bridges", label: "Add bridge" },
  { mode: "point", layer: "places", label: "Add place" },
];

export function AdminToolbar({
  activeDraw,
  onStartDraw,
  onFinishLine,
  onUndoVertex,
  onCancel,
}: {
  activeDraw: DrawState | null;
  onStartDraw: (mode: "point" | "line", layer: EditableLayer) => void;
  onFinishLine: () => void;
  onUndoVertex: () => void;
  onCancel: () => void;
}) {
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
        <div className="flex flex-wrap gap-2 px-3 py-2.5">
          {ACTIONS.map((a) => (
            <button
              key={a.label}
              onClick={() => onStartDraw(a.mode, a.layer)}
              className="rounded-lg border border-brand/40 bg-white px-2.5 py-1.5 text-xs font-medium text-brand-dark hover:bg-brand-light"
            >
              + {a.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
