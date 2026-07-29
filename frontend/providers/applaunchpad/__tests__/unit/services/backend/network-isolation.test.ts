import { describe, expect, it, vi } from 'vitest';
import {
  buildNetworkIsolationSpec,
  deriveNetworkIsolationEnforcement,
  getNetworkIsolation,
  getNetworkIsolationPolicyName,
  NETWORK_ISOLATION_CONFIG_ANNOTATION,
  NETWORK_ISOLATION_REVISION_ANNOTATION,
  saveNetworkIsolation
} from '@/services/backend/networkIsolation';
import type { NetworkIsolationConfig } from '@/types/networkIsolation';

const createK8sContext = (policy?: any) => {
  const persisted = { value: policy };
  const k8s = {
    namespace: 'ns-target',
    getDeployApp: vi.fn(async (name: string) => ({
      kind: 'Deployment',
      metadata: { name },
      spec: { selector: { matchLabels: { app: name } } }
    })),
    k8sCore: {
      listNamespacedService: vi.fn(async () => ({
        body: { items: [{ metadata: { name: 'web-public' }, spec: { type: 'LoadBalancer' } }] }
      })),
      listNamespacedIngress: vi.fn(async () => ({
        body: { items: [{ metadata: { name: 'ignored' } }] }
      })),
      readNamespace: vi.fn(async () => ({ body: {} }))
    },
    k8sNetworkingApp: {
      listNamespacedIngress: vi.fn(async () => ({
        body: { items: [{ metadata: { name: 'ingress' } }] }
      }))
    },
    k8sApp: {
      readNamespacedDeployment: vi.fn(async (name: string) => ({
        body: { spec: { selector: { matchLabels: { app: name } } } }
      })),
      readNamespacedStatefulSet: vi.fn(async () => Promise.reject({ body: { code: 404 } }))
    },
    k8sCustomObjects: {
      getNamespacedCustomObject: vi.fn(async () => {
        if (!persisted.value) throw { body: { code: 404 } };
        return { body: persisted.value };
      }),
      createNamespacedCustomObject: vi.fn(
        async (
          _group: string,
          _version: string,
          _namespace: string,
          _plural: string,
          body: any
        ) => {
          persisted.value = {
            ...body,
            metadata: { ...body.metadata, generation: 1, resourceVersion: '1' },
            status: { phase: 'Pending', observedGeneration: 0, conditions: [] }
          };
          return { body: persisted.value };
        }
      ),
      patchNamespacedCustomObject: vi.fn()
    }
  };

  return { k8s, persisted };
};

describe('network isolation SNP service', () => {
  it('returns a disabled, not-configured DTO when an application has no SNP', async () => {
    const { k8s } = createK8sContext();

    await expect(getNetworkIsolation('web', k8s as any)).resolves.toMatchObject({
      config: { enabled: false, rules: [] },
      revision: '0',
      target: {
        workspaceId: 'ns-target',
        applicationId: 'web',
        hasDomainIngress: true,
        hasExternalPort: true
      },
      enforcement: { overall: 'notConfigured', scopes: { internal: 'notConfigured' } }
    });
  });

  it('creates a deterministic annotated SNP and converts app and CIDR rules', async () => {
    const { k8s, persisted } = createK8sContext();
    const config: NetworkIsolationConfig = {
      enabled: true,
      rules: [
        {
          id: 'source-rule',
          type: 'application',
          sourceWorkspaceId: 'ns-source',
          sourceApplicationId: 'source-app'
        },
        { id: 'cidr-rule', type: 'cidr', cidrs: ['10.1.1.2', '10.1.0.3/16'] }
      ]
    };

    const response = await saveNetworkIsolation('web', config, '0', k8s as any);

    expect(persisted.value.metadata.name).toBe(getNetworkIsolationPolicyName('ns-target', 'web'));
    expect(
      JSON.parse(persisted.value.metadata.annotations[NETWORK_ISOLATION_CONFIG_ANNOTATION])
    ).toMatchObject({
      enabled: true,
      rules: [
        { id: 'source-rule', type: 'application', sourceWorkspaceId: 'ns-source' },
        { id: 'cidr-rule', type: 'cidr', cidrs: ['10.1.0.0/16', '10.1.1.2/32'] }
      ]
    });
    expect(persisted.value.metadata.annotations[NETWORK_ISOLATION_REVISION_ANNOTATION]).toBe('1');
    expect(persisted.value.spec).toMatchObject({
      enabled: true,
      targets: {
        serviceRef: { name: 'web-public' },
        ingressSelectors: [{ matchLabels: { 'cloud.sealos.io/app-deploy-manager': 'web' } }]
      },
      defaultAccess: { sameNamespace: 'Allow', external: 'Deny' },
      rules: [
        {
          type: 'Pod',
          from: {
            namespaceSelector: { matchLabels: { 'kubernetes.io/metadata.name': 'ns-source' } },
            podSelector: { matchLabels: { app: 'source-app' } }
          }
        },
        { type: 'CIDR', from: { cidrs: ['10.1.0.0/16', '10.1.1.2/32'] } }
      ]
    });
    expect(response.revision).toBe('1');
  });

  it('requires the revision from the current SNP before updating', async () => {
    const policy = {
      metadata: {
        annotations: {
          [NETWORK_ISOLATION_CONFIG_ANNOTATION]: JSON.stringify({ enabled: false, rules: [] }),
          [NETWORK_ISOLATION_REVISION_ANNOTATION]: '4'
        }
      },
      spec: {},
      apiVersion: 'networking.sealos.io/v1alpha1',
      kind: 'SealosNetworkPolicy'
    };
    const { k8s } = createK8sContext(policy);

    await expect(
      saveNetworkIsolation('web', { enabled: false, rules: [] }, '3', k8s as any)
    ).rejects.toMatchObject({ code: 'REVISION_CONFLICT', status: 409 });
  });

  it('marks external paths unsupported when the controller reports an unsupported capability', () => {
    const enforcement = deriveNetworkIsolationEnforcement(
      {
        metadata: { generation: 2 },
        spec: {},
        apiVersion: 'networking.sealos.io/v1alpha1',
        kind: 'SealosNetworkPolicy',
        status: {
          phase: 'Degraded',
          observedGeneration: 2,
          conditions: [
            { type: 'CiliumPolicyReady', status: 'True' },
            { type: 'IngressWhitelistReady', status: 'True' },
            { type: 'GatewaySourceReady', status: 'True' },
            { type: 'ServiceSourceRangeReady', status: 'False', reason: 'PureNodePortUnsupported' },
            { type: 'CapabilityReady', status: 'False', reason: 'KubernetesAPIUnsupported' }
          ]
        }
      } as any,
      { enabled: true, rules: [] },
      { hasDomainIngress: true, hasExternalPort: true }
    );

    expect(enforcement.scopes).toEqual({
      internal: 'ready',
      domain: 'ready',
      externalPort: 'unsupported'
    });
    expect(enforcement.overall).toBe('degraded');
  });

  it('keeps an app name out of ingress selection derivation', async () => {
    const { k8s } = createK8sContext();
    const spec = await buildNetworkIsolationSpec(
      'network-isolation-e2e',
      { enabled: false, rules: [] },
      {
        selector: { matchLabels: { arbitrary: 'pod-label' } },
        capabilities: { hasDomainIngress: true, hasExternalPort: false }
      },
      k8s as any
    );

    expect(spec.targets).toMatchObject({
      ingressSelectors: [
        { matchLabels: { 'cloud.sealos.io/app-deploy-manager': 'network-isolation-e2e' } }
      ]
    });
  });
});
