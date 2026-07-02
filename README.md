# isbn-notify 📖

Sistem pelacakan ISBN otomatis mandiri (**Self-Hosted**) berbasis **Node.js**, **Hono**, dan **JSON Database (Local File)**. 

Sistem ini memantau ketersediaan nomor ISBN secara periodik di database pencarian publik Perpusnas RI tanpa terblokir WAF (karena menggunakan IP internet perumahan/home server Anda), kemudian mengirimkan notifikasi instan ke Telegram, ntfy.sh, atau Webhook target begitu ISBN diterbitkan.

---

## ✨ Fitur Utama
- 🚀 **Bebas WAF**: Menggunakan IP perumahan Anda sendiri, aman dari blokir firewall Perpusnas.
- 🔔 **Multi-Notifikasi**: Dukungan bawaan untuk Telegram, ntfy.sh, dan custom Webhook.
- 🕒 **Smart Scheduler**: Penjadwalan otomatis internal yang cerdas, bebas pilih jam-jam spesifik, otomatis melewati hari libur (Sabtu & Minggu).
- 📅 **Pelacakan Tanggal**: Catat tanggal pengajuan dan tanggal terbit ISBN secara otomatis/manual, lengkap dengan analisis rata-rata waktu terbit.
- 🐳 **Docker Ready**: Sangat mudah di-deploy ke server menggunakan Docker Compose.
- 🔒 **Aman**: Dilengkapi proteksi rate-limiting, timing-attack prevention, dan Docker non-root user.

---

## 🚀 Panduan Instalasi (Server / Production)

Cara termudah dan paling direkomendasikan untuk menginstal **isbn-notify** adalah menggunakan Docker Compose. Anda tidak perlu mem-build dari awal karena pre-built image sudah tersedia di GitHub Container Registry (GHCR).

### Menggunakan Docker Compose (Rekomendasi)

1. Buat sebuah folder baru di server Anda (misal: `isbn-notify`) dan masuk ke dalamnya:
   ```bash
   mkdir isbn-notify && cd isbn-notify
   ```

2. Unduh file contoh konfigurasi lalu ganti namanya:
   ```bash
   curl -o docker-compose.yml https://raw.githubusercontent.com/noorkhafidzin/isbn-notify/main/docker-compose.yml.example
   ```
   Atau buat file `docker-compose.yml` baru dan *copy-paste* konfigurasi berikut:
   ```yaml
   services:
     isbn-notify:
       image: ghcr.io/noorkhafidzin/isbn-notify:latest
       container_name: isbn-notify
       ports:
         - "8787:8787"
       volumes:
         - ./data:/app/data
       environment:
         - TZ=Asia/Jakarta
         - API_KEY=ganti_dengan_password_rahasia_anda
         - PORT=8787
         
         # Optional Notification Settings
         - NTFY_DEFAULT_TOPIC=isbn
         - NTFY_DEFAULT_URL=https://ntfy.sh
         # - NTFY_AUTH_TOKEN=username:password
         # - TELEGRAM_BOT_TOKEN=your_telegram_bot_token
         # - TELEGRAM_DEFAULT_CHAT_ID=your_telegram_chat_id
       restart: unless-stopped
   ```
   *(Jangan lupa ubah `API_KEY` dengan password rahasia yang akan Anda gunakan untuk login!)*

3. Jalankan server di latar belakang:
   ```bash
   docker compose up -d
   ```

4. Buka browser dan akses `http://<IP_SERVER_ANDA>:8787`. Masukkan `API_KEY` Anda untuk masuk ke Dashboard!

---

## 💻 Panduan Instalasi (Lokal / Development)

Jika Anda ingin menjalankan aplikasi secara tradisional (tanpa Docker) atau untuk keperluan development:

1. Kloning repositori ini dan instal dependensinya (butuh Node.js v18+):
   ```bash
   git clone https://github.com/noorkhafidzin/isbn-notify.git
   cd isbn-notify
   npm install
   ```

2. Konfigurasi Environment:
   Salin `.env.example` ke `.env` lalu edit sesuai kebutuhan Anda.
   ```bash
   cp .env.example .env
   ```
   > ⚠️ **Penting:** `API_KEY` **wajib** diisi. Konfigurasi notifikasi (Telegram, ntfy, dll.) bersifat opsional dan bisa juga diatur lewat Settings di Dashboard.

3. Jalankan server:
   - **Mode Development** (dengan hot-reload): `npm run dev`
   - **Mode Production** (tanpa Docker, dengan PM2):
     ```bash
     npm run build
     pm2 start npm --name "isbn-notify" -- start
     ```

---

## ⚙️ Penjadwal Latar Belakang (Internal Scheduler)

Sistem ini memiliki **Internal Background Scheduler** yang berjalan langsung di dalam aplikasi. Anda **tidak perlu lagi** mengkonfigurasi utilitas Linux Crontab secara manual.

1. Buka dashboard di browser, lalu buka tab **Settings & Scheduler**.
2. Pada bagian **Background Scheduler**, centang jam-jam spesifik yang Anda inginkan untuk pengecekan otomatis (misal: `09:00`, `13:00`, `17:00`).
   - Jika tidak ada jam yang dipilih, scheduler dalam kondisi **nonaktif**.
   - Scheduler berjalan **setiap hari** sesuai jam yang dipilih.
3. **⚠️ Peringatan:** Demi keselamatan IP Anda dari blokir WAF Perpusnas, hindari memilih lebih dari 4 kali dalam sehari. Sistem akan menampilkan peringatan jika Anda memilih lebih dari 4 kali.

---

## 🛠️ API Guide (Penggunaan API)

Semua request wajib menyertakan header keamanan `X-API-Key` sesuai nilai `API_KEY` Anda.

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/books` | Melihat daftar buku yang dilacak beserta statusnya. |
| `POST` | `/books` | Mendaftarkan buku baru untuk dilacak. |
| `PUT` | `/books/:id` | Mengupdate properti buku (judul, penulis, penerbit, status, ISBN, tanggal, dll.). |
| `DELETE`| `/books/:id` | Menghapus buku dari database pelacakan. |
| `GET` | `/settings` | Melihat konfigurasi global (notifikasi & scheduler). |
| `POST` | `/settings` | Menyimpan konfigurasi global (notifikasi & scheduler). |
| `POST` | `/check` | Memicu pengecekan instan ke Perpusnas tanpa menunggu jadwal. |
| `POST` | `/verify` | Verifikasi password login (rate-limited, timing-safe). |

### Contoh: Menambahkan buku (cURL)
```bash
curl -X POST http://localhost:8787/books \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ganti_dengan_password_rahasia_anda" \
  -d '{
    "title": "Laskar Pelangi",
    "publisher": "Bentang Pustaka",
    "author": "Andrea Hirata",
    "submission_date": "2025-01-15"
  }'
```

### Contoh: Mengupdate tanggal terbit ISBN secara manual (cURL)
```bash
curl -X PUT http://localhost:8787/books/1 \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ganti_dengan_password_rahasia_anda" \
  -d '{
    "isbn_published_date": "2025-03-20"
  }'
```

---

## 📊 Analisis Waktu Terbit

Dashboard menyediakan widget **Analisis Waktu Terbit** yang menghitung rata-rata durasi dari tanggal pengajuan hingga tanggal terbit ISBN. Filter rentang waktu tersedia (1 bulan, 2 bulan, 3 bulan, atau rentang kustom) agar analisis lebih relevan.

---

## 🧪 Uji Coba Notifikasi

Anda dapat menguji integrasi notifikasi (Telegram/ntfy/Webhook) langsung dari Dashboard:

1. Buka tab **Settings & Scheduler**.
2. Isi konfigurasi notifikasi yang ingin diuji.
3. Simpan, lalu klik tombol **Cek Sekarang** untuk memicu pengecekan manual dan melihat apakah notifikasi terkirim.

Atau gunakan API endpoint `/check` secara langsung:
```bash
curl -X POST http://localhost:8787/check \
  -H "X-API-Key: ganti_dengan_password_rahasia_anda"
```
