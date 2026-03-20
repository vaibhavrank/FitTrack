import { useEffect, useRef } from "react";
import { haversineDistance, isPointNearPolygon } from "../../utilities/geo";
import { sendLocationUpdate, endActivity } from "../../services/activityService";
import { claimTerritory } from "../../services/territoryService";

const DEFAULT_SEND_INTERVAL = 5000;
const LOOP_DISTANCE_METERS = 15;

export default function RouteTracker({
  isTracking,
  activityType,
  sessionId,
  territories = [],
  onLocationUpdate,
  onRouteUpdate,
  onClaimedTerritory,
  onError,
}) {
  const watchIdRef = useRef(null);
  const routeRef = useRef([]);
  const lastSendRef = useRef(Date.now());
  const claimedRef = useRef(false);
  const startTimeRef = useRef(null);

  const sendUpdate = async ({ sessionId, coords, timestamp }) => {
    try {
      await sendLocationUpdate({
        sessionId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: 10,
        timestamp: new Date(timestamp).toISOString(),
      });
    } catch (err) {
      if (onError) onError(err?.message || "Failed to send location");
    }
  };

  const attemptClaim = async (routePoints) => {
    if (claimedRef.current) return;
    if (routePoints.length < 3) return;

    const start = routePoints[0];
    const end = routePoints[routePoints.length - 1];

    const isLoop = haversineDistance(start, end) <= LOOP_DISTANCE_METERS;

    const territoryMatchingStart = territories.find((territory) =>
      isPointNearPolygon(start, getPolygonCoords(territory), LOOP_DISTANCE_METERS)
    );

    const territoryMatchingEnd = territories.find((territory) =>
      isPointNearPolygon(end, getPolygonCoords(territory), LOOP_DISTANCE_METERS)
    );

    const isTerritoryBoundary =
      territoryMatchingStart &&
      territoryMatchingEnd &&
      territoryMatchingStart.id === territoryMatchingEnd.id;

    if (!isLoop && !isTerritoryBoundary) return;

    claimedRef.current = true;
    try {
      const polygon = routePoints.slice();
      // Ensure polygon is closed.
      if (polygon.length > 0) {
        const first = polygon[0];
        const last = polygon[polygon.length - 1];
        if (haversineDistance(first, last) > LOOP_DISTANCE_METERS) {
          polygon.push(first);
        }
      }

      const response = await claimTerritory(polygon, {
        activityType,
        source: isLoop ? "loop" : "territory-border",
      });
      if (onClaimedTerritory) {
        onClaimedTerritory(response.data || response);
      }
    } catch (err) {
      if (onError) onError(err?.message || "Failed to claim territory");
    }
  };

  const onPosition = (position) => {
    const coords = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    const point = [coords.latitude, coords.longitude];

    routeRef.current = [...routeRef.current, point];
    onLocationUpdate?.(point);
    onRouteUpdate?.([...routeRef.current]);

    const now = Date.now();
    if (now - lastSendRef.current >= DEFAULT_SEND_INTERVAL) {
      lastSendRef.current = now;
      if (sessionId) {
        sendUpdate({ sessionId, coords, timestamp: position.timestamp });
      }
    }

    if (routeRef.current.length > 3) {
      attemptClaim(routeRef.current);
    }
  };

  const onPositionError = (err) => {
    onError?.(err.message || "Location error");
  };

  useEffect(() => {
    if (!isTracking) {
      // End tracking: cleanup watchers and optionally send final activity.
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      if (routeRef.current.length > 1 && sessionId) {
        endActivity(sessionId).catch((err) => {
          // ignore errors; status isn't critical
          // eslint-disable-next-line no-console
          console.warn("End activity failed", err);
        });
      }

      return undefined;
    }

    // Start tracking
    claimedRef.current = false;
    startTimeRef.current = Date.now();
    routeRef.current = [];
    lastSendRef.current = Date.now();

    if (!navigator.geolocation) {
      onError?.("Geolocation is not supported by this browser.");
      return undefined;
    }

    navigator.geolocation.getCurrentPosition(onPosition, onPositionError, {
      enableHighAccuracy: true,
      timeout: 10000,
    });

    watchIdRef.current = navigator.geolocation.watchPosition(
      onPosition,
      onPositionError,
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTracking, activityType, territories, sessionId]);

  return null;
}

function getPolygonCoords(territory) {
  // Territory shape might come as GeoJSON.
  if (!territory) return [];

  if (Array.isArray(territory.polygon)) return territory.polygon;
  if (territory.geometry && territory.geometry.coordinates) {
    // Assume GeoJSON Polygon
    const coords = territory.geometry.coordinates;
    return Array.isArray(coords[0]) ? coords[0].map(([lng, lat]) => [lat, lng]) : [];
  }
  if (territory.coordinates) {
    return territory.coordinates;
  }
  return [];
}
