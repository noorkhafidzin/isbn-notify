/**
 * HTML entity escape for preventing XSS in notification messages
 */
function escapeHtml(str: string | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

import { Book, Env } from './types.js';

/**
 * Builds a professional, copy-paste-ready notification message body.
 * Uses the tracked title (not the official title from the ISBN web).
 */
function buildNotificationMessage(book: Book, isbn: string): string {
  return [
    '📘 Telah Terbit ISBN',
    '',
    `No. ISBN : ${isbn}`,
    `Judul Buku : ${book.title}`,
    `Pengarang : ${book.author || '-'}`,
    `Penerbit : ${book.publisher || '-'}`,
  ].join('\n');
}

/**
 * Sends a notification via Telegram Bot API
 */
export async function sendTelegramNotification(
  token: string,
  chatId: string,
  book: Book,
  isbn: string
): Promise<boolean> {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  const text = `📖 <b>ISBN TELAH TERBIT!</b> 📖\n\n` +
    `<b>No. ISBN:</b> <code>${escapeHtml(isbn)}</code>\n` +
    `<b>Judul Buku:</b> ${escapeHtml(book.title)}\n` +
    `<b>Pengarang:</b> ${escapeHtml(book.author) || '-'}\n` +
    `<b>Penerbit:</b> ${escapeHtml(book.publisher) || '-'}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
      }),
    });

    if (!res.ok) {
      console.error(`Telegram response error: ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
    return false;
  }
}

/**
 * Sends a notification via ntfy.sh
 */
export async function sendNtfyNotification(
  topic: string,
  book: Book,
  isbn: string,
  authToken?: string,
  baseUrl?: string
): Promise<boolean> {
  const base = (baseUrl || 'https://ntfy.sh').replace(/\/$/, '');
  const url = `${base}/${topic}`;
  const message = buildNotificationMessage(book, isbn);

  try {
    const headers: Record<string, string> = {
      'Title': 'ISBN Telah Terbit!',
      'Priority': 'high',
      'Tags': 'book,tada,bell',
    };

    if (authToken) {
      if (authToken.startsWith('Basic ') || authToken.startsWith('Bearer ')) {
        headers['Authorization'] = authToken;
      } else if (authToken.includes(':')) {
        // FIX: Use Buffer.from() instead of btoa() (btoa is browser-only, unavailable in Node.js)
        headers['Authorization'] = `Basic ${Buffer.from(authToken).toString('base64')}`;
      } else {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: message,
    });

    if (!res.ok) {
      console.error(`ntfy response error: ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Failed to send ntfy notification:', error);
    return false;
  }
}

/**
 * Sends a notification to a generic Webhook
 */
export async function sendWebhookNotification(
  url: string,
  book: Book,
  isbn: string
): Promise<boolean> {
  const payload = {
    event: 'isbn.published',
    timestamp: new Date().toISOString(),
    message: buildNotificationMessage(book, isbn),
    book: {
      id: book.id,
      tracked_title: book.title,
      publisher: book.publisher,
      author: book.author,
      isbn: isbn,
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'isbn-notify-worker/1.0',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error(`Webhook response error: ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Failed to send Webhook notification:', error);
    return false;
  }
}

/**
 * Dispatches notifications to all configured channels for a book
 */
export async function dispatchNotifications(
  env: Env,
  book: Book,
  isbn: string
): Promise<{ telegram: boolean; ntfy: boolean; webhook: boolean }> {
  const results = {
    telegram: false,
    ntfy: false,
    webhook: false,
  };

  console.log(`[Notifications] Dispatching for book "${book.title}" (ISBN: ${isbn})`);
  console.log(`[Notifications] env.NTFY_DEFAULT_TOPIC: ${env.NTFY_DEFAULT_TOPIC}`);
  console.log(`[Notifications] env.NTFY_DEFAULT_URL: ${env.NTFY_DEFAULT_URL}`);
  console.log(`[Notifications] env.NTFY_AUTH_TOKEN: ${env.NTFY_AUTH_TOKEN ? '***' : 'undefined'}`);

  // 1. Telegram
  const tgToken = env.TELEGRAM_BOT_TOKEN;
  const tgChatId = book.tg_chat_id || env.TELEGRAM_DEFAULT_CHAT_ID;
  if (tgToken && tgChatId) {
    console.log(`[Notifications] Sending Telegram to ${tgChatId}...`);
    results.telegram = await sendTelegramNotification(tgToken, tgChatId, book, isbn);
  } else {
    console.log(`[Notifications] Skipping Telegram: token=${!!tgToken}, chatId=${!!tgChatId}`);
  }

  // 2. ntfy.sh
  const ntfyTopic = book.ntfy_topic || env.NTFY_DEFAULT_TOPIC;
  if (ntfyTopic) {
    console.log(`[Notifications] Sending ntfy to topic "${ntfyTopic}" at ${env.NTFY_DEFAULT_URL}...`);
    results.ntfy = await sendNtfyNotification(
      ntfyTopic,
      book,
      isbn,
      env.NTFY_AUTH_TOKEN,
      env.NTFY_DEFAULT_URL
    );
    console.log(`[Notifications] ntfy result: ${results.ntfy}`);
  } else {
    console.log(`[Notifications] Skipping ntfy: no topic configured`);
  }

  // 3. Webhook
  const webhookUrl = book.webhook_url || env.WEBHOOK_DEFAULT_URL;
  if (webhookUrl) {
    console.log(`[Notifications] Sending Webhook to ${webhookUrl}...`);
    results.webhook = await sendWebhookNotification(webhookUrl, book, isbn);
  } else {
    console.log(`[Notifications] Skipping Webhook: no URL configured`);
  }

  console.log(`[Notifications] Final results for "${book.title}":`, results);
  return results;
}
