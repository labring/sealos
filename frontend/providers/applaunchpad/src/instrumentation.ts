export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { readFileSync } = await import('fs');
    const { readConfig, mountToGlobalThis, prettyPrintErrors } = await import(
      '@sealos/shared/server/config'
    );
    const { AppConfigSchema } = await import('./types/config');

    const configPath =
      process.env.NODE_ENV === 'development' ? 'data/config.local.yaml' : '/app/data/config.yaml';

    try {
      const configText = readFileSync(configPath, 'utf-8');
      const result = await readConfig(configText, AppConfigSchema as any);

      if (result.error) {
        console.error('[Instrumentation Hook] Configuration validation failed:');
        console.error(prettyPrintErrors(result.error.details));
        process.exit(1);
      }

      mountToGlobalThis('__APP_CONFIG__', result.data);
      console.log('[Instrumentation Hook] Configuration loaded.');

      // GPU node detection
      try {
        const { getGpuNode } = await import('./services/backend/gpu');
        const gpuNodes = await getGpuNode();
        console.log(gpuNodes, 'gpuNodes');
      } catch (gpuErr) {
        console.warn('[Instrumentation Hook] GPU node detection failed (non-fatal):', gpuErr);
      }
    } catch (err) {
      // nosemgrep: unsafe-formatstring
      console.error(`[Instrumentation Hook] Failed to load config file from ${configPath}:`, err);
      process.exit(1);
    }
  }
}
