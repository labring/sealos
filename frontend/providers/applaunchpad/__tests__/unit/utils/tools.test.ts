import { describe, expect, it } from 'vitest';
import yaml from 'js-yaml';

import { patchYamlList } from '@/utils/tools';

const createFormDeployment = (image: string) => ({
  apiVersion: 'apps/v1',
  kind: 'Deployment',
  metadata: {
    name: 'litellm-demo'
  },
  spec: {
    replicas: 1,
    selector: {
      matchLabels: {
        app: 'litellm-demo'
      }
    },
    template: {
      metadata: {
        labels: {
          app: 'litellm-demo'
        }
      },
      spec: {
        containers: [
          {
            name: 'litellm-demo',
            image,
            volumeMounts: []
          }
        ],
        volumes: []
      }
    }
  }
});

describe('patchYamlList', () => {
  it('preserves volumes referenced only by init containers from the source deployment', () => {
    const originalDeployment = {
      ...createFormDeployment('litellm/litellm-database:v1.88.1'),
      metadata: {
        name: 'litellm-demo',
        namespace: 'ns-demo'
      },
      spec: {
        ...createFormDeployment('litellm/litellm-database:v1.88.1').spec,
        template: {
          ...createFormDeployment('litellm/litellm-database:v1.88.1').spec.template,
          spec: {
            ...createFormDeployment('litellm/litellm-database:v1.88.1').spec.template.spec,
            initContainers: [
              {
                name: 'init-s3-config',
                image: 'minio/mc:latest',
                volumeMounts: [
                  {
                    name: 'litellm-demo-cm',
                    mountPath: '/tmp/init-s3-config.sh',
                    subPath: 'init-s3-config.sh'
                  }
                ]
              }
            ],
            volumes: [
              {
                name: 'litellm-demo-cm',
                configMap: {
                  name: 'litellm-demo'
                }
              }
            ]
          }
        }
      }
    };

    const actions = patchYamlList({
      parsedOldYamlList: [yaml.dump(createFormDeployment('litellm/litellm-database:v1.88.1'))],
      parsedNewYamlList: [yaml.dump(createFormDeployment('litellm/litellm-database:v1.88.2'))],
      originalYamlList: [originalDeployment as any]
    });

    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      type: 'patch',
      kind: 'Deployment'
    });

    const patchedDeployment = actions[0].type === 'patch' ? actions[0].value : undefined;

    expect(patchedDeployment?.spec.template.spec.initContainers[0].volumeMounts[0].name).toBe(
      'litellm-demo-cm'
    );
    expect(patchedDeployment?.spec.template.spec.volumes).toContainEqual({
      name: 'litellm-demo-cm',
      configMap: {
        name: 'litellm-demo'
      }
    });
  });
});
