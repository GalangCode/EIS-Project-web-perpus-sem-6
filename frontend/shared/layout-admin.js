import { renderAdminSidebar } from "./sidebar-admin.js";
import { renderAdminTopbar } from "./topbar-admin.js";

export function renderAdminShell(active, title, content, overlay = "", opts = {}) {
  return `<div class="app-shell">
    ${renderAdminSidebar(active)}
    <main class="main">
      ${renderAdminTopbar(title)}
      <div class="content ${opts.compact ? "compact" : ""}">${content}</div>
    </main>
    ${overlay || ""}
  </div>`;
}

