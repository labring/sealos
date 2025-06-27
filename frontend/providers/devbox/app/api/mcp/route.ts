import { McpHandler } from 'sealos-mcp-sdk';
import path from 'path';

export const dynamic = 'force-dynamic';


const region = process.env.FORCED_LANGUAGE || 'en';
const fileName = region === "en" ? "devbox.json" : "devbox-zh.json";

const handler = McpHandler(
  path.join(process.cwd(), 'public', fileName),
  'http://devbox-frontend.devbox-frontend.svc.cluster.local:3000'
);

export { handler as GET, handler as POST, handler as DELETE };
