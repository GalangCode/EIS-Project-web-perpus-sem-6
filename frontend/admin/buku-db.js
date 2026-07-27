import { apiFetch } from "../shared/api.js";
import { escapeHtml, field, renderDocument, stat } from "../shared/components.js";
import { renderAdminShell } from "../shared/layout-admin.js";

const state = {
  items: [],
  categories: [],
  summary: { total: 0, active: 0, low_stock: 0, empty_stock: 0 },
  query: "",
  filters: { status: "all" },
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
    return matchesSearch && matchesStatus;
  });
}

function visibleItems(items) {
  const start = (state.page - 1) * state.pageSize;
  return items.slice(start, start + state.pageSize);
}

function statusPill(status) {
  return status === "aktif" ? '<span class="pill green">Aktif</span>' : '<span class="pill red">Nonaktif</span>';
}

function buildStats() {
  const lowStockPct = state.summary.total ? ((state.summary.low_stock / state.summary.total) * 100).toFixed(1) : "0.0";
  return `<div class="analytics-grid">
    ${stat("TOTAL KOLEKSI", String(state.summary.total), "Buku terdaftar di katalog", "▥", "teal", `${state.summary.active} AKTIF`)}
    ${stat("BUKU AKTIF", String(state.summary.active), "Siap dipinjam pengguna", "✓", "blue", "AKTIF")}
    ${stat("STOK MENIPIS", String(state.summary.low_stock), "Stok <= 3 eksemplar", "△", "amber", `${lowStockPct}% DATA`)}
    ${stat("STOK HABIS", String(state.summary.empty_stock), "Stok tersedia = 0", "⊘", "red", "PERLU RESTOK")}
  </div>`;
}

function buildTable(items) {
  if (!items.length) {
    return '<div class="table-empty" style="padding:24px 20px;color:#6e7979">Tidak ada data buku.</div>';
  }

  const start = (state.page - 1) * state.pageSize;
  const rows = items
    .map((item, index) => `<tr>
      <td>${start + index + 1}</td>
      <td><strong>${escapeHtml(item.code)}</strong></td>
      <td><strong>${escapeHtml(item.title)}</strong></td>
      <td>${escapeHtml(item.author)}</td>
      <td>${escapeHtml(item.publisher)}</td>
      <td>${escapeHtml(item.category_name || "-")}</td>
      <td><strong>${escapeHtml(String(item.stock_available))}/${escapeHtml(String(item.stock_total))}</strong></td>
      <td>${statusPill(item.status)}</td>
      <td><div class="actions">
        <button class="row-btn" data-action="edit" data-id="${item.id}" aria-label="Edit buku">✎</button>
        <button class="row-btn" data-action="delete" data-id="${item.id}" aria-label="Nonaktifkan buku">⌫</button>
      </div></td>
    </tr>`)
    .join("");

  return `<table class="data-table">
    <thead><tr>
      <th style="width:72px">NO</th>
      <th style="width:120px">ID BUKU</th>
      <th>JUDUL BUKU</th>
      <th>PENULIS</th>
      <th>PENERBIT</th>
      <th style="width:160px">KATEGORI</th>
      <th style="width:100px">STOK</th>
      <th style="width:120px">STATUS</th>
      <th style="width:120px">AKSI</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildPagination(total) {
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  const current = Math.min(Math.max(state.page, 1), totalPages);
  const start = total === 0 ? 0 : (current - 1) * state.pageSize + 1;
  const end = Math.min(total, current * state.pageSize);

  return `<div class="pagination">
    <span>Menampilkan ${start} sampai ${end} dari ${total} data</span>
    <div class="pages">
      <button class="page-btn" data-page="prev" ${current <= 1 ? "disabled" : ""}>‹</button>
      ${Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => `<button class="page-btn ${page === current ? "active" : ""}" data-page="${page}">${page}</button>`).join("")}
      <button class="page-btn" data-page="next" ${current >= totalPages ? "disabled" : ""}>›</button>
    </div>
  </div>`;
}

function activeCategories() {
  return state.categories.filter((category) => category.status === "aktif");
}

function buildCategoryOptions(selectedId = 0) {
  const options = activeCategories();
  if (!options.length) {
    return '<option value="">Tidak ada kategori aktif</option>';
  }

  return ['<option value="">Pilih kategori</option>']
    .concat(
      options.map(
        (category) =>
          `<option value="${category.id}" ${Number(selectedId) === Number(category.id) ? "selected" : ""}>${escapeHtml(category.code)} - ${escapeHtml(category.name)}</option>`,
      ),
    )
    .join("");
}

function buildFilterLayer() {
  return `<div class="filter-popover" id="book-filter-layer" hidden>
    <div class="filter-card">
      <div class="modal-head">
        <h3>Filter Status</h3>
        <button class="modal-close" type="button" data-filter-close>×</button>
      </div>
      <form class="modal-body" data-filter-form>
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

function buildBookModal(book = null) {
  const isEdit = Boolean(book);
  const selectedCategory = activeCategories().some((category) => Number(category.id) === Number(book?.category_id))
    ? Number(book?.category_id || 0)
    : 0;
  const selectedStatus = book?.status || "aktif";

  return `<div class="modal-layer">
    <div class="modal" style="width:min(760px, calc(100vw - 32px))">
      <div class="modal-head">
        <h3>${isEdit ? "Edit Buku" : "Form Tambah Buku Baru"}</h3>
        <button class="modal-close" type="button">×</button>
      </div>
      <form class="modal-body" data-book-form style="gap:16px">
        <input type="hidden" name="id" value="${escapeHtml(book?.id || "")}" />
        <p style="margin:0;color:#6e7979;font-size:12px;line-height:16px">Masukkan informasi katalog lengkap sesuai buku fisik</p>
        <div class="login-alert" data-book-alert hidden></div>
        <div class="field full">
          <label>KATEGORI BUKU *</label>
          <select class="input" name="category_id" required>
            ${buildCategoryOptions(selectedCategory)}
          </select>
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
          <button class="btn" type="button" data-modal-cancel>BATAL</button>
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
    ? `<div class="analytics-grid">
        ${stat("TOTAL KOLEKSI", "-", "Memuat data...", "▥", "teal")}
        ${stat("BUKU AKTIF", "-", "Memuat data...", "✓", "blue")}
        ${stat("STOK MENIPIS", "-", "Memuat data...", "△", "amber")}
        ${stat("STOK HABIS", "-", "Memuat data...", "⊘", "red")}
      </div>`
    : state.error
      ? `<div class="analytics-grid">
          ${stat("TOTAL KOLEKSI", "-", "Tidak dapat dimuat", "▥", "teal")}
          ${stat("BUKU AKTIF", "-", "Tidak dapat dimuat", "✓", "blue")}
          ${stat("STOK MENIPIS", "-", "Tidak dapat dimuat", "△", "amber")}
          ${stat("STOK HABIS", "-", "Tidak dapat dimuat", "⊘", "red")}
        </div>`
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
              <label class="search">
                <span>⌕</span>
                <input class="search-field" id="book-search" type="search" placeholder="Cari buku..." value="${escapeHtml(state.query)}" />
              </label>
              <button class="btn" type="button" id="open-book-filter">☰</button>
            </div>
          </div>
          ${buildFilterLayer()}
          <div id="book-table-wrap">${buildTable(pageItems)}</div>
          <div id="book-pagination-wrap">${buildPagination(items.length)}</div>
        </section>`;

  renderDocument(
    "Daftar Katalog Buku",
    renderAdminShell("books", "Daftar Katalog Buku", `<div id="book-stats">${stats}</div>${panelContent}`),
  );
  bindHandlers();
  bindTableHandlers();
}

function openBookModal(book = null) {
  if (document.querySelector(".modal-layer")) return;
  const isEdit = Boolean(book);
  document.body.insertAdjacentHTML("beforeend", buildBookModal(book));

  const layer = document.querySelector(".modal-layer");
  const form = layer?.querySelector("[data-book-form]");
  const closeButton = layer?.querySelector(".modal-close");
  const cancelButton = layer?.querySelector("[data-modal-cancel]");
  const alertBox = layer?.querySelector("[data-book-alert]");

  const closeModal = () => {
    document.removeEventListener("keydown", onKeyDown);
    layer?.remove();
  };

  const onKeyDown = (event) => {
    if (event.key === "Escape") closeModal();
  };

  document.addEventListener("keydown", onKeyDown);
  layer?.addEventListener("click", (event) => {
    if (event.target === layer) closeModal();
  });
  closeButton?.addEventListener("click", closeModal);
  cancelButton?.addEventListener("click", closeModal);

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!alertBox) return;

    const formData = new FormData(form);
    const payload = {
      id: Number(formData.get("id") || 0),
      category_id: Number(formData.get("category_id") || 0),
      title: String(formData.get("title") || "").trim(),
      author: String(formData.get("author") || "").trim(),
      publisher: String(formData.get("publisher") || "").trim(),
      publication_year: String(formData.get("publication_year") || "").trim(),
      isbn: String(formData.get("isbn") || "").trim(),
      edition: String(formData.get("edition") || "").trim(),
      language: String(formData.get("language") || "").trim(),
      shelf_location: String(formData.get("shelf_location") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      stock_total: Number(formData.get("stock_total") || 0),
      stock_available: formData.get("stock_available") === "" ? "" : Number(formData.get("stock_available") || 0),
      status: String(formData.get("status") || "aktif").trim(),
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
    await apiFetch("/api/books", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
    await loadBooks();
  } catch (error) {
    window.alert(error?.payload?.message || error?.message || "Gagal menonaktifkan buku.");
  }
}

function bindHandlers() {
  document.getElementById("open-book-modal")?.addEventListener("click", () => openBookModal());
  document.getElementById("open-book-filter")?.addEventListener("click", () => {\n    const filterLayer = document.getElementById("book-filter-layer");\n    const filterStatus = filterLayer?.querySelector("[data-filter-status]");\n    if (!filterLayer) return;\n\n    filterLayer.hidden = !filterLayer.hidden;\n    if (filterStatus) filterStatus.value = state.filters.status;\n  });\n\n  document.getElementById("book-search")?.addEventListener("input", (event) => {\n    state.query = String(event.target.value || "");\n    state.page = 1;\n    updateBookView();\n  });\n\n  const filterLayer = document.getElementById("book-filter-layer");\n  const filterForm = filterLayer?.querySelector("[data-filter-form]");\n  const filterClose = filterLayer?.querySelector("[data-filter-close]");\n  const filterReset = filterLayer?.querySelector("[data-filter-reset]");\n\n  const closeFilter = () => {\n    if (!filterLayer) return;\n    filterLayer.hidden = true;\n  };\n\n  filterClose?.addEventListener("click", closeFilter);\n\n  filterReset?.addEventListener("click", () => {\n    state.filters.status = "all";\n    if (filterForm) {\n      filterForm.reset();\n      const statusSelect = filterForm.querySelector("[data-filter-status]");\n      if (statusSelect) statusSelect.value = "all";\n    }\n    state.page = 1;\n    updateBookView();\n  });\n\n  filterForm?.addEventListener("submit", (event) => {\n    event.preventDefault();\n    const formData = new FormData(filterForm);\n    state.filters.status = String(formData.get("status") || "all");\n    state.page = 1;\n    closeFilter();\n    updateBookView();\n  });\n}\n\nfunction bindTableHandlers() {\n  document.querySelectorAll(\"[data-action='edit']\").forEach((button) => {\n    button.addEventListener(\"click\", () => {\n      const id = Number(button.getAttribute(\"data-id\") || 0);\n      const book = state.items.find((item) => item.id === id);\n      if (book) openBookModal(book);\n    });\n  });\n\n  document.querySelectorAll(\"[data-action='delete']\").forEach((button) => {\n    button.addEventListener(\"click\", () => {\n      const id = Number(button.getAttribute(\"data-id\") || 0);\n      if (id > 0) deleteBook(id);\n    });\n  });\n\n  document.querySelectorAll(\".page-btn[data-page]\").forEach((button) => {\n    button.addEventListener(\"click\", () => {\n      const target = button.getAttribute(\"data-page\");\n      const totalPages = Math.max(1, Math.ceil(filteredItems().length / state.pageSize));\n      if (target === \"prev\") {\n        state.page = Math.max(1, state.page - 1);\n      } else if (target === \"next\") {\n        state.page = Math.min(totalPages, state.page + 1);\n      } else {\n        state.page = Math.max(1, Math.min(totalPages, Number(target)));\n      }\n      updateBookView();\n    });\n  });\n}\n\nfunction updateBookView() {\n  const items = filteredItems();\n  const pageItems = visibleItems(items);\n  const statsWrap = document.getElementById(\"book-stats\");\n  const tableWrap = document.getElementById(\"book-table-wrap\");\n  const paginationWrap = document.getElementById(\"book-pagination-wrap\");\n  const totalBadge = document.querySelector(\"[data-book-total]\");\n\n  if (statsWrap) statsWrap.innerHTML = buildStats();\n  if (tableWrap) tableWrap.innerHTML = buildTable(pageItems);\n  if (paginationWrap) paginationWrap.innerHTML = buildPagination(items.length);\n  if (totalBadge) totalBadge.textContent = `${state.summary.total} TOTAL`;\n  bindTableHandlers();\n}\n\nasync function loadBooks() {\n  state.loading = true;\n  state.error = \"\";\n  renderShell();\n\n  try {\n    const [booksResponse, categoriesResponse] = await Promise.all([apiFetch(\"/api/books\"), apiFetch(\"/api/categories\")]);\n    const booksPayload = booksResponse?.data || {};\n    const categoriesPayload = categoriesResponse?.data || {};\n\n    state.items = Array.isArray(booksPayload.items) ? booksPayload.items : [];\n    state.categories = Array.isArray(categoriesPayload.items) ? categoriesPayload.items : [];\n    state.summary = {\n      total: Number(booksPayload.summary?.total ?? state.items.length),\n      active: Number(booksPayload.summary?.active ?? 0),\n      low_stock: Number(booksPayload.summary?.low_stock ?? 0),\n      empty_stock: Number(booksPayload.summary?.empty_stock ?? 0),\n    };\n    state.page = 1;\n  } catch (error) {\n    state.error = error?.payload?.message || error?.message || \"Gagal memuat buku.\";\n  } finally {\n    state.loading = false;\n    renderShell();\n  }\n}\n\nrenderShell();\nloadBooks();\n*** End Patch"}]}ற்குassistant to=functions.apply_patch code
