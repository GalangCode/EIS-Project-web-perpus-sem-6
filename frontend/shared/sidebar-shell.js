import { assetPath } from "./components.js";
import { getLoginPath, isSidebarCollapsed } from "./auth.js";

function getInitial(name, fallback) {
  const value = String(name || "").trim();
  if (!value) return fallback;
  return value.charAt(0).toUpperCase();
}

function renderNavItems(items, active) {
  return items
    .map(
      (item) =>
        `<a class="nav-item ${item[3] === active ? "active" : ""}" href="${item[2]}"><img class="ico-img" src="${assetPath(item[0])}" alt="" aria-hidden="true"><span>${item[1].replace("\n", "<br>")}</span></a>`,
    )
    .join("");
}

export function renderSidebarShell({
  active,
  profileName,
  profileRole,
  fallbackInitial,
  navItems,
  loginRole,
  bottomLabel = "",
  extraLinks = [],
}) {
  const profileInitial = getInitial(profileName, fallbackInitial);
  const collapsed = isSidebarCollapsed();
  const topItems = navItems.slice(0, 4);
  const bottomItems = navItems.slice(4);
  const bottomTitle = String(bottomLabel || "").trim();
  const extras = extraLinks.join("");

  return `<aside class="sidebar exec ${collapsed ? "collapsed" : ""}">
    <button class="sidebar-toggle" type="button" data-sidebar-toggle aria-expanded="${collapsed ? "false" : "true"}" aria-label="${collapsed ? "Tampilkan sidebar" : "Sembunyikan sidebar"}">${collapsed ? "▶" : "◀"}</button>
    <div class="brand">
      <img class="brand-logo" src="../../logo.png" alt="Logo Kabupaten Balangan">
      <div>
        <div class="brand-title">EIS Balangan</div>
        <div class="brand-sub">EXECUTIVE INFORMATION<br>SYSTEM</div>
      </div>
    </div>
    <nav class="nav">
      ${renderNavItems(topItems, active)}
      ${bottomTitle ? `<div class="nav-label">${bottomTitle}</div>` : ""}
      ${renderNavItems(bottomItems, active)}
    </nav>
    <div class="profile">
      <div class="profile-row">
        <div class="avatar">${profileInitial}</div>
        <div>
          <strong>${profileName}</strong>
          <span>${profileRole}</span>
        </div>
      </div>
      ${extras}
      <a class="nav-item logout" href="${getLoginPath(loginRole)}" data-logout data-logout-target="${getLoginPath(loginRole)}"><img class="ico-img" src="${assetPath("icons8-login-52.png")}" alt="" aria-hidden="true"><span>Keluar</span></a>
    </div>
  </aside>`;
}
