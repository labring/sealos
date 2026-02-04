import * as k8s from '@kubernetes/client-node';
import * as http from 'http';
import * as https from 'https';
import * as net from 'net';

export class AuthService {
  private kubeconfig: string;
  private k8sApi?: k8s.CoreV1Api;
  private authApi?: k8s.AuthorizationV1Api;
  private kubeConfig?: k8s.KubeConfig;
  private whitelistKubernetesHosts: string[];
  private authCache: Map<string, { allowed: boolean; expiresAt: number }>;
  private cacheTTL: number;
  private inFlightAuth: Map<string, Promise<void>>;
  private lastCacheSweepAt: number;
  private readonly cacheSweepIntervalMs: number;

  constructor(kubeconfig: string, whitelistKubernetesHosts?: string[], cacheTTL?: number) {
    this.kubeconfig = kubeconfig;
    this.whitelistKubernetesHosts =
      whitelistKubernetesHosts ||
      (process.env.WHITELIST_KUBERNETES_HOSTS || '')
        .split(',')
        .map((host) => host.trim())
        .filter(Boolean);
    this.cacheTTL = cacheTTL ?? 300000; // 5 minutes default
    this.authCache = new Map();
    this.inFlightAuth = new Map();
    this.lastCacheSweepAt = 0;
    this.cacheSweepIntervalMs = 60000;
  }

  resolveNamespace(namespace?: string): string {
    if (namespace && namespace.trim().length > 0) {
      return namespace;
    }
    const contextNamespace = this.getCurrentContextNamespace();
    if (!contextNamespace) {
      throw new Error('Namespace not found');
    }
    return contextNamespace;
  }

  private getKubernetesHostFromEnv(): string {
    const host = process.env.KUBERNETES_SERVICE_HOST;
    const port = process.env.KUBERNETES_SERVICE_PORT;
    if (!host || !port) return '';
    const formattedHost = net.isIPv6(host) ? `[${host}]` : host;
    return `https://${formattedHost}:${port}`;
  }

  private isWhitelistKubernetesHost(host: string): boolean {
    return this.whitelistKubernetesHosts.includes(host);
  }

  private getKubeConfig(): k8s.KubeConfig {
    if (this.kubeConfig) {
      return this.kubeConfig;
    }

    const kc = new k8s.KubeConfig();
    kc.loadFromString(this.kubeconfig);
    const cluster = kc.getCurrentCluster();
    if (!cluster) {
      throw new Error('No active cluster');
    }

    if (!this.isWhitelistKubernetesHost(cluster.server)) {
      const k8sHost = this.getKubernetesHostFromEnv();
      if (!k8sHost) {
        throw new Error('unable to get the sealos host');
      }
      const clusters = kc
        .getClusters()
        .map((item) => (item.name === cluster.name ? { ...item, server: k8sHost } : item));
      kc.loadFromOptions({
        clusters,
        users: kc.getUsers(),
        contexts: kc.getContexts(),
        currentContext: kc.getCurrentContext()
      });
    }

    this.kubeConfig = kc;
    return kc;
  }

  private getCurrentContextNamespace(): string | undefined {
    const kc = this.getKubeConfig();
    const contextName = kc.getCurrentContext();
    if (!contextName) return undefined;
    return kc.getContextObject(contextName)?.namespace;
  }

  private sweepExpiredCache(): void {
    if (this.cacheTTL <= 0 || this.authCache.size === 0) return;
    const now = Date.now();
    if (now - this.lastCacheSweepAt < this.cacheSweepIntervalMs) return;
    this.lastCacheSweepAt = now;
    for (const [namespace, cache] of this.authCache.entries()) {
      if (cache.expiresAt <= now) {
        this.authCache.delete(namespace);
      }
    }
  }

  private async pingReadyz(): Promise<void> {
    const kc = this.getKubeConfig();
    const cluster = kc.getCurrentCluster();
    if (!cluster) {
      throw new Error('No active cluster');
    }
    const serverUrl = new URL(cluster.server);
    const isHttps = serverUrl.protocol === 'https:';
    const port = serverUrl.port ? Number(serverUrl.port) : isHttps ? 443 : 80;

    const requestOptions: https.RequestOptions = {
      method: 'GET',
      hostname: serverUrl.hostname,
      port,
      path: '/readyz',
      protocol: serverUrl.protocol,
      headers: {}
    };

    await kc.applytoHTTPSOptions(requestOptions);

    await new Promise<void>((resolve, reject) => {
      const requester = isHttps ? https : http;
      const req = requester.request(requestOptions, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk.toString();
        });
        res.on('end', () => {
          if (body.trim() === 'ok') {
            resolve();
            return;
          }
          reject(new Error(`ping apiserver is no ok: ${body}`));
        });
      });
      req.on('error', (error) => {
        reject(new Error(`ping apiserver error: ${error.message}`));
      });
      req.end();
    });
  }

  private getK8sClient(): { coreApi: k8s.CoreV1Api; authApi: k8s.AuthorizationV1Api } {
    if (this.k8sApi && this.authApi) {
      return { coreApi: this.k8sApi, authApi: this.authApi };
    }

    const kc = this.getKubeConfig();

    this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    this.authApi = kc.makeApiClient(k8s.AuthorizationV1Api);

    return { coreApi: this.k8sApi, authApi: this.authApi };
  }

  async authenticate(namespace: string): Promise<void> {
    const ns = namespace.trim();
    if (!ns) {
      throw new Error('Namespace not found');
    }

    this.sweepExpiredCache();

    if (this.cacheTTL > 0) {
      const cached = this.authCache.get(ns);
      if (cached) {
        if (cached.expiresAt > Date.now()) {
          if (!cached.allowed) {
            throw new Error('No permission for this namespace');
          }
          return;
        }
        this.authCache.delete(ns);
      }
    }

    const inFlight = this.inFlightAuth.get(ns);
    if (inFlight) return inFlight;

    const { authApi } = this.getK8sClient();

    const authPromise = (async () => {
      await this.pingReadyz();

      const review: k8s.V1SelfSubjectAccessReview = {
        apiVersion: 'authorization.k8s.io/v1',
        kind: 'SelfSubjectAccessReview',
        spec: {
          resourceAttributes: {
            namespace: ns,
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
          if (this.cacheTTL > 0) {
            this.authCache.set(ns, {
              allowed: false,
              expiresAt: Date.now() + this.cacheTTL
            });
          }
          throw new Error('No permission for this namespace');
        }

        if (this.cacheTTL > 0) {
          this.authCache.set(ns, {
            allowed: true,
            expiresAt: Date.now() + this.cacheTTL
          });
        }
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Authentication failed: ${error.message}`);
        }
        throw error;
      }
    })().finally(() => {
      this.inFlightAuth.delete(ns);
    });

    this.inFlightAuth.set(ns, authPromise);
    return authPromise;
  }

  clearCache(): void {
    this.authCache.clear();
  }

  clearNamespaceCache(namespace: string): void {
    this.authCache.delete(namespace);
  }

  getCacheStats(): {
    size: number;
    entries: Array<{ namespace: string; allowed: boolean; expiresIn: number }>;
  } {
    this.sweepExpiredCache();
    const entries = Array.from(this.authCache.entries()).map(([namespace, cache]) => ({
      namespace,
      allowed: cache.allowed,
      expiresIn: Math.max(0, cache.expiresAt - Date.now())
    }));
    return {
      size: this.authCache.size,
      entries
    };
  }
}
