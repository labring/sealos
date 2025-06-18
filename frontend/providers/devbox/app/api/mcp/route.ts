import { McpHandler } from 'sealos-mcp-sdk';
import path from 'path';

export const dynamic = 'force-dynamic';

const handler = McpHandler(
  path.resolve(__dirname, './devbox.json'),
  'http://devbox-frontend.devbox-frontend.svc.cluster.local:3000'
);

export { handler as GET, handler as POST, handler as DELETE };
