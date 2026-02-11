import WebSocket from 'ws';
import { randomUUID } from 'crypto';
import { createSession } from './event.js';

const { REMOTE_URL } = process.env;

let ws = null;
let reconnectTimer = null;

export const connectRemote = () => {
  if (!REMOTE_URL) return;

  const token = randomUUID().replace(/-/g, '');
  const base = REMOTE_URL.replace('wss://', 'https://').replace('ws://', 'http://').replace(/\/ws$/, '');
  connectRemote.remoteUrl = `${base}?token=${token}`;

  const connect = () => {
    if (ws) {
      ws.onclose = null;
      ws.close();
    }

    ws = new WebSocket(REMOTE_URL, { headers: { 'x-token': token } });

    const send = (msg) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    };

    const { handleMessage } = createSession(send);

    ws.on('open', () => {
      console.log('[remote] 已连接');
      clearTimeout(reconnectTimer);
    });

    ws.on('message', async (raw) => {
      let data;
      try { data = JSON.parse(raw); } catch { return; }
      await handleMessage(data);
    });

    ws.on('close', () => {
      console.log('[remote] 断开，5秒后重连');
      reconnectTimer = setTimeout(connect, 5000);
    });

    ws.on('error', (err) => {
      console.log(`[remote] 错误: ${err.message}`);
    });
  };

  connect();
};
