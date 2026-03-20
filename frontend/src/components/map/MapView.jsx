import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import {
  LayersControl,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import ActivityControls from "./ActivityControls";
import RouteTracker from "./RouteTracker";
import TerritoryLayer from "./TerritoryLayer";
import { getTerritories } from "../../services/territoryService";
import { startActivity, endActivity } from "../../services/activityService";

// Fix for default Leaflet icon not displaying when bundling with Vite.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function RecenterOnLocation({ position, enabled }) {
  const map = useMap();

  useEffect(() => {
    if (enabled && position) {
      map.setView(position, map.getZoom(), { animate: true });
    }
  }, [map, position, enabled]);

  return null;
}

function extractPolygonCoords(territory) {
  if (!territory) return [];
  if (Array.isArray(territory.polygon)) return territory.polygon;
  if (territory.geometry && territory.geometry.type === "Polygon") {
    return territory.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
  }
  return [];
}

export default function MapView({ defaultCenter = [20, 0], defaultZoom = 12 }) {
  const user = useSelector((state) => state.auth?.user);
  const userId = user?.id;

  const [activityType, setActivityType] = useState("walk");
  const [isTracking, setIsTracking] = useState(false);
  const [route, setRoute] = useState([]);
  const [position, setPosition] = useState(null);
  const [territories, setTerritories] = useState([]);
  const [claimedTerritory, setClaimedTerritory] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [followLocation, setFollowLocation] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [firstFix, setFirstFix] = useState(false);
  const [selectedTerritory, setSelectedTerritory] = useState(null);

  const mapRef = useRef(null);

  const ownTerritories = useMemo(() => {
    if (!userId) return [];
    return territories.filter((t) => t.owner_id === userId);
  }, [territories, userId]);

  const selectedCoords = useMemo(() => extractPolygonCoords(selectedTerritory), [selectedTerritory]);

  const pathOptions = useMemo(
    () => ({
      color: "#2a9df4",
      weight: 4,
      opacity: 0.85,
    }),
    []
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getTerritories();
        if (mounted) setTerritories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn("Failed to load territories", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLocationUpdate = (latlng) => {
    setPosition(latlng);
    setStatusMessage(`Tracking ${activityType} · ${latlng[0].toFixed(5)}, ${latlng[1].toFixed(5)}`);
    setErrorMessage("");
    if (!firstFix && mapRef.current) {
      setFirstFix(true);
      mapRef.current.setView(latlng, 14);
    }
  };

  const handleRouteUpdate = (newRoute) => {
    setRoute(newRoute);
  };

  const handleClaimedTerritory = (territoryData) => {
    setClaimedTerritory(territoryData);
    setStatusMessage("Territory claimed!");
  };

  const handleTrackerError = (message) => {
    setErrorMessage(message);
  };

  const handleStartTracking = async () => {
    setRoute([]);
    setIsTracking(true);
    setStatusMessage(`Starting ${activityType}...`);
    setErrorMessage("");
    try {
      const session = await startActivity(activityType);
      setSessionId(session.id);
      setStatusMessage(`Started ${activityType} (session ${session.id})`);
    } catch (err) {
      setErrorMessage(err.message || "Unable to start session");
      setIsTracking(false);
    }
  };

  const handleStopTracking = async () => {
    setIsTracking(false);
    if (!sessionId) return;
    try {
      await endActivity(sessionId);
      setStatusMessage("Tracking stopped and activity ended.");
      setSessionId(null);
    } catch (err) {
      setErrorMessage(err.message || "Failed to end activity");
    }
  };

  const handleClearRoute = () => {
    setRoute([]);
    setClaimedTerritory(null);
    setStatusMessage("Route cleared.");
  };

  const toggleFollow = () => setFollowLocation((prev) => !prev);

  const claimPolygon = useMemo(() => {
    if (!claimedTerritory) return null;
    return extractPolygonCoords(claimedTerritory);
  }, [claimedTerritory]);

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 bg-slate-900 border-b border-slate-700">
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
          <div className="text-xs uppercase tracking-widest text-slate-300">User</div>
          <div className="mt-1 text-sm font-semibold">{user?.email ?? "Guest (login to claim)"}</div>
          <div className="mt-1 text-xs text-slate-300">Session: {sessionId ?? "none"}</div>
          <div className="mt-2 text-xs text-slate-200">{statusMessage || "Press start to track your route."}</div>
          {errorMessage && <div className="mt-2 text-xs text-rose-300">{errorMessage}</div>}
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
          <div className="text-xs uppercase tracking-widest text-slate-300">Actions</div>
          <div className="mt-2 text-xs">Follow: {followLocation ? "On" : "Off"}</div>
          <button onClick={toggleFollow} className="mt-2 w-full rounded bg-cyan-600 px-2 py-1 text-xs">{followLocation ? "Unlock map" : "Lock map"}</button>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
          <div className="text-xs uppercase tracking-widest text-slate-300">My Territories</div>
          <div className="mt-1 text-xs text-slate-300">{ownTerritories.length} claimed</div>
          <div className="mt-2 max-h-24 overflow-y-auto space-y-1">
            {ownTerritories.length === 0 ? (
              <div className="text-xs text-slate-400">No territory yet.</div>
            ) : (
              ownTerritories.map((t) => (
                <button
                  key={t.id}
                  className="block w-full rounded bg-slate-700 px-2 py-1 text-left text-xs hover:bg-slate-600"
                  onClick={() => setSelectedTerritory(t)}
                >
                  {t.id} - {(t.area || 0).toFixed(0)} m²
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <ActivityControls
        activityType={activityType}
        onChangeActivityType={setActivityType}
        isTracking={isTracking}
        onStartTracking={handleStartTracking}
        onStopTracking={handleStopTracking}
        onClearRoute={handleClearRoute}
        statusMessage={statusMessage}
        errorMessage={errorMessage}
      />

      <div className="relative flex-1">
        <MapContainer
          center={position || defaultCenter}
          zoom={defaultZoom}
          scrollWheelZoom
          whenCreated={(map) => { mapRef.current = map; }}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <LayersControl position="topright">
            <LayersControl.Overlay name="Live route" checked>
              <>
                {position && <Marker position={position} />}
                {route.length > 1 && <Polyline positions={route} pathOptions={pathOptions} />}
              </>
            </LayersControl.Overlay>

            <LayersControl.Overlay name="My claim" checked>
              <>{claimPolygon && <Polyline positions={claimPolygon} pathOptions={{ color: "#22c55e", weight: 4, dashArray: "6 4" }} />}</>
            </LayersControl.Overlay>

            <LayersControl.Overlay name="All territories" checked>
              <TerritoryLayer territories={territories} currentUserId={userId} />
            </LayersControl.Overlay>
          </LayersControl>

          <RecenterOnLocation position={position} enabled={followLocation && Boolean(position)} />

          <RouteTracker
            isTracking={isTracking}
            activityType={activityType}
            sessionId={sessionId}
            territories={territories}
            onLocationUpdate={handleLocationUpdate}
            onRouteUpdate={handleRouteUpdate}
            onClaimedTerritory={handleClaimedTerritory}
            onError={handleTrackerError}
          />

          {selectedCoords && <Polyline positions={selectedCoords} pathOptions={{ color: "#f59e0b", weight: 3, dashArray: "8 5" }} />}
        </MapContainer>
      </div>
    </div>
  );
}
