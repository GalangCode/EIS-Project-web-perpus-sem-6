import { renderSidebarShell } from "./sidebar-shell.js";
import { navAdmin } from "./nav-admin.js";

export function renderAdminSidebar(active) {
  return renderSidebarShell({
    active,
    profileName: "Admin Perpus",
    profileRole: "Administrator",
    fallbackInitial: "A",
    navItems: navAdmin,
    loginRole: "admin",
  });
}
