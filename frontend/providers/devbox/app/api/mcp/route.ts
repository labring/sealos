import { McpHandler } from 'sealos-mcp-sdk';
import path from 'path';
import { Config } from '@/config';

export const dynamic = 'force-dynamic';

let cachedHandler: ReturnType<typeof McpHandler> | null = null;

function getHandler() {
  if (cachedHandler) return cachedHandler;

  const region = Config().devbox.mcp.forcedLanguage || 'en';
  const fileName = region === 'en' ? 'devbox.json' : 'devbox-zh.json';
  cachedHandler = McpHandler(
    path.join(process.cwd(), 'public', fileName),
    'http://devbox-frontend.devbox-frontend.svc.cluster.local:3000'
  );
  return cachedHandler;
}

export async function GET(request: Request) {
  return getHandler()(request);
}

export async function POST(request: Request) {
  return getHandler()(request);
}

export async function DELETE(request: Request) {
  return getHandler()(request);
}
