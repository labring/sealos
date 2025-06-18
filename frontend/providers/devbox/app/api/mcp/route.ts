import { McpHandler } from 'sealos-mcp-sdk';

const handler = McpHandler(
  './app/api/mcp/devbox.json',
  'http://devbox-frontend.devbox-frontend.svc.cluster.local:3000'
);
export { handler as GET, handler as POST, handler as DELETE };
