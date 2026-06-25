# isbn-notify 📖

Sistem pelacakan ISBN otomatis mandiri (**Self-Hosted**) berbasis **Node.js**, **Hono**, dan **JSON Database (Local File)**. 

Sistem ini memantau ketersediaan nomor ISBN secara periodik di database pencarian publik Perpusnas RI tanpa terblokir WAF (karena menggunakan IP internet perumahan/home server Anda), kemudian mengirimkan notifikasi instan ke Telegram, ntfy.sh, atau Webhook target begitu ISBN diterbitkan.

---

## ✨ Fitur Utama
- 🚀 **Bebas WAF**: Menggunakan IP perumahan Anda sendiri, aman dari blokir firewall Perpusnas.
- 🔔 **Multi-Notifikasi**: Dukungan bawaan untuk Telegram, ntfy.sh, dan custom Webhook.
- 🕒 **Smart Scheduler**: Penjadwalan otomatis internal yang cerdas, otomatis melewati hari libur (Sabtu & Minggu).
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

2. Buat file `docker-compose.yml` dan *copy-paste* konfigurasi berikut:
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

3. Jalankan server:
   - **Mode Development** (dengan hot-reload): `npm run dev`
   - **Mode Production** (dengan PM2):
     ```bash
     npm run build
     pm2 start dist/index.js --name "isbn-notify"
     ```

---

## ⚙️ Penjadwal Latar Belakang (Internal Scheduler)

Sistem ini memiliki **Internal Background Scheduler** yang berjalan langsung di dalam aplikasi. Anda **tidak perlu lagi** mengkonfigurasi utilitas Linux Crontab secara manual.

1. Buka dashboard di browser, lalu buka tab **Settings & Scheduler**.
2. Pada bagian **Background Scheduler**, pilih interval atau jam-jam spesifik pemicuan otomatis pelacakan ISBN.
   - **Pilih Jam Kustom:** Memungkinkan Anda mencentang jam-jam tertentu (misal: `09:00`, `13:00`, dan `17:00`).
   - **Lewati Akhir Pekan:** Penjadwal secara cerdas akan melewati hari Sabtu & Minggu (hanya berjalan Senin-Jumat) demi menyelaraskan dengan jam kerja operasional Perpusnas.
3. **Peringatan:** Demi keselamatan IP Anda dari blokir WAF Perpusnas, hindari memilih terlalu banyak jam dalam sehari (disarankan maksimal 3-4 kali sehari).

---

## 🛠️ API Guide (Penggunaan API)

Semua request wajib menyertakan header keamanan `X-API-Key` sesuai nilai `API_KEY` Anda.

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/books` | Melihat daftar buku yang dilacak beserta statusnya. |
| `POST` | `/books` | Mendaftarkan buku baru (`title`, `publisher`, `author`). |
| `PUT` | `/books/:id` | Mengupdate properti buku (status, nomor ISBN, manual override notifikasi). |
| `DELETE`| `/books/:id` | Menghapus buku dari database pelacakan. |
| `POST` | `/check` | Memicu pengecekan instan ke Perpusnas tanpa menunggu jadwal. |

Contoh menambahkan buku (cURL):
```bash
curl -X POST http://localhost:8787/books \
  -H "Content-Type: application/json" \
  -H "X-API-Key: rahasia123" \
  -d '{"title":"Laskar Pelangi","publisher":"Bentang Pustaka","author":"Andrea Hirata"}'
```

---

## 🧪 Uji Coba Notifikasi

Anda dapat melakukan pengetesan integrasi notifikasi (Telegram/ntfy/Webhook) menggunakan skrip uji coba:
```bash
node test_success.js
```
Skrip ini akan menyimulasikan penemuan ISBN untuk buku contoh dan mengirimkan notifikasi uji coba ke channel Anda.
