import { describe, expect, it, vi } from 'vitest';
import { assertPodExecPermission } from '@/services/backend/podExecPermission';
import { ResponseCode } from '@/types/response';

function createKubeConfigMock(allowed: boolean) {
  const createSelfSubjectAccessReview = vi.fn(() =>
    Promise.resolve({
      body: {
        status: {
          allowed
        }
      }
    })
  );

  return {
    kc: {
      makeApiClient: vi.fn(() => ({
        createSelfSubjectAccessReview
      }))
    } as any,
    createSelfSubjectAccessReview
  };
}

describe('assertPodExecPermission', () => {
  it('checks create access on the target pods/exec subresource', async () => {
    const { kc, createSelfSubjectAccessReview } = createKubeConfigMock(true);

    await assertPodExecPermission({
      kc,
      namespace: 'ns-demo',
      podName: 'demo-pod'
    });

    expect(createSelfSubjectAccessReview).toHaveBeenCalledWith({
      apiVersion: 'authorization.k8s.io/v1',
      kind: 'SelfSubjectAccessReview',
      spec: {
        resourceAttributes: {
          namespace: 'ns-demo',
          verb: 'create',
          resource: 'pods',
          subresource: 'exec',
          name: 'demo-pod'
        }
      }
    });
  });

  it('throws a forbidden Kubernetes status when pods/exec create is denied', async () => {
    const { kc } = createKubeConfigMock(false);

    await expect(
      assertPodExecPermission({
        kc,
        namespace: 'ns-demo',
        podName: 'demo-pod'
      })
    ).rejects.toMatchObject({
      body: {
        code: ResponseCode.FORBIDDEN,
        message: 'pods/exec is forbidden'
      }
    });
  });
});
