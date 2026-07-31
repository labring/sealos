export const HEALTHZ_SERVICE = 'objectstorage';

export function assertReady() {
  readNonEmptyEnv('SEALOS_DOMAIN');
  readNonEmptyEnv('APP_LAUNCHPAD_URL');
  readNonEmptyEnv('SEALOS_ACCOUNT_SERVER');
  readNonEmptyEnv('SEALOS_ACCOUNT_SERVER_TOKEN_JWT_KEY');
  readNonEmptyEnv('SEALOS_APP_TOKEN_JWT_KEY');
}

function readNonEmptyEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`${name} is not configured`);
  }
  return value;
}
