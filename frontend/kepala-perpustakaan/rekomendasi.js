import { dataTable, renderDocument, stat } from "../shared/components.js";
import { renderKepalaShell } from "../shared/layout-kepala.js";

const content = `<div class="hero-row" style="margin-bottom:18px">
  <div>
    <p class="page-copy" style="margin:0 0 4px;color:#006565;font-size:14px;font-weight:700">Analitik › Rekomendasi Pengadaan</p>
    <h1 class="page-title" style="color:#006565">Rekomendasi Pengadaan</h1>
  </div>
</div>
<div class="stats-4">
  ${stat("TOTAL USULAN\nJUDUL", "124", "Usulan baru bulan ini", "▤", "green", "+12%")}
  ${stat("ANGGARAN\nTERSEDIA", "Rp 45.2M", "Sisa pagu tahun berjalan", "₽")}
  ${stat("BUKU STATUS\nKRITIS", "18", "Segera", "!", "red")}
  ${stat("SKOR\nKEPUASAN", "4.8/5.0", "", "★", "blue")}
</div>
<div class="panel" style="padding:0">
  <div class="panel-toolbar">
    <div><h2 class="panel-title">Daftar Rekomendasi</h2></div>
    <div class="toolbar-actions"><div class="search" style="width:360px"><span>⌕</span><span>Cari judul buku atau kategori...</span></div><div class="search" style="width:auto">Filter: <strong style="margin-left:8px">Semua Kategori</strong></div><button class="btn">☰</button></div>
  </div>
  ${dataTable(["PERINGKAT", "JUDUL BUKU", "KATEGORI", "PEMINJAMAN", "STATUS STOk", "REKOMENDASI"], [
    ["#1", "The Psychology of Money", "Finansial", "452", "KRITIS", "Tambah 20 Eks"],
    ["#2", "Atomic Habits", "Self-Help", "398", "KRITIS", "Tambah 15 Eks"],
    ["#3", "Laskar Pelangi (Edisi Khusus)", "Sastra Indonesia", "315", "MENIPIS", "Tambah 15 Eks"],
    ["#4", "Clean Code", "Teknologi", "284", "MENIPIS", "Tambah 15 Eks"],
    ["#5", "Sapiens: Riwayat Singkat Umat Manusia", "Sejarah", "210", "CUKUP", "Pertahankan"],
    ["#6", "Negeri 5 Menara", "Novel", "195", "MENIPIS", "Tambah 15 Eks"],
    ["#7", "Bumi Manusia", "Sastra Indonesia", "188", "CUKUP", "Pertahankan"],
    ["#8", "Dilan 1990", "Remaja", "172", "KRITIS", "Tambah 20 Eks"],
    ["#9", "Introduction to Algorithms", "Teknologi", "155", "MENIPIS", "Tambah 15 Eks"],
    ["#10", "Filosofi Teras", "Self-Help", "148", "CUKUP", "Pertahankan"],
    ["#11", "Rich Dad Poor Dad", "Finansial", "139", "MENIPIS", "Tambah 15 Eks"],
    ["#12", "The Lean Startup", "Bisnis", "124", "CUKUP", "Pertahankan"],
  ], {
    widths: ["92px", "320px", "140px", "120px", "120px", "140px"],
    actions: false,
  })}
  <div class="pagination"><span>Menampilkan 12 dari 124 buku yang dianalisis</span><div class="pages"><button class="page-btn">‹</button><button class="page-btn active">1</button><button class="page-btn">2</button><button class="page-btn">3</button><button class="page-btn">...</button><button class="page-btn">11</button><button class="page-btn">›</button></div></div>
</div>
<div class="split" style="margin-top:24px">
  <section class="panel" style="padding:18px">
    <h2 class="panel-title">Kriteria Analisis</h2>
    <div class="page-copy" style="font-size:13px;line-height:22px;margin-top:12px">• Peringkat: Urutan berdasarkan frekuensi peminjaman dalam 90 hari terakhir.<br>• Kritis: Rasio peminjaman per eksisting buku &gt; 5:1 atau stok tersedia = 0.<br>• Menipis: Rasio peminjaman per eksisting buku antara 3:1 hingga 5:1.</div>
  </section>
  <section class="panel" style="padding:18px">
    <h2 class="panel-title">Proyeksi Anggaran</h2>
    <div class="page-copy" style="font-size:13px;margin-top:12px">Berdasarkan rekomendasi di atas, estimasi investasi pengadaan koleksi baru adalah:</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px">
      <div><div class="page-copy" style="font-size:12px">TOTAL ESTIMASI</div><div style="font-size:28px;font-weight:700;color:#191c1d">Rp 842.500.000,-</div></div>
      <button class="btn primary">Ajukan Rencana</button>
    </div>
  </section>
</div>`;

renderDocument("Rekomendasi Pengadaan", renderKepalaShell("analytics", "Sistem Informasi Eksekutif", content, "", { compact: true }));

