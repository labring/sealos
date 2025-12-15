import { KBDevboxTypeV2 } from '@/types/k8s';

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForDevboxStatus(
  k8sCustomObjects: any,
  namespace: string,
  devboxName: string,
  maxRetries = 10,
  interval = 100
): Promise<KBDevboxTypeV2> {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const { body: devboxBody } = (await k8sCustomObjects.getNamespacedCustomObject(
        'devbox.sealos.io',
        'v1alpha1',
        namespace,
        'devboxes',
        devboxName
      )) as { body: KBDevboxTypeV2 };
      if (devboxBody.status) {
        return devboxBody;
      }
    } catch (error) {
      console.warn('Failed to get devbox status (attempt', retries + 1, '/', maxRetries, '):', error);
    }
    await sleep(interval);
    retries++;
  }
  throw new Error('Timeout waiting for devbox status');
}

export async function waitForDevboxReady(
  k8sCustomObjects: any,
  k8sCore: any,
  namespace: string,
  devboxName: string,
  maxRetries = 60,
  interval = 1000
): Promise<boolean> {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const { body: devboxBody } = await k8sCustomObjects.getNamespacedCustomObject(
        'devbox.sealos.io',
        'v1alpha1',
        namespace,
        'devboxes',
        devboxName
      ) as { body: KBDevboxTypeV2 };

      if (devboxBody.status?.phase === 'Running') {
        try {
          const podsResponse = await k8sCore.listNamespacedPod(
            namespace,
            undefined,
            undefined,
            undefined,
            undefined,
            `app.kubernetes.io/name=${devboxName}`
          );

          const pods = podsResponse.body.items;
          const readyPod = pods.find((pod: any) =>
            pod.status?.phase === 'Running' &&
            pod.status?.conditions?.some((condition: any) =>
              condition.type === 'Ready' && condition.status === 'True'
            )
          );

          if (readyPod) {
            return true;
          }
        } catch (podError) {
          console.warn('Failed to check pod status (attempt', retries + 1, '/', maxRetries, '):', podError);
        }
      }
    } catch (error) {
      console.warn('Failed to check devbox ready status (attempt', retries + 1, '/', maxRetries, '):', error);
    }

    await sleep(interval);
    retries++;
  }

  return false;
}

export function escapeShellArg(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

export const DEVBOX_IMPORT_CONSTANTS = {
  MAX_FILE_SIZE: 100 * 1024 * 1024,
  DEFAULT_CPU: 4000,
  DEFAULT_MEMORY: 8192,
  WAIT_FOR_STATUS_RETRIES: 10,
  WAIT_FOR_STATUS_INTERVAL: 100,
  WAIT_FOR_READY_RETRIES: 60,
  WAIT_FOR_READY_INTERVAL: 1000
} as const;
