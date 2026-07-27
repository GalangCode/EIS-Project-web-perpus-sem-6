import { getApiBaseUrl } from "./config.js";

const SESSION_KEY = "eis_balangan_session";

function getAccessToken() {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return "";
  }

  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) return "";

  try {
    const session = JSON.parse(raw);
    return String(session?.access_token || "");
  } catch {
    return "";
  }
}

async function readPayload(response) {
  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  if (rawText.trim() === "") {
    return {};
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(rawText);
    } catch {
      return {
        success: false,
        message: "Respons server tidak valid.",
        raw: rawText,
      };
    }
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return {
      success: false,
      message: "Respons server tidak valid.",
      raw: rawText,
    };
  }
}

export async function apiFetch(path, options = {}) {
  const token = getAccessToken();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const payload = await readPayload(response);

  if (!response.ok) {
    const error = new Error(payload?.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}
