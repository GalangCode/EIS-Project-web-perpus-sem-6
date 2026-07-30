import { apiFetch } from "../shared/api.js";
import { assetPath, escapeHtml, renderDocument, stat, renderPagination } from "../shared/components.js";
import { renderKepalaShell } from "../shared/layout-kepala.js";

const PAGE_SIZE = 8;
const CATEGORY_COLORS = ["#0a6365", "#0d61bf", "#b06a33", "#7f8a8a", "#8b6dbf"];

const state = {
  loading: true,
  error: "",
  page: 1,
  query: "",
  categoryId: "all",
  filterOpen: false,
  books: [],  
  categories: [],
};

function numberFormat(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}

function shortFormat(value) {
  const formatted = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
  return formatted.toLowerCase();
}

function formatYear(value) {
  const year = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(year) && year > 0 ? String(year) : "-";
}

function formatStock(book) {
  const total = Math.max(0, Number(book.stock_total || 0));
  return `${numberFormat(total)} Eks`;
}

function getActiveCategories() {
  return Array.isArray(state.categories) ? state.categories.filter((item) => item.status === "aktif") : [];
}

function getCategoryShares() {
  const items = getActiveCategories()
    .map((item) => ({
      id: item.id,
      label: item.name,
      count: Number(item.books_count || 0),
    }))
    .sort((left, right) => right.count - left.count);

  const total = items.reduce((sum, item) => sum + item.count, 0);
  const topItems = items.slice(0, 4);
  const topTotal = topItems.reduce((sum, item) => sum + item.count, 0);

  return topItems.map((item, index) => ({
    id: item.id,
    label: item.label,
    count: item.count,
    percent: topTotal > 0 ? (item.count / topTotal) * 100 : 0,
    totalPercent: total > 0 ? (item.count / total) * 100 : 0,
    color: CATEGORY_COLORS[index] || CATEGORY_COLORS[CATEGORY_COLORS.length - 1],
  }));
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
      const span = (count / total) * 100;
      const start = cursor;
      const end = cursor + span;
      cursor = end;
      return `${item.color} ${start}% ${end}%`;
    });

  return segments.length > 0 ? `conic-gradient(${segments.join(", ")})` : "conic-gradient(#e7eeee 0 100%)";
}

function getYearBuckets() {
  const years = new Map();
  for (const book of state.books) {
    const year = Number.parseInt(String(book.publication_year || ""), 10);
    if (!Number.isFinite(year) || year <= 0) continue;
    years.set(year, (years.get(year) || 0) + 1);
  }

  if (years.size === 0) {
    return [];
  }

  return Array.from(years.entries())
    .sort((left, right) => left[0] - right[0])
    .slice(-5)
    .map(([year, count]) => ({ year, count }));
}

function getFilteredBooks() {
  const query = state.query.trim().toLowerCase();
  return state.books
    .filter((book) => {
      if (state.categoryId !== "all" && String(book.category_id) !== state.categoryId) {
        return false;
      }
      if (!query) {
        return true;
      }
      return [book.title, book.author, book.publisher, book.category_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    })
    .sort((left, right) => {
      const leftYear = Number.parseInt(String(left.publication_year || ""), 10) || 0;
      const rightYear = Number.parseInt(String(right.publication_year || ""), 10) || 0;
      return rightYear - leftYear || String(left.title).localeCompare(String(right.title));
    });
}

function getStatusLabel(book) {
  const available = Number(book.stock_available || 0);
  const total = Number(book.stock_total || 0);
  if (available <= 0) return "Dipinjam";
  if (total > 0 && available < total) return "Menipis";
  return "Tersedia";
}

function getStatusPill(book) {
  const available = Number(book.stock_available || 0);
  const total = Number(book.stock_total || 0);
  if (available <= 0) return '<span class="pill red">DIPINJAM</span>';
  if (total > 0 && available < total) return '<span class="pill amber">MENIPIS</span>';
  return '<span class="pill green">TERSEDIA</span>';
}

function getCoverSrc() {
  return assetPath("book.png");
}

function renderStats() {
  const totalBooks = state.books.length;
  const totalCategories = state.categories.length;
  const activeBooks = state.books.filter((book) => book.status === "aktif").length;
  const availableStock = state.books.reduce((sum, book) => sum + Number(book.stock_available || 0), 0);

  return `<div class="stats-4 collection-stats">
    ${stat("TOTAL KOLEKSI BUKU", numberFormat(totalBooks), "Semua judul yang terdata", "▤", "green")}
    ${stat("KATEGORI BUKU", numberFormat(totalCategories), "Kategori aktif dan nonaktif", "▧", "blue")}
    ${stat("BUKU AKTIF", numberFormat(activeBooks), "Buku siap dipakai", "＋", "amber")}
    ${stat("STOK TERSEDIA", shortFormat(availableStock), "Eksemplar siap dipinjam", "◱", "green")}
  </div>`;
}

function renderYearCard() {
  const bars = getYearBuckets();
  const maxValue = Math.max(1, ...bars.map((item) => item.count));
  const chart = bars.length
    ? bars
        .map((item) => {
          const height = Math.max(8, Math.round((item.count / maxValue) * 100));
          return `<div class="collection-year-item">
            <div class="collection-year-bar-wrap">
              <div class="collection-year-bar" style="height:${height}%"></div>
            </div>
            <div class="collection-year-label">${escapeHtml(String(item.year))}</div>
          </div>`;
        })
        .join("")
    : '<div class="collection-empty">Belum ada data tahun terbit.</div>';

  return `<section class="panel collection-card">
    <div class="panel-toolbar collection-toolbar-head">
      <div>
        <h2 class="panel-title">Pertumbuhan Koleksi Tahunan</h2>
        <div class="page-copy" style="font-size:12px">Distribusi buku berdasarkan tahun terbit dari database.</div>
      </div>
      <button class="btn" type="button" data-collection-export>Unduh CSV</button>
    </div>
    <div class="collection-year-chart">${chart}</div>
  </section>`;
}

function renderCategoryCard() {
  const shares = getCategoryShares();
  const donutStyle = `background:${buildDonutGradient(shares)}`;
  const totalBooks = state.books.length;
  const legend = shares
    .map(
      (item) => `<div class="collection-legend-item">
        <span class="collection-legend-left">
          <span class="collection-dot" style="background:${item.color}"></span>
          <strong>${escapeHtml(item.label)}</strong>
        </span>
        <span>${Math.round(item.totalPercent)}%</span>
      </div>`,
    )
    .join("");

  return `<section class="panel collection-card">
    <div class="panel-toolbar collection-toolbar-head">
      <div>
        <h2 class="panel-title">Distribusi Kategori</h2>
      </div>
    </div>
    <div class="collection-donut-stack">
      <div class="collection-donut-wrap">
        <div class="collection-donut" style="${donutStyle}">
          <div class="collection-donut-hole"></div>
          <div class="collection-donut-center">
            <div class="collection-donut-value">${shortFormat(totalBooks)}</div>
            <div class="collection-donut-label">TOTAL KOLEKSI</div>
          </div>
        </div>
      </div>
      <div class="collection-legend">${legend || '<div class="collection-empty">Belum ada kategori aktif.</div>'}</div>
    </div>
  </section>`;
}

function renderFilters() {
  const categories = getActiveCategories();
  const categoryOptions = categories
    .map((category) => `<option value="${escapeHtml(String(category.id))}"${String(category.id) === state.categoryId ? " selected" : ""}>${escapeHtml(category.name)}</option>`)
    .join("");

  return `<div class="filter-popover collection-filter-popover" id="collection-filter-layer" ${state.filterOpen ? "" : "hidden"}>
    <div class="filter-card">
      <div class="modal-head">
        <h3>Filter Koleksi</h3>
        <button class="modal-close" type="button" data-collection-filter-close>×</button>
      </div>
      <form class="modal-body" data-collection-filter-form>
        <div class="field">
          <label>CARI</label>
          <input class="input collection-search-input" type="search" placeholder="Cari judul, penulis, penerbit..." value="${escapeHtml(state.query)}" data-collection-search />
        </div>
        <div class="field">
          <label>KATEGORI</label>
          <select class="input collection-select-input" name="category_id" data-collection-category>
            <option value="all"${state.categoryId === "all" ? " selected" : ""}>Semua kategori</option>
            ${categoryOptions}
          </select>
        </div>
      </form>
    </div>
  </div>`;
}

function renderTableBody() {
  const filteredBooks = getFilteredBooks();
  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, state.page), totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const visible = filteredBooks.slice(start, start + PAGE_SIZE);

  const rows = visible
    .map((book, index) => {
      const rank = start + index + 1;
      return `<tr>
        <td><span class="head-rank rank-${Math.min(rank, 5)}">${String(rank).padStart(2, "0")}</span></td>
        <td class="collection-title-cell">
          <div class="collection-book-cell">
            <img class="collection-book-cover" src="${getCoverSrc()}" alt="" aria-hidden="true" />
            <div class="collection-book-meta">
              <strong>${escapeHtml(book.title || "-")}</strong>
            </div>
          </div>
        </td>
        <td>${escapeHtml(book.category_name || "-")}</td>
        <td>${escapeHtml(formatYear(book.publication_year))}</td>
        <td>${escapeHtml(formatStock(book))}</td>
        <td>${getStatusPill(book)}</td>
        <td><a class="collection-action-link" href="buku.html?id=${encodeURIComponent(String(book.id || ""))}">Detail</a></td>
      </tr>`;
    })
    .join("");

  return rows || '<tr><td colspan="7" class="collection-empty-row">Belum ada data yang cocok dengan filter.</td></tr>';
}

function buildCollectionPagination() {
  const filteredBooks = getFilteredBooks();
  return renderPagination(filteredBooks.length, state.page, PAGE_SIZE, {
    pageAttr: "data-collection-page",
    showSummary: true,
    useArrows: true
  });
}

function renderTable() {
  const filteredBooks = getFilteredBooks();
  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, state.page), totalPages);

  return `<section class="panel collection-table-card">
    <div class="panel-toolbar collection-toolbar-head">
      <div>
        <h2 class="panel-title">Daftar Inventaris Koleksi Strategis</h2>
        <div class="page-copy" style="font-size:12px">Data buku, kategori, dan stok diambil langsung dari database.</div>
      </div>
      <div class="toolbar-actions">
        <button class="btn" type="button" data-collection-filter-toggle>Filter</button>
        <button class="btn primary" type="button" data-collection-export>Unduh Laporan</button>
      </div>
    </div>
    ${renderFilters()}
    <div class="collection-table-wrap">
      <table class="collection-table">
        <colgroup>
          <col class="collection-col-rank">
          <col class="collection-col-title">
          <col class="collection-col-category">
          <col class="collection-col-year">
          <col class="collection-col-stock">
          <col class="collection-col-status">
          <col class="collection-col-action">
        </colgroup>
        <thead>
          <tr>
            <th>RANKING</th>
            <th>JUDUL BUKU</th>
            <th>KATEGORI</th>
            <th>TAHUN TERBIT</th>
            <th>JUMLAH STOK</th>
            <th>STATUS</th>
            <th>AKSI</th>
          </tr>
        </thead>
        <tbody id="collection-table-body">${renderTableBody()}</tbody>
      </table>
    </div>
    <div class="pagination collection-pagination" id="collection-pagination-wrap">
      ${buildCollectionPagination()}
    </div>
  </section>`;
}

function renderContent() {
  if (state.loading) {
    return `<div class="head-loading">Memuat koleksi...</div>`;
  }

  if (state.error) {
    return `<div class="head-error">${escapeHtml(state.error)}</div>`;
  }

  return `<div class="collection-page">
    <div class="hero-row collection-hero">
      <div>
        <nav class="page-copy collection-breadcrumb" aria-label="breadcrumb">
          <a class="breadcrumb-link" href="dashboard.html">Dashboard Eksekutif</a>
          <span class="breadcrumb-separator" aria-hidden="true">›</span>
          <span aria-current="page">Koleksi</span>
        </nav>
        <h1 class="page-title collection-title">Analisis Koleksi Perpustakaan</h1>
      </div>
    </div>
    ${renderStats()}
    <div class="split collection-split">
      ${renderYearCard()}
      ${renderCategoryCard()}
    </div>
    ${renderTable()}
  </div>`;
}

function renderPage() {
  renderDocument(
    "Analisis Koleksi Perpustakaan",
    renderKepalaShell("collection", "Sistem Informasi Eksekutif", renderContent(), "", { compact: true }),
  );
}

function updateCollectionView() {
  const tableBody = document.getElementById("collection-table-body");
  const paginationWrap = document.getElementById("collection-pagination-wrap");

  if (tableBody) {
    tableBody.innerHTML = renderTableBody();
  }

  if (paginationWrap) {
    paginationWrap.innerHTML = buildCollectionPagination();
  }
}

function clampPage() {
  const filteredBooks = getFilteredBooks();
  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE));
  state.page = Math.min(Math.max(1, state.page), totalPages);
}

function exportCsv() {
  const filteredBooks = getFilteredBooks();
  const headers = ["Rank", "Judul Buku", "Kategori", "Tahun Terbit", "Jumlah Stok", "Status"];
  const rows = filteredBooks.map((book, index) => [
    index + 1,
    book.title || "-",
    book.category_name || "-",
    formatYear(book.publication_year),
    formatStock(book),
    getStatusLabel(book),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "koleksi_perpustakaan.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

async function loadCollection() {
  state.loading = true;
  state.error = "";
  renderPage();

  try {
    const [booksResponse, categoriesResponse] = await Promise.all([
      apiFetch("/api/books"),
      apiFetch("/api/categories"),
    ]);

    state.books = Array.isArray(booksResponse?.data?.items) ? booksResponse.data.items : [];
    state.categories = Array.isArray(categoriesResponse?.data?.items) ? categoriesResponse.data.items : [];
    clampPage();
    state.loading = false;
    renderPage();
  } catch (error) {
    state.loading = false;
    state.error = error?.message || "Gagal memuat koleksi.";
    renderPage();
  }
}

document.addEventListener("input", (event) => {
  const search = event.target.closest("[data-collection-search]");
  if (search) {
    state.query = search.value || "";
    state.page = 1;
    clampPage();
    updateCollectionView();
  }
});

document.addEventListener("change", (event) => {
  const category = event.target.closest("[data-collection-category]");
  if (category) {
    state.categoryId = category.value || "all";
    state.page = 1;
    clampPage();
    updateCollectionView();
  }
});

document.addEventListener("click", (event) => {
  const pageButton = event.target.closest("[data-collection-page]");
  if (pageButton) {
    const target = pageButton.dataset.collectionPage || "1";
    const filteredBooks = getFilteredBooks();
    const totalPages = Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE));
    if (target === "prev") {
      state.page = Math.max(1, state.page - 1);
    } else if (target === "next") {
      state.page = Math.min(totalPages, state.page + 1);
    } else {
      const nextPage = Number.parseInt(target, 10);
      if (Number.isFinite(nextPage)) {
        state.page = Math.max(1, Math.min(totalPages, nextPage));
      }
    }
    clampPage();
    updateCollectionView();
    return;
  }

  const exportButton = event.target.closest("[data-collection-export]");
  if (exportButton) {
    exportCsv();
    return;
  }

  const filterToggle = event.target.closest("[data-collection-filter-toggle]");
  if (filterToggle) {
    state.filterOpen = !state.filterOpen;
    renderPage();
    return;
  }

  const filterClose = event.target.closest("[data-collection-filter-close]");
  if (filterClose) {
    state.filterOpen = false;
    renderPage();
  }
});

loadCollection();
