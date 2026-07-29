import type { NextApiRequest, NextApiResponse } from 'next';

type ConfigRecord = Record<string, unknown>;

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
    console.error('[healthz] applaunchpad is not ready', error);
    return head
      ? res.status(503).end()
      : res.status(503).json({ status: 'error', service: 'applaunchpad' });
  }

  return head
    ? res.status(200).end()
    : res.status(200).json({
        status: 'ok',
        service: 'applaunchpad'
      });
}

function assertReady() {
  if (!isRecord(global.AppConfig)) {
    throw new Error('AppConfig is not loaded');
  }

  const cloud = readRecord(global.AppConfig, 'cloud');
  const launchpad = readRecord(global.AppConfig, 'launchpad');
  const infrastructure = readRecord(launchpad, 'infrastructure');
  const components = readRecord(launchpad, 'components');
  const billing = readRecord(components, 'billing');

  readNonEmptyString(cloud, 'domain');
  readNonEmptyString(infrastructure, 'provider');
  readNonEmptyString(billing, 'url');
}

function readRecord(record: ConfigRecord, key: string): ConfigRecord {
  const value = record[key];
  if (!isRecord(value)) {
    throw new Error(`${key} is not configured`);
  }
  return value;
}

function readNonEmptyString(record: ConfigRecord, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${key} is not configured`);
  }
  return value;
}

function isRecord(value: unknown): value is ConfigRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
