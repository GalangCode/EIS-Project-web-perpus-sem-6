import { dataTable, panel, renderDocument, stat } from "../shared/components.js";
import { renderAdminShell } from "../shared/layout-admin.js";

const circulationRows = [
  ["TRX-001", "Laskar Pelangi", "Aulia Rahmah", "12 Okt 2023", "19 Okt 2023", "Dipinjam"],
  ["TRX-002", "Bumi Manusia", "M. Reza", "09 Okt 2023", "16 Okt 2023", "Terlambat"],
  ["TRX-003", "Atomic Habits", "Dina Pratiwi", "04 Okt 2023", "11 Okt 2023", "Kembali"],
  ["TRX-004", "Sejarah Banjar", "Farhan Hidayat", "01 Okt 2023", "08 Okt 2023", "Kembali"],
];

const content = `<div class="hero-row">
  <div>
    <h1 class="page-title">Riwayat & Transaksi Peminjaman</h1>
    <p class="page-copy">Pantau dan kelola seluruh arus sirkulasi buku perpustakaan Balangan.</p>
  </div>
  <div><button class="btn">EXPORT</button> <a href="tambah-peminjaman.html" class="btn primary">＋ BUAT PEMINJAMAN BARU</a></div>
</div>
<div class="stats-4">
  ${stat("Total Buku Terpinjam", "1,284", "", "▥")}
  ${stat("Sedang Dipinjam", "342", "", "↔")}
  ${stat("Dikembalikan (Bln Ini)", "156", "", "✓")}
  ${stat("Terlambat", "18", "", "!", "red")}
</div>
${panel(
  "Data Transaksi",
  "",
  '<div class="search"><span>⌕</span><span>Cari transaksi...</span></div>',
  dataTable(["ID", "BUKU", "ANGGOTA", "PINJAM", "KEMBALI", "STATUS"], circulationRows, {
    widths: ["90px", "170px", "160px", "118px", "118px", "106px"],
  }),
)}`

renderDocument("Riwayat & Transaksi Peminjaman", renderAdminShell("circulation", "Riwayat & Transaksi Peminjaman", content));
