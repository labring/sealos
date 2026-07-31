export const HEALTHZ_SERVICE = 'license';

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
