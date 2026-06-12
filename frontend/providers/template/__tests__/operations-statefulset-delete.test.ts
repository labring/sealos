import { describe, expect, it, vi } from 'vitest';

import { deleteStatefulSet } from '@/services/backend/operations';

describe('deleteStatefulSet', () => {
  it('uses foreground propagation before PVC cleanup runs', async () => {
    const api = {
      deleteNamespacedStatefulSet: vi.fn().mockResolvedValue({})
    };

    await deleteStatefulSet(api as any, 'ns-test', 'mysql');

    expect(api.deleteNamespacedStatefulSet).toHaveBeenCalledWith(
      'mysql',
      'ns-test',
      undefined,
      undefined,
      undefined,
      undefined,
      'Foreground',
      { propagationPolicy: 'Foreground' }
    );
  });
});
