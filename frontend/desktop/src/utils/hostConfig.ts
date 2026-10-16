import { useConfigStore } from '@/stores/config';
import type { HostConfig } from 'sealos-desktop-sdk';

// Stay below the SDK's 10-second reply timeout. A failed load must not be
// presented as a successful, cacheable shellCoin configuration.
async function waitForConfig() {
  if (useConfigStore.getState().isLoaded) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error('Desktop configuration is not loaded'));
    }, 8000);
    const unsubscribe = useConfigStore.subscribe((state) => {
      if (state.isLoaded) {
        clearTimeout(timer);
        unsubscribe();
        resolve();
      }
    });
  });
}

export async function getHostConfig(): Promise<
  HostConfig & { currencySymbol: NonNullable<HostConfig['currencySymbol']> }
> {
  await waitForConfig();
  const config = useConfigStore.getState();
  return {
    currencySymbol: config.layoutConfig?.currencySymbol || 'shellCoin',
    cloud: {
      domain: config.cloudConfig?.domain || '',
      port: config.cloudConfig?.port || '',
      regionUid: config.cloudConfig?.regionUID || ''
    },
    features: {
      subscription: config.layoutConfig?.common?.subscriptionEnabled || false,
      analytics: Boolean(
        config.layoutConfig?.gtmId ||
          (config.layoutConfig?.rybbitHost && config.layoutConfig?.rybbitSiteId)
      )
    }
  };
}
