import * as k8s from '@kubernetes/client-node';
import { ResponseCode } from '@/types/response';

export async function assertPodExecPermission({
  kc,
  namespace,
  podName
}: {
  kc: k8s.KubeConfig;
  namespace: string;
  podName?: string;
}) {
  if (!podName) {
    throw {
      body: {
        code: ResponseCode.BAD_REQUEST,
        message: 'podName is empty'
      }
    };
  }

  const authorizationApi = kc.makeApiClient(k8s.AuthorizationV1Api);
  const {
    body: { status }
  } = await authorizationApi.createSelfSubjectAccessReview({
    apiVersion: 'authorization.k8s.io/v1',
    kind: 'SelfSubjectAccessReview',
    spec: {
      resourceAttributes: {
        namespace,
        verb: 'create',
        resource: 'pods',
        subresource: 'exec',
        name: podName
      }
    }
  });

  if (!status?.allowed) {
    throw {
      body: {
        kind: 'Status',
        apiVersion: 'v1',
        status: 'Failure',
        code: ResponseCode.FORBIDDEN,
        message: 'pods/exec is forbidden'
      }
    };
  }
}
