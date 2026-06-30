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
 * Sends a notification via Telegram Bot API
 */
export async function sendTelegramNotification(
  token: string,
  chatId: string,
  book: Book,
  officialTitle: string,
  isbn: string
): Promise<boolean> {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  const text = `📖 <b>ISBN TELAH TERBIT!</b> 📖\n\n` +
    `Buku yang Anda lacak telah resmi diterbitkan nomor ISBN-nya oleh Perpusnas RI.\n\n` +
    `<b>Detail Buku:</b>\n` +
    `• <b>Judul Lacak:</b> ${escapeHtml(book.title)}\n` +
    `• <b>Judul Resmi:</b> ${escapeHtml(officialTitle)}\n` +
    `• <b>Penerbit:</b> ${escapeHtml(book.publisher) || '-'}\n` +
    `• <b>Nomor ISBN:</b> <code>${escapeHtml(isbn)}</code>\n\n` +
    `<i>Sistem isbn-notify telah menonaktifkan pelacakan untuk buku ini.</i>`;

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
  officialTitle: string,
  isbn: string,
  authToken?: string,
  baseUrl?: string
): Promise<boolean> {
  const base = (baseUrl || 'https://ntfy.sh').replace(/\/$/, '');
  const url = `${base}/${topic}`;
  const message = `Buku "${book.title}" (Resmi: "${officialTitle}") telah mendapatkan nomor ISBN: ${isbn}.`;

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
  officialTitle: string,
  isbn: string
): Promise<boolean> {
  const payload = {
    event: 'isbn.published',
    timestamp: new Date().toISOString(),
    book: {
      id: book.id,
      tracked_title: book.title,
      official_title: officialTitle,
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
  officialTitle: string,
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
    results.telegram = await sendTelegramNotification(tgToken, tgChatId, book, officialTitle, isbn);
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
      officialTitle,
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
    results.webhook = await sendWebhookNotification(webhookUrl, book, officialTitle, isbn);
  } else {
    console.log(`[Notifications] Skipping Webhook: no URL configured`);
  }

  console.log(`[Notifications] Final results for "${book.title}":`, results);
  return results;
}
