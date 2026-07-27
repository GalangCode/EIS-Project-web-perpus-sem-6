import { dataTable, panel, renderDocument, stat } from "../shared/components.js";
import { renderKepalaShell } from "../shared/layout-kepala.js";

const content = `<div class="hero-row">
  <div>
    <p class="page-copy" style="margin:0 0 4px;color:#006565;font-size:14px;font-weight:700">Dashboard Eksekutif › Detail Data</p>
    <h1 class="page-title" style="color:#006565">Data Lengkap Analisis Peminjaman</h1>
    <p class="page-copy">Laporan komprehensif inventaris dan sirkulasi koleksi perpustakaan.</p>
  </div>
  <button class="btn primary">Export Report</button>
</div>
${panel(
  "Detail Data",
  "",
  '<button class="btn">Semua Kategori</button><button class="btn">Tahun Ini</button><div class="search"><span>⌕</span><span>Cari judul buku atau penulis...</span></div>',
  dataTable(["RANKING", "BOOK TITLE", "CATEGORY", "TOTAL BORROWED", "STOCK STATUS", "LAST BORROWED"], [
    ["01", "Sejarah Nusantara: Edisi Balangan", "Sejarah", "1,240", "Tersedia", "14 Okt 2023"],
    ["02", "Inovasi Pertanian Banua", "Teknologi", "982", "Stok Menipis", "12 Okt 2023"],
    ["03", "Atlas Budaya Kalimantan Selatan", "Sastra", "855", "Kosong", "10 Okt 2023"],
    ["04", "Ensiklopedia Geografi Balangan", "Sains", "720", "Tersedia", "08 Okt 2023"],
    ["05", "Statistik Pembangunan Daerah", "Data", "612", "Tersedia", "05 Okt 2023"],
  ], {
    widths: ["70px", "260px", "110px", "130px", "120px", "120px"],
    actions: false,
  }),
)}
<div class="stats-4" style="margin-top:24px">
  ${stat("TOTAL KOLEKSI", "12,845", "", "▤")}
  ${stat("ANGGOTA BARU", "+124", "bin", "◎", "blue")}
  ${stat("RETENSI PINJAMAN", "88.4%", "", "↺", "teal")}
  ${stat("TERLAMBAT KEMBALI", "12 Buku", "", "△", "red")}
</div>
<div class="pagination" style="padding-top:0"><span>EIS Balangan • © 2023 Dinas Perpustakaan dan Kearsipan Kabupaten Balangan. Dashboard Eksekutif v2.4.0</span><span>Privacy Policy &nbsp; Terms of Service &nbsp; Contact Support</span></div>`;

renderDocument("Data Lengkap Analisis Peminjaman", renderKepalaShell("headDashboard", "Sistem Informasi Eksekutif", content, "", { compact: true }));

