# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
  - **ntfy.sh** (menggunakan custom push notification topic)
  - **Webhook** (mengirim payload JSON ke custom URL server target)
- `.gitignore` dan konfigurasi environment untuk dev server lokal (`.dev.vars`).
