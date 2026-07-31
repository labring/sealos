export const HEALTHZ_SERVICE = 'terminal';

export function assertReady() {
  readNonEmptyEnv('TTYD_IMAGE');
  readNonEmptyEnv('SITE');
  readNonEmptyEnv('KEEPALIVED');
}

function readNonEmptyEnv(name: string, value = process.env[name]): string {
  if (!value || value.trim() === '') {
    throw new Error(`${name} is not configured`);
  }
  return value;
}
