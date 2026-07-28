function toText(value) {
  return String(value ?? "");
}

function trimAndCollapse(value) {
  return toText(value)
    .trim()
    .replace(/\s+/g, " ");
}

function textLength(value) {
  return trimAndCollapse(value).length;
}

function parseBirthDate(value) {
  const raw = trimAndCollapse(value);
  if (raw === "") {
    return null;
  }

  let year;
  let month;
  let day;

  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    [day, month, year] = raw.split("-").map((part) => Number(part));
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    [year, month, day] = raw.split("-").map((part) => Number(part));
  } else {
    return null;
  }

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

function formatYmd(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function sanitizeInput(value) {
  return trimAndCollapse(value);
}

export function formatBirthDateDisplay(value) {
  const birthDate = parseBirthDate(value);
  if (!birthDate) {
    return "";
  }

  const day = String(birthDate.getDate()).padStart(2, "0");
  const month = String(birthDate.getMonth() + 1).padStart(2, "0");
  const year = birthDate.getFullYear();
  return `${day}-${month}-${year}`;
}

export function calculateAge(value, referenceDate = new Date()) {
  const birthDate = parseBirthDate(value);
  if (!birthDate) {
    return null;
  }

  const reference = new Date(referenceDate);
  if (Number.isNaN(reference.getTime())) {
    return null;
  }

  let age = reference.getFullYear() - birthDate.getFullYear();
  const monthDiff = reference.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age;
}

export function validateNIK(value) {
  const nik = toText(value).trim();
  if (nik === "") {
    return { valid: false, value: nik, error: "NIK wajib diisi." };
  }

  if (!/^\d+$/.test(nik)) {
    return { valid: false, value: nik, error: "NIK hanya boleh berisi angka." };
  }

  if (nik.length !== 16) {
    return { valid: false, value: nik, error: "NIK harus terdiri dari tepat 16 digit." };
  }

  return { valid: true, value: nik, error: "" };
}

export function validatePhone(value) {
  const phone = toText(value).trim();
  if (phone === "") {
    return { valid: false, value: phone, error: "Nomor telepon wajib diisi." };
  }

  if (!/^\d+$/.test(phone)) {
    return { valid: false, value: phone, error: "Nomor telepon hanya boleh berisi angka." };
  }

  if (!/^(?:08\d{8,13}|628\d{7,12})$/.test(phone)) {
    return { valid: false, value: phone, error: "Nomor telepon tidak valid." };
  }

  return { valid: true, value: phone, error: "" };
}

export function normalizeGenderValue(value) {
  const raw = trimAndCollapse(value).toLowerCase();
  if (raw === "laki-laki" || raw === "laki laki" || raw === "laki") {
    return "Laki-laki";
  }

  if (raw === "perempuan" || raw === "wanita") {
    return "Perempuan";
  }

  return "";
}

export function normalizeStatusValue(value) {
  const raw = trimAndCollapse(value).toLowerCase();
  if (raw === "aktif") return "Aktif";
  if (raw === "nonaktif" || raw === "non aktif") return "Nonaktif";
  return "";
}

export function validateBirthDate(value) {
  const birthDate = parseBirthDate(value);
  if (!birthDate) {
    return { valid: false, value: "", error: "Tanggal lahir wajib diisi." };
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (birthDate > todayStart) {
    return { valid: false, value: formatYmd(birthDate), error: "Tanggal lahir tidak boleh di masa depan." };
  }

  const age = calculateAge(formatYmd(birthDate), todayStart);
  if (age === null) {
    return { valid: false, value: "", error: "Tanggal lahir tidak valid." };
  }

  if (age < 5) {
    return { valid: false, value: formatYmd(birthDate), error: "Umur minimal 5 tahun." };
  }

  if (age > 120) {
    return { valid: false, value: formatYmd(birthDate), error: "Umur maksimal 120 tahun." };
  }

  return {
    valid: true,
    value: formatYmd(birthDate),
    error: "",
    age,
  };
}

function validateName(value) {
  const fullName = trimAndCollapse(value);
  if (fullName === "") {
    return { valid: false, value: fullName, error: "Nama lengkap wajib diisi." };
  }

  if (!/^(?=.*\p{L})[\p{L}\s.'-]+$/u.test(fullName)) {
    return { valid: false, value: fullName, error: "Nama hanya boleh berisi huruf." };
  }

  if (textLength(fullName) < 3) {
    return { valid: false, value: fullName, error: "Nama minimal 3 karakter." };
  }

  if (textLength(fullName) > 100) {
    return { valid: false, value: fullName, error: "Nama maksimal 100 karakter." };
  }

  if (/^\d+$/.test(fullName)) {
    return { valid: false, value: fullName, error: "Nama hanya boleh berisi huruf." };
  }

  return { valid: true, value: fullName, error: "" };
}

function validateGender(value) {
  const gender = normalizeGenderValue(value);
  if (!gender) {
    return { valid: false, value: "", error: "Jenis kelamin wajib dipilih." };
  }

  return { valid: true, value: gender, error: "" };
}

function validateAddress(value) {
  const address = trimAndCollapse(value);
  if (address === "") {
    return { valid: false, value: address, error: "Alamat wajib diisi." };
  }

  if (textLength(address) < 10) {
    return { valid: false, value: address, error: "Alamat minimal 10 karakter." };
  }

  if (textLength(address) > 255) {
    return { valid: false, value: address, error: "Alamat maksimal 255 karakter." };
  }

  return { valid: true, value: address, error: "" };
}

function validateCity(value) {
  const city = trimAndCollapse(value);
  if (city !== "" && textLength(city) > 100) {
    return { valid: false, value: city, error: "Kota maksimal 100 karakter." };
  }

  return { valid: true, value: city || "", error: "" };
}

function validateEmail(value) {
  const email = trimAndCollapse(value);
  if (email === "") {
    return { valid: true, value: "", error: "" };
  }

  if (textLength(email) > 150) {
    return { valid: false, value: email, error: "Email maksimal 150 karakter." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, value: email, error: "Email tidak valid." };
  }

  return { valid: true, value: email, error: "" };
}

function validateStatus(value) {
  const status = normalizeStatusValue(value);
  if (!status) {
    return { valid: false, value: "", error: "Status wajib dipilih." };
  }

  return { valid: true, value: status, error: "" };
}

export function validateMemberData(payload) {
  const errors = {};

  const fullNameState = validateName(payload.full_name);
  if (!fullNameState.valid) errors.full_name = fullNameState.error;

  const nikState = validateNIK(payload.nik);
  if (!nikState.valid) errors.nik = nikState.error;

  const birthDateState = validateBirthDate(payload.birth_date);
  if (!birthDateState.valid) errors.birth_date = birthDateState.error;

  const genderState = validateGender(payload.gender);
  if (!genderState.valid) errors.gender = genderState.error;

  const phoneState = validatePhone(payload.phone);
  if (!phoneState.valid) errors.phone = phoneState.error;

  const addressState = validateAddress(payload.address);
  if (!addressState.valid) errors.address = addressState.error;

  const statusState = validateStatus(payload.status);
  if (!statusState.valid) errors.status = statusState.error;

  const cityState = validateCity(payload.city);
  if (!cityState.valid) errors.city = cityState.error;

  const emailState = validateEmail(payload.email);
  if (!emailState.valid) errors.email = emailState.error;

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data: {
      full_name: fullNameState.value,
      nik: nikState.value || null,
      birth_date: birthDateState.value || null,
      gender: genderState.value,
      address: addressState.value || null,
      city: cityState.value || null,
      phone: phoneState.value || null,
      email: emailState.value || null,
      status: statusState.value,
    },
  };
}

export function firstMemberError(errors) {
  for (const value of Object.values(errors || {})) {
    if (typeof value === "string" && value) {
      return value;
    }
  }

  return "Data anggota tidak valid.";
}
