export const HEALTHZ_SERVICE = 'costcenter';

export function assertReady() {
  // Instrumentation validates and installs the configuration before serving requests.
  // Do not call Config(): it exits the process when initialization is incomplete.
  if (!globalThis.__APP_CONFIG__) {
    throw new Error('Application configuration is not initialized');
  }
}
