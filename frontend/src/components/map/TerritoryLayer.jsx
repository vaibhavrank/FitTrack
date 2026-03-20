import React, { useMemo } from "react";
import { Polygon, Tooltip } from "react-leaflet";

function hashStringToHue(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    // eslint-disable-next-line no-bitwise
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function makeColor(ownerId) {
  const hue = hashStringToHue(String(ownerId || "unknown"));
  return `hsla(${hue}, 85%, 55%, 0.5)`;
}

function extractPolygonCoords(territory) {
  if (!territory) return [];
  if (Array.isArray(territory.polygon)) return territory.polygon;
  if (territory.geometry && territory.geometry.type === "Polygon") {
    const coords = territory.geometry.coordinates[0];
    return coords.map(([lng, lat]) => [lat, lng]);
  }
  if (Array.isArray(territory.coordinates)) {
    return territory.coordinates;
  }
  return [];
}

export default function TerritoryLayer({ territories = [], currentUserId, highlightId }) {
  const polygons = useMemo(() => {
    return territories
      .map((territory) => {
        const coords = extractPolygonCoords(territory);
        if (!coords || coords.length < 3) return null;

        const isOwn = territory.ownerId && currentUserId && territory.ownerId === currentUserId;
        const fillColor = isOwn ? "rgba(76, 175, 80, 0.35)" : makeColor(territory.ownerId || territory.id);
        const borderColor = isOwn ? "rgba(56, 142, 60, 0.8)" : "rgba(33, 150, 243, 0.9)";

        return {
          id: territory.id || `${territory.ownerId}-${territory.name}`,
          ownerName: territory.ownerName || territory.owner || "Unknown",
          coords,
          fillColor,
          borderColor,
          isOwn,
        };
      })
      .filter(Boolean);
  }, [territories, currentUserId]);

  return (
    <>
      {polygons.map((poly) => (
        <Polygon
          key={poly.id}
          positions={poly.coords}
          pathOptions={{
            color: poly.borderColor,
            fillColor: poly.fillColor,
            fillOpacity: 0.35,
            weight: poly.isOwn ? 3 : 2,
            dashArray: poly.isOwn ? undefined : "6 4",
          }}
        >
          <Tooltip direction="center" sticky>
            <div className="text-xs">
              <strong>{poly.ownerName}</strong>
              <div>{poly.isOwn ? "Your territory" : "Territory"}</div>
            </div>
          </Tooltip>
        </Polygon>
      ))}
    </>
  );
}
