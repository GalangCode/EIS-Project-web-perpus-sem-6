import { apiFetch } from "../shared/api.js";
import { escapeHtml, field, renderDocument, renderLabelHtml } from "../shared/components.js?v=20260727";
import { renderAdminShell } from "../shared/layout-admin.js";

const params = new URLSearchParams(window.location.search);
const editId = Number(params.get("id") || 0);

const state = {
  member: null,
  loading: editId > 0,
  saving: false,
  error: "",
};

const genderOptions = [
  { value: "laki-laki", label: "Laki-laki" },
  { value: "perempuan", label: "Perempuan" },
];

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

function currentDate() {
  return new Date().toISOString().slice(0, 10);
}

function renderPage() {
  const member = state.member;
  const title = editId > 0 ? "Edit Anggota" : "Tambah Anggota Baru";
  const submitLabel = editId > 0 ? "Simpan Perubahan" : "Simpan";
  const heroCopy = editId > 0
    ? "Perbarui informasi anggota yang sudah tersimpan di database."
    : "Lengkapi data anggota baru untuk pendaftaran ke sistem perpustakaan.";
  const infoText = editId > 0
    ? "Pastikan data yang diubah sesuai identitas terbaru anggota."
    : "Data anggota akan dibuat otomatis di database members setelah disimpan.";

  const content = `<div class="hero-row">
    <div>
      <h1 class="page-title">${title}</h1>
      <p class="page-copy">${heroCopy}</p>
    </div>
  </div>
  <div class="split">
    <section class="panel">
      <div class="panel-toolbar" style="min-height:auto;padding-bottom:0;justify-content:space-between;gap:16px">
        <div>
          <h2 class="panel-title">Informasi Anggota</h2>
          <p class="page-copy" style="margin-top:6px;font-size:14px">${infoText}</p>
        </div>
        <a class="modal-close" href="anggota.html" aria-label="Kembali ke daftar anggota" style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none">×</a>
      </div>
      <div class="form-shell slim" style="border:0;box-shadow:none;padding:20px 0 0">
        <form class="form-grid" data-member-form>
          <input type="hidden" name="id" value="${escapeHtml(member?.id || editId || 0)}" />
          <div class="field full">
            <label>KODE ANGGOTA</label>
            <input class="input" type="text" value="${escapeHtml(member?.member_code || "Otomatis saat disimpan")}" readonly />
          </div>
          ${field("NAMA LENGKAP *", member?.full_name || "", { name: "full_name", placeholder: "Masukkan nama sesuai KTP", full: true })}
          <div class="split" style="gap:16px">
            ${field("NIK", member?.nik || "", { name: "nik", placeholder: "Masukkan 16 digit NIK" })}
            ${field("TANGGAL LAHIR", member?.birth_date || "", { name: "birth_date", type: "date" })}
          </div>
          <div class="split" style="gap:16px">
            ${selectField("JENIS KELAMIN *", "gender", member?.gender || "laki-laki", genderOptions, { required: true })}
            ${field("KOTA", member?.city || "", { name: "city", placeholder: "Contoh: Paringin" })}
          </div>
          <div class="split" style="gap:16px">
            ${field("TELEPON", member?.phone || "", { name: "phone", placeholder: "08xxxxxxxxxx" })}
            ${field("EMAIL", member?.email || "", { name: "email", type: "email", placeholder: "nama@email.com" })}
          </div>
          ${field("ALAMAT", member?.address || "", { name: "address", textarea: true, placeholder: "Alamat lengkap", full: true, rows: 4 })}
          ${selectField("STATUS", "status", member?.status || "aktif", [
            { value: "aktif", label: "Aktif" },
            { value: "nonaktif", label: "Nonaktif" },
          ], { full: true })}
          <div class="form-actions">
            <button class="btn primary" type="submit">${submitLabel}</button>
          </div>
        </form>
      </div>
    </section>
    <div class="panel" style="padding:16px;border-radius:8px">
      <div style="display:flex;flex-direction:column;gap:12px">
        <div style="font-size:12px;font-weight:700;color:#006565;letter-spacing:.6px">PETUNJUK DATA</div>
        <p style="margin:0;color:#6e7979;font-size:12px;line-height:18px">Gunakan data identitas yang benar agar riwayat sirkulasi, keanggotaan, dan pelaporan perpustakaan tetap konsisten.</p>
        <div style="height:305px;border-radius:6px;overflow:hidden;background:linear-gradient(180deg,#d9e4e6,#8db0b5);position:relative">
          <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.25));"></div>
          <div style="position:absolute;left:12px;bottom:12px;color:#fff;font-size:12px">Mewujudkan Literasi Digital Unggul di Balangan</div>
        </div>
      </div>
    </div>
  </div>`;

  renderDocument(title, renderAdminShell("members", title, content, "", { compact: true }));
  bindForm();
}

function bindForm() {
  const form = document.querySelector("[data-member-form]");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Menyimpan...";
    }

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

    try {
      await apiFetch("/api/members", {
        method: editId > 0 ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      window.location.href = "anggota.html";
    } catch (error) {
      window.alert(error?.payload?.message || error?.message || "Gagal menyimpan anggota.");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = editId > 0 ? "Simpan Perubahan" : "Simpan";
      }
    }
  });
}

async function loadMemberForEdit() {
  if (editId <= 0) {
    state.loading = false;
    renderPage();
    return;
  }

  try {
    const response = await apiFetch("/api/members");
    const payload = response?.data || {};
    const items = Array.isArray(payload.items) ? payload.items : [];
    state.member = items.find((item) => Number(item.id) === editId) || null;
    if (!state.member) {
      state.error = "Anggota tidak ditemukan.";
    }
  } catch (error) {
    state.error = error?.payload?.message || error?.message || "Gagal memuat data anggota.";
  } finally {
    state.loading = false;
    renderPage();
  }
}

renderPage();
loadMemberForEdit();
