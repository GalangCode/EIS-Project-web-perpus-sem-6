import { apiFetch } from "../shared/api.js";
import { renderAdminShell } from "../shared/layout-admin.js";

const booksRows = [
  ["BK-001", "Laskar Pelangi", "Andrea Hirata", "Bentang Pustaka", "2005", "Fiksi", "15", "Aktif"],
  ["BK-002", "Sejarah Nusantara", "M.C. Ricklefs", "Serambi Ilmu", "2008", "Sejarah", "1", "Aktif"],
  ["BK-003", "Arsitektur Cloud Computing", "Bambang S.", "Informatika", "2022", "Teknologi", "24", "Aktif"],
  ["BK-004", "Bumi Manusia", "Pramoedya A. Toer", "Lentera Dipantara", "1980", "Fiksi", "8", "Aktif"],
  ["BK-005", "Dasar-Dasar AI", "Dr. Heru S.", "Andi Offset", "2023", "Teknologi", "0", "Aktif"],
];

function addBookModal() {
  return `<div class="modal-layer">
    <div class="modal" style="width:448px">
      <div class="modal-head">
        <h3>Form Tambah Buku Baru</h3>
        <button class="modal-close">×</button>
      </div>
      <div class="modal-body" style="gap:16px">
        <p style="margin:0;color:#6e7979;font-size:12px;line-height:16px">Masukkan informasi katalog lengkap sesuai buku fisik</p>
        ${field("Judul Buku", "", { placeholder: "Contoh: Belajar Pemrograman Web", full: true })}
        <div class="split" style="gap:16px">
          ${field("Penulis", "", { placeholder: "Nama penulis" })}
          ${field("Penerbit", "", { placeholder: "Nama penerbit" })}
        </div>
        <div class="split" style="gap:16px">
          ${field("Tahun Terbit", "", { placeholder: "2024" })}
          ${field("Kategori", "", { placeholder: "Teknologi" })}
        </div>
        ${field("Jumlah Stok", "", { placeholder: "1" })}
      </div>
      <div class="modal-foot"><button class="btn primary">Simpan Data</button></div>
    </div>
  </div>`;
}

const content = `<div class="hero-row">
  <div>
    <p class="eyebrow">LIBRARY EIS BALANGAN</p>
    <h1 class="page-title">Daftar Katalog Buku</h1>
    <p class="page-copy">Kelola data koleksi buku, penerbit, kategori, dan status ketersediaan.</p>
  </div>
</div>
<div class="stats-4">
  ${stat("TOTAL KOLEKSI", "12,482", "", "▥")}
  ${stat("BUKU DIPINJAM", "431", "", "▥", "blue")}
  ${stat("STOK MENIPIS", "12", "", "△", "amber")}
  ${stat("INPUT BARU\nBULAN INI", "156", "", "↺", "teal")}
</div>
${panel(
  "Katalog Buku Aktif",
  "",
  '<div class="search" style="width:31px;justify-content:center;padding:0">☰</div><div class="search"><span>⌕</span><span>Cari buku...</span></div><button class="btn primary" id="open-book-modal">＋ Tambah Buku</button>',
  dataTable(["ID BUKU", "JUDUL BUKU", "PENULIS", "PENERBIT", "TAHUN", "KATEGORI", "STOK"], booksRows, {
    widths: ["60px", "185px", "160px", "135px", "74px", "120px", "56px"],
  }),
)}`

renderDocument("Daftar Katalog Buku", renderAdminShell("books", "Daftar Katalog Buku", content));

const openButton = document.getElementById("open-book-modal");

if (openButton) {
  openButton.addEventListener("click", () => {
    if (document.querySelector(".modal-layer")) return;
    document.body.insertAdjacentHTML("beforeend", addBookModal());

    const closeModal = () => {
      document.querySelector(".modal-layer")?.remove();
    };

    const layer = document.querySelector(".modal-layer");
    const closeButton = layer?.querySelector(".modal-close");

    closeButton?.addEventListener("click", closeModal);
  });
}
