export const renderUI = () => `<!DOCTYPE html>
<html lang="id" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ISBN Notify: Dasbor Pelacakan</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&family=Source+Code+Pro:wght@400;600&display=swap" rel="stylesheet">
  <!-- Pinned to an exact version (audit 001 finding 17).
       SRI hash is MISSING and must be filled in before this ships:
         npm pack lucide@0.469.0
         openssl dgst -sha384 -binary dist/umd/lucide.min.js | openssl base64 -A
       then add integrity="sha384-<that value>". A fabricated hash would block
       the script entirely, so it is deliberately absent rather than guessed. -->
  <script src="https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js" crossorigin="anonymous"></script>
  <link rel="stylesheet" href="/ui.css">
  <script>
    // Applied before first paint so a stored theme choice never flashes.
    (function () {
      try {
        var t = localStorage.getItem('isbn_notify_theme');
        if (t === 'light' || t === 'dark') {
          document.documentElement.setAttribute('data-theme', t);
        }
      } catch (e) {}
    })();
  </script>
</head>
<body>

  <a href="#main" class="visually-hidden">Lompat ke konten utama</a>

  <!-- Login -->
  <div id="loginOverlay" class="overlay">
    <div class="dialog dialog-sm" role="dialog" aria-modal="true" aria-labelledby="loginTitle">
      <div class="brand" style="margin-bottom:1rem">
        <svg class="brand-mark" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
        </svg>
        <span class="brand-name">ISBN Notify</span>
      </div>
      <h1 id="loginTitle" class="section-title" style="margin-bottom:0.25rem">Dashboard terkunci</h1>
      <p class="hint" style="margin-bottom:1.25rem">Masukkan password untuk membuka daftar pelacakan ISBN Anda.</p>
      <form onsubmit="handleLogin(event)">
        <div class="form-group">
          <label for="loginPassword">Password</label>
          <input type="password" id="loginPassword" class="form-control" autocomplete="current-password" required>
        </div>
        <button type="submit" class="btn btn-primary btn-block" id="btnLoginSubmit">
          <i data-lucide="lock-open" aria-hidden="true"></i>
          Buka dashboard
        </button>
      </form>
    </div>
  </div>

  <main class="container" id="main" tabindex="-1" hidden>

    <header>
      <div class="brand">
        <svg class="brand-mark" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
        </svg>
        <span class="brand-name">ISBN Notify</span>
      </div>

      <nav class="tabs-nav" aria-label="Navigasi utama">
        <div class="tablist" role="tablist" aria-label="Tampilan">
          <button type="button" role="tab" id="tabBtnTracking" class="tab-btn" aria-selected="true" aria-controls="tabContentTracking" onclick="switchTab('tracking')">
            <i data-lucide="book-open" aria-hidden="true"></i>
            Daftar Pelacakan
          </button>
          <button type="button" role="tab" id="tabBtnSettings" class="tab-btn" aria-selected="false" aria-controls="tabContentSettings" onclick="switchTab('settings')">
            <i data-lucide="sliders" aria-hidden="true"></i>
            Pengaturan
          </button>
        </div>
        <div class="nav-actions">
          <button type="button" class="icon-btn theme-toggle" id="btnTheme" aria-label="Ganti tema" title="Ganti tema terang/gelap" onclick="toggleTheme()">
            <i data-lucide="sun-moon" aria-hidden="true"></i>
          </button>
          <button type="button" class="tab-btn logout" onclick="handleLogout()">
            <i data-lucide="log-out" aria-hidden="true"></i>
            Keluar
          </button>
        </div>
      </nav>
    </header>

    <!-- Tracking -->
    <div id="tabContentTracking" class="dashboard-grid" role="tabpanel" aria-labelledby="tabBtnTracking">

      <div class="card stats-container">
        <div class="stat">
          <span class="stat-val" id="statTotal">0</span>
          <span class="stat-lbl">Total</span>
        </div>
        <div class="stat-divider" role="presentation"></div>
        <div class="stat">
          <span class="stat-val" id="statPending">0</span>
          <span class="stat-lbl">Diajukan</span>
        </div>
        <div class="stat-divider" role="presentation"></div>
        <div class="stat">
          <span class="stat-val" id="statCompleted">0</span>
          <span class="stat-lbl">Terbit</span>
        </div>
      </div>

      <section class="card" aria-labelledby="analysisTitle">
        <h2 class="section-title" id="analysisTitle">
          <i data-lucide="calendar-range" class="icon" aria-hidden="true"></i>
          Rata-rata Lama Terbit
        </h2>
        <div class="form-group">
          <label for="avgTimeFilter">Rentang waktu</label>
          <select id="avgTimeFilter" class="form-control" onchange="calculateAverageTime()">
            <option value="all">Semua waktu</option>
            <option value="1m">1 bulan terakhir</option>
            <option value="2m">2 bulan terakhir</option>
            <option value="3m">3 bulan terakhir</option>
            <option value="custom">Rentang khusus</option>
          </select>
        </div>
        <div id="customRangePicker" class="form-row" hidden>
          <div class="form-group">
            <label for="avgStartDate">Dari tanggal</label>
            <input type="date" id="avgStartDate" class="form-control" onchange="calculateAverageTime()">
          </div>
          <div class="form-group">
            <label for="avgEndDate">Sampai tanggal</label>
            <input type="date" id="avgEndDate" class="form-control" onchange="calculateAverageTime()">
          </div>
        </div>
        <div style="margin-top:0.5rem">
          <span class="stat-lbl">Rata-rata dari pengajuan</span>
          <div class="plate plate-accent" id="avgTimeResult" style="font-size:1.25rem;font-weight:600;margin-top:0.25rem">Belum ada data</div>
          <span class="cell-sub" id="avgTimeCount" style="display:block;margin-top:0.25rem">Memuat...</span>
        </div>
      </section>

      <section class="card" aria-labelledby="registerTitle">
        <h2 class="section-title" id="registerTitle">
          <i data-lucide="plus-circle" class="icon" aria-hidden="true"></i>
          Daftar Buku Baru
        </h2>

        <button type="button" class="btn btn-primary btn-block" onclick="openQuickAddModal()">
          <i data-lucide="clipboard-paste" aria-hidden="true"></i>
          Tempel dari Perpusnas
        </button>

        <div class="divider-row">atau isi manual</div>

        <form id="addBookForm" onsubmit="handleAddBook(event)">
          <div class="form-group">
            <label for="title">Judul buku *</label>
            <input type="text" id="title" class="form-control" required>
          </div>
          <div class="form-group">
            <label for="publisher">Penerbit</label>
            <input type="text" id="publisher" class="form-control" list="publisherList">
            <datalist id="publisherList"></datalist>
          </div>
          <div class="form-group">
            <label for="author">Pengarang</label>
            <input type="text" id="author" class="form-control">
          </div>
          <div class="form-group">
            <label for="submissionDate">Tanggal pengajuan *</label>
            <input type="date" id="submissionDate" class="form-control" required>
          </div>

          <div style="margin:1.125rem 0 0.5rem">
            <button type="button" class="disclosure" id="advToggle" aria-expanded="false" aria-controls="advancedSettings" onclick="toggleAdvancedSettings()">
              <span>Notifikasi khusus buku ini</span>
              <i data-lucide="chevron-down" class="chevron" aria-hidden="true"></i>
            </button>
          </div>

          <div id="advancedSettings" hidden>
            <div class="form-group">
              <label for="ntfyTopic">Topik ntfy khusus</label>
              <input type="text" id="ntfyTopic" class="form-control">
            </div>
            <div class="form-group">
              <label for="tgChatId">Chat ID Telegram khusus</label>
              <input type="text" id="tgChatId" class="form-control">
            </div>
            <div class="form-group">
              <label for="webhookUrl">URL webhook khusus</label>
              <input type="url" id="webhookUrl" class="form-control">
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-block" id="btnSubmit" style="margin-top:1rem">
            <i data-lucide="save" aria-hidden="true"></i>
            Mulai lacak
          </button>
        </form>
      </section>

      <section class="card" aria-labelledby="trackingTitle">
        <div class="panel-header">
          <h2 class="panel-title" id="trackingTitle">
            <i data-lucide="book-open" class="icon" aria-hidden="true"></i>
            Daftar Pelacakan
          </h2>
          <div class="search-bar">
            <label for="searchQuery" class="visually-hidden">Cari judul, penerbit, atau pengarang</label>
            <input type="search" id="searchQuery" class="form-control" placeholder="Cari judul, penerbit, atau pengarang" oninput="onSearchInput()">
          </div>
          <div>
            <label for="sortOrder" class="visually-hidden">Urutkan daftar buku</label>
            <select id="sortOrder" class="form-control filter-select" onchange="setSortOrder(this.value)">
              <option value="newest">Terbaru dulu</option>
              <option value="oldest">Terlama dulu</option>
            </select>
          </div>
          <div>
            <label for="statusFilter" class="visually-hidden">Filter menurut status</label>
            <select id="statusFilter" class="form-control filter-select" onchange="filterByStatus(this.value)">
              <option value="all">Semua status</option>
              <option value="PENDING">Diajukan</option>
              <option value="COMPLETED">Terbit</option>
            </select>
          </div>
          <button type="button" class="btn btn-secondary" id="btnCheckNow" onclick="handleManualCheck()">
            <i data-lucide="refresh-cw" id="checkIcon" aria-hidden="true"></i>
            <span>Cek ISBN</span>
          </button>
        </div>

        <div class="table-container">
          <table>
            <caption class="visually-hidden">Daftar buku yang sedang dilacak beserta status ISBN</caption>
            <thead>
              <tr>
                <th scope="col">No.</th>
                <th scope="col">Judul</th>
                <th scope="col">Pengarang dan penerbit</th>
                <th scope="col">Status</th>
                <th scope="col">ISBN</th>
                <th scope="col" style="text-align:right">Aksi</th>
              </tr>
            </thead>
            <tbody id="booksListBody"></tbody>
          </table>
        </div>

        <!-- Only shown while a filter or search is narrowing the list. An
             unfiltered "showing 15 of 15" is noise, not information. -->
        <div class="panel-meta" id="listSummary" hidden>
          <span id="listSummaryText"></span>
          <button type="button" class="link-btn" id="btnResetFilters" onclick="resetAllFilters()">
            Hapus filter
          </button>
        </div>

        <div class="pagination" id="paginationControls" hidden>
          <div class="page-size-row">
            <label for="pageSizeSelect" class="pagination-info">Tampilkan</label>
            <select id="pageSizeSelect" class="form-control" onchange="changePageSize(this.value)">
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="all">Semua</option>
            </select>
            <span class="pagination-info">data per halaman</span>
          </div>
          <div class="page-buttons" id="pageButtons"></div>
        </div>
      </section>
    </div>

    <!-- Settings -->
    <div id="tabContentSettings" class="settings-grid" role="tabpanel" aria-labelledby="tabBtnSettings" hidden>
      <div class="settings-col">
        <section class="card" aria-labelledby="notifTitle">
          <h2 class="section-title" id="notifTitle">
            <i data-lucide="bell" class="icon" aria-hidden="true"></i>
            Integrasi Notifikasi
          </h2>

          <form id="settingsNotifForm" onsubmit="handleSaveSettings(event)">
            <div class="subgroup">
              <h3 class="subgroup-title">ntfy</h3>
              <div class="form-group">
                <label for="cfgNtfyUrl">URL base server</label>
                <input type="url" id="cfgNtfyUrl" class="form-control" placeholder="https://ntfy.sh">
              </div>
              <div class="form-group">
                <label for="cfgNtfyTopic">Topik default</label>
                <input type="text" id="cfgNtfyTopic" class="form-control" placeholder="isbn">
              </div>
              <div class="form-group">
                <label for="cfgNtfyAuth">Token otorisasi</label>
                <input type="password" id="cfgNtfyAuth" class="form-control" autocomplete="off">
              </div>
            </div>

            <div class="subgroup">
              <h3 class="subgroup-title">Telegram</h3>
              <div class="form-group">
                <label for="cfgTgToken">Bot token</label>
                <input type="password" id="cfgTgToken" class="form-control" autocomplete="off">
              </div>
              <div class="form-group">
                <label for="cfgTgChat">Chat ID atau channel ID default</label>
                <input type="text" id="cfgTgChat" class="form-control" placeholder="-100...">
              </div>
            </div>

            <div class="subgroup">
              <h3 class="subgroup-title">Webhook</h3>
              <div class="form-group">
                <label for="cfgWebhookUrl">URL webhook default</label>
                <input type="url" id="cfgWebhookUrl" class="form-control" placeholder="https://contoh.domain/webhook">
              </div>
            </div>
          </form>
        </section>
      </div>

      <div class="settings-col">
        <section class="card" aria-labelledby="schedulerTitle">
          <h2 class="section-title" id="schedulerTitle">
            <i data-lucide="clock" class="icon" aria-hidden="true"></i>
            Penjadwal Latar Belakang
          </h2>
          <p class="hint" style="margin-bottom:1.25rem">
            Jadwal ini berlaku setiap hari. Saat nomor ISBN terbit, notifikasi langsung dikirim ke kanal yang Anda daftarkan.
          </p>

          <div class="form-group">
            <label for="cfgScheduler">Interval pemeriksaan</label>
            <select id="cfgScheduler" class="form-control" onchange="toggleScheduleContainer()">
              <option value="custom">Jadwal khusus</option>
              <option value="disabled">Manual saja</option>
            </select>
          </div>

          <div id="customScheduleContainer" hidden>
            <p class="form-group" id="scheduleLabel" style="margin-bottom:0.5rem;font-size:0.8125rem;font-weight:600;color:var(--ink-muted)">Waktu pemeriksaan (waktu lokal server)</p>
            <div id="scheduleList" class="form-group" style="margin-bottom:0.75rem" role="group" aria-labelledby="scheduleLabel"></div>
            <button type="button" class="btn btn-secondary btn-block" onclick="addScheduleEntry()">
              <i data-lucide="plus" aria-hidden="true"></i>
              Tambah waktu
            </button>
            <div id="schedulerWarning" class="notice notice-warning" hidden>
              <i data-lucide="alert-triangle" aria-hidden="true"></i>
              <span>Lebih dari 4 pemeriksaan sehari dapat memicu pemblokiran firewall (WAF) dari server Perpusnas.</span>
            </div>
          </div>

          <div class="btn-row" style="margin-top:1.5rem;justify-content:flex-start">
            <button type="submit" class="btn btn-primary" form="settingsNotifForm">
              <i data-lucide="save" aria-hidden="true"></i>
              Simpan konfigurasi
            </button>
          </div>
        </section>
      </div>
    </div>

    <footer class="site-footer">
      <p>Dibuat oleh <a href="https://github.com/noorkhafidzin/isbn-notify" target="_blank" rel="noopener noreferrer">Noor Khafidzin</a> untuk kebutuhan instance cataloging</p>
    </footer>
  </main>

  <!-- Quick Add -->
  <div id="quickAddModal" class="overlay" role="dialog" aria-modal="true" aria-labelledby="quickAddTitle" hidden>
    <div class="dialog dialog-lg">
      <h2 class="section-title" id="quickAddTitle">
        <i data-lucide="clipboard-paste" class="icon" aria-hidden="true"></i>
        Tempel dari Perpusnas
      </h2>
      <p class="hint" style="margin-bottom:1rem">
        Salin tabel permohonan ISBN dari halaman Perpusnas, lalu tempel di bawah. Semua kolom masih bisa Anda ubah sebelum ditambahkan.
      </p>
      <label for="quickAddInput" class="visually-hidden">Data tabel permohonan ISBN</label>
      <textarea id="quickAddInput" class="form-control" rows="7" style="font-family:var(--font-mono);font-size:0.8125rem"></textarea>

      <div class="btn-row" style="margin-top:1rem">
        <button type="button" class="btn btn-secondary" onclick="closeQuickAddModal()">Batal</button>
        <button type="button" class="btn btn-primary" id="btnParseData" onclick="handleParseData()">
          <i data-lucide="list" aria-hidden="true"></i>
          Baca Data
        </button>
      </div>

      <div id="quickAddPreview" hidden style="margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid var(--border)">
        <div class="preview-summary">
          <span class="pagination-info" id="quickAddCount"></span>
          <button type="button" class="btn btn-secondary" onclick="toggleSelectAllQuickAdd()">Pilih semua</button>
        </div>
        <div id="quickAddBooksList" class="preview-list"></div>
        <div class="btn-row" style="margin-top:1rem">
          <button type="button" class="btn btn-secondary" onclick="closeQuickAddModal()">Batal</button>
          <button type="button" class="btn btn-primary" id="btnQuickAddSubmit" onclick="handleQuickAddSubmit()">
            <i data-lucide="plus" aria-hidden="true"></i>
            Tambahkan <span id="quickAddSelectedCount">0</span> buku
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Edit book -->
  <div id="editBookModal" class="overlay" role="dialog" aria-modal="true" aria-labelledby="editBookModalTitle" hidden>
    <div class="dialog dialog-sm">
      <h2 class="section-title" id="editBookModalTitle">
        <i data-lucide="edit-3" class="icon" aria-hidden="true"></i>
        Edit Detail Buku
      </h2>
      <form id="editBookForm" onsubmit="handleSaveBookEdit(event)">
        <input type="hidden" id="editBookId">
        <div class="form-group">
          <label for="editBookTitle">Judul buku *</label>
          <input type="text" id="editBookTitle" class="form-control" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="editPublisher">Penerbit</label>
            <input type="text" id="editPublisher" class="form-control" list="editPublisherList">
            <datalist id="editPublisherList"></datalist>
          </div>
          <div class="form-group">
            <label for="editAuthor">Pengarang</label>
            <input type="text" id="editAuthor" class="form-control">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="editSubmissionDate">Tanggal pengajuan *</label>
            <input type="date" id="editSubmissionDate" class="form-control" required>
          </div>
          <div class="form-group">
            <label for="editIsbnPublishedDate">Tanggal terbit ISBN</label>
            <input type="date" id="editIsbnPublishedDate" class="form-control">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="editStatus">Status</label>
            <select id="editStatus" class="form-control" onchange="toggleEditIsbnField()">
              <option value="PENDING">Diajukan</option>
              <option value="COMPLETED">Terbit</option>
            </select>
          </div>
          <div class="form-group">
            <label for="editIsbn">Nomor ISBN</label>
            <input type="text" id="editIsbn" class="form-control">
          </div>
        </div>

        <div class="subgroup" style="margin-top:1.25rem">
          <h3 class="subgroup-title">Notifikasi khusus buku ini</h3>
          <div class="form-group">
            <label for="editNtfyTopic">Topik ntfy khusus</label>
            <input type="text" id="editNtfyTopic" class="form-control">
          </div>
          <div class="form-group">
            <label for="editTgChatId">Chat ID Telegram khusus</label>
            <input type="text" id="editTgChatId" class="form-control">
          </div>
          <div class="form-group">
            <label for="editWebhookUrl">URL webhook khusus</label>
            <input type="url" id="editWebhookUrl" class="form-control">
          </div>
        </div>

        <div class="btn-row" style="margin-top:1.25rem">
          <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Batal</button>
          <button type="submit" class="btn btn-primary" id="btnSaveEditSubmit">Simpan perubahan</button>
        </div>
      </form>
    </div>
  </div>

  <div id="alertContainer" class="alert-stack" role="status" aria-live="polite"></div>

  <script src="/ui.js"></script>
</body>
</html>`;
