import { NextRequest } from 'next/server';

import { jsonRes } from '@/services/backend/response';
import { userPriceType } from '@/types/user';
import type { GpuInventoryModel, GpuInventorySpec, GpuPodConfig } from '@/types/gpu';

export const dynamic = 'force-dynamic';

type ResourcePriceType = {
  data: {
    properties: {
      name: string;
      unit_price: number;
      unit: string;
    }[];
  };
};

type ResourceType =
  | 'cpu'
  | 'memory'
  | 'storage'
  | 'disk'
  | 'mongodb'
  | 'minio'
  | 'infra-cpu'
  | 'infra-memory'
  | 'infra-disk'
  | 'services.nodeports';

const PRICE_SCALE = 1000000;
const DEFAULT_GPU_INVENTORY_URL = 'http://node.node-system.svc:8090/api/v1/gpu/inventory';
const GPU_TYPE_ANNOTATION_KEY = 'nvidia.com/use-gputype';

const valuationMap: Record<string, number> = {
  cpu: 1000,
  memory: 1024,
  storage: 1024,
  gpu: 1000,
  ['services.nodeports']: 1
};

const decodeHeaderValue = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const parseBearerHeader = (value: string, requirePrefix = false) => {
  const decoded = decodeHeaderValue(value).trim();
  if (/^bearer\s+/i.test(decoded)) {
    return decoded.replace(/^bearer\s+/i, '').trim();
  }
  return requirePrefix ? '' : decoded;
};

const normalizeEndpoint = (url: string) => {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (/\/api\/v1\/gpu\/inventory$/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}/api/v1/gpu/inventory`;
};

const toStringRecord = (value: unknown): Record<string, string> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([key]) => Boolean(key))
    .map(([key, raw]) => [key, raw == null ? '' : String(raw)] as const);
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
};

const normalizePodConfig = (value: unknown): GpuPodConfig | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const podConfig = value as Record<string, unknown>;
  const annotations = toStringRecord(podConfig.annotations);
  const limits = toStringRecord((podConfig.resources as any)?.limits);

  if (!annotations && !limits) return undefined;
  return {
    ...(annotations ? { annotations } : {}),
    ...(limits ? { resources: { limits } } : {})
  };
};

const normalizeSpec = (value: unknown): GpuInventorySpec | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;

  const typeRaw =
    (typeof item.type === 'string' ? item.type : '') ||
    (typeof item.specType === 'string' ? item.specType : '');
  const type = typeRaw.trim();
  const memory =
    (typeof item.memory === 'string' ? item.memory : '') ||
    (typeof item.specMemory === 'string' ? item.specMemory : '');
  const valueRaw =
    (typeof item.value === 'string' ? item.value : '') ||
    (typeof item.specValue === 'string' ? item.specValue : '');
  const specValue = valueRaw || (type.toUpperCase() === 'GPU' ? 'full' : '');
  const stockRaw = item.stock ?? item.available ?? item.count;
  const stock = Number(stockRaw);
  const podConfig = normalizePodConfig(item.podConfig);

  if (!type || !memory || !specValue) return null;
  return {
    type,
    memory,
    value: specValue,
    stock: Number.isFinite(stock) && stock > 0 ? stock : 0,
    ...(podConfig ? { podConfig } : {})
  };
};

const normalizeModel = (value: unknown): GpuInventoryModel | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const model = typeof item.model === 'string' ? item.model : '';
  if (!model) return null;

  const icon = typeof item.icon === 'string' ? item.icon : undefined;
  const displayNameRaw = item.displayName as Record<string, unknown> | undefined;
  const displayName =
    displayNameRaw && typeof displayNameRaw === 'object'
      ? {
          zh: typeof displayNameRaw.zh === 'string' ? displayNameRaw.zh : undefined,
          en: typeof displayNameRaw.en === 'string' ? displayNameRaw.en : undefined
        }
      : undefined;
  const specs = Array.isArray(item.specs)
    ? item.specs.map(normalizeSpec).filter((spec): spec is GpuInventorySpec => Boolean(spec))
    : [];

  if (specs.length === 0) return null;

  return {
    model,
    ...(displayName?.zh || displayName?.en ? { displayName } : {}),
    ...(icon ? { icon } : {}),
    specs
  };
};

export async function GET(req: NextRequest) {
  try {
    const { ACCOUNT_URL, SEALOS_DOMAIN, GPU_ENABLE, GPU_INVENTORY_API_BASE_URL } = process.env;
    const baseUrl = ACCOUNT_URL ? ACCOUNT_URL : `https://account-api.${SEALOS_DOMAIN}`;
    const gpuFeatureEnabled = GPU_ENABLE === 'true';
    const token =
      parseBearerHeader(req.headers.get('Authorization-Bearer') || '') ||
      parseBearerHeader(req.headers.get('Authorization') || '', true);

    const getResourcePrice = async () => {
      try {
        const res = await fetch(`${baseUrl}/account/v1alpha1/properties`, {
          method: 'POST'
        });

        const data: ResourcePriceType = await res.clone().json();
        return data.data.properties || [];
      } catch (error) {
        console.log(error);
        return [] as ResourcePriceType['data']['properties'];
      }
    };

    const getGpuInventory = async () => {
      if (!gpuFeatureEnabled || !token) return [] as GpuInventoryModel[];
      try {
        const endpoint = normalizeEndpoint(GPU_INVENTORY_API_BASE_URL || DEFAULT_GPU_INVENTORY_URL);
        const res = await fetch(endpoint, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          },
          cache: 'no-store'
        });
        if (!res.ok) {
          return [] as GpuInventoryModel[];
        }
        const data = (await res.json()) as Record<string, unknown>;
        if (!Array.isArray(data.data)) return [] as GpuInventoryModel[];
        return data.data
          .map(normalizeModel)
          .filter((item): item is GpuInventoryModel => Boolean(item));
      } catch (error) {
        console.log('getGpuInventory error', error);
        return [] as GpuInventoryModel[];
      }
    };

    const [priceResponse, gpuInventory] = await Promise.all([
      getResourcePrice() as Promise<ResourcePriceType['data']['properties']>,
      getGpuInventory()
    ]);

    const data: userPriceType = {
      cpu: countSourcePrice(priceResponse, 'cpu'),
      memory: countSourcePrice(priceResponse, 'memory'),
      storage: countSourcePrice(priceResponse, 'storage'),
      nodeports: countSourcePrice(priceResponse, 'services.nodeports'),
      gpu: gpuFeatureEnabled ? countGpuSource(priceResponse, gpuInventory) : undefined
    };

    return jsonRes({
      data
    });
  } catch (error) {
    return jsonRes({ code: 500, message: 'get price error' });
  }
}

const normalizeGpuKey = (value?: string) =>
  value ? value.trim().replace(/\s+/g, '-').toLowerCase() : '';

const parseGpuMemoryGi = (memory?: string) => {
  if (!memory) return 0;
  const matched = memory.match(/(\d+(\.\d+)?)/);
  if (!matched) return 0;
  const value = Number(matched[1]);
  return Number.isFinite(value) ? value : 0;
};

function countGpuSource(
  rawData: ResourcePriceType['data']['properties'],
  gpuInventory: GpuInventoryModel[]
) {
  const gpuList: userPriceType['gpu'] = [];
  const gpuPriceMap = rawData
    .filter((item) => item.name.startsWith('gpu'))
    .map((item) => ({
      ...item,
      normalizedType: normalizeGpuKey(item.name.replace('gpu-', ''))
    }));

  gpuInventory.forEach((modelItem) => {
    modelItem.specs.forEach((spec) => {
      const annotationType =
        spec.podConfig?.annotations?.[GPU_TYPE_ANNOTATION_KEY] || modelItem.model;
      const matchKeys = [
        modelItem.model,
        modelItem.displayName?.zh,
        modelItem.displayName?.en,
        annotationType
      ]
        .map((key) => normalizeGpuKey(key))
        .filter(Boolean);
      const matchedPrice = gpuPriceMap.find((item) => matchKeys.includes(item.normalizedType));
      const stock = Math.max(Number(spec.stock) || 0, 0);

      gpuList.push({
        model: modelItem.model,
        displayName: modelItem.displayName,
        specType: spec.type,
        specValue: spec.value,
        specMemory: spec.memory,
        stock,
        podConfig: spec.podConfig,
        annotationType,
        price: matchedPrice ? (matchedPrice.unit_price * valuationMap.gpu) / PRICE_SCALE : 0,
        available: stock,
        count: stock,
        vm: parseGpuMemoryGi(spec.memory),
        icon: modelItem.icon,
        name: modelItem.displayName
      });
    });
  });

  return gpuList.length === 0 ? undefined : gpuList;
}

function countSourcePrice(rawData: ResourcePriceType['data']['properties'], type: ResourceType) {
  const rawPrice = rawData.find((item) => item.name === type)?.unit_price || 1;
  const sourceScale = rawPrice * (valuationMap[type] || 1);
  const unitScale = sourceScale / PRICE_SCALE;
  return unitScale;
}
