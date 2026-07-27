import { apiFetch } from "../shared/api.js";
import { escapeHtml, field, renderDocument, renderLabelHtml } from "../shared/components.js?v=20260727";
import { renderKepalaShell } from "../shared/layout-kepala.js";

const roleOptions = [
  { value: "admin", label: "Admin Sistem" },
  { value: "kepala", label: "Kepala Perpustakaan" },
];

const statusOptions = [
  { value: "aktif", label: "Aktif" },
  { value: "nonaktif", label: "Nonaktif" },
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

const content = `<div class="hero-row" style="margin-bottom:18px">
  <div>
    <h1 class="page-title" style="color:#006565">Tambah Pengguna Baru</h1>
    <p class="page-copy">Manajemen Pengguna › Tambah Pengguna</p>
  </div>
</div>
<div class="split" style="grid-template-columns:1.2fr .8fr;align-items:start">
  <section class="panel" style="padding:24px">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px">
      <div>
        <h2 class="panel-title">Informasi Akun Pengguna</h2>
        <p class="page-copy" style="margin-top:6px;font-size:13px">Lengkapi data di bawah ini untuk mendaftarkan administrator atau kepala perpustakaan baru ke dalam sistem.</p>
      </div>
      <a class="modal-close" href="pengguna.html" aria-label="Kembali ke daftar pengguna" style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none">×</a>
    </div>
    <form class="form-grid" style="margin-top:20px" data-user-form>
      ${field("USERNAME *", "", { name: "username", placeholder: "budi.santoso" })}
      ${field("NAMA LENGKAP *", "", { name: "full_name", placeholder: "Contoh: Budi Santoso" })}
      ${field("EMAIL *", "", { name: "email", type: "email", placeholder: "alamat@email.com" })}
      ${field("NOMOR TELEPON", "", { name: "phone", placeholder: "08xxxxxxxxxx" })}
      ${field("UNIT / BAGIAN", "", { name: "unit", placeholder: "Contoh: Layanan Eksekutif" })}
      ${field("NIP / IDENTITAS", "", { name: "nip", placeholder: "Nomor identitas internal" })}
      ${selectField("JABATAN / PERAN *", "role_code", "kepala", roleOptions, { required: true, full: true })}
      ${selectField("STATUS AKUN", "status", "aktif", statusOptions, { full: true })}
      ${field("KATA SANDI *", "", { name: "password", type: "password", placeholder: "Minimal 8 karakter" })}
      ${field("KONFIRMASI KATA SANDI *", "", { name: "password_confirmation", type: "password", placeholder: "Ulangi kata sandi" })}
      <div class="form-actions full">
        <button class="btn primary" type="submit" data-user-submit>Simpan Pengguna</button>
      </div>
    </form>
  </section>
  <div class="panel" style="padding:16px;border-radius:8px">
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="font-size:12px;font-weight:700;color:#006565;letter-spacing:.6px">KEBIJAKAN KEAMANAN</div>
      <p style="margin:0;color:#6e7979;font-size:12px;line-height:18px">Pastikan kata sandi minimal memiliki 8 karakter. Username dan email harus unik agar akun bisa disimpan ke database.</p>
      <div class="login-alert" data-user-alert hidden></div>
      <div style="height:305px;border-radius:6px;overflow:hidden;background:linear-gradient(180deg,#d9e4e6,#8db0b5);position:relative">
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.25));"></div>
        <div style="position:absolute;left:12px;bottom:12px;color:#fff;font-size:12px">Mewujudkan Literasi Digital Unggul di Balangan</div>
      </div>
    </div>
  </div>
</div>`;

renderDocument("Tambah Pengguna Baru", renderKepalaShell("users", "Tambah Pengguna Baru", content, "", { compact: true }));
bindForm();

function setAlert(message) {
  const alertBox = document.querySelector("[data-user-alert]");
  if (!alertBox) return;
  alertBox.hidden = !message;
  alertBox.textContent = message || "";
}

function bindForm() {
  const form = document.querySelector("[data-user-form]");
  const submitButton = document.querySelector("[data-user-submit]");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setAlert("");

    const data = new FormData(form);
    const payload = {
      username: String(data.get("username") || "").trim(),
      full_name: String(data.get("full_name") || "").trim(),
      email: String(data.get("email") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      unit: String(data.get("unit") || "").trim(),
      nip: String(data.get("nip") || "").trim(),
      role_code: String(data.get("role_code") || "kepala").trim(),
      status: String(data.get("status") || "aktif").trim(),
      password: String(data.get("password") || ""),
      password_confirmation: String(data.get("password_confirmation") || ""),
    };

    if (!payload.username || !payload.full_name || !payload.email || !payload.password) {
      setAlert("Username, nama lengkap, email, dan kata sandi wajib diisi.");
      return;
    }

    if (payload.password.length < 8) {
      setAlert("Kata sandi minimal 8 karakter.");
      return;
    }

    if (payload.password !== payload.password_confirmation) {
      setAlert("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Menyimpan...";
    }

    try {
      await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      window.location.href = "pengguna.html";
    } catch (error) {
      setAlert(error?.payload?.message || error?.message || "Gagal menyimpan pengguna.");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Simpan Pengguna";
      }
    }
  });
}
