# isbn-notify 📖

Sistem pelacakan ISBN otomatis mandiri (**Self-Hosted**) berbasis **Node.js**, **Hono**, dan **JSON Database (Local File)**. Sistem ini memantau ketersediaan nomor ISBN secara periodik di database pencarian publik Perpusnas RI tanpa terblokir WAF (karena menggunakan IP internet perumahan/home server Anda), kemudian mengirimkan notifikasi instan ke Telegram, ntfy.sh, atau Webhook target begitu ISBN diterbitkan.

---

## 🚀 Panduan Memulai (Lokal)

### 1. Persiapan Awal
Pastikan Anda sudah menginstal Node.js (v18+). Kloning repositori ini dan instal dependensinya:
```bash
npm install
```

### 2. Konfigurasi Variabel Lingkungan
Salin file `.env.example` menjadi `.env` di root folder dan sesuaikan konfigurasinya:
```bash
cp .env.example .env
```

Isi file `.env` dengan konfigurasi Anda:
```ini
API_KEY="isbn-ntfy-keysec-678"
PORT=8787

# Kredensial Notifikasi Telegram (Opsional)
# TELEGRAM_BOT_TOKEN="token_bot_anda"
# TELEGRAM_DEFAULT_CHAT_ID="chat_id_anda"

# Kredensial Notifikasi ntfy (Opsional)
NTFY_DEFAULT_TOPIC="isbn"
NTFY_DEFAULT_URL="https://ntfy.sh"
NTFY_AUTH_TOKEN="username:password" # Otomatis dienkode ke Basic Base64 jika berisi titik dua (:)
```

### 3. Jalankan Server Development
Jalankan server dalam mode development (menggunakan `tsx` untuk hot-reload kode TypeScript):
```bash
npm run dev
```
Server akan berjalan di URL default: `http://localhost:8787`

---

## 🛠️ API Guide (Penggunaan API)

Semua request wajib menyertakan header keamanan `X-API-Key` sesuai nilai `API_KEY` yang Anda tentukan di konfigurasi.

### 1. Menambahkan Buku untuk Dilacak
Mendaftarkan buku baru ke dalam database antrean pelacakan (`status` awal adalah `PENDING`).

* **Endpoint:** `POST /books`
* **Headers:**
  * `Content-Type: application/json`
  * `X-API-Key: <nilai_api_key_anda>`
* **Body (JSON):**
  ```json
  {
    "title": "Laskar Pelangi",
    "publisher": "Bentang Pustaka",
    "author": "Andrea Hirata"
  }
  ```
* **Contoh Request (curl):**
  ```bash
  curl -X POST http://localhost:8787/books \
    -H "Content-Type: application/json" \
    -H "X-API-Key: isbn-ntfy-keysec-678" \
    -d '{"title":"Laskar Pelangi","publisher":"Bentang Pustaka","author":"Andrea Hirata"}'
  ```

---

### 2. Melihat Daftar Buku yang Dilacak
Mengembalikan daftar seluruh buku yang sedang dalam pelacakan beserta statusnya (`PENDING`/`COMPLETED`), detail ISBN yang ditemukan, dan waktu pengecekan terakhir.

* **Endpoint:** `GET /books`
* **Headers:**
  * `X-API-Key: <nilai_api_key_anda>`
* **Contoh Request (curl):**
  ```bash
  curl -X GET http://localhost:8787/books \
    -H "X-API-Key: isbn-ntfy-keysec-678"
  ```

---

### 3. Menghapus Buku dari Pelacakan
Menghentikan pelacakan dan menghapus data buku berdasarkan ID dari database.

* **Endpoint:** `DELETE /books/:id`
* **Headers:**
  * `X-API-Key: <nilai_api_key_anda>`
* **Contoh Request (curl):**
  ```bash
  curl -X DELETE http://localhost:8787/books/1 \
    -H "X-API-Key: isbn-ntfy-keysec-678"
  ```

---

### 4. Memicu Pengecekan ISBN secara Manual
Memicu pelacakan otomatis ke database Perpusnas secara instan tanpa perlu menunggu waktu penjadwalan Cron.

* **Endpoint:** `POST /check`
* **Headers:**
  * `X-API-Key: <nilai_api_key_anda>`
* **Contoh Request (curl):**
  ```bash
  curl -X POST http://localhost:8787/check \
    -H "X-API-Key: isbn-ntfy-keysec-678"
  ```

---

## 🖥️ Panduan Deployment di Home Server (Linux)

Ikuti langkah-langkah di bawah ini untuk menjalankan sistem di home server Linux secara terus-menerus (production):

### Metode A: Menggunakan Docker & Docker Compose (Rekomendasi)
Docker sangat disarankan karena mengisolasi aplikasi dan mempermudah pemeliharaan serta pembaruan.

1. Salin `docker-compose.yml.example` menjadi `docker-compose.yml`:
   ```bash
   cp docker-compose.yml.example docker-compose.yml
   ```
2. Sesuaikan konfigurasi token dan `API_KEY` di dalam `docker-compose.yml` pada bagian `environment`.
3. Jalankan container di latar belakang:
   ```bash
   docker compose up -d
   ```
4. Database akan disimpan secara persisten di folder lokal `./data/books.json`.

### Metode B: Menggunakan PM2 (Node.js Tradisional)
Jika Anda lebih memilih menjalankan aplikasi secara tradisional tanpa Docker:

1. Kloning repositori ini di Linux home server Anda, salin `.env`, lalu pasang dependensi:
   ```bash
   npm install
   ```
2. Gunakan [PM2](https://pm2.keymetrics.io/) agar server tetap berjalan di latar belakang dan otomatis menyala kembali jika server reboot:
   ```bash
   # Instal PM2 secara global jika belum ada
   npm install -g pm2

   # Build proyek dari TypeScript ke JavaScript
   npm run build

   # Jalankan server
   pm2 start dist/index.js --name "isbn-notify"

   # Pastikan PM2 berjalan saat server reboot
   pm2 startup
   pm2 save
   ```

---

## ⚙️ Cara Mengatur Jadwal Cron (Pengecekan Otomatis)

Karena server berjalan secara mandiri (self-hosted), kita menggunakan utilitas **Linux Cron** bawaan untuk menembak endpoint `/check` secara berkala (misal 3 kali sehari pada jam kerja pukul **09:00, 13:00, dan 17:00 WIB** dari hari Senin s/d Jumat).

### 1. Buka Konfigurasi Crontab
Buka crontab editor milik user Anda:
```bash
crontab -e
```

### 2. Tambahkan Baris Penjadwalan
Tambahkan baris berikut di bagian bawah file (ganti `<api_key_anda>` dengan nilai `API_KEY` Anda di `.env`):
```cron
0 9,13,17 * * 1-5 curl -X POST http://localhost:8787/check -H "X-API-Key: <api_key_anda>" > /dev/null 2>&1
```

> [!NOTE]
> Berbeda dengan Cloudflare Workers yang menggunakan waktu UTC, Linux crontab biasanya berjalan menggunakan **waktu lokal server Anda** (WIB jika zona waktu server Anda diset ke Asia/Jakarta). Pastikan waktu server Linux Anda sudah sinkron.

---

## 🧪 Uji Coba Sistem & Notifikasi

Untuk memastikan integrasi notifikasi (Telegram/ntfy/Webhook) berfungsi dengan benar, Anda dapat melakukan pengetesan menggunakan buku contoh yang **sudah memiliki ISBN** di database Perpusnas.

Kami telah menyediakan skrip pengujian otomatis `test_success.js` di dalam proyek. Anda cukup menjalankan perintah berikut:
```bash
node test_success.js
```

Skrip di atas akan secara otomatis melakukan:
1. Mendaftarkan buku uji coba *"Laskar PDGI Bali pelangi Mentawai"* (penerbit *"UD. Meta Kata"*).
2. Memicu pengecekan manual `/check`.
3. Memverifikasi bahwa status buku tersebut berubah menjadi `COMPLETED` dan nomor ISBN ditemukan (`978-602-1203-49-1`).
4. Mengirimkan notifikasi uji coba ke channel ntfy/Telegram Anda.
5. Melakukan pembersihan data uji coba dari file `books.json`.
