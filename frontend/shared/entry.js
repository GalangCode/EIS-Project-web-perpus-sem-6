import { bindLogoutLinks, getHomePath, getLoginPath, getRequiredRole, getSessionRole } from "./auth.js";

const { page = "login" } = document.body.dataset;

const pageModules = {
  login: "../shared/login.js",
  adminLogin: "../admin/login.js",
  category: "../admin/kategori.js",
  books: "../admin/buku-view.js",
  members: "../admin/anggota.js",
  circulation: "../admin/sirkulasi-view.js",
  addBorrow: "../admin/tambah-peminjaman.js",
  report: "../admin/laporan.js",
  adminSettings: "../admin/pengaturan.js",
  kepalaLogin: "../kepala-perpustakaan/login.js",
  headDashboard: "../kepala-perpustakaan/dashboard.js",
  collection: "../kepala-perpustakaan/koleksi.js",
  analytics: "../kepala-perpustakaan/analitik.js",
  users: "../kepala-perpustakaan/pengguna.js",
  addUser: "../kepala-perpustakaan/tambah-pengguna.js",
  recommendations: "../kepala-perpustakaan/rekomendasi.js",
  allDashboard: "../kepala-perpustakaan/semua-dashboard.js",
  settings: "../kepala-perpustakaan/pengaturan.js",
};

const modulePath = pageModules[page];
const requiredRole = getRequiredRole(page);
const sessionRole = getSessionRole();
let redirectTarget = null;

if (page === "login" || page === "adminLogin" || page === "kepalaLogin") {
  if (sessionRole) {
    redirectTarget = getHomePath(sessionRole);
  }
} else if (requiredRole) {
  if (!sessionRole) {
    redirectTarget = getLoginPath(requiredRole);
  } else if (sessionRole !== requiredRole) {
    redirectTarget = getHomePath(sessionRole);
  }
}

if (redirectTarget) {
  window.location.replace(redirectTarget);
} else if (!modulePath) {
  document.body.innerHTML = `<main style="padding:40px;font-family:sans-serif">Halaman tidak ditemukan: ${page}</main>`;
} else {
  await import(modulePath);
  bindLogoutLinks();
}
