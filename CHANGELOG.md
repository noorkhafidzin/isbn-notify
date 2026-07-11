# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-07-11

### Changed
- **Matching Logic ISBN — Word-Overlap Scoring**: Algoritma pencocokan buku di `checkIsbns()` ditingkatkan dari `includes()` kaku ke sistem scoring berbasis kata signifikan (word-overlap). Judul buku panjang yang hanya tersimpan sebagian di API Perpusnas tetap terdeteksi selama ≥50% kata kunci cocok. Penerbit dan penulis dinormalisasi (prefix PT/CV di-strip, gelar akademik dihapus) lalu diukur dengan threshold ≥40% overlap.

### Fixed
- **Buku dengan Judul Panjang Tidak Pernah Match**: Buku dengan judul panjang (misal kategori rohani/subtitle panjang) sebelumnya tidak pernah cocok karena API Perpusnas menyimpan judul terpotong. Kini kata-kata kunci diekstrak dan dihitung tumpang tindihnya secara toleran.
- **Variasi Nama Penerbit/Penulis Gagal Match**: Prefix "PT"/"CV"/"Penerbit" dan gelar akademik (Ps., Ir., M.Th, dll.) kini otomatis dinormalisasi sebelum pembandingan, menangani variasi format nama yang sebelumnya gagal terdeteksi.

---

## [1.1.0] - 2026-06-30

### Added
- **Scheduler HH:MM Format**: `SCHEDULER_HOURS` kini menyimpan array string `HH:MM` (contoh: `"09:00"`, `"13:00"`) menggantikan array angka, memungkinkan presisi menit pada penjadwalan. Backward-compatible — format lama `[9, 13, 17]` otomatis dikonversi saat dibaca.
- **Add/Delete Time UI di Settings**: Antarmuka pengaturan jadwal diganti dari grid 24-checkbox menjadi daftar entri waktu dinamis dengan tombol *Tambah Waktu* (native time picker jam + menit) dan tombol hapus per-entri. Peringatan otomatis muncul jika lebih dari 4 jadwal ditambahkan.
- **Logging Detail Notifikasi**: Log lengkap ditambahkan pada setiap langkah dispatch notifikasi (topic, URL, auth status, hasil) untuk mempermudah debugging pengiriman notifikasi.
- **AbortController Timeout (15s)**: Setiap request ke API Perpusnas kini memiliki batas waktu 15 detik untuk mencegah scheduler menggantung jika API eksternal lambat atau tidak responsif.
- **NTFY_AUTH_TOKEN di settings.json**: Token autentikasi ntfy kini dipersistensikan di `settings.json` (sebelumnya hanya di `.env`), memastikan token tidak hilang saat pengaturan diperbarui via UI.
- **Graceful Shutdown**: Handler `SIGTERM` dan `SIGINT` ditambahkan untuk memastikan proses berhenti dengan bersih saat container dihentikan oleh orchestrator.
- **Security Headers**: Header `Content-Security-Policy` dan `Strict-Transport-Security` ditambahkan ke semua respons HTTP untuk pertahanan berlapis.

### Changed
- **Scheduler Rewrite — Hapus Weekend Skip**: `adjustForWorkdays()` dihapus; scheduler kini berjalan setiap hari termasuk Sabtu dan Minggu. Kalkulasi delay menggunakan objek `Date` penuh untuk presisi perbandingan waktu.
- **`getNextCustomDelay` Signature**: Menerima `string[]` times dan membandingkan dengan objek `Date` penuh, bukan hanya angka jam.
- **`getMergedSettings` Return Type**: Type ditetapkan secara eksplisit dengan `SCHEDULER_HOURS: string[]`; menghapus semua cast `as any` dan menggunakan `unknown` + type narrowing.
- **`tryAutoLogin` menggunakan `/books`**: Tidak lagi menggunakan endpoint `/verify` untuk auto-login, menghindari konsumsi rate limiter yang tidak perlu.
- **`Cache-Control: no-cache` pada Root Route**: Respons HTML root `/` kini menyertakan header `Cache-Control: no-cache` untuk memaksa reverse proxy selalu menyajikan HTML terbaru setelah pembaruan container.
- **ntfy Auth**: `btoa()` diganti `Buffer.from()` agar kompatibel dengan runtime Node.js (tidak ada `btoa` native di Node).
- **Fetch Timeout API**: Timeout 10 detik (via `AbortController`) juga diterapkan di `notifications.ts` sebagai lapisan keamanan tambahan.

### Fixed
- **Kritis: Missing Closing Brace di `tryAutoLogin()`**: Kurung kurawal penutup `}` yang hilang setelah blok `catch {}` menyebabkan seluruh fungsi global (`handleLogout`, `loadBooks`, `closeEditModal`, dll.) terparsing di dalam scope `tryAutoLogin`, membuat login, logout, edit modal, dan semua interaksi gagal total.
- **Kritis: XSS di Notifikasi Telegram**: Fungsi `escapeHtml()` ditambahkan untuk menyanitasi konten sebelum dikirim ke Telegram, mencegah injeksi HTML berbahaya.
- **Tinggi: CSP Memblokir Inline Styles dan Onclick**: `'unsafe-inline'` ditambahkan ke `script-src` dan `style-src` di CSP untuk mengizinkan inline `style="display:none"` dan handler `onclick`, yang sebelumnya menyebabkan edit modal selalu terlihat dan tombol Batal tidak berfungsi.
- **Tinggi: Edit Modal Selalu Terlihat**: CSS ID selector `#editBookModal { display:none }` ditambahkan dengan spesifisitas tinggi untuk memastikan modal tersembunyi, serta `modal.style.display='none'` dieksekusi secara eksplisit saat `DOMContentLoaded` sebagai pengaman dari race condition cache browser.
- **NTFY_AUTH_TOKEN Fallback**: Scheduler gagal mengirim notifikasi ntfy karena token tidak diresolve dengan benar. Kini ada fallback ke `process.env` di fungsi `getEnv()` jika nilai di `settings.json` kosong.

### CI/CD
- **Fix Docker Image Tagging**: Branch `dev` kini hanya mendapatkan tag `:dev`, bukan `:latest`, untuk mencegah tumpang tindih dengan image produksi.
- **Restore Dev Branch Trigger**: Trigger build Docker untuk branch `dev` dipulihkan ke konfigurasi yang benar.

---

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
