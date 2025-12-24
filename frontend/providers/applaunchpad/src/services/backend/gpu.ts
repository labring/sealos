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
    const alias = (JSON.parse(body?.data?.alias) || {}) as Record<string, string>;

    const parseGpuMap = JSON.parse(gpuMap) as Record<
      string,
      {
        'gpu.count': string;
        'gpu.memory': string;
        'gpu.product': string;
        'gpu.available': string;
        'gpu.used': string;
      }
    >;

    const gpuValues = Object.values(parseGpuMap).filter((item) => item['gpu.product']);

    const gpuList: GpuNodeType[] = [];

    // merge same type gpu
    gpuValues.forEach((item) => {
      const index = gpuList.findIndex((gpu) => gpu['gpu.product'] === item['gpu.product']);
      if (index > -1) {
        gpuList[index]['gpu.count'] += Number(item['gpu.count']);
        gpuList[index]['gpu.available'] += Number(item['gpu.available']);
        gpuList[index]['gpu.used'] += Number(item['gpu.used']);
      } else {
        gpuList.push({
          ['gpu.count']: +item['gpu.count'],
          ['gpu.memory']: +item['gpu.memory'],
          ['gpu.product']: item['gpu.product'],
          ['gpu.alias']: alias[item['gpu.product']] || item['gpu.product'],
          ['gpu.available']: +item['gpu.available'],
          ['gpu.used']: +item['gpu.used']
        });
      }
    });

    return gpuList;
  } catch (error) {
    return [];
  }
}
