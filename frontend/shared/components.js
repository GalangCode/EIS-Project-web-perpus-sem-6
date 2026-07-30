export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderDocument(title, body) {
  document.title = `${title} - EIS Balangan`;
  document.body.innerHTML = body;
}

function getProjectRelativePrefix() {
  if (typeof window === "undefined" || !window.location) {
    return "../";
  }

  const pathname = window.location.pathname || "";
  const marker = "/frontend/";
  const index = pathname.indexOf(marker);
  const relativePath = index === -1 ? pathname.replace(/^\/+/, "") : pathname.slice(index + marker.length);
  const depth = relativePath.split("/").filter(Boolean).length || 1;
  return "../".repeat(depth);
}

export function assetPath(file) {
  return `${getProjectRelativePrefix()}asset/${encodeURIComponent(file)}`;
}

const statIconMap = {
  "▣": "icons8-board-64.png",
  "▤": "book.png",
  "▥": "icons8-book-48.png",
  "▧": "icons8-category-96.png",
  "◎": "icons8-customer-52.png",
  "◌": "icons8-online-50.png",
  "◒": "icons8-people-96.png",
  "⊘": "icons8-fail-72.png",
  "↔": "icons8-left-and-right-curved-64.png",
  "↺": "icons8-clock-50.png",
  "✓": "icons8-buy-52.png",
  "!": "icons8-warning-52.png",
  "★": "icons8-star-52.png",
  "△": "icons8-warning-52.png",
  "＋": "icons8-plus-52.png",
  "₽": "icons8-wallet-52.png",
  "👥": "icons8-people-96.png",
  "♜": "icons8-board-64.png",
  "◉": "icons8-customer-52.png",
  "◱": "book.png",
};

function renderStatIcon(icon, tone) {
  const file = statIconMap[icon] || (typeof icon === "string" && /\.(png|jpe?g|gif|webp|svg)$/i.test(icon) ? icon : "");
  if (file) {
    return `<img class="stat-icon-img ${tone}" src="${assetPath(file)}" alt="" aria-hidden="true">`;
  }
  return escapeHtml(icon);
}

export function renderLabelHtml(label) {
  return escapeHtml(label).replaceAll("*", '<span class="required-star">*</span>');
}

function renderAttributes(attributes = {}) {
  return Object.entries(attributes)
    .filter(([, value]) => value !== null && value !== undefined && value !== false)
    .map(([key, value]) => {
      if (value === true) return ` ${escapeHtml(key)}`;
      return ` ${escapeHtml(key)}="${escapeHtml(value)}"`;
    })
    .join("");
}

export function mount(html, title = "EIS Balangan") {
  document.title = `${title} - EIS Balangan`;
  document.getElementById("app").innerHTML = html;
}

export function status(value) {
  if (["Aktif", "Tersedia", "Kembali", "CUKUP"].includes(value)) return `<span class="pill green">${escapeHtml(value)}</span>`;
  if (["Nonaktif", "Terlambat", "Segera", "KRITIS (2)", "KRITIS (3)"].includes(value)) return `<span class="pill red">${escapeHtml(value)}</span>`;
  if (["Dipinjam", "Diproses", "MENIPIS (8)", "MENIPIS (3)", "Stok Menipis"].includes(value)) return `<span class="pill amber">${escapeHtml(value)}</span>`;
  if (value && String(value).includes("+")) return `<span class="pill green">${escapeHtml(value)}</span>`;
  return escapeHtml(value);
}

export function stat(kicker, value, note, icon = "▣", tone = "teal", tag = "") {
  const small = String(value).length > 9 ? "small" : "";
  return `<div class="stat-card">
    <div class="stat-head">
      <div class="stat-icon ${tone}">${renderStatIcon(icon, tone)}</div>
      ${tag ? `<span class="pill ${tone}">${escapeHtml(tag)}</span>` : ""}
    </div>
    <p class="stat-kicker">${escapeHtml(kicker)}</p>
    <h2 class="stat-value ${small}">${escapeHtml(value)}</h2>
    <p class="stat-note">${escapeHtml(note)}</p>
  </div>`;
}

export function panel(title, badge = "", actions = "", body = "", footer = "") {
  let footerHtml = "";
  if (footer === true) {
    footerHtml = `<div class="pagination"><span>Menampilkan 1 sampai 5 dari 24 data</span><div class="pages"><button class="page-btn">‹</button><button class="page-btn active">1</button><button class="page-btn">2</button><button class="page-btn">3</button><button class="page-btn">›</button></div></div>`;
  } else if (typeof footer === "string") {
    footerHtml = footer;
  }
  return `<section class="panel">
    <div class="panel-toolbar">
      <div class="panel-title-wrap">
        <h2 class="panel-title">${escapeHtml(title)}</h2>
        ${badge ? `<span class="pill teal">${escapeHtml(badge)}</span>` : ""}
      </div>
      <div class="toolbar-actions">${actions || ""}</div>
    </div>
    ${body}
    ${footerHtml}
  </section>`;
}

export function renderPagination(totalItems, currentPage, pageSize, opts = {}) {
  const pageAttr = opts.pageAttr || "data-page";
  const btnClass = opts.btnClass || "page-btn";
  const activeClass = opts.activeClass || "active";
  const showSummary = opts.showSummary !== false;
  const useArrows = opts.useArrows !== false;
  const useEllipsis = opts.useEllipsis === true;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const current = Math.min(Math.max(currentPage, 1), totalPages);
  const start = totalItems === 0 ? 0 : (current - 1) * pageSize + 1;
  const end = Math.min(totalItems, current * pageSize);

  let pagesHtml = "";

  if (useEllipsis) {
    const buttons = [];
    
    if (useArrows) {
      buttons.push(`<button class="${btnClass}" type="button" ${pageAttr}="prev" ${current <= 1 ? "disabled" : ""}>‹</button>`);
    }

    buttons.push(`<button class="${btnClass} ${current === 1 ? activeClass : ""}" type="button" ${pageAttr}="1">1</button>`);

    if (totalPages > 1) {
      let rangeStart = Math.max(2, current - 1);
      let rangeEnd = Math.min(totalPages - 1, current + 1);

      if (rangeStart > 2) {
        buttons.push(`<span class="all-ellipsis">...</span>`);
      }

      for (let page = rangeStart; page <= rangeEnd; page++) {
        buttons.push(`<button class="${btnClass} ${current === page ? activeClass : ""}" type="button" ${pageAttr}="${page}">${page}</button>`);
      }

      if (rangeEnd < totalPages - 1) {
        buttons.push(`<span class="all-ellipsis">...</span>`);
      }

      buttons.push(`<button class="${btnClass} ${current === totalPages ? activeClass : ""}" type="button" ${pageAttr}="${totalPages}">${totalPages}</button>`);
    }

    if (useArrows) {
      buttons.push(`<button class="${btnClass}" type="button" ${pageAttr}="next" ${current >= totalPages ? "disabled" : ""}>›</button>`);
    }

    pagesHtml = buttons.join("");
  } else {
    const buttons = [];
    
    if (useArrows) {
      buttons.push(`<button class="${btnClass}" type="button" ${pageAttr}="prev" ${current <= 1 ? "disabled" : ""}>‹</button>`);
    }

    for (let page = 1; page <= totalPages; page++) {
      buttons.push(`<button class="${btnClass} ${page === current ? activeClass : ""}" type="button" ${pageAttr}="${page}">${page}</button>`);
    }

    if (useArrows) {
      buttons.push(`<button class="${btnClass}" type="button" ${pageAttr}="next" ${current >= totalPages ? "disabled" : ""}>›</button>`);
    }

    pagesHtml = buttons.join("");
  }

  const summaryHtml = showSummary
    ? `<span>Menampilkan ${start} sampai ${end} dari ${totalItems} data</span>`
    : "";

  return `<div class="pagination">
    ${summaryHtml}
    <div class="pages">
      ${pagesHtml}
    </div>
  </div>`;
}

export function dataTable(headers, rows, opts = {}) {
  if (!rows || rows.length === 0) {
    const emptyText = opts.emptyText || "Tidak ada data.";
    return `<div class="table-empty" style="padding:24px 20px;color:#6e7979">${escapeHtml(emptyText)}</div>`;
  }

  const withActions = opts.actions !== false;
  const widths = opts.widths || [];

  const headerCols = headers.map((h, i) => {
    const text = typeof h === "object" ? (h.text || "") : h;
    const width = typeof h === "object" ? (h.width || widths[i] || "auto") : (widths[i] || "auto");
    return `<th style="width:${escapeHtml(width)}">${escapeHtml(text)}</th>`;
  }).join("");

  const actionsHeader = withActions ? `<th style="width:${escapeHtml(opts.actionsWidth || "120px")}">AKSI</th>` : "";

  const cellRenderer = opts.cellRenderer || ((cell, colIndex) => {
    const str = String(cell === null || cell === undefined ? "" : cell);
    const isCode = str.startsWith("BK-") || str.startsWith("KAT-") || str.startsWith("TRX-") || str.startsWith("ANG-");
    if (colIndex === 0 || colIndex === 1 || isCode) {
      return `<strong>${escapeHtml(str)}</strong>`;
    }
    return status(str);
  });

  const bodyRows = rows.map((row, rowIndex) => {
    if (typeof opts.rowRenderer === "function") {
      return opts.rowRenderer(row, rowIndex);
    }

    let cellsHtml = "";
    if (Array.isArray(row)) {
      cellsHtml = row.map((cell, colIndex) => `<td>${cellRenderer(cell, colIndex, row, rowIndex)}</td>`).join("");
    } else if (typeof row === "object" && row !== null) {
      const keys = opts.keys || Object.keys(row);
      cellsHtml = keys.map((key, colIndex) => {
        const cell = row[key];
        return `<td>${cellRenderer(cell, colIndex, row, rowIndex)}</td>`;
      }).join("");
    }

    let actionsCell = "";
    if (withActions) {
      if (typeof opts.actions === "function") {
        actionsCell = `<td>${opts.actions(row, rowIndex)}</td>`;
      } else {
        const id = row.id !== undefined ? row.id : (Array.isArray(row) ? row[0] : "");
        const editAction = opts.editAction || "edit";
        const deleteAction = opts.deleteAction || "delete";
        actionsCell = `<td><div class="actions">
          <button class="row-btn" data-action="${escapeHtml(editAction)}" data-id="${escapeHtml(String(id))}" aria-label="Edit">✎</button>
          <button class="row-btn" data-action="${escapeHtml(deleteAction)}" data-id="${escapeHtml(String(id))}" aria-label="Hapus">⌫</button>
        </div></td>`;
      }
    }

    return `<tr>${cellsHtml}${actionsCell}</tr>`;
  }).join("");

  return `<table class="data-table">
    <thead><tr>${headerCols}${actionsHeader}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>`;
}

export function field(label, value = "", opts = {}) {
  const tag = opts.tag || "input";
  const classes = ["input"];
  if (opts.textarea) classes.push("textarea");
  if (opts.full) classes.push("full");
  const className = classes.join(" ");
  const placeholder = escapeHtml(opts.placeholder || value || "");
  const name = opts.name ? ` name="${escapeHtml(opts.name)}"` : "";
  const type = opts.type ? ` type="${escapeHtml(opts.type)}"` : ' type="text"';
  const rows = opts.rows ? ` rows="${Number(opts.rows)}"` : "";
  const attrs = renderAttributes(opts.attrs || {});
  const options = Array.isArray(opts.options)
    ? opts.options
        .map((option) => {
          const selected = option === value ? " selected" : "";
          return `<option${selected}>${escapeHtml(option)}</option>`;
        })
        .join("")
    : "";
  const control =
    tag === "textarea"
      ? `<textarea class="${className}"${name}${rows}${attrs} placeholder="${placeholder}">${escapeHtml(value)}</textarea>`
      : tag === "select"
        ? `<select class="${className}"${name}${attrs}>${options}</select>`
        : `<input class="${className}"${name}${type}${attrs} value="${escapeHtml(value)}" placeholder="${placeholder}" />`;
  return `<div class="field ${opts.full ? "full" : ""}">
    <label>${renderLabelHtml(label)}</label>
    ${control}
  </div>`;
}

function getLoginAssetPrefix() {
  return getProjectRelativePrefix().replace(/\/$/, "");
}

export function loginPage(role = "all") {
  const isKepala = role === "kepala";
  const isUnified = !role || role === "all";
  const assetPrefix = getLoginAssetPrefix();
  const submitLabel = isUnified ? "Masuk" : isKepala ? "Login Kepala" : "Login Admin";
  return `<div class="login-shell">
    <section class="login-left">
      <img class="login-photo" src="${assetPrefix}/gambar%20login.jpg" alt="">
      <div class="login-overlay"></div>
      <div class="welcome">
        <h1>Selamat Datang di<br>Perpustakaan<br>Balangan</h1>
        <p>Sistem Informasi Eksekutif Peminjaman Buku Perpustakaan Daerah.<br>Akses data dan analitik secara komprehensif.</p>
      </div>
    </section>
    <section class="login-right">
      <div class="login-box">
        <div class="login-brand">
          <img class="login-brand-logo" src="${assetPrefix}/logo.png" alt="Logo Kabupaten Balangan">
          <h2>${isUnified ? "Perpustakaan Balangan" : "Perpustakaan"}</h2>
          <p>${isUnified ? "Login Admin dan Kepala" : "Kabupaten Balangan"}</p>
        </div>
        <form class="login-card" data-login-form data-login-role="${escapeHtml(role)}">
          <h3>${isUnified ? "Masuk ke Sistem" : "Masuk ke Sistem"}</h3>
          <p>${isUnified ? "Gunakan akun admin atau kepala perpustakaan untuk masuk." : "Silakan masukkan kredensial akun Anda"}</p>
          <div class="login-alert" data-login-alert hidden></div>
          <label class="auth-field">
            <img class="field-ico-img" src="${assetPath("icons8-login-52.png")}" alt="">
            <input class="input with-ico" type="text" name="identifier" placeholder="Username atau email" autocomplete="username" required />
          </label>
          <label class="auth-field password">
            <img class="field-ico-img" src="${assetPath("icons8-padlock-52.png")}" alt="">
            <input class="input with-ico" type="password" name="password" placeholder="Password" autocomplete="current-password" required />
            <button type="button" class="eye" aria-label="Tampilkan password">
              <img src="${assetPath("hide.png")}" alt="" aria-hidden="true">
            </button>
          </label>
          <button type="submit" class="btn primary login-btn" data-login-submit>${submitLabel}</button>
          <a class="forgot">Lupa Password?</a>
        </form>
      </div>
    </section>
  </div>`;
}
