import { apiFetch } from "../shared/api.js";
import { escapeHtml, field, renderDocument, renderLabelHtml, stat } from "../shared/components.js?v=20260727";
import { renderAdminShell } from "../shared/layout-admin.js";

const state = {
  items: [],
  summary: { total: 0, active: 0, inactive: 0, new_this_month: 0 },
  query: "",
  filters: { status: "all", gender: "all" },
  page: 1,
  pageSize: 5,
  loading: true,
  error: "",
};

let searchTimer = null;

const genderOptions = [
  { value: "laki-laki", label: "Laki-laki" },
  { value: "perempuan", label: "Perempuan" },
];

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function calculateAge(value) {
  if (!value) return "-";
  const birth = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return "-";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return String(Math.max(age, 0));
}

function genderLabel(value) {
  if (value === "laki-laki") return "Laki-laki";
  if (value === "perempuan") return "Perempuan";
  return "-";
}

function statusPill(status) {
  return status === "aktif" ? '<span class="pill green">Aktif</span>' : '<span class="pill red">Nonaktif</span>';
}

function filteredItems() {
  return state.items;
}

function visibleItems(items) {
  return items.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
}

function buildStats() {
  return `<div class="stats-4">
    ${stat("TOTAL ANGGOTA", String(state.summary.total), "Terdaftar di database", "👥", "teal", `${state.summary.total} TOTAL`)}
    ${stat("AKTIF", String(state.summary.active), "Siap diproses sirkulasi", "◌", "blue", "AKTIF")}
    ${stat("NONAKTIF", String(state.summary.inactive), "Tidak dapat dipinjamkan", "⊘", "red", "NONAKTIF")}
    ${stat("BARU BULAN INI", String(state.summary.new_this_month), "Pendaftar terbaru", "↺", "green", "BARU")}
  </div>`;
}

function buildFilterLayer() {
  return `<div class="filter-popover" id="member-filter-layer" hidden>
    <div class="filter-card">
      <div class="modal-head">
        <h3>Filter Anggota</h3>
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
        <div class="field">
          <label>JENIS KELAMIN</label>
          <select class="input" name="gender" data-filter-gender>
            <option value="all">Semua jenis kelamin</option>
            ${genderOptions.map((option) => `<option value="${option.value}">${option.label}</option>`).join("")}
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

function buildTable(items) {
  if (!items.length) {
    return '<div class="table-empty" style="padding:24px 20px;color:#6e7979">Tidak ada data anggota.</div>';
  }

  const start = (state.page - 1) * state.pageSize;
  const rows = items
    .map(
      (item, index) => `<tr>
        <td>${start + index + 1}</td>
        <td><strong>${escapeHtml(item.member_code)}</strong></td>
        <td><strong>${escapeHtml(item.full_name)}</strong></td>
        <td>${escapeHtml(formatDate(item.birth_date))}</td>
        <td>${escapeHtml(calculateAge(item.birth_date))}</td>
        <td>${escapeHtml(genderLabel(item.gender))}</td>
        <td>${escapeHtml(item.city || item.address || "-")}</td>
        <td>${statusPill(item.status)}</td>
        <td><div class="actions">
          <button class="row-btn" data-action="edit" data-id="${item.id}" aria-label="Edit anggota">✎</button>
          <button class="row-btn" data-action="delete" data-id="${item.id}" aria-label="Nonaktifkan anggota">⌫</button>
        </div></td>
      </tr>`,
    )
    .join("");

  return `<table class="data-table">
    <thead><tr>
      <th style="width:64px">NO</th>
      <th style="width:110px">ID ANGGOTA</th>
      <th style="width:180px">NAMA LENGKAP</th>
      <th style="width:120px">TANGGAL LAHIR</th>
      <th style="width:60px">USIA</th>
      <th style="width:120px">JENIS KELAMIN</th>
      <th style="width:180px">ALAMAT SINGKAT</th>
      <th style="width:96px">STATUS</th>
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
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .map((page) => `<button class="page-btn ${page === current ? "active" : ""}" data-page="${page}">${page}</button>`)
    .join("");

  return `<div class="pagination">
    <span>Menampilkan ${start} sampai ${end} dari ${total} data</span>
    <div class="pages">
      <button class="page-btn" data-page="prev" ${current <= 1 ? "disabled" : ""}>‹</button>
      ${pages}
      <button class="page-btn" data-page="next" ${current >= totalPages ? "disabled" : ""}>›</button>
    </div>
  </div>`;
}

function buildMemberQuery() {
  const params = new URLSearchParams();
  const query = state.query.trim();

  if (query !== "") {
    params.set("q", query);
  }

  if (state.filters.status !== "all") {
    params.set("status", state.filters.status);
  }

  if (state.filters.gender !== "all") {
    params.set("gender", state.filters.gender);
  }

  return params.toString();
}

function selectField(label, name, value, options, opts = {}) {
  return `<div class="field ${opts.full ? "full" : ""}">
    <label>${renderLabelHtml(label)}</label>
    <select class="input" name="${escapeHtml(name)}" ${opts.required ? "required" : ""}>
      ${options
        .map((option) => `<option value="${escapeHtml(option.value)}"${option.value === value ? " selected" : ""}>${escapeHtml(option.label)}</option>`)
        .join("")}
    </select>
  </div>`;
}

function memberModal(member = null, mode = member ? "edit" : "create") {
  const isEdit = mode === "edit";
  const title = isEdit ? "Edit Anggota" : "Daftar Anggota Baru";
  const subtitle = isEdit
    ? "Perbarui data anggota yang sudah tersimpan di database."
    : "Lengkapi data diri calon anggota perpustakaan.";
  const submitLabel = isEdit ? "Simpan Perubahan" : "Simpan Data";
  const codeField = isEdit
    ? `<div class="field full">
        <label>KODE ANGGOTA</label>
        <input class="input" type="text" value="${escapeHtml(member?.member_code || "Otomatis saat disimpan")}" readonly />
      </div>`
    : '<input type="hidden" name="member_code" value="" />';
  const statusField = isEdit
    ? `${selectField("STATUS", "status", member?.status || "aktif", [
        { value: "aktif", label: "Aktif" },
        { value: "nonaktif", label: "Nonaktif" },
      ], { full: true })}`
    : '<input type="hidden" name="status" value="aktif" />';
  return `<div class="modal-layer">
    <div class="modal modal-xl">
      <div class="modal-head">
        <h3>${title}</h3>
        <button class="modal-close" type="button">×</button>
      </div>
      <form class="modal-body" data-member-form style="gap:16px">
        <input type="hidden" name="id" value="${escapeHtml(member?.id || "")}" />
        <p style="margin:0;color:#6e7979;font-size:12px;line-height:16px">${subtitle}</p>
        <div class="login-alert" data-member-alert hidden></div>
        ${codeField}
        ${field("NAMA LENGKAP", member?.full_name || "", { name: "full_name", placeholder: "Masukkan nama sesuai KTP", full: true })}
        <div class="split" style="gap:16px">
          ${field("NIK (NOMOR INDUK KEPENDUDUKAN)", member?.nik || "", { name: "nik", placeholder: "Masukkan 16 digit NIK" })}
          ${field("TANGGAL LAHIR", member?.birth_date || "", { name: "birth_date", type: "date" })}
        </div>
        <div class="split" style="gap:16px">
          ${selectField("JENIS KELAMIN *", "gender", member?.gender || "laki-laki", genderOptions, { required: true })}
          ${field("NOMOR TELEPON", member?.phone || "", { name: "phone", placeholder: "Masukkan nomor telepon aktif" })}
        </div>
        ${field("ALAMAT LENGKAP", member?.address || "", { name: "address", textarea: true, full: true, placeholder: "Masukkan alamat domisili saat ini...", rows: 4 })}
        ${statusField}
        <div class="form-actions">
          <button class="btn primary" type="submit">${submitLabel}</button>
        </div>
      </form>
    </div>
  </div>`;
}

function renderShell() {
  const items = filteredItems();
  const pageItems = visibleItems(items);
  const stats = state.loading
    ? `<div class="stats-4">
        ${stat("TOTAL ANGGOTA", "-", "Memuat data...", "👥", "teal")}
        ${stat("AKTIF", "-", "Memuat data...", "◌", "blue")}
        ${stat("NONAKTIF", "-", "Memuat data...", "⊘", "red")}
        ${stat("BARU BULAN INI", "-", "Memuat data...", "↺", "green")}
      </div>`
    : state.error
      ? `<div class="stats-4">
          ${stat("TOTAL ANGGOTA", "-", "Tidak dapat dimuat", "👥", "teal")}
          ${stat("AKTIF", "-", "Tidak dapat dimuat", "◌", "blue")}
          ${stat("NONAKTIF", "-", "Tidak dapat dimuat", "⊘", "red")}
          ${stat("BARU BULAN INI", "-", "Tidak dapat dimuat", "↺", "green")}
        </div>`
      : buildStats();

  const panelContent = state.loading
    ? '<section class="panel" id="member-panel"><div style="padding:24px 20px;color:#6e7979">Memuat anggota...</div></section>'
    : state.error
      ? `<section class="panel" id="member-panel"><div style="padding:24px 20px;color:#ba1a1a">${escapeHtml(state.error)}</div></section>`
      : `<section class="panel" id="member-panel">
          <div class="panel-toolbar">
            <div class="panel-title-wrap">
              <h2 class="panel-title">Daftar Anggota</h2>
              <span class="pill teal" data-member-total>${state.summary.total} TOTAL</span>
            </div>
            <div class="toolbar-actions">
              <button class="btn primary" type="button" id="open-member-create">＋ Tambah Anggota</button>
              <label class="search">
                <span>⌕</span>
                <input class="search-field" id="member-search" type="search" placeholder="Cari nama atau ID..." value="${escapeHtml(state.query)}" />
              </label>
              <button class="btn" type="button" id="open-member-filter">Filter</button>
            </div>
          </div>
          ${buildFilterLayer()}
          <div id="member-table-wrap">${buildTable(pageItems)}</div>
          <div id="member-pagination-wrap">${buildPagination(items.length)}</div>
        </section>`;

  renderDocument(
    "Data Anggota",
    renderAdminShell(
      "members",
      "Data Anggota",
      `<div class="hero-row">
        <div>
          <p class="eyebrow">LIBRARY EIS BALANGAN</p>
          <h1 class="page-title">Data Anggota</h1>
          <p class="page-copy">Kelola dan pantau informasi keanggotaan perpustakaan yang tersimpan di database.</p>
        </div>
      </div>
      <div id="member-stats">${stats}</div>
      ${panelContent}`,
    ),
  );

  bindHandlers();
  bindTableHandlers();
}

function openMemberModal(member = null) {
  if (document.querySelector(".modal-layer")) return;
  const isEdit = Boolean(member);
  document.body.insertAdjacentHTML("beforeend", memberModal(member, isEdit ? "edit" : "create"));

  const layer = document.querySelector(".modal-layer");
  const form = layer?.querySelector("[data-member-form]");
  const closeButton = layer?.querySelector(".modal-close");
  const alertBox = layer?.querySelector("[data-member-alert]");

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
      full_name: String(data.get("full_name") || "").trim(),
      nik: String(data.get("nik") || "").trim(),
      birth_date: String(data.get("birth_date") || "").trim(),
      gender: String(data.get("gender") || "").trim(),
      address: String(data.get("address") || "").trim(),
      city: String(data.get("city") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      email: String(data.get("email") || "").trim(),
      status: String(data.get("status") || "aktif").trim(),
    };

    if (!payload.full_name || !payload.gender) {
      alertBox.hidden = false;
      alertBox.dataset.type = "error";
      alertBox.textContent = "Nama lengkap dan jenis kelamin wajib diisi.";
      return;
    }

    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Menyimpan...";
    }

    try {
      await apiFetch("/api/members", {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      closeModal();
      await loadMembers();
    } catch (error) {
      alertBox.hidden = false;
      alertBox.dataset.type = "error";
      alertBox.textContent = error?.payload?.message || error?.message || "Gagal menyimpan anggota.";
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = isEdit ? "SIMPAN PERUBAHAN" : "SIMPAN ANGGOTA";
      }
    }
  });
}

async function deleteMember(id) {
  if (!window.confirm("Yakin ingin menonaktifkan anggota ini?")) return;
  try {
    await apiFetch("/api/members", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
    await loadMembers();
  } catch (error) {
    window.alert(error?.payload?.message || error?.message || "Gagal menonaktifkan anggota.");
  }
}

function bindHandlers() {
  document.getElementById("open-member-create")?.addEventListener("click", () => {
    openMemberModal();
  });

  document.getElementById("open-member-filter")?.addEventListener("click", () => {
    const filterLayer = document.getElementById("member-filter-layer");
    const filterStatus = filterLayer?.querySelector("[data-filter-status]");
    const filterGender = filterLayer?.querySelector("[data-filter-gender]");
    if (!filterLayer) return;

    filterLayer.hidden = !filterLayer.hidden;
    if (filterStatus) filterStatus.value = state.filters.status;
    if (filterGender) filterGender.value = state.filters.gender;
  });

  document.getElementById("member-search")?.addEventListener("input", (event) => {
    state.query = String(event.target.value || "");
    state.page = 1;
    if (searchTimer) {
      window.clearTimeout(searchTimer);
    }
    searchTimer = window.setTimeout(() => {
      loadMembers();
    }, 250);
  });

  const filterLayer = document.getElementById("member-filter-layer");
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
    state.filters.gender = "all";
    if (filterForm) {
      filterForm.reset();
      const statusSelect = filterForm.querySelector("[data-filter-status]");
      const genderSelect = filterForm.querySelector("[data-filter-gender]");
      if (statusSelect) statusSelect.value = "all";
      if (genderSelect) genderSelect.value = "all";
    }
    state.page = 1;
    loadMembers();
  });

  filterForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(filterForm);
    state.filters.status = String(formData.get("status") || "all");
    state.filters.gender = String(formData.get("gender") || "all");
    state.page = 1;
    closeFilter();
    loadMembers();
  });
}

function bindTableHandlers() {
  document.querySelectorAll("[data-action='edit']").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.getAttribute("data-id") || 0);
      const member = state.items.find((item) => item.id === id);
      if (member) openMemberModal(member);
    });
  });

  document.querySelectorAll("[data-action='delete']").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.getAttribute("data-id") || 0);
      if (id > 0) deleteMember(id);
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
      updateMemberView();
    });
  });
}

function updateMemberView() {
  const items = filteredItems();
  const pageItems = visibleItems(items);
  const statsWrap = document.getElementById("member-stats");
  const tableWrap = document.getElementById("member-table-wrap");
  const paginationWrap = document.getElementById("member-pagination-wrap");
  const totalBadge = document.querySelector("[data-member-total]");

  if (statsWrap) statsWrap.innerHTML = buildStats();
  if (tableWrap) tableWrap.innerHTML = buildTable(pageItems);
  if (paginationWrap) paginationWrap.innerHTML = buildPagination(items.length);
  if (totalBadge) totalBadge.textContent = `${state.summary.total} TOTAL`;
  bindTableHandlers();
}

async function loadMembers() {
  const hasMemberPanel = Boolean(document.getElementById("member-panel"));
  state.loading = true;
  state.error = "";
  if (!hasMemberPanel) {
    renderShell();
  }

  try {
    const query = buildMemberQuery();
    const response = await apiFetch(`/api/members${query ? `?${query}` : ""}`);
    const payload = response?.data || {};
    state.items = Array.isArray(payload.items) ? payload.items : [];
    state.summary = {
      total: Number(payload.summary?.total ?? state.items.length),
      active: Number(payload.summary?.active ?? 0),
      inactive: Number(payload.summary?.inactive ?? 0),
      new_this_month: Number(payload.summary?.new_this_month ?? 0),
    };
    state.page = 1;
    state.loading = false;
    if (document.getElementById("member-table-wrap")) {
      updateMemberView();
    } else {
      renderShell();
    }
  } catch (error) {
    state.error = error?.payload?.message || error?.message || "Gagal memuat anggota.";
    state.loading = false;
    renderShell();
  }
}

renderShell();
loadMembers();
