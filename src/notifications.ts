import { Book, Env } from './types';

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
    `• <b>Judul Lacak:</b> ${book.title}\n` +
    `• <b>Judul Resmi:</b> ${officialTitle}\n` +
    `• <b>Penerbit:</b> ${book.publisher || '-'}\n` +
    `• <b>Nomor ISBN:</b> <code>${isbn}</code>\n\n` +
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
  isbn: string
): Promise<boolean> {
  const url = `https://ntfy.sh/${topic}`;
  const message = `Buku "${book.title}" (Resmi: "${officialTitle}") telah mendapatkan nomor ISBN: ${isbn}.`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Title': 'ISBN Telah Terbit!',
        'Priority': 'high',
        'Tags': 'book,tada,bell',
      },
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

  // 1. Telegram
  const tgToken = env.TELEGRAM_BOT_TOKEN;
  const tgChatId = book.tg_chat_id || env.TELEGRAM_DEFAULT_CHAT_ID;
  if (tgToken && tgChatId) {
    results.telegram = await sendTelegramNotification(tgToken, tgChatId, book, officialTitle, isbn);
  }

  // 2. ntfy.sh
  const ntfyTopic = book.ntfy_topic || env.NTFY_DEFAULT_TOPIC;
  if (ntfyTopic) {
    results.ntfy = await sendNtfyNotification(ntfyTopic, book, officialTitle, isbn);
  }

  // 3. Webhook
  const webhookUrl = book.webhook_url || env.WEBHOOK_DEFAULT_URL;
  if (webhookUrl) {
    results.webhook = await sendWebhookNotification(webhookUrl, book, officialTitle, isbn);
  }

  console.log(`Notification dispatch results for "${book.title}":`, results);
  return results;
}
