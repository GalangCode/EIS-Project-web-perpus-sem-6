import { assetPath } from "./components.js";
import { getLoginPath } from "./auth.js";
import { navKepala } from "./nav-kepala.js";

function getInitial(name) {
  const value = String(name || "").trim();
  if (!value) return "K";
  return value.charAt(0).toUpperCase();
}

export function renderKepalaSidebar(active) {
  const profileName = "Kepala Perpustakaan";
  const profileRole = "EXECUTIVE ADMIN";
  const profileInitial = getInitial(profileName);

  const links = navKepala
    .slice(0, 4)
    .map(
      (item) =>
        `<a class="nav-item ${item[3] === active ? "active" : ""}" href="${item[2]}"><img class="ico-img" src="${assetPath(item[0])}" alt="" aria-hidden="true"><span>${item[1].replace("\n", "<br>")}</span></a>`,
    )
    .join("");
  const bottom = navKepala
    .slice(4)
    .map(
      (item) =>
        `<a class="nav-item ${item[3] === active ? "active" : ""}" href="${item[2]}"><img class="ico-img" src="${assetPath(item[0])}" alt="" aria-hidden="true"><span>${item[1].replace("\n", "<br>")}</span></a>`,
    )
    .join("");

  return `<aside class="sidebar exec">
    <div class="brand">
      <img class="brand-logo" src="../../logo.jpeg" alt="Logo Kabupaten Balangan">
      <div>
        <div class="brand-title">EIS Balangan</div>
        <div class="brand-sub">EXECUTIVE INFORMATION<br>SYSTEM</div>
      </div>
    </div>
    <nav class="nav">
      ${links}
      <div class="nav-label"></div>
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
      <a class="nav-item" href="login.html"><img class="ico-img" src="${assetPath("icons8-information-52.png")}" alt="" aria-hidden="true"><span>Pusat Bantuan</span></a>
      <a class="nav-item logout" href="${getLoginPath("kepala")}" data-logout data-logout-target="${getLoginPath("kepala")}"><img class="ico-img" src="${assetPath("icons8-login-52.png")}" alt="" aria-hidden="true"><span>Keluar</span></a>
    </div>
  </aside>`;
}
