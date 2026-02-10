import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

const db = new Database('meeem.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    title TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (chat_id) REFERENCES chats(id)
  );
`);

export const createChat = (title = '新对话') => {
  const id = randomUUID();
  db.prepare('INSERT INTO chats (id, title) VALUES (?, ?)').run(id, title);
  return id;
};

export const listChats = () => {
  return db.prepare('SELECT * FROM chats ORDER BY created_at DESC').all();
};

export const saveMessage = (chatId, msg) => {
  db.prepare('INSERT INTO messages (chat_id, message) VALUES (?, ?)').run(chatId, JSON.stringify(msg));
};

export const getMessages = (chatId) => {
  const rows = db.prepare('SELECT message FROM messages WHERE chat_id = ? ORDER BY id').all(chatId);
  return rows.map((r) => JSON.parse(r.message));
};
