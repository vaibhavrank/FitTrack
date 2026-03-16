// Central API connector (fetch-based) with JWT handling and consistent error reporting.

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const TOKEN_KEY = "fittrack_jwt";

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function buildUrl(path) {
  if (!path) return API_BASE;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return `${API_BASE}${path}`;
  return `${API_BASE}/${path}`;
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  if (pad === 2) base64 += "==";
  else if (pad === 3) base64 += "=";
  try {
    return atob(base64);
  } catch {
    return null;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function decodeToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const payloadStr = base64UrlDecode(parts[1]);
  if (!payloadStr) return null;
  try {
    return JSON.parse(payloadStr);
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const payload = decodeToken(token);
  if (!payload) return true;
  if (!payload.exp) return false;
  return Date.now() / 1000 >= payload.exp;
}

function getAuthHeader() {
  const token = getToken();
  if (!token) return null;
  if (isTokenExpired(token)) return null;
  return `Bearer ${token}`;
}

async function parseResponse(res) {
  let data = null;
  try {
    data = await res.json();
  } catch {
    // ignore; might be empty or non-JSON
  }
  return data;
}

async function handleResponse(res) {
  const data = await parseResponse(res);

  if (!res.ok) {
    if (res.status === 401) {
      // Clear stored token on unauthorized so UI can re-authenticate.
      removeToken();
    }

    const message =
      (data && (data.message || data.error)) ||
      `Request failed with status ${res.status}`;

    throw new ApiError(message, res.status, data);
  }

  return data;
}

/**
 * @typedef {Object} RequestOptions
 * @property {string} [method]
 * @property {string} [path]
 * @property {Object} [params] - URL query params
 * @property {Object} [data] - Request body payload
 * @property {Record<string,string>} [headers]
 * @property {'json'|'text'|'blob'|'arrayBuffer'} [responseType]
 * @property {boolean} [includeCredentials]
 */

async function request(options = {}) {
  const {
    method = "GET",
    path = "",
    params,
    data,
    headers = {},
    responseType = "json",
    includeCredentials = true,
  } = options;

  const url = buildUrl(path);
  const urlObj = new URL(url, window.location.origin);
  if (params && typeof params === "object") {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        urlObj.searchParams.set(key, String(value));
      }
    });
  }

  const authHeader = getAuthHeader();
  const mergedHeaders = {
    ...(authHeader ? { Authorization: authHeader } : {}),
    ...headers,
  };

  const init = {
    method,
    headers: mergedHeaders,
    credentials: includeCredentials ? "same-origin" : undefined,
  };

  if (data !== undefined && data !== null) {
    if (data instanceof FormData) {
      init.body = data;
      // Let browser set Content-Type with boundary.
    } else if (typeof data === "object" && !(data instanceof ArrayBuffer)) {
      mergedHeaders["Content-Type"] = mergedHeaders["Content-Type"] || "application/json";
      init.body = JSON.stringify(data);
    } else {
      init.body = data;
    }
  }

  let res;
  try {
    res = await fetch(urlObj.toString(), init);
  } catch (err) {
    throw new ApiError(err.message || "Network request failed", 0, null);
  }

  const response = await handleResponse(res);

  if (responseType === "text") return typeof response === "string" ? response : JSON.stringify(response);
  if (responseType === "blob") return res.blob();
  if (responseType === "arrayBuffer") return res.arrayBuffer();
  return response;
}

const apiConnector = {
  request,
  get(path, options = {}) {
    return request({ ...options, method: "GET", path });
  },
  post(path, data, options = {}) {
    return request({ ...options, method: "POST", path, data });
  },
  put(path, data, options = {}) {
    return request({ ...options, method: "PUT", path, data });
  },
  patch(path, data, options = {}) {
    return request({ ...options, method: "PATCH", path, data });
  },
  delete(path, options = {}) {
    return request({ ...options, method: "DELETE", path });
  },
  buildUrl,
  getToken,
  setToken,
  removeToken,
  decodeToken,
  isTokenExpired,
};

export default apiConnector;
