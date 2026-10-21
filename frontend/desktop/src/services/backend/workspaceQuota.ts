import type { V1ResourceQuota } from '@kubernetes/client-node';
import Decimal from 'decimal.js';

type QuotaType = 'cpu' | 'memory' | 'storage' | 'pod' | 'nodeport';

const resources: { type: QuotaType; keys: string[] }[] = [
  { type: 'cpu', keys: ['limits.cpu', 'requests.cpu', 'cpu'] },
  { type: 'memory', keys: ['limits.memory', 'requests.memory', 'memory'] },
  { type: 'storage', keys: ['requests.storage'] },
  { type: 'pod', keys: ['pods', 'count/pods'] },
  { type: 'nodeport', keys: ['services.nodeports'] }
];

// Kubernetes Quantity supports decimal SI, binary SI and decimal exponents.
function parseQuantity(value: string): Decimal {
  const match = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))([eE][+-]?\d+|[KMGTPE]i|[numkKMGTPE])?$/.exec(
    value
  );
  if (!match) throw new Error('Invalid resource quantity');
  const [, amount, suffix = ''] = match;
  const decimalPowers: Record<string, number> = {
    n: -9,
    u: -6,
    m: -3,
    '': 0,
    k: 3,
    K: 3,
    M: 6,
    G: 9,
    T: 12,
    P: 15,
    E: 18
  };
  const multiplier = suffix.endsWith('i')
    ? new Decimal(1024).pow('KMGTPE'.indexOf(suffix[0]) + 1)
    : new Decimal(10).pow(
        /^[eE][+-]?\d+$/.test(suffix) ? Number(suffix.slice(1)) : decimalPowers[suffix]
      );
  const quantity = new Decimal(amount).mul(multiplier);
  if (!quantity.isFinite() || quantity.isNegative()) throw new Error('Invalid resource quantity');
  return quantity;
}

/** Native desktop contract: CPU in millicores, memory/storage in Mi, counts unchanged. */
export function normalizeWorkspaceQuota(quota: V1ResourceQuota) {
  const hard = quota.status?.hard;
  if (!hard) throw new Error('Resource quota status unavailable');
  const used = quota.status?.used || {};
  const items: { type: QuotaType; used: number; limit: number }[] = [];

  for (const { type, keys } of resources) {
    const key = keys.find((key) => hard[key] !== undefined);
    if (!key) continue;
    const scale = type === 'cpu' ? 1000 : type === 'memory' || type === 'storage' ? 1 / 1048576 : 1;
    const limit = parseQuantity(hard[key]).mul(scale).toNumber();
    const usage = parseQuantity(used[key] ?? '0')
      .mul(scale)
      .toNumber();
    if (!Number.isFinite(limit) || !Number.isFinite(usage)) {
      throw new Error('Resource quantity out of range');
    }
    items.push({ type, used: usage, limit });
  }
  return items;
}
