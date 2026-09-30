/** Minimal KML reader: pulls the first LineString out of a KML file (e.g.
 * exported from Google My Maps) — enough for a single traced road, without
 * pulling in a full KML/GIS parsing library for one narrow use case. */
export interface ParsedKmlLine {
  name: string | null;
  coordinates: [number, number][];
}

export function parseKmlLineString(kmlText: string): ParsedKmlLine | null {
  const doc = new DOMParser().parseFromString(kmlText, "application/xml");
  if (doc.querySelector("parsererror")) return null;

  const lineString = doc.querySelector("LineString");
  const coordsText = lineString?.querySelector("coordinates")?.textContent;
  if (!coordsText) return null;

  const coordinates = coordsText
    .trim()
    .split(/\s+/)
    .map((tuple) => tuple.split(",").map(Number))
    .filter((c) => c.length >= 2 && c.slice(0, 2).every(isFinite))
    .map(([lng, lat]) => [lng, lat] as [number, number]);
  if (coordinates.length < 2) return null;

  const name = lineString?.closest("Placemark")?.querySelector("name")?.textContent?.trim() || null;
  return { name, coordinates };
}
