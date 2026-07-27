const DEFAULT_API_BASE_URL = "http://localhost:8001";

function normalizeBaseUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}

function getSameOriginApiBaseUrl() {
  if (typeof window === "undefined" || !window.location) {
    return "";
  }

  if (!/^https?:$/.test(window.location.protocol)) {
    return "";
  }

  const pathname = window.location.pathname || "/";
  const marker = "/frontend/";
  const index = pathname.indexOf(marker);

  if (index === -1) {
    return "";
  }

  const projectRoot = pathname.slice(0, index);
  const baseUrl = new URL(`${projectRoot}/backend/public/`, window.location.origin);
  return baseUrl.toString().replace(/\/$/, "");
}

export function getApiBaseUrl() {
  if (typeof window !== "undefined" && window.EIS_API_BASE_URL) {
    return normalizeBaseUrl(window.EIS_API_BASE_URL);
  }

  const sameOriginBaseUrl = getSameOriginApiBaseUrl();
  if (sameOriginBaseUrl) {
    return sameOriginBaseUrl;
  }

  return DEFAULT_API_BASE_URL;
}
