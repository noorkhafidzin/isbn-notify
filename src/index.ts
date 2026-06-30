import 'dotenv/config';
import { timingSafeEqual } from 'crypto';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { db } from './db.js';
import { renderUI } from './ui.js';
import { getMergedSettings, writeSettings, getRawSettings } from './settings.js';
import { startScheduler, updateScheduler, clearScheduler } from './scheduler.js';
import { Env, Book } from './types.js';
import { dispatchNotifications } from './notifications.js';

const app = new Hono();

// Constant-time string comparison to prevent timing attacks
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

// In-memory rate limiter for login attempts
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Helper to get environment variables merging process.env and settings.json
const getEnv = (): Env => {
  const settings = getMergedSettings();
  return {
    API_KEY: process.env.API_KEY || '',
    TELEGRAM_BOT_TOKEN: settings.TELEGRAM_BOT_TOKEN || undefined,
    TELEGRAM_DEFAULT_CHAT_ID: settings.TELEGRAM_DEFAULT_CHAT_ID || undefined,
    NTFY_DEFAULT_TOPIC: settings.NTFY_DEFAULT_TOPIC || undefined,
    NTFY_DEFAULT_URL: settings.NTFY_DEFAULT_URL || undefined,
    NTFY_AUTH_TOKEN: settings.NTFY_AUTH_TOKEN || process.env.NTFY_AUTH_TOKEN || undefined,
    WEBHOOK_DEFAULT_URL: settings.WEBHOOK_DEFAULT_URL || undefined,
  };
};

// Security Headers Middleware
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self' https://unpkg.com; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;");
});

// Security Middleware: Validate API Key (except root page UI and /verify route)
app.use('*', async (c, next) => {
  const path = c.req.path;
  if (path === '/' || path === '/ui.css' || path === '/ui.js' || path === '/index.html' || path === '/verify') {
    return await next();
  }

  const env = getEnv();
  const apiKey = env.API_KEY;
  if (!apiKey) {
    return c.json({ error: 'API Key is not configured on the server (API_KEY env is missing).' }, 500);
  }
  
  const requestKey = c.req.header('X-API-Key');
  if (!requestKey || !safeCompare(requestKey, apiKey)) {
    return c.json({ error: 'Unauthorized. Invalid or missing X-API-Key header.' }, 401);
  }
  
  await next();
});

// Serve Web UI Dashboard
app.get('/', (c) => {
  return c.html(renderUI());
});

// Serve static assets
app.get('/ui.css', async (c) => {
  const { readFileSync } = await import('fs');
  const css = readFileSync('./src/ui.css', 'utf-8');
  return c.text(css, 200, { 'Content-Type': 'text/css', 'Cache-Control': 'public, max-age=3600' });
});

app.get('/ui.js', async (c) => {
  const { readFileSync } = await import('fs');
  const js = readFileSync('./src/ui.js', 'utf-8');
  return c.text(js, 200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'public, max-age=3600' });
});

// REST API: Get all tracked books
app.get('/books', (c) => {
  try {
    const books = db.getBooks();
    return c.json({ success: true, books });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// REST API: Add new book for tracking
app.post('/books', async (c) => {
  try {
    const body = await c.req.json();
    const { title, author, publisher, tg_chat_id, ntfy_topic, webhook_url, submission_date } = body;
    
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return c.json({ success: false, error: 'Title field is required and must be a string.' }, 400);
    }
    
    const cleanTitle = title.trim();
    const cleanAuthor = author ? String(author).trim() : null;
    const cleanPublisher = publisher ? String(publisher).trim() : null;
    const cleanTgChatId = tg_chat_id ? String(tg_chat_id).trim() : null;
    const cleanNtfyTopic = ntfy_topic ? String(ntfy_topic).trim() : null;
    const cleanWebhookUrl = webhook_url ? String(webhook_url).trim() : null;
    const cleanSubmissionDate = submission_date ? String(submission_date).trim() : null;

    const newBook = db.addBook({
      title: cleanTitle,
      author: cleanAuthor,
      publisher: cleanPublisher,
      tg_chat_id: cleanTgChatId,
      ntfy_topic: cleanNtfyTopic,
      webhook_url: cleanWebhookUrl,
      submission_date: cleanSubmissionDate
    });

    return c.json({ 
      success: true, 
      message: 'Book registered for ISBN tracking successfully.',
      book: newBook
    }, 201);

  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// REST API: Delete book from tracking
app.delete('/books/:id', (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) {
      return c.json({ success: false, error: 'Invalid ID format.' }, 400);
    }
    
    const success = db.deleteBook(id);
    
    if (!success) {
      return c.json({ success: false, error: `Book with id ${id} not found.` }, 404);
    }
    
    return c.json({ success: true, message: 'Book deleted from tracking successfully.' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// REST API: Update book details
app.put('/books/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    if (isNaN(id)) {
      return c.json({ success: false, error: 'Invalid ID format.' }, 400);
    }
    
    const body = await c.req.json();
    const { 
      title, author, publisher, status, isbn, 
      submission_date, isbn_published_date,
      tg_chat_id, ntfy_topic, webhook_url 
    } = body;
    
    if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
      return c.json({ success: false, error: 'Title cannot be empty.' }, 400);
    }
    
    const updates: any = {};
    if (title !== undefined) updates.title = title.trim();
    if (author !== undefined) updates.author = author ? String(author).trim() : null;
    if (publisher !== undefined) updates.publisher = publisher ? String(publisher).trim() : null;
    if (status !== undefined) updates.status = status;
    if (isbn !== undefined) updates.isbn = isbn ? String(isbn).trim() : null;
    if (submission_date !== undefined) updates.submission_date = submission_date ? String(submission_date).trim() : null;
    if (isbn_published_date !== undefined) updates.isbn_published_date = isbn_published_date ? String(isbn_published_date).trim() : null;
    if (tg_chat_id !== undefined) updates.tg_chat_id = tg_chat_id ? String(tg_chat_id).trim() : null;
    if (ntfy_topic !== undefined) updates.ntfy_topic = ntfy_topic ? String(ntfy_topic).trim() : null;
    if (webhook_url !== undefined) updates.webhook_url = webhook_url ? String(webhook_url).trim() : null;
    
    const success = db.updateBook(id, updates);
    if (!success) {
      return c.json({ success: false, error: `Book with id ${id} not found.` }, 404);
    }
    
    return c.json({ success: true, message: 'Book updated successfully.' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// REST API: Manually trigger tracking check
app.post('/check', async (c) => {
  try {
    const env = getEnv();
    const trackingResults = await checkIsbns(env);
    return c.json({ success: true, ...trackingResults });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// REST API: Verify Password Overlay (rate-limited, timing-safe)
app.post('/verify', async (c) => {
  try {
    const clientIp = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    if (isRateLimited(clientIp)) {
      return c.json({ success: false, error: 'Too many login attempts. Please try again later.' }, 429);
    }

    const body = await c.req.json();
    const { password } = body;
    const apiKey = process.env.API_KEY || '';
    
    if (apiKey && typeof password === 'string' && safeCompare(password, apiKey)) {
      return c.json({ success: true, message: 'Password verified successfully.' });
    } else {
      return c.json({ success: false, error: 'Invalid password.' }, 401);
    }
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// REST API: Get current global configuration settings
app.get('/settings', (c) => {
  try {
    const merged = getMergedSettings();
    // Mask sensitive configurations
    const maskedSettings = {
      ...merged,
      TELEGRAM_BOT_TOKEN: merged.TELEGRAM_BOT_TOKEN ? '••••••••••••••••' : '',
      NTFY_AUTH_TOKEN: merged.NTFY_AUTH_TOKEN ? '••••••••••••••••' : '',
    };
    return c.json({ success: true, settings: maskedSettings });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// REST API: Update global configuration settings
app.post('/settings', async (c) => {
  try {
    const body = await c.req.json();
    const existing = getRawSettings();
    
    const newSettings = {
      TELEGRAM_BOT_TOKEN: body.TELEGRAM_BOT_TOKEN === '••••••••••••••••' ? existing.TELEGRAM_BOT_TOKEN : body.TELEGRAM_BOT_TOKEN,
      TELEGRAM_DEFAULT_CHAT_ID: body.TELEGRAM_DEFAULT_CHAT_ID,
      NTFY_DEFAULT_TOPIC: body.NTFY_DEFAULT_TOPIC,
      NTFY_DEFAULT_URL: body.NTFY_DEFAULT_URL,
      NTFY_AUTH_TOKEN: body.NTFY_AUTH_TOKEN === '••••••••••••••••' ? existing.NTFY_AUTH_TOKEN : body.NTFY_AUTH_TOKEN,
      WEBHOOK_DEFAULT_URL: body.WEBHOOK_DEFAULT_URL,
      SCHEDULER_INTERVAL: body.SCHEDULER_INTERVAL,
      SCHEDULER_HOURS: body.SCHEDULER_HOURS,
    };
    
    writeSettings(newSettings);
    
    // Update the background scheduler interval
    const merged = getMergedSettings();
    updateScheduler(merged.SCHEDULER_INTERVAL, async () => {
      console.log('[Scheduler] Automatically checking ISBNs...');
      await checkIsbns(getEnv());
    }, merged.SCHEDULER_HOURS);
    
    return c.json({ success: true, message: 'Settings saved and scheduler updated successfully.' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Checks all PENDING books against Perpusnas search API
 */
export async function checkIsbns(env: Env): Promise<{ checked: number; found: number; details: any[] }> {
  const pendingBooks = db.getBooks().filter(book => book.status === 'PENDING');

  let checked = 0;
  let found = 0;
  const details = [];

  for (const book of pendingBooks) {
    checked++;
    let hasFoundIsbn = false;
    let foundIsbnStr = '';
    let foundOfficialTitle = '';

    try {
      console.log(`Checking ISBN for title: "${book.title}"`);
      const searchUrl = `https://isbn.perpusnas.go.id/landing_page/serverside_search2?search=${encodeURIComponent(book.title)}&filter_by=title&start=0&length=10`;
      
      // Add AbortController timeout to prevent scheduler hang
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout per book
      
      const response = await fetch(searchUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Perpusnas search API returned status ${response.status}`);
      }

      const resJson = (await response.json()) as any;
      const dataList = resJson.data || [];

      // Find match in returned data
      for (const item of dataList) {
        let isTitleMatch = false;
        
        // Match titles (case insensitive)
        if (item.title && item.title.toLowerCase().includes(book.title.toLowerCase())) {
          isTitleMatch = true;
        }

        // Match publisher (case insensitive) if specified
        if (isTitleMatch && book.publisher && item.nama_penerbit) {
          if (!item.nama_penerbit.toLowerCase().includes(book.publisher.toLowerCase())) {
            isTitleMatch = false;
          }
        }

        // Match author (case insensitive) if specified
        if (isTitleMatch && book.author && item.kepeng) {
          if (!item.kepeng.toLowerCase().includes(book.author.toLowerCase())) {
            isTitleMatch = false;
          }
        }

        if (isTitleMatch) {
          // Extract ISBN
          const rawIsbn = item.isbn || item.code;
          if (rawIsbn && rawIsbn.trim() !== '' && rawIsbn.trim() !== '-') {
            hasFoundIsbn = true;
            foundIsbnStr = rawIsbn.trim();
            foundOfficialTitle = item.title.trim();
            break;
          }
        }
      }

      if (hasFoundIsbn) {
        found++;
        // Update database: status COMPLETED and store ISBN
        db.updateBook(book.id, {
          status: 'COMPLETED',
          isbn: foundIsbnStr,
          isbn_published_date: new Date().toISOString().split('T')[0],
          last_checked_at: new Date().toISOString()
        });

        console.log(`Success: ISBN found for "${book.title}" -> ${foundIsbnStr}. Dispatching notifications...`);
        
        // Dispatch notifications to configured channels
        await dispatchNotifications(env, book, foundOfficialTitle, foundIsbnStr);
        
        details.push({ id: book.id, title: book.title, status: 'FOUND', isbn: foundIsbnStr });
      } else {
        // Update last checked timestamp only
        db.updateBook(book.id, {
          last_checked_at: new Date().toISOString()
        });
        
        details.push({ id: book.id, title: book.title, status: 'PENDING' });
      }

    } catch (err: any) {
      console.error(`Error checking book "${book.title}":`, err);
      details.push({ id: book.id, title: book.title, status: 'ERROR', error: err.message || String(err) });
    }
  }

  return { checked, found, details };
}

// Start background scheduler on boot
const settings = getMergedSettings();
startScheduler(settings.SCHEDULER_INTERVAL, async () => {
  console.log('[Scheduler] Automatically checking ISBNs...');
  await checkIsbns(getEnv());
}, settings.SCHEDULER_HOURS);

// Start Node server
// Graceful shutdown handler
const shutdown = () => {
  console.log('[Server] Shutting down gracefully...');
  clearScheduler();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8787;
console.log(`Server is starting on port ${port}...`);

serve({
  fetch: app.fetch,
  port
});
