import * as k8s from '@kubernetes/client-node';

export class AuthService {
  private kubeconfig: string;
  private k8sApi?: k8s.CoreV1Api;
  private authApi?: k8s.AuthorizationV1Api;

  constructor(kubeconfig: string) {
    this.kubeconfig = kubeconfig;
  }

  private getK8sClient(): { coreApi: k8s.CoreV1Api; authApi: k8s.AuthorizationV1Api } {
    if (this.k8sApi && this.authApi) {
      return { coreApi: this.k8sApi, authApi: this.authApi };
    }

    const kc = new k8s.KubeConfig();
    kc.loadFromString(this.kubeconfig);

    this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    this.authApi = kc.makeApiClient(k8s.AuthorizationV1Api);

    return { coreApi: this.k8sApi, authApi: this.authApi };
  }

  async authenticate(namespace: string): Promise<void> {
    if (!namespace) {
      throw new Error('Namespace not found');
    }

    const { authApi } = this.getK8sClient();

    const review: k8s.V1SelfSubjectAccessReview = {
      apiVersion: 'authorization.k8s.io/v1',
      kind: 'SelfSubjectAccessReview',
      spec: {
        resourceAttributes: {
          namespace,
          verb: 'get',
          group: '',
          version: 'v1',
          resource: 'pods'
        }
      }
    };

    try {
      const response = await authApi.createSelfSubjectAccessReview(review);

      if (!response.body.status?.allowed) {
        throw new Error('No permission for this namespace');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Authentication failed: ${error.message}`);
      }
      throw error;
    }
  }
}
