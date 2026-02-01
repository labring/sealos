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

    // 解析新的 alias ConfigMap 格式，包含 icon, name, resource 等字段
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
        'gpu.ref': string; // 新增：关联到 alias 的 key
      }
    >;

    const gpuValues = Object.values(parseGpuMap).filter((item) => item['gpu.product']);

    const gpuList: GpuNodeType[] = [];

    // merge same type gpu
    gpuValues.forEach((item) => {
      const index = gpuList.findIndex((gpu) => gpu['gpu.product'] === item['gpu.product']);
      // 使用 gpu.ref 从 alias 中获取配置
      const config = aliasConfig[item['gpu.ref']];

      if (index > -1) {
        gpuList[index]['gpu.count'] += Number(item['gpu.count']);
        gpuList[index]['gpu.available'] += Number(item['gpu.available']);
        gpuList[index]['gpu.used'] += Number(item['gpu.used']);
      } else {
        gpuList.push({
          ['gpu.count']: +item['gpu.count'],
          ['gpu.memory']: +item['gpu.memory'],
          ['gpu.product']: item['gpu.product'], // 完整的产品名称
          ['gpu.alias']: config?.default || item['gpu.product'],
          ['gpu.available']: +item['gpu.available'],
          ['gpu.used']: +item['gpu.used'],
          ['gpu.ref']: item['gpu.ref'], // 保存 ref 用于价格匹配
          // 新增字段
          icon: config?.icon,
          name: config?.name,
          resource: config?.resource
        });
      }
    });

    return gpuList;
  } catch (error) {
    return [];
  }
}
