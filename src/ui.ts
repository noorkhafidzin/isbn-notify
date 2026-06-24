export const renderUI = (defaultPort: number) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ISBN Notify — Dashboard</title>
  
  <!-- Font Imports -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  
  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>

  <style>
    /* Design Tokens */
    :root {
      --font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      --bg-gradient-start: #0b0f19;
      --bg-gradient-end: #111827;
      
      --card-bg: rgba(30, 41, 59, 0.45);
      --card-border: rgba(255, 255, 255, 0.06);
      --card-border-hover: rgba(255, 255, 255, 0.12);
      
      --color-primary: #3b82f6;
      --color-primary-hover: #2563eb;
      --color-accent: #f97316;
      --color-accent-hover: #ea580c;
      
      --color-success: #10b981;
      --color-success-bg: rgba(16, 185, 129, 0.1);
      --color-pending: #f59e0b;
      --color-pending-bg: rgba(245, 158, 11, 0.1);
      --color-error: #ef4444;
      --color-error-bg: rgba(239, 68, 68, 0.1);
      
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
      
      --transition-timing: 200ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Reset */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--font-family);
      background: linear-gradient(135deg, var(--bg-gradient-start), var(--bg-gradient-end));
      color: var(--text-main);
      min-height: 100vh;
      line-height: 1.6;
      padding: 2rem 1rem;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    /* Glassmorphism Cards */
    .glass-card {
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--card-border);
      border-radius: 1rem;
      padding: 1.5rem;
      transition: border var(--transition-timing), box-shadow var(--transition-timing);
    }

    .glass-card:hover {
      border-color: var(--card-border-hover);
      box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
    }

    /* Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .logo-container {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .logo-icon {
      color: var(--color-primary);
      width: 2.25rem;
      height: 2.25rem;
    }

    .logo-title {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.025em;
      background: linear-gradient(to right, #3b82f6, #60a5fa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .api-key-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .input-key {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 0.5rem;
      padding: 0.6rem 1rem;
      color: var(--text-main);
      font-size: 0.875rem;
      min-width: 240px;
      transition: border var(--transition-timing);
      font-family: monospace;
    }

    .input-key:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    /* Dashboard Grid */
    .dashboard-grid {
      display: grid;
      grid-template-columns: 350px 1fr;
      gap: 2rem;
    }

    @media (max-width: 1024px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Stats Panel */
    .stats-container {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    .stat-card {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      align-items: center;
      text-align: center;
    }

    .stat-val {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text-main);
    }

    .stat-lbl {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    /* Forms */
    .form-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-muted);
      margin-bottom: 0.375rem;
    }

    .form-control {
      width: 100%;
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 0.5rem;
      padding: 0.65rem 0.875rem;
      color: var(--text-main);
      font-size: 0.875rem;
      transition: border var(--transition-timing);
    }

    .form-control:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      border: none;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      padding: 0.65rem 1.25rem;
      cursor: pointer;
      transition: background-color var(--transition-timing), transform var(--transition-timing), opacity var(--transition-timing);
      text-decoration: none;
      min-height: 44px;
      min-width: 44px;
    }

    .btn-primary {
      background-color: var(--color-primary);
      color: #ffffff;
    }

    .btn-primary:hover {
      background-color: var(--color-primary-hover);
    }

    .btn-accent {
      background-color: var(--color-accent);
      color: #ffffff;
    }

    .btn-accent:hover {
      background-color: var(--color-accent-hover);
    }

    .btn-danger {
      background-color: var(--color-error-bg);
      color: var(--color-error);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .btn-danger:hover {
      background-color: var(--color-error);
      color: #ffffff;
    }

    .btn-icon {
      padding: 0.5rem;
      border-radius: 0.5rem;
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-muted);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .btn-icon:hover {
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.08);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .w-full {
      width: 100%;
    }

    /* Books Table List */
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .panel-title {
      font-size: 1.25rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .search-bar {
      display: flex;
      gap: 0.5rem;
      flex-grow: 1;
      max-width: 400px;
    }

    .table-container {
      overflow-x: auto;
      border-radius: 0.75rem;
      background: rgba(15, 23, 42, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.04);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;
    }

    th {
      background: rgba(15, 23, 42, 0.4);
      color: var(--text-muted);
      font-weight: 600;
      padding: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    td {
      padding: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      vertical-align: middle;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover td {
      background: rgba(255, 255, 255, 0.01);
    }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge-success {
      background-color: var(--color-success-bg);
      color: var(--color-success);
    }

    .badge-pending {
      background-color: var(--color-pending-bg);
      color: var(--color-pending);
      animation: pulse-amber 2s infinite ease-in-out;
    }

    @keyframes pulse-amber {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.75; }
    }

    /* Helpers */
    .font-mono {
      font-family: monospace;
      font-size: 0.8125rem;
      letter-spacing: 0.05em;
    }

    .text-right {
      text-align: right;
    }

    .flex-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    .empty-state {
      padding: 3rem 1.5rem;
      text-align: center;
      color: var(--text-muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }

    .empty-icon {
      width: 3rem;
      height: 3rem;
      stroke-width: 1.5;
      color: rgba(255, 255, 255, 0.15);
    }

    /* Notifications & Alert */
    .alert-banner {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      z-index: 50;
      max-width: 420px;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      border-radius: 0.75rem;
      padding: 1rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
      animation: slide-in var(--transition-timing);
    }

    @keyframes slide-in {
      from { transform: translateY(1rem); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .alert-success {
      background: rgba(16, 185, 129, 0.95);
      border: 1px solid #10b981;
      color: #ffffff;
    }

    .alert-error {
      background: rgba(239, 68, 68, 0.95);
      border: 1px solid #ef4444;
      color: #ffffff;
    }

    .alert-close {
      cursor: pointer;
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.7);
      margin-left: auto;
    }

    .alert-close:hover {
      color: #ffffff;
    }

    /* Spin loader */
    .spinner {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>

  <div class="container">
    
    <!-- Top Header -->
    <header class="glass-card">
      <div class="logo-container">
        <svg class="logo-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
        </svg>
        <span class="logo-title">ISBN Notify</span>
      </div>
      
      <div class="api-key-box">
        <label for="apiKey" aria-label="X-API-Key" class="stat-lbl" style="font-size: 0.75rem;">X-API-Key</label>
        <input type="password" id="apiKey" class="input-key" placeholder="Enter API Key to auth..." aria-required="true">
      </div>
    </header>

    <!-- Main Content Grid -->
    <main class="dashboard-grid">
      
      <!-- Left Panel: Stats & Register Form -->
      <div style="display: flex; flex-direction: column; gap: 2rem;">
        
        <!-- Stats Summary Card -->
        <section class="glass-card stats-container">
          <div class="stat-card">
            <span class="stat-val" id="statTotal">0</span>
            <span class="stat-lbl">Total</span>
          </div>
          <div style="width: 1px; background: rgba(255, 255, 255, 0.05); height: 100%;"></div>
          <div class="stat-card">
            <span class="stat-val" id="statPending" style="color: var(--color-pending);">0</span>
            <span class="stat-lbl">Pending</span>
          </div>
          <div style="width: 1px; background: rgba(255, 255, 255, 0.05); height: 100%;"></div>
          <div class="stat-card">
            <span class="stat-val" id="statCompleted" style="color: var(--color-success);">0</span>
            <span class="stat-lbl">Done</span>
          </div>
        </section>

        <!-- Register Book Card -->
        <section class="glass-card">
          <h2 class="form-title">
            <i data-lucide="plus-circle" class="logo-icon" style="width: 1.25rem; height: 1.25rem;"></i>
            Register New Book
          </h2>
          <form id="addBookForm" onsubmit="handleAddBook(event)">
            
            <div class="form-group">
              <label for="title">Book Title *</label>
              <input type="text" id="title" class="form-control" placeholder="e.g. Laskar Pelangi" required>
            </div>
            
            <div class="form-group">
              <label for="publisher">Publisher (Optional)</label>
              <input type="text" id="publisher" class="form-control" placeholder="e.g. Bentang Pustaka">
            </div>
            
            <div class="form-group">
              <label for="author">Author (Optional)</label>
              <input type="text" id="author" class="form-control" placeholder="e.g. Andrea Hirata">
            </div>
            
            <!-- Collapse/Advanced Notif Settings trigger -->
            <div style="margin: 1.25rem 0 0.75rem 0;">
              <button type="button" class="btn-icon" style="width: 100%; display: flex; align-items: center; justify-content: space-between; font-size: 0.75rem; font-weight: 600; padding: 0.5rem 0.75rem;" onclick="toggleAdvancedSettings()">
                <span>Advanced Notification Routing</span>
                <i data-lucide="chevron-down" id="advChevron" style="width: 1rem; height: 1rem; transition: transform var(--transition-timing);"></i>
              </button>
            </div>
            
            <!-- Advanced fields -->
            <div id="advancedSettings" style="display: none; padding-top: 0.5rem; border-top: 1px dashed rgba(255,255,255,0.05); margin-bottom: 1.25rem;">
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
              <i data-lucide="save" style="width: 1.1rem; height: 1.1rem;"></i>
              Start Tracking
            </button>
            
          </form>
        </section>

      </div>

      <!-- Right Panel: Tracking List Panel -->
      <section class="glass-card" style="display: flex; flex-direction: column;">
        
        <div class="panel-header">
          <h2 class="panel-title">
            <i data-lucide="book-open" class="logo-icon" style="width: 1.25rem; height: 1.25rem; color: var(--color-accent)"></i>
            Tracking List
          </h2>
          
          <div class="search-bar">
            <input type="text" id="searchQuery" class="form-control" placeholder="Search title or publisher..." oninput="renderBooksTable()">
          </div>
          
          <button type="button" class="btn btn-accent" id="btnCheckNow" onclick="handleManualCheck()">
            <i data-lucide="refresh-cw" id="checkIcon" style="width: 1.1rem; height: 1.1rem;"></i>
            <span>Check ISBNs</span>
          </button>
        </div>

        <!-- Table container -->
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
            <tbody id="booksListBody">
              <!-- Dynamically populated -->
            </tbody>
          </table>
        </div>

      </section>

    </main>

  </div>

  <!-- Banner Alerts -->
  <div id="alertContainer"></div>

  <script>
    let booksData = [];

    // Initialize API Key from localStorage or set default
    const apiKeyInput = document.getElementById('apiKey');
    const storedKey = localStorage.getItem('isbn_notify_api_key');
    if (storedKey) {
      apiKeyInput.value = storedKey;
    }

    // Save API key on input change
    apiKeyInput.addEventListener('input', () => {
      localStorage.setItem('isbn_notify_api_key', apiKeyInput.value);
      loadBooks();
    });

    // Helper to get active API key
    function getApiKey() {
      return apiKeyInput.value.trim();
    }

    // Toggle advanced form settings
    function toggleAdvancedSettings() {
      const advDiv = document.getElementById('advancedSettings');
      const chevron = document.getElementById('advChevron');
      if (advDiv.style.display === 'none') {
        advDiv.style.display = 'block';
        chevron.style.transform = 'rotate(180deg)';
      } else {
        advDiv.style.display = 'none';
        chevron.style.transform = 'rotate(0deg)';
      }
    }

    // Load Books from REST API
    async function loadBooks() {
      const apiKey = getApiKey();
      if (!apiKey) {
        showEmptyStateMessage("Enter your X-API-Key above to display tracked books.");
        updateStats({ total: 0, pending: 0, completed: 0 });
        return;
      }

      try {
        const res = await fetch('/books', {
          headers: {
            'X-API-Key': apiKey
          }
        });

        if (res.status === 401) {
          showEmptyStateMessage("Unauthorized. The API Key you entered is invalid.");
          updateStats({ total: 0, pending: 0, completed: 0 });
          return;
        }

        const data = await res.json();
        if (data.success) {
          booksData = data.books || [];
          renderBooksTable();
          
          const pending = booksData.filter(b => b.status === 'PENDING').length;
          const completed = booksData.filter(b => b.status === 'COMPLETED').length;
          updateStats({ total: booksData.length, pending, completed });
        } else {
          showAlert(data.error || "Failed to load books.", "error");
        }
      } catch (err) {
        console.error(err);
        showAlert("Failed to connect to the server.", "error");
      }
    }

    // Show empty state inside the table body
    function showEmptyStateMessage(msg) {
      const body = document.getElementById('booksListBody');
      body.innerHTML = \`
        <tr>
          <td colspan="5">
            <div class="empty-state">
              <i data-lucide="alert-circle" class="empty-icon"></i>
              <p>\${msg}</p>
            </div>
          </td>
        </tr>
      \`;
      lucide.createIcons();
    }

    // Update statistics badges
    function updateStats({ total, pending, completed }) {
      document.getElementById('statTotal').innerText = total;
      document.getElementById('statPending').innerText = pending;
      document.getElementById('statCompleted').innerText = completed;
    }

    // Render table rows with local filter support
    function renderBooksTable() {
      const body = document.getElementById('booksListBody');
      const search = document.getElementById('searchQuery').value.toLowerCase();
      
      const filtered = booksData.filter(b => {
        const titleMatch = b.title && b.title.toLowerCase().includes(search);
        const publisherMatch = b.publisher && b.publisher.toLowerCase().includes(search);
        return titleMatch || publisherMatch;
      });

      if (filtered.length === 0) {
        body.innerHTML = \`
          <tr>
            <td colspan="5">
              <div class="empty-state">
                <i data-lucide="inbox" class="empty-icon"></i>
                <p>No books are matching or registered for tracking yet.</p>
              </div>
            </td>
          </tr>
        \`;
        lucide.createIcons();
        return;
      }

      body.innerHTML = filtered.map(book => {
        const badgeClass = book.status === 'COMPLETED' ? 'badge-success' : 'badge-pending';
        const badgeIcon = book.status === 'COMPLETED' ? 'check' : 'loader-2';
        const iconPulse = book.status === 'PENDING' ? 'spinner' : '';
        const authorStr = book.author || '-';
        const pubStr = book.publisher || '-';
        const isbnStr = book.isbn ? \`<span class="font-mono bg-slate-900/80 px-2 py-1 rounded border border-slate-700/50">\${book.isbn}</span>\` : '<span class="text-muted">-</span>';
        
        return \`
          <tr>
            <td>
              <div style="font-weight: 600; color: var(--text-main);">\${escapeHtml(book.title)}</div>
            </td>
            <td>
              <div style="font-size: 0.8125rem; color: var(--text-main);">A: \${escapeHtml(authorStr)}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">P: \${escapeHtml(pubStr)}</div>
            </td>
            <td>
              <span class="badge \${badgeClass}">
                <i data-lucide="\${badgeIcon}" class="\${iconPulse}" style="width: 0.85rem; height: 0.85rem;"></i>
                \${book.status}
              </span>
            </td>
            <td>\${isbnStr}</td>
            <td class="text-right">
              <div class="flex-actions">
                <button type="button" class="btn btn-danger" onclick="handleDeleteBook(\${book.id})" aria-label="Delete book \${book.id}">
                  <i data-lucide="trash" style="width: 1rem; height: 1rem;"></i>
                </button>
              </div>
            </td>
          </tr>
        \`;
      }).join('');

      lucide.createIcons();
    }

    // Form submit handler to add new book
    async function handleAddBook(e) {
      e.preventDefault();
      const apiKey = getApiKey();
      if (!apiKey) {
        showAlert("Please enter your API Key first.", "error");
        return;
      }

      const btnSubmit = document.getElementById('btnSubmit');
      btnSubmit.disabled = true;

      const payload = {
        title: document.getElementById('title').value.trim(),
        publisher: document.getElementById('publisher').value.trim() || null,
        author: document.getElementById('author').value.trim() || null,
        ntfy_topic: document.getElementById('ntfyTopic').value.trim() || null,
        tg_chat_id: document.getElementById('tgChatId').value.trim() || null,
        webhook_url: document.getElementById('webhookUrl').value.trim() || null
      };

      try {
        const res = await fetch('/books', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          showAlert("Book successfully registered for ISBN tracking!", "success");
          document.getElementById('addBookForm').reset();
          
          // Collapse advanced settings if open
          document.getElementById('advancedSettings').style.display = 'none';
          document.getElementById('advChevron').style.transform = 'rotate(0deg)';
          
          loadBooks();
        } else {
          showAlert(data.error || "Failed to register book.", "error");
        }
      } catch (err) {
        console.error(err);
        showAlert("Failed to connect to the server.", "error");
      } finally {
        btnSubmit.disabled = false;
      }
    }

    // Trigger manual check
    async function handleManualCheck() {
      const apiKey = getApiKey();
      if (!apiKey) {
        showAlert("Please enter your API Key first.", "error");
        return;
      }

      const btnCheck = document.getElementById('btnCheckNow');
      const checkIcon = document.getElementById('checkIcon');
      btnCheck.disabled = true;
      checkIcon.classList.add('spinner');

      try {
        const res = await fetch('/check', {
          method: 'POST',
          headers: {
            'X-API-Key': apiKey
          }
        });

        const data = await res.json();
        if (data.success) {
          const checked = data.checked || 0;
          const found = data.found || 0;
          showAlert(\`Checked \${checked} PENDING books. Found \${found} published ISBN(s)!\`, "success");
          loadBooks();
        } else {
          showAlert(data.error || "Failed to run tracking check.", "error");
        }
      } catch (err) {
        console.error(err);
        showAlert("Connection error while running check.", "error");
      } finally {
        btnCheck.disabled = false;
        checkIcon.classList.remove('spinner');
      }
    }

    // Delete book from tracking
    async function handleDeleteBook(id) {
      if (!confirm("Are you sure you want to stop tracking and delete this book?")) {
        return;
      }

      const apiKey = getApiKey();
      if (!apiKey) {
        showAlert("Please enter your API Key first.", "error");
        return;
      }

      try {
        const res = await fetch(\`/books/\${id}\`, {
          method: 'DELETE',
          headers: {
            'X-API-Key': apiKey
          }
        });

        const data = await res.json();
        if (data.success) {
          showAlert("Book successfully deleted from tracking.", "success");
          loadBooks();
        } else {
          showAlert(data.error || "Failed to delete book.", "error");
        }
      } catch (err) {
        console.error(err);
        showAlert("Connection error while deleting book.", "error");
      }
    }

    // Alert Banner Manager
    function showAlert(message, type = "success") {
      const container = document.getElementById('alertContainer');
      const bannerClass = type === "success" ? "alert-success" : "alert-error";
      const icon = type === "success" ? "check-circle" : "x-circle";
      
      const alertId = 'alert_' + Date.now();
      const div = document.createElement('div');
      div.className = \`alert-banner \${bannerClass}\`;
      div.id = alertId;
      div.innerHTML = \`
        <i data-lucide="\${icon}" style="width: 1.25rem; height: 1.25rem; flex-shrink: 0;"></i>
        <span>\${escapeHtml(message)}</span>
        <button class="alert-close" onclick="closeAlert('\${alertId}')">
          <i data-lucide="x" style="width: 1rem; height: 1rem;"></i>
        </button>
      \`;

      container.appendChild(div);
      lucide.createIcons();

      // Auto close after 5 seconds
      setTimeout(() => {
        closeAlert(alertId);
      }, 5000);
    }

    function closeAlert(id) {
      const el = document.getElementById(id);
      if (el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(1rem)';
        el.style.transition = 'opacity var(--transition-timing), transform var(--transition-timing)';
        setTimeout(() => el.remove(), 200);
      }
    }

    // Helper: Escape HTML to prevent XSS
    function escapeHtml(str) {
      if (!str) return '';
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    // Initial load on script load
    loadBooks();
  </script>
</body>
</html>
`;
