import fs from 'fs';
import path from 'path';

export interface AppSettings {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_DEFAULT_CHAT_ID?: string;
  NTFY_DEFAULT_TOPIC?: string;
  NTFY_DEFAULT_URL?: string;
  NTFY_AUTH_TOKEN?: string;
  WEBHOOK_DEFAULT_URL?: string;
  SCHEDULER_INTERVAL?: 'custom' | 'disabled';
  SCHEDULER_HOURS?: string[] | number[];
}

function normalizeHours(hours: unknown): string[] {
  if (!hours || !Array.isArray(hours) || hours.length === 0) {
    return ['09:00', '13:00', '17:00'];
  }
  if (typeof hours[0] === 'number') {
    return (hours as number[]).map(h => `${String(h).padStart(2, '0')}:00`);
  }
  return hours.map(String);
}

const DB_PATH = process.env.DB_PATH;
const SETTINGS_FILE = DB_PATH
  ? path.resolve(path.dirname(DB_PATH), 'settings.json')
  : path.resolve(process.cwd(), 'settings.json');

export function getRawSettings(): AppSettings {
  if (!fs.existsSync(SETTINGS_FILE)) {
    return {};
  }
  try {
    const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    return JSON.parse(data) as AppSettings;
  } catch (error) {
    console.error('Error reading settings file, returning empty config:', error);
    return {};
  }
}

export function writeSettings(settings: AppSettings): void {
  const tempFile = `${SETTINGS_FILE}.tmp`;
  try {
    const cleanSettings: AppSettings = {
      TELEGRAM_BOT_TOKEN: settings.TELEGRAM_BOT_TOKEN?.trim() || undefined,
      TELEGRAM_DEFAULT_CHAT_ID: settings.TELEGRAM_DEFAULT_CHAT_ID?.trim() || undefined,
      NTFY_DEFAULT_TOPIC: settings.NTFY_DEFAULT_TOPIC?.trim() || undefined,
      NTFY_DEFAULT_URL: settings.NTFY_DEFAULT_URL?.trim() || undefined,
      NTFY_AUTH_TOKEN: settings.NTFY_AUTH_TOKEN?.trim() || undefined,
      WEBHOOK_DEFAULT_URL: settings.WEBHOOK_DEFAULT_URL?.trim() || undefined,
      SCHEDULER_INTERVAL: settings.SCHEDULER_INTERVAL || 'custom',
      SCHEDULER_HOURS: normalizeHours(settings.SCHEDULER_HOURS),
    };

    fs.writeFileSync(tempFile, JSON.stringify(cleanSettings, null, 2), 'utf-8');
    fs.renameSync(tempFile, SETTINGS_FILE);
  } catch (error) {
    console.error('Error writing settings file:', error);
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch {}
    }
    throw error;
  }
}

export function getMergedSettings(): Omit<Required<AppSettings>, 'SCHEDULER_HOURS'> & { SCHEDULER_HOURS: string[] } {
  const raw = getRawSettings();

  let interval: 'custom' | 'disabled' = 'custom';
  const rawInterval = raw.SCHEDULER_INTERVAL || process.env.SCHEDULER_INTERVAL || 'custom';
  if (rawInterval === '3x-daily' || rawInterval === 'hourly') {
    interval = 'custom';
  } else if (rawInterval === 'daily') {
    interval = 'custom';
  } else if (rawInterval === 'disabled') {
    interval = 'disabled';
  } else {
    interval = 'custom';
  }

  let hours: string[] | number[] | undefined = raw.SCHEDULER_HOURS;

  if (interval === 'custom' && (!hours || hours.length === 0)) {
    hours = ['09:00', '13:00', '17:00'];
  }

  return {
    TELEGRAM_BOT_TOKEN: raw.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '',
    TELEGRAM_DEFAULT_CHAT_ID: raw.TELEGRAM_DEFAULT_CHAT_ID || process.env.TELEGRAM_DEFAULT_CHAT_ID || '',
    NTFY_DEFAULT_TOPIC: raw.NTFY_DEFAULT_TOPIC || process.env.NTFY_DEFAULT_TOPIC || 'isbn',
    NTFY_DEFAULT_URL: raw.NTFY_DEFAULT_URL || process.env.NTFY_DEFAULT_URL || 'https://ntfy.sh',
    NTFY_AUTH_TOKEN: raw.NTFY_AUTH_TOKEN || process.env.NTFY_AUTH_TOKEN || '',
    WEBHOOK_DEFAULT_URL: raw.WEBHOOK_DEFAULT_URL || process.env.WEBHOOK_DEFAULT_URL || '',
    SCHEDULER_INTERVAL: interval,
    SCHEDULER_HOURS: normalizeHours(hours),
  };
}
