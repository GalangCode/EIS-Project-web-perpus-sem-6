const CURRENT_YEAR = new Date().getFullYear();

function toText(value) {
  return String(value ?? "").trim();
}

function textLength(value) {
  return toText(value).length;
}

function parseIntegerField(value) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^-?\d+$/.test(trimmed)) {
      return Number(trimmed);
    }
  }

  return null;
}

export function normalizeISBN(value) {
  return String(value ?? "")
    .trim()
    .replace(/[\s-]+/g, "")
    .toUpperCase();
}

export function isValidISBN10(isbn) {
  if (!/^\d{9}[\dX]$/.test(isbn)) {
    return false;
  }

  let sum = 0;
  for (let index = 0; index < 9; index += 1) {
    sum += Number(isbn[index]) * (10 - index);
  }

  const checkDigit = isbn[9] === "X" ? 10 : Number(isbn[9]);
  return (sum + checkDigit) % 11 === 0;
}

export function isValidISBN13(isbn) {
  if (!/^\d{13}$/.test(isbn)) {
    return false;
  }

  let sum = 0;
  for (let index = 0; index < 12; index += 1) {
    sum += Number(isbn[index]) * (index % 2 === 0 ? 1 : 3);
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(isbn[12]);
}

export function isValidISBN(isbn) {
  const normalized = normalizeISBN(isbn);
  return isValidISBN10(normalized) || isValidISBN13(normalized);
}

export function sanitizeISBNInput(value) {
  const cleaned = String(value ?? "")
    .toUpperCase()
    .replace(/[^0-9X-]/g, "");
  const compact = cleaned.replace(/-/g, "");
  const xCount = (compact.match(/X/g) || []).length;

  if (xCount === 0) {
    return cleaned;
  }

  const lastXIndex = compact.lastIndexOf("X");
  const digitsBeforeX = compact.slice(0, lastXIndex).replace(/X/g, "").length;
  const digitsAfterX = compact.slice(lastXIndex + 1).replace(/X/g, "").length;

  if (digitsBeforeX !== 9 || digitsAfterX > 0 || xCount > 1) {
    return cleaned.replace(/X/g, "");
  }

  return cleaned.replace(/X(?!$)/g, "");
}

export function validatePublicationYear(value) {
  const publicationYear = parseIntegerField(value);
  if (publicationYear === null) {
    return {
      valid: false,
      value: null,
      error: "Tahun terbit harus berupa angka.",
    };
  }

  if (publicationYear < 1900) {
    return {
      valid: false,
      value: publicationYear,
      error: "Tahun terbit tidak boleh kurang dari 1900.",
    };
  }

  if (publicationYear > CURRENT_YEAR) {
    return {
      valid: false,
      value: publicationYear,
      error: "Tahun terbit tidak boleh melebihi tahun saat ini.",
    };
  }

  return {
    valid: true,
    value: publicationYear,
    error: "",
  };
}

export function validateStock(stockTotalValue, stockAvailableValue) {
  const stockTotal = parseIntegerField(stockTotalValue);
  const stockAvailable = parseIntegerField(stockAvailableValue);
  const errors = {};

  if (stockTotal === null) {
    errors.stock_total = "Stok total harus berupa angka bulat.";
  } else if (stockTotal < 0) {
    errors.stock_total = "Stok total tidak boleh negatif.";
  }

  if (stockAvailable === null) {
    errors.stock_available = "Stok tersedia harus berupa angka bulat.";
  } else if (stockAvailable < 0) {
    errors.stock_available = "Stok tersedia tidak boleh negatif.";
  }

  if (
    stockTotal !== null &&
    stockTotal >= 0 &&
    stockAvailable !== null &&
    stockAvailable >= 0 &&
    stockAvailable > stockTotal
  ) {
    errors.stock_available = "Stok tersedia tidak boleh melebihi stok total.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    stock_total: stockTotal,
    stock_available: stockAvailable,
    errors,
  };
}

export function validateBookData(payload) {
  const errors = {};

  const categoryId = parseIntegerField(payload.category_id);
  if (categoryId === null || categoryId <= 0) {
    errors.category_id = "Kategori wajib dipilih.";
  }

  const title = toText(payload.title);
  if (title === "") {
    errors.title = "Judul buku wajib diisi.";
  } else if (textLength(title) < 3) {
    errors.title = "Judul minimal 3 karakter.";
  } else if (textLength(title) > 255) {
    errors.title = "Judul maksimal 255 karakter.";
  }

  const author = toText(payload.author);
  if (author === "") {
    errors.author = "Penulis wajib diisi.";
  } else if (textLength(author) > 150) {
    errors.author = "Penulis maksimal 150 karakter.";
  }

  const publisher = toText(payload.publisher);
  if (publisher === "") {
    errors.publisher = "Penerbit wajib diisi.";
  } else if (textLength(publisher) > 150) {
    errors.publisher = "Penerbit maksimal 150 karakter.";
  }

  const publicationYearState = validatePublicationYear(payload.publication_year);
  if (!publicationYearState.valid) {
    errors.publication_year = publicationYearState.error;
  }

  const isbn = normalizeISBN(payload.isbn);
  if (isbn === "") {
    errors.isbn = "ISBN wajib diisi.";
  } else if (!isValidISBN(isbn)) {
    errors.isbn = "ISBN harus berupa ISBN-10 atau ISBN-13 yang valid.";
  }

  const edition = toText(payload.edition);
  if (edition !== "" && textLength(edition) > 30) {
    errors.edition = "Edisi maksimal 30 karakter.";
  }

  const language = toText(payload.language);
  if (language === "") {
    errors.language = "Bahasa wajib diisi.";
  } else if (textLength(language) > 50) {
    errors.language = "Bahasa maksimal 50 karakter.";
  }

  const shelfLocation = toText(payload.shelf_location);
  if (shelfLocation === "") {
    errors.shelf_location = "Lokasi rak wajib diisi.";
  } else if (textLength(shelfLocation) > 20) {
    errors.shelf_location = "Lokasi rak maksimal 20 karakter.";
  }

  const status = toText(payload.status);
  if (!["aktif", "nonaktif"].includes(status)) {
    errors.status = "Status buku tidak valid.";
  }

  const stockState = validateStock(payload.stock_total, payload.stock_available);
  Object.assign(errors, stockState.errors);

  const description = toText(payload.description);
  if (description !== "" && textLength(description) > 1000) {
    errors.description = "Deskripsi maksimal 1000 karakter.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data: {
      category_id: categoryId ?? 0,
      title,
      author,
      publisher,
      publication_year: publicationYearState.value,
      isbn: isbn || null,
      edition: edition || null,
      language,
      shelf_location: shelfLocation,
      description: description || null,
      stock_total: stockState.stock_total ?? 0,
      stock_available: stockState.stock_available ?? 0,
      status,
    },
  };
}

export function firstBookError(errors) {
  for (const value of Object.values(errors || {})) {
    if (typeof value === "string" && value) {
      return value;
    }
  }

  return "Data buku tidak valid.";
}
