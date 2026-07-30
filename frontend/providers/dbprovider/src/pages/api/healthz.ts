import type { NextApiRequest, NextApiResponse } from 'next';

export const HEALTHZ_SERVICE = 'dbprovider';

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
  readNonEmptyEnv('DESKTOP_DOMAIN');
  readNonEmptyEnv('BILLING_URL');
  readOptionalBooleanEnv('BACKUP_ENABLED');
  readOptionalBooleanEnv('GUIDE_ENABLED');
  readOptionalBooleanEnv('MANAGED_DB_ENABLED');
  readOptionalNumberEnv('STORAGE_MAX_SIZE');
}

function readNonEmptyEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function readOptionalBooleanEnv(name: string) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    return;
  }
  if (value !== 'true' && value !== 'false') {
    throw new Error(`${name} is invalid`);
  }
}

function readOptionalNumberEnv(name: string) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    return;
  }
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    throw new Error(`${name} is invalid`);
  }
}
