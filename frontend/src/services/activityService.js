import axios from "axios";
import apiConnector from "./apiConnector";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

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

export async function sendLocationUpdate({ activityType, coords, timestamp }) {
  // Backend can use this endpoint to store live tracking updates.
  // ``coords`` should be { latitude, longitude }.
  return client.post("/activities/location", {
    activityType,
    location: coords,
    timestamp,
  });
}

export async function endActivity({ activityType, route, durationSeconds }) {
  return client.post("/activities/complete", {
    activityType,
    route,
    durationSeconds,
  });
}
