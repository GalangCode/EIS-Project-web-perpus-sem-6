# Handoff Notes — EIS Balangan Frontend

Tanggal catatan: 2026-07-21

## Tujuan saat ini

Membangun ulang frontend berdasarkan file Figma `UAS-KELOMPOK-ANJAY` dengan struktur folder terpisah per role:

- `frontend/admin/`
- `frontend/kepala-perpustakaan/`
- `frontend/shared/`

Komponen reusable dipisah dari file halaman inti.

## Kondisi terakhir

Struktur utama sudah dibuat, dan login sudah memakai aset lokal:

- `logo.jpeg`
- `gambar login.jpg`

Halaman login, sidebar, topbar, panel, tabel, form, dan beberapa page shell sudah dipisahkan ke file HTML per halaman.

## File penting yang sudah ada

- `index.html`
- `frontend/shared/components.js`
- `frontend/shared/pages.js`
- `frontend/shared/styles.css`
- `frontend/shared/entry.js`
- `frontend/admin/*.html`
- `frontend/kepala-perpustakaan/*.html`

## Catatan perilaku aplikasi

- Halaman harus dibuka lewat local server, bukan `file://`, karena memakai ES module import.
- Jika dibuka langsung dari Explorer, halaman bisa tampil putih karena modul tidak jalan.

Contoh:

```powershell
python -m http.server 8000
```

Lalu buka:

`http://localhost:8000/index.html`

## Apa yang sudah disesuaikan

- Root `index.html` dibuat redirect ke `frontend/admin/login.html`.
- Login kiri memakai `gambar login.jpg`.
- Logo memakai `logo.jpeg`.
- Styling dasar sudah diubah agar mengikuti frame Figma:
  - sidebar 256px
  - topbar putih
  - login split-screen
  - kartu statistik
  - panel tabel
  - modal form

## Frame Figma yang sudah dibaca

Saya berhasil membaca struktur top-level frame dari Figma file key:

`6jzyCp5h8aJfz8mMz8Yy84`

Frame yang teridentifikasi antara lain:

- `Login`
- `Login Kepala`
- `Daashboard`
- `Book management`
- `Tambah buku`
- `Member management`
- `Tambah anggota member`
- `Circulation`
- `Edit transaksi`
- `System report`
- `Analitik`
- `Manajemen pengguna`
- `BT lihat semua`
- `Lihat semua dashboard`
- `Form Tambah Pengguna Baru - Premium Refinement`
- `Pengaturan - Kepala Perpustakaan`
- `Koleksi`

## Catatan penting dari inspeksi Figma

Untuk frame `Login`:

- ukuran frame: `1280 x 1024`
- layout horizontal
- panel kiri: `640 x 1024`
- panel kanan: `640 x 1024`
- panel kiri memakai gambar latar + overlay hijau toska
- panel kanan berisi branding, judul, form login

Untuk frame admin kategori:

- root wrapper: `256px` sidebar + `1024px` main content
- topbar admin: `75px`
- canvas area: `949px`
- ada analytics grid dan table container

Untuk frame dashboard kepala:

- root wrapper: sidebar `256px`
- topbar: `64px`
- canvas: section summary cards, charts, table

## Hal yang masih perlu dilanjutkan

Jika ingin benar-benar mendekati Figma 1:1, langkah lanjut yang paling penting adalah:

1. Memeriksa tiap frame Figma satu per satu.
2. Menyamakan:
   - ukuran font
   - line-height
   - spacing
   - radius
   - border
   - warna
   - posisi elemen
3. Kalau ada aset gambar/logo tambahan dari Figma, ekspor dan taruh di repo.

## File yang terakhir diedit

- `frontend/shared/components.js`
- `frontend/shared/styles.css`
- `frontend/shared/pages.js`
- `index.html`

## Status teknis

`frontend/shared/pages.js` berhasil di-import tanpa error sintaks.

## Saran untuk AI berikutnya

Mulai dari file ini:

- `frontend/shared/components.js`
- `frontend/shared/styles.css`

Lalu buka halaman yang ingin disesuaikan satu per satu.
Fokus pertama sebaiknya login, karena itu yang paling visual dan paling mudah diverifikasi.

