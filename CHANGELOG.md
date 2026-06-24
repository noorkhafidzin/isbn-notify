# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
