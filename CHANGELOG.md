# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-25

### Added
- Inisialisasi awal proyek **isbn-notify** berbasis Node.js, Hono, dan local JSON Database (`books.json`) untuk memonitor ketersediaan/penerbitan nomor ISBN secara otomatis.
- Antarmuka Web UI Dashboard premium bertema glassmorphism dark mode yang sepenuhnya ramah seluler (mobile-friendly), dilengkapi dengan visual stats panel, analisis waktu rata-rata terbit, form registrasi buku, dan table-to-card layout transformation.
- Sistem otentikasi login overlay terproteksi sandi (`API_KEY`) yang disimpan secara aman di local storage browser klien.
- Penjadwal latar belakang internal (Scheduler) dinamis dengan fitur kustomisasi jam pemeriksaan otomatis, weekend skip (melewati hari kerja Sabtu & Minggu), dan warning limit pencegahan blokir firewall WAF Perpusnas.
- Sistem notifikasi multi-channel instan:
  - **Telegram Bot** (menggunakan API dan formatting HTML)
  - **ntfy.sh** (mendukung default server maupun custom self-hosted, serta Basic & Bearer authentication)
  - **Webhook** (mengirim payload JSON event `isbn.published` ke URL server target)
- Kontainerisasi penuh menggunakan Docker, Docker Compose, dan integrasi workflow CI/CD GitHub Actions untuk publikasi otomatis docker images.
