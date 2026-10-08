# isbn-notify

Pelacak nomor ISBN mandiri. Berjalan di server sendiri, berbasis Node.js, Hono, dan file JSON sebagai database.

isbn-notify mencari nomor ISBN di database pencarian publik Perpusnas RI secara berkala, lalu mengirim notifikasi ke Telegram, ntfy, atau webhook begitu nomornya terbit. Server ini sebaiknya dipasang di jaringan domestik, karena Perpusnas memblokir WAF pada rentang IP pusat data.

## Fitur

- **Tempel dari Perpusnas**. Salin tabel permohonan ISBN dari situs Perpusnas, tempel, dan sistem membacanya jadi daftar buku. Bisa satu buku atau banyak sekaligus, dan semua kolom masih bisa dikoreksi sebelum disimpan.
- **Notifikasi ke tiga kanal.** Telegram, ntfy, dan webhook. Isi pesan disusun dalam satu blok yang enak disalin ke klien.
- **Penjadwal internal.** Cek otomatis berjalan di dalam aplikasi pada jam yang Anda tentukan, setiap hari termasuk Sabtu dan Minggu. Tidak perlu crontab.
- **Analisis waktu terbit.** Mencatat tanggal pengajuan dan tanggal ISBN terbit, lalu menghitung rata-rata selisihnya untuk rentang waktu yang Anda pilih.
- **Filter, urutan, dan halaman.** Saring berdasarkan status (Diajukan atau Terbit), urutkan, dan atur jumlah baris per halaman.
- **Dukungan Docker.** Image tersedia di GitHub Container Registry.
- **Lapisan keamanan.** Rate limit 5 percobaan login per menit, perbandingan password secara timing-safe, dan container berjalan sebagai user non-root.

## Instalasi dengan Docker

Image-nya sudah dibangun, jadi tidak perlu build di server sendiri.

1. Buat folder baru dan masuk ke dalamnya:

   ```bash
   mkdir isbn-notify && cd isbn-notify
   ```

2. Unduh contoh konfigurasi:

   ```bash
   curl -o docker-compose.yml https://raw.githubusercontent.com/noorkhafidzin/isbn-notify/main/docker-compose.yml.example
   ```

   Atau edit sendiri `docker-compose.yml` ini:

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

   Ganti `API_KEY` dengan password yang akan Anda pakai untuk login.

3. Jalankan di latar belakang:

   ```bash
   docker compose up -d
   ```

4. Buka `http://<IP_SERVER_ANDA>:8787` di browser, lalu masukkan `API_KEY` Anda.

## Instalasi lokal

Untuk pengembangan atau kalau mau jalan tanpa Docker. Butuh Node.js 20, versi yang dipakai image Docker.

```bash
git clone https://github.com/noorkhafidzin/isbn-notify.git
cd isbn-notify
npm install
```

Salin `.env.example` ke `.env` lalu sesuaikan:

```bash
cp .env.example .env
```

`API_KEY` wajib diisi. Konfigurasi notifikasi tidak wajib, bisa diisi nanti dari tab Pengaturan.

Jalankan dengan `npm run dev` untuk mode pengembangan. Untuk produksi tanpa Docker, `npm run build` lalu jalankan `dist/index.js` dengan process manager seperti PM2.

## Penjadwal

Penjadwalan berjalan di dalam proses Node.js, jadi tidak ada lagi crontab yang perlu disetel.

1. Buka tab **Pengaturan**, bagian **Penjadwal Latar Belakang**.
2. Pilih **Jadwal khusus**, lalu tekan **Tambah waktu** untuk menambah jam pemeriksaan, misalnya `09:00`, `13:00`, `17:00`.
3. Pilih **Manual saja** kalau tidak ingin pengecekan otomatis.

Kalau tidak ada jam yang diisi, penjadwal tidak aktif. Jadwal yang terisi berjalan setiap hari.

Hindari lebih dari 4 pemeriksaan sehari. Perpusnas memakai WAF, dan terlalu sering pengecekan bisa membuat IP Anda diblokir. Aplikasi ini akan memperingatkan kalau Anda melampaui batas tersebut.

## API

Semua request perlu header `X-API-Key` yang isinya sama dengan `API_KEY`.

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/books` | Daftar buku yang dilacak beserta statusnya. |
| `POST` | `/books` | Mendaftarkan buku baru. |
| `PUT` | `/books/:id` | Mengubah judul, penerbit, pengarang, status, ISBN, atau tanggal. |
| `DELETE` | `/books/:id` | Menghapus buku. |
| `GET` | `/settings` | Konfigurasi notifikasi dan penjadwal. |
| `POST` | `/settings` | Menyimpan konfigurasi notifikasi dan penjadwal. |
| `POST` | `/check` | Menjalankan pengecekan ke Perpusnas tanpa menunggu jadwal. |
| `POST` | `/verify` | Verifikasi password login. |

Menambahkan satu buku:

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

Mengoreksi tanggal ISBN terbit secara manual:

```bash
curl -X PUT http://localhost:8787/books/1 \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ganti_dengan_password_rahasia_anda" \
  -d '{
    "isbn_published_date": "2025-03-20"
  }'
```

## Menguji notifikasi

Cara paling cepat cek apakah integrasi notifikasi jalan: isi dulu konfigurasi di tab **Pengaturan**, tekan **Simpan konfigurasi**, lalu klik **Cek ISBN** di tab Daftar Pelacakan. Notifikasi untuk buku yang ISBN-nya baru terbit akan langsung terkirim, jadi siapkan dulu satu buku berstatus Diajukan.

Lewat API:

```bash
curl -X POST http://localhost:8787/check \
  -H "X-API-Key: ganti_dengan_password_rahasia_anda"
```

## Lanjutan

Catatan lengkap soal arsitektur, algoritma pencocokan judul, format pesan notifikasi, dan riwayat perubahan ada di [BLUEPRINT.md](BLUEPRINT.md) dan [CHANGELOG.md](CHANGELOG.md).