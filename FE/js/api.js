const API_BASE_URL = "http://localhost:3001/api";

const SESSION_TOKEN_KEY = "inventoryPro.token";
const SESSION_USER_KEY = "inventoryPro.user";

function getToken() {
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

function getSessionUser() {
  const raw = localStorage.getItem(SESSION_USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setSession(token, user) {
  localStorage.setItem(SESSION_TOKEN_KEY, token);
  localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(SESSION_USER_KEY);
}

function requireAuthOrRedirect() {
  if (!getToken()) {
    window.location.href = "./pages/login.html";
    return false;
  }
  return true;
}

function logout() {
  clearSession();
  window.location.href = "./pages/login.html";
}

class ApiError extends Error {
  constructor(status, payload) {
    super((payload && (payload.message || payload.error)) || `Request failed with status ${status}`);
    this.status = status;
    this.payload = payload;
  }
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = Object.assign({}, options.headers);
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    clearSession();
    window.location.href = "./pages/login.html";
    throw new ApiError(401, { message: "Session expired. Please log in again." });
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(response.status, payload);
  }

  return response;
}

async function apiJson(path, options = {}) {
  const response = await apiFetch(path, options);
  if (response.status === 204) return null;
  return response.json();
}

async function apiBlob(path) {
  const response = await apiFetch(path);
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  return { blob: await response.blob(), filename: match ? match[1] : "download" };
}
