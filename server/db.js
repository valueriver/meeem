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
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    pinned INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// 初始化默认设置
const initSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
initSetting.run('systemPrompt', '你是一个有用的助手，可以通过执行 bash 命令来帮助用户完成任务。你运行在用户的本地机器上。');
initSetting.run('contextRounds', '30');
initSetting.run('apiUrl', 'https://api.openai.com/v1/chat/completions');
initSetting.run('apiKey', '');
initSetting.run('model', 'gpt-4o-mini');

// ===== 对话 =====
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

export const renameChat = (id, title) => {
  db.prepare('UPDATE chats SET title = ? WHERE id = ?').run(title, id);
};

export const deleteChat = (id) => {
  db.prepare('DELETE FROM messages WHERE chat_id = ?').run(id);
  db.prepare('DELETE FROM chats WHERE id = ?').run(id);
};

export const getMessages = (chatId) => {
  const rows = db.prepare('SELECT message FROM messages WHERE chat_id = ? ORDER BY id').all(chatId);
  return rows.map((r) => JSON.parse(r.message));
};

export const getMessagesPaged = (chatId, limit = 20, offset = 0) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM messages WHERE chat_id = ?').get(chatId).count;
  const rows = db.prepare(
    'SELECT message FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT ? OFFSET ?'
  ).all(chatId, limit, offset);
  return {
    messages: rows.reverse().map((r) => JSON.parse(r.message)),
    total,
    hasMore: offset + limit < total
  };
};

// ===== 设置 =====
export const getSettings = () => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const obj = {};
  for (const r of rows) obj[r.key] = r.value;
  return {
    systemPrompt: obj.systemPrompt || '',
    contextRounds: Number(obj.contextRounds) || 30,
    apiUrl: obj.apiUrl || 'https://api.openai.com/v1/chat/completions',
    apiKey: obj.apiKey || '',
    model: obj.model || 'gpt-4o-mini'
  };
};

export const saveSetting = (key, value) => {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
};

// ===== 笔记 =====
export const addNote = (title, content = '') => {
  const r = db.prepare('INSERT INTO notes (title, content) VALUES (?, ?)').run(title, content);
  return r.lastInsertRowid;
};

export const updateNote = (id, fields) => {
  const sets = [];
  const vals = [];
  for (const k of ['title', 'content', 'pinned']) {
    if (fields[k] !== undefined) { sets.push(`${k} = ?`); vals.push(fields[k]); }
  }
  if (!sets.length) return;
  vals.push(id);
  db.prepare(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
};

export const deleteNote = (id) => {
  db.prepare('DELETE FROM notes WHERE id = ?').run(id);
};

export const listNotes = () => {
  return db.prepare('SELECT * FROM notes ORDER BY pinned DESC, id DESC').all();
};

export const getNote = (id) => {
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
};

export const getPinnedNotes = () => {
  return db.prepare('SELECT id, title, content FROM notes WHERE pinned = 1 ORDER BY id').all();
};

export const searchNotes = (keyword) => {
  return db.prepare('SELECT * FROM notes WHERE title LIKE ? OR content LIKE ? ORDER BY pinned DESC, id DESC').all(`%${keyword}%`, `%${keyword}%`);
};
