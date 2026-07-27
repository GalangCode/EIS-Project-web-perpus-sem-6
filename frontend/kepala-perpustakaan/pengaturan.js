import { apiFetch } from "../shared/api.js";
import { escapeHtml, field, renderDocument, stat } from "../shared/components.js";
import { renderKepalaShell } from "../shared/layout-kepala.js";

const SETTINGS_META = [
  { key: "app_name", label: "Nama Aplikasi", group: "profil", type: "text", full: false },
  { key: "institution_name", label: "Nama Instansi", group: "profil", type: "text", full: true },
  { key: "head_name", label: "Nama Kepala Perpustakaan", group: "profil", type: "text", full: false },
  { key: "head_nip", label: "NIP Kepala", group: "profil", type: "text", full: false },
  { key: "head_title", label: "Jabatan", group: "profil", type: "text", full: true },
  { key: "head_email", label: "Email", group: "kontak", type: "email", full: false },
  { key: "head_phone", label: "Telepon", group: "kontak", type: "text", full: false },
  { key: "loan_days", label: "Lama Pinjam (hari)", group: "operasional", type: "number", full: false },
  { key: "fine_per_day", label: "Denda per Hari (Rp)", group: "operasional", type: "number", full: false },
];

const DEFAULT_SETTINGS = Object.fromEntries(
  SETTINGS_META.map((item) => [
    item.key,
    item.key === "app_name"
      ? "EIS Balangan"
      : item.key === "institution_name"
        ? "Perpustakaan Daerah Balangan"
        : item.key === "head_name"
          ? "Kepala Perpustakaan"
          : item.key === "head_title"
            ? "Kepala Perpustakaan Daerah"
            : item.key === "loan_days"
              ? "7"
              : item.key === "fine_per_day"
                ? "1000"
                : "",
  ]),
);

const state = {
  loading: true,
  saving: false,
  error: "",
  message: "",
  settings: { ...DEFAULT_SETTINGS },
  initialSettings: { ...DEFAULT_SETTINGS },
};

function formatNumber(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}

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

function normalizeSettings(items) {
  const next = { ...DEFAULT_SETTINGS };
  const rows = Array.isArray(items) ? items : [];

  rows.forEach((item) => {
    const key = String(item?.key || "");
    if (!key || !(key in next)) return;
    next[key] = String(item?.value ?? next[key] ?? "");
  });

  return next;
}

function getSettingMeta(key) {
  return SETTINGS_META.find((item) => item.key === key) || null;
}

function getLastUpdated() {
  const items = state.lastFetched || [];
  const values = items
    .map((item) => item?.updated_at || null)
    .filter(Boolean)
    .map((value) => new Date(String(value).replace(" ", "T")))
    .filter((date) => !Number.isNaN(date.getTime()));
  if (!values.length) return "-";
  values.sort((a, b) => b.getTime() - a.getTime());
  return formatDateTime(values[0].toISOString().slice(0, 19).replace("T", " "));
}

function renderStatusBanner() {
  if (state.error) {
    return `<div class="head-error">${escapeHtml(state.error)}</div>`;
  }

  if (state.message) {
    return `<section class="panel" style="padding:14px 16px;border-left:4px solid var(--teal);margin-bottom:16px">
      <div style="font-size:13px;color:#0a6365;line-height:18px">${escapeHtml(state.message)}</div>
    </section>`;
  }

  return "";
}

function renderStatGrid() {
  const institution = state.settings.institution_name || DEFAULT_SETTINGS.institution_name;
  const headName = state.settings.head_name || DEFAULT_SETTINGS.head_name;
  const loanDays = Number(state.settings.loan_days || 0);
  const finePerDay = Number(state.settings.fine_per_day || 0);

  return `<div class="stats-4">
    ${stat("INSTANSI AKTIF", institution, "Tersimpan di app_settings", "▣", "teal")}
    ${stat("KEPALA PERPUSTAKAAN", headName, "Profil eksekutif utama", "◉", "blue")}
    ${stat("LAMA PINJAM", `${formatNumber(loanDays)} hari`, "Parameter peminjaman saat ini", "↺", "green")}
    ${stat("DENDA HARIAN", `Rp ${formatNumber(finePerDay)}`, "Aturan keterlambatan aktif", "₽", "amber")}
  </div>`;
}

function renderInfoCard() {
  return `<section class="panel" style="padding:18px">
    <div class="panel-title-wrap" style="margin-bottom:10px">
      <h2 class="panel-title">Keterangan Data</h2>
      <span class="pill teal">DATABASE</span>
    </div>
    <div class="page-copy" style="font-size:13px;line-height:20px">
      Nilai di bawah ini dibaca dari tabel <strong>app_settings</strong> dan bisa dipakai modul lain sebagai konfigurasi global.
      Perubahan akan langsung disimpan ke database saat tombol simpan ditekan.
    </div>
    <div style="margin-top:12px;font-size:12px;color:#6e7979">
      Pembaruan terakhir: ${escapeHtml(getLastUpdated())}
    </div>
  </section>`;
}

function renderForm() {
  const fieldGroups = [
    {
      title: "Profil Eksekutif",
      keys: ["app_name", "institution_name", "head_name", "head_nip", "head_title"],
    },
    {
      title: "Kontak & Operasional",
      keys: ["head_email", "head_phone", "loan_days", "fine_per_day"],
    },
  ];

  const sections = fieldGroups
    .map((group) => {
      const controls = group.keys
        .map((key) => {
          const meta = getSettingMeta(key);
          if (!meta) return "";
          const value = state.settings[key] ?? "";
          return field(meta.label, value, {
            name: key,
            type: meta.type,
            full: meta.full,
            placeholder: meta.label,
          });
        })
        .join("");

      return `<section class="panel" style="padding:18px">
        <div class="panel-title-wrap" style="margin-bottom:14px">
          <h2 class="panel-title">${escapeHtml(group.title)}</h2>
          <span class="pill teal">${escapeHtml(group.keys.length)} ITEM</span>
        </div>
        <div class="form-grid">
          ${controls}
        </div>
      </section>`;
    })
    .join("");

  return `<form class="form-shell slim" data-settings-form>
    ${sections}
    <section class="panel" style="padding:18px">
      <div class="form-actions" style="justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div style="font-size:12px;color:#6e7979;line-height:18px">
          Pastikan nilai numerik diisi angka bulat. Data ini akan dipakai untuk batas pinjam dan perhitungan denda.
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn" type="button" data-settings-reset>Batal</button>
          <button class="btn primary" type="submit" data-settings-save${state.saving ? " disabled" : ""}>${state.saving ? "Menyimpan..." : "Simpan"}</button>
        </div>
      </div>
    </section>
  </form>`;
}

function renderContent() {
  if (state.loading) {
    return `<div class="head-loading">Memuat pengaturan...</div>`;
  }

  if (state.error) {
    return `<div class="head-error">${escapeHtml(state.error)}</div>`;
  }

  return `<div class="report-page">
    <div class="hero-row">
      <div>
        <h1 class="page-title" style="color:#006565">Pengaturan Sistem</h1>
        <p class="page-copy">Kelola profil eksekutif dan parameter operasional perpustakaan yang tersimpan di database.</p>
      </div>
    </div>
    ${renderStatusBanner()}
    ${renderStatGrid()}
    <div class="split" style="margin-top:24px;align-items:start">
      <div style="display:grid;gap:16px">
        ${renderForm()}
      </div>
      <div style="display:grid;gap:16px">
        ${renderInfoCard()}
        <section class="panel" style="padding:18px">
          <h2 class="panel-title" style="margin-bottom:8px">Dampak Perubahan</h2>
          <div class="page-copy" style="font-size:13px;line-height:20px">
            <strong>Nama Aplikasi</strong> dipakai di judul antarmuka.
            <br>
            <strong>Nama Instansi</strong> dan <strong>Nama Kepala</strong> dipakai sebagai identitas utama.
            <br>
            <strong>Lama Pinjam</strong> dan <strong>Denda per Hari</strong> dipakai modul sirkulasi dan laporan keterlambatan.
          </div>
        </section>
      </div>
    </div>
  </div>`;
}

function renderPage() {
  renderDocument("Pengaturan Sistem", renderKepalaShell("settings", "Pengaturan Sistem", renderContent(), "", { compact: true }));
  bindHandlers();
}

function bindHandlers() {
  const form = document.querySelector("[data-settings-form]");
  const resetButton = document.querySelector("[data-settings-reset]");

  if (form) {
    form.addEventListener("submit", handleSubmit);
  }

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      state.settings = { ...state.initialSettings };
      state.message = "Perubahan dibatalkan.";
      state.error = "";
      renderPage();
    });
  }
}

async function loadSettings() {
  state.loading = true;
  state.error = "";
  renderPage();

  try {
    const response = await apiFetch("/api/settings");
    const items = response?.data?.settings || [];
    state.settings = normalizeSettings(items);
    state.initialSettings = { ...state.settings };
    state.lastFetched = items;
    state.message = "";
  } catch (error) {
    state.error = error?.message || "Gagal memuat pengaturan.";
  } finally {
    state.loading = false;
    renderPage();
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const payload = {};
  for (const [key, value] of formData.entries()) {
    payload[key] = String(value).trim();
  }

  const loanDays = Number.parseInt(payload.loan_days || "0", 10);
  const finePerDay = Number.parseInt(payload.fine_per_day || "0", 10);

  if (!Number.isInteger(loanDays) || loanDays < 0) {
    state.error = "Lama pinjam harus berupa angka bulat positif.";
    state.message = "";
    renderPage();
    return;
  }

  if (!Number.isInteger(finePerDay) || finePerDay < 0) {
    state.error = "Denda per hari harus berupa angka bulat positif.";
    state.message = "";
    renderPage();
    return;
  }

  state.saving = true;
  state.error = "";
  state.message = "";
  renderPage();

  try {
    const response = await apiFetch("/api/settings", {
      method: "PUT",
      body: JSON.stringify({ settings: payload }),
    });

    state.settings = normalizeSettings(response?.data?.settings || []);
    state.initialSettings = { ...state.settings };
    state.lastFetched = response?.data?.settings || [];
    state.message = "Pengaturan berhasil disimpan.";
  } catch (error) {
    state.error = error?.message || "Gagal menyimpan pengaturan.";
  } finally {
    state.saving = false;
    renderPage();
  }
}

loadSettings();
