import { apiFetch } from "../shared/api.js";
import { escapeHtml, renderDocument, stat, status } from "../shared/components.js";
import { renderKepalaShell } from "../shared/layout-kepala.js";

const PAGE_SIZE = 8;
const ROLE_LABELS = {
  admin: "Admin Sistem",
  kepala: "Kepala Perpustakaan",
};

const state = {
  loading: true,
  error: "",
  query: "",
  status: "all",
  role: "all",
  page: 1,
  items: [],
  summary: {
    total: 0,
    active: 0,
    inactive: 0,
    admin: 0,
    kepala: 0,
    recently_active: 0,
  },
};

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCount(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}

function getRoleLabel(code) {
  return ROLE_LABELS[code] || code || "-";
}

function getRoleTone(code) {
  if (code === "admin") return "blue";
  if (code === "kepala") return "teal";
  return "amber";
}

function buildQuery() {
  const params = new URLSearchParams();
  if (state.query.trim()) params.set("q", state.query.trim());
  if (state.status !== "all") params.set("status", state.status);
  if (state.role !== "all") params.set("role", state.role);
  return params.toString();
}

function getFilteredItems() {
  return Array.isArray(state.items) ? state.items : [];
}

function renderStats() {
  return `<div class="stats-4">
    ${stat("TOTAL PENGGUNA", formatCount(state.summary.total), "Akun yang terdaftar di database", "👥", "teal")}
    ${stat("AKTIF", formatCount(state.summary.active), "Masih dapat login", "◌", "blue")}
    ${stat("ADMIN & KEPALA", formatCount(state.summary.admin + state.summary.kepala), "Akun dengan hak akses utama", "◒", "green")}
    ${stat("AKTIF 30 HARI", formatCount(state.summary.recently_active), "Pernah login dalam 30 hari terakhir", "↺", "amber")}
  </div>`;
}

function renderToolbar() {
  return `<div class="toolbar-actions">
    <label class="search" style="width:320px">
      <span>⌕</span>
      <input class="search-field" type="search" placeholder="Cari nama, username, email..." value="${escapeHtml(state.query)}" data-user-search />
    </label>
    <select class="input" style="width:180px;height:32px" data-user-status>
      <option value="all"${state.status === "all" ? " selected" : ""}>Semua status</option>
      <option value="aktif"${state.status === "aktif" ? " selected" : ""}>Aktif</option>
      <option value="nonaktif"${state.status === "nonaktif" ? " selected" : ""}>Nonaktif</option>
    </select>
    <select class="input" style="width:220px;height:32px" data-user-role>
      <option value="all"${state.role === "all" ? " selected" : ""}>Semua peran</option>
      <option value="admin"${state.role === "admin" ? " selected" : ""}>Admin Sistem</option>
      <option value="kepala"${state.role === "kepala" ? " selected" : ""}>Kepala Perpustakaan</option>
    </select>
    <button class="btn" type="button" data-user-refresh>Muat Ulang</button>
  </div>`;
}

function renderTableBody() {
  const items = getFilteredItems();
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, state.page), totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const visible = items.slice(start, start + PAGE_SIZE);

  if (!visible.length) {
    return '<tr><td colspan="6" style="padding:24px 14px;color:#6e7979;text-align:center">Belum ada pengguna yang cocok dengan filter.</td></tr>';
  }

  return visible
    .map((item, index) => {
      const roleCode = String(item.role?.code || "");
      const roleTone = getRoleTone(roleCode);
      return `<tr>
        <td>${start + index + 1}</td>
        <td>
          <strong>${escapeHtml(item.full_name || "-")}</strong><br>
          <span style="color:#6e7979;font-size:11px">${escapeHtml(item.username || "-")}</span>
        </td>
        <td>
          <span class="pill ${roleTone}">${escapeHtml(getRoleLabel(roleCode))}</span>
        </td>
        <td>
          ${escapeHtml(item.email || "-")}<br>
          <span style="color:#6e7979;font-size:11px">${escapeHtml(item.unit || item.phone || "-")}</span>
        </td>
        <td>${status(item.status === "aktif" ? "Aktif" : "Nonaktif")}</td>
        <td>${escapeHtml(formatDateTime(item.last_login_at))}</td>
      </tr>`;
    })
    .join("");
}

function renderPagination() {
  const items = getFilteredItems();
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, state.page), totalPages);
  const start = items.length === 0 ? 0 : (current - 1) * PAGE_SIZE + 1;
  const end = Math.min(items.length, current * PAGE_SIZE);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .map((page) => `<button class="page-btn ${page === current ? "active" : ""}" type="button" data-user-page="${page}">${page}</button>`)
    .join("");

  return `<span>Menampilkan ${start}-${end} dari ${formatCount(items.length)} pengguna</span>
    <div class="pages">
      <button class="page-btn" type="button" data-user-page="prev">‹</button>
      ${pages}
      <button class="page-btn" type="button" data-user-page="next">›</button>
    </div>`;
}

function renderTable() {
  return `<section class="panel" id="user-panel">
    <div class="panel-toolbar">
      <div class="panel-title-wrap">
        <h2 class="panel-title">Daftar Akun Pengguna</h2>
        <span class="pill teal" data-user-total>${formatCount(state.summary.total)} total</span>
      </div>
      ${renderToolbar()}
    </div>
    <div class="collection-table-wrap">
      <table class="collection-table">
        <colgroup>
          <col style="width:64px">
          <col style="width:28%">
          <col style="width:18%">
          <col style="width:30%">
          <col style="width:10%">
          <col style="width:14%">
        </colgroup>
        <thead>
          <tr>
            <th>NO</th>
            <th>NAMA PENGGUNA</th>
            <th>PERAN</th>
            <th>EMAIL / UNIT</th>
            <th>STATUS</th>
            <th>LOGIN TERAKHIR</th>
          </tr>
        </thead>
        <tbody id="users-table-body">${renderTableBody()}</tbody>
      </table>
    </div>
    <div class="pagination collection-pagination" id="users-pagination-wrap">${renderPagination()}</div>
  </section>`;
}

function renderContent() {
  if (state.loading) {
    return `<div class="head-loading">Memuat pengguna...</div>`;
  }

  if (state.error) {
    return `<div class="head-error">${escapeHtml(state.error)}</div>`;
  }

  return `<div class="report-page">
    <div class="hero-row">
      <div>
        <h1 class="page-title" style="color:#006565">Manajemen Pengguna</h1>
        <p class="page-copy">Kelola hak akses dan akun pengguna sistem informasi eksekutif perpustakaan daerah.</p>
      </div>
      <a href="tambah-pengguna.html" class="btn primary">＋ Tambah Pengguna</a>
    </div>
    ${renderStats()}
    ${renderTable()}
    <div class="split" style="margin-top:24px">
      <section class="panel" style="padding:18px">
        <h2 class="panel-title" style="margin-bottom:8px">Panduan Hak Akses</h2>
        <div class="page-copy" style="font-size:13px">Pastikan setiap pengguna memiliki peran yang sesuai. Akun nonaktif otomatis kehilangan akses login ke dashboard eksekutif sampai diaktifkan kembali.</div>
      </section>
      <section class="panel" style="padding:18px">
        <h2 class="panel-title" style="margin-bottom:8px">Log Keamanan</h2>
        <div class="page-copy" style="font-size:13px">Seluruh aktivitas penambahan, pengubahan, dan penghapusan akun dicatat dalam sistem log audit untuk menjaga integritas data institusi.</div>
      </section>
    </div>
  </div>`;
}

function renderPage() {
  renderDocument("Manajemen Pengguna", renderKepalaShell("users", "Manajemen Pengguna", renderContent(), "", { compact: true }));
}

function updateUsersView() {
  const tableBody = document.getElementById("users-table-body");
  const paginationWrap = document.getElementById("users-pagination-wrap");
  const totalBadge = document.querySelector("[data-user-total]");

  if (tableBody) {
    tableBody.innerHTML = renderTableBody();
  }

  if (paginationWrap) {
    paginationWrap.innerHTML = renderPagination();
  }

  if (totalBadge) {
    totalBadge.textContent = `${formatCount(state.summary.total)} total`;
  }
}

function clampPage() {
  const totalPages = Math.max(1, Math.ceil(getFilteredItems().length / PAGE_SIZE));
  state.page = Math.min(Math.max(1, state.page), totalPages);
}

async function loadUsers({ silent = false } = {}) {
  const requestId = (loadUsers.requestId || 0) + 1;
  loadUsers.requestId = requestId;

  if (!silent) {
    state.loading = true;
    state.error = "";
    renderPage();
  }

  try {
    const query = buildQuery();
    const response = await apiFetch(`/api/users${query ? `?${query}` : ""}`);
    if (loadUsers.requestId !== requestId) return;

    const payload = response?.data || {};
    state.items = Array.isArray(payload.items) ? payload.items : [];
    state.summary = {
      total: Number(payload.summary?.total ?? state.items.length),
      active: Number(payload.summary?.active ?? 0),
      inactive: Number(payload.summary?.inactive ?? 0),
      admin: Number(payload.summary?.admin ?? 0),
      kepala: Number(payload.summary?.kepala ?? 0),
      recently_active: Number(payload.summary?.recently_active ?? 0),
    };
    state.page = 1;
    clampPage();
  } catch (error) {
    if (loadUsers.requestId !== requestId) return;
    state.error = error?.payload?.message || error?.message || "Gagal memuat pengguna.";
  } finally {
    if (loadUsers.requestId !== requestId) return;
    state.loading = false;
    if (silent && !state.error) {
      updateUsersView();
    } else {
      renderPage();
    }
  }
}

document.addEventListener("input", (event) => {
  const search = event.target.closest("[data-user-search]");
  if (!search) return;
  state.query = search.value || "";
  state.page = 1;
  loadUsers({ silent: true });
});

document.addEventListener("change", (event) => {
  const statusField = event.target.closest("[data-user-status]");
  const roleField = event.target.closest("[data-user-role]");
  if (statusField) {
    state.status = statusField.value || "all";
    state.page = 1;
    loadUsers({ silent: true });
  }
  if (roleField) {
    state.role = roleField.value || "all";
    state.page = 1;
    loadUsers({ silent: true });
  }
});

document.addEventListener("click", (event) => {
  const pageButton = event.target.closest("[data-user-page]");
  if (pageButton) {
    const target = pageButton.getAttribute("data-user-page") || "1";
    const totalPages = Math.max(1, Math.ceil(getFilteredItems().length / PAGE_SIZE));
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
    updateUsersView();
    return;
  }

  const refresh = event.target.closest("[data-user-refresh]");
  if (refresh) {
    loadUsers({ silent: true });
  }
});

renderPage();
loadUsers();
