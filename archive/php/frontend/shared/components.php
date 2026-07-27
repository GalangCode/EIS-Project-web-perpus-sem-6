<?php

function e($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function render_status($value): string
{
    $value = (string) $value;

    if (in_array($value, ['Aktif', 'Tersedia', 'Kembali', 'CUKUP'], true)) {
        return '<span class="pill green">' . e($value) . '</span>';
    }

    if (in_array($value, ['Nonaktif', 'Terlambat', 'Segera', 'KRITIS (2)', 'KRITIS (3)'], true)) {
        return '<span class="pill red">' . e($value) . '</span>';
    }

    if (in_array($value, ['Dipinjam', 'Diproses', 'MENIPIS (8)', 'MENIPIS (3)', 'Stok Menipis'], true)) {
        return '<span class="pill amber">' . e($value) . '</span>';
    }

    if ($value !== '' && str_contains($value, '+')) {
        return '<span class="pill green">' . e($value) . '</span>';
    }

    return e($value);
}

function render_sidebar(string $role, string $active): string
{
    $isKepala = $role === 'kepala';
    $items = $isKepala
        ? [
            ['▦', 'Dasbor Eksekutif', 'dashboard.php', 'headDashboard'],
            ['▤', 'Koleksi', 'koleksi.php', 'collection'],
            ['◒', 'Analitik', 'analitik.php', 'analytics'],
            ['▧', "Manajemen\nPengguna", 'pengguna.php', 'users'],
            ['⚙', 'Pengaturan', 'pengaturan.php', 'settings'],
        ]
        : [
            ['▦', 'Category Management', 'kategori.php', 'category'],
            ['▤', 'Book Management', 'buku.php', 'books'],
            ['◎', 'Member Management', 'anggota.php', 'members'],
            ['↔', 'Circulation', 'sirkulasi.php', 'circulation'],
            ['▣', 'System Reports', 'laporan.php', 'report'],
        ];

    $navTop = array_slice($items, 0, 4);
    $navBottom = array_slice($items, 4);
    $profileName = $isKepala ? 'Kepala Perpustakaan' : 'Admin Perpus';
    $profileRole = $isKepala ? 'EXECUTIVE ADMIN' : 'Administrator';
    $brandSub = 'EXECUTIVE INFORMATION<br>SYSTEM';
    $helpLabel = $isKepala ? 'Pusat Bantuan' : 'Settings';

    $topLinks = '';
    foreach ($navTop as $item) {
        [$icon, $label, $href, $key] = $item;
        $label = nl2br(e($label));
        $topLinks .= '<a class="nav-item ' . ($key === $active ? 'active' : '') . '" href="' . e($href) . '"><span class="ico">' . e($icon) . '</span><span>' . $label . '</span></a>';
    }

    $bottomLinks = '';
    foreach ($navBottom as $item) {
        [$icon, $label, $href, $key] = $item;
        $label = nl2br(e($label));
        $bottomLinks .= '<a class="nav-item ' . ($key === $active ? 'active' : '') . '" href="' . e($href) . '"><span class="ico">' . e($icon) . '</span><span>' . $label . '</span></a>';
    }

    return '<aside class="sidebar ' . ($isKepala ? 'exec' : '') . '">
    <div class="brand">
      <img class="brand-logo" src="../../logo.jpeg" alt="Logo Kabupaten Balangan">
      <div>
        <div class="brand-title">EIS Balangan</div>
        <div class="brand-sub">' . $brandSub . '</div>
      </div>
    </div>
    <nav class="nav">
      ' . $topLinks . '
      <div class="nav-label">' . ($isKepala ? '' : 'REPORTS') . '</div>
      ' . $bottomLinks . '
    </nav>
    <div class="profile">
      <div class="profile-row">
        <div class="avatar">●</div>
        <div>
          <strong>' . e($profileName) . '</strong>
          <span>' . e($profileRole) . '</span>
        </div>
      </div>
      <a class="nav-item" href="login.php"><span class="ico">?</span><span>' . e($helpLabel) . '</span></a>
      <a class="nav-item logout" href="login.php"><span class="ico">↩</span><span>Keluar</span></a>
    </div>
  </aside>';
}

function render_topbar(string $title, string $role = 'admin'): string
{
    $isKepala = $role === 'kepala';

    return '<header class="topbar ' . ($isKepala ? 'head' : '') . '">
    <h1>' . e($title) . '</h1>
    <div class="top-actions">
      <button class="icon-btn">◔<span class="dot"></span></button>
      <button class="icon-btn">' . ($isKepala ? '◐' : '☻') . '</button>
    </div>
  </header>';
}

function render_app_shell(string $role, string $active, string $title, string $content, string $overlay = '', array $opts = []): string
{
    $shellClass = $role === 'kepala' ? 'app-shell exec' : 'app-shell';
    $compact = !empty($opts['compact']) ? ' compact' : '';

    return '<div class="' . $shellClass . '">
    ' . render_sidebar($role, $active) . '
    <main class="main">
      ' . render_topbar($title, $role) . '
      <div class="content' . $compact . '">' . $content . '</div>
    </main>
    ' . $overlay . '
  </div>';
}

function render_stat_card(string $kicker, string $value, string $note, string $icon = '▣', string $tone = 'teal', string $tag = ''): string
{
    $small = strlen($value) > 9 ? ' small' : '';
    $tagHtml = $tag !== '' ? '<span class="pill ' . e($tone) . '">' . e($tag) . '</span>' : '';

    return '<div class="stat-card">
    <div class="stat-head">
      <div class="stat-icon ' . e($tone) . '">' . e($icon) . '</div>
      ' . $tagHtml . '
    </div>
    <p class="stat-kicker">' . e($kicker) . '</p>
    <h2 class="stat-value' . $small . '">' . e($value) . '</h2>
    <p class="stat-note">' . e($note) . '</p>
  </div>';
}

function render_panel(string $title, string $badge, string $actions, string $body, bool $footer = true): string
{
    $badgeHtml = $badge !== '' ? '<span class="pill teal">' . e($badge) . '</span>' : '';
    $footerHtml = $footer
        ? '<div class="pagination"><span>Menampilkan 1 sampai 5 dari 24 data</span><div class="pages"><button class="page-btn">‹</button><button class="page-btn active">1</button><button class="page-btn">2</button><button class="page-btn">3</button><button class="page-btn">›</button></div></div>'
        : '';

    return '<section class="panel">
    <div class="panel-toolbar">
      <div class="panel-title-wrap">
        <h2 class="panel-title">' . e($title) . '</h2>
        ' . $badgeHtml . '
      </div>
      <div class="toolbar-actions">' . $actions . '</div>
    </div>
    ' . $body . '
    ' . $footerHtml . '
  </section>';
}

function render_data_table(array $headers, array $rows, array $opts = []): string
{
    $withActions = !array_key_exists('actions', $opts) || $opts['actions'] !== false;
    $widths = $opts['widths'] ?? [];

    $headerHtml = '';
    foreach ($headers as $i => $header) {
        $headerHtml .= '<th style="width:' . e($widths[$i] ?? 'auto') . '">' . e($header) . '</th>';
    }
    if ($withActions) {
        $headerHtml .= '<th style="width:120px">AKSI</th>';
    }

    $bodyHtml = '';
    foreach ($rows as $row) {
        $rowHtml = '';
        foreach ($row as $i => $cell) {
            $cell = (string) $cell;
            $bold = $i === 1 || $i === 0 || str_contains($cell, 'KAT-');
            $content = $bold ? '<strong>' . e($cell) . '</strong>' : render_status($cell);
            $rowHtml .= '<td>' . $content . '</td>';
        }
        if ($withActions) {
            $rowHtml .= '<td><div class="actions"><button class="row-btn">✎</button><button class="row-btn">⌫</button></div></td>';
        }
        $bodyHtml .= '<tr>' . $rowHtml . '</tr>';
    }

    return '<table class="data-table">
    <thead><tr>' . $headerHtml . '</tr></thead>
    <tbody>' . $bodyHtml . '</tbody>
  </table>';
}

function render_form_page(string $role, string $active, string $title, string $subtitle, array $fields, array $opts = []): string
{
    $grid = '';
    foreach ($fields as $field) {
        $grid .= '<div class="field ' . (!empty($field['full']) ? 'full' : '') . '">
        <label>' . e($field['label']) . '</label>
        <div class="input ' . (!empty($field['textarea']) ? 'textarea' : '') . '">' . e($field['value']) . '</div>
      </div>';
    }

    return render_app_shell(
        $role,
        $active,
        $title,
        '<div class="hero-row"><div><h1 class="page-title">' . e($title) . '</h1><p class="page-copy">' . e($subtitle) . '</p></div></div>
     <section class="form-shell ' . (!empty($opts['slim']) ? 'slim' : '') . '">
       <div class="form-grid">' . $grid . '</div>
       <div class="form-actions"><button class="btn">Batal</button><button class="btn primary">Simpan</button></div>
     </section>',
        '',
        ['compact' => true],
    );
}

function render_login_page(string $role): string
{
    $isKepala = $role === 'kepala';
    $loginTarget = $isKepala ? 'dashboard.php' : 'kategori.php';

    return '<div class="login-shell">
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
          <a href="' . e($loginTarget) . '" class="btn primary login-btn">Login</a>
          <a class="forgot">Lupa Password?</a>
        </div>
      </div>
    </section>
  </div>';
}

function render_document(string $title, string $body, string $cssPath = '../shared/styles.css'): void
{
    echo '<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>' . e($title) . ' - EIS Balangan</title>
    <link rel="stylesheet" href="' . e($cssPath) . '" />
  </head>
  <body>' . $body . '</body>
</html>';
}
