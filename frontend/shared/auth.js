import { apiFetch } from "./api.js";

const SESSION_KEY = "eis_balangan_session";
const SIDEBAR_COLLAPSED_KEY = "eis_balangan_sidebar_collapsed";

const roleRoutes = {
  admin: {
    login: "login.html",
    home: "admin/kategori.html",
  },
  kepala: {
    login: "login.html",
    home: "kepala-perpustakaan/dashboard.html",
  },
};

const pageRoles = {
  adminLogin: "admin",
  category: "admin",
  books: "admin",
  members: "admin",
  circulation: "admin",
  addBorrow: "admin",
  report: "admin",
  adminSettings: "admin",
  kepalaLogin: "kepala",
  headDashboard: "kepala",
  collection: "kepala",
  analytics: "kepala",
  users: "kepala",
  addUser: "kepala",
  recommendations: "kepala",
  allDashboard: "kepala",
  settings: "kepala",
};

function getFrontendBasePath() {
  if (typeof window === "undefined" || !window.location) {
    return "/frontend/";
  }

  const pathname = window.location.pathname;
  const marker = "/frontend/";
  const index = pathname.indexOf(marker);

  if (index === -1) {
    return "/frontend/";
  }

  return pathname.slice(0, index + marker.length);
}

function toFrontendUrl(path) {
  return `${getFrontendBasePath()}${String(path).replace(/^\/+/, "")}`;
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

  try {
    return atob(padded);
  } catch {
    return "";
  }
}

function decodeTokenPayload(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const decoded = decodeBase64Url(parts[1]);
  if (!decoded) return null;
  try {
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function saveSession(payload) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
}

export function getSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function getSessionRole() {
  const session = getSession();
  if (!session?.access_token) return null;
  const claims = decodeTokenPayload(session.access_token);
  return claims?.role || session?.user?.role?.code || null;
}

export function isSidebarCollapsed() {
  if (typeof window === "undefined" || !window.localStorage) return false;
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
}

export function setSidebarCollapsed(value) {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, value ? "1" : "0");
}

export function bindSidebarToggle() {
  if (typeof document === "undefined") return;
  if (document.documentElement.dataset.sidebarToggleBound === "1") {
    const collapsed = isSidebarCollapsed();
    document.querySelectorAll(".app-shell").forEach((shell) => {
      shell.classList.toggle("sidebar-collapsed", collapsed);
      shell.querySelector(".sidebar")?.classList.toggle("collapsed", collapsed);
    });
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    document.querySelectorAll("[data-sidebar-toggle]").forEach((button) => {
      button.setAttribute("aria-expanded", String(!collapsed));
      button.setAttribute("aria-label", collapsed ? "Tampilkan sidebar" : "Sembunyikan sidebar");
      button.dataset.state = collapsed ? "collapsed" : "expanded";
      button.textContent = collapsed ? "▶" : "◀";
    });
    return;
  }

  document.documentElement.dataset.sidebarToggleBound = "1";

  const applyState = (collapsed) => {
    document.querySelectorAll(".app-shell").forEach((shell) => {
      shell.classList.toggle("sidebar-collapsed", collapsed);
      shell.querySelector(".sidebar")?.classList.toggle("collapsed", collapsed);
    });
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    document.querySelectorAll("[data-sidebar-toggle]").forEach((button) => {
      button.setAttribute("aria-expanded", String(!collapsed));
      button.setAttribute("aria-label", collapsed ? "Tampilkan sidebar" : "Sembunyikan sidebar");
      button.dataset.state = collapsed ? "collapsed" : "expanded";
      button.textContent = collapsed ? "▶" : "◀";
    });
  };

  applyState(isSidebarCollapsed());

  document.addEventListener(
    "click",
    (event) => {
      const button = event.target instanceof Element ? event.target.closest("[data-sidebar-toggle]") : null;
      if (!button) return;

      const shell = button.closest(".app-shell") || document.querySelector(".app-shell");
      if (!shell) return;

      const next = !shell.classList.contains("sidebar-collapsed");
      setSidebarCollapsed(next);
      applyState(next);
    },
    true,
  );
}

export function getLoginPath(role) {
  return toFrontendUrl(roleRoutes[role]?.login || roleRoutes.admin.login);
}

export function getHomePath(role) {
  return toFrontendUrl(roleRoutes[role]?.home || roleRoutes.admin.home);
}

export function getRequiredRole(page) {
  return pageRoles[page] || null;
}

export function resolveTargetPage(role) {
  return getHomePath(role);
}

export function shouldRequireAuth(page) {
  return pageRoles[page] && !String(page).toLowerCase().includes("login");
}

export function getSessionClaims() {
  const session = getSession();
  if (!session?.access_token) return null;
  return decodeTokenPayload(session.access_token);
}

export function setupLoginForm(role) {
  const form = document.querySelector("[data-login-form]");
  const alertBox = document.querySelector("[data-login-alert]");
  const submitButton = document.querySelector("[data-login-submit]");
  const eyeButton = document.querySelector(".auth-field.password .eye");
  const passwordInput = document.querySelector('.auth-field.password input[name="password"]');

  if (!form) {
    return;
  }

  const currentRole = getSessionRole();
  if (currentRole) {
    window.location.replace(getHomePath(currentRole));
    return;
  }

  eyeButton?.addEventListener("click", () => {
    if (!passwordInput) return;
    passwordInput.type = passwordInput.type === "password" ? "text" : "password";
  });

  const setAlert = (message, type = "error") => {
    if (!alertBox) return;
    alertBox.hidden = !message;
    alertBox.textContent = message || "";
    alertBox.dataset.type = type;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setAlert("");

    const formData = new FormData(form);
    const identifier = String(formData.get("identifier") || "").trim();
    const password = String(formData.get("password") || "");

    if (!identifier || !password) {
      setAlert("Username/email dan password wajib diisi.");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Memproses...";
    }

    try {
      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      });

      const session = response?.data || {};
      saveSession(session);
      const roleCode = session?.user?.role?.code || role;
      window.location.replace(getHomePath(roleCode));
    } catch (error) {
      setAlert(error?.payload?.message || error?.message || "Login gagal.");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = role === "kepala" ? "Login Kepala" : role === "admin" ? "Login Admin" : "Masuk";
      }
    }
  });
}

export function bindLogoutLinks() {
  document.addEventListener(
    "click",
    (event) => {
      const link = event.target instanceof Element ? event.target.closest("[data-logout]") : null;
      if (!link) return;

      event.preventDefault();
      clearSession();

      const target = link.getAttribute("data-logout-target") || link.getAttribute("href") || getLoginPath("admin");
      window.location.replace(target);
    },
    true,
  );
}
