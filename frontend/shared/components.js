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

export function panel(title, badge, actions, body, footer = true) {
  return `<section class="panel">
    <div class="panel-toolbar">
      <div class="panel-title-wrap">
        <h2 class="panel-title">${escapeHtml(title)}</h2>
        ${badge ? `<span class="pill teal">${escapeHtml(badge)}</span>` : ""}
      </div>
      <div class="toolbar-actions">${actions || ""}</div>
    </div>
    ${body}
    ${footer ? `<div class="pagination"><span>Menampilkan 1 sampai 5 dari 24 data</span><div class="pages"><button class="page-btn">‹</button><button class="page-btn active">1</button><button class="page-btn">2</button><button class="page-btn">3</button><button class="page-btn">›</button></div></div>` : ""}
  </section>`;
}

export function dataTable(headers, rows, opts = {}) {
  const withActions = opts.actions !== false;
  const widths = opts.widths || [];
  return `<table class="data-table">
    <thead><tr>${headers
      .map((h, i) => `<th style="width:${widths[i] || "auto"}">${escapeHtml(h)}</th>`)
      .join("")}${withActions ? '<th style="width:120px">AKSI</th>' : ""}</tr></thead>
    <tbody>${rows
      .map(
        (row) =>
          `<tr>${row
            .map((cell, i) => `<td>${i === 1 || i === 0 || String(cell).includes("KAT-") ? `<strong>${escapeHtml(cell)}</strong>` : status(cell)}</td>`)
            .join("")}${withActions ? `<td><div class="actions"><button class="row-btn">✎</button><button class="row-btn">⌫</button></div></td>` : ""}</tr>`,
      )
      .join("")}</tbody>
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
      ? `<textarea class="${className}"${name}${rows} placeholder="${placeholder}">${escapeHtml(value)}</textarea>`
      : tag === "select"
        ? `<select class="${className}"${name}>${options}</select>`
        : `<input class="${className}"${name}${type} value="${escapeHtml(value)}" placeholder="${placeholder}" />`;
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
          <img class="login-brand-logo" src="${assetPrefix}/logo.jpeg" alt="Logo Kabupaten Balangan">
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
