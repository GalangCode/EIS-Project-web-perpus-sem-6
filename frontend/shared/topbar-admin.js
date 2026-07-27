import { assetPath } from "./components.js";

export function renderAdminTopbar(title) {
  return `<header class="topbar">
    <h1>${title}</h1>
    <div class="top-actions">
      <button class="icon-btn" type="button" aria-label="Notifikasi"><img src="${assetPath("icons8-warning-52.png")}" alt="" aria-hidden="true"><span class="dot"></span></button>
      <button class="icon-btn" type="button" aria-label="Profil"><img src="${assetPath("icons8-people-96.png")}" alt="" aria-hidden="true"></button>
    </div>
  </header>`;
}
