import { apiFetch } from "../shared/api.js";
import { escapeHtml, renderDocument, stat } from "../shared/components.js";
import { renderKepalaShell } from "../shared/layout-kepala.js";

const PAGE_SIZE = 10;
const ASSUMED_COPY_COST = 250000;

const state = {
  loading: true,
  error: "",
  search: "",
  category: "all",
  stock: "all",
  page: 1,
  filterOpen: false,
  detailBook: null,
  generatedAt: "",
  chartYear: new Date().getFullYear(),
  books: [],
  summary: {
    books: { total: 0, active: 0, low_stock: 0, empty_stock: 0 },
    loans: { total: 0, borrowed: 0, returned_count: 0, overdue_count: 0, cancelled_count: 0, this_month: 0 },
    members: { total: 0, active: 0, inactive: 0, new_this_month: 0 },
  },
};

function formatCount(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}

function formatCurrency(value) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Math.round(Number(value || 0)))}`;
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

function getCategoryOptions() {
  const seen = new Set();
  return state.books
    .map((book) => String(book.category_name || "").trim())
    .filter((name) => {
      if (!name || seen.has(name)) return false;
      seen.add(name);
      return true;
    });
}

function getBookScore(book) {
  const borrowed = Number(book.borrowed_quantity || 0);
  const available = Number(book.stock_available || 0);
  const ratio = borrowed / Math.max(1, available || 1);
  if (available <= 0 || ratio >= 5) return 3;
  if (available <= 3 || ratio >= 3) return 2;
  if (ratio >= 1.5) return 1;
  return 0;
}

function getRecommendation(book) {
  const borrowed = Number(book.borrowed_quantity || 0);
  const available = Number(book.stock_available || 0);
  const ratio = borrowed / Math.max(1, available || 1);
  if (available <= 0 || ratio >= 5) {
    return { status: "KRITIS", statusTone: "red", action: "Tambah 20 Eks.", category: "CRITICAL", copies: 20 };
  }
  if (available <= 3 || ratio >= 3) {
    return { status: "MENIPIS", statusTone: "amber", action: "Tambah 15 Eks.", category: "LOW", copies: 15 };
  }
  if (borrowed >= 100 || ratio >= 1.5) {
    return { status: "CUKUP", statusTone: "green", action: "Tambah 10 Eks.", category: "WATCH", copies: 10 };
  }
  return { status: "CUKUP", statusTone: "green", action: "Pertahankan", category: "NORMAL", copies: 0 };
}

function getFilteredBooks() {
  const query = state.search.trim().toLowerCase();
  return state.books
    .map((book) => ({ ...book, ...getRecommendation(book) }))
    .filter((book) => {
      if (state.category !== "all" && String(book.category_name || "") !== state.category) {
        return false;
      }

      if (state.stock !== "all" && book.category !== state.stock) {
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
      const scoreDelta = getBookScore(right) - getBookScore(left);
      if (scoreDelta !== 0) return scoreDelta;
      const borrowedDelta = Number(right.borrowed_quantity || 0) - Number(left.borrowed_quantity || 0);
      if (borrowedDelta !== 0) return borrowedDelta;
      return String(left.title || "").localeCompare(String(right.title || ""));
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

function getStockBadge(book) {
  const available = Number(book.stock_available || 0);
  if (available <= 0) {
    return '<span class="pill red">Kosong</span>';
  }
  if (available <= 3) {
    return '<span class="pill amber">Stok Menipis</span>';
  }
  return '<span class="pill green">Tersedia</span>';
}

function getRecommendationBadge(book) {
  const recommendation = getRecommendation(book);
  const tone = recommendation.statusTone === "red" ? "red" : recommendation.statusTone === "amber" ? "amber" : recommendation.statusTone === "green" ? "green" : "blue";
  return `<span class="pill ${tone}">${escapeHtml(recommendation.action)}</span>`;
}

function getTrendText(items, index) {
  const current = Number(items[index]?.borrowed_quantity || 0);
  const next = Number(items[index + 1]?.borrowed_quantity || 0);
  if (index >= items.length - 1 || next <= 0) {
    return '<span class="trend-flat">0%</span>';
  }
  const diff = Math.round(((current - next) / next) * 100);
  if (diff > 0) return `<span class="trend-up">↑ ${diff}%</span>`;
  if (diff < 0) return `<span class="trend-down">↓ ${Math.abs(diff)}%</span>`;
  return '<span class="trend-flat">0%</span>';
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

function buildCsv(items) {
  const lines = [
    ["Ranking", "Judul Buku", "Kategori", "Penulis", "Total Peminjaman", "Stok Tersedia", "Status Stok", "Rekomendasi"].map(escapeCsv).join(","),
    ...items.map((book, index) => {
      const rec = getRecommendation(book);
      return [
        `#${index + 1}`,
        book.title || "-",
        book.category_name || "-",
        book.author || "-",
        formatCount(book.borrowed_quantity),
        formatCount(book.stock_available),
        rec.status,
        rec.action,
      ]
        .map(escapeCsv)
        .join(",");
    }),
  ];
  return `${lines.join("\n")}\n`;
}

function exportBooks(items, label = "rekomendasi") {
  const csv = buildCsv(items);
  downloadTextFile(`rekomendasi-${label}-${state.chartYear}.csv`, csv);
}

function openBookDetailModal(book) {
  state.detailBook = book;
  renderPage();
}

function getEstimatedBudget(items) {
  return items.reduce((sum, book) => sum + getRecommendation(book).copies * ASSUMED_COPY_COST, 0);
}

function renderHero() {
  return `<div class="hero-row" style="margin-bottom:18px">
    <div>
      <p class="page-copy" style="margin:0 0 4px;color:#006565;font-size:14px;font-weight:700">Analitik › Rekomendasi Pengadaan</p>
      <h1 class="page-title" style="color:#006565">Rekomendasi Pengadaan</h1>
      <p class="copy" style="margin:4px 0 0;color:#5f6a6a;font-size:13px">Daftar prioritas pengadaan buku dibaca langsung dari database dan bisa difilter per kategori, status stok, atau kata kunci.</p>
    </div>
    <button class="btn primary reco-export" type="button" data-reco-export>↓ Export Report</button>
  </div>`;
}

function renderKpis() {
  const filtered = getFilteredBooks();
  const totalBorrowed = filtered.reduce((sum, book) => sum + Number(book.borrowed_quantity || 0), 0);
  const criticalCount = filtered.filter((book) => getRecommendation(book).statusTone === "red").length;
  const estimatedBudget = getEstimatedBudget(filtered);
  const ratio = filtered.length > 0 ? Math.max(0, 5 - (criticalCount / filtered.length) * 5) : 0;

  return `<div class="stats-4">
    ${stat("TOTAL USULAN\nJUDUL", formatCount(filtered.length), "Data dari tabel buku", "▤", "green", `+${formatCount(filtered.length)}`)}
    ${stat("PEMINJAMAN\nTERCATAT", formatCount(totalBorrowed), "Kumulatif item terpakai", "↔", "blue")}
    ${stat("BUKU STATUS\nKRITIS", formatCount(criticalCount), "Segera", "!", "red")}
    ${stat("ESTIMASI\nANGGARAN", formatCurrency(estimatedBudget), `${ratio.toFixed(1)}/5.0 prioritas`, "₽", "amber")}
  </div>`;
}

function renderFilterPopover() {
  const categories = getCategoryOptions();
  const categoryOptions = ['<option value="all">Semua Kategori</option>']
    .concat(categories.map((name) => `<option value="${escapeHtml(name)}"${name === state.category ? " selected" : ""}>${escapeHtml(name)}</option>`))
    .join("");

  const stockOptions = [
    ["all", "Semua Status"],
    ["CRITICAL", "Kritis"],
    ["LOW", "Menipis"],
    ["NORMAL", "Cukup"],
  ];
  const stockMarkup = stockOptions
    .map(([value, label]) => `<option value="${value}"${value === state.stock ? " selected" : ""}>${label}</option>`)
    .join("");

  return `<div class="filter-popover all-filter-popover" id="reco-filter-layer" ${state.filterOpen ? "" : "hidden"}>
    <div class="filter-card">
      <div class="modal-head">
        <h3>Filter Rekomendasi</h3>
        <button class="modal-close" type="button" data-reco-filter-close>×</button>
      </div>
      <form class="modal-body all-filter-form" data-reco-filter-form>
        <div class="field">
          <label>KATEGORI</label>
          <select class="input all-select" name="category" data-reco-category>
            ${categoryOptions}
          </select>
        </div>
        <div class="field">
          <label>STATUS STOK</label>
          <select class="input all-select" name="stock" data-reco-stock>
            ${stockMarkup}
          </select>
        </div>
        <div class="form-actions all-filter-actions">
          <button class="btn" type="button" data-reco-filter-reset>RESET</button>
          <button class="btn primary" type="submit">Terapkan</button>
        </div>
      </form>
    </div>
  </div>`;
}

function renderToolbar() {
  const filtered = getFilteredBooks();
  const categoryLabel = state.category === "all" ? "Semua Kategori" : state.category;
  const stockLabelMap = {
    all: "Semua Status",
    CRITICAL: "Kritis",
    LOW: "Menipis",
    NORMAL: "Cukup",
  };
  const stockLabel = stockLabelMap[state.stock] || "Semua Status";

  return `<div class="all-toolbar">
    <label class="all-search">
      <span class="sr-only">Cari</span>
      <input class="input all-search-input" type="search" placeholder="Cari judul buku, penulis, atau kategori..." value="${escapeHtml(state.search)}" data-reco-search />
    </label>
    <div class="all-control">
      <span>FILTER</span>
      <div class="pill soft">${escapeHtml(categoryLabel)}</div>
    </div>
    <div class="all-control">
      <span>STATUS</span>
      <div class="pill soft">${escapeHtml(stockLabel)}</div>
    </div>
    <button class="btn all-filter-toggle" type="button" data-reco-filter-toggle>☰ Filter Kategori</button>
  </div>`;
}

function renderTable() {
  const filtered = getFilteredBooks();
  const pageData = getPageItems(filtered);
  const rows = pageData.items.length
    ? pageData.items
        .map((book, index) => {
          const rank = String(pageData.start + index + 1).padStart(2, "0");
          const rec = getRecommendation(book);
          return `<tr>
            <td><span class="all-rank">${escapeHtml(rank)}</span></td>
            <td class="all-book-cell">
              <strong>${escapeHtml(book.title || "-")}</strong>
              <span>Pemilik: ${escapeHtml(book.author || "-")}</span>
            </td>
            <td><span class="pill soft">${escapeHtml(book.category_name || "-")}</span></td>
            <td class="all-number">
              <strong>${formatCount(book.borrowed_quantity)}</strong>
              ${getTrendText(pageData.items, index)}
            </td>
            <td>${getStockBadge(book)}</td>
            <td>${getRecommendationBadge(book)}</td>
            <td>${renderRowActions(book, rec)}</td>
          </tr>`;
        })
        .join("")
    : '<tr><td colspan="7" class="all-empty-row">Tidak ada buku yang cocok dengan filter saat ini.</td></tr>';

  const showStart = filtered.length === 0 ? 0 : pageData.start + 1;
  const showEnd = pageData.end;
  const totalPages = pageData.totalPages;
  const current = pageData.page;
  const paginationButtons = [];

  if (totalPages > 1) {
    paginationButtons.push(`<button class="all-page-btn" type="button" data-reco-page="${Math.max(1, current - 1)}">‹</button>`);
    paginationButtons.push(`<button class="all-page-btn ${current === 1 ? "active" : ""}" type="button" data-reco-page="1">1</button>`);
    if (current > 3) {
      paginationButtons.push('<span class="all-ellipsis">...</span>');
    }
    const middleStart = Math.max(2, current - 1);
    const middleEnd = Math.min(totalPages - 1, current + 1);
    for (let page = middleStart; page <= middleEnd; page += 1) {
      if (page === 1 || page === totalPages) continue;
      paginationButtons.push(`<button class="all-page-btn ${current === page ? "active" : ""}" type="button" data-reco-page="${page}">${page}</button>`);
    }
    if (current < totalPages - 2) {
      paginationButtons.push('<span class="all-ellipsis">...</span>');
    }
    if (totalPages > 1) {
      paginationButtons.push(`<button class="all-page-btn ${current === totalPages ? "active" : ""}" type="button" data-reco-page="${totalPages}">${totalPages}</button>`);
    }
    paginationButtons.push(`<button class="all-page-btn" type="button" data-reco-page="${Math.min(totalPages, current + 1)}">›</button>`);
  }

  return `<section class="all-card">
    <div class="all-card-head" style="justify-content:flex-start;padding-top:14px">
      <div>
        <h2>Daftar Rekomendasi</h2>
        <p class="all-copy">Data diambil dari buku yang tersimpan di database dan disusun berdasarkan tingkat prioritas pengadaan.</p>
      </div>
    </div>
    ${renderFilterPopover()}
    <div class="all-table-wrap">
      <table class="all-table">
        <thead>
          <tr>
            <th>PERINGKAT</th>
            <th>JUDUL BUKU</th>
            <th>KATEGORI</th>
            <th>PEMINJAMAN</th>
            <th>STATUS STOK</th>
            <th>REKOMENDASI</th>
            <th>AKSI</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="all-footer">
      <div class="all-footer-info">Menampilkan ${showStart} - ${showEnd} dari ${formatCount(filtered.length)} buku yang dianalisis</div>
      <div class="all-pagination">${paginationButtons.join("")}</div>
    </div>
  </section>`;
}

function renderRowActions(book, recommendation) {
  return `<div class="all-actions-cell">
    <button class="all-icon-btn" type="button" data-reco-action="detail" data-reco-book-id="${escapeHtml(String(book.id || ""))}" aria-label="Lihat detail">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5c5.5 0 9.6 4.1 11 7-1.4 2.9-5.5 7-11 7S2.4 14.9 1 12c1.4-2.9 5.5-7 11-7Zm0 2C8 7 4.9 9.8 3.5 12 4.9 14.2 8 17 12 17s7.1-2.8 8.5-5C19.1 9.8 16 7 12 7Zm0 1.5A3.5 3.5 0 1 1 12 16a3.5 3.5 0 0 1 0-7Zm0 2A1.5 1.5 0 1 0 12 13a1.5 1.5 0 0 0 0-3Z"/></svg>
    </button>
    <button class="all-icon-btn" type="button" data-reco-action="download" data-reco-book-id="${escapeHtml(String(book.id || ""))}" aria-label="Unduh">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a1 1 0 0 1 1 1v8.17l2.59-2.58L17 11.17 12 16l-5-4.83 1.41-1.41L11 12.17V4a1 1 0 0 1 1-1Zm-7 14h14v2H5v-2Z"/></svg>
    </button>
  </div>`;
}

function renderSummaryCards() {
  const filtered = getFilteredBooks();
  const budget = getEstimatedBudget(filtered);
  const critical = filtered.filter((book) => getRecommendation(book).statusTone === "red").length;
  const low = filtered.filter((book) => getRecommendation(book).statusTone === "amber").length;
  return `<div class="split" style="margin-top:24px">
    <section class="report-card" style="padding:18px">
      <h2 class="panel-title">Kriteria Analisis</h2>
      <div class="page-copy" style="font-size:13px;line-height:22px;margin-top:12px">
        • Peringkat disusun dari tingkat tekanan stok dan frekuensi peminjaman.<br>
        • Kritis: stok kosong atau rasio peminjaman terhadap stok sangat tinggi.<br>
        • Menipis: stok masih ada tetapi sudah mendekati ambang aman.<br>
        • Cukup: stok aman, rekomendasi tetap dipantau.
      </div>
      <div class="stats-4" style="margin-top:16px">
        ${stat("KRITIS", formatCount(critical), "Perlu tambahan cepat", "!", "red")}
        ${stat("MENIPIS", formatCount(low), "Perlu dipantau", "△", "amber")}
      </div>
    </section>
    <section class="report-card" style="padding:18px">
      <h2 class="panel-title">Proyeksi Anggaran</h2>
      <div class="page-copy" style="font-size:13px;margin-top:12px">Estimasi dihitung dari jumlah usulan pengadaan pada daftar yang sedang tampil.</div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;margin-top:20px;flex-wrap:wrap">
        <div>
          <div class="page-copy" style="font-size:12px">TOTAL ESTIMASI</div>
          <div style="font-size:28px;font-weight:700;color:#191c1d">${formatCurrency(budget)}</div>
        </div>
        <button class="btn primary reco-export" type="button" data-reco-export-bottom>Unduh CSV</button>
      </div>
    </section>
  </div>`;
}

function renderDetailModal() {
  if (!state.detailBook) return "";
  const book = state.detailBook;
  const rec = getRecommendation(book);
  const available = Number(book.stock_available || 0);
  const totalStock = Number(book.stock_total || 0);
  const borrowed = Number(book.borrowed_quantity || 0);
  return `<div class="modal-layer" data-reco-modal-close>
    <div class="modal modal-lg">
      <div class="modal-head">
        <h3>Detail Rekomendasi Buku</h3>
        <button class="modal-close" type="button" data-reco-modal-close-btn>×</button>
      </div>
      <div class="modal-body">
        <div class="info-box">
          <div>
            <strong>${escapeHtml(book.title || "-")}</strong>
            ${escapeHtml(book.author || "-")} · ${escapeHtml(book.category_name || "-")}
          </div>
        </div>
        <div class="split" style="gap:16px">
          <div class="report-card" style="padding:16px">
            <h2 class="panel-title">Ringkasan</h2>
            <div class="page-copy" style="font-size:13px;line-height:22px;margin-top:10px">
              <strong>Kode:</strong> ${escapeHtml(book.code || "-")}<br>
              <strong>Penerbit:</strong> ${escapeHtml(book.publisher || "-")}<br>
              <strong>Tahun:</strong> ${escapeHtml(String(book.publication_year || "-"))}<br>
              <strong>Lokasi:</strong> ${escapeHtml(book.shelf_location || "-")}
            </div>
          </div>
          <div class="report-card" style="padding:16px">
            <h2 class="panel-title">Status Database</h2>
            <div class="page-copy" style="font-size:13px;line-height:22px;margin-top:10px">
              <strong>Total stok:</strong> ${formatCount(totalStock)}<br>
              <strong>Stok tersedia:</strong> ${formatCount(available)}<br>
              <strong>Total peminjaman:</strong> ${formatCount(borrowed)}<br>
              <strong>Rekomendasi:</strong> ${escapeHtml(rec.action)}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function renderContent() {
  if (state.loading) {
    return `<div class="head-loading">Memuat rekomendasi...</div>`;
  }

  if (state.error) {
    return `<div class="head-error">${escapeHtml(state.error)}</div>`;
  }

  return `<div class="all-page">
    ${renderHero()}
    <div id="reco-toolbar-region">${renderToolbar()}</div>
    <div id="reco-kpi-region">${renderKpis()}</div>
    <div id="reco-table-region">${renderTable()}</div>
    <div id="reco-summary-region">${renderSummaryCards()}</div>
    ${renderDetailModal()}
  </div>`;
}

function renderPage() {
  renderDocument(
    "Rekomendasi Pengadaan",
    renderKepalaShell("analytics", "Sistem Informasi Eksekutif", renderContent(), "", { compact: true }),
  );
}

function updateInteractiveView() {
  const tableRegion = document.getElementById("reco-table-region");
  const kpiRegion = document.getElementById("reco-kpi-region");
  const summaryRegion = document.getElementById("reco-summary-region");
  if (tableRegion) {
    tableRegion.innerHTML = renderTable();
  } else {
    renderPage();
  }
  if (kpiRegion) {
    kpiRegion.innerHTML = renderKpis();
  }
  if (summaryRegion) {
    summaryRegion.innerHTML = renderSummaryCards();
  }
}

async function loadRecommendations() {
  state.loading = true;
  state.error = "";
  renderPage();

  const [booksResult, overviewResult] = await Promise.allSettled([
    apiFetch("/api/books"),
    apiFetch(`/api/reports/overview?${buildQuery()}`),
  ]);

  try {
    if (booksResult.status === "fulfilled") {
      const payload = booksResult.value?.data || {};
      state.books = Array.isArray(payload.items) ? payload.items : [];
      state.summary.books = {
        total: Number(payload.summary?.total ?? 0),
        active: Number(payload.summary?.active ?? 0),
        low_stock: Number(payload.summary?.low_stock ?? 0),
        empty_stock: Number(payload.summary?.empty_stock ?? 0),
      };
    } else {
      throw booksResult.reason;
    }

    if (overviewResult.status === "fulfilled") {
      const payload = overviewResult.value?.data || {};
      state.generatedAt = String(payload.generated_at || "");
      state.chartYear = normalizeYear(payload.chart_year, state.chartYear);
      state.summary.members = {
        total: Number(payload.summary?.members?.total ?? 0),
        active: Number(payload.summary?.members?.active ?? 0),
        inactive: Number(payload.summary?.members?.inactive ?? 0),
        new_this_month: Number(payload.summary?.members?.new_this_month ?? 0),
      };
      state.summary.loans = {
        total: Number(payload.summary?.loans?.total ?? 0),
        borrowed: Number(payload.summary?.loans?.borrowed ?? 0),
        returned_count: Number(payload.summary?.loans?.returned_count ?? 0),
        overdue_count: Number(payload.summary?.loans?.overdue_count ?? 0),
        cancelled_count: Number(payload.summary?.loans?.cancelled_count ?? 0),
        this_month: Number(payload.summary?.loans?.this_month ?? 0),
      };
    }

    state.page = 1;
    state.detailBook = null;
  } catch (error) {
    state.error = error?.payload?.message || error?.message || "Gagal memuat rekomendasi.";
  } finally {
    state.loading = false;
    renderPage();
  }
}

document.addEventListener("input", (event) => {
  const searchField = event.target.closest("[data-reco-search]");
  if (!searchField) return;
  state.search = String(searchField.value || "");
  state.page = 1;
  updateInteractiveView();
});

document.addEventListener("change", (event) => {
  const categoryField = event.target.closest("[data-reco-category]");
  if (categoryField) {
    state.category = String(categoryField.value || "all");
    state.page = 1;
    renderPage();
    return;
  }

  const stockField = event.target.closest("[data-reco-stock]");
  if (stockField) {
    state.stock = String(stockField.value || "all");
    state.page = 1;
    renderPage();
  }
});

document.addEventListener("click", (event) => {
  const toggle = event.target.closest("[data-reco-filter-toggle]");
  if (toggle) {
    state.filterOpen = !state.filterOpen;
    renderPage();
    return;
  }

  const close = event.target.closest("[data-reco-filter-close]");
  if (close) {
    state.filterOpen = false;
    renderPage();
    return;
  }

  const reset = event.target.closest("[data-reco-filter-reset]");
  if (reset) {
    state.search = "";
    state.category = "all";
    state.stock = "all";
    state.page = 1;
    state.filterOpen = false;
    loadRecommendations();
    return;
  }

  const exportButton = event.target.closest("[data-reco-export]");
  if (exportButton) {
    event.preventDefault();
    exportBooks(getFilteredBooks(), "filtered");
    return;
  }

  const exportBottom = event.target.closest("[data-reco-export-bottom]");
  if (exportBottom) {
    event.preventDefault();
    exportBooks(getFilteredBooks(), "filtered");
    return;
  }

  const actionButton = event.target.closest("[data-reco-action]");
  if (actionButton) {
    const action = String(actionButton.dataset.recoAction || "");
    const id = Number.parseInt(actionButton.dataset.recoBookId || "0", 10);
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

  const pageButton = event.target.closest("[data-reco-page]");
  if (pageButton) {
    const page = Number.parseInt(pageButton.dataset.recoPage || "1", 10);
    if (Number.isFinite(page)) {
      state.page = page;
      updateInteractiveView();
    }
    return;
  }

  const modalClose = event.target.closest("[data-reco-modal-close-btn]");
  if (modalClose || event.target.matches("[data-reco-modal-close]")) {
    state.detailBook = null;
    renderPage();
  }
});

document.addEventListener("submit", (event) => {
  const filterForm = event.target.closest("[data-reco-filter-form]");
  if (!filterForm) return;
  event.preventDefault();
  const data = new FormData(filterForm);
  state.category = String(data.get("category") || "all");
  state.stock = String(data.get("stock") || "all");
  state.page = 1;
  state.filterOpen = false;
  renderPage();
});

state.chartYear = getInitialYear();
renderPage();
loadRecommendations();
