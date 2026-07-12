# Blueprint — isbn-notify

- **Version:** v1.2.1
- **Last Updated:** 2026-07-12
- **Tech Stack:** Node.js, Hono, JSON Database (books.json), TypeScript

---

## 1. System Overview

Sistem backend mandiri (self-hosted) yang berjalan di atas runtime **Node.js** menggunakan **Hono** untuk memonitor ketersediaan/penerbitan nomor ISBN dari portal Perpustakaan Nasional (Perpusnas) RI secara otomatis berdasarkan judul buku dan nama penerbit, kemudian mendistribusikan notifikasi secara dinamis ke Telegram, ntfy.sh, atau Webhook target.

Sistem ini di-host pada jaringan residential (home server) untuk menghindari blokir WAF `403 Forbidden` yang diterapkan Perpusnas pada jangkauan IP pusat data Cloudflare.

---

## 2. JSON Database Architecture (books.json)

Database disimpan secara lokal dalam file database JSON (default: `books.json` di root direktori). Lokasi file dapat disesuaikan menggunakan variabel lingkungan `DB_PATH` (misalnya `/app/data/books.json` pada mode Docker). Penulisan database dilakukan secara aman dan atomik menggunakan skema temp-write and rename:

```ts
export interface Book {
  id: number;
  title: string;
  author: string | null;
  publisher: string | null;
  status: 'PENDING' | 'COMPLETED';
  isbn: string | null;
  tg_chat_id: string | null;
  ntfy_topic: string | null;
  webhook_url: string | null;
  created_at: string;
  updated_at: string;
  last_checked_at: string | null;
}
```

### Flow Status Pelacakan:
1. Pengguna memasukkan judul buku (dan opsional penerbit/author/notifikasi khusus) via `POST /books`. Data ditambahkan ke array dengan status `PENDING`.
2. Internal scheduler melacak setiap buku berstatus `PENDING` dengan menembak API Perpusnas:
   `https://isbn.perpusnas.go.id/landing_page/serverside_search2?search={title}&filter_by=title`
3. **Pencocokan Fuzzy (Word-Overlap Scoring — v1.2.0+):**
   - Judul: kata-kata signifikan (≥3 huruf) diekstrak dari judul tracked, lalu dihitung tumpang tindihnya dengan judul hasil API. Minimal 50% kata kunci harus cocok (toleran terhadap judul terpotong/berbeda).
   - Penerbit: prefix "PT"/"CV"/"Penerbit"/"Percetakan" dinormalisasi, lalu diukur overlap minimal 40%.
   - Penulis: gelar akademik (Ps., Ir., M.Th., dll.) dan tanda baca otomatis di-strip sebelum pembandingan overlap minimal 40%.
4. Bila match ditemukan, nomor ISBN diekstrak.
5. Status diperbarui ke `COMPLETED`, field `isbn` diisi, dan notifikasi dikirim ke channel yang ditentukan. Buku dengan status `COMPLETED` tidak diproses kembali pada putaran berikutnya.

---

## 3. API Endpoints

Semua endpoint dilindungi menggunakan header `X-API-Key`.

- **`GET /books`**
  Mengambil seluruh data buku yang terdaftar di database.
- **`POST /books`**
  Menambahkan buku baru ke antrean tracking.
  - Body payload:
    ```json
    {
      "title": "Judul Buku yang Dicari",
      "author": "Nama Penulis (Opsional)",
      "publisher": "Nama Penerbit (Opsional)",
      "tg_chat_id": "Chat ID khusus (Opsional)",
      "ntfy_topic": "Topik ntfy khusus (Opsional)",
      "webhook_url": "URL Webhook khusus (Opsional)"
    }
    ```
- **`DELETE /books/:id`**
  Menghapus buku berdasarkan ID numerik dari database.
- **`POST /check`**
  Memicu proses pelacakan manual secara instan di latar belakang.

---

## 4. Notification Integration Details

- **Telegram:**
  POST ke `https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/sendMessage` dengan body payload JSON `{ chat_id, text, parse_mode: "HTML" }`.
- **ntfy.sh / Self-Hosted ntfy:**
  POST ke `<NTFY_DEFAULT_URL>/<TOPIC>` dengan message body teks dan header ASCII (`Title`, `Priority`, `Tags`).
  Mendukung autentikasi via variabel lingkungan `NTFY_AUTH_TOKEN` (bisa diisi raw `username:password` yang akan otomatis dienkode ke `Authorization: Basic base64(username:password)` atau token langsung).
- **Webhook:**
  POST JSON payload ke target URL dengan format:
  ```json
  {
    "event": "isbn.published",
    "timestamp": "2026-06-24T06:27:06Z",
    "book": {
      "id": 1,
      "tracked_title": "Laskar PDGI Bali pelangi Mentawai",
      "official_title": "Laskar PDGI Bali pelangi Mentawai",
      "publisher": "UD. Meta Kata",
      "author": null,
      "isbn": "978-602-1203-49-1"
    }
  }
  ```

---

## 5. Dynamic Configurations & Internal Background Scheduler

Sistem ini mendukung konfigurasi dinamis yang dapat disesuaikan langsung dari halaman pengaturan Web UI Dashboard (terproteksi kata sandi). Pengaturan ini disimpan secara persisten di file `settings.json` (dan menggunakan environment variable `.env` sebagai cadangan/fallback).

### Penjadwal Latar Belakang Internal Node.js:
Penjadwal latar belakang otomatis dijalankan langsung di memori server Node.js menggunakan pemicu waktu lokal sistem operasi server. Terdapat beberapa mode interval:
- **`disabled`**: Menonaktifkan pengecekan otomatis (pengecekan hanya berjalan manual).
- **`custom`**: Melakukan pengecekan otomatis pada waktu-waktu spesifik dalam format `HH:MM` (misalnya `"09:00"`, `"13:00"`, dan `"17:00"`) yang dipilih secara bebas dari antarmuka Web UI menggunakan native time picker.

### Format Waktu Jadwal (v1.1.0+):
`SCHEDULER_HOURS` kini menyimpan `string[]` format `HH:MM`, memungkinkan presisi hingga menit. Format lama `number[]` (misal `[9, 13, 17]`) otomatis dikonversi via fungsi `normalizeHours()` di `settings.ts` untuk memastikan backward-compatibility.

### Fitur Kustomisasi Jadwal & Pencegahan Blokir WAF:
1. **Berjalan Setiap Hari (v1.1.0+):** Weekend skip dihapus; scheduler kini berjalan setiap hari termasuk Sabtu dan Minggu. Kalkulasi delay menggunakan objek `Date` penuh untuk akurasi perbandingan waktu.
2. **Dynamic Rescheduling:** Setiap kali pengaturan di-save via Web UI, timer aktif lama akan dibersihkan (`clearTimeout`/`clearInterval`) dan penjadwal baru akan dihitung serta dijadwalkan ulang secara real-time.
3. **Firewall WAF Warning:** Karena server Perpusnas menerapkan Web Application Firewall (WAF) yang ketat, Web UI akan memicu peringatan dinamis jika pengguna menambahkan lebih dari 4 entri jadwal dalam sehari, mendidik pengguna agar menghindari risiko pemblokiran IP.
4. **AbortController Timeout:** Setiap request ke API Perpusnas memiliki batas waktu 15 detik untuk mencegah scheduler menggantung jika API eksternal tidak merespons.

---

## 6. Authentication Overlay & Web UI Security

Aplikasi ini menggunakan Single Page App (SPA) dashboard yang dilindungi oleh **Login Overlay**. 
- Ketika pengguna pertama kali mengakses halaman root `/`, dashboard penuh dikunci sampai password verifikasi yang dimasukkan cocok dengan nilai `API_KEY` (melalui endpoint `POST /verify`).
- Kunci API (`X-API-Key`) disimpan secara aman di `localStorage` browser klien dan dilampirkan sebagai header autentikasi pada setiap transaksi REST API.
- **Auto-login** menggunakan endpoint `GET /books` (bukan `/verify`) untuk menghindari konsumsi rate limiter yang tidak perlu saat validasi sesi tersimpan.

### Security Headers (v1.1.0+):
- **Content-Security-Policy**: Diterapkan pada semua respons HTTP untuk mencegah XSS dan injeksi konten tidak terpercaya.
- **Strict-Transport-Security**: Memaksa koneksi HTTPS pada browser yang mendukung HSTS.
- **Cache-Control: no-cache** pada root route `/` mencegah reverse proxy menyajikan HTML versi lama setelah pembaruan container.

### Keamanan Notifikasi (v1.1.0+):
- **XSS Prevention di Telegram**: Seluruh konten pesan disanitasi via fungsi `escapeHtml()` sebelum dikirim ke Telegram API.
- **Graceful Shutdown**: Handler `SIGTERM`/`SIGINT` memastikan scheduler dan koneksi bersih saat container dihentikan oleh orchestrator Docker.

---

## 7. Responsive Mobile Layout (Web UI & UX)

Dashboard Web UI dirancang secara responsif dan dioptimalkan secara khusus untuk perangkat mobile/seluler:
- **Priority Stack Order**: Pada lebar viewport <= 1024px, tata letak grid dashboard (`.dashboard-grid`) otomatis diubah susunannya secara bertumpuk dengan prioritas: metrik status (Stats Panel) di bagian paling atas, diikuti oleh daftar pelacakan (Tracking List), formulir registrasi buku baru (Register Panel), dan modul rata-rata waktu terbit (Analysis Panel) di bagian paling bawah.
- **Table-to-Cards Transformation**: Pada layar <= 768px, tabel daftar pelacakan (`table#booksTable`) bertransformasi menjadi daftar kartu vertikal (cards block list) yang terstruktur rapi. Pseudo-element CSS `td::before { content: attr(data-label); }` digunakan untuk menyisipkan nama kolom secara dinamis di sebelah kiri, mencegah scroll horizontal pada perangkat kecil.
- **Peningkatan Touch Target**: Elemen navigasi tab, input modal, form row, dan checkbox jam scheduler dirancang responsif dengan class `.form-row` dan grid kolom dinamis untuk memastikan ukuran area tap (touch target) berskala minimal 44x44px, mencegah salah tekan pada perangkat sentuh.
