import { describe, expect, it } from 'vitest';

import { templateDeployKey } from '@/constants/keys';
import { processEnvValue } from '@/utils/common';

describe('template deploy label injection', () => {
  it('adds templateDeployKey to StatefulSet and every volumeClaimTemplate', () => {
    const resource = {
      kind: 'StatefulSet',
      metadata: {
        name: 'mysql',
        labels: {
          app: 'mysql'
        }
      },
      spec: {
        volumeClaimTemplates: [
          {
            metadata: {
              name: 'data',
              labels: {
                app: 'mysql'
              }
            }
          },
          {
            metadata: {
              name: 'logs',
              labels: {
                tier: 'storage'
              }
            }
          }
        ]
      }
    };

    const result = processEnvValue(resource, 'instance-a');

    expect(result.metadata.labels).toEqual({
      app: 'mysql',
      [templateDeployKey]: 'instance-a'
    });
    expect(result.spec.volumeClaimTemplates[0].metadata.labels).toEqual({
      app: 'mysql',
      [templateDeployKey]: 'instance-a'
    });
    expect(result.spec.volumeClaimTemplates[1].metadata.labels).toEqual({
      tier: 'storage',
      [templateDeployKey]: 'instance-a'
    });
  });

  it('creates missing metadata and labels on StatefulSet volumeClaimTemplates', () => {
    const result = processEnvValue(
      {
        kind: 'StatefulSet',
        spec: {
          volumeClaimTemplates: [
            {
              metadata: {
                name: 'data'
              }
            },
            {
              spec: {}
            }
          ]
        }
      },
      'instance-a'
    );

    expect(result.metadata.labels[templateDeployKey]).toBe('instance-a');
    expect(result.spec.volumeClaimTemplates[0].metadata.labels[templateDeployKey]).toBe(
      'instance-a'
    );
    expect(result.spec.volumeClaimTemplates[1].metadata.labels[templateDeployKey]).toBe(
      'instance-a'
    );
  });

  it('does not add volumeClaimTemplates or retention policy to non-StatefulSet resources', () => {
    const result = processEnvValue(
      {
        kind: 'Deployment',
        metadata: {
          labels: {
            app: 'api'
          }
        },
        spec: {}
      },
      'instance-a'
    );

    expect(result.metadata.labels).toEqual({
      app: 'api',
      [templateDeployKey]: 'instance-a'
    });
    expect(result.spec.volumeClaimTemplates).toBeUndefined();
    expect(result.spec.persistentVolumeClaimRetentionPolicy).toBeUndefined();
  });

  it('does not inject StatefulSet persistentVolumeClaimRetentionPolicy', () => {
    const result = processEnvValue(
      {
        kind: 'StatefulSet',
        spec: {
          volumeClaimTemplates: []
        }
      },
      'instance-a'
    );

    expect(result.spec.persistentVolumeClaimRetentionPolicy).toBeUndefined();
  });
});
