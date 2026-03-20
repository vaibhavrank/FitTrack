import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix for default Leaflet icon not displaying when bundling with Vite.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function RecenterOnLocation({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom(), { animate: true });
    }
  }, [map, position]);

  return null;
}

/**
 * MapViewer
 * 
 * Renders an interactive map with user location detection and path drawing.
 * - Shows a tile layer (OpenStreetMap)
 * - Detects user location (permission required)
 * - Tracks path when tracking is enabled
 * - Exposes callbacks for location/path changes
 */
export default function MapViewer({
  defaultCenter = [20, 0],
  defaultZoom = 3,
  followLocation = true,
  onLocationUpdate,
  onPathUpdate,
}) {
  const [position, setPosition] = useState(null);
  const [path, setPath] = useState([]);
  const [tracking, setTracking] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [error, setError] = useState(null);
  const watcherRef = useRef(null);

  const addPointToPath = (latlng) => {
    setPath((prev) => {
      const next = [...prev, latlng];
      if (onPathUpdate) onPathUpdate(next);
      return next;
    });
  };

  function MapClickHandler() {
    const map = useMap();
    useEffect(() => {
      if (!drawing) return;

      const onClick = (event) => {
        const latlng = [event.latlng.lat, event.latlng.lng];
        addPointToPath(latlng);
      };

      map.on("click", onClick);
      return () => {
        map.off("click", onClick);
      };
    }, [drawing, map]);

    return null;
  }

  const pathOptions = useMemo(
    () => ({
      color: "#2a9df4",
      weight: 4,
      opacity: 0.8,
    }),
    []
  );

  const onPositionUpdate = (latlng) => {
    setPosition(latlng);
    if (onLocationUpdate) onLocationUpdate(latlng);

    if (tracking) {
      setPath((prev) => {
        const next = [...prev, latlng];
        if (onPathUpdate) onPathUpdate(next);
        return next;
      });
    }
  };

  const handleGeolocationError = (err) => {
    setError(err.message || "Failed to access location");
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latlng = [position.coords.latitude, position.coords.longitude];
        onPositionUpdate(latlng);
      },
      handleGeolocationError,
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setError(null);
    setTracking(true);

    watcherRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const latlng = [position.coords.latitude, position.coords.longitude];
        onPositionUpdate(latlng);
      },
      handleGeolocationError,
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      }
    );
  };

  const stopTracking = () => {
    if (watcherRef.current !== null) {
      navigator.geolocation.clearWatch(watcherRef.current);
      watcherRef.current = null;
    }
    setTracking(false);
  };

  const resetPath = () => {
    setPath([]);
  };

  useEffect(() => {
    // Optionally start by centering on user location.
    requestLocation();

    return () => {
      stopTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-white p-3">
        <div>
          <strong className="text-sm">Map</strong>
          <div className="text-xs text-gray-600">
            {error
              ? `Location error: ${error}`
              : position
              ? `Lat ${position[0].toFixed(5)}, Lng ${position[1].toFixed(5)}`
              : "Waiting for location..."}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
            onClick={requestLocation}
          >
            Locate me
          </button>

          <button
            type="button"
            className={`rounded px-3 py-1 text-xs font-semibold text-white ${
              tracking ? "bg-red-500 hover:bg-red-600" : "bg-green-600 hover:bg-green-700"
            }`}
            onClick={tracking ? stopTracking : startTracking}
          >
            {tracking ? "Stop tracking" : "Start tracking"}
          </button>

          <button
            type="button"
            className={`rounded px-3 py-1 text-xs font-semibold text-white ${
              drawing ? "bg-indigo-600 hover:bg-indigo-700" : "bg-gray-600 hover:bg-gray-700"
            }`}
            onClick={() => setDrawing((prev) => !prev)}
          >
            {drawing ? "Finish drawing" : "Draw path"}
          </button>

          <button
            type="button"
            className="rounded bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-300"
            onClick={resetPath}
          >
            Clear path
          </button>
        </div>
      </div>

      <div className="relative flex-1">
        <MapContainer
          center={position || defaultCenter}
          zoom={defaultZoom}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {position && <Marker position={position} />}
          {path.length >= 2 && <Polyline positions={path} pathOptions={pathOptions} />}
          {drawing && <MapClickHandler />}
          {followLocation && position && <RecenterOnLocation position={position} />}
        </MapContainer>
      </div>
    </div>
  );
}
