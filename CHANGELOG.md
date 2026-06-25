# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.1] - 2026-06-25

### Changed
- Refaktor Web UI Dashboard agar sepenuhnya ramah seluler (mobile-friendly) menggunakan CSS Grid template areas dan transform layout table-to-card.
- Menghilangkan scroll horizontal tabel pelacakan pada layar $\le$ 768px dengan menyembunyikan header tabel dan menampilkan baris sebagai blok kartu dinamis menggunakan pseudo-element `td::before { content: attr(data-label); }`.
- Menyusun ulang urutan prioritas tumpukan dashboard pada layar mobile: Stats (paling atas) $\rightarrow$ Tracking List $\rightarrow$ Register Book $\rightarrow$ Analisis (paling bawah).
- Mengubah stats panel dari grid layout ke flexbox row kompak untuk menghemat ruang vertikal layar HP.
- Mengatur custom hours scheduler grid secara responsif (4 kolom di tablet, 3 kolom di handphone) untuk kenyamanan touch target $\ge$ 44px.
- Menumpuk navigasi menu tab secara vertikal full-width pada handphone $\le$ 480px agar mudah di-tap.
- Merefaktor inline grid styles pada form edit modal menjadi class `.form-row` yang responsif.

## [1.3.0] - 2026-06-25

### Added
- Penyimpanan setelan `SCHEDULER_INTERVAL` ("custom", "disabled") dan `SCHEDULER_HOURS` di server-side `settings.json` secara dinamis.
- Penghapusan opsi interval pemicuan berkala setiap jam (`hourly`) untuk mencegah risiko pemblokiran IP agresif oleh firewall Perpusnas.
- Fitur penyesuaian jadwal (Custom Hours Scheduler) yang fleksibel pada Web UI Dashboard. Pengguna bebas memilih jam-jam tertentu (00:00 - 23:00) untuk pemicuan otomatis pelacakan ISBN.
- Warning banner dinamis jika pengguna mengaktifkan lebih dari 4 jadwal pemeriksaan per hari guna mengurangi risiko blokir WAF (Web Application Firewall) dari portal Perpusnas.
- Validasi client-side agar minimal 1 jam aktif terpilih saat mode kustom diaktifkan.
- Integrasi otentikasi login overlay terproteksi sandi (`API_KEY`) yang disimpan pada local storage browser klien.
- Tab navigasi antarmuka untuk beralih antara "Tracking List" dan "Settings & Scheduler".
- Halaman formulir kustom untuk mengubah pengaturan integrasi Telegram, ntfy.sh, Webhook, dan Scheduler secara dinamis tanpa restart server.

### Changed
- Migrasi model konfigurasi statis `.env` ke model Dynamic Settings yang tersimpan di `settings.json` (menggunakan `.env` sebagai fallback).
- Konfigurasi penjadwalan internal Node.js di-refactor menggunakan delay target dinamis yang memetakan jam-jam kustom terpilih (juga mendukung legacy interval `3x-daily` dan `daily` yang dimigrasi secara transparan).

## [1.2.0] - 2026-06-24

### Added
- Penambahan file `Dockerfile` untuk containerization aplikasi Node.js.
- Penambahan `docker-compose.yml.example` untuk mempermudah orkestrasi service dan volume database lokal `/app/data/books.json`.
- Penambahan file `.dockerignore` untuk mengecualikan build artifact dan dependensi lokal.
- Penambahan GitHub Actions workflow (`docker-publish.yml`) untuk membangun (build) image secara otomatis pada multi-platform (amd64 dan arm64) serta mempublikasikannya ke GitHub Container Registry (GHCR).
- Dukungan variabel lingkungan `DB_PATH` untuk mengatur letak penyimpanan database.

### Removed
- Penghapusan file `schema.sql` karena sistem beralih menggunakan JSON database.

## [1.1.0] - 2026-06-24

### Changed
- Migrasi arsitektur dari **Cloudflare Workers + D1 Database** ke **Self-Hosted Node.js Hono Server** untuk menghindari proteksi Cloudflare IP `403 Forbidden` dari server API Perpusnas.
- Mengganti database Cloudflare D1 dengan local JSON database (`books.json`) yang pure JS/TS (tanpa native compiler dependencies), meminimalisir kegagalan instalasi pada versi Node baru (seperti Node 25) di OS Windows/Linux.

### Added
- Skrip pengujian otomatis `test.js` dan `test_success.js` untuk memverifikasi fungsionalitas registrasi buku, pencarian API Perpusnas, pengiriman notifikasi, dan penghapusan buku.
- Panduan integrasi penjadwalan berkala menggunakan utilitas **Linux Crontab** dan manajemen background process menggunakan **PM2**.
- Dukungan pembacaan variabel lingkungan dari `.env` lokal menggunakan `dotenv`.

### Removed
- File konfigurasi Cloudflare: `wrangler.toml`, `wrangler.toml.example`, `.dev.vars`, dan `.dev.vars.example`.

## [1.0.0] - 2026-06-24

### Added
- Inisialisasi awal proyek **isbn-notify** berbasis Cloudflare Workers, Hono, dan D1 SQLite.
- Integrasi pelacakan otomatis menggunakan API pencarian publik Perpusnas (`serverside_search2`) yang bebas dari CAPTCHA.
- Skema database D1 SQLite untuk menyimpan status pelacakan (`books`) dan pengaturan notifikasi dinamis per buku.
- REST API endpoint terproteksi API Key (`X-API-Key`):
  - `POST /books` (mendaftarkan pelacakan baru)
  - `GET /books` (melihat daftar buku terdaftar)
  - `DELETE /books/:id` (menghapus buku dari pelacakan)
  - `POST /check` (memicu pengecekan secara manual)
- Scheduler otomatis (Workers Cron Triggers) yang berjalan 3 kali sehari pada jam kerja hari biasa.
- Sistem notifikasi multi-channel instan:
  - **Telegram Bot** (menggunakan bot API dan formatting HTML)
  - **ntfy.sh** (menggunakan pencocokan topik pada server default maupun custom self-hosted, mendukung otentikasi Basic `id:pass` / Bearer token)
  - **Webhook** (mengirim payload JSON ke custom URL server target)
- Penambahan variabel lingkungan `NTFY_DEFAULT_URL` untuk mendukung server ntfy self-hosted (default ke `https://ntfy.sh` jika kosong).
- Penambahan variabel lingkungan `NTFY_AUTH_TOKEN` untuk mengirim header `Authorization` (otomatis mengenkode `username:password` ke Base64 Basic auth).
- `.gitignore` (mengabaikan `wrangler.toml` dan `.dev.vars` untuk keamanan) dan konfigurasi dev server lokal.
- Templat konfigurasi [wrangler.toml.example](wrangler.toml.example) dan [.dev.vars.example](.dev.vars.example) untuk deployment dan variabel lingkungan.
- Panduan lengkap penggunaan API dan tata cara deploy ke Cloudflare Production di [README.md](README.md).
