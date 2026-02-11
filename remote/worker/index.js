// Cloudflare Worker — WSS 中转 + 静态页面托管

export default {
  async fetch(request, env) {
    if (request.headers.get('Upgrade') === 'websocket') {
      const url = new URL(request.url);
      const token = url.searchParams.get('token') || request.headers.get('x-token');

      if (!token) {
        return new Response('缺少 token', { status: 401 });
      }

      const id = env.RELAY.idFromName(token);
      const stub = env.RELAY.get(id);
      return stub.fetch(request);
    }
    return new Response('Not Found', { status: 404 });
  }
};

// Durable Object：维护 agent/phone 配对
export class Relay {
  constructor(state) {
    this.agent = null;
    this.phones = new Set();
  }

  async fetch(request) {
    const role = request.headers.get('x-token') ? 'agent' : 'phone';

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    server.accept();

    if (role === 'agent') {
      if (this.agent) {
        this.agent.close(1000, 'replaced');
      }
      this.agent = server;

      server.addEventListener('message', (e) => {
        for (const phone of this.phones) {
          try { phone.send(e.data); } catch {}
        }
      });

      server.addEventListener('close', () => {
        if (this.agent === server) this.agent = null;
      });

    } else {
      this.phones.add(server);

      server.addEventListener('message', (e) => {
        if (this.agent) {
          try { this.agent.send(e.data); } catch {}
        }
      });

      server.addEventListener('close', () => {
        this.phones.delete(server);
      });
    }

    return new Response(null, { status: 101, webSocket: client });
  }
}
