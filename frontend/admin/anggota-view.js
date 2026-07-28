import { apiFetch } from "../shared/api.js";
import { escapeHtml, renderDocument, stat } from "../shared/components.js?v=20260728";
import { renderAdminShell } from "../shared/layout-admin.js";
import {
  attachDateMask,
  clearMemberErrors,
  attachDigitOnlyGuard,
  focusFirstMemberError,
  memberCodeField,
  memberField,
  memberSelectField,
  readMemberForm,
  setMemberErrors,
  setMemberFieldError,
  MEMBER_GENDER_OPTIONS,
  MEMBER_STATUS_OPTIONS,
} from "./member-form.js";
import {
  calculateAge,
  formatBirthDateDisplay,
  sanitizeInput,
  validateMemberData,
  firstMemberError,
  normalizeGenderValue,
  normalizeStatusValue,
} from "./member-validation.js?v=20260728";

const state = {
  items: [],
  summary: { total: 0, active: 0, inactive: 0, new_this_month: 0 },
  query: "",
  filters: { status: "all", gender: "all", age_range: "all" },
  page: 1,
  pageSize: 5,
  loading: true,
  error: "",
};

let searchTimer = null;

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function ageLabel(value) {
  const age = calculateAge(value);
  return age === null ? "-" : String(age);
}

function genderLabel(value) {
  const normalized = normalizeGenderValue(value);
  return normalized || "-";
}

function statusPill(status) {
  const normalized = normalizeStatusValue(status);
  return normalized === "Aktif" ? '<span class="pill green">Aktif</span>' : '<span class="pill red">Nonaktif</span>';
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
            ${MEMBER_STATUS_OPTIONS.map((option) => `<option value="${option.value}">${option.label}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>JENIS KELAMIN</label>
          <select class="input" name="gender" data-filter-gender>
            <option value="all">Semua jenis kelamin</option>
            ${MEMBER_GENDER_OPTIONS.map((option) => `<option value="${option.value}">${option.label}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>RENTANG UMUR</label>
          <select class="input" name="age_range" data-filter-age>
            <option value="all">Semua umur</option>
            <option value="0-17">0-17</option>
            <option value="18-25">18-25</option>
            <option value="26-40">26-40</option>
            <option value="41-60">41-60</option>
            <option value="60+">60+</option>
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
        <td>${escapeHtml(ageLabel(item.birth_date))}</td>
        <td>${escapeHtml(genderLabel(item.gender))}</td>
        <td>${escapeHtml(item.phone || "-")}</td>
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
      <th style="width:110px">KODE</th>
      <th style="width:180px">NAMA LENGKAP</th>
      <th style="width:120px">TANGGAL LAHIR</th>
      <th style="width:60px">USIA</th>
      <th style="width:120px">JENIS KELAMIN</th>
      <th style="width:140px">NOMOR TELEPON</th>
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

  if (state.query.trim() !== "") {
    params.set("q", sanitizeInput(state.query));
  }

  if (state.filters.status !== "all") {
    params.set("status", state.filters.status);
  }

  if (state.filters.gender !== "all") {
    params.set("gender", state.filters.gender);
  }

  if (state.filters.age_range !== "all") {
    params.set("age_range", state.filters.age_range);
  }

  return params.toString();
}

function buildMemberModal(member = null) {
  const isEdit = Boolean(member);
  const submitLabel = isEdit ? "SIMPAN PERUBAHAN" : "SIMPAN ANGGOTA";
  const codeValue = isEdit ? member?.member_code || "" : "Otomatis saat disimpan";

  return `<div class="modal-layer">
    <div class="modal modal-xl">
      <div class="modal-head">
        <h3>${isEdit ? "Edit Anggota" : "Daftar Anggota Baru"}</h3>
        <button class="modal-close" type="button">×</button>
      </div>
      <form class="modal-body" data-member-form style="gap:16px">
        <input type="hidden" name="id" value="${escapeHtml(member?.id || 0)}" />
        <p style="margin:0;color:#6e7979;font-size:12px;line-height:16px">
          ${isEdit ? "Perbarui data anggota yang tersimpan di database." : "Data anggota akan dibuat otomatis oleh backend."}
        </p>
        <div class="login-alert" data-member-alert hidden></div>
        ${memberCodeField(codeValue)}
        ${memberField("full_name", "NAMA LENGKAP *", member?.full_name || "", {
          placeholder: "Masukkan nama sesuai KTP",
          full: true,
          attrs: { required: true, maxlength: 100, autocomplete: "off" },
        })}
        <div class="split" style="gap:16px">
          ${memberField("nik", "NIK *", member?.nik || "", {
            placeholder: "Masukkan 16 digit NIK",
            attrs: { required: true, maxlength: 16, inputmode: "numeric", autocomplete: "off" },
          })}
          ${memberField("birth_date", "TANGGAL LAHIR *", formatBirthDateDisplay(member?.birth_date || ""), {
            placeholder: "dd-mm-yyyy",
            attrs: { required: true, type: "text", maxlength: 10, inputmode: "numeric", autocomplete: "off", title: "Format tanggal lahir: dd-mm-yyyy" },
          })}
        </div>
        <p style="margin:-8px 0 0;color:#6e7979;font-size:12px;line-height:16px">Gunakan format <strong>dd-mm-yyyy</strong>. Angka akan otomatis dipisahkan dengan tanda hubung.</p>
        <div class="split" style="gap:16px">
          ${memberSelectField("gender", "JENIS KELAMIN *", member?.gender || "Laki-laki", MEMBER_GENDER_OPTIONS, { required: true })}
          ${memberField("phone", "NOMOR TELEPON *", member?.phone || "", {
            placeholder: "081234567890",
            attrs: { required: true, maxlength: 15, inputmode: "numeric", autocomplete: "off" },
          })}
        </div>
        ${memberField("address", "ALAMAT *", member?.address || "", {
          textarea: true,
          rows: 4,
          full: true,
          placeholder: "Masukkan alamat lengkap",
          attrs: { required: true, maxlength: 255, autocomplete: "off" },
        })}
        ${memberSelectField("status", "STATUS *", member?.status || "Aktif", MEMBER_STATUS_OPTIONS, { required: true, full: true })}
        <div class="form-actions">
          <button class="btn primary" type="submit" data-member-submit>${submitLabel}</button>
        </div>
      </form>
    </div>
  </div>`;
}

function createMemberToast(message, tone = "success") {
  const toast = document.createElement("div");
  toast.className = "book-toast";
  toast.dataset.tone = tone;
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2800);
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

function syncMemberField(form, name) {
  const raw = readMemberForm(form);
  const sanitized = { ...raw };

  if (name === "full_name") {
    sanitized.full_name = sanitizeInput(raw.full_name);
    const input = form.querySelector('[name="full_name"]');
    if (input) input.value = sanitized.full_name;
  }

  if (name === "nik") {
    const input = form.querySelector('[name="nik"]');
    if (input) input.value = sanitizeInput(raw.nik).slice(0, 16);
  }

  if (name === "phone") {
    const input = form.querySelector('[name="phone"]');
    if (input) input.value = sanitizeInput(raw.phone).slice(0, 15);
  }

  if (name === "address") {
    sanitized.address = sanitizeInput(raw.address);
    const input = form.querySelector('[name="address"]');
    if (input) input.value = sanitized.address;
  }

  if (name === "birth_date") {
    const input = form.querySelector('[name="birth_date"]');
    if (input) {
      const digits = String(raw.birth_date || "").replace(/\D/g, "").slice(0, 8);
      let formatted = digits;
      if (digits.length > 2) {
        formatted = `${digits.slice(0, 2)}-${digits.slice(2)}`;
      }
      if (digits.length > 4) {
        formatted = `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
      }
      input.value = formatted;
      sanitized.birth_date = formatted;
    }
  }

  const validation = validateMemberData(sanitized);
  const relatedFields = name === "full_name" || name === "nik" || name === "birth_date" || name === "phone" || name === "address" || name === "gender" || name === "status"
    ? [name]
    : [name];
  relatedFields.forEach((fieldName) => setMemberFieldError(form, fieldName, validation.errors?.[fieldName] || ""));
  return validation;
}

function openMemberModal(member = null) {
  if (document.querySelector(".modal-layer")) return;
  document.body.insertAdjacentHTML("beforeend", buildMemberModal(member));

  const layer = document.querySelector(".modal-layer");
  const form = layer?.querySelector("[data-member-form]");
  const closeButton = layer?.querySelector(".modal-close");
  const alertBox = layer?.querySelector("[data-member-alert]");
  const submitButton = layer?.querySelector("[data-member-submit]");

  const closeModal = () => {
    layer?.remove();
  };

  closeButton?.addEventListener("click", closeModal);

  form?.querySelectorAll("[data-member-input]").forEach((input) => {
    if (input instanceof HTMLInputElement && (input.name === "nik" || input.name === "phone")) {
      attachDigitOnlyGuard(input);
    }

    if (input instanceof HTMLInputElement && input.name === "birth_date") {
      attachDateMask(input);
      input.value = formatBirthDateDisplay(input.value);
    }

    const handleInput = (event) => {
      const target = event.currentTarget;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
        return;
      }

      const validation = syncMemberField(form, target.name);
      setMemberFieldError(form, target.name, validation.errors?.[target.name] || "");
    };

    input.addEventListener("input", handleInput);
    input.addEventListener("change", handleInput);
    input.addEventListener("blur", handleInput);
  });

  clearMemberErrors(form);
  setAlertBox(alertBox, "");

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!alertBox || !submitButton || !form) return;

    const validation = validateMemberData(readMemberForm(form));
    setMemberErrors(form, validation.errors);

    if (!validation.valid) {
      setAlertBox(alertBox, firstMemberError(validation.errors), "error");
      focusFirstMemberError(form, validation.errors);
      return;
    }

    const payload = {
      id: Number(readMemberForm(form).id || 0),
      ...validation.data,
    };

    submitButton.disabled = true;
    submitButton.setAttribute("aria-busy", "true");
    submitButton.textContent = "Menyimpan...";

    try {
      await apiFetch("/api/members", {
        method: member ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      createMemberToast(member ? "Anggota berhasil diperbarui." : "Anggota berhasil ditambahkan.", "success");
      closeModal();
      await loadMembers();
    } catch (error) {
      const responseErrors = error?.payload?.errors;
      if (responseErrors) {
        setMemberErrors(form, responseErrors);
        focusFirstMemberError(form, responseErrors);
      }

      const message = error?.payload?.message || error?.message || "Gagal menyimpan anggota.";
      setAlertBox(alertBox, message, "error");
      createMemberToast(message, "error");
    } finally {
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
      submitButton.textContent = member ? "SIMPAN PERUBAHAN" : "SIMPAN ANGGOTA";
    }
  });
}

function deleteMember(id) {
  if (!window.confirm("Yakin ingin menonaktifkan anggota ini?")) return;

  apiFetch("/api/members", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  })
    .then(async () => {
      createMemberToast("Anggota berhasil dinonaktifkan.", "success");
      await loadMembers();
    })
    .catch((error) => {
      const message = error?.payload?.message || error?.message || "Gagal menonaktifkan anggota.";
      createMemberToast(message, "error");
      window.alert(message);
    });
}

function bindHandlers() {
  document.getElementById("open-member-create")?.addEventListener("click", () => openMemberModal());

  document.getElementById("open-member-filter")?.addEventListener("click", () => {
    const filterLayer = document.getElementById("member-filter-layer");
    const filterStatus = filterLayer?.querySelector("[data-filter-status]");
    const filterGender = filterLayer?.querySelector("[data-filter-gender]");
    const filterAge = filterLayer?.querySelector("[data-filter-age]");
    if (!filterLayer) return;

    filterLayer.hidden = !filterLayer.hidden;
    if (filterStatus) filterStatus.value = state.filters.status;
    if (filterGender) filterGender.value = state.filters.gender;
    if (filterAge) filterAge.value = state.filters.age_range;
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
    state.filters.age_range = "all";
    if (filterForm) {
      filterForm.reset();
      const statusSelect = filterForm.querySelector("[data-filter-status]");
      const genderSelect = filterForm.querySelector("[data-filter-gender]");
      const ageSelect = filterForm.querySelector("[data-filter-age]");
      if (statusSelect) statusSelect.value = "all";
      if (genderSelect) genderSelect.value = "all";
      if (ageSelect) ageSelect.value = "all";
    }
    state.page = 1;
    loadMembers();
  });

  filterForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(filterForm);
    state.filters.status = String(formData.get("status") || "all");
    state.filters.gender = String(formData.get("gender") || "all");
    state.filters.age_range = String(formData.get("age_range") || "all");
    state.page = 1;
    closeFilter();
    loadMembers();
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
                <input class="search-field" id="member-search" type="search" placeholder="Cari kode, nama, NIK, atau telepon..." value="${escapeHtml(state.query)}" />
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
