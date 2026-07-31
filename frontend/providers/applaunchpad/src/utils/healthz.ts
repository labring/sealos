type ConfigRecord = Record<string, unknown>;

export const HEALTHZ_SERVICE = 'applaunchpad';

export function assertReady() {
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
