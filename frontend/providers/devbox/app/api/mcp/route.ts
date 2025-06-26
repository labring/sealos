import { McpHandler } from 'sealos-mcp-sdk';
import path from 'path';

export const dynamic = 'force-dynamic';


const region = process.env.REGION || 'EN';
const fileName = region === "ZH" ? "devbox-zh.json" : "devbox.json";

const handler = McpHandler(
  path.join(process.cwd(), 'public', fileName),
  'http://devbox-frontend.devbox-frontend.svc.cluster.local:3000'
);

export { handler as GET, handler as POST, handler as DELETE };
