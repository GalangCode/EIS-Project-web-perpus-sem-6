import { apiFetch } from "../shared/api.js";
import { escapeHtml, field, renderDocument, renderLabelHtml, stat, dataTable, renderPagination, panel, status } from "../shared/components.js?v=20260728";
import { renderAdminShell } from "../shared/layout-admin.js";
import {
  firstBookError,
  normalizeISBN,
  sanitizeISBNInput,
  validateBookData,
} from "./book-validation.js?v=20260728";

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

function buildSummary(items) {
  const total = items.length;
  const active = items.filter((item) => item.status === "aktif").length;
  const low_stock = items.filter((item) => Number(item.stock_available || 0) > 0 && Number(item.stock_available || 0) <= 3).length;
  const empty_stock = items.filter((item) => Number(item.stock_available || 0) === 0).length;

  return { total, active, low_stock, empty_stock };
}

const BOOK_FIELD_NAMES = [
  "category_id",
  "title",
  "author",
  "publisher",
  "publication_year",
  "isbn",
  "edition",
  "language",
  "shelf_location",
  "status",
  "stock_total",
  "stock_available",
  "description",
];

function bookField(name, label, value = "", opts = {}) {
  return `<div class="book-field" data-book-field="${escapeHtml(name)}">
    ${field(label, value, {
      ...opts,
      name,
      attrs: {
        ...(opts.attrs || {}),
        "data-book-input": name,
      },
    })}
    <p class="field-error" data-error-for="${escapeHtml(name)}" hidden></p>
  </div>`;
}

function readBookForm(form) {
  const data = new FormData(form);
  return {
    category_id: data.get("category_id"),
    title: String(data.get("title") || ""),
    author: String(data.get("author") || ""),
    publisher: String(data.get("publisher") || ""),
    publication_year: String(data.get("publication_year") || ""),
    isbn: normalizeISBN(String(data.get("isbn") || "")),
    edition: String(data.get("edition") || ""),
    language: String(data.get("language") || ""),
    shelf_location: String(data.get("shelf_location") || ""),
    status: String(data.get("status") || ""),
    stock_total: data.get("stock_total"),
    stock_available: data.get("stock_available"),
    description: String(data.get("description") || ""),
  };
}

function getBookValidationState(form) {
  return validateBookData(readBookForm(form));
}

function setFieldError(form, name, message = "") {
  const fieldWrap = form.querySelector(`[data-book-field="${CSS.escape(name)}"]`);
  const innerField = fieldWrap?.querySelector(".field");
  const input = fieldWrap?.querySelector(`[data-book-input="${CSS.escape(name)}"]`);
  const error = fieldWrap?.querySelector(`[data-error-for="${CSS.escape(name)}"]`);

  if (fieldWrap) {
    fieldWrap.classList.toggle("has-error", Boolean(message));
  }

  if (innerField) {
    innerField.classList.toggle("has-error", Boolean(message));
  }

  if (input) {
    input.classList.toggle("is-invalid", Boolean(message));
    input.setAttribute("aria-invalid", message ? "true" : "false");
  }

  if (error) {
    error.textContent = message;
    error.hidden = !message;
  }
}

function setBookErrors(form, errors = {}) {
  BOOK_FIELD_NAMES.forEach((name) => {
    setFieldError(form, name, errors?.[name] || "");
  });
}

function clearBookErrors(form) {
  setBookErrors(form, {});
}

function syncBookFieldErrors(form, changedName) {
  const validation = getBookValidationState(form);
  const names =
    changedName === "stock_total"
      ? ["stock_total", "stock_available"]
      : changedName === "stock_available"
        ? ["stock_available", "stock_total"]
        : [changedName];

  names.forEach((name) => setFieldError(form, name, validation.errors?.[name] || ""));
  return validation;
}

function createBookToast(message, tone = "success") {
  const toast = document.createElement("div");
  toast.className = "book-toast";
  toast.dataset.tone = tone;
  toast.textContent = message;
  document.body.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 2800);
}

function setAlertBox(alertBox, message = "", tone = "error") {
  if (!alertBox) return;
  if (message) {
    alertBox.dataset.type = tone;
    alertBox.textContent = message;
    alertBox.hidden = false;
  } else {
    alertBox.hidden = true;
    alertBox.textContent = "";
    delete alertBox.dataset.type;
  }
}

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
  return dataTable(
    [
      { text: "NO", width: "72px" },
      { text: "ID BUKU", width: "114px" },
      { text: "JUDUL BUKU", width: "210px" },
      { text: "PENULIS", width: "160px" },
      { text: "PENERBIT", width: "160px" },
      { text: "TAHUN", width: "78px" },
      { text: "KATEGORI", width: "148px" },
      { text: "STOK", width: "92px" },
      { text: "STATUS", width: "104px" }
    ],
    items.map((item, index) => [
      (state.page - 1) * state.pageSize + index + 1,
      item.code,
      item.title,
      item.author,
      item.publisher,
      item.publication_year || "-",
      item.category_name || "-",
      stockPill(item.stock_available, item.stock_total),
      item.status
    ]),
    {
      emptyText: "Tidak ada data buku.",
      actionsWidth: "104px",
      actions: (row, index) => {
        const item = items[index];
        return `<div class="actions">
          <button class="row-btn" data-action="edit" data-id="${item.id}" aria-label="Edit buku">✎</button>
          <button class="row-btn" data-action="delete" data-id="${item.id}" aria-label="Hapus buku">⌫</button>
        </div>`;
      },
      cellRenderer: (cell, colIndex) => {
        if (colIndex === 7) return cell;
        const str = String(cell === null || cell === undefined ? "" : cell);
        const isCode = str.startsWith("BK-") || str.startsWith("KAT-") || str.startsWith("TRX-") || str.startsWith("ANG-");
        if (colIndex === 0 || colIndex === 1 || isCode) {
          return `<strong>${escapeHtml(str)}</strong>`;
        }
        return status(str);
      }
    }
  );
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

function buildBookModal(book = null) {
  const isEdit = Boolean(book);
  const selectedStatus = book?.status || "aktif";
  const selectedCategory = activeCategories().some((category) => Number(category.id) === Number(book?.category_id)) ? Number(book?.category_id || 0) : 0;
  const currentYear = new Date().getFullYear();

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
        <div class="book-field" data-book-field="category_id">
          <div class="field full">
            <label>${renderLabelHtml("KATEGORI BUKU *")}</label>
            <select class="input" name="category_id" data-book-input="category_id" required>
              <option value="">Pilih kategori</option>
              ${activeCategories()
                .map(
                  (category) =>
                    `<option value="${category.id}" ${Number(selectedCategory) === Number(category.id) ? "selected" : ""}>${escapeHtml(category.code)} - ${escapeHtml(category.name)}</option>`,
                )
                .join("")}
            </select>
          </div>
          <p class="field-error" data-error-for="category_id" hidden></p>
        </div>
        ${bookField("title", "JUDUL BUKU *", book?.title || "", {
          placeholder: "Contoh: Belajar Pemrograman Web",
          full: true,
          attrs: { required: true, maxlength: 255, autocomplete: "off" },
        })}
        <div class="split" style="gap:16px">
          ${bookField("author", "PENULIS *", book?.author || "", {
            placeholder: "Nama penulis",
            attrs: { required: true, maxlength: 150, autocomplete: "off" },
          })}
          ${bookField("publisher", "PENERBIT *", book?.publisher || "", {
            placeholder: "Nama penerbit",
            attrs: { required: true, maxlength: 150, autocomplete: "off" },
          })}
        </div>
        <div class="split" style="gap:16px">
          ${bookField("publication_year", "TAHUN TERBIT *", book?.publication_year || "", {
            placeholder: String(currentYear),
            attrs: {
              type: "number",
              required: true,
              min: 1900,
              max: currentYear,
              inputmode: "numeric",
            },
          })}
          ${bookField("isbn", "ISBN *", book?.isbn || "", {
            placeholder: "978-602-03-2190-2",
            attrs: {
              type: "text",
              required: true,
              autocomplete: "off",
              spellcheck: "false",
              maxlength: 20,
              inputmode: "text",
              autocapitalize: "characters",
            },
          })}
        </div>
        <div class="split" style="gap:16px">
          ${bookField("edition", "EDISI", book?.edition || "", {
            placeholder: "Edisi 1",
            attrs: { maxlength: 30, autocomplete: "off" },
          })}
          ${bookField("language", "BAHASA *", book?.language || "", {
            placeholder: "Indonesia",
            attrs: { required: true, maxlength: 50, autocomplete: "off" },
          })}
        </div>
        <div class="split" style="gap:16px">
          ${bookField("shelf_location", "LOKASI RAK *", book?.shelf_location || "", {
            placeholder: "Rak A-1",
            attrs: { required: true, maxlength: 20, autocomplete: "off" },
          })}
          <div class="book-field" data-book-field="status">
            <div class="field">
              <label>${renderLabelHtml("STATUS BUKU *")}</label>
              <select class="input" name="status" data-book-input="status" required>
                <option value="aktif" ${selectedStatus === "aktif" ? "selected" : ""}>Aktif</option>
                <option value="nonaktif" ${selectedStatus === "nonaktif" ? "selected" : ""}>Nonaktif</option>
              </select>
            </div>
            <p class="field-error" data-error-for="status" hidden></p>
          </div>
        </div>
        <div class="split" style="gap:16px">
          ${bookField("stock_total", "STOK TOTAL *", String(book?.stock_total ?? 0), {
            placeholder: "1",
            attrs: { type: "number", required: true, min: 0, step: 1, inputmode: "numeric" },
          })}
          ${bookField("stock_available", "STOK TERSEDIA *", String(book?.stock_available ?? book?.stock_total ?? 0), {
            placeholder: "1",
            attrs: { type: "number", required: true, min: 0, step: 1, inputmode: "numeric" },
          })}
        </div>
        ${bookField("description", "DESKRIPSI", book?.description || "", {
          textarea: true,
          rows: 5,
          placeholder: "Tuliskan deskripsi singkat buku...",
          attrs: { maxlength: 1000 },
        })}
        <div class="form-actions">
          <button class="btn primary" type="submit" data-book-submit>${isEdit ? "SIMPAN PERUBAHAN" : "SIMPAN BUKU"}</button>
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
          <div id="book-pagination-wrap">${renderPagination(items.length, state.page, state.pageSize)}</div>
        </section>`;

  renderDocument("Daftar Katalog Buku", renderAdminShell("books", "Daftar Katalog Buku", `<div id="book-stats">${stats}</div>${panelContent}`));
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
  const alertBox = layer?.querySelector("[data-book-alert]");
  const submitButton = layer?.querySelector("[data-book-submit]");

  const closeModal = () => {
    layer?.remove();
  };

  closeButton?.addEventListener("click", closeModal);

  form?.querySelectorAll("[data-book-input]").forEach((input) => {
    const handleValidation = (event) => {
      const target = event.currentTarget;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
        return;
      }

      if (target.name === "isbn") {
        const sanitized = sanitizeISBNInput(target.value);
        if (sanitized !== target.value) {
          target.value = sanitized;
        }
      }

      syncBookFieldErrors(form, target.name);
    };

    input.addEventListener("input", handleValidation);
    input.addEventListener("change", handleValidation);
    input.addEventListener("blur", (event) => {
      const target = event.currentTarget;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
        return;
      }

      if (target.name === "isbn") {
        target.value = sanitizeISBNInput(target.value);
      }

      syncBookFieldErrors(form, target.name);
    });
  });

  clearBookErrors(form);
  setAlertBox(alertBox, "");

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!alertBox || !submitButton) return;

    const validation = validateBookData(readBookForm(form));
    setBookErrors(form, validation.errors);

    if (!validation.valid) {
      setAlertBox(alertBox, firstBookError(validation.errors), "error");
      return;
    }

    const formData = new FormData(form);
    const payload = {
      id: Number(formData.get("id") || 0),
      ...validation.data,
    };

    submitButton.disabled = true;
    submitButton.setAttribute("aria-busy", "true");
    submitButton.textContent = "Menyimpan...";

    try {
      await apiFetch("/api/books", {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      createBookToast(isEdit ? "Buku berhasil diperbarui." : "Buku berhasil ditambahkan.", "success");
      closeModal();
      await loadBooks();
    } catch (error) {
      const responseErrors = error?.payload?.errors;
      if (responseErrors) {
        setBookErrors(form, responseErrors);
      }

      const message = error?.payload?.message || error?.message || "Gagal menyimpan buku.";
      setAlertBox(alertBox, message, "error");
      createBookToast(message, "error");
    } finally {
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
      submitButton.textContent = isEdit ? "SIMPAN PERUBAHAN" : "SIMPAN BUKU";
    }
  });
}

function deleteBook(id) {
  if (!window.confirm("Yakin ingin menghapus buku ini dari database?")) return;

  apiFetch("/api/books", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  })
    .then(async () => {
      createBookToast("Buku berhasil dihapus.", "success");
      await loadBooks();
    })
    .catch((error) => {
      const message = error?.payload?.message || error?.message || "Gagal menghapus buku.";
      createBookToast(message, "error");
      window.alert(message);
    });
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
  if (paginationWrap) paginationWrap.innerHTML = renderPagination(items.length, state.page, state.pageSize);
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
    state.summary = buildSummary(state.items);
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
