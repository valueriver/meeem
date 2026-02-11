import { ref } from 'vue';

const handlers = new Map();
let ws = null;
let pingTimer = null;
let pongTimer = null;

// 响应式状态
export const wsStatus = ref('disconnected'); // connected | disconnected | connecting
export const wsUrl = ref(localStorage.getItem('wsUrl') || `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`);

export const connect = (url) => {
  if (url) {
    wsUrl.value = url;
    localStorage.setItem('wsUrl', url);
  }

  if (ws) {
    ws.onclose = null;
    ws.close();
  }

  clearInterval(pingTimer);
  clearTimeout(pongTimer);
  wsStatus.value = 'connecting';

  ws = new WebSocket(wsUrl.value);

  ws.onopen = () => {
    wsStatus.value = 'connected';
    emit('open');
    // 每 30 秒发 ping
    pingTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
        // 5 秒内没 pong 就断开重连
        pongTimer = setTimeout(() => {
          wsStatus.value = 'disconnected';
          ws?.close();
        }, 5000);
      }
    }, 30000);
  };

  ws.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.type === 'pong') {
      clearTimeout(pongTimer);
      return;
    }
    emit(data.type, data);
  };

  ws.onclose = () => {
    wsStatus.value = 'disconnected';
    clearInterval(pingTimer);
    clearTimeout(pongTimer);
    emit('close');
  };

  ws.onerror = () => {
    wsStatus.value = 'disconnected';
  };
};

export const disconnect = () => {
  clearInterval(pingTimer);
  clearTimeout(pongTimer);
  if (ws) {
    ws.onclose = null;
    ws.close();
  }
  ws = null;
  wsStatus.value = 'disconnected';
};

export const send = (data) => {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
};

export const on = (type, fn) => {
  if (!handlers.has(type)) handlers.set(type, []);
  handlers.get(type).push(fn);
};

const emit = (type, data) => {
  handlers.get(type)?.forEach((fn) => fn(data));
};
