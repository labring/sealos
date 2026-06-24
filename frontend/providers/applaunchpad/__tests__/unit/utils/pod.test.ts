import { describe, expect, it } from 'vitest';
import type { V1Pod } from '@kubernetes/client-node';

import { getPodContainerName } from '@/utils/pod';

describe('getPodContainerName', () => {
  it('uses the first container from the pod spec', () => {
    const pod = {
      spec: {
        containers: [
          { name: 'real-container', image: 'nginx' },
          { name: 'sidecar', image: 'busybox' }
        ]
      },
      status: {
        containerStatuses: [{ name: 'status-container' }]
      }
    } as V1Pod;

    expect(getPodContainerName(pod)).toBe('real-container');
  });
});
