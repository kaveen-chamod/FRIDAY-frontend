const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function apiUrl(path) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiRequest(path, { token, speakerToken, masterPassphrase, ...options } = {}) {
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (speakerToken) headers.set("X-Friday-Speaker-Token", speakerToken);
  if (masterPassphrase) headers.set("X-Friday-Master-Passphrase", masterPassphrase);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let response;
  try {
    response = await fetch(apiUrl(path), { ...options, headers });
  } catch (error) {
    throw new ApiError(`Backend connection failed: ${error.message}`, 0);
  }
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  if (!response.ok) {
    const detail = typeof payload === "object" ? payload?.detail : payload;
    throw new ApiError(detail || `Request failed (${response.status})`, response.status);
  }
  return payload;
}

export const api = {
  verifyMaster: (auth, passphrase) =>
    apiRequest("/api/master/verify", {
      ...auth,
      method: "POST",
      body: JSON.stringify({ passphrase }),
    }),
  verifyMasterSpeaker: (auth) =>
    apiRequest("/api/voice/profiles", auth),
  resolveConfirmation: (auth, accepted) =>
    apiRequest("/api/confirm", {
      ...auth,
      method: "POST",
      body: JSON.stringify({ accepted }),
    }),
  roboticsStatus: (auth) => apiRequest("/api/robotics/status", auth),
  twinStatus: (auth) => apiRequest("/api/twin/status", auth),
  activeThreats: (auth) => apiRequest("/api/defense/threats/active", auth),
  incidents: (auth) => apiRequest("/api/defense/incidents?offset=0&limit=8", auth),
  addWaypoint: (auth, name, coordinate) =>
    apiRequest("/api/robotics/waypoints", {
      ...auth,
      method: "POST",
      body: JSON.stringify({ name, coordinate }),
    }),
  planPath: (auth, start, goal) =>
    apiRequest("/api/robotics/plan", {
      ...auth,
      method: "POST",
      body: JSON.stringify({ start, goal }),
    }),
  chat: (auth, message) =>
    apiRequest("/api/chat-text", {
      ...auth,
      method: "POST",
      body: JSON.stringify({
        message,
        session_id: "tactical-hud",
        speaker_token: auth.speakerToken || null,
        master_passphrase: auth.masterPassphrase || null,
      }),
    }),
};

export { API_BASE };
