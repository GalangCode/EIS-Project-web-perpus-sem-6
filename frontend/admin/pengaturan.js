import { field, renderDocument } from "../shared/components.js";
import { renderAdminShell } from "../shared/layout-admin.js";

const content = `<div class="hero-row" style="justify-content:space-between;align-items:flex-start;gap:16px"><div><h1 class="page-title">Pengaturan Admin</h1><p class="page-copy">Kelola preferensi akun administrator dan pengaturan operasional sistem.</p></div><a class="modal-close" href="javascript:history.back()" aria-label="Kembali" style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none">×</a></div>
<section class="form-shell slim">
  <div class="form-grid">
    ${field("Nama Lengkap", "Admin Perpus")}
    ${field("Peran", "Administrator")}
    ${field("Email", "admin@balangan.go.id", { type: "email" })}
    ${field("Unit", "Layanan Perpustakaan")}
    ${field("Status", "Aktif")}
    ${field("Akses", "Manajemen Data Operasional", { full: true })}
  </div>
  <div class="form-actions"><button class="btn primary">Simpan</button></div>
</section>`;

renderDocument("Pengaturan Admin", renderAdminShell("report", "Pengaturan Admin", content, "", { compact: true }));
