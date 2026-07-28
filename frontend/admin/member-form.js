import { escapeHtml, field, renderLabelHtml } from "../shared/components.js";

export const MEMBER_FIELD_ORDER = [
  "full_name",
  "nik",
  "birth_date",
  "gender",
  "phone",
  "address",
  "status",
];

export const MEMBER_GENDER_OPTIONS = [
  { value: "Laki-laki", label: "Laki-laki" },
  { value: "Perempuan", label: "Perempuan" },
];

export const MEMBER_STATUS_OPTIONS = [
  { value: "Aktif", label: "Aktif" },
  { value: "Nonaktif", label: "Nonaktif" },
];

function wrapField(name, innerHtml) {
  return `<div class="member-field" data-member-field="${escapeHtml(name)}">
    ${innerHtml}
    <p class="field-error" data-error-for="${escapeHtml(name)}" hidden></p>
  </div>`;
}

export function memberField(name, label, value = "", opts = {}) {
  return wrapField(
    name,
    field(label, value, {
      ...opts,
      name,
      attrs: {
        ...(opts.attrs || {}),
        "data-member-input": name,
      },
    }),
  );
}

export function memberSelectField(name, label, value = "", options = [], opts = {}) {
  return wrapField(
    name,
    `<div class="field ${opts.full ? "full" : ""}">
      <label>${renderLabelHtml(label)}</label>
      <select class="input" name="${escapeHtml(name)}" data-member-input="${escapeHtml(name)}" ${opts.required ? "required" : ""}>
        ${options
          .map((option) => `<option value="${escapeHtml(option.value)}"${option.value === value ? " selected" : ""}>${escapeHtml(option.label)}</option>`)
          .join("")}
      </select>
    </div>`,
  );
}

export function memberCodeField(value = "", readonly = true) {
  return wrapField(
    "member_code",
    `<div class="field full">
      <label>KODE ANGGOTA</label>
      <input class="input" type="text" value="${escapeHtml(value)}" readonly ${readonly ? 'aria-readonly="true"' : ""} />
    </div>`,
  );
}

export function readMemberForm(form) {
  const data = new FormData(form);
  return {
    id: Number(data.get("id") || 0),
    full_name: String(data.get("full_name") || ""),
    nik: String(data.get("nik") || ""),
    birth_date: String(data.get("birth_date") || ""),
    gender: String(data.get("gender") || ""),
    phone: String(data.get("phone") || ""),
    address: String(data.get("address") || ""),
    city: String(data.get("city") || ""),
    email: String(data.get("email") || ""),
    status: String(data.get("status") || ""),
  };
}

export function setMemberFieldError(form, name, message = "") {
  const fieldWrap = form.querySelector(`[data-member-field="${CSS.escape(name)}"]`);
  const input = fieldWrap?.querySelector(`[data-member-input="${CSS.escape(name)}"]`);
  const error = fieldWrap?.querySelector(`[data-error-for="${CSS.escape(name)}"]`);

  fieldWrap?.classList.toggle("has-error", Boolean(message));
  input?.classList.toggle("is-invalid", Boolean(message));
  if (input) {
    input.setAttribute("aria-invalid", message ? "true" : "false");
  }

  if (error) {
    error.textContent = message;
    error.hidden = !message;
  }
}

export function setMemberErrors(form, errors = {}) {
  MEMBER_FIELD_ORDER.forEach((name) => {
    setMemberFieldError(form, name, errors?.[name] || "");
  });
}

export function clearMemberErrors(form) {
  setMemberErrors(form, {});
}

export function focusFirstMemberError(form, errors = {}) {
  const firstField = MEMBER_FIELD_ORDER.find((name) => errors?.[name]);
  if (!firstField) {
    return;
  }

  const input = form.querySelector(`[data-member-input="${CSS.escape(firstField)}"]`);
  if (input && typeof input.focus === "function") {
    input.focus();
  }
}

export function attachDigitOnlyGuard(input) {
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  if (input.dataset.digitGuard === "true") {
    return;
  }

  const isValidDigits = (text) => /^\d*$/.test(text);

  input.addEventListener("beforeinput", (event) => {
    if (!(event instanceof InputEvent)) {
      return;
    }

    if (event.inputType.startsWith("delete")) {
      return;
    }

    const data = event.data ?? "";
    if (data && !isValidDigits(data)) {
      event.preventDefault();
    }
  });

  input.addEventListener("paste", (event) => {
    const text = event.clipboardData?.getData("text") ?? "";
    if (text && !isValidDigits(text)) {
      event.preventDefault();
    }
  });

  input.dataset.digitGuard = "true";
}

export function attachDateMask(input) {
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  if (input.dataset.dateMask === "true") {
    return;
  }

  const formatDate = (value) => {
    const digits = String(value ?? "")
      .replace(/\D/g, "")
      .slice(0, 8);

    if (digits.length <= 2) {
      return digits;
    }

    if (digits.length <= 4) {
      return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    }

    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
  };

  const sync = () => {
    const formatted = formatDate(input.value);
    if (input.value !== formatted) {
      input.value = formatted;
    }
  };

  input.addEventListener("input", sync);
  input.addEventListener("paste", () => {
    window.requestAnimationFrame(sync);
  });

  input.dataset.dateMask = "true";
  sync();
}
