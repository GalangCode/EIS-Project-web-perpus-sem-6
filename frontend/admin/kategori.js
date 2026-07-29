/*
import { dataTable, field, panel, renderDocument, stat } from "../shared/components.js";
import { renderAdminShell } from "../shared/layout-admin.js";

const categoryRows = [
  ["1", "KAT-001", "Teknologi", "Buku teknologi, komputer, dan informasi", "Aktif"],
  ["2", "KAT-002", "Sastra", "Novel, puisi, dan karya sastra", "Aktif"],
  ["3", "KAT-003", "Sejarah", "Buku sejarah lokal dan nasional", "Aktif"],
  ["4", "KAT-004", "Pendidikan", "Referensi belajar dan pengajaran", "Aktif"],
  ["5", "KAT-005", "Arsip Lama", "Kategori koleksi nonaktif", "Nonaktif"],
];

function categoryModal() {
  return `<div class="modal-layer">
    <div class="modal">
      <div class="modal-head">
        <h3>Tambah Kategori Baru</h3>
        <button class="modal-close">×</button>
      </div>
      <div class="modal-body">
        <div class="info-box">
          <span>ⓘ</span>
          <div><strong>ID KATEGORI OTOMATIS</strong>Sistem akan secara otomatis membuat ID kategori (ex: KAT-025) setelah disimpan.</div>
        </div>
        ${field("NAMA KATEGORI *", "", { placeholder: "Masukkan nama kategori (mis: Fiksi)" })}
        ${field("DESKRIPSI SINGKAT", "", { textarea: true, placeholder: "Tuliskan deskripsi singkat mengenai kategori ini..." })}
        <div class="field"><label>STATUS KATEGORI</label><div class="radio-row"><span><i class="radio on"></i>Aktif</span><span><i class="radio"></i>Nonaktif</span></div></div>
      </div>
      <div class="modal-foot"><button class="btn">BATAL</button><button class="btn primary">SIMPAN KATEGORI</button></div>
    </div>
  </div>`;
}
*/

import { apiFetch } from "../shared/api.js";
import { escapeHtml, field, renderDocument, stat } from "../shared/components.js?v=20260727";
import { renderAdminShell } from "../shared/layout-admin.js";

const state = {
  items: [],
  summary: { total: 0, active: 0, inactive: 0, top_category: null },
  query: "",
  filters: {
    status: "all",
  },
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
      [item.code, item.name, item.description, item.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));

    const statusFilter = state.filters.status;
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;

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

function buildStats(items) {
  const top = state.summary.top_category || items[0] || null;
  const inactivePct = state.summary.total ? ((state.summary.inactive / state.summary.total) * 100).toFixed(1) : "0.0";
  return `<div class="analytics-grid">
    ${stat("TOTAL KATEGORI", String(state.summary.total), "Kategori buku terdaftar", "▤", "teal", `${state.summary.active} AKTIF`)}
    ${stat("KATEGORI TERPOPULER", top?.name || "-", top ? `${top.books_count} buku terdaftar` : "Belum ada data", "★", "blue", "POPULER")}
    ${stat("KATEGORI NONAKTIF", String(state.summary.inactive), `${inactivePct}% dari total kategori`, "⊘", "red", "NONAKTIF")}
  </div>`;
}

function buildTable(items) {
  if (!items.length) {
    return '<div class="table-empty" style="padding:24px 20px;color:#6e7979">Tidak ada data kategori.</div>';
  }

  const rows = items.map((item, index) => `<tr>
    <td>${index + 1}</td>
    <td><strong>${escapeHtml(item.code)}</strong></td>
    <td><strong>${escapeHtml(item.name)}</strong></td>
    <td>${escapeHtml(item.description || "-")}</td>
    <td>${statusPill(item.status)}</td>
    <td><div class="actions">
      <button class="row-btn" data-action="edit" data-id="${item.id}" aria-label="Edit kategori">✎</button>
      <button class="row-btn" data-action="delete" data-id="${item.id}" aria-label="Hapus kategori">⌫</button>
    </div></td>
  </tr>`).join("");

  return `<table class="data-table">
    <thead><tr>
      <th style="width:72px">NO</th>
      <th style="width:128px">ID</th>
      <th>NAMA KATEGORI</th>
      <th>DESKRIPSI</th>
      <th style="width:128px">STATUS</th>
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

function renderShell() {
  const items = filteredItems();
  const pageItems = visibleItems(items);
  const stats = state.loading
    ? `<div class="analytics-grid">
        ${stat("TOTAL KATEGORI", "-", "Memuat data...", "▤", "teal")}
        ${stat("KATEGORI TERPOPULER", "-", "Memuat data...", "★", "blue")}
        ${stat("KATEGORI NONAKTIF", "-", "Memuat data...", "⊘", "red")}
      </div>`
    : state.error
      ? `<div class="analytics-grid">
          ${stat("TOTAL KATEGORI", "-", "Tidak dapat dimuat", "▤", "teal")}
          ${stat("KATEGORI TERPOPULER", "-", "Tidak dapat dimuat", "★", "blue")}
          ${stat("KATEGORI NONAKTIF", "-", "Tidak dapat dimuat", "⊘", "red")}
        </div>`
      : buildStats(items);

  const panelContent = state.loading
    ? '<section class="panel" id="category-panel"><div style="padding:24px 20px;color:#6e7979">Memuat kategori...</div></section>'
    : state.error
      ? `<section class="panel" id="category-panel"><div style="padding:24px 20px;color:#ba1a1a">${escapeHtml(state.error)}</div></section>`
      : `<section class="panel" id="category-panel">
          <div class="panel-toolbar">
            <div class="panel-title-wrap">
              <h2 class="panel-title">Daftar Kategori</h2>
              <span class="pill teal" data-category-total>${state.summary.total} TOTAL</span>
            </div>
            <div class="toolbar-actions">
              <button class="btn primary" id="open-category-modal">＋ TAMBAH KATEGORI</button>
              <label class="search">
                <span>⌕</span>
                <input class="search-field" id="category-search" type="search" placeholder="Cari..." value="${escapeHtml(state.query)}" />
              </label>
              <button class="btn" type="button" id="open-category-filter">☰</button>
            </div>
          </div>
          ${buildFilterLayer()}
          <div id="category-table-wrap">${buildTable(pageItems)}</div>
          <div id="category-pagination-wrap">${buildPagination(items.length)}</div>
        </section>`;

  renderDocument(
    "Manajemen Kategori Buku",
    renderAdminShell(
      "category",
      "Manajemen Kategori Buku",
      `<div id="category-stats">${stats}</div>${panelContent}`,
    ),
  );
  bindHandlers();
  bindTableHandlers();
}

function buildFilterLayer() {
  return `<div class="filter-popover" id="category-filter-layer" hidden>
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

function statusRadioGroup(value = "aktif") {
  const current = String(value || "aktif").toLowerCase() === "nonaktif" ? "nonaktif" : "aktif";
  return `<div class="field full">
    <label>STATUS KATEGORI</label>
    <div class="status-options">
      <label class="status-option">
        <input type="radio" name="status" value="aktif" ${current === "aktif" ? "checked" : ""} />
        <span class="radio" aria-hidden="true"></span>
        <span>Aktif</span>
      </label>
      <label class="status-option">
        <input type="radio" name="status" value="nonaktif" ${current === "nonaktif" ? "checked" : ""} />
        <span class="radio" aria-hidden="true"></span>
        <span>Nonaktif</span>
      </label>
    </div>
  </div>`;
}

function openModal(category = null) {
  if (document.querySelector(".modal-layer")) return;
  const isEdit = Boolean(category);

  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="modal-layer">
      <div class="modal modal-md">
        <div class="modal-head">
          <h3>${isEdit ? "Edit Kategori" : "Tambah Kategori Baru"}</h3>
          <button class="modal-close" type="button">×</button>
        </div>
        <form class="modal-body" data-category-form>
          <input type="hidden" name="id" value="${escapeHtml(category?.id || "")}" />
          <div class="info-box">
            <span>ⓘ</span>
            <div><strong>ID KATEGORI OTOMATIS</strong>${isEdit ? "ID kategori tidak berubah saat edit." : "Sistem akan otomatis membuat ID kategori baru setelah disimpan."}</div>
          </div>
          <div class="login-alert" data-category-alert hidden></div>
          ${field("NAMA KATEGORI *", category?.name || "", { name: "name", placeholder: "Masukkan nama kategori (mis: Fiksi)" })}
          ${field("DESKRIPSI SINGKAT", category?.description || "", { name: "description", textarea: true, full: true, rows: 8, placeholder: "Tuliskan deskripsi singkat mengenai kategori ini..." })}
          ${statusRadioGroup(category?.status || "aktif")}
          <div class="form-actions">
            <button class="btn primary" type="submit">${isEdit ? "SIMPAN PERUBAHAN" : "SIMPAN KATEGORI"}</button>
          </div>
        </form>
      </div>
    </div>`,
  );

  const layer = document.querySelector(".modal-layer");
  const form = layer?.querySelector("[data-category-form]");
  const closeButton = layer?.querySelector(".modal-close");
  const alertBox = layer?.querySelector("[data-category-alert]");

  const closeModal = () => {
    layer?.remove();
  };

  closeButton?.addEventListener("click", closeModal);

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!alertBox) return;

    const formData = new FormData(form);
    const payload = {
      id: Number(formData.get("id") || 0),
      name: String(formData.get("name") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      status: String(formData.get("status") || "aktif").trim(),
    };

    if (!payload.name) {
      alertBox.hidden = false;
      alertBox.dataset.type = "error";
      alertBox.textContent = "Nama kategori wajib diisi.";
      return;
    }

    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Menyimpan...";
    }

    try {
      await apiFetch("/api/categories", {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      closeModal();
      await loadCategories();
    } catch (error) {
      alertBox.hidden = false;
      alertBox.dataset.type = "error";
      alertBox.textContent = error?.payload?.message || error?.message || "Gagal menyimpan kategori.";
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = isEdit ? "SIMPAN PERUBAHAN" : "SIMPAN KATEGORI";
      }
    }
  });
}

async function deleteCategory(id) {
  if (!window.confirm("Yakin ingin menghapus kategori ini secara permanen?")) return;
  try {
    await apiFetch("/api/categories", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
    await loadCategories();
  } catch (error) {
    window.alert(error?.payload?.message || error?.message || "Gagal menghapus kategori.");
  }
}

function bindHandlers() {
  document.getElementById("open-category-modal")?.addEventListener("click", () => openModal());
  document.getElementById("open-category-filter")?.addEventListener("click", openFilterLayer);

  document.getElementById("category-search")?.addEventListener("input", (event) => {
    state.query = String(event.target.value || "");
    state.page = 1;
    updateCategoryView();
  });

  const filterLayer = document.getElementById("category-filter-layer");
  const filterForm = filterLayer?.querySelector("[data-filter-form]");
  const filterClose = filterLayer?.querySelector("[data-filter-close]");
  const filterReset = filterLayer?.querySelector("[data-filter-reset]");

  const closeFilter = () => {
    if (!filterLayer) return;
    filterLayer.hidden = true;
  };

  filterClose?.addEventListener("click", closeFilter);

  filterReset?.addEventListener("click", () => {
    state.filters.status = "all";
    if (filterForm) {
      filterForm.reset();
      const statusSelect = filterForm.querySelector("[data-filter-status]");
      if (statusSelect) statusSelect.value = "all";
    }
    state.page = 1;
    updateCategoryView();
  });

  filterForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(filterForm);
    state.filters.status = String(formData.get("status") || "all");
    state.page = 1;
    closeFilter();
    updateCategoryView();
  });
}

function bindTableHandlers() {
  document.querySelectorAll("[data-action='edit']").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.getAttribute("data-id") || 0);
      const category = state.items.find((item) => item.id === id);
      if (category) openModal(category);
    });
  });

  document.querySelectorAll("[data-action='delete']").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.getAttribute("data-id") || 0);
      if (id > 0) deleteCategory(id);
    });
  });

  document.querySelectorAll(".page-btn[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.getAttribute("data-page");
      const totalPages = Math.max(1, Math.ceil(filteredItems().length / state.pageSize));
      if (target === "prev") {
        state.page = Math.max(1, state.page - 1);
      } else if (target === "next") {
        state.page = Math.min(totalPages, state.page + 1);
      } else {
        state.page = Math.max(1, Math.min(totalPages, Number(target)));
      }
      updateCategoryView();
    });
  });
}

function openFilterLayer() {
  const filterLayer = document.getElementById("category-filter-layer");
  const filterStatus = filterLayer?.querySelector("[data-filter-status]");
  if (!filterLayer) return;

  filterLayer.hidden = !filterLayer.hidden;
  if (filterStatus) filterStatus.value = state.filters.status;
}

function updateCategoryView() {
  const items = filteredItems();
  const pageItems = visibleItems(items);
  const stats = buildStats(items);
  const statsWrap = document.getElementById("category-stats");
  const tableWrap = document.getElementById("category-table-wrap");
  const paginationWrap = document.getElementById("category-pagination-wrap");
  const totalBadge = document.querySelector("[data-category-total]");

  if (statsWrap) statsWrap.innerHTML = stats;
  if (tableWrap) tableWrap.innerHTML = buildTable(pageItems);
  if (paginationWrap) paginationWrap.innerHTML = buildPagination(items.length);
  if (totalBadge) totalBadge.textContent = `${state.summary.total} TOTAL`;
  bindTableHandlers();
}

async function loadCategories() {
  state.loading = true;
  state.error = "";
  renderShell();

  try {
    const response = await apiFetch("/api/categories");
    const payload = response?.data || {};
    state.items = Array.isArray(payload.items) ? payload.items : [];
    state.summary = {
      total: Number(payload.summary?.total ?? state.items.length),
      active: Number(payload.summary?.active ?? 0),
      inactive: Number(payload.summary?.inactive ?? 0),
      top_category: payload.summary?.top_category || null,
    };
    state.page = 1;
  } catch (error) {
    state.error = error?.payload?.message || error?.message || "Gagal memuat kategori.";
  } finally {
    state.loading = false;
    renderShell();
  }
}

renderShell();
loadCategories();

/*
const content = `<div class="analytics-grid">
  ${stat("TOTAL KATEGORI", "24", "Kategori buku terdaftar", "▤", "teal", "+3 bulan ini")}
  ${stat("KATEGORI TERPOPULER", "Teknologi & Komputer", "1,245 buku terdaftar", "★", "blue", "POPULER")}
  ${stat("KATEGORI NONAKTIF", "2", "8.3% dari total kategori", "⊘", "red", "NONAKTIF")}
</div>
${panel(
  "Daftar Kategori",
  "24 TOTAL",
  '<button class="btn primary" id="open-category-modal">＋ TAMBAH KATEGORI</button><div class="search">⌕ <span>Cari...</span></div><button class="btn">☰</button>',
  dataTable(["NO", "ID", "NAMA KATEGORI", "DESKRIPSI", "STATUS"], categoryRows, {
    widths: ["67.6px", "128px", "170px", "344px", "128px"],
    actions: false,
  }),
)}`

renderDocument("Manajemen Kategori Buku", renderAdminShell("category", "Manajemen Kategori Buku", content));

const openButton = document.getElementById("open-category-modal");

if (openButton) {
  openButton.addEventListener("click", () => {
    if (document.querySelector(".modal-layer")) return;
    document.body.insertAdjacentHTML("beforeend", categoryModal());

    const closeModal = () => {
      document.querySelector(".modal-layer")?.remove();
      document.removeEventListener("keydown", onKeyDown);
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") closeModal();
    };

    document.addEventListener("keydown", onKeyDown);

    const layer = document.querySelector(".modal-layer");
    const closeButton = layer?.querySelector(".modal-close");

    layer?.addEventListener("click", (event) => {
      if (event.target === layer) closeModal();
    });

    closeButton?.addEventListener("click", closeModal);
  });
}
*/
