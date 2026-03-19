import axios from "axios";
import apiConnector from "./apiConnector";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
console.log("Using API base URL:", BASE_URL);
const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use((config) => {
  const token = apiConnector.getToken();
  if (token) {
    config.headers = {
      ...(config.headers ?? {}),
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

export async function getTerritories() {
  const res = await client.get("/territories");
  return res.data;
}

export async function claimTerritory(geoJsonPolygon, metadata = {}) {
  // geoJsonPolygon should be an array of [lat, lng] pairs forming a closed polygon.
  return client.post("/territory/claim", {
    polygon: geoJsonPolygon,
    ...metadata,
  });
}
