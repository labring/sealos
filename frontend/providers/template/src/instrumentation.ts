export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
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
