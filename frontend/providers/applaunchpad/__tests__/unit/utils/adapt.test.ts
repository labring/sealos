import { describe, expect, it } from 'vitest';
import type { V1Deployment } from '@kubernetes/client-node';

import { appStatusMap } from '@/constants/app';
import { adaptAppListItem, normalizeCustomDomainHost } from '@/utils/adapt';

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

    expect(adaptAppListItem(app as Parameters<typeof adaptAppListItem>[0]).status).toBe(
      appStatusMap.error
    );
  });
});

describe('normalizeCustomDomainHost', () => {
  it('strips scheme and path from custom domains', () => {
    expect(normalizeCustomDomainHost('https://foo.example.com/app')).toBe('foo.example.com');
    expect(normalizeCustomDomainHost('http://Bar.Example.com')).toBe('bar.example.com');
    expect(normalizeCustomDomainHost('baz.example.com')).toBe('baz.example.com');
  });
});
