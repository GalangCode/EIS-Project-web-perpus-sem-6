import { field, renderDocument } from "../shared/components.js";
import { renderAdminShell } from "../shared/layout-admin.js";

const content = `<div class="hero-row" style="justify-content:space-between;align-items:flex-start;gap:16px">
  <div>
    <h1 class="page-title">Buat Peminjaman Baru</h1>
    <p class="page-copy">Masukkan informasi transaksi peminjaman buku.</p>
  </div>
  <a class="modal-close" href="sirkulasi.html" aria-label="Kembali ke sirkulasi" style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none">×</a>
</div>
<section class="form-shell">
  <div class="form-grid">
    ${field("ID TRANSAKSI", "TRX-005")}
    ${field("NAMA ANGGOTA", "", { placeholder: "Pilih anggota" })}
    ${field("JUDUL BUKU", "", { placeholder: "Pilih buku" })}
    ${field("TANGGAL PINJAM", "", { placeholder: "21/07/2026" })}
    ${field("TANGGAL KEMBALI", "", { placeholder: "28/07/2026" })}
    ${field("STATUS", "Dipinjam")}
  </div>
  <div class="form-actions"><button class="btn primary">Simpan</button></div>
</section>`;

renderDocument("Buat Peminjaman Baru", renderAdminShell("circulation", "Buat Peminjaman Baru", content, "", { compact: true }));
