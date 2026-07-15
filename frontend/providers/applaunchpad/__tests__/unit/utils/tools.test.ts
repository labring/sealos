import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';
import type { DeployKindsType } from '@/types/app';
import { patchYamlList } from '@/utils/tools';

const createWorkload = (kind: 'Deployment' | 'StatefulSet', isPrivate: boolean) => ({
  apiVersion: 'apps/v1',
  kind,
  metadata: {
    name: 'demo'
  },
  spec: {
    ...(kind === 'StatefulSet' ? { serviceName: 'demo' } : {}),
    selector: {
      matchLabels: {
        app: 'demo'
      }
    },
    template: {
      metadata: {
        labels: {
          app: 'demo'
        }
      },
      spec: {
        ...(isPrivate ? { imagePullSecrets: [{ name: 'demo' }] } : {}),
        containers: [
          {
            name: 'demo',
            image: isPrivate ? 'registry.example.com/demo:latest' : 'nginx:latest',
            volumeMounts: []
          }
        ],
        volumes: []
      }
    },
    ...(kind === 'StatefulSet' ? { volumeClaimTemplates: [] } : {})
  }
});

const secret = {
  apiVersion: 'v1',
  kind: 'Secret',
  metadata: {
    name: 'demo'
  },
  type: 'kubernetes.io/dockerconfigjson',
  data: {
    '.dockerconfigjson': 'credentials'
  }
};

describe.each(['Deployment', 'StatefulSet'] as const)(
  'patchYamlList private-to-public %s update',
  (kind) => {
    it('preserves imagePullSecrets deletion for JSON Merge Patch', () => {
      const privateWorkload = createWorkload(kind, true);
      const publicWorkload = createWorkload(kind, false);

      const actions = patchYamlList({
        parsedOldYamlList: [yaml.dump(privateWorkload), yaml.dump(secret)],
        parsedNewYamlList: [yaml.dump(publicWorkload)],
        originalYamlList: [privateWorkload, secret] as DeployKindsType[]
      });

      const workloadPatch = actions.find((item) => item.type === 'patch' && item.kind === kind);

      expect(workloadPatch).toMatchObject({
        type: 'patch',
        kind,
        value: {
          spec: {
            template: {
              spec: {
                imagePullSecrets: null
              }
            }
          }
        }
      });
      expect(actions).toContainEqual({
        type: 'delete',
        kind: 'Secret',
        name: 'demo'
      });
    });

    it('keeps imagePullSecrets for private image updates', () => {
      const currentWorkload = createWorkload(kind, true);
      const updatedWorkload = createWorkload(kind, true);
      updatedWorkload.spec.template.spec.containers[0].image = 'registry.example.com/demo:v2';

      const actions = patchYamlList({
        parsedOldYamlList: [yaml.dump(currentWorkload), yaml.dump(secret)],
        parsedNewYamlList: [yaml.dump(updatedWorkload), yaml.dump(secret)],
        originalYamlList: [currentWorkload, secret] as DeployKindsType[]
      });

      const workloadPatch = actions.find((item) => item.type === 'patch' && item.kind === kind);

      expect(workloadPatch).toMatchObject({
        type: 'patch',
        kind,
        value: {
          spec: {
            template: {
              spec: {
                imagePullSecrets: [{ name: 'demo' }]
              }
            }
          }
        }
      });
      expect(actions).not.toContainEqual({
        type: 'delete',
        kind: 'Secret',
        name: 'demo'
      });
    });
  }
);
