import { readFileSync } from 'fs';
import yaml from 'js-yaml';
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
    console.error('[healthz] desktop is not ready', error);
    return head
      ? res.status(503).end()
      : res.status(503).json({ status: 'error', service: 'desktop' });
  }

  return head
    ? res.status(200).end()
    : res.status(200).json({
        status: 'ok',
        service: 'desktop'
      });
}

function assertReady() {
  const config = loadConfig();
  const cloud = readRecord(config, 'cloud');
  const database = readRecord(config, 'database');
  const desktop = readRecord(config, 'desktop');
  const auth = readRecord(desktop, 'auth');
  const jwt = readRecord(auth, 'jwt');

  readNonEmptyString(cloud, 'domain');
  readNonEmptyString(cloud, 'regionUID');
  readNonEmptyString(database, 'globalCockroachdbURI');
  readNonEmptyString(database, 'regionalCockroachdbURI');
  readNonEmptyString(jwt, 'internal');
  readNonEmptyString(jwt, 'regional');
  readNonEmptyString(jwt, 'global');
}

function loadConfig(): ConfigRecord {
  const filename =
    process.env.NODE_ENV === 'development'
      ? process.env.CONFIG_PATH || 'data/config.local.yaml'
      : '/app/data/config.yaml';
  const config = yaml.load(readFileSync(filename, 'utf-8'));

  if (!isRecord(config)) {
    throw new Error(`${filename} is not a YAML object`);
  }

  return config;
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
