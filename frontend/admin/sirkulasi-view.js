import { apiFetch } from "../shared/api.js";
import { escapeHtml, renderDocument, stat } from "../shared/components.js";
import { renderAdminShell } from "../shared/layout-admin.js";

const state = {
  items: [],
  summary: { total: 0, borrowed: 0, returned_count: 0, overdue_count: 0, cancelled_count: 0 },
  members: [],
  books: [],
  query: "",
  filters: { status: "all" },
  page: 1,
  pageSize: 8,
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

function statusPill(status) {
  if (status === "dikembalikan") return '<span class="pill green">Dikembalikan</span>';
  if (status === "dipinjam") return '<span class="pill amber">Dipinjam</span>';
  if (status === "terlambat") return '<span class="pill red">Terlambat</span>';
  if (status === "dibatalkan") return '<span class="pill red">Dibatalkan</span>';
  return `<span class="pill">${escapeHtml(status || "-")}</span>`;
}

function filteredItems() {
  const q = state.query.trim().toLowerCase();
  return state.items.filter((item) => {
    const matchesSearch =
      !q ||
      [item.loan_code, item.member_code, item.member_name, item.processed_by_name, item.books_summary, item.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    const matchesStatus = state.filters.status === "all" || item.status === state.filters.status;
    return matchesSearch && matchesStatus;
  });
}

function visibleItems(items) {
  return items.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
}

function buildStats() {
  return `<div class="stats-4">
    ${stat("TOTAL TRANSAKSI", String(state.summary.total), "Semua data sirkulasi", "↺", "teal", `${state.summary.total} TOTAL`)}
    ${stat("SEDANG DIPINJAM", String(state.summary.borrowed), "Masih aktif di sistem", "↔", "blue", "AKTIF")}
    ${stat("TERLAMBAT", String(state.summary.overdue_count), "Perlu penanganan", "!", "red", "OVERDUE")}
    ${stat("DIKEMBALIKAN", String(state.summary.returned_count), "Sudah selesai diproses", "✓", "green", "SELESAI")}
  </div>`;
}

function buildFilterLayer() {
  return `<div class="filter-popover" id="loan-filter-layer" hidden>
    <div class="filter-card">
      <div class="modal-head">
        <h3>Filter Sirkulasi</h3>
        <button class="modal-close" type="button" data-filter-close>×</button>
      </div>
      <form class="modal-body" data-filter-form>
        <div class="field">
          <label>STATUS</label>
          <select class="input" name="status" data-filter-status>
            <option value="all">Semua status</option>
            <option value="dipinjam">Dipinjam</option>
            <option value="dikembalikan">Dikembalikan</option>
            <option value="terlambat">Terlambat</option>
            <option value="dibatalkan">Dibatalkan</option>
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
    return '<div class="table-empty" style="padding:24px 20px;color:#6e7979">Tidak ada data sirkulasi.</div>';
  }

  const start = (state.page - 1) * state.pageSize;
  const rows = items
    .map(
      (item, index) => `<tr>
        <td>${start + index + 1}</td>
        <td><strong>${escapeHtml(item.loan_code)}</strong></td>
        <td><strong>${escapeHtml(item.member_name)}</strong><br><span style="color:#6e7979;font-size:12px">${escapeHtml(item.member_code)}</span></td>
        <td>${escapeHtml(item.books_summary || "-")}</td>
        <td>${escapeHtml(formatDate(item.loan_date))}</td>
        <td>${escapeHtml(formatDate(item.due_date))}</td>
        <td>${statusPill(item.status)}</td>
        <td><div class="actions">
          <button class="row-btn" data-action="detail" data-id="${item.id}" aria-label="Detail transaksi">⌕</button>
          ${
            item.status === "dipinjam" || item.status === "terlambat"
              ? `<button class="row-btn" data-action="edit" data-id="${item.id}" aria-label="Edit transaksi">✎</button>
                 <button class="row-btn" data-action="return" data-id="${item.id}" aria-label="Kembalikan transaksi">↺</button>
                 <button class="row-btn" data-action="cancel" data-id="${item.id}" aria-label="Batalkan transaksi">⌫</button>`
              : `<button class="row-btn" type="button" disabled aria-label="Transaksi selesai">✓</button>`
          }
        </div></td>
      </tr>`,
    )
    .join("");

  return `<table class="data-table">
    <thead><tr>
      <th style="width:64px">NO</th>
      <th style="width:118px">KODE</th>
      <th style="width:190px">ANGGOTA</th>
      <th style="width:280px">BUKU</th>
      <th style="width:120px">PINJAM</th>
      <th style="width:120px">KEMBALI</th>
      <th style="width:112px">STATUS</th>
      <th style="width:106px">AKSI</th>
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

function buildMemberOptions() {
  return buildMemberSelect(0);
}

function buildMemberSelect(selectedId = 0) {
  const activeMembers = state.members.filter((member) => member.status === "aktif");
  if (!activeMembers.length) {
    return '<option value="">Tidak ada anggota aktif</option>';
  }
  return ['<option value="">Pilih anggota</option>']
    .concat(
      activeMembers.map((member) => `<option value="${escapeHtml(member.id)}"${Number(selectedId) === Number(member.id) ? " selected" : ""}>${escapeHtml(member.member_code)} - ${escapeHtml(member.full_name)}</option>`),
    )
    .join("");
}

function buildBookChecklist(selectedIds = []) {
  const selected = new Set(selectedIds.map((value) => Number(value)).filter((value) => value > 0));
  const books = state.books.filter((book) => {
    const isSelected = selected.has(Number(book.id));
    return isSelected || (book.status === "aktif" && Number(book.stock_available || 0) > 0);
  });
  if (!books.length) {
    return '<div class="table-empty" style="padding:16px;color:#6e7979">Tidak ada buku aktif dengan stok tersedia.</div>';
  }

  return `<div style="display:grid;gap:10px;max-height:260px;overflow:auto;padding-right:4px">
    ${books
      .map((book) => {
        const isChecked = selected.has(Number(book.id));
        const isDisabled = book.status !== "aktif" && !isChecked;
        return `<label style="display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border:1px solid #dbe4e3;border-radius:8px;background:#fff${isDisabled ? ";opacity:.7" : ""}">
        <input type="checkbox" name="book_ids" value="${escapeHtml(book.id)}" style="margin-top:3px" ${isChecked ? "checked" : ""} ${isDisabled ? "disabled" : ""} />
        <span style="display:block;min-width:0">
          <strong style="display:block;color:#191c1d">${escapeHtml(book.title)}</strong>
          <span style="display:block;color:#6e7979;font-size:12px;line-height:18px">${escapeHtml(book.code)} | Stok tersedia: ${escapeHtml(String(book.stock_available))}</span>
        </span>
      </label>`;
      })
      .join("")}
  </div>`;
}

function buildLoanDetail(item) {
  const books = String(item.books_summary || "-")
    .split(",")
    .map((book) => book.trim())
    .filter(Boolean);
  return `<div class="modal-layer">
    <div class="modal modal-md">
      <div class="modal-head">
        <h3>Detail Transaksi</h3>
        <button class="modal-close" type="button">×</button>
      </div>
      <div class="modal-body" style="gap:14px">
        <div class="field">
          <label>KODE</label>
          <div class="input">${escapeHtml(item.loan_code)}</div>
        </div>
        <div class="field">
          <label>ANGGOTA</label>
          <div class="input">${escapeHtml(item.member_name)} (${escapeHtml(item.member_code)})</div>
        </div>
        <div class="split" style="gap:16px">
          <div class="field"><label>PINJAM</label><div class="input">${escapeHtml(formatDate(item.loan_date))}</div></div>
          <div class="field"><label>KEMBALI</label><div class="input">${escapeHtml(formatDate(item.due_date))}</div></div>
        </div>
        <div class="field">
          <label>STATUS</label>
          <div class="input">${escapeHtml(item.status)}</div>
        </div>
        <div class="field">
          <label>DENDA</label>
          <div class="input">${escapeHtml(Number(item.fine_amount || 0).toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }))}</div>
        </div>
        <div class="field">
          <label>BUKU</label>
          <div class="input" style="min-height:auto;height:auto;display:block;line-height:22px">${books.map((book) => `<div>${escapeHtml(book)}</div>`).join("") || "-"}</div>
        </div>
        <div class="field">
          <label>CATATAN</label>
          <div class="input" style="min-height:auto;height:auto;display:block;line-height:22px">${escapeHtml(item.notes || "-")}</div>
        </div>
        <div class="form-actions">
          <button class="btn primary" type="button" data-modal-close>TUTUP</button>
        </div>
      </div>
    </div>
  </div>`;
}

function renderLoanModal({ title, submitLabel, mode, item = null }) {
  const loanDate = item?.loan_date || new Date().toISOString().slice(0, 10);
  const dueDate = item?.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const selectedBookIds = Array.isArray(item?.book_items) ? item.book_items.map((entry) => entry.book_id) : [];
  return `<div class="modal-layer">
    <div class="modal modal-xl">
      <div class="modal-head">
        <h3>${escapeHtml(title)}</h3>
        <button class="modal-close" type="button">×</button>
      </div>
      <form class="modal-body" data-loan-form data-loan-mode="${escapeHtml(mode)}" data-loan-id="${escapeHtml(item?.id || "")}" style="gap:16px">
        ${mode === "edit" ? `<input type="hidden" name="id" value="${escapeHtml(item?.id || "")}" />` : ""}
        <p style="margin:0;color:#6e7979;font-size:12px;line-height:16px">Pilih anggota dan buku yang akan dipinjam. Stok buku akan otomatis berkurang saat transaksi disimpan.</p>
        <div class="login-alert" data-loan-alert hidden></div>
        <div class="split" style="gap:16px">
          <div class="field">
            <label>ANGGOTA *</label>
            <select class="input" name="member_id" required>${buildMemberSelect(item?.member_id || 0)}</select>
          </div>
          <div class="field">
            <label>STATUS *</label>
            <select class="input" name="status" required>
              <option value="dipinjam"${item?.status === "dipinjam" || mode === "create" ? " selected" : ""}>Dipinjam</option>
              <option value="terlambat"${item?.status === "terlambat" ? " selected" : ""}>Terlambat</option>
            </select>
          </div>
        </div>
        <div class="split" style="gap:16px">
          <div class="field">
            <label>TANGGAL PINJAM *</label>
            <input class="input" type="date" name="loan_date" value="${loanDate}" required />
          </div>
          <div class="field">
            <label>TANGGAL KEMBALI *</label>
            <input class="input" type="date" name="due_date" value="${dueDate}" required />
          </div>
        </div>
        <div class="field full">
          <label>BUKU *</label>
          ${buildBookChecklist(selectedBookIds)}
        </div>
        <div class="field full">
          <label>CATATAN</label>
          <textarea class="input textarea" name="notes" rows="4" placeholder="Tambahkan catatan jika perlu">${escapeHtml(item?.notes || "")}</textarea>
        </div>
        <div class="form-actions">
          <button class="btn" type="button" data-modal-cancel>BATAL</button>
          <button class="btn primary" type="submit">${escapeHtml(submitLabel)}</button>
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
        ${stat("TOTAL TRANSAKSI", "-", "Memuat data...", "↺", "teal")}
        ${stat("SEDANG DIPINJAM", "-", "Memuat data...", "↔", "blue")}
        ${stat("TERLAMBAT", "-", "Memuat data...", "!", "red")}
        ${stat("DIKEMBALIKAN", "-", "Memuat data...", "✓", "green")}
      </div>`
    : state.error
      ? `<div class="stats-4">
          ${stat("TOTAL TRANSAKSI", "-", "Tidak dapat dimuat", "↺", "teal")}
          ${stat("SEDANG DIPINJAM", "-", "Tidak dapat dimuat", "↔", "blue")}
          ${stat("TERLAMBAT", "-", "Tidak dapat dimuat", "!", "red")}
          ${stat("DIKEMBALIKAN", "-", "Tidak dapat dimuat", "✓", "green")}
        </div>`
      : buildStats();

  const panelContent = state.loading
    ? '<section class="panel" id="loan-panel"><div style="padding:24px 20px;color:#6e7979">Memuat sirkulasi...</div></section>'
    : state.error
      ? `<section class="panel" id="loan-panel"><div style="padding:24px 20px;color:#ba1a1a">${escapeHtml(state.error)}</div></section>`
      : `<section class="panel" id="loan-panel">
          <div class="panel-toolbar">
            <div class="panel-title-wrap">
              <h2 class="panel-title">Data Transaksi</h2>
              <span class="pill teal" data-loan-total>${state.summary.total} TOTAL</span>
            </div>
            <div class="toolbar-actions">
              <button class="btn primary" type="button" id="open-loan-modal">＋ BUAT PEMINJAMAN BARU</button>
              <button class="btn" type="button" id="export-loans">EXPORT</button>
              <label class="search">
                <span>⌕</span>
                <input class="search-field" id="loan-search" type="search" placeholder="Cari transaksi, anggota, atau buku..." value="${escapeHtml(state.query)}" />
              </label>
              <button class="btn" type="button" id="open-loan-filter">☰</button>
            </div>
          </div>
          ${buildFilterLayer()}
          <div id="loan-table-wrap">${buildTable(pageItems)}</div>
          <div id="loan-pagination-wrap">${buildPagination(items.length)}</div>
        </section>`;

  renderDocument(
    "Riwayat & Transaksi Peminjaman",
    renderAdminShell(
      "circulation",
      "Riwayat & Transaksi Peminjaman",
      `<div class="hero-row">
        <div>
          <p class="eyebrow">LIBRARY EIS BALANGAN</p>
          <h1 class="page-title">Riwayat & Transaksi Peminjaman</h1>
          <p class="page-copy">Pantau sirkulasi buku, cari transaksi, dan buat peminjaman baru langsung dari halaman ini.</p>
        </div>
      </div>
      <div id="loan-stats">${stats}</div>
      ${panelContent}`,
    ),
  );

  bindHandlers();
  bindTableHandlers();
}

function openLoanDetailModal(item) {
  if (document.querySelector(".modal-layer")) return;
  document.body.insertAdjacentHTML("beforeend", buildLoanDetail(item));
  const layer = document.querySelector(".modal-layer");
  const closeButton = layer?.querySelector(".modal-close");
  const closeAction = layer?.querySelector("[data-modal-close]");

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
  closeAction?.addEventListener("click", closeModal);
}

async function openCreateLoanModal() {
  await refreshLoanLookups();
  openLoanModalDialog({
    mode: "create",
    title: "Buat Peminjaman Baru",
    submitLabel: "SIMPAN PEMINJAMAN",
  });
}

async function openEditLoanModal(item) {
  await refreshLoanLookups();
  const freshItem = state.items.find((entry) => entry.id === item?.id) || item;
  openLoanModalDialog({
    mode: "edit",
    title: "Edit Transaksi",
    submitLabel: "SIMPAN PERUBAHAN",
    item: freshItem,
  });
}

async function refreshLoanLookups() {
  const [membersResponse, booksResponse] = await Promise.all([apiFetch("/api/members?status=aktif"), apiFetch("/api/books")]);
  const membersPayload = membersResponse?.data || {};
  const booksPayload = booksResponse?.data || {};

  state.members = Array.isArray(membersPayload.items) ? membersPayload.items : [];
  state.books = Array.isArray(booksPayload.items) ? booksPayload.items : [];
}

function openLoanModalDialog({ mode, title, submitLabel, item = null }) {
  if (document.querySelector(".modal-layer")) return;
  document.body.insertAdjacentHTML("beforeend", renderLoanModal({ mode, title, submitLabel, item }));

  const layer = document.querySelector(".modal-layer");
  const form = layer?.querySelector("[data-loan-form]");
  const closeButton = layer?.querySelector(".modal-close");
  const cancelButton = layer?.querySelector("[data-modal-cancel]");
  const alertBox = layer?.querySelector("[data-loan-alert]");
  let isSubmitting = false;

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
    if (!alertBox || isSubmitting) return;

    const data = new FormData(form);
    const bookIds = Array.from(form.querySelectorAll('input[name="book_ids"]:checked'))
      .map((input) => Number(input.value || 0))
      .filter((value) => value > 0);
    const modeValue = String(form.getAttribute("data-loan-mode") || "create");
    const payload = {
      id: Number(data.get("id") || form.getAttribute("data-loan-id") || 0),
      member_id: Number(data.get("member_id") || 0),
      loan_date: String(data.get("loan_date") || "").trim(),
      due_date: String(data.get("due_date") || "").trim(),
      status: String(data.get("status") || "dipinjam").trim(),
      notes: String(data.get("notes") || "").trim(),
      items: bookIds.map((bookId) => ({ book_id: bookId, quantity: 1 })),
    };

    if (!payload.member_id || !payload.loan_date || !payload.due_date || !bookIds.length) {
      alertBox.hidden = false;
      alertBox.dataset.type = "error";
      alertBox.textContent = "Anggota, tanggal, dan minimal satu buku wajib dipilih.";
      return;
    }

    isSubmitting = true;
    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Menyimpan...";
    }

    try {
      const response = await apiFetch("/api/loans", {
        method: modeValue === "edit" ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      await loadLoans();
      alertBox.hidden = false;
      alertBox.dataset.type = "success";
      alertBox.textContent = response?.message || "Peminjaman berhasil disimpan.";
      window.setTimeout(() => {
        closeModal();
      }, 180);
    } catch (error) {
      alertBox.hidden = false;
      alertBox.dataset.type = "error";
      alertBox.textContent = error?.payload?.message || error?.message || "Gagal menyimpan peminjaman.";
    } finally {
      isSubmitting = false;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = modeValue === "edit" ? "SIMPAN PERUBAHAN" : "SIMPAN PEMINJAMAN";
      }
    }
  });
}

function exportLoans() {
  const rows = filteredItems().map((item) => [
    item.loan_code,
    item.member_name,
    item.member_code,
    item.books_summary || "-",
    formatDate(item.loan_date),
    formatDate(item.due_date),
    item.status,
    Number(item.fine_amount || 0).toString(),
  ]);

  const csv = [
    ["KODE", "ANGGOTA", "ID ANGGOTA", "BUKU", "PINJAM", "KEMBALI", "STATUS", "DENDA"],
    ...rows,
  ]
    .map((columns) => columns.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(";"))
    .join("\n");

  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `sirkulasi-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function bindHandlers() {
  document.getElementById("open-loan-modal")?.addEventListener("click", () => {
    void openCreateLoanModal();
  });
  document.getElementById("export-loans")?.addEventListener("click", exportLoans);

  document.getElementById("open-loan-filter")?.addEventListener("click", () => {
    const filterLayer = document.getElementById("loan-filter-layer");
    const filterStatus = filterLayer?.querySelector("[data-filter-status]");
    if (!filterLayer) return;

    filterLayer.hidden = !filterLayer.hidden;
    if (filterStatus) filterStatus.value = state.filters.status;
  });

  document.getElementById("loan-search")?.addEventListener("input", (event) => {
    state.query = String(event.target.value || "");
    state.page = 1;
    if (searchTimer) {
      window.clearTimeout(searchTimer);
    }
    searchTimer = window.setTimeout(() => {
      updateLoanView();
    }, 250);
  });

  const filterLayer = document.getElementById("loan-filter-layer");
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
    updateLoanView();
  });

  filterForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(filterForm);
    state.filters.status = String(formData.get("status") || "all");
    state.page = 1;
    closeFilter();
    updateLoanView();
  });
}

function bindTableHandlers() {
  document.querySelectorAll("[data-action='detail']").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.getAttribute("data-id") || 0);
      const item = state.items.find((entry) => entry.id === id);
      if (item) openLoanDetailModal(item);
    });
  });

  document.querySelectorAll("[data-action='edit']").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.getAttribute("data-id") || 0);
      const item = state.items.find((entry) => entry.id === id);
      if (item) void openEditLoanModal(item);
    });
  });

  document.querySelectorAll("[data-action='return']").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.getAttribute("data-id") || 0);
      if (id > 0) returnLoan(id);
    });
  });

  document.querySelectorAll("[data-action='cancel']").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.getAttribute("data-id") || 0);
      if (id > 0) cancelLoan(id);
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
      updateLoanView();
    });
  });
}

async function returnLoan(id) {
  if (!window.confirm("Tandai transaksi ini sebagai sudah dikembalikan?")) return;

  try {
    await apiFetch("/api/loans/return", {
      method: "POST",
      body: JSON.stringify({ id }),
    });
    await loadLoans();
  } catch (error) {
    window.alert(error?.payload?.message || error?.message || "Gagal memproses pengembalian.");
  }
}

async function cancelLoan(id) {
  if (!window.confirm("Batalkan transaksi ini? Stok buku akan dikembalikan.")) return;

  try {
    await apiFetch("/api/loans/cancel", {
      method: "POST",
      body: JSON.stringify({ id }),
    });
    await loadLoans();
  } catch (error) {
    window.alert(error?.payload?.message || error?.message || "Gagal membatalkan transaksi.");
  }
}

function updateLoanView() {
  const items = filteredItems();
  const pageItems = visibleItems(items);
  const statsWrap = document.getElementById("loan-stats");
  const tableWrap = document.getElementById("loan-table-wrap");
  const paginationWrap = document.getElementById("loan-pagination-wrap");
  const totalBadge = document.querySelector("[data-loan-total]");

  if (statsWrap) statsWrap.innerHTML = buildStats();
  if (tableWrap) tableWrap.innerHTML = buildTable(pageItems);
  if (paginationWrap) paginationWrap.innerHTML = buildPagination(items.length);
  if (totalBadge) totalBadge.textContent = `${state.summary.total} TOTAL`;
  bindTableHandlers();
}

async function loadLoans() {
  const hasLoanPanel = Boolean(document.getElementById("loan-panel"));
  state.loading = true;
  state.error = "";
  if (!hasLoanPanel) {
    renderShell();
  }

  try {
    const query = new URLSearchParams();
    const q = state.query.trim();
    if (q !== "") query.set("q", q);
    if (state.filters.status !== "all") query.set("status", state.filters.status);

    const [loansResponse, membersResponse, booksResponse] = await Promise.all([
      apiFetch(`/api/loans${query.toString() ? `?${query.toString()}` : ""}`),
      apiFetch("/api/members?status=aktif"),
      apiFetch("/api/books"),
    ]);

    const loansPayload = loansResponse?.data || {};
    const membersPayload = membersResponse?.data || {};
    const booksPayload = booksResponse?.data || {};

    state.items = Array.isArray(loansPayload.items) ? loansPayload.items : [];
    state.members = Array.isArray(membersPayload.items) ? membersPayload.items : [];
    state.books = Array.isArray(booksPayload.items) ? booksPayload.items : [];
    state.summary = {
      total: Number(loansPayload.summary?.total ?? state.items.length),
      borrowed: Number(loansPayload.summary?.borrowed ?? 0),
      returned_count: Number(loansPayload.summary?.returned_count ?? 0),
      overdue_count: Number(loansPayload.summary?.overdue_count ?? 0),
      cancelled_count: Number(loansPayload.summary?.cancelled_count ?? 0),
    };
    state.page = 1;
  } catch (error) {
    state.error = error?.payload?.message || error?.message || "Gagal memuat data sirkulasi.";
  } finally {
    state.loading = false;
    renderShell();
  }
}

renderShell();
loadLoans();
