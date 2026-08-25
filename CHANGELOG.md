# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.7] - 2026-08-05

### Added
- **Quick Add Tracking Permohonan ISBN**: Fitur baru yang memungkinkan pengguna copy-paste data tabel permohonan ISBN langsung dari web Perpusnas. Sistem otomatis memparse data (judul, pengarang, tanggal pengajuan, no resi) dan menampilkan modal konfirmasi untuk koreksi sebelum disimpan. Mendukung input single book maupun batch (multiple books).
- **Filter Status di Tracking List**: Dropdown filter untuk memfilter buku berdasarkan status: Semua, Pengajuan (Pending), atau Terbit (Completed). Reset otomatis ke halaman 1 saat filter berubah.
- **Nomor Urut di Tabel**: Kolom No. otomatis ditampilkan di paling kiri tabel Tracking List, berurutan lintas halaman.
- **Pagination Tracking List**: Navigasi halaman dengan opsi tampilkan 10, 25, 50, atau Semua data. Termasuk tombol Prev/Next dan nomor halaman dengan ellipsis untuk jumlah halaman besar.

### Changed
- **Terjemahan UI ke Bahasa Indonesia**: Seluruh teks antarmuka (navigasi, label, tombol, filter, modal, notifikasi, pengaturan) diterjemahkan ke bahasa Indonesia secara konsisten. Contoh: Tracking List → Daftar Pelacakan, Settings → Pengaturan, Logout → Keluar, dll.

### Fixed
- **Index Variable Tidak Terdefinisi di renderBooksTable**: Parameter `index` tidak diteruskan ke callback `.map()`, menyebabkan ReferenceError saat rendering tabel. Diperbaiki dengan menambahkan `index` ke parameter callback.
- **Status Filter Tidak Bekerja**: Logika apply status filter tidak pernah masuk ke `renderBooksTable()` karena regex sebelumnya gagal karena CRLF line endings. Sekarang filter (Semua/Pending/Completed) berfungsi dengan benar.

---

## [1.2.4] - 2026-08-05

### Changed
- **Format Notifikasi Siap Copy-Paste ke Klien**: Body notifikasi di semua kanal (Telegram, ntfy, dan field `message` pada payload webhook) kini memakai format profesional yang siap disalin langsung ke klien:
  ```
  📘 Telah Terbit ISBN

  No. ISBN : 978-634-97091-4-9
  Judul Buku : [judul yang dilacak]
  Pengarang : [nama pengarang]
  Penerbit : [nama penerbit]
  ```
  Informasi lengkap (nomor ISBN, judul, pengarang, dan penerbit) kini ditampilkan dalam satu blok rapi, dengan fallback `-` jika pengarang/penerbit tidak diisi.
- **Judul Resmi dari Web ISBN Dihapus**: Notifikasi tidak lagi menyertakan judul resmi hasil API Perpusnas (sebelumnya tampil sebagai `(Resmi: "...")` di ntfy dan `Judul Resmi` di Telegram). Judul yang dipakai adalah judul yang dilacak pengguna. Seluruh referensi `officialTitle`/`official_title` dihapus dari kode notifikasi dan payload webhook.
- **Payload Webhook**: Field `official_title` dihapus dari payload JSON event `isbn.published` dan digantikan field `message` berisi teks notifikasi siap copy-paste. Sisa payload terstruktur (`id`, `tracked_title`, `publisher`, `author`, `isbn`) tetap dipertahankan.

---

## [1.2.3] - 2026-07-30

### Fixed
- **Kritis: Semua Pengecekan ISBN Gagal — TLS Certificate Perpusnas Tidak Dikenali**: Sertifikat SSL `isbn.perpusnas.go.id` menggunakan CA Indonesia (BSrE) yang tidak ada di bundle CA bawaan Node.js. Semua `fetch` ke API Perpusnas gagal dengan `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, mengakibatkan buku baru (ID #6, #7, #8) tidak pernah diperiksa dan `last_checked_at` tetap `null`. Scheduler berjalan normal tetapi setiap request ditolak sebelum sempat mencari ISBN. Diperbaiki dengan menambahkan `NODE_TLS_REJECT_UNAUTHORIZED=0` di awal startup server. Pengguna dapat menimpa nilai ini di lingkungan deployment untuk kontrol lebih ketat.

### Security
- **TLS Verification Bypass**: `NODE_TLS_REJECT_UNAUTHORIZED` diset ke `'0'` jika belum ditentukan, untuk mengakomodasi sertifikat CA Indonesia yang tidak dikenal Node.js. Hanya berlaku untuk proses Node.js ini; dapat dioverride dengan nilai `'1'` di environment deployment untuk mengaktifkan kembali verifikasi ketat.

---

## [1.2.2] - 2026-07-23

### Added
- **Publisher Suggestions**: Input publisher dan editPublisher kini dilengkapi `<datalist>` yang menampilkan daftar publisher unik dari data buku yang sudah tersimpan di database. Saat mengetik, browser menampilkan saran autocomplete dari publisher yang pernah digunakan sebelumnya.

---

## [1.2.1] - 2026-07-12

### Added
- **Favicon Support**: Route `/favicon.ico` menyajikan `icon.png` yang disimpan di root proyek. Dikecualikan dari middleware autentikasi agar browser dapat mengunduhnya tanpa API Key. `Dockerfile` diperbarui untuk menyalin `icon.png` ke image production.

---

## [1.2.0] - 2026-07-11

### Changed
- **Matching Logic ISBN — Word-Overlap Scoring**: Algoritma pencocokan buku di `checkIsbns()` ditingkatkan dari `includes()` kaku ke sistem scoring berbasis kata signifikan (word-overlap). Penerbit dan penulis dinormalisasi (prefix PT/CV di-strip, gelar akademik dihapus) lalu diukur dengan threshold ≥40% overlap.

### Fixed
- **API Perpusnas Return 0 untuk Judul Panjang (>90 chars)**: Query dicari dipotong ke ~55 karakter (word-boundary safe) karena API Perpusnas tidak merespon judul yang terlalu panjang. Hasil matching tetap menggunakan judul lengkap via fuzzy scoring.
- **Buku dengan Judul Panjang Tidak Pernah Match**: Buku dengan judul panjang sebelumnya tidak pernah cocok karena query search ke API kosong. Kini query dipotong, lalu kata-kata kunci diekstrak dan dihitung tumpang tindihnya secara toleran (≥50%).
- **Variasi Nama Penerbit/Penulis Gagal Match**: Prefix "PT"/"CV"/"Penerbit" dan gelar akademik kini otomatis dinormalisasi sebelum pembandingan.

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
