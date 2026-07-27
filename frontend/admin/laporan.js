import { apiFetch } from "../shared/api.js";
import { renderDocument, stat, escapeHtml, field } from "../shared/components.js";
import { renderAdminShell } from "../shared/layout-admin.js";

const MONTH_LABELS = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];
const MONTH_LONG_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatInputDate(date) {
  return [date.getFullYear(), pad2(date.getMonth() + 1), pad2(date.getDate())].join("-");
}

function getDefaultReportRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startDate: formatInputDate(start), endDate: formatInputDate(end) };
}

function normalizeDateValue(value, fallback) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : fallback;
}

function normalizeYearValue(value, fallback) {
  const year = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(year) && year > 1900 ? String(year) : String(fallback);
}

function formatReportDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function formatReportPeriod(startDate, endDate) {
  const start = formatReportDate(startDate);
  const end = formatReportDate(endDate);
  if (start === "-" || end === "-") return "-";
  return `${start} - ${end}`;
}

function getInitialFilters() {
  const defaults = getDefaultReportRange();
  const params = new URLSearchParams(window.location.search);
  const startDate = normalizeDateValue(params.get("start_date"), defaults.startDate);
  const endDate = normalizeDateValue(params.get("end_date"), defaults.endDate);
  const chartYear = normalizeYearValue(params.get("chart_year"), new Date().getFullYear());
  return { startDate, endDate, chartYear };
}

function normalizeFilters(filters = {}) {
  const defaults = getDefaultReportRange();
  const startDate = normalizeDateValue(filters.startDate, defaults.startDate);
  const endDate = normalizeDateValue(filters.endDate, defaults.endDate);
  const chartYear = normalizeYearValue(filters.chartYear, new Date().getFullYear());

  if (startDate !== "-" && endDate !== "-" && startDate > endDate) {
    return {
      startDate: endDate,
      endDate: startDate,
      chartYear,
    };
  }

  return { startDate, endDate, chartYear };
}

function buildReportQuery(filters) {
  const params = new URLSearchParams();
  if (filters.startDate) params.set("start_date", filters.startDate);
  if (filters.endDate) params.set("end_date", filters.endDate);
  if (filters.chartYear) params.set("chart_year", filters.chartYear);
  return params.toString();
}

function getMonthActivity(items, year) {
  const normalized = Array.isArray(items) ? items : [];
  const byKey = new Map(normalized.map((item) => [String(item.key || "").slice(0, 7), item]));

  return MONTH_LABELS.map((label, index) => {
    const month = index + 1;
    const key = `${year}-${pad2(month)}`;
    const fallback = {
      key,
      label,
      month_label: `${MONTH_LONG_LABELS[index]} ${year}`,
      loans: 0,
      books_added: 0,
    };
    return { ...fallback, ...(byKey.get(key) || {}) };
  });
}

const initialFilters = getInitialFilters();

const state = {
  loading: true,
  error: "",
  generatedAt: "",
  periodLabel: formatReportPeriod(initialFilters.startDate, initialFilters.endDate),
  filters: initialFilters,
  summary: {
    members: { total: 0, active: 0, inactive: 0, new_this_month: 0 },
    books: { total: 0, active: 0, low_stock: 0, empty_stock: 0 },
    categories: { total: 0, active: 0, inactive: 0 },
    loans: { total: 0, borrowed: 0, returned_count: 0, overdue_count: 0, cancelled_count: 0, this_month: 0 },
  },
  monthlyLoans: [],
  monthlyActivity: [],
  loanStatusBreakdown: [],
  topBooks: [],
  topCategories: [],
  categoryAnalysis: [],
  demographics: [],
  recentLoans: [],
};

function formatCount(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}

function statusPill(status) {
  if (status === "dipinjam") return '<span class="pill amber">Dipinjam</span>';
  if (status === "dikembalikan") return '<span class="pill green">Dikembalikan</span>';
  if (status === "terlambat") return '<span class="pill red">Terlambat</span>';
  if (status === "dibatalkan") return '<span class="pill red">Dibatalkan</span>';
  if (status === "aktif") return '<span class="pill green">Aktif</span>';
  if (status === "nonaktif") return '<span class="pill red">Nonaktif</span>';
  return `<span class="pill">${status || "-"}</span>`;
}

function stockRecommendation(item) {
  const available = Number(item?.stock_available || 0);
  if (available <= 0) return "Restock segera";
  if (available <= 3) return "Tambah stok";
  return "Pertahankan";
}

function formatMonthRange(dateValue) {
  const date = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(date.getTime())) return "-";
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const formatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function getBookShareCategories() {
  const items = state.topCategories.slice(0, 3);
  const total = items.reduce((sum, item) => sum + Math.max(0, Number(item.books_count || 0)), 0);
  return items.map((item, index) => {
    const count = Math.max(0, Number(item.books_count || 0));
    const percent = total > 0 ? (count / total) * 100 : 0;
    return {
      label: item.name,
      count,
      percent,
      color: ["#0b7f83", "#2d78d2", "#d29b2d"][index] || "#8aa7a6",
    };
  });
}

function buildCollectionGradient(shares) {
  const total = shares.reduce((sum, item) => sum + Math.max(0, Number(item.count || 0)), 0);
  if (total <= 0) {
    return "radial-gradient(circle at center, #fff 56%, #f5faf9 57%)";
  }

  let cursor = 0;
  const segments = shares
    .filter((item) => Number(item.count || 0) > 0)
    .map((item) => {
      const count = Math.max(0, Number(item.count || 0));
      const span = (count / total) * 100;
      const start = cursor;
      const end = cursor + span;
      cursor = end;
      return `${item.color} ${start}% ${end}%`;
    });

  if (!segments.length) {
    return "radial-gradient(circle at center, #fff 56%, #f5faf9 57%)";
  }

  return `conic-gradient(${segments.join(", ")})`;
}

function formatSignedPercent(value) {
  const number = Number(value || 0);
  if (number > 0) return `+${number}%`;
  if (number < 0) return `${number}%`;
  return "0%";
}

function iconSvg(kind) {
  if (kind === "calendar") {
    return `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M7 2v3M17 2v3M3.5 9h17M6 5.5h12a2.5 2.5 0 0 1 2.5 2.5v10A2.5 2.5 0 0 1 18 20.5H6A2.5 2.5 0 0 1 3.5 18V8A2.5 2.5 0 0 1 6 5.5Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;
  }
  if (kind === "download") {
    return `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 3v10m0 0 4-4m-4 4-4-4M4.5 16.5v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  return "";
}

function pillTone(value) {
  if (value > 0) return "green";
  if (value < 0) return "red";
  return "teal";
}

function renderMetricCards() {
  const activeRate = state.summary.members.total > 0 ? Math.round((state.summary.members.active / state.summary.members.total) * 100) : 0;
  const monthlyShare = state.summary.loans.total > 0 ? Math.round((state.summary.loans.this_month / state.summary.loans.total) * 100) : 0;
  const overdueRate = state.summary.loans.total > 0 ? Math.round((state.summary.loans.overdue_count / state.summary.loans.total) * 100) : 0;
  const dominantCategory = state.topCategories[0];
  const dominantLabel = dominantCategory ? dominantCategory.name : "-";

  return `<div class="stats-4 report-kpis">
    ${stat("TOTAL ANGGOTA\nAKTIF", formatCount(state.summary.members.active), `${activeRate}% anggota aktif`, "◉", "green")}
    ${stat("PEMINJAMAN\nBULANAN", formatCount(state.summary.loans.this_month), `${monthlyShare}% dari total transaksi`, "↔", "teal")}
    ${stat("TINGKAT\nKETERLAMBATAN", `${overdueRate}%`, `${formatCount(state.summary.loans.overdue_count)} transaksi terlambat`, "!", "red")}
    ${stat("KATEGORI\nTERPOPULER", dominantLabel, `${formatCount(dominantCategory?.borrowed_quantity || 0)} pinjaman`, "★", "amber")}
  </div>`;
}

function renderReportFilterLayer() {
  const defaults = getDefaultReportRange();
  const startDate = normalizeDateValue(state.filters.startDate, defaults.startDate);
  const endDate = normalizeDateValue(state.filters.endDate, defaults.endDate);

  return `<div class="filter-popover report-filter-popover" id="report-filter-layer" hidden>
    <div class="filter-card">
      <div class="modal-head">
        <h3>Filter Periode Laporan</h3>
        <button class="modal-close" type="button" data-report-filter-close>×</button>
      </div>
      <form class="modal-body" data-report-filter-form>
        ${field("Tanggal Mulai", startDate, { name: "start_date", type: "date", full: true })}
        ${field("Tanggal Selesai", endDate, { name: "end_date", type: "date", full: true })}
        <div class="form-actions">
          <button class="btn" type="button" data-report-filter-reset>RESET</button>
          <button class="btn primary" type="submit">TERAPKAN</button>
        </div>
      </form>
    </div>
  </div>`;
}

function renderActivityChart() {
  const chartYear = Number.parseInt(state.filters.chartYear, 10) || new Date().getFullYear();
  const items = getMonthActivity(state.monthlyActivity, chartYear);
  const maxLoans = Math.max(1, ...items.map((item) => Number(item.loans || 0)));
  const maxBooks = Math.max(1, ...items.map((item) => Number(item.books_added || 0)));

  const bars = items
    .map((item, index) => {
      const loanCount = Number(item.loans || 0);
      const bookCount = Number(item.books_added || 0);
      const loanHeight = loanCount > 0 ? 92 + Math.round((loanCount / maxLoans) * 78) : 0;
      const bookHeight = bookCount > 0 ? 106 + Math.round((bookCount / maxBooks) * 70) : 0;
      const loanBar = loanCount > 0 ? `<span class="report-bar report-bar-loan" title="${escapeHtml(item.month_label || item.label || "")}: ${formatCount(loanCount)}" style="height:${loanHeight}px"></span>` : "";
      const bookBar = bookCount > 0 ? `<span class="report-bar report-bar-book" title="${escapeHtml(item.month_label || item.label || "")}: ${formatCount(bookCount)}" style="height:${bookHeight}px"></span>` : "";
      return `<div class="report-chart-col">
        <div class="report-chart-bars${loanCount === 0 && bookCount === 0 ? " empty" : ""}">${loanBar}${bookBar}</div>
        <span class="report-chart-label">${escapeHtml(item.label || MONTH_LABELS[index] || "-")}</span>
      </div>`;
    })
    .join("");

  return `<section class="report-card report-chart-card">
    <div class="report-card-head">
      <div>
        <h2>Tren Sirkulasi Buku Bulanan</h2>
        <p>Visualisasi volume peminjaman vs pengadaan buku sepanjang tahun ${escapeHtml(String(chartYear))}.</p>
      </div>
      <form class="report-chart-controls" data-report-chart-form>
        <label class="report-year-field">
          <span>Tahun</span>
          <input class="input report-year-input" name="chart_year" type="number" min="1900" max="2100" step="1" inputmode="numeric" value="${escapeHtml(String(chartYear))}" data-report-chart-year />
        </label>
      </form>
    </div>
    <div class="report-card-head report-chart-foot">
      <div class="report-chart-legend">
        <span><i class="legend-dot loan"></i>Peminjaman</span>
        <span><i class="legend-dot book"></i>Pengadaan Buku</span>
      </div>
    </div>
    <div class="report-chart">${bars}</div>
  </section>`;
}

function renderCollectionCard() {
  const shares = getBookShareCategories();
  const centerValue = `${formatCount(state.summary.books.total)}`;
  const ringBackground = buildCollectionGradient(shares);
  return `<section class="report-card">
    <div class="report-card-head">
      <div>
        <h2>Koleksi Buku berdasarkan Kategori</h2>
      </div>
    </div>
    <div class="report-collection">
      <div class="report-collection-ring" style="background:${ringBackground}">
        <div class="report-collection-ring-inner">
          <strong>${centerValue}</strong>
          <span>Total Buku</span>
        </div>
      </div>
      <div class="report-collection-legend">
        ${shares
          .map(
            (item) => `<div class="report-legend-item">
              <span><i class="legend-dot" style="background:${item.color}"></i>${escapeHtml(item.label || "-")}</span>
              <strong>${Math.round(item.percent)}%</strong>
            </div>`,
          )
          .join("")}
      </div>
    </div>
  </section>`;
}

function renderTopBooksCard() {
  const topBooks = state.topBooks.slice(0, 5);
  while (topBooks.length < 5) {
    topBooks.push({
      title: "-",
      category_name: "-",
      borrowed_quantity: 0,
      stock_total: 0,
      stock_available: 0,
    });
  }
  const maxBorrowed = Math.max(1, ...topBooks.map((item) => Number(item.borrowed_quantity || 0)));
  return `<section class="report-card">
    <div class="report-card-head">
      <div>
        <h2>5 Buku Paling Banyak Dipinjam</h2>
      </div>
    </div>
    <div class="report-top-books">
      ${topBooks
        .map((item, index) => {
          const borrowed = Number(item.borrowed_quantity || 0);
          const width = borrowed > 0 ? Math.max(8, Math.round((borrowed / maxBorrowed) * 100)) : 0;
          const barContent = borrowed > 0 ? `<span style="width:${width}%"></span>` : "";
          return `<div class="report-book-row">
            <div class="report-book-head">
              <div class="report-book-title">
                <strong>${index + 1}. ${escapeHtml(item.title || "-")}</strong>
                <span>${escapeHtml(item.category_name || "-")}</span>
              </div>
              <em>${borrowed > 0 ? `${formatCount(borrowed)} pinjaman` : ""}</em>
            </div>
            <div class="report-book-bar">${barContent}</div>
          </div>`;
        })
        .join("")}
    </div>
  </section>`;
}

function renderAnalysisCard() {
  const rows = state.categoryAnalysis.slice(0, 5);
  return `<section class="report-card">
    <div class="report-card-head">
      <div>
        <h2>Ringkasan Analisis Pengadaan Buku</h2>
      </div>
      <a href="kategori.html" class="report-detail-link">DETAIL KATEGORI</a>
    </div>
    <table class="report-table">
      <thead>
        <tr>
          <th>Kategori</th>
          <th>Total Peminjaman</th>
          <th>Tren 30 Hari Terakhir</th>
          <th>Rekomendasi Pengadaan</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map((row) => {
            const trendClass = row.trend_percent > 0 ? "trend-up" : row.trend_percent < 0 ? "trend-down" : "trend-flat";
            return `<tr>
              <td><strong>${escapeHtml(row.name || "-")}</strong></td>
              <td>${formatCount(row.total_borrowed)}</td>
              <td class="${trendClass}">${formatSignedPercent(row.trend_percent)}</td>
              <td><span class="report-badge ${row.recommendation === "PROTECT STOCK" ? "protect" : row.recommendation === "EXPAND" ? "expand" : "normal"}">${escapeHtml(row.recommendation)}</span></td>
            </tr>`;
          })
          .join("")}
      </tbody>
    </table>
  </section>`;
}

function renderDemographicCard() {
  const bands = Array.isArray(state.demographics) ? state.demographics : [];
  return `<section class="report-card report-demographic-card">
    <div class="report-card-head">
      <div>
        <h2>Profil Demografi Pengguna</h2>
      </div>
    </div>
    <div class="report-demographics">
      ${bands
        .map(
          (band) => `<div class="report-demo-row">
            <div class="report-demo-label">
              <strong>${escapeHtml(band.label || "-")}</strong>
              <span>${band.percent}%</span>
            </div>
            <div class="report-demo-bar"><span style="width:${Math.max(0, Number(band.percent || 0))}%"></span></div>
          </div>`,
          )
          .join("")}
    </div>
  </section>`;
}

function renderTrendChart(items) {
  const max = Math.max(1, ...items.map((item) => Number(item.count || 0)));
  const bars = items
    .map((item) => {
      const count = Number(item.count || 0);
      const height = Math.max(36, Math.round((count / max) * 220));
      return `<div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:10px">
        <div class="bar" title="${item.label}: ${count}" style="height:${height}px"></div>
        <div style="text-align:center">
          <strong style="display:block;font-size:12px;line-height:16px">${formatCount(count)}</strong>
          <span style="display:block;font-size:12px;color:#6e7979;line-height:16px">${item.label}</span>
        </div>
      </div>`;
    })
    .join("");

  return `<div class="chart">${bars}</div>`;
}

function renderStatusBreakdown(items) {
  const total = Math.max(1, items.reduce((sum, item) => sum + Number(item.count || 0), 0));
  return `<div class="content" style="padding-top:0;display:grid;gap:16px">
    ${items
      .map((item) => {
        const percent = Math.round((Number(item.count || 0) / total) * 100);
        return `<div>
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:8px">
            <strong>${escapeHtml(item.label || "-")}</strong>
            <span style="color:#6e7979">${formatCount(item.count)} (${percent}%)</span>
          </div>
          <div style="height:10px;border-radius:999px;background:#e7eeee;overflow:hidden">
            <div style="height:100%;width:${percent}%;background:linear-gradient(90deg,#0a7f52,#1e8b86)"></div>
          </div>
        </div>`;
      })
      .join("")}
  </div>`;
}

function renderCategoryList(items) {
  if (!items.length) {
    return '<div style="padding:24px 20px;color:#6e7979">Belum ada kategori yang bisa dianalisis.</div>';
  }

  return `<div class="content" style="padding-top:0;display:grid;gap:14px">
    ${items
      .map((item) => {
        const borrowed = Number(item.borrowed_quantity || 0);
        const books = Number(item.books_count || 0);
        return `<div style="padding:14px 16px;border:1px solid #dbe4e3;border-radius:12px;background:#fff">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
            <div>
              <strong style="display:block">${escapeHtml(item.name || "-")}</strong>
              <span style="color:#6e7979;font-size:12px">${escapeHtml(item.code || "-")} · ${formatCount(books)} buku</span>
            </div>
            <span class="pill teal">${formatCount(borrowed)} pinjaman</span>
          </div>
          <div style="margin-top:10px;height:8px;border-radius:999px;background:#e7eeee;overflow:hidden">
            <div style="height:100%;width:${Math.min(100, books * 12 || 8)}%;background:linear-gradient(90deg,#006565,#97d9d4)"></div>
          </div>
        </div>`;
      })
      .join("")}
  </div>`;
}

function buildTopBooksTable() {
  const rows = state.topBooks.map((item) => [
    `#${item.rank}`,
    `${item.title} · ${item.code} · ${item.category_name}`,
    item.category_name,
    formatCount(item.borrowed_quantity),
    `${formatCount(item.stock_available)} / ${formatCount(item.stock_total)}`,
    stockRecommendation(item),
  ]);

  return dataTable(["PERINGKAT", "JUDUL", "KATEGORI", "DIPINJAM", "STOK", "REKOMENDASI"], rows, {
    widths: ["96px", "auto", "180px", "120px", "140px", "160px"],
    actions: false,
  });
}

function buildRecentLoansTable() {
  const rows = state.recentLoans.map((item, index) => [
    `#${index + 1}`,
    item.loan_code,
    item.member_name,
    item.books_summary || "-",
    item.loan_date,
    item.due_date,
    item.status,
  ]);

  return dataTable(["NO", "KODE", "ANGGOTA", "BUKU", "PINJAM", "KEMBALI", "STATUS"], rows, {
    widths: ["64px", "110px", "180px", "auto", "120px", "120px", "120px"],
    actions: false,
  });
}

function buildContent() {
  if (state.loading) {
    return `<div class="report-page">
      <div class="report-hero">
        <div>
          <p class="report-eyebrow">Sistem Informasi Eksekutif Perpustakaan</p>
          <h1 class="report-title">Laporan & Analitik Sistem</h1>
          <p class="report-copy">Data agregat report internal institusi untuk ${escapeHtml(state.periodLabel || "-")}.</p>
        </div>
        <div class="report-actions">
          <button class="report-range" type="button" id="open-report-filter" disabled>${iconSvg("calendar")} <span>${escapeHtml(state.periodLabel || "-")}</span></button>
          <button class="report-download" type="button" disabled>${iconSvg("download")} <span>Unduh Laporan Lengkap</span></button>
        </div>
      </div>
      ${renderReportFilterLayer()}
      ${renderMetricCards()}
      <section class="report-card report-chart-card"><div class="report-card-body" style="padding:24px 20px;color:#6e7979">Memuat laporan...</div></section>
    </div>`;
  }

  if (state.error) {
    return `<div class="report-page">
      <div class="report-hero">
        <div>
          <p class="report-eyebrow">Sistem Informasi Eksekutif Perpustakaan</p>
          <h1 class="report-title">Laporan & Analitik Sistem</h1>
          <p class="report-copy">Gagal memuat data laporan.</p>
        </div>
      </div>
      ${renderReportFilterLayer()}
      <section class="report-card"><div class="report-card-body" style="padding:24px 20px;color:#ba1a1a">${escapeHtml(state.error)}</div></section>
    </div>`;
  }

  return `<div class="report-page">
    <div class="report-hero">
      <div>
        <p class="report-eyebrow">Sistem Informasi Eksekutif Perpustakaan</p>
        <h1 class="report-title">Laporan & Analitik Sistem</h1>
        <p class="report-copy">Data agregat report internal institusi untuk ${escapeHtml(state.periodLabel || "-")}.</p>
      </div>
      <div class="report-actions">
        <button class="report-range" type="button" id="open-report-filter">${iconSvg("calendar")} <span>${escapeHtml(state.periodLabel || "-")}</span></button>
        <button class="report-download" type="button" id="download-report">${iconSvg("download")} <span>Unduh Laporan Lengkap</span></button>
      </div>
    </div>
    ${renderReportFilterLayer()}
    ${renderMetricCards()}
    ${renderActivityChart()}
    <div class="report-grid-2">
      ${renderCollectionCard()}
      ${renderTopBooksCard()}
    </div>
    <div class="report-grid-2 report-grid-bottom">
      ${renderAnalysisCard()}
      ${renderDemographicCard()}
    </div>
  </div>`;
}

function renderPage() {
  renderDocument("Laporan & Analitik Sistem", renderAdminShell("report", "Laporan & Analitik Sistem", buildContent(), "", { compact: true }));
  bindReportHandlers();
}

function syncReportUrl(filters) {
  if (typeof window === "undefined" || !window.history?.replaceState) {
    return;
  }

  const params = new URLSearchParams();
  if (filters.startDate) params.set("start_date", filters.startDate);
  if (filters.endDate) params.set("end_date", filters.endDate);
  if (filters.chartYear) params.set("chart_year", filters.chartYear);

  const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.replaceState({}, "", nextUrl);
}

function bindReportHandlers() {
  document.getElementById("download-report")?.addEventListener("click", downloadReport);

  const filterLayer = document.getElementById("report-filter-layer");
  const filterForm = filterLayer?.querySelector("[data-report-filter-form]");
  const filterClose = filterLayer?.querySelector("[data-report-filter-close]");
  const filterReset = filterLayer?.querySelector("[data-report-filter-reset]");
  const filterToggle = document.getElementById("open-report-filter");
  const chartForm = document.querySelector("[data-report-chart-form]");
  const chartYearInput = document.querySelector("[data-report-chart-year]");
  let chartYearTimer = null;

  const closeFilter = () => {
    if (!filterLayer) return;
    filterLayer.hidden = true;
  };

  filterToggle?.addEventListener("click", () => {
    if (!filterLayer) return;
    filterLayer.hidden = !filterLayer.hidden;
  });

  filterClose?.addEventListener("click", closeFilter);

  filterReset?.addEventListener("click", () => {
    const defaults = getDefaultReportRange();
    loadReport({
      ...state.filters,
      startDate: defaults.startDate,
      endDate: defaults.endDate,
    });
  });

  filterForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(filterForm);
    const nextFilters = normalizeFilters({
      ...state.filters,
      startDate: String(formData.get("start_date") || state.filters.startDate),
      endDate: String(formData.get("end_date") || state.filters.endDate),
    });
    loadReport(nextFilters);
  });

  const reloadChartYear = (value) => {
    window.clearTimeout(chartYearTimer);
    chartYearTimer = window.setTimeout(() => {
      const rawValue = String(value || "").trim();
      if (rawValue.length > 0 && rawValue.length < 4) {
        return;
      }
      const nextFilters = normalizeFilters({
        ...state.filters,
        chartYear: rawValue || state.filters.chartYear,
      });
      loadReport(nextFilters);
    }, 250);
  };

  chartYearInput?.addEventListener("input", () => {
    reloadChartYear(chartYearInput.value);
  });

  chartYearInput?.addEventListener("change", () => {
    reloadChartYear(chartYearInput.value);
  });

  chartYearInput?.addEventListener(
    "wheel",
    (event) => {
      if (!chartYearInput) return;
      event.preventDefault();
      const currentYear = Number.parseInt(chartYearInput.value, 10) || new Date().getFullYear();
      const nextYear = event.deltaY < 0 ? currentYear + 1 : currentYear - 1;
      chartYearInput.value = String(nextYear);
      reloadChartYear(chartYearInput.value);
    },
    { passive: false },
  );
}

function downloadReport() {
  const lines = [
    ["LAPORAN", "NILAI"],
    ["Periode", state.periodLabel],
    ["Tahun Grafik", state.filters.chartYear],
    ["Total Anggota", state.summary.members.total],
    ["Anggota Aktif", state.summary.members.active],
    ["Total Buku", state.summary.books.total],
    ["Buku Menipis", state.summary.books.low_stock],
    ["Peminjaman Bulan Ini", state.summary.loans.this_month],
    ["Terlambat", state.summary.loans.overdue_count],
    [],
    ["KATEGORI", "TOTAL PEMINJAMAN", "TREND 30 HARI", "REKOMENDASI"],
    ...state.categoryAnalysis.map((item) => [
      item.name,
      String(item.total_borrowed || 0),
      item.trend_text,
      item.recommendation,
    ]),
    [],
    ["PERINGKAT", "KODE", "JUDUL", "KATEGORI", "DIPINJAM", "STOK", "REKOMENDASI"],
    ...state.topBooks.map((item) => [
      `#${item.rank}`,
      item.code,
      item.title,
      item.category_name,
      String(item.borrowed_quantity || 0),
      `${item.stock_available} / ${item.stock_total}`,
      stockRecommendation(item),
    ]),
  ];

  const csv = lines
    .map((columns) => columns.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(";"))
    .join("\n");

  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `laporan-sistem-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function loadReport(filters = state.filters) {
  state.filters = normalizeFilters(filters);
  state.periodLabel = formatReportPeriod(state.filters.startDate, state.filters.endDate);
  syncReportUrl(state.filters);
  state.loading = true;
  state.error = "";
  renderPage();

  try {
    const query = buildReportQuery(state.filters);
    const response = await apiFetch(`/api/reports/overview${query ? `?${query}` : ""}`);
    const payload = response?.data || {};
    state.summary = {
      members: {
        total: Number(payload.summary?.members?.total ?? 0),
        active: Number(payload.summary?.members?.active ?? 0),
        inactive: Number(payload.summary?.members?.inactive ?? 0),
        new_this_month: Number(payload.summary?.members?.new_this_month ?? 0),
      },
      books: {
        total: Number(payload.summary?.books?.total ?? 0),
        active: Number(payload.summary?.books?.active ?? 0),
        low_stock: Number(payload.summary?.books?.low_stock ?? 0),
        empty_stock: Number(payload.summary?.books?.empty_stock ?? 0),
      },
      categories: {
        total: Number(payload.summary?.categories?.total ?? 0),
        active: Number(payload.summary?.categories?.active ?? 0),
        inactive: Number(payload.summary?.categories?.inactive ?? 0),
      },
      loans: {
        total: Number(payload.summary?.loans?.total ?? 0),
        borrowed: Number(payload.summary?.loans?.borrowed ?? 0),
        returned_count: Number(payload.summary?.loans?.returned_count ?? 0),
        overdue_count: Number(payload.summary?.loans?.overdue_count ?? 0),
        cancelled_count: Number(payload.summary?.loans?.cancelled_count ?? 0),
        this_month: Number(payload.summary?.loans?.this_month ?? 0),
      },
    };
    state.monthlyLoans = Array.isArray(payload.monthly_loans) ? payload.monthly_loans : [];
    state.monthlyActivity = Array.isArray(payload.monthly_activity) ? payload.monthly_activity : [];
    state.loanStatusBreakdown = Array.isArray(payload.loan_status_breakdown) ? payload.loan_status_breakdown : [];
    state.topBooks = Array.isArray(payload.top_books) ? payload.top_books : [];
    state.topCategories = Array.isArray(payload.top_categories) ? payload.top_categories : [];
    state.categoryAnalysis = Array.isArray(payload.category_analysis) ? payload.category_analysis : [];
    state.demographics = Array.isArray(payload.demographics) ? payload.demographics : [];
    state.recentLoans = Array.isArray(payload.recent_loans) ? payload.recent_loans : [];
    state.generatedAt = String(payload.generated_at || "");
    state.periodLabel = String(payload.period_label || formatReportPeriod(state.filters.startDate, state.filters.endDate));
    state.filters.chartYear = normalizeYearValue(payload.chart_year, state.filters.chartYear);
  } catch (error) {
    state.error = error?.payload?.message || error?.message || "Gagal memuat laporan.";
  } finally {
    state.loading = false;
    renderPage();
  }
}

renderPage();
loadReport();
