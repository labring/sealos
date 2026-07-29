import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    if (req.method === 'HEAD') {
      return handleHealthz(res, true);
    }

    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  return handleHealthz(res);
}

function handleHealthz(res: NextApiResponse, head = false) {
  try {
    readNonEmptyEnv('TTYD_IMAGE');
    readNonEmptyEnv('SITE');
    readNonEmptyEnv('KEEPALIVED');
  } catch (error) {
    console.error('[healthz] terminal is not ready', error);
    return head
      ? res.status(503).end()
      : res.status(503).json({ status: 'error', service: 'terminal' });
  }

  return head
    ? res.status(200).end()
    : res.status(200).json({
        status: 'ok',
        service: 'terminal'
      });
}

function readNonEmptyEnv(name: string, value = process.env[name]): string {
  if (!value || value.trim() === '') {
    throw new Error(`${name} is not configured`);
  }
  return value;
}
