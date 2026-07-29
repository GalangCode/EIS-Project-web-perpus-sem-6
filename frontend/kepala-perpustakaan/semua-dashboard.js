import { apiFetch } from "../shared/api.js";
import { escapeHtml, renderDocument, stat } from "../shared/components.js";
import { renderKepalaShell } from "../shared/layout-kepala.js";

const PAGE_SIZE = 5;

const state = {
  loading: true,
  error: "",
  chartYear: new Date().getFullYear(),
  page: 1,
  search: "",
  category: "all",
  filterOpen: false,
  books: [],
  summary: {
    members: { total: 0, active: 0, inactive: 0, new_this_month: 0 },
    books: { total: 0, active: 0, low_stock: 0, empty_stock: 0 },
    categories: { total: 0, active: 0, inactive: 0 },
    loans: { total: 0, borrowed: 0, returned_count: 0, overdue_count: 0, cancelled_count: 0, this_month: 0 },
  },
  periodLabel: "",
};

function formatCount(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}

function normalizeYear(value, fallback) {
  const year = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(year) && year > 1900 ? year : fallback;
}

function getInitialYear() {
  const params = new URLSearchParams(window.location.search);
  return normalizeYear(params.get("chart_year"), new Date().getFullYear());
}

function buildQuery() {
  const params = new URLSearchParams();
  params.set("chart_year", String(state.chartYear));
  return params.toString();
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const month = monthNames[date.getMonth()] || "";
  return `${String(date.getDate()).padStart(2, "0")} ${month} ${date.getFullYear()}`;
}

function getCategoryOptions() {
  const seen = new Set();
  return state.books
    .map((item) => String(item.category_name || "").trim())
    .filter((name) => {
      if (!name || seen.has(name)) return false;
      seen.add(name);
      return true;
    });
}

function getFilteredBooks() {
  const query = state.search.trim().toLowerCase();
  return state.books
    .filter((book) => {
      if (state.category !== "all" && String(book.category_name || "") !== state.category) {
        return false;
      }
      if (!query) {
        return true;
      }
      return [book.title, book.author, book.publisher, book.category_name, book.code]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    })
    .sort((left, right) => {
      const leftBorrowed = Number(left.borrowed_quantity || 0);
      const rightBorrowed = Number(right.borrowed_quantity || 0);
      return rightBorrowed - leftBorrowed || String(left.title || "").localeCompare(String(right.title || ""));
    });
}

function getPageItems(items) {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, state.page), totalPages);
  const start = (page - 1) * PAGE_SIZE;
  return {
    page,
    totalPages,
    start,
    end: Math.min(items.length, start + PAGE_SIZE),
    items: items.slice(start, start + PAGE_SIZE),
  };
}

function getBorrowTrend(items, index) {
  const current = Number(items[index]?.borrowed_quantity || 0);
  const next = Number(items[index + 1]?.borrowed_quantity || 0);
  if (index >= items.length - 1) {
    return '<span class="trend-flat">0%</span>';
  }
  if (next <= 0) {
    return '<span class="trend-flat">0%</span>';
  }
  const diff = Math.round(((current - next) / next) * 100);
  if (diff > 0) {
    return `<span class="trend-up">↑ ${diff}%</span>`;
  }
  if (diff < 0) {
    return `<span class="trend-down">↓ ${Math.abs(diff)}%</span>`;
  }
  return '<span class="trend-flat">0%</span>';
}

function getStatusBadge(book) {
  const available = Number(book.stock_available || 0);
  if (available <= 0) {
    return '<span class="pill red">Kosong</span>';
  }
  if (available <= 3) {
    return '<span class="pill amber">Stok Menipis</span>';
  }
  return '<span class="pill green">Tersedia</span>';
}

function getActionButtons(book) {
  return `<div class="all-actions-cell">
    <button class="all-icon-btn" type="button" data-all-action="detail" data-all-book-id="${escapeHtml(String(book.id || ""))}" aria-label="Lihat detail">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5c5.5 0 9.6 4.1 11 7-1.4 2.9-5.5 7-11 7S2.4 14.9 1 12c1.4-2.9 5.5-7 11-7Zm0 2C8 7 4.9 9.8 3.5 12 4.9 14.2 8 17 12 17s7.1-2.8 8.5-5C19.1 9.8 16 7 12 7Zm0 1.5A3.5 3.5 0 1 1 12 16a3.5 3.5 0 0 1 0-7Zm0 2A1.5 1.5 0 1 0 12 13a1.5 1.5 0 0 0 0-3Z"/></svg>
    </button>
    <button class="all-icon-btn" type="button" data-all-action="download" data-all-book-id="${escapeHtml(String(book.id || ""))}" aria-label="Unduh">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a1 1 0 0 1 1 1v8.17l2.59-2.58L17 11.17 12 16l-5-4.83 1.41-1.41L11 12.17V4a1 1 0 0 1 1-1Zm-7 14h14v2H5v-2Z"/></svg>
    </button>
  </div>`;
}

function escapeCsv(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadTextFile(filename, content, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildBookCsv(items) {
  const lines = [
    ["Ranking", "Book Title", "Category", "Total Borrowed", "Stock Status", "Last Borrowed", "Author", "Code"].map(escapeCsv).join(","),
    ...items.map((book, index) => {
      const stockStatus = Number(book.stock_available || 0) <= 0 ? "Kosong" : Number(book.stock_available || 0) <= 3 ? "Stok Menipis" : "Tersedia";
      return [
        String(index + 1).padStart(2, "0"),
        book.title || "-",
        book.category_name || "-",
        Number(book.borrowed_quantity || 0),
        stockStatus,
        formatDate(book.last_borrowed_at),
        book.author || "-",
        book.code || "-",
      ].map(escapeCsv).join(",");
    }),
  ];
  return lines.join("\n");
}

function exportBooks(items, suffix = "detail") {
  const fileName = `data-lengkap-analisis-peminjaman-${suffix}-${String(state.chartYear)}.csv`;
  downloadTextFile(fileName, buildBookCsv(items));
}

function openBookDetailModal(book) {
  if (!book || document.querySelector(".modal-layer")) return;
  const stockStatus = Number(book.stock_available || 0) <= 0 ? "Kosong" : Number(book.stock_available || 0) <= 3 ? "Stok Menipis" : "Tersedia";
  const rank = getFilteredBooks().findIndex((item) => Number(item.id) === Number(book.id)) + 1;
  const modal = `
    <div class="modal-layer" data-all-modal-layer>
      <div class="modal modal-lg">
        <div class="modal-head">
          <h3>Detail Buku</h3>
          <button class="modal-close" type="button" data-all-modal-close>×</button>
        </div>
        <div class="modal-body" style="gap:16px">
          <div class="info-box">
            <div>
              <strong>${escapeHtml(book.title || "-")}</strong>
              <div>${escapeHtml(book.author || "-")} · ${escapeHtml(book.category_name || "-")}</div>
            </div>
          </div>
          <div class="form-grid">
            <div class="field">
              <label>RANKING</label>
              <div class="input">${escapeHtml(rank > 0 ? String(rank).padStart(2, "0") : "-")}</div>
            </div>
            <div class="field">
              <label>KODE BUKU</label>
              <div class="input">${escapeHtml(book.code || "-")}</div>
            </div>
            <div class="field">
              <label>KATEGORI</label>
              <div class="input">${escapeHtml(book.category_name || "-")}</div>
            </div>
            <div class="field">
              <label>STATUS STOK</label>
              <div class="input">${escapeHtml(stockStatus)}</div>
            </div>
            <div class="field">
              <label>TOTAL DIPINJAM</label>
              <div class="input">${escapeHtml(formatCount(book.borrowed_quantity))}</div>
            </div>
            <div class="field">
              <label>TERAKHIR DIPINJAM</label>
              <div class="input">${escapeHtml(formatDate(book.last_borrowed_at))}</div>
            </div>
          </div>
        <div class="form-actions">
          <button class="btn" type="button" data-all-detail-download>UNDUH CSV</button>
        </div>
      </div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML("beforeend", modal);
  const layer = document.querySelector("[data-all-modal-layer]");
  const closeButton = layer?.querySelector(".modal-close");
  const closeModal = () => layer?.remove();

  closeButton?.addEventListener("click", closeModal);
  layer?.querySelector("[data-all-detail-download]")?.addEventListener("click", () => {
    exportBooks([book], String(book.code || "detail"));
  });
}

function renderHero() {
  return `<div class="all-hero">
    <div>
      <nav class="all-breadcrumb" aria-label="breadcrumb">
        <a class="breadcrumb-link" href="dashboard.html">Dashboard Eksekutif</a>
        <span class="breadcrumb-separator" aria-hidden="true">&rsaquo;</span>
        <span aria-current="page">Detail Data</span>
      </nav>
      <h1 class="all-title">Data Lengkap Analisis Peminjaman</h1>
      <p class="all-copy">Laporan komprehensif inventaris dan sirkulasi koleksi perpustakaan.</p>
    </div>
    <button class="btn primary all-export" type="button">↓ Export Report</button>
  </div>`;
}

function renderSearchBar() {
  return `<div class="all-toolbar">
    <label class="all-search">
      <span class="sr-only">Cari</span>
      <input class="input all-search-input" type="search" placeholder="Cari judul buku atau penulis..." value="${escapeHtml(state.search)}" data-all-search />
    </label>
  </div>`;
}

function renderFilterPopover() {
  const categories = getCategoryOptions();
  const categoryOptions = ['<option value="all">Semua Kategori</option>']
    .concat(categories.map((name) => `<option value="${escapeHtml(name)}"${name === state.category ? " selected" : ""}>${escapeHtml(name)}</option>`))
    .join("");

  return `<div class="filter-popover all-filter-popover" id="all-filter-layer" ${state.filterOpen ? "" : "hidden"}>
    <div class="filter-card">
      <div class="modal-head">
        <h3>Filter Dashboard</h3>
        <button class="modal-close" type="button" data-all-filter-close>×</button>
      </div>
      <form class="modal-body all-filter-form" data-all-filter-form>
        <div class="field">
          <label>KATEGORI</label>
          <select class="input" name="category" data-all-filter-category>
            ${categoryOptions}
          </select>
        </div>
        <div class="field">
          <label>TAHUN</label>
          <select class="input" name="year" data-all-filter-year>
            <option value="${escapeHtml(String(new Date().getFullYear()))}"${state.chartYear === new Date().getFullYear() ? " selected" : ""}>Tahun Ini</option>
            <option value="${escapeHtml(String(new Date().getFullYear() - 1))}"${state.chartYear === new Date().getFullYear() - 1 ? " selected" : ""}>Tahun Lalu</option>
          </select>
        </div>
        <div class="form-actions all-filter-actions">
          <button class="btn" type="button" data-all-filter-reset>RESET</button>
          <button class="btn primary" type="submit">Terapkan</button>
        </div>
      </form>
    </div>
  </div>`;
}

function renderTable() {
  const filtered = getFilteredBooks();
  const pageData = getPageItems(filtered);
  const rows = pageData.items.length
    ? pageData.items
        .map((book, index) => {
          const rank = String(pageData.start + index + 1).padStart(2, "0");
          return `<tr>
            <td><span class="all-rank">${escapeHtml(rank)}</span></td>
            <td class="all-book-cell">
              <strong>${escapeHtml(book.title || "-")}</strong>
              <span>Pemilik: ${escapeHtml(book.author || "-")}</span>
            </td>
            <td><span class="pill soft">${escapeHtml(book.category_name || "-")}</span></td>
            <td class="all-number">
              <strong>${formatCount(book.borrowed_quantity)}</strong>
              ${getBorrowTrend(pageData.items, index)}
            </td>
            <td>${getStatusBadge(book)}</td>
            <td class="all-date">${formatDate(book.last_borrowed_at)}</td>
            <td>${getActionButtons(book)}</td>
          </tr>`;
        })
        .join("")
    : '<tr><td colspan="7" class="all-empty-row">Tidak ada data yang cocok dengan filter saat ini.</td></tr>';

  const showStart = filtered.length === 0 ? 0 : pageData.start + 1;
  const showEnd = pageData.end;
  const totalPages = pageData.totalPages;
  const current = pageData.page;
  const paginationButtons = [];

  if (totalPages > 1) {
    paginationButtons.push(`<button class="all-page-btn" type="button" data-all-page="${Math.max(1, current - 1)}">‹</button>`);
    paginationButtons.push(`<button class="all-page-btn ${current === 1 ? "active" : ""}" type="button" data-all-page="1">1</button>`);
    if (totalPages > 1) {
      if (current > 3) {
        paginationButtons.push('<span class="all-ellipsis">...</span>');
      }
      const middleStart = Math.max(2, current - 1);
      const middleEnd = Math.min(totalPages - 1, current + 1);
      for (let page = middleStart; page <= middleEnd; page += 1) {
        if (page === 1 || page === totalPages) continue;
        paginationButtons.push(`<button class="all-page-btn ${current === page ? "active" : ""}" type="button" data-all-page="${page}">${page}</button>`);
      }
      if (current < totalPages - 2) {
        paginationButtons.push('<span class="all-ellipsis">...</span>');
      }
      if (totalPages > 1) {
        paginationButtons.push(`<button class="all-page-btn ${current === totalPages ? "active" : ""}" type="button" data-all-page="${totalPages}">${totalPages}</button>`);
      }
    }
    paginationButtons.push(`<button class="all-page-btn" type="button" data-all-page="${Math.min(totalPages, current + 1)}">›</button>`);
  }

  return `<section class="all-card">
    <div class="all-card-head">
      <div>
        <h2>Detail Data</h2>
      </div>
      <button class="btn all-filter-toggle" type="button" data-all-filter-toggle>☰ Filter</button>
    </div>
    ${renderFilterPopover()}
    <div class="all-table-wrap">
      <table class="all-table">
        <thead>
          <tr>
            <th>RANKING</th>
            <th>BOOK TITLE</th>
            <th>CATEGORY</th>
            <th>TOTAL BORROWED</th>
            <th>STOCK STATUS</th>
            <th>LAST BORROWED</th>
            <th>ACTIONS</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="all-footer">
      <div class="all-footer-info">Showing ${showStart} - ${showEnd} of ${formatCount(filtered.length)} entries</div>
      <div class="all-pagination">${paginationButtons.join("")}</div>
    </div>
  </section>`;
}

function renderStats() {
  const summary = state.summary || {};
  const loans = summary.loans || {};
  const books = summary.books || {};
  const members = summary.members || {};
  const retention = Number(loans.total || 0) > 0 ? (Number(loans.returned_count || 0) / Number(loans.total || 1)) * 100 : 0;
  return `<div class="stats-4 all-stats">
    ${stat("TOTAL KOLEKSI", formatCount(books.total), "", "▤")}
    ${stat("ANGGOTA BARU", `+${formatCount(members.new_this_month)}`, "/bln", "👥", "blue")}
    ${stat("RETENSI PEMINJAMAN", `${retention.toFixed(1)}%`, "", "↺", "teal")}
    ${stat("TERLAMBAT KEMBALI", `${formatCount(loans.overdue_count)} Buku`, "", "△", "red")}
  </div>`;
}

function renderContent() {
  if (state.loading) {
    return `<div class="head-loading">Memuat data dashboard...</div>`;
  }

  if (state.error) {
    return `<div class="head-error">${escapeHtml(state.error)}</div>`;
  }

  return `<div class="all-page">
    ${renderHero()}
    <div id="all-search-static">${renderSearchBar()}</div>
    <div id="all-table-region">${renderTable()}</div>
    <div id="all-stats-region">${renderStats()}</div>
  </div>`;
}

function renderPage() {
  renderDocument(
    "Data Lengkap Analisis Peminjaman",
    renderKepalaShell("headDashboard", "Sistem Informasi Eksekutif", renderContent(), "", { compact: true }),
  );
}

function updateInteractiveView() {
  const tableRegion = document.getElementById("all-table-region");
  const statsRegion = document.getElementById("all-stats-region");

  if (tableRegion) {
    tableRegion.innerHTML = renderTable();
  }
  if (statsRegion) {
    statsRegion.innerHTML = renderStats();
  }
}

async function loadDashboard() {
  state.loading = true;
  state.error = "";
  renderPage();

  try {
    const [booksResponse, overviewResponse] = await Promise.all([
      apiFetch("/api/books"),
      apiFetch(`/api/reports/overview?${buildQuery()}`),
    ]);

    const booksPayload = booksResponse?.data || {};
    const overviewPayload = overviewResponse?.data || {};

    state.books = Array.isArray(booksPayload.items) ? booksPayload.items : [];
    state.summary = {
      members: {
        total: Number(overviewPayload.summary?.members?.total ?? 0),
        active: Number(overviewPayload.summary?.members?.active ?? 0),
        inactive: Number(overviewPayload.summary?.members?.inactive ?? 0),
        new_this_month: Number(overviewPayload.summary?.members?.new_this_month ?? 0),
      },
      books: {
        total: Number(booksPayload.summary?.total ?? 0),
        active: Number(booksPayload.summary?.active ?? 0),
        low_stock: Number(booksPayload.summary?.low_stock ?? 0),
        empty_stock: Number(booksPayload.summary?.empty_stock ?? 0),
      },
      categories: {
        total: Number(overviewPayload.summary?.categories?.total ?? 0),
        active: Number(overviewPayload.summary?.categories?.active ?? 0),
        inactive: Number(overviewPayload.summary?.categories?.inactive ?? 0),
      },
      loans: {
        total: Number(overviewPayload.summary?.loans?.total ?? 0),
        borrowed: Number(overviewPayload.summary?.loans?.borrowed ?? 0),
        returned_count: Number(overviewPayload.summary?.loans?.returned_count ?? 0),
        overdue_count: Number(overviewPayload.summary?.loans?.overdue_count ?? 0),
        cancelled_count: Number(overviewPayload.summary?.loans?.cancelled_count ?? 0),
        this_month: Number(overviewPayload.summary?.loans?.this_month ?? 0),
      },
    };
    state.page = 1;
  } catch (error) {
    state.error = error?.payload?.message || error?.message || "Gagal memuat data dashboard.";
  } finally {
    state.loading = false;
    renderPage();
  }
}

document.addEventListener("input", (event) => {
  const searchField = event.target.closest("[data-all-search]");
  if (!searchField) return;
  state.search = String(searchField.value || "");
  state.page = 1;
  updateInteractiveView();
});

document.addEventListener("click", (event) => {
  const toggle = event.target.closest("[data-all-filter-toggle]");
  if (toggle) {
    state.filterOpen = !state.filterOpen;
    renderPage();
    return;
  }

  const close = event.target.closest("[data-all-filter-close]");
  if (close) {
    state.filterOpen = false;
    renderPage();
    return;
  }

  const reset = event.target.closest("[data-all-filter-reset]");
  if (reset) {
    state.category = "all";
    state.chartYear = new Date().getFullYear();
    state.search = "";
    state.page = 1;
    state.filterOpen = false;
    loadDashboard();
    return;
  }

  const exportButton = event.target.closest(".all-export");
  if (exportButton) {
    event.preventDefault();
    exportBooks(getFilteredBooks(), "filtered");
    return;
  }

  const actionButton = event.target.closest("[data-all-action]");
  if (actionButton) {
    const action = String(actionButton.dataset.allAction || "");
    const id = Number.parseInt(actionButton.dataset.allBookId || "0", 10);
    const book = state.books.find((item) => Number(item.id) === id);
    if (!book) return;
    if (action === "detail") {
      openBookDetailModal(book);
      return;
    }
    if (action === "download") {
      exportBooks([book], String(book.code || id));
      return;
    }
  }

  const pageButton = event.target.closest("[data-all-page]");
  if (pageButton) {
    const page = Number.parseInt(pageButton.dataset.allPage || "1", 10);
    if (Number.isFinite(page)) {
      state.page = page;
      updateInteractiveView();
    }
    return;
  }

  const refresh = event.target.closest("[data-all-refresh]");
  if (refresh) {
    loadDashboard();
  }
});

document.addEventListener("submit", (event) => {
  const filterForm = event.target.closest("[data-all-filter-form]");
  if (!filterForm) return;
  event.preventDefault();
  const data = new FormData(filterForm);
  state.category = String(data.get("category") || "all");
  state.chartYear = normalizeYear(data.get("year"), state.chartYear);
  state.page = 1;
  state.filterOpen = false;
  loadDashboard();
});

state.chartYear = getInitialYear();
renderPage();
loadDashboard();
