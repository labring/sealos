import { describe, expect, it } from 'vitest';
import type { V1Deployment } from '@kubernetes/client-node';

import { appStatusMap } from '@/constants/app';
import { adaptAppListItem } from '@/utils/adapt';

const createDeployment = (status: V1Deployment['status']): V1Deployment => ({
  apiVersion: 'apps/v1',
  kind: 'Deployment',
  metadata: {
    name: 'hello-world',
    uid: 'app-uid',
    creationTimestamp: new Date('2025-05-19T10:50:00Z')
  },
  spec: {
    replicas: 1,
    selector: {
      matchLabels: {
        app: 'hello-world'
      }
    },
    template: {
      metadata: {
        labels: {
          app: 'hello-world'
        }
      },
      spec: {
        containers: [
          {
            name: 'hello-world',
            image: 'nginx',
            resources: {
              limits: {
                cpu: '200m',
                memory: '256Mi'
              }
            }
          }
        ]
      }
    }
  },
  status
});

describe('adaptAppListItem', () => {
  it('maps ProgressDeadlineExceeded deployments to the error status', () => {
    const app = createDeployment({
      replicas: 1,
      conditions: [
        {
          type: 'Progressing',
          status: 'False',
          reason: 'ProgressDeadlineExceeded'
        }
      ]
    });

    expect(adaptAppListItem(app).status).toBe(appStatusMap.error);
  });
});
