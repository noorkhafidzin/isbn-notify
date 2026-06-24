import { Hono } from 'hono';
import { Env, Book } from './types';
import { dispatchNotifications } from './notifications';

const app = new Hono<{ Bindings: Env }>();

// Security Middleware: Validate API Key
app.use('*', async (c, next) => {
  const apiKey = c.env.API_KEY;
  if (!apiKey) {
    return c.json({ error: 'API Key is not configured on the server (API_KEY env is missing).' }, 500);
  }
  
  const requestKey = c.req.header('X-API-Key');
  if (requestKey !== apiKey) {
    return c.json({ error: 'Unauthorized. Invalid or missing X-API-Key header.' }, 401);
  }
  
  await next();
});

// REST API: Get all tracked books
app.get('/books', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT * FROM books ORDER BY created_at DESC`
    ).all<Book>();
    
    return c.json({ success: true, books: results });
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

    const result = await c.env.DB.prepare(
      `INSERT INTO books (title, author, publisher, tg_chat_id, ntfy_topic, webhook_url) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      cleanTitle,
      cleanAuthor,
      cleanPublisher,
      cleanTgChatId,
      cleanNtfyTopic,
      cleanWebhookUrl
    ).run();

    return c.json({ 
      success: true, 
      message: 'Book registered for ISBN tracking successfully.',
      book: {
        id: result.meta.last_row_id,
        title: cleanTitle,
        author: cleanAuthor,
        publisher: cleanPublisher,
        status: 'PENDING'
      }
    }, 201);

  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// REST API: Delete book from tracking
app.delete('/books/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const result = await c.env.DB.prepare(
      `DELETE FROM books WHERE id = ?`
    ).bind(id).run();
    
    if (result.meta.changes === 0) {
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
    const trackingResults = await checkIsbns(c.env);
    return c.json({ success: true, ...trackingResults });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Checks all PENDING books against Perpusnas search API
 */
export async function checkIsbns(env: Env): Promise<{ checked: number; found: number; details: any[] }> {
  const { results: pendingBooks } = await env.DB.prepare(
    `SELECT * FROM books WHERE status = 'PENDING'`
  ).all<Book>();

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
        await env.DB.prepare(
          `UPDATE books SET status = 'COMPLETED', isbn = ?, updated_at = CURRENT_TIMESTAMP, last_checked_at = CURRENT_TIMESTAMP WHERE id = ?`
        ).bind(foundIsbnStr, book.id).run();

        console.log(`Success: ISBN found for "${book.title}" -> ${foundIsbnStr}. Dispatching notifications...`);
        
        // Dispatch notifications to configured channels
        await dispatchNotifications(env, book, foundOfficialTitle, foundIsbnStr);
        
        details.push({ id: book.id, title: book.title, status: 'FOUND', isbn: foundIsbnStr });
      } else {
        // Update last checked timestamp only
        await env.DB.prepare(
          `UPDATE books SET last_checked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        ).bind(book.id).run();
        
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

// Export default Worker bindings
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`Scheduled Cron Trigger running at ${new Date().toISOString()}`);
    ctx.waitUntil(checkIsbns(env));
  }
};
