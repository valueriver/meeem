import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'ui', 'dist');
import { addNote, updateNote, deleteNote, listNotes, getNote, searchNotes } from './db.js';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
};

const readBody = (req) => new Promise((resolve) => {
  let body = '';
  req.on('data', (c) => body += c);
  req.on('end', () => {
    try { resolve(JSON.parse(body)); } catch { resolve({}); }
  });
});

const json = (res, data, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};

export const httpServer = createServer(async (req, res) => {
  const parsed = new URL(req.url, `http://${req.headers.host}`);
  const path = parsed.pathname;

  // ===== 笔记 API =====
  if (path === '/api/note/list' && req.method === 'GET') {
    return json(res, listNotes());
  }

  if (path === '/api/note/search' && req.method === 'GET') {
    const q = parsed.searchParams.get('q');
    if (!q) return json(res, { error: '缺少 q' }, 400);
    return json(res, searchNotes(q));
  }

  if (path === '/api/note/detail' && req.method === 'GET') {
    const id = parsed.searchParams.get('id');
    if (!id) return json(res, { error: '缺少 id' }, 400);
    const n = getNote(Number(id));
    return n ? json(res, n) : json(res, { error: '笔记不存在' }, 404);
  }

  if (path === '/api/note/create' && req.method === 'POST') {
    const body = await readBody(req);
    if (!body.title) return json(res, { error: '缺少 title' }, 400);
    const id = addNote(body.title, body.content || '');
    return json(res, { id });
  }

  if (path === '/api/note/update' && req.method === 'POST') {
    const body = await readBody(req);
    if (!body.id) return json(res, { error: '缺少 id' }, 400);
    updateNote(body.id, body);
    return json(res, { ok: true });
  }

  if (path === '/api/note/delete' && req.method === 'POST') {
    const body = await readBody(req);
    if (!body.id) return json(res, { error: '缺少 id' }, 400);
    deleteNote(body.id);
    return json(res, { ok: true });
  }

  // ===== 静态文件 =====
  const url = path === '/' ? '/index.html' : path;
  const filePath = join(PUBLIC_DIR, url);

  if (existsSync(filePath)) {
    const ext = url.slice(url.lastIndexOf('.'));
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});
