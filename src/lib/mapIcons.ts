// Google-Maps-style pin icons, drawn on a <canvas> at runtime (no external
// assets) and registered into MapLibre with map.addImage(). Each icon is a
// coloured teardrop pin with a simple white glyph, so schools, hospitals,
// offices, bridges and stations read as distinct markers instead of dots.

import type maplibregl from "maplibre-gl";

const SIZE = 64; // raster pixels; addImage pixelRatio:2 → ~32css px on screen

type Glyph = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => void;

export const ICON_COLORS: Record<string, string> = {
  "pin-school": "#2F6FED",
  "pin-health": "#EF4444",
  "pin-government": "#10B981",
  "pin-public": "#8B5CF6",
  "pin-police": "#1E3A8A",
  "pin-post": "#F59E0B",
  "pin-court": "#7C3AED",
  "pin-fire": "#DC2626",
  "pin-bridge": "#FB923C",
  "pin-railway": "#334155",
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const glyphs: Record<string, Glyph> = {
  "pin-school": (ctx, cx, cy, r) => {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.85, cy - r * 0.1);
    ctx.lineTo(cx, cy - r * 0.58);
    ctx.lineTo(cx + r * 0.85, cy - r * 0.1);
    ctx.lineTo(cx, cy + r * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.42, cy + r * 0.02);
    ctx.lineTo(cx + r * 0.42, cy + r * 0.02);
    ctx.lineTo(cx + r * 0.42, cy + r * 0.38);
    ctx.lineTo(cx, cy + r * 0.58);
    ctx.lineTo(cx - r * 0.42, cy + r * 0.38);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.85, cy - r * 0.1);
    ctx.lineTo(cx + r * 0.85, cy + r * 0.3);
    ctx.lineWidth = Math.max(1.4, r * 0.11);
    ctx.strokeStyle = "#fff";
    ctx.lineCap = "round";
    ctx.stroke();
  },
  "pin-health": (ctx, cx, cy, r) => {
    ctx.fillStyle = "#fff";
    const t = r * 0.42;
    roundRect(ctx, cx - t / 2, cy - r * 0.6, t, r * 1.2, t / 2.2);
    ctx.fill();
    roundRect(ctx, cx - r * 0.6, cy - t / 2, r * 1.2, t, t / 2.2);
    ctx.fill();
  },
  "pin-government": (ctx, cx, cy, r) => {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.72, cy - r * 0.14);
    ctx.lineTo(cx, cy - r * 0.62);
    ctx.lineTo(cx + r * 0.72, cy - r * 0.14);
    ctx.closePath();
    ctx.fill();
    roundRect(ctx, cx - r * 0.78, cy + r * 0.42, r * 1.56, r * 0.16, r * 0.06);
    ctx.fill();
    for (const dx of [-0.5, -0.17, 0.17, 0.5]) {
      roundRect(ctx, cx + dx * r - r * 0.06, cy - r * 0.02, r * 0.12, r * 0.46, r * 0.05);
      ctx.fill();
    }
  },
  "pin-public": (ctx, cx, cy, r) => {
    ctx.fillStyle = "#fff";
    const outer = r * 0.62;
    const inner = r * 0.27;
    let rot = -Math.PI / 2;
    const step = Math.PI / 5;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
      rot += step;
    }
    ctx.closePath();
    ctx.fill();
  },
  "pin-police": (ctx, cx, cy, r) => {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.6);
    ctx.quadraticCurveTo(cx + r * 0.65, cy - r * 0.45, cx + r * 0.62, cy - r * 0.05);
    ctx.quadraticCurveTo(cx + r * 0.58, cy + r * 0.42, cx, cy + r * 0.66);
    ctx.quadraticCurveTo(cx - r * 0.58, cy + r * 0.42, cx - r * 0.62, cy - r * 0.05);
    ctx.quadraticCurveTo(cx - r * 0.65, cy - r * 0.45, cx, cy - r * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ICON_COLORS["pin-police"];
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.02, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  },
  "pin-post": (ctx, cx, cy, r) => {
    ctx.fillStyle = "#fff";
    roundRect(ctx, cx - r * 0.68, cy - r * 0.44, r * 1.36, r * 0.9, r * 0.08);
    ctx.fill();
    ctx.strokeStyle = ICON_COLORS["pin-post"];
    ctx.lineWidth = Math.max(1.3, r * 0.1);
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.6, cy - r * 0.34);
    ctx.lineTo(cx, cy + r * 0.08);
    ctx.lineTo(cx + r * 0.6, cy - r * 0.34);
    ctx.stroke();
  },
  "pin-court": (ctx, cx, cy, r) => {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.7, cy - r * 0.18);
    ctx.lineTo(cx, cy - r * 0.6);
    ctx.lineTo(cx + r * 0.7, cy - r * 0.18);
    ctx.closePath();
    ctx.fill();
    roundRect(ctx, cx - r * 0.72, cy + r * 0.36, r * 1.44, r * 0.16, r * 0.06);
    ctx.fill();
    for (const dx of [-0.42, 0, 0.42]) {
      roundRect(ctx, cx + dx * r - r * 0.07, cy - r * 0.06, r * 0.14, r * 0.44, r * 0.06);
      ctx.fill();
    }
  },
  "pin-fire": (ctx, cx, cy, r) => {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.62);
    ctx.bezierCurveTo(cx + r * 0.55, cy - r * 0.2, cx + r * 0.3, cy + r * 0.05, cx + r * 0.5, cy + r * 0.35);
    ctx.bezierCurveTo(cx + r * 0.4, cy + r * 0.66, cx - r * 0.4, cy + r * 0.66, cx - r * 0.5, cy + r * 0.35);
    ctx.bezierCurveTo(cx - r * 0.3, cy + r * 0.15, cx - r * 0.1, cy + r * 0.05, cx - r * 0.1, cy - r * 0.15);
    ctx.bezierCurveTo(cx, cy - r * 0.02, cx + r * 0.1, cy - r * 0.35, cx, cy - r * 0.62);
    ctx.closePath();
    ctx.fill();
  },
  "pin-bridge": (ctx, cx, cy, r) => {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = Math.max(1.6, r * 0.16);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.5, r * 0.56, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.56, cy + r * 0.5);
    ctx.lineTo(cx - r * 0.56, cy + r * 0.72);
    ctx.moveTo(cx + r * 0.56, cy + r * 0.5);
    ctx.lineTo(cx + r * 0.56, cy + r * 0.72);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.72, cy + r * 0.72);
    ctx.lineTo(cx + r * 0.72, cy + r * 0.72);
    ctx.stroke();
  },
  "pin-railway": (ctx, cx, cy, r) => {
    ctx.fillStyle = "#fff";
    roundRect(ctx, cx - r * 0.46, cy - r * 0.52, r * 0.92, r * 0.86, r * 0.22);
    ctx.fill();
    ctx.fillStyle = ICON_COLORS["pin-railway"];
    roundRect(ctx, cx - r * 0.32, cy - r * 0.36, r * 0.64, r * 0.34, r * 0.08);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx - r * 0.24, cy + r * 0.46, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + r * 0.24, cy + r * 0.46, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
  },
};

function drawPin(color: string, glyph: Glyph): { width: number; height: number; data: Uint8ClampedArray } {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const cx = SIZE / 2;
  const cyC = SIZE * 0.36;
  const r = SIZE * 0.3;
  const tipY = SIZE * 0.93;

  // soft shadow
  ctx.beginPath();
  ctx.ellipse(cx, tipY - 2, 6, 2.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(15,23,42,0.28)";
  ctx.fill();

  // tail
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.62, cyC + r * 0.62);
  ctx.quadraticCurveTo(cx, tipY, cx, tipY);
  ctx.quadraticCurveTo(cx, tipY, cx + r * 0.62, cyC + r * 0.62);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  // circle head
  ctx.beginPath();
  ctx.arc(cx, cyC, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = SIZE * 0.045;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  glyph(ctx, cx, cyC, r);

  const img = ctx.getImageData(0, 0, SIZE, SIZE);
  return { width: SIZE, height: SIZE, data: img.data };
}

let registered = false;

/** Draws + registers every pin icon into the map's current style, once per style. */
export function registerIcons(map: maplibregl.Map) {
  for (const [id, color] of Object.entries(ICON_COLORS)) {
    if (map.hasImage(id)) continue;
    const glyph = glyphs[id];
    if (!glyph) continue;
    const { width, height, data } = drawPin(color, glyph);
    map.addImage(id, { width, height, data }, { pixelRatio: 2 });
  }
  registered = true;
}

export function iconsRegistered() {
  return registered;
}
