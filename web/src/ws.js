import { ref } from 'vue';

const handlers = new Map();
let ws;

export const connect = () => {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}`);
  ws.onopen = () => emit('open');
  ws.onmessage = (e) => {
    const data = JSON.parse(e.data);
    emit(data.type, data);
  };
  ws.onclose = () => setTimeout(connect, 1000);
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
