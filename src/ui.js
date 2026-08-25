let booksData = [];
let currentStatusFilter = 'all';
let currentPage = 1;
let pageSize = 10;

// ---- Helpers ----

function getApiKey() {
  return localStorage.getItem('isbn_notify_api_key') || '';
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ---- Publisher Suggestions ----

function refreshPublisherList() {
  const publishers = [...new Set(booksData.map(b => b.publisher).filter(p => p))];
  ['publisherList', 'editPublisherList'].forEach(id => {
    const dl = document.getElementById(id);
    if (!dl) return;
    dl.innerHTML = '';
    publishers.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      dl.appendChild(opt);
    });
  });
}

// ---- Schedule Management ----

function addScheduleEntry(time = "09:00") {
  const list = document.getElementById('scheduleList');
  if (!list) return;
  const id = Date.now() + Math.random();
  const div = document.createElement('div');
  div.id = `schedule-${id}`;
  div.className = 'schedule-entry';
  div.innerHTML = `
    <i data-lucide="clock" style="width:1.1rem;height:1.1rem;flex-shrink:0;color:var(--text-muted)"></i>
    <input type="time" class="form-control schedule-time" value="${time}"
      style="flex:1;padding:0.375rem 0.5rem;font-size:0.875rem">
    <button type="button" class="btn-icon" onclick="this.closest('.schedule-entry').remove(); updateWarningVisibility();"
      title="Hapus">
      <i data-lucide="trash-2" style="width:1rem;height:1rem"></i>
    </button>
  `;
  list.appendChild(div);
  if (typeof lucide !== 'undefined') lucide.createIcons();
  updateWarningVisibility();
}

function getScheduleTimes() {
  const inputs = document.querySelectorAll('.schedule-time');
  return Array.from(inputs).map(i => i.value).filter(v => v);
}

function updateWarningVisibility() {
  const count = getScheduleTimes().length;
  const w = document.getElementById('schedulerWarning');
  if (w) w.style.display = count > 4 ? 'flex' : 'none';
}

function toggleScheduleContainer() {
  const val = document.getElementById('cfgScheduler').value;
  const c = document.getElementById('customScheduleContainer');
  if (c) c.style.display = val === 'custom' ? 'block' : 'none';
}

// ---- Auth / Login ----

async function handleLogin(e) {
  e.preventDefault();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('btnLoginSubmit');
  btn.disabled = true;

  try {
    const res = await fetch('/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('isbn_notify_api_key', password);
      const overlay = document.getElementById('loginOverlay');
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
        document.getElementById('dashboardContent').style.display = 'flex';
      }, 300);
      showAlert('Autentikasi berhasil. Selamat datang!', 'success');
      loadBooks();
      loadSettings();
    } else {
      showAlert('Password yang Anda masukkan salah.', 'error');
    }
  } catch (err) {
    console.error(err);
    showAlert('Gagal menghubungkan ke server.', 'error');
  } finally {
    btn.disabled = false;
  }
}

async function tryAutoLogin() {
  const subInput = document.getElementById('submissionDate');
  if (subInput) subInput.value = formatDate(new Date());

  const storedKey = localStorage.getItem('isbn_notify_api_key');
  if (!storedKey) return;

  try {
    const res = await fetch('/books', { headers: { 'X-API-Key': storedKey } });
    if (!res.ok) return;
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('dashboardContent').style.display = 'flex';
    loadBooks();
    loadSettings();
  } catch {}
}

function handleLogout() {
  if (!confirm('Apakah Anda yakin ingin logout?')) return;
  localStorage.removeItem('isbn_notify_api_key');
  document.getElementById('loginPassword').value = '';
  document.getElementById('dashboardContent').style.display = 'none';
  const overlay = document.getElementById('loginOverlay');
  overlay.style.display = 'flex';
  overlay.style.opacity = '1';
  switchTab('tracking');
}

// ---- Tab Switching ----

function switchTab(tabId) {
  const isTracking = tabId === 'tracking';
  document.getElementById('tabContentTracking').style.display = isTracking ? 'grid' : 'none';
  document.getElementById('tabContentSettings').style.display = isTracking ? 'none' : 'grid';
  document.getElementById('tabBtnTracking').classList.toggle('active', isTracking);
  document.getElementById('tabBtnSettings').classList.toggle('active', !isTracking);
  if (isTracking) loadBooks();
  else loadSettings();
}

// ---- Advanced Toggle ----

function toggleAdvancedSettings() {
  const adv = document.getElementById('advancedSettings');
  const chevron = document.getElementById('advChevron');
  const isHidden = adv.style.display === 'none';
  adv.style.display = isHidden ? 'block' : 'none';
  chevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
}

// ---- Books API ----

async function loadBooks() {
  const apiKey = getApiKey();
  if (!apiKey) return;

  try {
    const res = await fetch('/books', { headers: { 'X-API-Key': apiKey } });
    if (res.status === 401) { handleLogout(); return; }
    const data = await res.json();
    if (!data.success) {
      showAlert(data.error || 'Gagal memuat daftar buku.', 'error');
      return;
    }
    booksData = data.books || [];
    refreshPublisherList();
    renderBooksTable();
    const pending = booksData.filter(b => b.status === 'PENDING').length;
    const completed = booksData.filter(b => b.status === 'COMPLETED').length;
    updateStats({ total: booksData.length, pending, completed });
    calculateAverageTime();
  } catch (err) {
    console.error(err);
    showAlert('Gagal menghubungkan ke server.', 'error');
  }
}

async function handleAddBook(e) {
  e.preventDefault();
  const apiKey = getApiKey();
  if (!apiKey) return;

  const btn = document.getElementById('btnSubmit');
  btn.disabled = true;

  const payload = {
    title: document.getElementById('title').value.trim(),
    publisher: document.getElementById('publisher').value.trim() || null,
    author: document.getElementById('author').value.trim() || null,
    submission_date: document.getElementById('submissionDate').value || null,
    ntfy_topic: document.getElementById('ntfyTopic').value.trim() || null,
    tg_chat_id: document.getElementById('tgChatId').value.trim() || null,
    webhook_url: document.getElementById('webhookUrl').value.trim() || null,
  };

  try {
    const res = await fetch('/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      showAlert('Buku berhasil didaftarkan untuk dilacak!', 'success');
      document.getElementById('addBookForm').reset();
      document.getElementById('submissionDate').value = formatDate(new Date());
      document.getElementById('advancedSettings').style.display = 'none';
      document.getElementById('advChevron').style.transform = 'rotate(0deg)';
      loadBooks();
    } else {
      showAlert(data.error || 'Gagal mendaftarkan buku.', 'error');
    }
  } catch (err) {
    console.error(err);
    showAlert('Gagal menghubungkan ke server.', 'error');
  } finally {
    btn.disabled = false;
  }
}

async function handleDeleteBook(id) {
  if (!confirm('Apakah Anda yakin ingin berhenti melacak dan menghapus data buku ini?')) return;
  const apiKey = getApiKey();
  if (!apiKey) return;

  try {
    const res = await fetch(`/books/${id}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    });
    const data = await res.json();
    if (data.success) {
      showAlert('Buku berhasil dihapus dari daftar pelacakan.', 'success');
      loadBooks();
    } else {
      showAlert(data.error || 'Gagal menghapus buku.', 'error');
    }
  } catch (err) {
    console.error(err);
    showAlert('Terjadi kesalahan koneksi saat menghapus buku.', 'error');
  }
}

// ---- Pagination ----

function changePageSize(size) {
  pageSize = size === 'all' ? 9999 : parseInt(size);
  currentPage = 1;
  renderBooksTable();
}

function goToPage(page) {
  currentPage = page;
  renderBooksTable();
}

// ---- Status Filter ----

function filterByStatus(status) {
  currentStatusFilter = status;
  currentPage = 1;
  renderBooksTable();
}

// ---- Manual Check ----

async function handleManualCheck() {
  const apiKey = getApiKey();
  if (!apiKey) return;

  const btn = document.getElementById('btnCheckNow');
  const icon = document.getElementById('checkIcon');
  btn.disabled = true;
  icon.classList.add('spinner');

  try {
    const res = await fetch('/check', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
    });
    const data = await res.json();
    if (data.success) {
      showAlert(`Pengecekan selesai. Memeriksa ${data.checked} buku, ditemukan ${data.found} nomor ISBN baru!`, 'success');
      loadBooks();
    } else {
      showAlert(data.error || 'Gagal memproses pemeriksaan ISBN.', 'error');
    }
  } catch (err) {
    console.error(err);
    showAlert('Terjadi kesalahan koneksi saat pengecekan.', 'error');
  } finally {
    btn.disabled = false;
    icon.classList.remove('spinner');
  }
}

// ---- Settings API ----

async function loadSettings() {
  const apiKey = getApiKey();
  if (!apiKey) return;

  try {
    const res = await fetch('/settings', { headers: { 'X-API-Key': apiKey } });
    if (res.status === 401) { handleLogout(); return; }
    const data = await res.json();
    if (!data.success || !data.settings) return;

    const cfg = data.settings;
    document.getElementById('cfgNtfyUrl').value = cfg.NTFY_DEFAULT_URL || '';
    document.getElementById('cfgNtfyTopic').value = cfg.NTFY_DEFAULT_TOPIC || '';
    document.getElementById('cfgNtfyAuth').value = cfg.NTFY_AUTH_TOKEN || '';
    document.getElementById('cfgTgToken').value = cfg.TELEGRAM_BOT_TOKEN || '';
    document.getElementById('cfgTgChat').value = cfg.TELEGRAM_DEFAULT_CHAT_ID || '';
    document.getElementById('cfgWebhookUrl').value = cfg.WEBHOOK_DEFAULT_URL || '';
    document.getElementById('cfgScheduler').value = cfg.SCHEDULER_INTERVAL || 'custom';

    // Populate schedule entries
    const scheduleList = document.getElementById('scheduleList');
    if (scheduleList) {
      scheduleList.innerHTML = '';
      const times = cfg.SCHEDULER_HOURS?.length
        ? cfg.SCHEDULER_HOURS
        : ['09:00', '13:00', '17:00'];
      times.forEach(t => addScheduleEntry(t));
    }

    toggleScheduleContainer();
    updateWarningVisibility();
  } catch (err) {
    console.error(err);
    showAlert('Gagal memuat konfigurasi server.', 'error');
  }
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const apiKey = getApiKey();
  if (!apiKey) return;

  const interval = document.getElementById('cfgScheduler').value;

  const payload = {
    NTFY_DEFAULT_URL: document.getElementById('cfgNtfyUrl').value.trim() || null,
    NTFY_DEFAULT_TOPIC: document.getElementById('cfgNtfyTopic').value.trim() || null,
    NTFY_AUTH_TOKEN: document.getElementById('cfgNtfyAuth').value || null,
    TELEGRAM_BOT_TOKEN: document.getElementById('cfgTgToken').value || null,
    TELEGRAM_DEFAULT_CHAT_ID: document.getElementById('cfgTgChat').value.trim() || null,
    WEBHOOK_DEFAULT_URL: document.getElementById('cfgWebhookUrl').value.trim() || null,
    SCHEDULER_INTERVAL: interval,
  };

  if (interval === 'custom') {
    const times = getScheduleTimes();
    if (times.length === 0) {
      showAlert('Tambahkan minimal 1 waktu jadwal.', 'error');
      return;
    }
    payload.SCHEDULER_HOURS = times;
  } else {
    payload.SCHEDULER_HOURS = [];
  }

  try {
    const res = await fetch('/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      showAlert('Konfigurasi server berhasil disimpan dan scheduler diperbarui!', 'success');
      loadSettings();
    } else {
      showAlert(data.error || 'Gagal menyimpan konfigurasi.', 'error');
    }
  } catch (err) {
    console.error(err);
    showAlert('Koneksi gagal saat menyimpan setelan.', 'error');
  }
}

// ---- Edit Modal ----

function openEditModal(id) {
  const book = booksData.find(b => b.id === id);
  if (!book) return;

  document.getElementById('editBookId').value = book.id;
  document.getElementById('editTitle').value = book.title || '';
  document.getElementById('editPublisher').value = book.publisher || '';
  document.getElementById('editAuthor').value = book.author || '';
  document.getElementById('editSubmissionDate').value = book.submission_date || formatDate(new Date());
  document.getElementById('editIsbnPublishedDate').value = book.isbn_published_date || '';
  document.getElementById('editStatus').value = book.status || 'PENDING';
  document.getElementById('editIsbn').value = book.isbn || '';
  document.getElementById('editNtfyTopic').value = book.ntfy_topic || '';
  document.getElementById('editTgChatId').value = book.tg_chat_id || '';
  document.getElementById('editWebhookUrl').value = book.webhook_url || '';
  toggleEditIsbnField();

  const modal = document.getElementById('editBookModal');
  modal.style.display = 'flex';
  setTimeout(() => { modal.style.opacity = '1'; }, 50);
}

function closeEditModal() {
  const modal = document.getElementById('editBookModal');
  modal.style.opacity = '0';
  setTimeout(() => { modal.style.display = 'none'; }, 300);
}

function toggleEditIsbnField() {
  const status = document.getElementById('editStatus').value;
  const dateInput = document.getElementById('editIsbnPublishedDate');
  if (status === 'COMPLETED' && !dateInput.value) {
    dateInput.value = formatDate(new Date());
  }
}

async function handleSaveBookEdit(e) {
  e.preventDefault();
  const apiKey = getApiKey();
  if (!apiKey) return;

  const id = document.getElementById('editBookId').value;
  const btn = document.getElementById('btnSaveEditSubmit');
  btn.disabled = true;

  const payload = {
    title: document.getElementById('editTitle').value.trim(),
    publisher: document.getElementById('editPublisher').value.trim() || null,
    author: document.getElementById('editAuthor').value.trim() || null,
    submission_date: document.getElementById('editSubmissionDate').value || null,
    isbn_published_date: document.getElementById('editIsbnPublishedDate').value || null,
    status: document.getElementById('editStatus').value,
    isbn: document.getElementById('editIsbn').value.trim() || null,
    ntfy_topic: document.getElementById('editNtfyTopic').value.trim() || null,
    tg_chat_id: document.getElementById('editTgChatId').value.trim() || null,
    webhook_url: document.getElementById('editWebhookUrl').value.trim() || null,
  };

  try {
    const res = await fetch(`/books/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      showAlert('Detail buku berhasil diperbarui!', 'success');
      closeEditModal();
      loadBooks();
    } else {
      showAlert(data.error || 'Gagal memperbarui detail buku.', 'error');
    }
  } catch (err) {
    console.error(err);
    showAlert('Terjadi kesalahan koneksi saat mengedit buku.', 'error');
  } finally {
    btn.disabled = false;
  }
}

// ---- Stats & Table Rendering ----

function updateStats({ total, pending, completed }) {
  document.getElementById('statTotal').innerText = total;
  document.getElementById('statPending').innerText = pending;
  document.getElementById('statCompleted').innerText = completed;
}

function renderBooksTable() {
  const body = document.getElementById('booksListBody');
  const search = document.getElementById('searchQuery').value.toLowerCase();

  let filtered = booksData.filter(b =>
    (b.title && b.title.toLowerCase().includes(search)) ||
    (b.publisher && b.publisher.toLowerCase().includes(search))
  );

  // Apply status filter
  if (currentStatusFilter !== "all") {
    filtered = filtered.filter(b => b.status === currentStatusFilter);
  }

  // Pagination
  const totalItems = filtered.length;
  const totalPages = pageSize >= totalItems ? 1 : Math.ceil(totalItems / pageSize);
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;
  const startIdx = (currentPage - 1) * pageSize;
  const paged = filtered.slice(startIdx, startIdx + pageSize);

  if (paged.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <i data-lucide="inbox" class="empty-icon"></i>
            <p>Tidak ada buku dalam pelacakan.</p>
          </div>
        </td>
      </tr>`;
    renderPagination(totalItems, totalPages);
    lucide.createIcons();
    return;
  }

  const globalOffset = startIdx;
  body.innerHTML = paged.map((book, idx) => {
    const isCompleted = book.status === 'COMPLETED';
    const authorStr = book.author || '-';
    const pubStr = book.publisher || '-';
    const dateInfo = `Pengajuan: ${book.submission_date || '-'}${isCompleted && book.isbn_published_date ? ' | Terbit: ' + book.isbn_published_date : ''}`;
    const isbnDisplay = book.isbn
      ? `<span class="font-mono" style="background:rgba(15,23,42,0.8);padding:2px 8px;border-radius:4px;border:1px solid rgba(255,255,255,0.08)">${book.isbn}</span>`
      : '<span class="text-muted">-</span>';

    return `
      <tr>
        <td data-label="No." style="text-align:center;color:var(--text-muted);font-size:0.8125rem;width:50px">${globalOffset + idx + 1}</td>
        <td data-label="Title"><div style="font-weight:600;color:var(--text-main)">${escapeHtml(book.title)}</div></td>
        <td data-label="Author / Publisher">
          <div style="font-size:0.8125rem;color:var(--text-main)">A: ${escapeHtml(authorStr)}</div>
          <div style="font-size:0.75rem;color:var(--text-muted)">P: ${escapeHtml(pubStr)}</div>
          <div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.25rem">${escapeHtml(dateInfo)}</div>
        </td>
        <td data-label="Status">
          <span class="badge ${isCompleted ? 'badge-success' : 'badge-pending'}">
            <i data-lucide="${isCompleted ? 'check' : 'loader-2'}" class="${isCompleted ? '' : 'spinner'}" style="width:0.85rem;height:0.85rem"></i>
            ${book.status}
          </span>
        </td>
        <td data-label="ISBN">${isbnDisplay}</td>
        <td data-label="Actions" class="text-right">
          <div class="flex-actions">
            <button type="button" class="btn btn-icon" onclick="openEditModal(${book.id})" aria-label="Edit book ${book.id}" style="color:var(--color-primary);border-color:rgba(59,130,246,0.2)">
              <i data-lucide="edit-3" style="width:1rem;height:1rem"></i>
            </button>
            <button type="button" class="btn btn-danger" onclick="handleDeleteBook(${book.id})" aria-label="Delete book ${book.id}">
              <i data-lucide="trash" style="width:1rem;height:1rem"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
  lucide.createIcons();
  renderPagination(totalItems, totalPages);
}

function renderPagination(total, totalPages) {
  const container = document.getElementById('pageButtons');
  const controls = document.getElementById('paginationControls');
  if (!container || !controls) return;
  container.innerHTML = '';
  if (total === 0) { controls.style.display = 'none'; return; }
  controls.style.display = 'flex';

  const makeBtn = (label, page, disabled, active) => {
    const cls = active ? 'btn btn-primary' : 'btn';
    const style = active ? '' : 'style="font-size:0.75rem;padding:0.25rem 0.5rem"';
    return `<button type="button" class="${cls}" ${style} onclick="goToPage(${page})" ${disabled ? 'disabled' : ''}>${label}</button>`;
  };

  let html = '';
  html += makeBtn('Prev', currentPage - 1, currentPage <= 1, false);

  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7 && i > 2 && i < totalPages - 1 && Math.abs(i - currentPage) > 1) {
      if (i === 3 || i === totalPages - 2) html += '<span style="padding:0 0.25rem;color:var(--text-muted)">...</span>';
      continue;
    }
    html += makeBtn(i, i, false, i === currentPage);
  }

  html += makeBtn('Next', currentPage + 1, currentPage >= totalPages, false);
  html += `<span style="font-size:0.75rem;color:var(--text-muted);margin-left:0.5rem">${total} data</span>`;
  container.innerHTML = html;
}

// ---- Average Time ----

function calculateAverageTime() {
  const filter = document.getElementById('avgTimeFilter').value;
  const customPicker = document.getElementById('customRangePicker');

  let startDateVal = null;
  let endDateVal = null;

  if (filter === 'custom') {
    customPicker.style.display = 'flex';
    startDateVal = document.getElementById('avgStartDate').value;
    endDateVal = document.getElementById('avgEndDate').value;
  } else {
    customPicker.style.display = 'none';
    const now = new Date();
    const months = { '1m': 1, '2m': 2, '3m': 3 }[filter];
    if (months) {
      now.setMonth(now.getMonth() - months);
      startDateVal = formatDate(now);
    }
  }

  const completedBooks = booksData.filter(
    b => b.status === 'COMPLETED' && b.submission_date && b.isbn_published_date
  );

  let filtered = completedBooks;
  if (startDateVal) filtered = filtered.filter(b => b.isbn_published_date >= startDateVal);
  if (endDateVal) filtered = filtered.filter(b => b.isbn_published_date <= endDateVal);

  let totalDays = 0;
  filtered.forEach(b => {
    const diff = new Date(b.isbn_published_date) - new Date(b.submission_date);
    totalDays += Math.max(0, diff / (1000 * 60 * 60 * 24));
  });

  const avgSpan = document.getElementById('avgTimeResult');
  const countSpan = document.getElementById('avgTimeCount');

  if (filtered.length > 0) {
    avgSpan.innerText = `${(totalDays / filtered.length).toFixed(1)} Hari`;
    countSpan.innerText = `(Berdasarkan ${filtered.length} buku terbit)`;
  } else {
    avgSpan.innerText = '0.0 Hari';
    countSpan.innerText = '(Berdasarkan 0 buku terbit)';
  }
}

// ---- Quick Add from Perpusnas ----

function openQuickAddModal() {
  const modal = document.getElementById('quickAddModal');
  if (!modal) return;
  document.getElementById('quickAddInput').value = '';
  document.getElementById('quickAddPreview').style.display = 'none';
  document.getElementById('quickAddBooksList').innerHTML = '';
  modal.style.display = 'flex';
  setTimeout(() => { modal.style.opacity = '1'; }, 50);
  document.getElementById('quickAddInput').focus();
}

function closeQuickAddModal() {
  const modal = document.getElementById('quickAddModal');
  if (!modal) return;
  modal.style.opacity = '0';
  setTimeout(() => { modal.style.display = 'none'; }, 300);
}

function parsePerpusnasData(text) {
  const lines = text.split('\n');
  const books = [];
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split('\t');

    // New entry: line starts with a number + tab
    if (/^\d+\t/.test(trimmed)) {
      if (current) books.push(current);
      current = {
        no_resi: parts[2] || '',
        title: '',
        author: '',
        submission_date: '',
        peruntukan: ''
      };
      continue;
    }

    if (!current) continue;

    // Title line: starts with 'web'
    if (parts[0] && parts[0].toLowerCase().startsWith('web')) {
      current.title = parts.slice(1).join(' ').trim();
      continue;
    }

    // Author/details line: starts with peruntukan like 'lepas Cetak', 'saku', etc.
    if (parts.length >= 5) {
      current.peruntukan = parts[0] || '';
      // Author is in parts[1], clean it up
      const rawAuthor = parts[1] || '';
      current.author = rawAuthor
        .split(';')
        .map(s => s.replace(/^(penulis|editor),\s*/i, '').trim())
        .filter(s => s.length > 0)
        .join('; ');
      // Date is in parts[5], format: '8/24/2026 5:42:03 PM'
      const rawDate = parts[5] || '';
      current.submission_date = convertToDateFormat(rawDate);
    }
  }
  if (current) books.push(current);

  return books.filter(b => b.title.length > 0);
}

function convertToDateFormat(dateStr) {
  if (!dateStr) return '';
  // Parse '8/24/2026 5:42:03 PM'
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return '';
  const [, month, day, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

let parsedBooksData = [];

function handleParseData() {
  const text = document.getElementById('quickAddInput').value;
  if (!text.trim()) {
    showAlert('Silakan paste data terlebih dahulu.', 'error');
    return;
  }

  parsedBooksData = parsePerpusnasData(text);
  if (parsedBooksData.length === 0) {
    showAlert('Tidak ada data buku yang terdeteksi. Pastikan format data sesuai dengan tabel Perpusnas.', 'error');
    return;
  }

  showParsedBooks(parsedBooksData);
  document.getElementById('quickAddPreview').style.display = 'block';
}

function showParsedBooks(books) {
  const container = document.getElementById('quickAddBooksList');
  container.innerHTML = '';

  books.forEach((book, index) => {
    const div = document.createElement('div');
    div.className = 'glass-card';
    div.style.cssText = 'padding:0.75rem;border:1px solid rgba(255,255,255,0.06);gap:0.75rem';
    div.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:0.75rem">
        <input type="checkbox" class="quick-add-checkbox" data-index="${index}" checked
          onchange="updateQuickAddSelectedCount()" style="margin-top:0.25rem;accent-color:var(--color-primary)">
        <div style="flex:1;display:flex;flex-direction:column;gap:0.5rem">
          <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">
            <span style="font-size:0.7rem;background:rgba(59,130,246,0.1);color:var(--color-primary);padding:2px 8px;border-radius:4px">No. Resi: ${escapeHtml(book.no_resi)}</span>
            <span style="font-size:0.7rem;background:rgba(16,185,129,0.1);color:var(--color-success);padding:2px 8px;border-radius:4px">${escapeHtml(book.peruntukan)}</span>
          </div>
          <div class="form-group" style="margin:0">
            <label style="font-size:0.75rem;color:var(--text-muted)">Judul Buku</label>
            <input type="text" class="form-control quick-add-field-title" value="${escapeHtml(book.title)}" style="font-size:0.8125rem;padding:0.375rem 0.5rem">
          </div>
          <div style="display:flex;gap:0.75rem">
            <div class="form-group" style="margin:0;flex:2">
              <label style="font-size:0.75rem;color:var(--text-muted)">Pengarang</label>
              <input type="text" class="form-control quick-add-field-author" value="${escapeHtml(book.author)}" style="font-size:0.8125rem;padding:0.375rem 0.5rem">
            </div>
            <div class="form-group" style="margin:0;flex:1">
              <label style="font-size:0.75rem;color:var(--text-muted)">Tanggal Pengajuan</label>
              <input type="date" class="form-control quick-add-field-date" value="${book.submission_date}" style="font-size:0.8125rem;padding:0.375rem 0.5rem">
            </div>
          </div>
        </div>
      </div>
    `;
    container.appendChild(div);
  });

  updateQuickAddSelectedCount();
}

function updateQuickAddSelectedCount() {
  const checkboxes = document.querySelectorAll('.quick-add-checkbox:checked');
  document.getElementById('quickAddSelectedCount').textContent = checkboxes.length;
  document.getElementById('quickAddCount').textContent = `${checkboxes.length} dari ${parsedBooksData.length} buku akan ditambahkan`;
}

function toggleSelectAllQuickAdd() {
  const checkboxes = document.querySelectorAll('.quick-add-checkbox');
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  checkboxes.forEach(cb => cb.checked = !allChecked);
  updateQuickAddSelectedCount();
}

async function handleQuickAddSubmit() {
  const apiKey = getApiKey();
  if (!apiKey) return;

  const cards = document.querySelectorAll('#quickAddBooksList > div');
  const selectedBooks = [];

  cards.forEach((card, index) => {
    const checkbox = card.querySelector('.quick-add-checkbox');
    if (!checkbox || !checkbox.checked) return;

    selectedBooks.push({
      title: card.querySelector('.quick-add-field-title').value.trim(),
      author: card.querySelector('.quick-add-field-author').value.trim() || null,
      submission_date: card.querySelector('.quick-add-field-date').value || null
    });
  });

  if (selectedBooks.length === 0) {
    showAlert('Tidak ada buku yang dipilih.', 'error');
    return;
  }

  const btn = document.getElementById('btnQuickAddSubmit');
  btn.disabled = true;
  let successCount = 0;
  let failCount = 0;

  try {
    for (const book of selectedBooks) {
      try {
        const res = await fetch('/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
          body: JSON.stringify(book),
        });
        const data = await res.json();
        if (data.success) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      showAlert(`${successCount} buku berhasil didaftarkan untuk dilacak!${failCount > 0 ? ` (${failCount} gagal)` : ''}`, 'success');
      loadBooks();
    } else {
      showAlert('Gagal mendaftarkan buku.', 'error');
    }

    closeQuickAddModal();
  } catch (err) {
    console.error(err);
    showAlert('Terjadi kesalahan koneksi.', 'error');
  } finally {
    btn.disabled = false;
  }
}

// ---- Alert Banners ----

function showAlert(message, type = 'success') {
  const container = document.getElementById('alertContainer');
  const bannerClass = type === 'success' ? 'alert-success' : 'alert-error';
  const icon = type === 'success' ? 'check-circle' : 'x-circle';
  const alertId = 'alert_' + Date.now();

  const div = document.createElement('div');
  div.className = `alert-banner ${bannerClass}`;
  div.id = alertId;
  div.innerHTML = `
    <i data-lucide="${icon}" style="width:1.25rem;height:1.25rem;flex-shrink:0"></i>
    <span>${escapeHtml(message)}</span>
    <button type="button" class="alert-close" onclick="closeAlert('${alertId}')" aria-label="Tutup notifikasi">
      <i data-lucide="x" style="width:1rem;height:1rem"></i>
    </button>`;

  container.appendChild(div);
  lucide.createIcons();
  setTimeout(() => closeAlert(alertId), 5000);
}

function closeAlert(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.opacity = '0';
  el.style.transform = 'translateY(1rem)';
  el.style.transition = 'opacity var(--transition-timing), transform var(--transition-timing)';
  setTimeout(() => el.remove(), 200);
}

// ---- Init ----

document.addEventListener('DOMContentLoaded', () => {
  // Safety: ensure edit modal starts hidden
  const modal = document.getElementById('editBookModal');
  if (modal) modal.style.display = 'none';
  tryAutoLogin();
});
