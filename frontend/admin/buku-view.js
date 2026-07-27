import { apiFetch } from "../shared/api.js";
import { escapeHtml, field, renderDocument, renderLabelHtml, stat } from "../shared/components.js?v=20260727";
import { renderAdminShell } from "../shared/layout-admin.js";

const state = {
  items: [],
  categories: [],
  summary: { total: 0, active: 0, low_stock: 0, empty_stock: 0 },
  query: "",
  filters: { status: "all", category_id: "all" },
  page: 1,
  pageSize: 5,
  loading: true,
  error: "",
};

function filteredItems() {
  const q = state.query.trim().toLowerCase();
  return state.items.filter((item) => {
    const matchesSearch =
      !q ||
      [item.code, item.title, item.author, item.publisher, item.category_name, item.category_code, item.isbn, item.shelf_location, item.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    const matchesStatus = state.filters.status === "all" || item.status === state.filters.status;
    const matchesCategory =
      state.filters.category_id === "all" || String(item.category_id) === String(state.filters.category_id);
    return matchesSearch && matchesStatus && matchesCategory;
  });
}

function visibleItems(items) {
  return items.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
}

function statusPill(status) {
  return status === "aktif" ? '<span class="pill green">Aktif</span>' : '<span class="pill red">Nonaktif</span>';
}

function stockPill(available, total) {
  const stockTotal = Number(total || 0);
  const stockAvailable = Number(available || 0);

  if (stockTotal <= 0) {
    return '<span class="pill red">0/0</span>';
  }

  const ratio = stockAvailable / stockTotal;
  const tone = ratio <= 0.25 ? "red" : ratio <= 0.5 ? "amber" : "green";

  return `<span class="pill ${tone}">${escapeHtml(`${stockAvailable}/${stockTotal}`)}</span>`;
}

function activeCategories() {
  return state.categories.filter((category) => category.status === "aktif");
}

function categoryOptions(selectedId = 0) {
  const options = activeCategories();
  if (!options.length) return '<option value="">Tidak ada kategori aktif</option>';
  return ['<option value="">Pilih kategori</option>']
    .concat(options.map((category) => `<option value="${category.id}" ${Number(selectedId) === Number(category.id) ? "selected" : ""}>${escapeHtml(category.code)} - ${escapeHtml(category.name)}</option>`))
    .join("");
}

function buildStats() {
  const lowStockPct = state.summary.total ? ((state.summary.low_stock / state.summary.total) * 100).toFixed(1) : "0.0";
  return `<div class="stats-4">
    ${stat("TOTAL KOLEKSI", String(state.summary.total), "Buku terdaftar di katalog", "▥", "teal", `${state.summary.active} AKTIF`)}
    ${stat("BUKU AKTIF", String(state.summary.active), "Siap dipinjam pengguna", "✓", "blue", "AKTIF")}
    ${stat("STOK MENIPIS", String(state.summary.low_stock), "Stok <= 3 eksemplar", "△", "amber", `${lowStockPct}% DATA`)}
    ${stat("STOK HABIS", String(state.summary.empty_stock), "Stok tersedia = 0", "⊘", "red", "PERLU RESTOK")}
  </div>`;
}

function buildTable(items) {
  if (!items.length) return '<div class="table-empty" style="padding:24px 20px;color:#6e7979">Tidak ada data buku.</div>';
  const start = (state.page - 1) * state.pageSize;
  const rows = items.map((item, index) => `<tr>
    <td>${start + index + 1}</td>
    <td><strong>${escapeHtml(item.code)}</strong></td>
    <td><strong>${escapeHtml(item.title)}</strong></td>
    <td>${escapeHtml(item.author)}</td>
    <td>${escapeHtml(item.publisher)}</td>
    <td>${escapeHtml(String(item.publication_year || "-"))}</td>
    <td>${escapeHtml(item.category_name || "-")}</td>
    <td>${stockPill(item.stock_available, item.stock_total)}</td>
    <td>${statusPill(item.status)}</td>
    <td><div class="actions">
      <button class="row-btn" data-action="edit" data-id="${item.id}" aria-label="Edit buku">✎</button>
      <button class="row-btn" data-action="delete" data-id="${item.id}" aria-label="Nonaktifkan buku">⌫</button>
    </div></td>
  </tr>`).join("");
  return `<table class="data-table">
    <thead><tr>
      <th style="width:72px">NO</th>
      <th style="width:114px">ID BUKU</th>
      <th style="width:210px">JUDUL BUKU</th>
      <th style="width:160px">PENULIS</th>
      <th style="width:160px">PENERBIT</th>
      <th style="width:78px">TAHUN</th>
      <th style="width:148px">KATEGORI</th>
      <th style="width:92px">STOK</th>
      <th style="width:104px">STATUS</th>
      <th style="width:104px">AKSI</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildPagination(total) {
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  const current = Math.min(Math.max(state.page, 1), totalPages);
  const start = total === 0 ? 0 : (current - 1) * state.pageSize + 1;
  const end = Math.min(total, current * state.pageSize);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => `<button class="page-btn ${page === current ? "active" : ""}" data-page="${page}">${page}</button>`).join("");
  return `<div class="pagination">
    <span>Menampilkan ${start} sampai ${end} dari ${total} data</span>
    <div class="pages">
      <button class="page-btn" data-page="prev" ${current <= 1 ? "disabled" : ""}>‹</button>
      ${pages}
      <button class="page-btn" data-page="next" ${current >= totalPages ? "disabled" : ""}>›</button>
    </div>
  </div>`;
}

function filterLayer() {
  return `<div class="filter-popover" id="book-filter-layer" hidden>
    <div class="filter-card">
      <div class="modal-head">
        <h3>Filter Buku</h3>
        <button class="modal-close" type="button" data-filter-close>×</button>
      </div>
      <form class="modal-body" data-filter-form>
        <div class="field">
          <label>KATEGORI</label>
          <select class="input" name="category_id" data-filter-category>
            <option value="all">Semua kategori</option>
            ${state.categories.map((category) => `<option value="${category.id}">${escapeHtml(category.code)} - ${escapeHtml(category.name)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>STATUS</label>
          <select class="input" name="status" data-filter-status>
            <option value="all">Semua status</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
          </select>
        </div>
        <div class="form-actions">
          <button class="btn" type="button" data-filter-reset>RESET</button>
          <button class="btn primary" type="submit">Terapkan</button>
        </div>
      </form>
    </div>
  </div>`;
}

function bookModal(book = null) {
  const isEdit = Boolean(book);
  const selectedStatus = book?.status || "aktif";
  const selectedCategory = activeCategories().some((category) => Number(category.id) === Number(book?.category_id)) ? Number(book?.category_id || 0) : 0;
  return `<div class="modal-layer">
    <div class="modal modal-xl">
      <div class="modal-head">
        <h3>${isEdit ? "Edit Buku" : "Form Tambah Buku Baru"}</h3>
        <button class="modal-close" type="button">×</button>
      </div>
      <form class="modal-body" data-book-form style="gap:16px">
        <input type="hidden" name="id" value="${escapeHtml(book?.id || "")}" />
        <p style="margin:0;color:#6e7979;font-size:12px;line-height:16px">Masukkan informasi katalog lengkap sesuai buku fisik</p>
        <div class="login-alert" data-book-alert hidden></div>
        <div class="field full">
          <label>${renderLabelHtml("KATEGORI BUKU *")}</label>
          <select class="input" name="category_id" required>${categoryOptions(selectedCategory)}</select>
        </div>
        ${field("JUDUL BUKU *", book?.title || "", { name: "title", placeholder: "Contoh: Belajar Pemrograman Web", full: true })}
        <div class="split" style="gap:16px">
          ${field("PENULIS *", book?.author || "", { name: "author", placeholder: "Nama penulis" })}
          ${field("PENERBIT *", book?.publisher || "", { name: "publisher", placeholder: "Nama penerbit" })}
        </div>
        <div class="split" style="gap:16px">
          ${field("TAHUN TERBIT", book?.publication_year || "", { name: "publication_year", placeholder: "2024", type: "number" })}
          ${field("ISBN", book?.isbn || "", { name: "isbn", placeholder: "978-602-xxx" })}
        </div>
        <div class="split" style="gap:16px">
          ${field("EDISI", book?.edition || "", { name: "edition", placeholder: "Edisi 1" })}
          ${field("BAHASA", book?.language || "", { name: "language", placeholder: "Indonesia" })}
        </div>
        <div class="split" style="gap:16px">
          ${field("LOKASI RAK", book?.shelf_location || "", { name: "shelf_location", placeholder: "Rak A-1" })}
          ${field("STATUS BUKU", selectedStatus, { name: "status", tag: "select", options: ["aktif", "nonaktif"] })}
        </div>
        <div class="split" style="gap:16px">
          ${field("STOK TOTAL *", String(book?.stock_total ?? 0), { name: "stock_total", placeholder: "1", type: "number" })}
          ${field("STOK TERSEDIA", String(book?.stock_available ?? book?.stock_total ?? 0), { name: "stock_available", placeholder: "1", type: "number" })}
        </div>
        ${field("DESKRIPSI", book?.description || "", { name: "description", textarea: true, placeholder: "Tuliskan deskripsi singkat buku..." })}
        <div class="form-actions">
          <button class="btn primary" type="submit">${isEdit ? "SIMPAN PERUBAHAN" : "SIMPAN BUKU"}</button>
        </div>
      </form>
    </div>
  </div>`;
}

function renderShell() {
  const items = filteredItems();
  const pageItems = visibleItems(items);
  const stats = state.loading
    ? `<div class="stats-4">${stat("TOTAL KOLEKSI", "-", "Memuat data...", "▥", "teal")}${stat("BUKU AKTIF", "-", "Memuat data...", "✓", "blue")}${stat("STOK MENIPIS", "-", "Memuat data...", "△", "amber")}${stat("STOK HABIS", "-", "Memuat data...", "⊘", "red")}</div>`
    : state.error
      ? `<div class="stats-4">${stat("TOTAL KOLEKSI", "-", "Tidak dapat dimuat", "▥", "teal")}${stat("BUKU AKTIF", "-", "Tidak dapat dimuat", "✓", "blue")}${stat("STOK MENIPIS", "-", "Tidak dapat dimuat", "△", "amber")}${stat("STOK HABIS", "-", "Tidak dapat dimuat", "⊘", "red")}</div>`
      : buildStats();

  const panelContent = state.loading
    ? '<section class="panel" id="book-panel"><div style="padding:24px 20px;color:#6e7979">Memuat buku...</div></section>'
    : state.error
      ? `<section class="panel" id="book-panel"><div style="padding:24px 20px;color:#ba1a1a">${escapeHtml(state.error)}</div></section>`
      : `<section class="panel" id="book-panel">
          <div class="panel-toolbar">
            <div class="panel-title-wrap">
              <h2 class="panel-title">Katalog Buku Aktif</h2>
              <span class="pill teal" data-book-total>${state.summary.total} TOTAL</span>
            </div>
            <div class="toolbar-actions">
              <button class="btn primary" id="open-book-modal">＋ Tambah Buku</button>
              <label class="search"><span>⌕</span><input class="search-field" id="book-search" type="search" placeholder="Cari buku..." value="${escapeHtml(state.query)}" /></label>
              <button class="btn" type="button" id="open-book-filter">☰</button>
            </div>
          </div>
          ${filterLayer()}
          <div id="book-table-wrap">${buildTable(pageItems)}</div>
          <div id="book-pagination-wrap">${buildPagination(items.length)}</div>
        </section>`;

  renderDocument("Daftar Katalog Buku", renderAdminShell("books", "Daftar Katalog Buku", `<div id="book-stats">${stats}</div>${panelContent}`));
  bindHandlers();
  bindTableHandlers();
}

function openBookModal(book = null) {
  if (document.querySelector(".modal-layer")) return;
  const isEdit = Boolean(book);
  document.body.insertAdjacentHTML("beforeend", bookModal(book));

  const layer = document.querySelector(".modal-layer");
  const form = layer?.querySelector("[data-book-form]");
  const closeButton = layer?.querySelector(".modal-close");
  const alertBox = layer?.querySelector("[data-book-alert]");

  const closeModal = () => {
    layer?.remove();
  };

  closeButton?.addEventListener("click", closeModal);

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!alertBox) return;
    const data = new FormData(form);
    const payload = {
      id: Number(data.get("id") || 0),
      category_id: Number(data.get("category_id") || 0),
      title: String(data.get("title") || "").trim(),
      author: String(data.get("author") || "").trim(),
      publisher: String(data.get("publisher") || "").trim(),
      publication_year: String(data.get("publication_year") || "").trim(),
      isbn: String(data.get("isbn") || "").trim(),
      edition: String(data.get("edition") || "").trim(),
      language: String(data.get("language") || "").trim(),
      shelf_location: String(data.get("shelf_location") || "").trim(),
      description: String(data.get("description") || "").trim(),
      stock_total: Number(data.get("stock_total") || 0),
      stock_available: data.get("stock_available") === "" ? "" : Number(data.get("stock_available") || 0),
      status: String(data.get("status") || "aktif").trim(),
    };

    if (!payload.category_id || !payload.title || !payload.author || !payload.publisher) {
      alertBox.hidden = false;
      alertBox.dataset.type = "error";
      alertBox.textContent = "Kategori, judul, penulis, dan penerbit wajib diisi.";
      return;
    }
    if (payload.stock_total < 0 || Number.isNaN(payload.stock_total)) {
      alertBox.hidden = false;
      alertBox.dataset.type = "error";
      alertBox.textContent = "Stok total tidak valid.";
      return;
    }

    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Menyimpan...";
    }

    try {
      await apiFetch("/api/books", {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      closeModal();
      await loadBooks();
    } catch (error) {
      alertBox.hidden = false;
      alertBox.dataset.type = "error";
      alertBox.textContent = error?.payload?.message || error?.message || "Gagal menyimpan buku.";
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = isEdit ? "SIMPAN PERUBAHAN" : "SIMPAN BUKU";
      }
    }
  });
}

async function deleteBook(id) {
  if (!window.confirm("Yakin ingin menonaktifkan buku ini?")) return;
  try {
    await apiFetch("/api/books", { method: "DELETE", body: JSON.stringify({ id }) });
    await loadBooks();
  } catch (error) {
    window.alert(error?.payload?.message || error?.message || "Gagal menonaktifkan buku.");
  }
}

function bindHandlers() {
  document.getElementById("open-book-modal")?.addEventListener("click", () => openBookModal());
  document.getElementById("open-book-filter")?.addEventListener("click", () => {
    const layer = document.getElementById("book-filter-layer");
    const select = layer?.querySelector("[data-filter-status]");
    const categorySelect = layer?.querySelector("[data-filter-category]");
    if (!layer) return;
    layer.hidden = !layer.hidden;
    if (select) select.value = state.filters.status;
    if (categorySelect) categorySelect.value = state.filters.category_id;
  });

  document.getElementById("book-search")?.addEventListener("input", (event) => {
    state.query = String(event.target.value || "");
    state.page = 1;
    updateBookView();
  });

  const layer = document.getElementById("book-filter-layer");
  const form = layer?.querySelector("[data-filter-form]");
  const close = layer?.querySelector("[data-filter-close]");
  const reset = layer?.querySelector("[data-filter-reset]");

  const closeFilter = () => {
    if (layer) layer.hidden = true;
  };

  close?.addEventListener("click", closeFilter);
  reset?.addEventListener("click", () => {
    state.filters.status = "all";
    state.filters.category_id = "all";
    if (form) {
      form.reset();
      const select = form.querySelector("[data-filter-status]");
      if (select) select.value = "all";
      const categorySelect = form.querySelector("[data-filter-category]");
      if (categorySelect) categorySelect.value = "all";
    }
    state.page = 1;
    updateBookView();
  });
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    state.filters.status = String(data.get("status") || "all");
    state.filters.category_id = String(data.get("category_id") || "all");
    state.page = 1;
    closeFilter();
    updateBookView();
  });
}

function bindTableHandlers() {
  document.querySelectorAll("[data-action='edit']").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.getAttribute("data-id") || 0);
      const book = state.items.find((item) => item.id === id);
      if (book) openBookModal(book);
    });
  });

  document.querySelectorAll("[data-action='delete']").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.getAttribute("data-id") || 0);
      if (id > 0) deleteBook(id);
    });
  });

  document.querySelectorAll(".page-btn[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.getAttribute("data-page");
      const totalPages = Math.max(1, Math.ceil(filteredItems().length / state.pageSize));
      if (target === "prev") state.page = Math.max(1, state.page - 1);
      else if (target === "next") state.page = Math.min(totalPages, state.page + 1);
      else state.page = Math.max(1, Math.min(totalPages, Number(target)));
      updateBookView();
    });
  });
}

function updateBookView() {
  const items = filteredItems();
  const pageItems = visibleItems(items);
  const statsWrap = document.getElementById("book-stats");
  const tableWrap = document.getElementById("book-table-wrap");
  const paginationWrap = document.getElementById("book-pagination-wrap");
  const totalBadge = document.querySelector("[data-book-total]");

  if (statsWrap) statsWrap.innerHTML = buildStats();
  if (tableWrap) tableWrap.innerHTML = buildTable(pageItems);
  if (paginationWrap) paginationWrap.innerHTML = buildPagination(items.length);
  if (totalBadge) totalBadge.textContent = `${state.summary.total} TOTAL`;
  bindTableHandlers();
}

async function loadBooks() {
  state.loading = true;
  state.error = "";
  renderShell();

  try {
    const [booksResponse, categoriesResponse] = await Promise.all([apiFetch("/api/books"), apiFetch("/api/categories")]);
    const booksPayload = booksResponse?.data || {};
    const categoriesPayload = categoriesResponse?.data || {};
    state.items = Array.isArray(booksPayload.items) ? booksPayload.items : [];
    state.categories = Array.isArray(categoriesPayload.items) ? categoriesPayload.items : [];
    state.summary = {
      total: Number(booksPayload.summary?.total ?? state.items.length),
      active: Number(booksPayload.summary?.active ?? 0),
      low_stock: Number(booksPayload.summary?.low_stock ?? 0),
      empty_stock: Number(booksPayload.summary?.empty_stock ?? 0),
    };
    state.page = 1;
  } catch (error) {
    state.error = error?.payload?.message || error?.message || "Gagal memuat buku.";
  } finally {
    state.loading = false;
    renderShell();
  }
}

renderShell();
loadBooks();
