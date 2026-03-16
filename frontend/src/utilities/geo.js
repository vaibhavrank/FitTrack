// Utility helpers for geographic computations.

const toRad = (deg) => (deg * Math.PI) / 180;

export function haversineDistance([lat1, lon1], [lat2, lon2]) {
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Ray-casting algorithm for point-in-polygon.
// polygon: array of [lat, lng]
export function pointInPolygon(point, polygon) {
  const [lat, lng] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];

    const intersect =
      (lngI > lng) !== (lngJ > lng) &&
      lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI + Number.EPSILON) + latI;

    if (intersect) inside = !inside;
  }

  return inside;
}

export function distanceToSegment(point, segmentStart, segmentEnd) {
  // Calculates distance in meters from point to the segment [segmentStart, segmentEnd].
  // Using projection of point onto the segment.
  const [lat, lng] = point;
  const [lat1, lng1] = segmentStart;
  const [lat2, lng2] = segmentEnd;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  const φ1 = toRad(lat1);
  const λ1 = toRad(lng1);
  const φ2 = toRad(lat2);
  const λ2 = toRad(lng2);
  const φ = toRad(lat);
  const λ = toRad(lng);

  const R = 6371000;

  const dx = (λ2 - λ1) * Math.cos((φ1 + φ2) / 2);
  const dy = φ2 - φ1;

  const dot = (λ - λ1) * dx + (φ - φ1) * dy;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, dot / lenSq));

  const projLng = λ1 + t * (λ2 - λ1);
  const projLat = φ1 + t * (φ2 - φ1);

  const dLat = φ - projLat;
  const dLng = λ - projLng;
  const dist = Math.sqrt(dLat * dLat + dLng * dLng) * R;

  return dist;
}

export function isPointNearPolygon(point, polygon, thresholdMeters = 20) {
  // Simple test: if point is inside polygon, treat as near.
  if (pointInPolygon(point, polygon)) return true;

  // Otherwise, check distance to each segment.
  for (let i = 0; i < polygon.length; i += 1) {
    const start = polygon[i];
    const end = polygon[(i + 1) % polygon.length];
    if (distanceToSegment(point, start, end) <= thresholdMeters) return true;
  }

  return false;
}
