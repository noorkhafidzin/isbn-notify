# Blueprint — isbn-notify

- **Version:** v1.0.0
- **Last Updated:** 2026-06-24
- **Tech Stack:** Cloudflare Workers, Hono, Cloudflare D1 (SQLite), TypeScript

---

## 1. System Overview

Sistem backend serverless yang berjalan di atas **Cloudflare Workers Edge Runtime** untuk memonitor ketersediaan/penerbitan nomor ISBN dari portal Perpustakaan Nasional (Perpusnas) RI secara otomatis berdasarkan judul buku dan nama penerbit, kemudian mendistribusikan notifikasi secara dinamis ke Telegram, ntfy.sh, atau Webhook target.

---

## 2. Database Architecture (D1 SQLite)

Tabel utama `books` menyimpan informasi buku yang didaftarkan serta preferensi notifikasi spesifik:

```sql
CREATE TABLE books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT,
    publisher TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'COMPLETED'
    isbn TEXT,
    tg_chat_id TEXT,
    ntfy_topic TEXT,
    webhook_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_checked_at DATETIME
);
```

### Flow Status Pelacakan:
1. Pengguna memasukkan judul buku (dan opsional penerbit/author) via POST request. Data disimpan dengan status `PENDING`.
2. Cron Job melacak setiap buku berstatus `PENDING` dengan menembak API Perpusnas:
   `https://isbn.perpusnas.go.id/landing_page/serverside_search2?search={title}&filter_by={filter}`
3. Bila judul dan penerbit/author cocok, nomor ISBN diekstrak.
4. Status diperbarui ke `COMPLETED`, field `isbn` diisi, dan notifikasi dikirim ke channel yang ditentukan. Buku dengan status `COMPLETED` tidak akan diproses di putaran cron berikutnya.

---

## 3. API Endpoints

Semua endpoint dilindungi menggunakan header `X-API-Key`.

- **`GET /books`**
  Mengambil seluruh data buku yang ada di database.
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
  Menghapus buku berdasarkan ID dari database.
- **`POST /check`**
  Memicu proses pelacakan manual secara instan di latar belakang.

---

## 4. Notification Integration Details

- **Telegram:**
  POST ke `https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/sendMessage` dengan body payload JSON `{ chat_id, text, parse_mode: "HTML" }`.
- **ntfy.sh:**
  POST ke `https://ntfy.sh/<TOPIC>` dengan message body teks dan header ASCII (`Title`, `Priority`, `Tags`).
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

## 5. Scheduled Cron Job

Workers scheduled event dikonfigurasi melalui `wrangler.toml` dengan jadwal `0 2,6,10 * * 1-5` UTC yang setara dengan **09:00, 13:00, dan 17:00 WIB** pada hari kerja (Senin - Jumat) untuk mencocokkan waktu operasional backend Perpusnas RI.
