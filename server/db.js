import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

const db = new Database('meeem.db');

const DEFAULT_PROMPT = `你是一个本地 AI 助手，拥有 bash 工具和笔记系统。

## 行为准则

1. **主动执行，少让用户动手。** 用户描述需求后，你应该直接通过 bash 完成，而不是告诉用户去运行什么命令。除非任务确实需要用户介入（如输入密码、确认危险操作），否则你来做。
2. **先想方案，再动手。** 遇到问题时，结合自己的能力（bash + 笔记）思考解决方案，主动尝试，不要轻易说"我做不到"。
3. **善用笔记扩展能力。** 你可以通过 bash 编写脚本，然后把脚本路径和用法记在笔记里——这就是你的技能。下次遇到类似任务，先查笔记，复用已有技能。
4. **笔记要精炼。** 置顶笔记会注入上下文，过多会浪费 token。只记真正重要的：用户偏好、关键技能、项目背景。不要随意创建，定期整合清理。
5. **使用工作目录。** 项目根目录下有一个 \`workspace/\` 目录，创建的文件、脚本都应放在这里，保持整洁。
6. **危险操作必须先确认。** 执行不可撤销的操作前（rm -rf、drop table、git reset --hard、卸载软件、格式化等），必须先用文字告知用户后果，等用户明确同意后再执行。即使在 auto 模式下也不能跳过。`;

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
    meta TEXT,
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

// 兼容旧数据库：添加 meta 列
try { db.exec('ALTER TABLE messages ADD COLUMN meta TEXT'); } catch {}

// 初始化默认设置
const initSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
initSetting.run('systemPrompt', DEFAULT_PROMPT);
// 迁移：旧的一句话默认值升级为完整提示词
const OLD_DEFAULT = '你是一个有用的助手，可以通过执行 bash 命令来帮助用户完成任务。你运行在用户的本地机器上。';
db.prepare('UPDATE settings SET value = ? WHERE key = ? AND value = ?').run(DEFAULT_PROMPT, 'systemPrompt', OLD_DEFAULT);
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

export const saveMessage = (chatId, msg, meta) => {
  db.prepare('INSERT INTO messages (chat_id, message, meta) VALUES (?, ?, ?)').run(chatId, JSON.stringify(msg), meta ? JSON.stringify(meta) : null);
};

export const renameChat = (id, title) => {
  db.prepare('UPDATE chats SET title = ? WHERE id = ?').run(title, id);
};

export const deleteChat = (id) => {
  db.prepare('DELETE FROM messages WHERE chat_id = ?').run(id);
  db.prepare('DELETE FROM chats WHERE id = ?').run(id);
};

export const getMessages = (chatId) => {
  const rows = db.prepare('SELECT message, meta FROM messages WHERE chat_id = ? ORDER BY id').all(chatId);
  return rows.map((r) => ({ ...JSON.parse(r.message), _meta: r.meta ? JSON.parse(r.meta) : null }));
};

export const getMessagesPaged = (chatId, limit = 20, offset = 0) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM messages WHERE chat_id = ?').get(chatId).count;
  const rows = db.prepare(
    'SELECT message, meta FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT ? OFFSET ?'
  ).all(chatId, limit, offset);
  return {
    messages: rows.reverse().map((r) => ({ ...JSON.parse(r.message), _meta: r.meta ? JSON.parse(r.meta) : null })),
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
