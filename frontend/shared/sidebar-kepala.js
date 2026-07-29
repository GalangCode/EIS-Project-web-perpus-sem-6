import { assetPath } from "./components.js";
import { renderSidebarShell } from "./sidebar-shell.js";
import { navKepala } from "./nav-kepala.js";

export function renderKepalaSidebar(active) {
  return renderSidebarShell({
    active,
    profileName: "Kepala Perpustakaan",
    profileRole: "EXECUTIVE ADMIN",
    fallbackInitial: "K",
    navItems: navKepala,
    loginRole: "kepala",
    bottomLabel: "",
    extraLinks: [
      `<a class="nav-item" href="login.html"><img class="ico-img" src="${assetPath("icons8-information-52.png")}" alt="" aria-hidden="true"><span>Pusat Bantuan</span></a>`,
    ],
  });
}
