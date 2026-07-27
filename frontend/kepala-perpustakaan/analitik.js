import { apiFetch } from "../shared/api.js";
import { escapeHtml, renderDocument, stat, status } from "../shared/components.js";
import { renderKepalaShell } from "../shared/layout-kepala.js";

const MONTH_LABELS = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];
const MONTH_LONG_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const state = {
  loading: true,
  error: "",
  chartYear: new Date().getFullYear(),
  generatedAt: "",
  periodLabel: "",
  summary: {
    members: { total: 0, active: 0, inactive: 0, new_this_month: 0 },
    books: { total: 0, active: 0, low_stock: 0, empty_stock: 0 },
    categories: { total: 0, active: 0, inactive: 0 },
    loans: { total: 0, borrowed: 0, returned_count: 0, overdue_count: 0, cancelled_count: 0, this_month: 0 },
  },
  monthlyActivity: [],
  loanStatusBreakdown: [],
  topBooks: [],
  topCategories: [],
  categoryAnalysis: [],
  demographics: [],
  recentLoans: [],
};

function pad2(value) {
  return String(value).padStart(2, "0");
}

function normalizeYear(value, fallback) {
  const year = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(year) && year > 1900 ? year : fallback;
}

function getInitialYear() {
  const params = new URLSearchParams(window.location.search);
  return normalizeYear(params.get("chart_year"), new Date().getFullYear());
}

function formatCount(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}

function formatPercent(value) {
  const number = Number(value || 0);
  if (number > 0) return `+${number}%`;
  if (number < 0) return `${number}%`;
  return "0%";
}

function formatMonthRange(dateValue) {
  const date = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(date.getTime())) return "-";
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const formatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function getMonthActivity(items, year) {
  const byKey = new Map(Array.isArray(items) ? items.map((item) => [String(item.key || "").slice(0, 7), item]) : []);
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

function getTopCategory() {
  return state.topCategories[0] || null;
}

function getDominantAudience() {
  const total = state.demographics.reduce((sum, item) => sum + Number(item.count || 0), 0);
  if (total <= 0) {
    return { label: "-", percent: 0 };
  }

  const top = state.demographics.reduce((winner, item) => (Number(item.percent || 0) > Number(winner?.percent || 0) ? item : winner), state.demographics[0]);
  return {
    label: String(top?.label || "-"),
    percent: Number(top?.percent || 0),
  };
}

function getApproxAverageAge() {
  const bands = [
    { label: "<12", midpoint: 10 },
    { label: "13-17", midpoint: 15 },
    { label: "18-25", midpoint: 21.5 },
    { label: "26-40", midpoint: 33 },
    { label: ">40", midpoint: 45 },
  ];
  const mapped = bands.map((band, index) => {
    const source = state.demographics[index];
    return {
      midpoint: band.midpoint,
      count: Number(source?.count || 0),
    };
  });
  const total = mapped.reduce((sum, item) => sum + item.count, 0);
  if (total <= 0) return "-";
  const average = mapped.reduce((sum, item) => sum + item.midpoint * item.count, 0) / total;
  return `${average.toFixed(1)} Tahun`;
}

function getRestockPriority() {
  const items = Array.isArray(state.categoryAnalysis) ? state.categoryAnalysis : [];
  const urgent = items.filter((item) => String(item.recommendation || "").toUpperCase() === "PROTECT STOCK");
  const fallback = items[0];
  const target = urgent[0] || fallback;
  if (!target) return "-";
  return `${target.name} (${target.recommendation || "NORMAL"})`;
}

function renderHero() {
  return `<div class="report-hero">
    <div>
      <p class="report-eyebrow">Analitik › Rekomendasi Pengadaan</p>
      <h1 class="report-title">Analisis Strategis Peminjaman & Pengunjung</h1>
      <p class="report-copy">Data ditarik langsung dari endpoint laporan dan mengikuti tahun analitik yang dipilih.</p>
    </div>
    <div class="report-actions">
      <label class="report-year-field">
        <span>Tahun Analitik</span>
        <input class="input report-year-input" type="number" min="1901" max="2100" value="${escapeHtml(String(state.chartYear))}" data-analytics-year />
      </label>
      <button class="btn primary" type="button" data-analytics-refresh>Muat Data</button>
    </div>
  </div>`;
}

function renderKpis() {
  const topCategory = getTopCategory();
  const audience = getDominantAudience();
  return `<div class="stats-4 report-kpis">
    ${stat("TOTAL PEMINJAMAN\n(BULAN INI)", formatCount(state.summary.loans.this_month), `Periode: ${escapeHtml(state.periodLabel || "-")}`, "↔", "green", `+${formatCount(state.summary.loans.this_month)}`)}
    ${stat("KATEGORI TERPOPULER", topCategory ? topCategory.name : "-", topCategory ? `${formatCount(topCategory.borrowed_quantity)} peminjaman` : "Belum ada data", "★", "blue")}
    ${stat("RATA-RATA USIA\nPENGUNJUNG", getApproxAverageAge(), `Dominan: ${audience.label} (${audience.percent}%)`, "◎", "teal")}
    ${stat("PROYEKSI PRIORITAS", getRestockPriority(), `${formatCount(state.summary.books.low_stock)} buku menipis, ${formatCount(state.summary.books.empty_stock)} stok kosong`, "♜", "amber")}
  </div>`;
}

function renderMonthlyChart() {
  const items = getMonthActivity(state.monthlyActivity, state.chartYear);
  const maxValue = Math.max(1, ...items.map((item) => Math.max(Number(item.loans || 0), Number(item.books_added || 0))));

  return `<section class="report-card report-chart-card">
    <div class="report-card-head">
      <div>
        <h2>Tren Peminjaman dan Buku Masuk</h2>
        <p>Berdasarkan bulan pada tahun ${escapeHtml(String(state.chartYear))}.</p>
      </div>
      <div class="report-chart-legend">
        <span><strong style="background:#d8e6eb"></strong>Peminjaman</span>
        <span><strong style="background:#a7d6d4"></strong>Buku masuk</span>
      </div>
    </div>
    <div class="report-chart">
      ${items
        .map((item) => {
          const loanHeight = Math.max(8, Math.round((Number(item.loans || 0) / maxValue) * 160));
          const bookHeight = Math.max(8, Math.round((Number(item.books_added || 0) / maxValue) * 160));
          return `<div class="report-chart-col">
            <div class="report-chart-bars">
              <div class="report-bar report-bar-loan" style="height:${loanHeight}px" title="Peminjaman: ${formatCount(item.loans)}"></div>
              <div class="report-bar report-bar-book" style="height:${bookHeight}px" title="Buku masuk: ${formatCount(item.books_added)}"></div>
            </div>
            <div class="report-chart-label">${escapeHtml(item.label)}</div>
          </div>`;
        })
        .join("")}
    </div>
  </section>`;
}

function renderDemographics() {
  const rows = Array.isArray(state.demographics) ? state.demographics : [];
  const total = rows.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const items = rows.length
    ? rows
        .map((item) => {
          const percent = Number(item.percent || 0);
          return `<div class="report-demo-row">
            <div class="report-demo-label">
              <strong>${escapeHtml(item.label || "-")}</strong>
              <span>${percent}%</span>
            </div>
            <div class="report-demo-bar"><span style="width:${percent}%"></span></div>
          </div>`;
        })
        .join("")
    : '<div class="report-note"><span>!</span><p>Belum ada data demografi anggota untuk ditampilkan.</p></div>';

  return `<section class="report-card">
    <div class="report-card-head">
      <div>
        <h2>Demografi Usia Pengunjung</h2>
        <p>Distribusi anggota aktif berdasarkan usia dari database.</p>
      </div>
      <div class="pill teal">${formatCount(total)} anggota</div>
    </div>
    <div class="report-demographics">${items}</div>
  </section>`;
}

function renderRecommendationTable() {
  const rows = Array.isArray(state.categoryAnalysis) ? state.categoryAnalysis : [];
  const body = rows.length
    ? rows
        .map((item) => {
          const recommendation = String(item.recommendation || "NORMAL");
          const tone = recommendation === "PROTECT STOCK" ? "red" : recommendation === "EXPAND" ? "green" : recommendation === "REVIEW" ? "amber" : "teal";
          return `<tr>
            <td>${escapeHtml(String(item.rank || "-"))}</td>
            <td>
              <strong>${escapeHtml(item.name || "-")}</strong><br>
              <span style="color:#6e7979;font-size:11px">${escapeHtml(item.code || "-")} · ${escapeHtml(String(item.books_count || 0))} buku</span>
            </td>
            <td>${formatCount(item.total_borrowed || 0)}</td>
            <td>${status(item.books_count > 0 && Number(item.total_borrowed || 0) > 0 ? (Number(item.empty_stock_books || 0) > 0 || Number(item.low_stock_books || 0) > 0 ? "Stok Menipis" : "CUKUP") : "CUKUP")}</td>
            <td><span class="pill ${tone}">${escapeHtml(recommendation)}</span></td>
          </tr>`;
        })
        .join("")
    : '<tr><td colspan="5" style="padding:24px 14px;color:#6e7979;text-align:center">Belum ada data analitik yang bisa diproses.</td></tr>';

  return `<section class="report-card">
    <div class="report-card-head">
      <div>
        <h2>Rekomendasi Pengadaan Judul Baru</h2>
        <p>Berdasarkan rasio keterbacaan stok vs minat baca pada tahun analitik aktif.</p>
      </div>
      <div class="pill teal">Diperbarui ${escapeHtml(state.generatedAt ? new Date(state.generatedAt).toLocaleString("id-ID") : "-")}</div>
    </div>
    <table class="report-table">
      <thead>
        <tr>
          <th>PERINGKAT</th>
          <th>KATEGORI/JUDUL</th>
          <th>TOTAL PEMINJAMAN</th>
          <th>STATUS STOK SAAT INI</th>
          <th>REKOMENDASI</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  </section>`;
}

function renderContent() {
  if (state.loading) {
    return `<div class="head-loading">Memuat analitik...</div>`;
  }

  if (state.error) {
    return `<div class="head-error">${escapeHtml(state.error)}</div>`;
  }

  return `<div class="report-page">
    ${renderHero()}
    ${renderKpis()}
    <div class="split report-grid-2">
      ${renderMonthlyChart()}
      ${renderDemographics()}
    </div>
    ${renderRecommendationTable()}
  </div>`;
}

function renderPage() {
  renderDocument(
    "Analisis Strategis Peminjaman & Pengunjung",
    renderKepalaShell("analytics", "Sistem Informasi Eksekutif", renderContent(), "", { compact: true }),
  );
}

function buildQuery(year) {
  const params = new URLSearchParams();
  params.set("chart_year", String(year));
  return params.toString();
}

async function loadAnalytics() {
  state.loading = true;
  state.error = "";
  renderPage();

  try {
    const response = await apiFetch(`/api/reports/overview?${buildQuery(state.chartYear)}`);
    const payload = response?.data || {};
    state.periodLabel = String(payload.period_label || "");
    state.generatedAt = String(payload.generated_at || "");
    state.chartYear = normalizeYear(payload.chart_year, state.chartYear);
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
    state.monthlyActivity = Array.isArray(payload.monthly_activity) ? payload.monthly_activity : [];
    state.loanStatusBreakdown = Array.isArray(payload.loan_status_breakdown) ? payload.loan_status_breakdown : [];
    state.topBooks = Array.isArray(payload.top_books) ? payload.top_books : [];
    state.topCategories = Array.isArray(payload.top_categories) ? payload.top_categories : [];
    state.categoryAnalysis = Array.isArray(payload.category_analysis) ? payload.category_analysis : [];
    state.demographics = Array.isArray(payload.executive_demographics) ? payload.executive_demographics : [];
    state.recentLoans = Array.isArray(payload.recent_loans) ? payload.recent_loans : [];
  } catch (error) {
    state.error = error?.payload?.message || error?.message || "Gagal memuat analitik.";
  } finally {
    state.loading = false;
    renderPage();
  }
}

document.addEventListener("input", (event) => {
  const yearField = event.target.closest("[data-analytics-year]");
  if (!yearField) return;
  const nextYear = normalizeYear(yearField.value, state.chartYear);
  if (nextYear === state.chartYear && String(nextYear) === String(yearField.value || "")) {
    return;
  }
  state.chartYear = nextYear;
});

document.addEventListener("change", (event) => {
  const yearField = event.target.closest("[data-analytics-year]");
  if (!yearField) return;
  state.chartYear = normalizeYear(yearField.value, state.chartYear);
  loadAnalytics();
});

document.addEventListener("click", (event) => {
  const refresh = event.target.closest("[data-analytics-refresh]");
  if (!refresh) return;
  loadAnalytics();
});

state.chartYear = getInitialYear();
renderPage();
loadAnalytics();
