import { apiFetch } from "../shared/api.js";
import { escapeHtml, renderDocument, stat } from "../shared/components.js";
import { renderKepalaShell } from "../shared/layout-kepala.js";

const PAGE_SIZE = 5;
const CATEGORY_COLORS = ["#0a6365", "#0d61bf", "#b06a33", "#7f8a8a"];

const state = {
  loading: true,
  error: "",
  page: 1,
  data: {
    period_label: "",
    summary: {
      members: { total: 0, active: 0, inactive: 0, new_this_month: 0 },
      books: { total: 0, active: 0, low_stock: 0, empty_stock: 0 },
      categories: { total: 0, active: 0, inactive: 0 },
      loans: { total: 0, borrowed: 0, returned_count: 0, overdue_count: 0, cancelled_count: 0, this_month: 0 },
    },
    top_books: [],
    top_categories: [],
    demographics: [],
  },
};

function numberFormat(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}

function compactFormat(value) {
  const formatted = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
  return formatted.toLowerCase();
}

function percentFormat(value) {
  return `${Math.round(Number(value || 0))}%`;
}

function getTopCategories() {
  const items = Array.isArray(state.data.top_categories) ? state.data.top_categories.slice(0, 4) : [];
  const total = items.reduce((sum, item) => sum + Math.max(0, Number(item.books_count || 0)), 0);

  return items.map((item, index) => {
    const count = Math.max(0, Number(item.books_count || 0));
    return {
      label: item?.name || "-",
      count,
      percent: total > 0 ? (count / total) * 100 : 0,
      color: CATEGORY_COLORS[index] || CATEGORY_COLORS[CATEGORY_COLORS.length - 1],
    };
  });
}

function buildDonutGradient(items) {
  const total = items.reduce((sum, item) => sum + Math.max(0, Number(item.count || 0)), 0);
  if (total <= 0) {
    return "conic-gradient(#e7eeee 0 100%)";
  }

  let cursor = 0;
  const segments = items
    .filter((item) => Number(item.count || 0) > 0)
    .map((item) => {
      const count = Math.max(0, Number(item.count || 0));
      const size = (count / total) * 100;
      const start = cursor;
      const end = cursor + size;
      cursor = end;
      return `${item.color} ${start}% ${end}%`;
    });

  return segments.length > 0 ? `conic-gradient(${segments.join(", ")})` : "conic-gradient(#e7eeee 0 100%)";
}

function getAgeBars() {
  const items = Array.isArray(state.data.demographics) ? state.data.demographics.slice(0, 4) : [];
  const total = items.reduce((sum, item) => sum + Math.max(0, Number(item.count || 0)), 0);
  return items.map((item) => {
    const count = Math.max(0, Number(item.count || 0));
    return {
      label: item?.label || "-",
      count,
      percent: total > 0 ? (count / total) * 100 : 0,
    };
  });
}

function stockStatus(item) {
  const available = Number(item?.stock_available || 0);
  if (available > 0) {
    return '<span class="pill green">TERSEDIA</span>';
  }
  return '<span class="pill red">DIPINJAM</span>';
}

function renderStats() {
  const summary = state.data.summary || {};
  const loans = summary.loans || {};
  const members = summary.members || {};
  const books = summary.books || {};
  const activeRate = members.total > 0 ? (members.active / members.total) * 100 : 0;
  const loanRate = loans.total > 0 ? (loans.this_month / loans.total) * 100 : 0;

  return `<div class="stats-4 head-stats">
    ${stat("TOTAL PEMINJAMAN", numberFormat(loans.this_month), "Transaksi bulan ini", "↔", "green", percentFormat(loanRate))}
    ${stat("BUKU SEDANG DIPINJAM", numberFormat(loans.borrowed), "Buku dalam sirkulasi", "▤", "amber", "AKTIF")}
    ${stat("TOTAL KOLEKSI BUKU", numberFormat(books.total), "Judul buku terdaftar", "▥", "blue")}
    ${stat("TOTAL ANGGOTA AKTIF", numberFormat(members.active), "Anggota tervalidasi", "👥", "green", percentFormat(activeRate))}
  </div>`;
}

function renderTopCategoryCard() {
  const items = getTopCategories();
  const donutStyle = `background:${buildDonutGradient(items)}`;
  const centerValue = compactFormat(state.data.summary?.books?.total || 0);
  const centerLabel = "TOTAL KOLEKSI";

  const legend = items
    .map(
      (item) => `<div class="head-legend-item">
        <span class="head-dot" style="background:${item.color}"></span>
        <strong>${escapeHtml(item.label)}</strong>
        <span>${percentFormat(item.percent)}</span>
      </div>`,
    )
    .join("");

  return `<section class="head-card">
    <div class="head-card-head">
      <h2>Kategori Buku Terpopuler</h2>
      <button class="head-more" type="button" aria-label="Opsi lainnya">...</button>
    </div>
    <div class="head-donut-stack">
      <div class="head-donut-wrap">
        <div class="head-donut" style="${donutStyle}">
          <div class="head-donut-hole"></div>
          <div class="head-donut-center">
            <div class="head-donut-value">${escapeHtml(centerValue)}</div>
            <div class="head-donut-label">${centerLabel}</div>
          </div>
        </div>
      </div>
      <div class="head-legend">${legend || '<div class="head-empty">Belum ada data kategori.</div>'}</div>
    </div>
  </section>`;
}

function renderAgeCard() {
  const bars = getAgeBars();
  const maxValue = Math.max(1, ...bars.map((item) => Number(item.count || 0)));
  const chartBars = bars
    .map((item) => {
      const height = item.count > 0 ? Math.max(6, Math.round((item.count / maxValue) * 100)) : 0;
      return `<div class="head-age-item">
        <div class="head-age-bar-wrap">
          <div class="head-age-bar" style="height:${height}%"></div>
        </div>
        <div class="head-age-label">${escapeHtml(item.label)}</div>
      </div>`;
    })
    .join("");

  return `<section class="head-card">
    <div class="head-card-head">
      <div>
        <h2>Demografi Usia Pengunjung</h2>
        <p>Distribusi peminjaman berdasarkan kelompok usia</p>
      </div>
      <div class="head-volume"><span class="head-dot"></span>Volume</div>
    </div>
    <div class="head-age-chart">
      <div class="head-age-bars">${chartBars}</div>
    </div>
  </section>`;
}

function renderTopBooks() {
  const books = Array.isArray(state.data.top_books) ? state.data.top_books : [];
  const totalPages = Math.max(1, Math.ceil(books.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, state.page), totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const visible = books.slice(start, start + PAGE_SIZE);
  const rows = visible
    .map((item) => {
      const rank = Number(item.rank || 0);
      const status = stockStatus(item);
      return `<tr>
        <td><span class="head-rank rank-${Math.min(rank, 5)}">${rank || "-"}</span></td>
        <td class="head-book-title">${escapeHtml(item.title || "-")}</td>
        <td><span class="pill teal">${escapeHtml(item.category_name || "-")}</span></td>
        <td class="head-amount">${numberFormat(item.borrowed_quantity)}</td>
        <td>${status}</td>
      </tr>`;
    })
    .join("");

  const emptyRow = `<tr><td colspan="5" class="head-empty-row">Belum ada data buku.</td></tr>`;
  const pagination = [];
  if (totalPages > 1) {
    pagination.push(`<button class="head-page" type="button" data-top-books-page="${Math.max(1, page - 1)}" aria-label="Halaman sebelumnya">‹</button>`);
    for (let index = 1; index <= totalPages; index += 1) {
      pagination.push(`<button class="head-page ${index === page ? "active" : ""}" type="button" data-top-books-page="${index}">${index}</button>`);
    }
    pagination.push(`<button class="head-page" type="button" data-top-books-page="${Math.min(totalPages, page + 1)}" aria-label="Halaman berikutnya">›</button>`);
  }

  return `<section class="head-card head-table-card">
    <div class="head-card-head head-table-head">
      <div>
        <h2>Top-up Buku Terpopuler</h2>
      </div>
      <a class="head-link" href="koleksi.html">Lihat Semua Data</a>
    </div>
    <div class="head-table-wrap">
      <table class="head-table">
        <colgroup>
          <col class="head-col-rank">
          <col class="head-col-title">
          <col class="head-col-category">
          <col class="head-col-total">
          <col class="head-col-status">
        </colgroup>
        <thead>
          <tr>
            <th>PERINGKAT</th>
            <th>JUDUL BUKU</th>
            <th>KATEGORI</th>
            <th>TOTAL DIPINJAM</th>
            <th>STATUS STOK</th>
          </tr>
        </thead>
        <tbody>${rows || emptyRow}</tbody>
      </table>
    </div>
    <div class="head-pagination">
      ${pagination.join("")}
    </div>
  </section>`;
}

function renderContent() {
  if (state.loading) {
    return `<div class="head-loading">Memuat dashboard...</div>`;
  }

  if (state.error) {
    return `<div class="head-error">${escapeHtml(state.error)}</div>`;
  }

  return `<div class="head-dashboard">
    ${renderStats()}
    <div class="split head-split">
      ${renderTopCategoryCard()}
      ${renderAgeCard()}
    </div>
    ${renderTopBooks()}
  </div>`;
}

function renderPage() {
  renderDocument(
    "Executive Dashboard - Analisis Peminjaman Buku",
    renderKepalaShell("headDashboard", "Executive Dashboard - Analisis Peminjaman Buku", renderContent(), "", { compact: true }),
  );
}

function clampPage() {
  const totalPages = Math.max(1, Math.ceil((Array.isArray(state.data.top_books) ? state.data.top_books.length : 0) / PAGE_SIZE));
  state.page = Math.min(Math.max(1, state.page), totalPages);
}

async function loadDashboard() {
  state.loading = true;
  state.error = "";
  renderPage();

  try {
    const payload = await apiFetch("/api/reports/overview");
    state.data = payload?.data || state.data;
    state.data.demographics = Array.isArray(state.data.demographics) ? state.data.demographics.slice(0, 4) : [];
    clampPage();
    state.loading = false;
    renderPage();
  } catch (error) {
    state.loading = false;
    state.error = error?.message || "Gagal memuat dashboard.";
    renderPage();
  }
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-top-books-page]");
  if (!button) {
    return;
  }

  const nextPage = Number.parseInt(button.dataset.topBooksPage || "1", 10);
  if (!Number.isFinite(nextPage)) {
    return;
  }

  state.page = nextPage;
  clampPage();
  renderPage();
});

loadDashboard();
