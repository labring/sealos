export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamic imports - must be inside runtime check
    const { readFileSync } = await import('fs');
    const { readConfig, mountToGlobalThis, prettyPrintErrors } = await import(
      '@sealos/shared/server/config'
    );
    const { AppConfigSchema } = await import('./types/config');

    // Load and validate configuration
    const configPath =
      process.env.NODE_ENV === 'development' ? 'data/config.local.yaml' : '/app/data/config.yaml';

    try {
      const configText = readFileSync(configPath, 'utf-8');
      const result = await readConfig(configText, AppConfigSchema);

      if (result.error) {
        console.error('[Instrumentation Hook] Configuration validation failed:');
        console.error(prettyPrintErrors(result.error.details));
        process.exit(1);
      }

      // Mount config to globalThis
      mountToGlobalThis('__APP_CONFIG__', result.data);
      console.log('[Instrumentation Hook] Configuration loaded.');
    } catch (err) {
      // nosemgrep: unsafe-formatstring
      console.error(`[Instrumentation Hook] Failed to load config file from ${configPath}:`, err);
      process.exit(1);
    }

    // Update templates repository
    const updateRepo = (await import('./services/backend/template-repo')).updateRepo;

    console.log('[Instrumentation Hook] Trying to update templates repository.');
    await updateRepo()
      .catch((e) => {
        console.error('[Instrumentation Hook] Failed to update templates repository: ', e);
      })
      .then(() => {
        console.log('[Instrumentation Hook] Updated templates repository.');
      });
  }
}
