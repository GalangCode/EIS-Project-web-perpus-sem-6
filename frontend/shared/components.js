export const navAdmin = [
  ["▦", "Category Management", "kategori.html", "category"],
  ["▤", "Book Management", "buku.html", "books"],
  ["◎", "Member Management", "anggota.html", "members"],
  ["↔", "Circulation", "sirkulasi.html", "circulation"],
  ["▣", "System Reports", "laporan.html", "report"],
];

export const navKepala = [
  ["▦", "Dasbor Eksekutif", "dashboard.html", "headDashboard"],
  ["▤", "Koleksi", "koleksi.html", "collection"],
  ["◒", "Analitik", "analitik.html", "analytics"],
  ["▧", "Manajemen\nPengguna", "pengguna.html", "users"],
  ["⚙", "Pengaturan", "pengaturan.html", "settings"],
];

export function mount(html, title = "EIS Balangan") {
  document.title = `${title} - EIS Balangan`;
  document.getElementById("app").innerHTML = html;
}

export function status(value) {
  if (["Aktif", "Tersedia", "Kembali", "CUKUP"].includes(value)) return `<span class="pill green">${value}</span>`;
  if (["Nonaktif", "Terlambat", "Segera", "KRITIS (2)", "KRITIS (3)"].includes(value)) return `<span class="pill red">${value}</span>`;
  if (["Dipinjam", "Diproses", "MENIPIS (8)", "MENIPIS (3)", "Stok Menipis"].includes(value)) return `<span class="pill amber">${value}</span>`;
  if (value && String(value).includes("+")) return `<span class="pill green">${value}</span>`;
  return value;
}

export function sidebar(role, active) {
  const isKepala = role === "kepala";
  const items = isKepala ? navKepala : navAdmin;
  const login = isKepala ? "login.html" : "login.html";
  const profileName = isKepala ? "Kepala Perpustakaan" : "Admin Perpus";
  const profileRole = isKepala ? "EXECUTIVE ADMIN" : "Administrator";

  return `<aside class="sidebar ${isKepala ? "exec" : ""}">
    <div class="brand">
      <img class="brand-logo" src="../../logo.jpeg" alt="Logo Kabupaten Balangan">
      <div>
        <div class="brand-title">EIS Balangan</div>
        <div class="brand-sub">${isKepala ? "EXECUTIVE INFORMATION\nSYSTEM" : "EXECUTIVE INFORMATION\nSYSTEM"}</div>
      </div>
    </div>
    <nav class="nav">
      ${items
        .slice(0, 4)
        .map(
          (i) => `<a class="nav-item ${i[3] === active ? "active" : ""}" href="${i[2]}"><span class="ico">${i[0]}</span><span>${i[1]}</span></a>`,
        )
        .join("")}
      <div class="nav-label">${isKepala ? "" : "REPORTS"}</div>
      ${items
        .slice(4)
        .map(
          (i) => `<a class="nav-item ${i[3] === active ? "active" : ""}" href="${i[2]}"><span class="ico">${i[0]}</span><span>${i[1]}</span></a>`,
        )
        .join("")}
    </nav>
    <div class="profile">
      <div class="profile-row">
        <div class="avatar">●</div>
        <div>
          <strong>${profileName}</strong>
          <span>${profileRole}</span>
        </div>
      </div>
      <a class="nav-item" href="${login}"><span class="ico">?</span><span>${isKepala ? "Pusat Bantuan" : "Settings"}</span></a>
      <a class="nav-item logout" href="${login}"><span class="ico">↩</span><span>Keluar</span></a>
    </div>
  </aside>`;
}

export function topbar(title, role = "admin") {
  const isKepala = role === "kepala";
  return `<header class="topbar ${isKepala ? "head" : ""}">
    <h1>${title}</h1>
    <div class="top-actions">
      <button class="icon-btn">◔<span class="dot"></span></button>
      <button class="icon-btn">${isKepala ? "◐" : "☻"}</button>
    </div>
  </header>`;
}

export function appShell(role, active, title, content, overlay = "", opts = {}) {
  const shellClass = role === "kepala" ? "app-shell exec" : "app-shell";
  return `<div class="${shellClass}">
    ${sidebar(role, active)}
    <main class="main">
      ${topbar(title, role)}
      <div class="content ${opts.compact ? "compact" : ""}">${content}</div>
    </main>
    ${overlay || ""}
  </div>`;
}

export function stat(kicker, value, note, icon = "▣", tone = "teal", tag = "") {
  const small = String(value).length > 9 ? "small" : "";
  return `<div class="stat-card">
    <div class="stat-head">
      <div class="stat-icon ${tone}">${icon}</div>
      ${tag ? `<span class="pill ${tone}">${tag}</span>` : ""}
    </div>
    <p class="stat-kicker">${kicker}</p>
    <h2 class="stat-value ${small}">${value}</h2>
    <p class="stat-note">${note}</p>
  </div>`;
}

export function panel(title, badge, actions, body, footer = true) {
  return `<section class="panel">
    <div class="panel-toolbar">
      <div class="panel-title-wrap">
        <h2 class="panel-title">${title}</h2>
        ${badge ? `<span class="pill teal">${badge}</span>` : ""}
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
      .map((h, i) => `<th style="width:${widths[i] || "auto"}">${h}</th>`)
      .join("")}${withActions ? "<th style=\"width:120px\">AKSI</th>" : ""}</tr></thead>
    <tbody>${rows
      .map(
        (row) =>
          `<tr>${row
            .map((cell, i) => `<td>${i === 1 || i === 0 || String(cell).includes("KAT-") ? `<strong>${cell}</strong>` : status(cell)}</td>`)
            .join("")}${withActions ? `<td><div class="actions"><button class="row-btn">✎</button><button class="row-btn">⌫</button></div></td>` : ""}</tr>`,
      )
      .join("")}</tbody>
  </table>`;
}

export function formPage(role, active, title, subtitle, fields, opts = {}) {
  const grid = fields
    .map(
      (f) => `<div class="field ${f.full ? "full" : ""}">
        <label>${f.label}</label>
        <div class="input ${f.textarea ? "textarea" : ""}">${f.value}</div>
      </div>`,
    )
    .join("");
  return appShell(
    role,
    active,
    title,
    `<div class="hero-row"><div><h1 class="page-title">${title}</h1><p class="page-copy">${subtitle}</p></div></div>
     <section class="form-shell ${opts.slim ? "slim" : ""}">
       <div class="form-grid">${grid}</div>
       <div class="form-actions"><button class="btn">Batal</button><button class="btn primary">Simpan</button></div>
     </section>`,
    "",
    { compact: true },
  );
}

export function loginPage(role) {
  const isKepala = role === "kepala";
  return `<div class="login-shell">
    <section class="login-left">
      <img class="login-photo" src="../../gambar%20login.jpg" alt="">
      <div class="login-overlay"></div>
      <div class="welcome">
        <h1>Selamat Datang di<br>Perpustakaan<br>Balangan</h1>
        <p>Sistem Informasi Eksekutif Peminjaman Buku Perpustakaan Daerah.<br>Akses data dan analitik secara komprehensif.</p>
      </div>
    </section>
    <section class="login-right">
      <div class="login-box">
        <div class="login-brand">
          <img class="login-brand-logo" src="../../logo.jpeg" alt="Logo Kabupaten Balangan">
          <h2>Perpustakaan</h2>
          <p>Kabupaten Balangan</p>
        </div>
        <div class="login-card">
          <h3>Masuk ke Sistem</h3>
          <p>Silakan masukkan kredensial akun Anda</p>
          <div class="input with-ico"><span class="field-ico">👤</span>Username</div>
          <div class="input with-ico password"><span class="field-ico">🔒</span>Password<span class="eye">👁</span></div>
          <a href="${isKepala ? "dashboard.html" : "kategori.html"}" class="btn primary login-btn">Login</a>
          <a class="forgot">Lupa Password?</a>
        </div>
      </div>
    </section>
  </div>`;
}
