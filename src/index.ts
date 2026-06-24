import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { db } from './db';
import { renderUI } from './ui';
import { Env, Book } from './types';
import { dispatchNotifications } from './notifications';

const app = new Hono();

// Helper to get environment variables
const getEnv = (): Env => ({
  API_KEY: process.env.API_KEY || '',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_DEFAULT_CHAT_ID: process.env.TELEGRAM_DEFAULT_CHAT_ID,
  NTFY_DEFAULT_TOPIC: process.env.NTFY_DEFAULT_TOPIC,
  NTFY_DEFAULT_URL: process.env.NTFY_DEFAULT_URL,
  NTFY_AUTH_TOKEN: process.env.NTFY_AUTH_TOKEN,
  WEBHOOK_DEFAULT_URL: process.env.WEBHOOK_DEFAULT_URL,
});

// Security Middleware: Validate API Key (except root page UI)
app.use('*', async (c, next) => {
  if (c.req.path === '/' || c.req.path === '/index.html') {
    return await next();
  }

  const env = getEnv();
  const apiKey = env.API_KEY;
  if (!apiKey) {
    return c.json({ error: 'API Key is not configured on the server (API_KEY env is missing).' }, 500);
  }
  
  const requestKey = c.req.header('X-API-Key');
  if (requestKey !== apiKey) {
    return c.json({ error: 'Unauthorized. Invalid or missing X-API-Key header.' }, 401);
  }
  
  await next();
});

// Serve Web UI Dashboard
app.get('/', (c) => {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8787;
  return c.html(renderUI(port));
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
    const { title, author, publisher, tg_chat_id, ntfy_topic, webhook_url } = body;
    
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return c.json({ success: false, error: 'Title field is required and must be a string.' }, 400);
    }
    
    const cleanTitle = title.trim();
    const cleanAuthor = author ? String(author).trim() : null;
    const cleanPublisher = publisher ? String(publisher).trim() : null;
    const cleanTgChatId = tg_chat_id ? String(tg_chat_id).trim() : null;
    const cleanNtfyTopic = ntfy_topic ? String(ntfy_topic).trim() : null;
    const cleanWebhookUrl = webhook_url ? String(webhook_url).trim() : null;

    const newBook = db.addBook({
      title: cleanTitle,
      author: cleanAuthor,
      publisher: cleanPublisher,
      tg_chat_id: cleanTgChatId,
      ntfy_topic: cleanNtfyTopic,
      webhook_url: cleanWebhookUrl
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
    let errorMsg = null;

    try {
      console.log(`Checking ISBN for title: "${book.title}"`);
      const searchUrl = `https://isbn.perpusnas.go.id/landing_page/serverside_search2?search=${encodeURIComponent(book.title)}&filter_by=title&start=0&length=10`;
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

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
      errorMsg = err.message || String(err);
      details.push({ id: book.id, title: book.title, status: 'ERROR', error: errorMsg });
    }
  }

  return { checked, found, details };
}

// Start Node server
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8787;
console.log(`Server is starting on port ${port}...`);

serve({
  fetch: app.fetch,
  port
});
