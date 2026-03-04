import { CoreV1Api } from '@kubernetes/client-node';
import { K8sApiDefault } from './kubernetes';
import { GpuNodeType } from '@/types/app';

/* get gpu nodes by configmap. */
export async function getGpuNode() {
  const gpuCrName = 'node-gpu-info';
  const gpuCrNS = 'node-system';

  try {
    const kc = K8sApiDefault();
    const { body } = await kc.makeApiClient(CoreV1Api).readNamespacedConfigMap(gpuCrName, gpuCrNS);
    const gpuMap = body?.data?.gpu;
    if (!gpuMap || !body?.data?.alias) return [];

    const aliasConfig = (JSON.parse(body?.data?.alias) || {}) as Record<
      string,
      {
        default: string;
        icon?: string;
        name?: {
          zh: string;
          en: string;
        };
        resource?: {
          card: string;
        };
      }
    >;

    const parseGpuMap = JSON.parse(gpuMap) as Record<
      string,
      {
        'gpu.count': string;
        'gpu.memory': string;
        'gpu.product': string;
        'gpu.available': string;
        'gpu.used': string;
        'gpu.ref': string;
      }
    >;

    const gpuEntries = Object.entries(parseGpuMap).filter(([_, item]) => item['gpu.product']);

    const gpuList: GpuNodeType[] = gpuEntries.map(([nodeKey, item]) => {
      const config = aliasConfig[item['gpu.ref']];
      return {
        ['gpu.count']: +item['gpu.count'],
        ['gpu.memory']: +item['gpu.memory'],
        ['gpu.product']: item['gpu.product'],
        ['gpu.alias']: config?.default || item['gpu.product'],
        ['gpu.available']: +item['gpu.available'],
        ['gpu.used']: +item['gpu.used'],
        ['gpu.ref']: item['gpu.ref'],
        icon: config?.icon,
        name: config?.name,
        resource: config?.resource,
        nodeName: nodeKey
      };
    });

    return gpuList;
  } catch (error) {
    return [];
  }
}
