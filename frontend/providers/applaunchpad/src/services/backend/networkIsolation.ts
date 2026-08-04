import { appDeployKey } from '@/constants/app';
import type { K8sContext } from '@/services/backend/appService';
import {
  MAX_CIDRS_PER_RULE,
  MAX_NETWORK_ISOLATION_RULES,
  createDefaultNetworkIsolationConfig,
  type ApplicationAllowRule,
  type CidrAllowRule,
  type NetworkIsolationConfig,
  type NetworkIsolationEnforcement,
  type NetworkIsolationEnforcementIssue,
  type NetworkIsolationEnforcementState,
  type NetworkIsolationResponse,
  type NetworkIsolationRule,
  type NetworkIsolationTargetCapabilities
} from '@/types/networkIsolation';
import { isPublicCidr, normalizeCidrList } from '@/utils/network-isolation';
import type { V1Deployment, V1StatefulSet } from '@kubernetes/client-node';
import { createHash } from 'crypto';

const GROUP = 'networking.sealos.io';
const VERSION = 'v1alpha1';
const PLURAL = 'sealosnetworkpolicies';
const API_VERSION = `${GROUP}/${VERSION}`;
const KIND = 'SealosNetworkPolicy';
const FIELD_MANAGER = 'applaunchpad-network-isolation';

export const NETWORK_ISOLATION_CONFIG_ANNOTATION =
  'applaunchpad.sealos.io/network-isolation-config';
export const NETWORK_ISOLATION_REVISION_ANNOTATION =
  'applaunchpad.sealos.io/network-isolation-revision';

type LabelSelector = {
  matchLabels?: Record<string, string>;
  matchExpressions?: Array<{
    key: string;
    operator: string;
    values?: string[];
  }>;
};

type KubernetesCondition = {
  type?: string;
  status?: string;
  reason?: string;
  message?: string;
};

type SealosNetworkPolicy = {
  apiVersion: string;
  kind: string;
  metadata: {
    name?: string;
    namespace?: string;
    annotations?: Record<string, string>;
    generation?: number;
    resourceVersion?: string;
    deletionTimestamp?: string;
  };
  spec: Record<string, unknown>;
  status?: {
    phase?: string;
    observedGeneration?: number;
    conditions?: KubernetesCondition[];
  };
};

type ResolvedTarget = {
  selector: LabelSelector;
  capabilities: NetworkIsolationTargetCapabilities;
  externalServiceNames: string[];
};

export class NetworkIsolationError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'NetworkIsolationError';
  }
}

const isNotFound = (error: any) =>
  error?.body?.code === 404 || error?.response?.statusCode === 404 || error?.statusCode === 404;

const isConflict = (error: any) =>
  error?.body?.code === 409 || error?.response?.statusCode === 409 || error?.statusCode === 409;

const stableHash = (value: string, length = 16) =>
  createHash('sha256').update(value).digest('hex').slice(0, length);

export const getNetworkIsolationPolicyName = (namespace: string, appName: string) =>
  `snp-applaunchpad-${stableHash(`${namespace}\u0000${appName}`)}`;

const isSelectorEmpty = (selector: LabelSelector | undefined) =>
  !selector ||
  (!(selector.matchLabels && Object.keys(selector.matchLabels).length) &&
    !(selector.matchExpressions && selector.matchExpressions.length));

const cloneSelector = (selector: LabelSelector): LabelSelector => ({
  ...(selector.matchLabels ? { matchLabels: { ...selector.matchLabels } } : {}),
  ...(selector.matchExpressions
    ? {
        matchExpressions: selector.matchExpressions.map((expression) => ({
          ...expression,
          ...(expression.values ? { values: [...expression.values] } : {})
        }))
      }
    : {})
});

const getWorkloadSelector = (workload: V1Deployment | V1StatefulSet): LabelSelector | undefined => {
  const selector = workload.spec?.selector as LabelSelector | undefined;
  return !selector || isSelectorEmpty(selector) ? undefined : cloneSelector(selector);
};

const readPolicy = async (k8s: K8sContext, appName: string) => {
  const policyName = getNetworkIsolationPolicyName(k8s.namespace, appName);
  try {
    const response = await k8s.k8sCustomObjects.getNamespacedCustomObject(
      GROUP,
      VERSION,
      k8s.namespace,
      PLURAL,
      policyName
    );
    return response.body as SealosNetworkPolicy;
  } catch (error: any) {
    if (isNotFound(error)) return undefined;
    throw error;
  }
};

const getPolicyConfig = (policy: SealosNetworkPolicy | undefined): NetworkIsolationConfig => {
  const value = policy?.metadata.annotations?.[NETWORK_ISOLATION_CONFIG_ANNOTATION];
  if (!value) return createDefaultNetworkIsolationConfig();

  try {
    const parsed = JSON.parse(value) as NetworkIsolationConfig;
    if (typeof parsed?.enabled !== 'boolean' || !Array.isArray(parsed.rules)) {
      throw new Error('invalid config annotation');
    }
    return parsed;
  } catch {
    throw new NetworkIsolationError(
      503,
      'NETWORK_ISOLATION_CONFIG_CORRUPTED',
      'The stored network isolation configuration is corrupted and must be repaired by an administrator.'
    );
  }
};

const getPolicyRevision = (policy: SealosNetworkPolicy | undefined) =>
  policy?.metadata.annotations?.[NETWORK_ISOLATION_REVISION_ANNOTATION] || '0';

const resolveTarget = async (appName: string, k8s: K8sContext): Promise<ResolvedTarget> => {
  let workload: V1Deployment | V1StatefulSet;
  try {
    workload = await k8s.getDeployApp(appName);
  } catch {
    throw new NetworkIsolationError(
      404,
      'TARGET_APPLICATION_NOT_FOUND',
      'Target application not found.'
    );
  }

  const selector = getWorkloadSelector(workload);
  if (!selector) {
    throw new NetworkIsolationError(
      422,
      'TARGET_SELECTOR_UNRESOLVED',
      'The target application does not have a usable pod selector.'
    );
  }

  const [services, ingresses] = await Promise.all([
    k8s.k8sCore.listNamespacedService(
      k8s.namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `${appDeployKey}=${appName}`
    ),
    k8s.k8sNetworkingApp.listNamespacedIngress(
      k8s.namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `${appDeployKey}=${appName}`
    )
  ]);

  const externalServices = services.body.items
    .filter((service) => service.spec?.type === 'NodePort' || service.spec?.type === 'LoadBalancer')
    .filter((service) => !!service.metadata?.name)
    .sort((left, right) => (left.metadata?.name || '').localeCompare(right.metadata?.name || ''));

  return {
    selector,
    externalServiceNames: externalServices.map((service) => service.metadata?.name as string),
    capabilities: {
      hasDomainIngress: ingresses.body.items.length > 0,
      hasExternalPort: externalServices.length > 0
    }
  };
};

const normalizeConfig = (config: NetworkIsolationConfig, targetNamespace: string) => {
  if (typeof config?.enabled !== 'boolean' || !Array.isArray(config?.rules)) {
    throw new NetworkIsolationError(
      400,
      'INVALID_ARGUMENT',
      'Network isolation config is invalid.'
    );
  }
  if (config.rules.length > MAX_NETWORK_ISOLATION_RULES) {
    throw new NetworkIsolationError(400, 'INVALID_ARGUMENT', 'Too many allowlist rules.');
  }

  const ids = new Set<string>();
  const applications = new Set<string>();
  const rules: NetworkIsolationRule[] = config.rules.map((rule) => {
    if (!rule?.id || ids.has(rule.id)) {
      throw new NetworkIsolationError(400, 'INVALID_ARGUMENT', 'Rule IDs must be unique.');
    }
    ids.add(rule.id);

    if (rule.type === 'application') {
      const sourceWorkspaceId = rule.sourceWorkspaceId?.trim();
      const sourceApplicationId = rule.sourceApplicationId?.trim();
      if (!sourceWorkspaceId || !sourceApplicationId) {
        throw new NetworkIsolationError(
          400,
          'INVALID_ARGUMENT',
          'Source workspace and application are required.',
          {
            ruleId: rule.id
          }
        );
      }
      if (sourceWorkspaceId === targetNamespace) {
        throw new NetworkIsolationError(
          400,
          'INVALID_ARGUMENT',
          'Applications in the current workspace are already allowed.',
          { ruleId: rule.id }
        );
      }
      const key = `${sourceWorkspaceId.toLowerCase()}\u0000${sourceApplicationId.toLowerCase()}`;
      if (applications.has(key)) {
        throw new NetworkIsolationError(
          400,
          'INVALID_ARGUMENT',
          'Duplicate source application rule.',
          {
            ruleId: rule.id
          }
        );
      }
      applications.add(key);
      return {
        ...rule,
        sourceWorkspaceId,
        sourceApplicationId
      } as ApplicationAllowRule;
    }

    if (rule.type !== 'cidr' || !Array.isArray(rule.cidrs) || !rule.cidrs.length) {
      throw new NetworkIsolationError(
        400,
        'INVALID_ARGUMENT',
        'At least one IP or CIDR is required.',
        {
          ruleId: rule.id
        }
      );
    }
    if (rule.cidrs.length > MAX_CIDRS_PER_RULE) {
      throw new NetworkIsolationError(400, 'INVALID_ARGUMENT', 'Too many IP or CIDR entries.', {
        ruleId: rule.id
      });
    }
    const cidrs = normalizeCidrList(rule.cidrs);
    if (!cidrs) {
      throw new NetworkIsolationError(400, 'INVALID_ARGUMENT', 'IP or CIDR format is invalid.', {
        ruleId: rule.id
      });
    }
    const includesPublic = cidrs.some(isPublicCidr);
    if (includesPublic && !rule.allowPublic) {
      throw new NetworkIsolationError(
        400,
        'PUBLIC_CIDR_CONFIRMATION_REQUIRED',
        'Allowing the entire internet requires confirmation.',
        { ruleId: rule.id }
      );
    }
    return {
      ...rule,
      cidrs,
      allowPublic: includesPublic || undefined
    } as CidrAllowRule;
  });

  return { enabled: config.enabled, rules } satisfies NetworkIsolationConfig;
};

const resolveSourceSelector = async (rule: ApplicationAllowRule, k8s: K8sContext) => {
  const sourceReader = k8s.networkIsolationSourceReader;
  if (!sourceReader) {
    throw new NetworkIsolationError(
      503,
      'SOURCE_RESOLVER_UNAVAILABLE',
      'The source application resolver is unavailable.'
    );
  }
  try {
    await sourceReader.k8sCore.readNamespace(rule.sourceWorkspaceId);
  } catch (error: any) {
    if (isNotFound(error) || error?.body?.code === 403 || error?.statusCode === 403) {
      throw new NetworkIsolationError(
        422,
        'SOURCE_APPLICATION_UNRESOLVED',
        'Source workspace not found.',
        {
          ruleId: rule.id
        }
      );
    }
    throw error;
  }

  const [deployment, statefulSet] = await Promise.allSettled([
    sourceReader.k8sApp.readNamespacedDeployment(rule.sourceApplicationId, rule.sourceWorkspaceId),
    sourceReader.k8sApp.readNamespacedStatefulSet(rule.sourceApplicationId, rule.sourceWorkspaceId)
  ]);
  const workload =
    deployment.status === 'fulfilled'
      ? deployment.value.body
      : statefulSet.status === 'fulfilled'
        ? statefulSet.value.body
        : undefined;
  const selector = workload ? getWorkloadSelector(workload) : undefined;

  if (!selector) {
    throw new NetworkIsolationError(
      422,
      'SOURCE_APPLICATION_UNRESOLVED',
      'Source application could not be resolved to a pod selector.',
      { ruleId: rule.id }
    );
  }
  return selector;
};

export const buildNetworkIsolationSpec = async (
  appName: string,
  config: NetworkIsolationConfig,
  target: ResolvedTarget,
  k8s: K8sContext
) => {
  const rules = config.enabled
    ? await Promise.all(
        config.rules.map(async (rule) => {
          if (rule.type === 'cidr') {
            return {
              name: `cidr-${stableHash(rule.id, 12)}`,
              type: 'CIDR',
              from: {
                cidrs: rule.cidrs,
                ...(rule.allowPublic ? { allowPublic: true } : {})
              }
            };
          }
          return {
            name: `app-${stableHash(rule.id, 12)}`,
            type: 'Pod',
            from: {
              namespaceSelector: {
                matchLabels: {
                  'kubernetes.io/metadata.name': rule.sourceWorkspaceId
                }
              },
              podSelector: await resolveSourceSelector(rule, k8s)
            }
          };
        })
      )
    : [];

  return {
    enabled: config.enabled,
    targets: {
      podSelector: target.selector,
      ...(target.externalServiceNames.length
        ? { serviceRefs: target.externalServiceNames.map((name) => ({ name })) }
        : {}),
      ...(target.capabilities.hasDomainIngress
        ? {
            ingressSelectors: [
              {
                matchLabels: {
                  [appDeployKey]: appName
                }
              }
            ]
          }
        : {})
    },
    defaultAccess: {
      sameNamespace: 'Allow',
      external: 'Deny'
    },
    systemTraffic: {
      probes: { enabled: true, mode: 'Auto' },
      gateways: { enabled: true, mode: 'Auto' },
      platformHealthChecks: { enabled: true, mode: 'Auto' }
    },
    rules
  };
};

const getCondition = (conditions: KubernetesCondition[], type: string) =>
  conditions.find((condition) => condition.type === type);

const conditionReady = (conditions: KubernetesCondition[], type: string) =>
  getCondition(conditions, type)?.status === 'True';

const isUnsupportedCondition = (condition: KubernetesCondition | undefined) =>
  /unsupported|kubeproxyreplacementdisabled|lbsourcerangealltypesdisabled/i.test(
    `${condition?.reason || ''} ${condition?.message || ''}`
  );

const deriveIssues = (conditions: KubernetesCondition[]): NetworkIsolationEnforcementIssue[] =>
  conditions
    .filter((condition) => condition.status === 'False')
    .map((condition) => {
      const scope: NetworkIsolationEnforcementIssue['scope'] =
        condition.type?.includes('Ingress') || condition.type?.includes('Gateway')
          ? 'domain'
          : condition.type?.includes('Service') || condition.type?.includes('Capability')
            ? 'externalPort'
            : condition.type?.includes('Cilium') || condition.type?.includes('Source')
              ? 'internal'
              : 'platform';
      const unsupported = isUnsupportedCondition(condition);
      return {
        code: condition.reason || condition.type || 'UNKNOWN',
        scope,
        severity: unsupported ? 'warning' : 'error',
        message: condition.message || condition.reason || 'Network isolation is not ready.',
        conditionType: condition.type,
        reason: condition.reason
      };
    });

const deriveEnforcement = (
  policy: SealosNetworkPolicy | undefined,
  config: NetworkIsolationConfig,
  capabilities: NetworkIsolationTargetCapabilities
): NetworkIsolationEnforcement => {
  if (!policy) {
    return {
      phase: 'NotCreated',
      current: false,
      overall: 'notConfigured',
      scopes: {
        internal: 'notConfigured',
        domain: 'notConfigured',
        externalPort: 'notConfigured'
      },
      issues: []
    };
  }

  const phase = ['Pending', 'Ready', 'Degraded', 'Disabled'].includes(policy.status?.phase || '')
    ? (policy.status?.phase as NetworkIsolationEnforcement['phase'])
    : 'Pending';
  const generation = policy.metadata.generation;
  const observedGeneration = policy.status?.observedGeneration;
  const current = generation !== undefined && observedGeneration === generation;
  const conditions = policy.status?.conditions || [];
  const inactive = !config.enabled || phase === 'Disabled';
  const internalCondition = getCondition(conditions, 'CiliumPolicyReady');
  const domainReady =
    conditionReady(conditions, 'IngressWhitelistReady') &&
    conditionReady(conditions, 'GatewaySourceReady');
  const externalCondition = getCondition(conditions, 'ServiceSourceRangeReady');
  const capabilityCondition = getCondition(conditions, 'CapabilityReady');
  const targetSpec = policy.spec?.targets as any;
  const externalTargetConfigured =
    !!targetSpec?.serviceRef ||
    (Array.isArray(targetSpec?.serviceRefs) && targetSpec.serviceRefs.length > 0);

  const scopeState = (
    available: boolean,
    ready: boolean,
    unsupported: boolean
  ): NetworkIsolationEnforcementState => {
    if (!available) return 'notConfigured';
    if (inactive) return 'disabled';
    if (!current || phase === 'Pending') return 'progressing';
    if (unsupported) return 'unsupported';
    return ready ? 'ready' : 'degraded';
  };

  const scopes = {
    internal: scopeState(true, conditionReady(conditions, 'CiliumPolicyReady'), false),
    domain: scopeState(capabilities.hasDomainIngress, domainReady, false),
    externalPort: scopeState(
      capabilities.hasExternalPort,
      conditionReady(conditions, 'ServiceSourceRangeReady') &&
        conditionReady(conditions, 'CapabilityReady'),
      !externalTargetConfigured ||
        isUnsupportedCondition(externalCondition) ||
        isUnsupportedCondition(capabilityCondition)
    )
  };
  const overall: NetworkIsolationEnforcementState = inactive
    ? 'disabled'
    : !current || phase === 'Pending'
      ? 'progressing'
      : phase === 'Ready'
        ? 'ready'
        : phase === 'Degraded'
          ? 'degraded'
          : internalCondition
            ? 'degraded'
            : 'progressing';

  return {
    phase,
    generation,
    observedGeneration,
    current,
    overall,
    scopes,
    issues: deriveIssues(conditions)
  };
};

const toResponse = (
  appName: string,
  namespace: string,
  policy: SealosNetworkPolicy | undefined,
  target: ResolvedTarget
): NetworkIsolationResponse => {
  const config = getPolicyConfig(policy);
  return {
    config,
    revision: getPolicyRevision(policy),
    target: {
      workspaceId: namespace,
      applicationId: appName,
      ...target.capabilities
    },
    enforcement: deriveEnforcement(policy, config, target.capabilities)
  };
};

export const getNetworkIsolation = async (appName: string, k8s: K8sContext) => {
  const [target, policy] = await Promise.all([
    resolveTarget(appName, k8s),
    readPolicy(k8s, appName)
  ]);
  return toResponse(appName, k8s.namespace, policy, target);
};

export const saveNetworkIsolation = async (
  appName: string,
  config: NetworkIsolationConfig,
  expectedRevision: string | undefined,
  k8s: K8sContext
) => {
  const target = await resolveTarget(appName, k8s);
  const policy = await readPolicy(k8s, appName);
  const revision = getPolicyRevision(policy);
  if (expectedRevision === undefined || expectedRevision !== revision) {
    throw new NetworkIsolationError(
      409,
      'REVISION_CONFLICT',
      'Network isolation was changed by another operation. Refresh and try again.'
    );
  }

  const normalized = normalizeConfig(config, k8s.namespace);
  const spec = await buildNetworkIsolationSpec(appName, normalized, target, k8s);
  const nextRevision = String(Number(revision) + 1);
  const policyName = getNetworkIsolationPolicyName(k8s.namespace, appName);

  try {
    if (!policy) {
      const created = await k8s.k8sCustomObjects.createNamespacedCustomObject(
        GROUP,
        VERSION,
        k8s.namespace,
        PLURAL,
        {
          apiVersion: API_VERSION,
          kind: KIND,
          metadata: {
            name: policyName,
            namespace: k8s.namespace,
            labels: {
              [appDeployKey]: appName
            },
            annotations: {
              [NETWORK_ISOLATION_CONFIG_ANNOTATION]: JSON.stringify(normalized),
              [NETWORK_ISOLATION_REVISION_ANNOTATION]: nextRevision
            }
          },
          spec
        },
        undefined,
        undefined,
        FIELD_MANAGER
      );
      return toResponse(appName, k8s.namespace, created.body as SealosNetworkPolicy, target);
    }

    const annotationPath = (key: string) =>
      `/metadata/annotations/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`;
    const updated = await k8s.k8sCustomObjects.patchNamespacedCustomObject(
      GROUP,
      VERSION,
      k8s.namespace,
      PLURAL,
      policyName,
      [
        {
          op: 'test',
          path: annotationPath(NETWORK_ISOLATION_REVISION_ANNOTATION),
          value: revision
        },
        {
          op: 'add',
          path: annotationPath(NETWORK_ISOLATION_CONFIG_ANNOTATION),
          value: JSON.stringify(normalized)
        },
        {
          op: 'add',
          path: annotationPath(NETWORK_ISOLATION_REVISION_ANNOTATION),
          value: nextRevision
        },
        {
          op: 'replace',
          path: '/spec',
          value: spec
        }
      ],
      undefined,
      undefined,
      undefined,
      { headers: { 'Content-Type': 'application/json-patch+json' } }
    );
    return toResponse(appName, k8s.namespace, updated.body as SealosNetworkPolicy, target);
  } catch (error: any) {
    if (isConflict(error)) {
      throw new NetworkIsolationError(
        409,
        'REVISION_CONFLICT',
        'Network isolation was changed by another operation. Refresh and try again.'
      );
    }
    throw error;
  }
};

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const deleteNetworkIsolation = async (appName: string, k8s: K8sContext) => {
  const policy = await readPolicy(k8s, appName);
  if (!policy) return;

  const policyName = getNetworkIsolationPolicyName(k8s.namespace, appName);
  try {
    await k8s.k8sCustomObjects.deleteNamespacedCustomObject(
      GROUP,
      VERSION,
      k8s.namespace,
      PLURAL,
      policyName
    );
  } catch (error: any) {
    if (!isNotFound(error)) throw error;
    return;
  }

  for (let attempt = 0; attempt < 60; attempt++) {
    await sleep(500);
    const current = await readPolicy(k8s, appName);
    if (!current) return;
  }
  throw new NetworkIsolationError(
    503,
    'NETWORK_ISOLATION_CLEANUP_TIMEOUT',
    'Timed out while cleaning up network isolation resources.'
  );
};

export const deriveNetworkIsolationEnforcement = deriveEnforcement;
