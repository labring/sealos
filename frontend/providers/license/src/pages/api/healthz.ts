import type { NextApiRequest, NextApiResponse } from 'next';

export const HEALTHZ_SERVICE = 'license';

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
    assertReady();
  } catch (error) {
    console.error(`[healthz] ${HEALTHZ_SERVICE} is not ready`, error);
    return head
      ? res.status(503).end()
      : res.status(503).json({ status: 'error', service: HEALTHZ_SERVICE });
  }

  return head
    ? res.status(200).end()
    : res.status(200).json({
        status: 'ok',
        service: HEALTHZ_SERVICE
      });
}

export function assertReady() {
  readNonEmptyEnv('SEALOS_DOMAIN');
  readNonEmptyEnv('LICENSE_DOMAIN');
  readNonEmptyEnv('MONGODB_URI');
}

function readNonEmptyEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`${name} is not configured`);
  }
  return value;
}
