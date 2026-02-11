import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, 'public');
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
};

// token -> { agent, phones }
const rooms = new Map();

const getRoom = (token) => {
  if (!rooms.has(token)) rooms.set(token, { agent: null, phones: new Set() });
  return rooms.get(token);
};

// HTTP 静态文件
const server = createServer((req, res) => {
  const url = req.url.split('?')[0];
  const filePath = join(PUBLIC_DIR, url === '/' ? '/index.html' : url);
  if (existsSync(filePath)) {
    const ext = filePath.slice(filePath.lastIndexOf('.'));
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// WebSocket 中转
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token') || req.headers['x-token'];

  if (!token) {
    ws.close(1008, '缺少 token');
    return;
  }

  const role = req.headers['x-token'] ? 'agent' : 'phone';
  const room = getRoom(token);

  if (role === 'agent') {
    if (room.agent) room.agent.close(1000, 'replaced');
    room.agent = ws;

    ws.on('message', (data) => {
      for (const phone of room.phones) {
        try { phone.send(data); } catch {}
      }
    });

    ws.on('close', () => {
      if (room.agent === ws) room.agent = null;
      if (!room.phones.size) rooms.delete(token);
    });

  } else {
    room.phones.add(ws);

    ws.on('message', (data) => {
      if (room.agent) {
        try { room.agent.send(data); } catch {}
      }
    });

    ws.on('close', () => {
      room.phones.delete(ws);
      if (!room.agent && !room.phones.size) rooms.delete(token);
    });
  }
});

server.listen(PORT, () => {
  console.log(`relay running on port ${PORT}`);
});
