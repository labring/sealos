export const HEALTHZ_SERVICE = 'dbprovider';

export function assertReady() {
  readNonEmptyEnv('SEALOS_DOMAIN');
  readNonEmptyEnv('DESKTOP_DOMAIN');
  readNonEmptyEnv('BILLING_URL');
  readOptionalBooleanEnv('BACKUP_ENABLED');
  readOptionalBooleanEnv('LOG_ENABLED');
  readOptionalBooleanEnv('DATA_IMPORT_ENABLED');
  readOptionalBooleanEnv('GUIDE_ENABLED');
  readOptionalBooleanEnv('KAFKA_ENABLED');
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
