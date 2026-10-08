let booksData = [];
let currentStatusFilter = 'all';
let currentPage = 1;
let pageSize = 10;

// 'newest' | 'oldest'. Newest first is the default because this is a
// working queue: the book you registered ten minutes ago is the one you
// came back to look at.
let sortDirection = 'newest';
let searchDebounceTimer = null;

// The three states R-27 requires, kept explicit so the table never has to
// guess whether "no rows" means loading, empty, or broken.
let listState = 'loading'; // 'loading' | 'ready' | 'error'
let listErrorMessage = '';

const STATUS_LABEL = { PENDING: 'Diajukan', COMPLETED: 'Terbit' };

// ---- Helpers ----

function getApiKey() {
  return localStorage.getItem('isbn_notify_api_key') || '';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
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

// Renders a stored date the way an Indonesian reader expects to see it:
// "17 Jun 2026". Returns null rather than a placeholder so the caller can
// say something true about a missing date instead of printing "-".
function formatDateID(value) {
  if (!value) return null;
  // A bare YYYY-MM-DD is parsed as UTC midnight, which lands on the previous
  // day for anyone west of Greenwich. Pin it to local time first.
  const raw = String(value).trim();
  const d = new Date(raw.length === 10 ? raw + 'T00:00:00' : raw);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function el(id) {
  return document.getElementById(id);
}

function icons() {
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ---- Theme ----

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('isbn_notify_theme', theme); } catch (e) {}
  const btn = el('btnTheme');
  if (btn) {
    btn.setAttribute('aria-label', theme === 'dark' ? 'Beralih ke tema terang' : 'Beralih ke tema gelap');
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// ---- Modal plumbing: focus trap, Escape, focus restore ----

let activeModal = null;
let lastFocusedBeforeModal = null;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusablesIn(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE))
    .filter(node => node.offsetParent !== null);
}

function openModal(modalId) {
  const modal = el(modalId);
  if (!modal) return;
  lastFocusedBeforeModal = document.activeElement;
  modal.hidden = false;
  activeModal = modalId;
  const first = focusablesIn(modal)[0];
  if (first) first.focus();
  document.addEventListener('keydown', onModalKeydown);
}

function closeModal(modalId) {
  const modal = el(modalId);
  if (!modal) return;
  modal.hidden = true;
  if (activeModal === modalId) activeModal = null;
  document.removeEventListener('keydown', onModalKeydown);
  if (lastFocusedBeforeModal && lastFocusedBeforeModal.focus) {
    lastFocusedBeforeModal.focus();
  }
  lastFocusedBeforeModal = null;
}

function onModalKeydown(e) {
  if (!activeModal) return;
  const modal = el(activeModal);

  if (e.key === 'Escape') {
    e.preventDefault();
    if (activeModal === 'quickAddModal') closeQuickAddModal();
    else closeEditModal();
    return;
  }

  // Keep Tab inside the dialog: a modal you can tab out of is not modal.
  if (e.key === 'Tab') {
    const items = focusablesIn(modal);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

// ---- Publisher suggestions ----

function refreshPublisherList() {
  const publishers = [...new Set(booksData.map(b => b.publisher).filter(p => p))];
  ['publisherList', 'editPublisherList'].forEach(id => {
    const dl = el(id);
    if (!dl) return;
    dl.innerHTML = '';
    publishers.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      dl.appendChild(opt);
    });
  });
}

// ---- Schedule management ----

function addScheduleEntry(time = '09:00') {
  const list = el('scheduleList');
  if (!list) return;

  const row = document.createElement('div');
  row.className = 'schedule-entry';

  const input = document.createElement('input');
  input.type = 'time';
  input.className = 'form-control';
  input.value = time;

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'row-btn danger';
  remove.innerHTML = '<i data-lucide="trash-2" aria-hidden="true"></i>';
  // .row-btn has no text content, so without this the button has no
  // accessible name at all.
  remove.setAttribute('aria-label', `Hapus waktu ${time}`);
  remove.addEventListener('click', () => {
    row.remove();
    updateWarningVisibility();
    const remaining = focusablesIn(list);
    (remaining[remaining.length - 1] || el('cfgScheduler')).focus();
  });

  row.appendChild(input);
  row.appendChild(remove);
  list.appendChild(row);

  icons();
  updateWarningVisibility();
  return input;
}

function getScheduleTimes() {
  return Array.from(document.querySelectorAll('#scheduleList input[type="time"]'))
    .map(i => i.value)
    .filter(v => v);
}

function updateWarningVisibility() {
  const w = el('schedulerWarning');
  if (w) w.hidden = getScheduleTimes().length <= 4;
}

function toggleScheduleContainer() {
  const val = el('cfgScheduler').value;
  const c = el('customScheduleContainer');
  if (!c) return;
  c.hidden = val !== 'custom';
  if (val === 'custom') {
    const list = el('scheduleList');
    // Never present an empty picker: an empty list cannot be saved.
    if (!list.children.length) addScheduleEntry();
    else updateWarningVisibility();
  }
}

// ---- Auth ----

function showDashboard() {
  el('loginOverlay').hidden = true;
  el('main').hidden = false;
}

async function handleLogin(e) {
  e.preventDefault();
  const password = el('loginPassword').value;
  const btn = el('btnLoginSubmit');
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
      showDashboard();
      showAlert('Autentikasi berhasil.', 'success');
      loadBooks();
      loadSettings();
    } else {
      showAlert('Password yang Anda masukkan salah.', 'error');
    }
  } catch (err) {
    console.error(err);
    showAlert('Tidak dapat menghubungi server. Periksa koneksi Anda.', 'error');
  } finally {
    btn.disabled = false;
  }
}

async function tryAutoLogin() {
  const subInput = el('submissionDate');
  if (subInput) subInput.value = formatDate(new Date());

  const storedKey = localStorage.getItem('isbn_notify_api_key');
  if (!storedKey) return;

  try {
    const res = await fetch('/books', { headers: { 'X-API-Key': storedKey } });
    if (!res.ok) return;
    showDashboard();
    loadBooks();
    loadSettings();
  } catch {}
}

function handleLogout() {
  localStorage.removeItem('isbn_notify_api_key');
  el('loginPassword').value = '';
  el('main').hidden = true;
  el('loginOverlay').hidden = false;
  switchTab('tracking');
  el('loginPassword').focus();
}

// ---- Tabs ----

function switchTab(tabId) {
  const isTracking = tabId === 'tracking';
  el('tabContentTracking').hidden = !isTracking;
  el('tabContentSettings').hidden = isTracking;
  el('tabBtnTracking').setAttribute('aria-selected', String(isTracking));
  el('tabBtnSettings').setAttribute('aria-selected', String(!isTracking));
  if (isTracking) loadBooks();
  else loadSettings();
}

// Roving tabindex: arrow keys move between tabs, as the tablist pattern expects.
function onTablistKeydown(e) {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  e.preventDefault();
  const next = e.key === 'ArrowRight' ? 'settings' : 'tracking';
  switchTab(next);
  el(next === 'settings' ? 'tabBtnSettings' : 'tabBtnTracking').focus();
}

function toggleAdvancedSettings() {
  const adv = el('advancedSettings');
  const toggle = el('advToggle');
  const expanded = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!expanded));
  adv.hidden = expanded;
}

// ---- Books API ----

async function loadBooks() {
  const apiKey = getApiKey();
  if (!apiKey) return;

  // Enter the loading state explicitly, so a slow network never looks empty.
  listState = 'loading';
  renderBooksTable();

  try {
    const res = await fetch('/books', { headers: { 'X-API-Key': apiKey } });
    if (res.status === 401) { handleLogout(); return; }
    const data = await res.json();
    if (!data.success) {
      listState = 'error';
      listErrorMessage = data.error || 'Server menolak permintaan.';
      showAlert(listErrorMessage, 'error');
      renderBooksTable();
      return;
    }
    booksData = data.books || [];
    listState = 'ready';
    refreshPublisherList();
    updateStats({
      total: booksData.length,
      pending: booksData.filter(b => b.status === 'PENDING').length,
      completed: booksData.filter(b => b.status === 'COMPLETED').length,
    });
    calculateAverageTime();
    renderBooksTable();
  } catch (err) {
    console.error(err);
    listState = 'error';
    listErrorMessage = 'Tidak dapat menghubungi server.';
    renderBooksTable();
  }
}

async function handleAddBook(e) {
  e.preventDefault();
  const apiKey = getApiKey();
  if (!apiKey) return;

  const btn = el('btnSubmit');
  btn.disabled = true;

  const payload = {
    title: el('title').value.trim(),
    publisher: el('publisher').value.trim() || null,
    author: el('author').value.trim() || null,
    submission_date: el('submissionDate').value || null,
    ntfy_topic: el('ntfyTopic').value.trim() || null,
    tg_chat_id: el('tgChatId').value.trim() || null,
    webhook_url: el('webhookUrl').value.trim() || null,
  };

  try {
    const res = await fetch('/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      showAlert('Buku didaftarkan dan mulai dilacak.', 'success');
      el('addBookForm').reset();
      el('submissionDate').value = formatDate(new Date());
      el('advancedSettings').hidden = true;
      el('advToggle').setAttribute('aria-expanded', 'false');
      loadBooks();
    } else {
      showAlert(data.error || 'Gagal mendaftarkan buku.', 'error');
    }
  } catch (err) {
    console.error(err);
    showAlert('Tidak dapat menghubungi server.', 'error');
  } finally {
    btn.disabled = false;
  }
}

async function handleDeleteBook(id, title) {
  // Native confirm() cannot be used here: it is anchored to the page, and the
  // full-viewport overlay sits on top of it, so the user could see the dialog
  // but not click it. The two-step arm pattern needs no overlay of its own.
  const btn = document.activeElement;
  if (!btn || !btn.dataset.confirmArmed) {
    const label = btn ? btn.getAttribute('aria-label') : 'Hapus';
    if (btn) {
      btn.dataset.confirmArmed = '1';
      btn.dataset.confirmLabel = label || '';
      btn.setAttribute('aria-label', `Konfirmasi: hapus ${title}`);
      btn.classList.add('armed');
    }
    setTimeout(() => {
      if (!btn) return;
      delete btn.dataset.confirmArmed;
      btn.classList.remove('armed');
      if (btn.dataset.confirmLabel) btn.setAttribute('aria-label', btn.dataset.confirmLabel);
      delete btn.dataset.confirmLabel;
    }, 5000);
    return;
  }

  delete btn.dataset.confirmArmed;
  btn.classList.remove('armed');
  if (btn.dataset.confirmLabel) btn.setAttribute('aria-label', btn.dataset.confirmLabel);
  delete btn.dataset.confirmLabel;

  const apiKey = getApiKey();
  if (!apiKey) return;

  try {
    const res = await fetch(`/books/${id}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    });
    const data = await res.json();
    if (data.success) {
      showAlert('Buku dihapus dari daftar pelacakan.', 'success');
      loadBooks();
    } else {
      showAlert(data.error || 'Gagal menghapus buku.', 'error');
    }
  } catch (err) {
    console.error(err);
    showAlert('Tidak dapat menghubungi server.', 'error');
  }
}

// ---- Pagination & filtering ----

function changePageSize(size) {
  pageSize = size === 'all' ? 9999 : parseInt(size, 10);
  currentPage = 1;
  renderBooksTable();
}

function goToPage(page) {
  currentPage = page;
  renderBooksTable();
}

function filterByStatus(status) {
  currentStatusFilter = status;
  currentPage = 1;
  renderBooksTable();
}

async function handleManualCheck() {
  const apiKey = getApiKey();
  if (!apiKey) return;

  const btn = el('btnCheckNow');
  const icon = el('checkIcon');
  btn.disabled = true;
  // The icon element itself is replaced by lucide at runtime, so the spin
  // class has to sit on the <svg> that replaces it, not on the <i>.
  if (icon instanceof SVGElement) icon.classList.add('spin');
  else btn.querySelector('svg')?.classList.add('spin');

  try {
    const res = await fetch('/check', { method: 'POST', headers: { 'X-API-Key': apiKey } });
    const data = await res.json();
    if (data.success) {
      showAlert(data.found > 0
        ? `Pemeriksaan selesai. ${data.found} nomor ISBN baru ditemukan dari ${data.checked} buku.`
        : `Pemeriksaan selesai. Belum ada ISBN baru dari ${data.checked} buku.`, 'success');
      loadBooks();
    } else {
      showAlert(data.error || 'Gagal memeriksa ISBN.', 'error');
    }
  } catch (err) {
    console.error(err);
    showAlert('Tidak dapat menghubungi server.', 'error');
  } finally {
    btn.disabled = false;
    const svg = btn.querySelector('svg');
    if (svg) svg.classList.remove('spin');
  }
}

// ---- Settings ----

async function loadSettings() {
  const apiKey = getApiKey();
  if (!apiKey) return;

  try {
    const res = await fetch('/settings', { headers: { 'X-API-Key': apiKey } });
    if (res.status === 401) { handleLogout(); return; }
    const data = await res.json();
    if (!data.success || !data.settings) return;

    const cfg = data.settings;
    el('cfgNtfyUrl').value = cfg.NTFY_DEFAULT_URL || '';
    el('cfgNtfyTopic').value = cfg.NTFY_DEFAULT_TOPIC || '';
    el('cfgNtfyAuth').value = cfg.NTFY_AUTH_TOKEN || '';
    el('cfgTgToken').value = cfg.TELEGRAM_BOT_TOKEN || '';
    el('cfgTgChat').value = cfg.TELEGRAM_DEFAULT_CHAT_ID || '';
    el('cfgWebhookUrl').value = cfg.WEBHOOK_DEFAULT_URL || '';
    el('cfgScheduler').value = cfg.SCHEDULER_INTERVAL === 'disabled' ? 'disabled' : 'custom';

    const list = el('scheduleList');
    list.innerHTML = '';
    const times = Array.isArray(cfg.SCHEDULER_HOURS) && cfg.SCHEDULER_HOURS.length
      ? cfg.SCHEDULER_HOURS
      : ['09:00', '13:00', '17:00'];
    times.forEach(t => addScheduleEntry(t));

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

  const interval = el('cfgScheduler').value;
  const payload = {
    NTFY_DEFAULT_URL: el('cfgNtfyUrl').value.trim() || null,
    NTFY_DEFAULT_TOPIC: el('cfgNtfyTopic').value.trim() || null,
    NTFY_AUTH_TOKEN: el('cfgNtfyAuth').value || null,
    TELEGRAM_BOT_TOKEN: el('cfgTgToken').value || null,
    TELEGRAM_DEFAULT_CHAT_ID: el('cfgTgChat').value.trim() || null,
    WEBHOOK_DEFAULT_URL: el('cfgWebhookUrl').value.trim() || null,
    SCHEDULER_INTERVAL: interval,
    SCHEDULER_HOURS: [],
  };

  if (interval === 'custom') {
    const times = getScheduleTimes();
    if (times.length === 0) {
      showAlert('Tambahkan minimal satu waktu pemeriksaan.', 'error');
      el('scheduleList').focus();
      return;
    }
    payload.SCHEDULER_HOURS = times;
  }

  try {
    const res = await fetch('/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      showAlert('Konfigurasi tersimpan dan penjadwal diperbarui.', 'success');
      loadSettings();
    } else {
      showAlert(data.error || 'Gagal menyimpan konfigurasi.', 'error');
    }
  } catch (err) {
    console.error(err);
    showAlert('Tidak dapat menghubungi server.', 'error');
  }
}

// ---- Edit modal ----

function openEditModal(id) {
  // The id arrives from an inline onclick handler, so it is always a string,
  // while book.id comes off JSON as a number. Strict equality never matches and
  // the modal silently failed to open; String() on both sides is the fix.
  const book = booksData.find(b => String(b.id) === String(id));
  if (!book) return;

  el('editBookId').value = book.id;
  el('editBookTitle').value = book.title || '';
  el('editPublisher').value = book.publisher || '';
  el('editAuthor').value = book.author || '';
  el('editSubmissionDate').value = book.submission_date || formatDate(new Date());
  el('editIsbnPublishedDate').value = book.isbn_published_date || '';
  el('editStatus').value = book.status || 'PENDING';
  el('editIsbn').value = book.isbn || '';
  el('editNtfyTopic').value = book.ntfy_topic || '';
  el('editTgChatId').value = book.tg_chat_id || '';
  el('editWebhookUrl').value = book.webhook_url || '';
  toggleEditIsbnField();

  openModal('editBookModal');
}

function closeEditModal() {
  closeModal('editBookModal');
}

function toggleEditIsbnField() {
  const status = el('editStatus').value;
  const dateInput = el('editIsbnPublishedDate');
  if (status === 'COMPLETED' && !dateInput.value) {
    dateInput.value = formatDate(new Date());
  }
}

async function handleSaveBookEdit(e) {
  e.preventDefault();
  const apiKey = getApiKey();
  if (!apiKey) return;

  const id = el('editBookId').value;
  const btn = el('btnSaveEditSubmit');
  btn.disabled = true;

  const payload = {
    title: el('editBookTitle').value.trim(),
    publisher: el('editPublisher').value.trim() || null,
    author: el('editAuthor').value.trim() || null,
    submission_date: el('editSubmissionDate').value || null,
    isbn_published_date: el('editIsbnPublishedDate').value || null,
    status: el('editStatus').value,
    isbn: el('editIsbn').value.trim() || null,
    ntfy_topic: el('editNtfyTopic').value.trim() || null,
    tg_chat_id: el('editTgChatId').value.trim() || null,
    webhook_url: el('editWebhookUrl').value.trim() || null,
  };

  try {
    const res = await fetch(`/books/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      showAlert('Detail buku diperbarui.', 'success');
      closeEditModal();
      loadBooks();
    } else {
      showAlert(data.error || 'Gagal memperbarui detail buku.', 'error');
    }
  } catch (err) {
    console.error(err);
    showAlert('Tidak dapat menghubungi server.', 'error');
  } finally {
    btn.disabled = false;
  }
}

// ---- Stats & table rendering ----

function updateStats({ total, pending, completed }) {
  el('statTotal').innerText = total;
  el('statPending').innerText = pending;
  el('statCompleted').innerText = completed;
}

// Three states, each naming its cause and the action that resolves it.
function renderState(kind, opts) {
  const map = {
    loading: {
      icon: 'loader-2',
      spinner: true,
      title: 'Memuat daftar buku',
      text: 'Mengambil data pelacakan dari server.',
    },
    error: {
      icon: 'alert-triangle',
      title: 'Gagal memuat daftar buku',
      text: opts.text,
      action: '<button type="button" class="btn btn-secondary" onclick="loadBooks()">Coba lagi</button>',
    },
    empty: {
      icon: 'inbox',
      title: opts.title,
      text: opts.text,
      action: opts.action,
    },
  };
  const s = map[kind];
  return `
    <div class="state${kind === 'error' ? ' state-error' : ''}">
      <i data-lucide="${s.icon}" class="state-icon${s.spinner ? ' spinner' : ''}" aria-hidden="true"></i>
      <p class="state-title">${s.title}</p>
      <p class="state-text">${s.text}</p>
      ${s.action || ''}
    </div>`;
}

function renderBooksTable() {
  const body = el('booksListBody');
  const controls = el('paginationControls');
  const search = el('searchQuery').value.trim().toLowerCase();

  if (listState === 'loading') {
    body.innerHTML = `
      <tr><td colspan="6">
        <div class="state" aria-busy="true">
          <i data-lucide="loader-2" class="state-icon spinner" aria-hidden="true"></i>
          <p class="state-title">Memuat daftar buku</p>
          <p class="state-text">Mengambil data pelacakan dari server.</p>
        </div>
      </td></tr>`;
    controls.hidden = true;
    icons();
    return;
  }

  if (listState === 'error') {
    body.innerHTML = `
      <tr><td colspan="6">
        ${renderState('error', { text: listErrorMessage })}
      </td></tr>`;
    controls.hidden = true;
    icons();
    return;
  }

  let filtered = booksData.filter(b =>
    (b.title && b.title.toLowerCase().includes(search)) ||
    (b.publisher && b.publisher.toLowerCase().includes(search)) ||
    (b.author && b.author.toLowerCase().includes(search))
  );

  if (currentStatusFilter !== 'all') {
    filtered = filtered.filter(b => b.status === currentStatusFilter);
  }

  // The API returns insertion order, so "newest first" has to be an explicit
  // decision rather than an accident of when the file was last written.
  // ISO-8601 strings sort correctly with a plain string compare, so no Date
  // objects and no timezone surprises. Records missing created_at sink to the
  // bottom in both directions.
  const direction = sortDirection === 'oldest' ? 1 : -1;
  filtered.sort((a, b) => {
    const at = a.created_at || '';
    const bt = b.created_at || '';
    if (at === bt) return (b.id || 0) - (a.id || 0); // tie-break on the higher id
    if (at === '') return 1;
    if (bt === '') return -1;
    return (at < bt ? -1 : 1) * direction;
  });

  const totalItems = filtered.length;

  // First run, a search that missed, and a filter that matched nothing are
  // three different situations and must not share one message.
  if (totalItems === 0) {
    let title, text, action;
    if (booksData.length === 0) {
      title = 'Belum ada buku dilacak';
      text = 'Daftar ini masih kosong. Tambahkan buku pertama, atau tempel data dari Perpusnas untuk menambah banyak sekaligus.';
      action = '<button type="button" class="btn btn-primary" onclick="document.getElementById(\'title\').focus()">Daftarkan buku pertama</button>';
    } else if (search) {
      title = 'Tidak ada hasil untuk pencarian';
      text = `Tidak ada buku yang cocok dengan "${escapeHtml(el('searchQuery').value.trim())}". Coba kata lain atau kosongkan pencarian.`;
      action = '<button type="button" class="btn btn-secondary" onclick="clearSearch()">Kosongkan pencarian</button>';
    } else {
      const label = STATUS_LABEL[currentStatusFilter] || currentStatusFilter;
      title = `Tidak ada buku berstatus ${label.toLowerCase()}`;
      text = booksData.length === 0
        ? 'Belum ada buku dilacak.'
        : `Semua ${booksData.length} buku yang dilacak tidak berstatus ${label.toLowerCase()}. Ubah filter untuk melihat status lain.`;
      action = '<button type="button" class="btn btn-secondary" onclick="filterByStatus(\'all\')">Tampilkan semua status</button>';
    }
    body.innerHTML = `<tr><td colspan="6">${renderState('empty', { title, text, action })}</td></tr>`;
    controls.hidden = true;
    // The empty states carry their own recovery action, so the summary row
    // would just repeat it. Hide it rather than stack two of the same thing.
    renderListSummary(0, booksData.length);
    icons();
    return;
  }

  const totalPages = Math.ceil(totalItems / pageSize);
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;
  const startIdx = (currentPage - 1) * pageSize;
  const paged = filtered.slice(startIdx, startIdx + pageSize);

  body.innerHTML = paged.map((book, idx) => {
    const settled = book.status === 'COMPLETED';
    const statusLabel = STATUS_LABEL[book.status] || book.status;

    // Say something true about a missing date instead of printing "-", which
    // reads as a rendering fault rather than as absent data.
    const submitted = formatDateID(book.submission_date);
    const published = formatDateID(book.isbn_published_date);
    const dateParts = [];
    if (submitted) dateParts.push(`Diajukan ${submitted}`);
    if (settled && published) dateParts.push(`terbit ${published}`);
    const dateInfo = dateParts.length
      ? dateParts.join(', ')
      : 'Tanggal pengajuan belum dicatat';

    // Every interpolated value is escaped. isbn and id come from the scraped
    // Perpusnas response and are not data this app controls.
    const isbnCell = book.isbn
      ? `<span class="plate">${escapeHtml(book.isbn)}</span>`
      : '<span class="cell-sub">Belum ada</span>';

    const idAttr = escapeHtml(book.id);
    const safeTitle = escapeHtml(book.title || '');

    return `
      <tr>
        <td class="cell-index" data-label="No.">${startIdx + idx + 1}</td>
        <td data-label="Judul"><div class="cell-title">${safeTitle}</div></td>
        <td data-label="Pengarang dan penerbit">
          <div class="cell-stack">
            <div class="cell-meta">${escapeHtml(book.author || 'Pengarang tidak dicatat')}</div>
            <div class="cell-sub">${escapeHtml(book.publisher || 'Penerbit tidak dicatat')}</div>
            <div class="cell-dates">${escapeHtml(dateInfo)}</div>
          </div>
        </td>
        <td data-label="Status">
          <span class="badge ${settled ? 'badge-settled' : 'badge-pending'}">${escapeHtml(statusLabel)}</span>
        </td>
        <td data-label="ISBN">${isbnCell}</td>
        <td data-label="Aksi" style="text-align:right">
          <div class="row-actions">
            <button type="button" class="row-btn" onclick="openEditModal('${idAttr}')" aria-label="Edit ${safeTitle}" title="Edit">
              <i data-lucide="edit-3" aria-hidden="true"></i>
            </button>
            <button type="button" class="row-btn danger" onclick="handleDeleteBook('${idAttr}', '${safeTitle}')" aria-label="Hapus ${safeTitle}" title="Hapus">
              <i data-lucide="trash-2" aria-hidden="true"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');

  icons();
  renderPagination(totalItems, totalPages);
  renderListSummary(totalItems, booksData.length);
}

function clearSearch() {
  el('searchQuery').value = '';
  renderBooksTable();
  el('searchQuery').focus();
}

// Re-rendering the whole tbody on every keystroke makes typing feel sticky once
// the list is long. Settle for a quarter second after the last key instead.
function onSearchInput() {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    currentPage = 1;
    renderBooksTable();
  }, 250);
}

function setSortOrder(value) {
  sortDirection = value === 'oldest' ? 'oldest' : 'newest';
  try { localStorage.setItem('isbn_notify_sort', sortDirection); } catch (e) {}
  currentPage = 1;
  renderBooksTable();
}

// Escapes both the search box and the status filter, since either one alone can
// leave the user staring at an empty table with no obvious way back.
function resetAllFilters() {
  clearTimeout(searchDebounceTimer);
  el('searchQuery').value = '';
  currentStatusFilter = 'all';
  el('statusFilter').value = 'all';
  currentPage = 1;
  renderBooksTable();
  el('searchQuery').focus();
}

// Shown only while something is actually narrowing the list.
function renderListSummary(shown, total) {
  const row = el('listSummary');
  if (!row) return;
  const filtering = !!el('searchQuery').value.trim() || currentStatusFilter !== 'all';
  if (!filtering || total === 0) {
    row.hidden = true;
    return;
  }
  el('listSummaryText').textContent =
    `Menampilkan ${shown} dari ${total} buku`;
  row.hidden = false;
}

function renderPagination(total, totalPages) {
  const container = el('pageButtons');
  const controls = el('paginationControls');
  if (!container || !controls) return;

  container.innerHTML = '';
  if (total === 0) { controls.hidden = true; return; }
  controls.hidden = false;

  const pageBtn = (label, page, opts = {}) => {
    const isCurrent = opts.current === true;
    const attrs = [
      `type="button"`,
      `class="page-btn"`,
      `onclick="goToPage(${page})"`,
      opts.disabled ? 'disabled' : '',
      isCurrent ? 'aria-current="page"' : '',
      opts.label ? `aria-label="${escapeHtml(opts.label)}"` : '',
    ].filter(Boolean).join(' ');
    return `<button ${attrs}>${label}</button>`;
  };

  let html = pageBtn('Sebelumnya', currentPage - 1, {
    disabled: currentPage <= 1,
    label: 'Halaman sebelumnya',
  });

  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7 && i > 2 && i < totalPages - 1 && Math.abs(i - currentPage) > 1) {
      if (i === 3 || i === totalPages - 2) html += '<span class="page-gap">...</span>';
      continue;
    }
    html += pageBtn(i, i, { current: i === currentPage, label: `Halaman ${i}` });
  }

  html += pageBtn('Berikutnya', currentPage + 1, {
    disabled: currentPage >= totalPages,
    label: 'Halaman berikutnya',
  });

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);
  html += `<span class="pagination-info" style="margin-left:0.5rem">${from}-${to} dari ${total}</span>`;
  container.innerHTML = html;
}

// ---- Average time ----

function calculateAverageTime() {
  const filter = el('avgTimeFilter').value;
  const customPicker = el('customRangePicker');
  customPicker.hidden = filter !== 'custom';

  let startDateVal = null;
  let endDateVal = null;

  if (filter === 'custom') {
    startDateVal = el('avgStartDate').value;
    endDateVal = el('avgEndDate').value;
  } else {
    const months = { '1m': 1, '2m': 2, '3m': 3 }[filter];
    if (months) {
      const from = new Date();
      from.setMonth(from.getMonth() - months);
      startDateVal = formatDate(from);
    }
  }

  const settled = booksData.filter(
    b => b.status === 'COMPLETED' && b.submission_date && b.isbn_published_date
  );

  let scoped = settled;
  if (startDateVal) scoped = scoped.filter(b => b.isbn_published_date >= startDateVal);
  if (endDateVal) scoped = scoped.filter(b => b.isbn_published_date <= endDateVal);

  const resultEl = el('avgTimeResult');
  const countEl = el('avgTimeCount');

  if (scoped.length === 0) {
    resultEl.textContent = 'Belum ada data';
    countEl.textContent = booksData.length === 0
      ? 'Daftar pelacakan masih kosong.'
      : 'Belum ada buku yang terbit pada rentang ini.';
    return;
  }

  const totalDays = scoped.reduce((sum, b) => {
    const diff = new Date(b.isbn_published_date) - new Date(b.submission_date);
    return sum + Math.max(0, diff / 86400000);
  }, 0);

  resultEl.textContent = `${(totalDays / scoped.length).toFixed(1)} hari`;
  countEl.textContent = `Dihitung dari ${scoped.length} buku yang terbit${startDateVal ? ' pada rentang ini' : ''}.`;
}

// ---- Quick Add ----

function openQuickAddModal() {
  const modal = el('quickAddModal');
  if (!modal) return;
  el('quickAddInput').value = '';
  el('quickAddPreview').hidden = true;
  el('quickAddBooksList').innerHTML = '';
  openModal('quickAddModal');
  el('quickAddInput').focus();
}

function closeQuickAddModal() {
  closeModal('quickAddModal');
}

function parsePerpusnasData(text) {
  const books = [];
  let current = null;

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split('\t');

    // New entry: line begins with a row number.
    if (/^\d+\t/.test(trimmed)) {
      if (current) books.push(current);
      current = { no_resi: parts[2] || '', title: '', author: '', submission_date: '', peruntukan: '' };
      continue;
    }

    if (!current) continue;

    if (parts[0] && parts[0].toLowerCase().startsWith('web')) {
      current.title = parts.slice(1).join(' ').trim();
      continue;
    }

    if (parts.length >= 5) {
      current.peruntukan = parts[0] || '';
      current.author = (parts[1] || '')
        .split(';')
        .map(s => s.replace(/^(penulis|editor),\s*/i, '').trim())
        .filter(Boolean)
        .join('; ');
      current.submission_date = convertToDateFormat(parts[5] || '');
    }
  }
  if (current) books.push(current);

  return books.filter(b => b.title.length > 0);
}

function convertToDateFormat(dateStr) {
  const match = (dateStr || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return '';
  const [, month, day, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

let parsedBooksData = [];

function handleParseData() {
  const text = el('quickAddInput').value;
  if (!text.trim()) {
    showAlert('Tempel data dari Perpusnas terlebih dahulu.', 'error');
    el('quickAddInput').focus();
    return;
  }

  parsedBooksData = parsePerpusnasData(text);
  if (parsedBooksData.length === 0) {
    showAlert('Tidak ada baris buku yang terbaca. Pastikan data yang ditempel berasal dari tabel permohonan ISBN Perpusnas.', 'error');
    return;
  }

  showParsedBooks(parsedBooksData);
  el('quickAddPreview').hidden = false;
  el('btnQuickAddSubmit').focus();
}

function showParsedBooks(books) {
  const container = el('quickAddBooksList');
  container.innerHTML = '';

  books.forEach((book, index) => {
    const row = document.createElement('div');
    row.className = 'parsed-book';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'quick-add-checkbox';
    checkbox.dataset.index = String(index);
    checkbox.checked = true;
    checkbox.setAttribute('aria-label', `Pilih ${book.title}`);
    checkbox.addEventListener('change', updateQuickAddSelectedCount);

    const body = document.createElement('div');
    body.className = 'parsed-book-body';

    const tags = document.createElement('div');
    tags.className = 'parsed-book-tags';
    if (book.no_resi) {
      tags.innerHTML += `<span class="plate">Resi ${escapeHtml(book.no_resi)}</span>`;
    }
    if (book.peruntukan) {
      tags.innerHTML += `<span class="plate">${escapeHtml(book.peruntukan)}</span>`;
    }

    // Built with DOM APIs and .value rather than interpolated innerHTML, so a
    // scraped title can never become markup.
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'form-control quick-add-field-title';
    titleInput.value = book.title;

    const authorInput = document.createElement('input');
    authorInput.type = 'text';
    authorInput.className = 'form-control quick-add-field-author';
    authorInput.value = book.author;

    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.className = 'form-control quick-add-field-date';
    dateInput.value = book.submission_date;

    const field = (labelText, input) => {
      const wrap = document.createElement('div');
      wrap.className = 'form-group';
      const label = document.createElement('label');
      label.textContent = labelText;
      label.className = 'form-group-label';
      const id = `qa-${index}-${labelText.toLowerCase().replace(/\s+/g, '-')}`;
      input.id = id;
      label.setAttribute('for', id);
      wrap.appendChild(label);
      wrap.appendChild(input);
      return wrap;
    };

    const fields = document.createElement('div');
    fields.className = 'parsed-book-fields';
    const authorWrap = field('Pengarang', authorInput);
    authorWrap.style.flex = '2';
    fields.appendChild(authorWrap);
    fields.appendChild(field('Tanggal pengajuan', dateInput));

    body.appendChild(tags);
    body.appendChild(field('Judul buku', titleInput));
    body.appendChild(fields);

    row.appendChild(checkbox);
    row.appendChild(body);
    container.appendChild(row);
  });

  updateQuickAddSelectedCount();
}

function updateQuickAddSelectedCount() {
  const checked = document.querySelectorAll('.quick-add-checkbox:checked').length;
  el('quickAddSelectedCount').textContent = checked;
  el('quickAddCount').textContent = checked === parsedBooksData.length
    ? `Semua ${parsedBooksData.length} buku akan ditambahkan`
    : `${checked} dari ${parsedBooksData.length} buku akan ditambahkan`;

  const submit = el('btnQuickAddSubmit');
  submit.disabled = checked === 0;
}

function toggleSelectAllQuickAdd() {
  const boxes = document.querySelectorAll('.quick-add-checkbox');
  const allChecked = Array.from(boxes).every(cb => cb.checked);
  boxes.forEach(cb => { cb.checked = !allChecked; });
  updateQuickAddSelectedCount();
}

async function handleQuickAddSubmit() {
  const apiKey = getApiKey();
  if (!apiKey) return;

  const selected = [];
  document.querySelectorAll('#quickAddBooksList .parsed-book').forEach(row => {
    const checkbox = row.querySelector('.quick-add-checkbox');
    if (!checkbox || !checkbox.checked) return;
    selected.push({
      title: row.querySelector('.quick-add-field-title').value.trim(),
      author: row.querySelector('.quick-add-field-author').value.trim() || null,
      submission_date: row.querySelector('.quick-add-field-date').value || null,
    });
  });

  if (selected.length === 0) {
    showAlert('Pilih minimal satu buku untuk ditambahkan.', 'error');
    return;
  }

  const btn = el('btnQuickAddSubmit');
  btn.disabled = true;
  let successCount = 0;
  let failCount = 0;

  try {
    for (const book of selected) {
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
      showAlert(failCount > 0
        ? `${successCount} buku ditambahkan, ${failCount} gagal.`
        : `${successCount} buku ditambahkan dan mulai dilacak.`, 'success');
      closeQuickAddModal();
      loadBooks();
    } else {
      showAlert('Tidak ada buku yang berhasil ditambahkan.', 'error');
    }
  } catch (err) {
    console.error(err);
    showAlert('Terjadi kesalahan koneksi.', 'error');
  } finally {
    btn.disabled = false;
  }
}

// ---- Alerts ----

function showAlert(message, type = 'success') {
  const container = el('alertContainer');
  const isError = type === 'error';

  const banner = document.createElement('div');
  banner.className = `alert-banner ${isError ? 'alert-error' : 'alert-success'}`;

  const icon = document.createElement('i');
  icon.setAttribute('data-lucide', isError ? 'circle-alert' : 'circle-check');
  icon.setAttribute('aria-hidden', 'true');

  const text = document.createElement('span');
  text.textContent = message;

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'alert-close';
  close.setAttribute('aria-label', 'Tutup notifikasi');
  close.innerHTML = '<i data-lucide="x" aria-hidden="true"></i>';
  close.addEventListener('click', () => dismiss());

  banner.appendChild(icon);
  banner.appendChild(text);
  banner.appendChild(close);
  container.appendChild(banner);
  icons();

  // Errors stay until dismissed; confirmations get out of the way.
  if (!isError) setTimeout(dismiss, 5000);

  function dismiss() {
    banner.remove();
  }
}

// ---- Init ----

document.addEventListener('DOMContentLoaded', () => {
  const tablist = document.querySelector('.tablist');
  if (tablist) tablist.addEventListener('keydown', onTablistKeydown);

  const storedTheme = localStorage.getItem('isbn_notify_theme');
  applyTheme(storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : 'light');

  // Restore the saved sort before the first render, and keep the visible
  // control in sync so the dropdown never disagrees with the list.
  const storedSort = localStorage.getItem('isbn_notify_sort');
  sortDirection = storedSort === 'oldest' ? 'oldest' : 'newest';
  const sortSelect = el('sortOrder');
  if (sortSelect) sortSelect.value = sortDirection;

  tryAutoLogin();
});
