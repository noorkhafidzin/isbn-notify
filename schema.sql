DROP TABLE IF EXISTS books;
CREATE TABLE books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT,
    publisher TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    isbn TEXT,
    tg_chat_id TEXT,
    ntfy_topic TEXT,
    webhook_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_checked_at DATETIME
);
CREATE INDEX idx_books_status ON books(status);
