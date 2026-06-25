# Blueprint — isbn-notify

- **Version:** v1.0.0
- **Last Updated:** 2026-06-25
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
2. Cron Job lokal melacak setiap buku berstatus `PENDING` dengan menembak API Perpusnas:
   `https://isbn.perpusnas.go.id/landing_page/serverside_search2?search={title}&filter_by=title`
3. Bila judul dan penerbit/author cocok, nomor ISBN diekstrak.
4. Status diperbarui ke `COMPLETED`, field `isbn` diisi, dan notifikasi dikirim ke channel yang ditentukan. Buku dengan status `COMPLETED` tidak diproses kembali pada putaran cron berikutnya.

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
- **`custom`**: Melakukan pengecekan otomatis pada jam-jam spesifik (misalnya pukul `09:00`, `13:00`, dan `17:00`) yang dipilih secara bebas dari antarmuka Web UI.

### Fitur Kustomisasi Jadwal & Pencegahan Blokir WAF:
1. **Weekend Skip:** Pada mode kustom (`custom`), penjadwal secara otomatis melewatkan hari Sabtu dan Minggu (pengecekan hanya akan dijadwalkan ulang pada hari kerja Senin-Jumat) untuk menyelaraskan dengan jam operasional server Perpustakaan Nasional.
2. **Dynamic Rescheduling:** Setiap kali pengaturan di-save via Web UI, timer aktif lama akan dibersihkan (`clearTimeout`/`clearInterval`) dan penjadwal baru akan dihitung serta dijadwalkan ulang secara real-time.
3. **Firewall WAF Warning:** Karena server Perpusnas menerapkan Web Application Firewall (WAF) yang ketat, Web UI akan memicu peringatan dinamis jika pengguna mengaktifkan lebih dari 4 jam pemeriksaan dalam sehari, mendidik pengguna agar menghindari risiko pemblokiran IP.

---

## 6. Authentication Overlay & Web UI Security

Aplikasi ini menggunakan Single Page App (SPA) dashboard yang dilindungi oleh **Login Overlay**. 
- Ketika pengguna pertama kali mengakses halaman root `/`, dashboard penuh dikunci sampai password verifikasi yang dimasukkan cocok dengan nilai `API_KEY` (melalui endpoint `POST /verify`).
- Kunci API (`X-API-Key`) disimpan secara aman di `localStorage` browser klien dan dilampirkan sebagai header autentikasi pada setiap transaksi REST API.

---

## 7. Responsive Mobile Layout (Web UI & UX)

Dashboard Web UI dirancang secara responsif dan dioptimalkan secara khusus untuk perangkat mobile/seluler:
- **Priority Stack Order**: Pada lebar viewport <= 1024px, tata letak grid dashboard (`.dashboard-grid`) otomatis diubah susunannya secara bertumpuk dengan prioritas: metrik status (Stats Panel) di bagian paling atas, diikuti oleh daftar pelacakan (Tracking List), formulir registrasi buku baru (Register Panel), dan modul rata-rata waktu terbit (Analysis Panel) di bagian paling bawah.
- **Table-to-Cards Transformation**: Pada layar <= 768px, tabel daftar pelacakan (`table#booksTable`) bertransformasi menjadi daftar kartu vertikal (cards block list) yang terstruktur rapi. Pseudo-element CSS `td::before { content: attr(data-label); }` digunakan untuk menyisipkan nama kolom secara dinamis di sebelah kiri, mencegah scroll horizontal pada perangkat kecil.
- **Peningkatan Touch Target**: Elemen navigasi tab, input modal, form row, dan checkbox jam scheduler dirancang responsif dengan class `.form-row` dan grid kolom dinamis untuk memastikan ukuran area tap (touch target) berskala minimal 44x44px, mencegah salah tekan pada perangkat sentuh.
