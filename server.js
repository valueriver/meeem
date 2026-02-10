import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { WebSocketServer } from 'ws';
import { chat } from './chat.js';
import { createChat, listChats, getMessages, saveMessage } from './db.js';

const SYSTEM = '你是一个有用的助手，可以通过执行 bash 命令来帮助用户完成任务。你运行在用户的本地机器上。';
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
};

// HTTP 服务（提供 public 目录下的静态文件）
const httpServer = createServer((req, res) => {
  const url = req.url === '/' ? '/index.html' : req.url;
  const filePath = join('public', url);

  if (existsSync(filePath)) {
    const ext = url.slice(url.lastIndexOf('.'));
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// WebSocket
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  let chatId = null;
  let messages = [];

  ws.on('message', async (raw) => {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }

    const send = (msg) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
    };

    // 新建对话
    if (data.type === 'new_chat') {
      chatId = createChat(data.title);
      messages = [{ role: 'system', content: SYSTEM }];
      send({ type: 'chat_created', chatId });
      return;
    }

    // 加载历史对话
    if (data.type === 'load_chat') {
      chatId = data.chatId;
      messages = [{ role: 'system', content: SYSTEM }, ...getMessages(chatId)];
      send({ type: 'chat_loaded', messages: messages.slice(1) });
      return;
    }

    // 对话列表
    if (data.type === 'list_chats') {
      send({ type: 'chat_list', chats: listChats() });
      return;
    }

    // 发送消息
    if (data.type === 'message') {
      if (!chatId) {
        chatId = createChat(data.content.slice(0, 20));
        messages = [{ role: 'system', content: SYSTEM }];
        send({ type: 'chat_created', chatId });
      }

      const userMsg = { role: 'user', content: data.content };
      messages.push(userMsg);
      saveMessage(chatId, userMsg);

      try {
        await chat(chatId, messages, send);
      } catch (e) {
        send({ type: 'error', content: e.message });
      }
      return;
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
