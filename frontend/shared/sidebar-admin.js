import { assetPath } from "./components.js";
import { getLoginPath } from "./auth.js";
import { navAdmin } from "./nav-admin.js";

function getInitial(name) {
  const value = String(name || "").trim();
  if (!value) return "A";
  return value.charAt(0).toUpperCase();
}

export function renderAdminSidebar(active) {
  const profileName = "Admin Perpus";
  const profileRole = "Administrator";
  const profileInitial = getInitial(profileName);

  const links = navAdmin
    .slice(0, 4)
    .map(
      (item) =>
        `<a class="nav-item ${item[3] === active ? "active" : ""}" href="${item[2]}"><img class="ico-img" src="${assetPath(item[0])}" alt="" aria-hidden="true"><span>${item[1].replace("\n", "<br>")}</span></a>`,
    )
    .join("");
  const bottom = navAdmin
    .slice(4)
    .map(
      (item) =>
        `<a class="nav-item ${item[3] === active ? "active" : ""}" href="${item[2]}"><img class="ico-img" src="${assetPath(item[0])}" alt="" aria-hidden="true"><span>${item[1].replace("\n", "<br>")}</span></a>`,
    )
    .join("");

  return `<aside class="sidebar">
    <div class="brand">
      <img class="brand-logo" src="../../logo.jpeg" alt="Logo Kabupaten Balangan">
      <div>
        <div class="brand-title">EIS Balangan</div>
        <div class="brand-sub">EXECUTIVE INFORMATION<br>SYSTEM</div>
      </div>
    </div>
    <nav class="nav">
      ${links}
      <div class="nav-label">REPORTS</div>
      ${bottom}
    </nav>
    <div class="profile">
      <div class="profile-row">
        <div class="avatar">${profileInitial}</div>
        <div>
          <strong>${profileName}</strong>
          <span>${profileRole}</span>
        </div>
      </div>
      <a class="nav-item logout" href="${getLoginPath("admin")}" data-logout data-logout-target="${getLoginPath("admin")}"><img class="ico-img" src="${assetPath("icons8-login-52.png")}" alt="" aria-hidden="true"><span>Keluar</span></a>
    </div>
  </aside>`;
}
