import fs from 'fs';
import path from 'path';
import { Book } from './types';

const DB_FILE = process.env.DB_PATH 
  ? path.resolve(process.env.DB_PATH) 
  : path.resolve(process.cwd(), 'books.json');

// Ensure the JSON database file exists
function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

// Read books from the JSON file
function readDb(): Book[] {
  initDb();
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data) as Book[];
  } catch (error) {
    console.error('Error reading database file, returning empty list:', error);
    return [];
  }
}

// Write books to the JSON file atomically
function writeDb(books: Book[]): void {
  const tempFile = `${DB_FILE}.tmp`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(books, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (error) {
    console.error('Error writing database file:', error);
    if (fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
      } catch (_) {}
    }
    throw error;
  }
}

export const db = {
  getBooks(): Book[] {
    return readDb();
  },

  addBook(data: {
    title: string;
    author: string | null;
    publisher: string | null;
    tg_chat_id: string | null;
    ntfy_topic: string | null;
    webhook_url: string | null;
  }): Book {
    const books = readDb();
    
    // Generate new incremental ID
    const maxId = books.reduce((max, book) => (book.id > max ? book.id : max), 0);
    const newId = maxId + 1;
    
    const now = new Date().toISOString();
    const newBook: Book = {
      id: newId,
      title: data.title,
      author: data.author,
      publisher: data.publisher,
      status: 'PENDING',
      isbn: null,
      tg_chat_id: data.tg_chat_id,
      ntfy_topic: data.ntfy_topic,
      webhook_url: data.webhook_url,
      created_at: now,
      updated_at: now,
      last_checked_at: null,
    };
    
    books.push(newBook);
    writeDb(books);
    return newBook;
  },

  deleteBook(id: number): boolean {
    const books = readDb();
    const initialLength = books.length;
    const filteredBooks = books.filter((book) => book.id !== id);
    
    if (filteredBooks.length === initialLength) {
      return false; // Book not found
    }
    
    writeDb(filteredBooks);
    return true;
  },

  updateBook(id: number, updates: Partial<Omit<Book, 'id' | 'created_at'>>): boolean {
    const books = readDb();
    const bookIndex = books.findIndex((book) => book.id === id);
    
    if (bookIndex === -1) {
      return false; // Book not found
    }
    
    const now = new Date().toISOString();
    books[bookIndex] = {
      ...books[bookIndex],
      ...updates,
      updated_at: now,
    };
    
    writeDb(books);
    return true;
  }
};
