import { readFileSync } from 'fs';
import yaml from 'js-yaml';
type ConfigRecord = Record<string, unknown>;

export const HEALTHZ_SERVICE = 'desktop';

export function assertReady() {
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
