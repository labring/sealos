import { describe, expect, it } from 'vitest';
import { pauseKey } from '@/constants/keys';
import { StatusEnum } from '@/constants/status';
import { adaptAppListItem } from '@/utils/adapt';

const app = (annotations: Record<string, string> = {}) =>
  ({
    metadata: {
      name: 'fastgpt',
      annotations
    },
    spec: {
      template: {
        spec: {
          containers: [{ resources: { limits: { cpu: '500m', memory: '1Gi' } } }]
        }
      }
    },
    status: {
      replicas: 0,
      readyReplicas: 0
    }
  }) as any;

describe('adaptAppListItem', () => {
  it('reports a paused application as stopped even when its replica counts are both zero', () => {
    const item = adaptAppListItem(app({ [pauseKey]: '{"target":"cpu","value":"50"}' }));

    expect(item.isPause).toBe(true);
    expect(item.status.value).toBe(StatusEnum.Stopped);
  });

  it('keeps a non-paused application with matching replica counts running', () => {
    const item = adaptAppListItem(app());

    expect(item.isPause).toBe(false);
    expect(item.status.value).toBe(StatusEnum.Running);
  });
});
