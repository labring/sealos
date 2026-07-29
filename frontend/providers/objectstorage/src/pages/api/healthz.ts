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
    readNonEmptyEnv('SEALOS_DOMAIN');
    readNonEmptyEnv('APP_LAUNCHPAD_URL');
    readNonEmptyEnv('SEALOS_ACCOUNT_SERVER');
    readNonEmptyEnv('SEALOS_ACCOUNT_SERVER_TOKEN_JWT_KEY');
    readNonEmptyEnv('SEALOS_APP_TOKEN_JWT_KEY');
  } catch (error) {
    console.error('[healthz] objectstorage is not ready', error);
    return head
      ? res.status(503).end()
      : res.status(503).json({ status: 'error', service: 'objectstorage' });
  }

  return head
    ? res.status(200).end()
    : res.status(200).json({
        status: 'ok',
        service: 'objectstorage'
      });
}

function readNonEmptyEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`${name} is not configured`);
  }
  return value;
}
