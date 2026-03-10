import { McpHandler } from 'sealos-mcp-sdk';
import path from 'path';
import { Config } from '@/src/config';

export const dynamic = 'force-dynamic';

const region = Config().devbox.mcp.forcedLanguage || 'en';
const fileName = region === 'en' ? 'devbox.json' : 'devbox-zh.json';

const handler = McpHandler(
  path.join(process.cwd(), 'public', fileName),
  'http://devbox-frontend.devbox-frontend.svc.cluster.local:3000'
);

export { handler as GET, handler as POST, handler as DELETE };
