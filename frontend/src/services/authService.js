// Auth-related API calls for the frontend.
// Uses a shared apiConnector instance for all network requests.

import apiConnector from "./apiConnector";

export const { setToken, getToken, removeToken, decodeToken, isTokenExpired } = apiConnector;

export function extractTokenFromResponse(data) {
  if (!data || typeof data !== "object") return null;
  return data.access_token || data.token || data.jwt || null;
}

export function saveAuthFromResponse(data) {
  const token = extractTokenFromResponse(data);
  if (token) apiConnector.setToken(token);
  return token;
}

export function sendOtp(email) {
  console.log("Sending OTP for email:", email);
  return apiConnector.post("/auth/send-otp", null, { params: { email } });
}

export function verifyOtp(email, otp) {
  return apiConnector.post("/auth/verify-otp", null, {
    params: { email, otp },
  });
}

export function googleLogin(token) {
  return apiConnector.post("/auth/google-login", null, {
    params: { token },
  });
}

export function resendOtp(email) {
  return apiConnector.post("/auth/send-otp", null, { params: { email } });
}

export function forgotPassword(email) {
  return apiConnector.post("/auth/forgot-password", { email });
}

export function loginWithPassword(email, password) {
  return apiConnector.post("/auth/login", { email, password });
}

export function resetPassword(token, password, email) {
  return apiConnector.post("/auth/reset-password", { token, password, email });
}

export async function logout() {
  // If backend supports logout endpoint, call it for cleanup.
  try {
    await apiConnector.post("/auth/logout");
  } catch {
    // ignore errors; token is removed locally
  } finally {
    apiConnector.removeToken();
  }
}
