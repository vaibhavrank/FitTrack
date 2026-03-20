import axios from "axios";
import apiConnector from "./apiConnector";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
console.log("Using API base URL:", BASE_URL);
const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
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

export async function startActivity(activityType) {
  const res = await client.post("/activity/start", { activity_type: activityType });
  return res.data;
}

export async function sendLocationUpdate({ sessionId, latitude, longitude, accuracy, speed, timestamp }) {
  return client.post("/activity/location", {
    session_id: sessionId,
    latitude,
    longitude,
    accuracy,
    speed,
    timestamp,
  });
}

export async function endActivity(sessionId) {
  return client.post("/activity/end", {
    session_id: sessionId,
  });
}
