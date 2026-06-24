export interface Env {
  API_KEY: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_DEFAULT_CHAT_ID?: string;
  NTFY_DEFAULT_TOPIC?: string;
  NTFY_DEFAULT_URL?: string;
  NTFY_AUTH_TOKEN?: string;
  WEBHOOK_DEFAULT_URL?: string;
}

export interface Book {
  id: number;
  title: string;
  author: string | null;
  publisher: string | null;
  status: 'PENDING' | 'COMPLETED';
  isbn: string | null;
  tg_chat_id: string | null;
  ntfy_topic: string | null;
  webhook_url: string | null;
  created_at: string;
  updated_at: string;
  last_checked_at: string | null;
}

export interface PerpusnasBook {
  ptid?: string;
  id?: string;
  title?: string;
  penerbit_id?: number | string;
  kepeng?: string;
  nama_penerbit?: string;
  tahun_terbit?: string;
  tempat_terbit?: string;
  isbn?: string;
  code?: string;
  jenis_media?: string;
}

export interface PerpusnasSearchResponse {
  recordsTotal: number;
  recordsFiltered: number;
  data: PerpusnasBook[];
  facets?: Record<string, string[]>;
}
