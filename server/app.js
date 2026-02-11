import { httpServer } from './http.js';
import { setupWebSocket } from './ws.js';
import { connectRemote } from './remote.js';

const PORT = process.env.LOCAL_PORT || 3000;
const REMOTE = process.env.REMOTE === 'on';

setupWebSocket(httpServer);
if (REMOTE) connectRemote();

httpServer.listen(PORT, () => {
  console.log('');
  console.log('  meeem is running');
  console.log('');
  console.log(`  > 本地: http://localhost:${PORT}`);
  if (connectRemote.remoteUrl) {
    console.log(`  > 远程: ${connectRemote.remoteUrl}`);
  }
  console.log('');
});
