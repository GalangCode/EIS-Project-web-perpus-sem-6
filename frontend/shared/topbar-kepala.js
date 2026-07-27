import { assetPath } from "./components.js";

export function renderKepalaTopbar(title) {
  return `<header class="topbar head">
    <h1>${title}</h1>
    <div class="top-actions">
      <button class="icon-btn" type="button" aria-label="Notifikasi"><img src="${assetPath("icons8-time-50.png")}" alt="" aria-hidden="true"><span class="dot"></span></button>
      <button class="icon-btn" type="button" aria-label="Pengaturan cepat"><img src="${assetPath("icons8-protect-64.png")}" alt="" aria-hidden="true"></button>
    </div>
  </header>`;
}
