export const renderUI = () => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ISBN Notify — Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest"></script>
  <link rel="stylesheet" href="/ui.css">
</head>
<body>

  <!-- Full-screen Login Overlay -->
  <div id="loginOverlay" class="login-overlay">
    <div class="glass-card" style="width:100%;max-width:400px;text-align:center;display:flex;flex-direction:column;gap:1.5rem;padding:2rem">
      <div class="logo-container" style="justify-content:center">
        <svg class="logo-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="ISBN Notify logo">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
        </svg>
        <span class="logo-title">ISBN Notify</span>
      </div>
      <div>
        <h3 style="font-size:1.125rem;font-weight:700;margin-bottom:0.375rem">Dashboard Terkunci</h3>
        <p style="font-size:0.875rem;color:var(--text-muted)">Masukkan Password Akses Anda untuk mengelola pelacakan ISBN.</p>
      </div>
      <form onsubmit="handleLogin(event)" style="display:flex;flex-direction:column;gap:1rem">
        <div class="form-group" style="text-align:left">
          <label for="loginPassword">Password Akses</label>
          <input type="password" id="loginPassword" class="form-control" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" required autocomplete="current-password">
        </div>
        <button type="submit" class="btn btn-primary w-full" id="btnLoginSubmit">
          <i data-lucide="unlock" style="width:1.1rem;height:1.1rem"></i>
          Buka Dashboard
        </button>
      </form>
    </div>
  </div>

  <div class="container" id="dashboardContent" style="display:none">

    <!-- Top Header -->
    <header class="glass-card">
      <div class="logo-container">
        <svg class="logo-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="ISBN Notify logo">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
        </svg>
        <span class="logo-title">ISBN Notify</span>
      </div>
      <nav class="tabs-nav" aria-label="Main Navigation">
        <button type="button" id="tabBtnTracking" class="tab-btn active" onclick="switchTab('tracking')">
          <i data-lucide="book-open" style="width:1rem;height:1rem"></i>
          Tracking List
        </button>
        <button type="button" id="tabBtnSettings" class="tab-btn" onclick="switchTab('settings')">
          <i data-lucide="sliders" style="width:1rem;height:1rem"></i>
          Settings & Scheduler
        </button>
        <button type="button" class="tab-btn" style="color:var(--color-error);background:rgba(239,68,68,0.05);border-color:rgba(239,68,68,0.1)" onclick="handleLogout()">
          <i data-lucide="log-out" style="width:1rem;height:1rem"></i>
          Logout
        </button>
      </nav>
    </header>

    <!-- Tab 1: Tracking Dashboard -->
    <div id="tabContentTracking" class="dashboard-grid">

      <!-- Stats -->
      <section id="statsPanel" class="glass-card stats-container">
        <div class="stat-card">
          <span class="stat-val" id="statTotal">0</span>
          <span class="stat-lbl">Total</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-card">
          <span class="stat-val" id="statPending" style="color:var(--color-pending)">0</span>
          <span class="stat-lbl">Pending</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-card">
          <span class="stat-val" id="statCompleted" style="color:var(--color-success)">0</span>
          <span class="stat-lbl">Done</span>
        </div>
      </section>

      <!-- Analysis -->
      <section id="analysisPanel" class="glass-card">
        <h2 class="form-title" style="margin-bottom:0.75rem">
          <i data-lucide="bar-chart-2" class="logo-icon" style="width:1.25rem;height:1.25rem;color:var(--color-primary)"></i>
          Analisis Waktu Terbit
        </h2>
        <div class="form-group" style="margin-bottom:0.75rem">
          <label for="avgTimeFilter">Filter Rentang Waktu</label>
          <select id="avgTimeFilter" class="form-control" onchange="calculateAverageTime()" style="cursor:pointer;background:rgba(15,23,42,0.8)">
            <option value="all">Semua Waktu</option>
            <option value="1m">1 Bulan Terakhir</option>
            <option value="2m">2 Bulan Terakhir</option>
            <option value="3m">3 Bulan Terakhir</option>
            <option value="custom">Rentang Kustom</option>
          </select>
        </div>
        <div id="customRangePicker" style="display:none;gap:0.5rem;margin-bottom:0.75rem">
          <div style="flex:1">
            <label style="display:block;font-size:0.75rem;color:var(--text-muted);margin-bottom:0.25rem">Dari Tanggal</label>
            <input type="date" id="avgStartDate" class="form-control" onchange="calculateAverageTime()">
          </div>
          <div style="flex:1">
            <label style="display:block;font-size:0.75rem;color:var(--text-muted);margin-bottom:0.25rem">Sampai Tanggal</label>
            <input type="date" id="avgEndDate" class="form-control" onchange="calculateAverageTime()">
          </div>
        </div>
        <div style="background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.1);border-radius:0.5rem;padding:0.75rem;text-align:center;margin-top:0.5rem">
          <span style="display:block;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);margin-bottom:0.15rem">Rata-rata Waktu Pengajuan</span>
          <span id="avgTimeResult" style="font-size:1.5rem;font-weight:700;color:var(--color-success)">0.0 Hari</span>
          <span id="avgTimeCount" style="font-size:0.75rem;color:var(--text-muted);display:block;margin-top:0.15rem">(Berdasarkan 0 buku terbit)</span>
        </div>
      </section>

      <!-- Register -->
      <section id="registerPanel" class="glass-card">
        <h2 class="form-title">
          <i data-lucide="plus-circle" class="logo-icon" style="width:1.25rem;height:1.25rem"></i>
          Register New Book
        </h2>
        <form id="addBookForm" onsubmit="handleAddBook(event)">
          <div class="form-group">
            <label for="title">Book Title *</label>
            <input type="text" id="title" class="form-control" placeholder="e.g. Laskar Pelangi" required>
          </div>
          <div class="form-group">
            <label for="publisher">Publisher</label>
            <input type="text" id="publisher" class="form-control" list="publisherList" placeholder="e.g. Bentang Pustaka">
          </div>
          <datalist id="publisherList"></datalist>
          <div class="form-group">
            <label for="author">Author</label>
            <input type="text" id="author" class="form-control" placeholder="e.g. Andrea Hirata">
          </div>
          <div class="form-group">
            <label for="submissionDate">Tanggal Pengajuan *</label>
            <input type="date" id="submissionDate" class="form-control" required>
          </div>

          <div style="margin:1.25rem 0 0.75rem 0">
            <button type="button" class="btn-icon" style="width:100%;display:flex;align-items:center;justify-content:space-between;font-size:0.75rem;font-weight:600;padding:0.5rem 0.75rem" onclick="toggleAdvancedSettings()">
              <span>Advanced Routing Override</span>
              <i data-lucide="chevron-down" id="advChevron" style="width:1rem;height:1rem;transition:transform var(--transition-timing)"></i>
            </button>
          </div>

          <div id="advancedSettings" style="display:none;padding-top:0.5rem;border-top:1px dashed rgba(255,255,255,0.05);margin-bottom:1.25rem">
            <div class="form-group">
              <label for="ntfyTopic">ntfy Topic Override</label>
              <input type="text" id="ntfyTopic" class="form-control" placeholder="e.g. my-custom-topic">
            </div>
            <div class="form-group">
              <label for="tgChatId">Telegram Chat ID Override</label>
              <input type="text" id="tgChatId" class="form-control" placeholder="e.g. -100123456789">
            </div>
            <div class="form-group">
              <label for="webhookUrl">Webhook URL Override</label>
              <input type="url" id="webhookUrl" class="form-control" placeholder="e.g. https://api.myweb.com/hook">
            </div>
          </div>

          <button type="submit" class="btn btn-primary w-full" id="btnSubmit">
            <i data-lucide="save" style="width:1.1rem;height:1.1rem"></i>
            Start Tracking
          </button>
        </form>
      </section>

      <!-- Right Panel: Table -->
      <section id="trackingPanel" class="glass-card" style="display:flex;flex-direction:column">
        <div class="panel-header">
          <h2 class="panel-title">
            <i data-lucide="book-open" class="logo-icon" style="width:1.25rem;height:1.25rem;color:var(--color-accent)"></i>
            Tracking List
          </h2>
          <div class="search-bar">
            <input type="text" id="searchQuery" class="form-control" placeholder="Search title or publisher..." oninput="renderBooksTable()">
          </div>
          <button type="button" class="btn btn-accent" id="btnCheckNow" onclick="handleManualCheck()">
            <i data-lucide="refresh-cw" id="checkIcon" style="width:1.1rem;height:1.1rem"></i>
            <span>Check ISBNs</span>
          </button>
        </div>
        <div class="table-container">
          <table id="booksTable">
            <thead>
              <tr>
                <th>Title</th>
                <th>Author / Publisher</th>
                <th>Status</th>
                <th>ISBN</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody id="booksListBody"></tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- Tab 2: Settings -->
    <div id="tabContentSettings" class="settings-grid" style="display:none">

      <!-- Notifications -->
      <div style="display:flex;flex-direction:column;gap:2rem">
        <section class="glass-card">
          <h2 class="form-title">
            <i data-lucide="bell" class="logo-icon" style="width:1.25rem;height:1.25rem"></i>
            Notification Integrations
          </h2>
          <form id="settingsNotifForm" onsubmit="handleSaveSettings(event)">
            <div style="margin-bottom:1.5rem;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:1rem">
              <h3 style="font-size:0.875rem;font-weight:600;color:var(--color-primary);margin-bottom:0.75rem">ntfy.sh Configuration</h3>
              <div class="form-group">
                <label for="cfgNtfyUrl">Server Base URL</label>
                <input type="url" id="cfgNtfyUrl" class="form-control" placeholder="https://ntfy.sh">
              </div>
              <div class="form-group">
                <label for="cfgNtfyTopic">Default Topic Name</label>
                <input type="text" id="cfgNtfyTopic" class="form-control" placeholder="isbn">
              </div>
              <div class="form-group">
                <label for="cfgNtfyAuth">Authorization Token</label>
                <input type="password" id="cfgNtfyAuth" class="form-control" placeholder="username:password or Bearer token">
              </div>
            </div>
            <div style="margin-bottom:1.5rem;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:1rem">
              <h3 style="font-size:0.875rem;font-weight:600;color:var(--color-primary);margin-bottom:0.75rem">Telegram Bot Configuration</h3>
              <div class="form-group">
                <label for="cfgTgToken">Telegram Bot Token</label>
                <input type="password" id="cfgTgToken" class="form-control" placeholder="123456789:ABCdefGhI...">
              </div>
              <div class="form-group">
                <label for="cfgTgChat">Default Chat ID / Channel ID</label>
                <input type="text" id="cfgTgChat" class="form-control" placeholder="-100123456789">
              </div>
            </div>
            <div>
              <h3 style="font-size:0.875rem;font-weight:600;color:var(--color-primary);margin-bottom:0.75rem">Webhook Settings</h3>
              <div class="form-group">
                <label for="cfgWebhookUrl">Default Webhook URL</label>
                <input type="url" id="cfgWebhookUrl" class="form-control" placeholder="https://your-domain.com/webhook">
              </div>
            </div>
          </form>
        </section>
      </div>

      <!-- Scheduler -->
      <div style="display:flex;flex-direction:column;gap:2rem">
        <section class="glass-card" style="display:flex;flex-direction:column;justify-content:space-between;height:100%">
          <div>
            <h2 class="form-title">
              <i data-lucide="clock" class="logo-icon" style="width:1.25rem;height:1.25rem;color:var(--color-accent)"></i>
              Background Scheduler
            </h2>
            <p style="font-size:0.8125rem;color:var(--text-muted);margin-bottom:1.5rem">
              Atur seberapa sering server akan melakukan pengecekan ISBN baru ke Perpusnas secara otomatis di latar belakang.
            </p>
            <div class="form-group">
              <label for="cfgScheduler">Interval Pengecekan</label>
              <select id="cfgScheduler" class="form-control" style="background:rgba(15,23,42,0.8);cursor:pointer" onchange="toggleScheduleContainer()">
                <option value="custom">Jadwal Kustom (Pilih Waktu Sendiri)</option>
                <option value="disabled">Manual Saja (Nonaktifkan Otomatis)</option>
              </select>
            </div>
            <div id="customScheduleContainer" style="margin-bottom:1.25rem;display:none">
              <label style="display:block;font-size:0.8125rem;font-weight:500;color:var(--text-muted);margin-bottom:0.5rem">Waktu Pengecekan (Waktu Lokal Server)</label>
              <div id="scheduleList" style="display:flex;flex-direction:column;gap:0.5rem"></div>
              <button type="button" class="btn btn-accent" onclick="addScheduleEntry()" style="margin-top:0.75rem;width:100%">
                <i data-lucide="plus" style="width:1.1rem;height:1.1rem"></i>
                Tambah Waktu
              </button>
              <div id="schedulerWarning" style="display:none;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:0.5rem;padding:0.75rem;margin-top:0.75rem;color:#f59e0b;font-size:0.75rem;align-items:flex-start;gap:0.5rem">
                <i data-lucide="alert-triangle" style="width:1.1rem;height:1.1rem;flex-shrink:0;margin-top:0.1rem"></i>
                <span><strong>Peringatan:</strong> Terlalu banyak jadwal per hari dapat meningkatkan risiko pemblokiran firewall (WAF) dari server Perpusnas.</span>
              </div>
            </div>
          </div>
          <div style="margin-top:2rem">
            <button type="button" class="btn btn-primary w-full" onclick="document.getElementById('btnSaveSettings').click()">
              <i data-lucide="save" style="width:1.1rem;height:1.1rem"></i>
              Save Configuration
            </button>
            <button type="submit" id="btnSaveSettings" form="settingsNotifForm" style="display:none"></button>
          </div>
        </section>
      </div>
    </div>
  </div>

  <!-- Edit Modal -->
  <div id="editBookModal" class="login-overlay" style="display:none;opacity:0;z-index:var(--z-modal)">
    <div class="glass-card" style="width:100%;max-width:500px;padding:2rem;display:flex;flex-direction:column;gap:1.5rem;max-height:90vh;overflow-y:auto">
      <h2 class="form-title">
        <i data-lucide="edit-3" class="logo-icon" style="width:1.25rem;height:1.25rem;color:var(--color-primary)"></i>
        Edit Book Details
      </h2>
      <form id="editBookForm" onsubmit="handleSaveBookEdit(event)">
        <input type="hidden" id="editBookId">
        <div class="form-group">
          <label for="editTitle">Book Title *</label>
          <input type="text" id="editTitle" class="form-control" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="editPublisher">Publisher</label>
            <input type="text" id="editPublisher" class="form-control" list="editPublisherList">
          </div>
          <datalist id="editPublisherList"></datalist>
          <div class="form-group">
            <label for="editAuthor">Author</label>
            <input type="text" id="editAuthor" class="form-control">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="editSubmissionDate">Tanggal Pengajuan *</label>
            <input type="date" id="editSubmissionDate" class="form-control" required>
          </div>
          <div class="form-group">
            <label for="editIsbnPublishedDate">Tanggal Terbit ISBN</label>
            <input type="date" id="editIsbnPublishedDate" class="form-control">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="editStatus">Status</label>
            <select id="editStatus" class="form-control" style="background:rgba(15,23,42,0.8)" onchange="toggleEditIsbnField()">
              <option value="PENDING">PENDING</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </div>
          <div class="form-group">
            <label for="editIsbn">ISBN Number</label>
            <input type="text" id="editIsbn" class="form-control" placeholder="e.g. 978-602-...">
          </div>
        </div>
        <div style="margin:0.5rem 0 1rem 0;border-top:1px dashed rgba(255,255,255,0.05);padding-top:0.75rem">
          <label style="display:block;font-size:0.8125rem;font-weight:600;color:var(--color-primary);margin-bottom:0.5rem">Advanced Routing Override</label>
          <div class="form-group">
            <label for="editNtfyTopic">ntfy Topic Override</label>
            <input type="text" id="editNtfyTopic" class="form-control" placeholder="e.g. my-custom-topic">
          </div>
          <div class="form-group">
            <label for="editTgChatId">Telegram Chat ID Override</label>
            <input type="text" id="editTgChatId" class="form-control" placeholder="e.g. -100123456789">
          </div>
          <div class="form-group">
            <label for="editWebhookUrl">Webhook URL Override</label>
            <input type="url" id="editWebhookUrl" class="form-control" placeholder="e.g. https://api.myweb.com/hook">
          </div>
        </div>
        <div style="display:flex;gap:0.75rem;justify-content:flex-end;margin-top:1rem">
          <button type="button" class="btn btn-danger" onclick="closeEditModal()">Batal</button>
          <button type="submit" class="btn btn-primary" id="btnSaveEditSubmit">Simpan Perubahan</button>
        </div>
      </form>
    </div>
  </div>

  <div id="alertContainer"></div>

  <script src="/ui.js"></script>
</body>
</html>`;
