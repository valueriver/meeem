import { httpServer } from './http.js';
import { setupWebSocket } from './ws.js';

const PORT = process.env.PORT || 3000;

setupWebSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
