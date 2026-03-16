import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { getTerritories } from "../services/territoryService";

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

export default function MapView({ defaultCenter = [20, 0], defaultZoom = 3 }) {
  const [activityType, setActivityType] = useState("walk");
  const [isTracking, setIsTracking] = useState(false);
  const [route, setRoute] = useState([]);
  const [position, setPosition] = useState(null);
  const [territories, setTerritories] = useState([]);
  const [claimedTerritory, setClaimedTerritory] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [followLocation, setFollowLocation] = useState(true);

  const mapRef = useRef(null);

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
        // ignore - map still works
        // eslint-disable-next-line no-console
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

  const handleStartTracking = () => {
    setRoute([]);
    setIsTracking(true);
    setStatusMessage(`Started ${activityType}`);
    setErrorMessage("");
  };

  const handleStopTracking = () => {
    setIsTracking(false);
    setStatusMessage("Tracking paused");
  };

  const handleClearRoute = () => {
    setRoute([]);
    setClaimedTerritory(null);
    setStatusMessage("Route cleared.");
  };

  const toggleFollow = () => {
    setFollowLocation((prev) => !prev);
  };

  const claimPolygon = useMemo(() => {
    if (!claimedTerritory) return null;
    if (Array.isArray(claimedTerritory.polygon)) return claimedTerritory.polygon;
    if (claimedTerritory.geometry && claimedTerritory.geometry.type === "Polygon") {
      return claimedTerritory.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
    }
    if (Array.isArray(claimedTerritory.coordinates)) return claimedTerritory.coordinates;
    return null;
  }, [claimedTerritory]);

  return (
    <div className="flex h-screen flex-col bg-gray-100">
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

      <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
        <div>
          <span className="font-semibold">Follow Location:</span> {followLocation ? "Yes" : "No"}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-300"
            onClick={toggleFollow}
          >
            {followLocation ? "Lock map" : "Unlock map"}
          </button>
        </div>
      </div>

      <div className="relative flex-1">
        <MapContainer
          center={position || defaultCenter}
          zoom={defaultZoom}
          scrollWheelZoom
          whenCreated={(map) => {
            mapRef.current = map;
          }}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <LayersControl position="topright">
            <LayersControl.Overlay name="Live route" checked>
              <>
                {position && <Marker position={position} />}
                {route.length > 1 && <Polyline positions={route} pathOptions={pathOptions} />}
              </>
            </LayersControl.Overlay>

            <LayersControl.Overlay name="My territory" checked>
              <>
                {claimPolygon && (
                  <Polyline
                    positions={claimPolygon}
                    pathOptions={{ color: "#2eb82e", weight: 4, dashArray: "6 5" }}
                  />
                )}
              </>
            </LayersControl.Overlay>

            <LayersControl.Overlay name="Other territories" checked>
              <TerritoryLayer territories={territories} />
            </LayersControl.Overlay>
          </LayersControl>

          <RecenterOnLocation position={position} enabled={followLocation} />

          <RouteTracker
            isTracking={isTracking}
            activityType={activityType}
            territories={territories}
            onLocationUpdate={handleLocationUpdate}
            onRouteUpdate={handleRouteUpdate}
            onClaimedTerritory={handleClaimedTerritory}
            onError={handleTrackerError}
          />
        </MapContainer>
      </div>
    </div>
  );
}
