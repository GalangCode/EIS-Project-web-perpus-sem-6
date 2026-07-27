import { renderKepalaSidebar } from "./sidebar-kepala.js";
import { renderKepalaTopbar } from "./topbar-kepala.js";

export function renderKepalaShell(active, title, content, overlay = "", opts = {}) {
  return `<div class="app-shell exec">
    ${renderKepalaSidebar(active)}
    <main class="main">
      ${renderKepalaTopbar(title)}
      <div class="content ${opts.compact ? "compact" : ""}">${content}</div>
    </main>
    ${overlay || ""}
  </div>`;
}

