import { describe, expect, it, vi } from 'vitest';
import { updateAppResources } from '@/services/backend/appService';

vi.mock('@/pages/app/edit', () => ({
  formData2Yamls: vi.fn()
}));

const createK8sContext = (currentImage: string, hasImagePullSecret = true) => {
  const patchNamespacedDeployment = vi.fn().mockResolvedValue({});
  const replaceNamespacedSecret = vi.fn().mockResolvedValue({});
  const replaceApp = vi.fn().mockResolvedValue({});

  return {
    context: {
      namespace: 'ns-demo',
      apiClient: { replace: replaceApp },
      getDeployApp: vi.fn().mockResolvedValue({
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: 'demo',
          annotations: { originImageName: currentImage }
        },
        spec: {
          template: {
            spec: {
              containers: [{ name: 'demo', image: currentImage }],
              ...(hasImagePullSecret ? { imagePullSecrets: [{ name: 'demo' }] } : {})
            }
          }
        }
      }),
      k8sApp: {
        patchNamespacedDeployment
      },
      k8sCore: {
        readNamespacedSecret: vi.fn().mockResolvedValue({}),
        replaceNamespacedSecret
      }
    } as any,
    patchNamespacedDeployment,
    replaceNamespacedSecret,
    replaceApp
  };
};

describe('updateAppResources image registry binding', () => {
  it('uses a separate private registry for a short image update', async () => {
    const { context, patchNamespacedDeployment, replaceNamespacedSecret } = createK8sContext(
      'registry.example.com/team/app:v1'
    );

    await updateAppResources(
      'demo',
      {
        imageName: 'team/app:v2',
        imageRegistry: {
          username: 'demo-user',
          password: 'real-password',
          serverAddress: 'registry.example.com'
        }
      },
      context
    );

    const patch = patchNamespacedDeployment.mock.calls[0][2];
    expect(patch).toContainEqual({
      op: 'replace',
      path: '/spec/template/spec/containers/0/image',
      value: 'registry.example.com/team/app:v2'
    });

    const secret = replaceNamespacedSecret.mock.calls[0][2];
    const dockerconfigjson = JSON.parse(
      Buffer.from(secret.data['.dockerconfigjson'], 'base64').toString()
    );
    expect(Object.keys(dockerconfigjson.auths)).toEqual(['registry.example.com']);
  });

  it('preserves the existing private registry when only a short image is updated', async () => {
    const { context, patchNamespacedDeployment } = createK8sContext(
      'registry.example.com/team/app:v1'
    );

    await updateAppResources('demo', { imageName: 'team/app:v2' }, context);

    const patch = patchNamespacedDeployment.mock.calls[0][2];
    expect(patch).toContainEqual({
      op: 'replace',
      path: '/spec/template/spec/containers/0/image',
      value: 'registry.example.com/team/app:v2'
    });
  });

  it('rejects mismatched registry credentials before Kubernetes writes', async () => {
    const { context, patchNamespacedDeployment, replaceNamespacedSecret, replaceApp } =
      createK8sContext('old-registry.example.com/team/app:v1');

    await expect(
      updateAppResources(
        'demo',
        {
          resource: { replicas: 2 },
          imageName: 'new-registry.example.com/team/app:v2',
          imageRegistry: {
            username: 'demo-user',
            password: 'real-password',
            serverAddress: 'old-registry.example.com'
          }
        },
        context
      )
    ).rejects.toThrow('registry credentials');

    expect(patchNamespacedDeployment).not.toHaveBeenCalled();
    expect(replaceNamespacedSecret).not.toHaveBeenCalled();
    expect(replaceApp).not.toHaveBeenCalled();
  });
});
