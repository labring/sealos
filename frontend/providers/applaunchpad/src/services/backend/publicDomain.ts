import { appDeployKey, publicDomainKey } from '@/constants/app';
import type { KubernetesObjectApi, NetworkingV1Api, V1Ingress } from '@kubernetes/client-node';
import type { K8sContext } from '@/services/backend/appService';
import type { AppEditType } from '@/types/app';
import { isCustomPublicDomainPrefixEnabled } from '@/utils/feature-gates';
import {
  PublicDomainConflictOwner,
  getPublicDomainPrefixValidationMessage,
  validatePublicDomainPrefix
} from '@/utils/public-domain';

const INGRESS_OWNER_CONFLICT_CODE = '40301';
const INGRESS_OWNER_CONFLICT_MESSAGE = 'owned by other user';
const APP_LABEL_KEYS = [
  appDeployKey,
  publicDomainKey,
  'cloud.sealos.io/app-deploy-manager-port',
  'app.kubernetes.io/name',
  'app.kubernetes.io/instance',
  'app.kubernetes.io/component',
  'app.kubernetes.io/part-of',
  'app.kubernetes.io/managed-by',
  'helm.sh/chart'
];

export class PublicDomainError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_PUBLIC_DOMAIN' | 'RESERVED_PUBLIC_DOMAIN' | 'PUBLIC_DOMAIN_CONFLICT',
    public status = 400,
    public conflictOwner?: PublicDomainConflictOwner
  ) {
    super(message);
    this.name = 'PublicDomainError';
  }
}

export type PublicDomainTarget = {
  prefix: string;
  domain: string;
  appName?: string;
  networkName?: string;
};

type PublicDomainDryRunContext = {
  apiClient: KubernetesObjectApi;
  namespace: string;
};

function getDryRunIngressName(prefix: string) {
  const suffix = Date.now().toString(36);
  const maxPrefixLength = 63 - 'public-domain-check--'.length - suffix.length;
  return `public-domain-check-${prefix.slice(0, maxPrefixLength)}-${suffix}`.replace(/-+$/, '');
}

export function getPublicDomainErrorMessage(error: unknown) {
  if (typeof error === 'string') return error;

  const anyError = error as {
    body?: {
      message?: unknown;
    };
    message?: unknown;
  };

  if (typeof anyError?.body?.message === 'string') return anyError.body.message;
  if (error instanceof Error) return error.message;
  if (typeof anyError?.message === 'string') return anyError.message;
  return String(error);
}

export function isIngressPublicDomainConflictError(error: unknown) {
  const message = getPublicDomainErrorMessage(error).toLowerCase();
  return (
    message.includes(`admission webhook "vingress.sealos.io" denied the request`) &&
    message.includes(`${INGRESS_OWNER_CONFLICT_CODE}:`) &&
    message.includes(INGRESS_OWNER_CONFLICT_MESSAGE)
  );
}

export function getPublicDomainConflictResponse(error: unknown) {
  const details = getPublicDomainErrorMessage(error);

  return {
    code: 'PUBLIC_DOMAIN_CONFLICT' as const,
    message: getPublicDomainConflictMessage(),
    details
  };
}

export function getPublicDomainConflictMessage() {
  return 'Public domain is already in use by another workspace.';
}

export function getSameWorkspacePublicDomainConflictMessage(owner: PublicDomainConflictOwner) {
  return `Public domain "${owner.host}" is already used by ${owner.displayType} "${owner.displayName}" in this workspace.`;
}

function pickSafeLabels(labels?: Record<string, string>) {
  if (!labels) return undefined;

  const safeLabels = APP_LABEL_KEYS.reduce<Record<string, string>>((result, key) => {
    const value = labels[key];
    if (typeof value === 'string' && value) {
      result[key] = value;
    }
    return result;
  }, {});

  return Object.keys(safeLabels).length > 0 ? safeLabels : undefined;
}

function getRecommendedDisplayName(labels: Record<string, string> | undefined, fallback: string) {
  return (
    labels?.['app.kubernetes.io/instance'] ||
    labels?.['app.kubernetes.io/name'] ||
    labels?.['app.kubernetes.io/component'] ||
    fallback
  );
}

function getPublicDomainConflictOwner(ingress: V1Ingress, host: string): PublicDomainConflictOwner {
  const labels = ingress.metadata?.labels || {};
  const ingressName = ingress.metadata?.name || 'unknown-ingress';
  const namespace = ingress.metadata?.namespace || '';
  const launchpadAppName = labels[appDeployKey];
  const publicDomainPrefix = labels[publicDomainKey];

  if (launchpadAppName) {
    return {
      scope: 'same_workspace',
      resourceKind: 'Ingress',
      component: 'app_launchpad',
      displayType: 'App Launchpad app',
      displayName: launchpadAppName,
      host,
      namespace,
      ingressName,
      publicDomainPrefix,
      labels: pickSafeLabels(labels),
      matchedBy: 'cloud.sealos.io/app-deploy-manager',
      confidence: 'high'
    };
  }

  if (
    labels['app.kubernetes.io/part-of'] === 'devbox' ||
    labels['app.kubernetes.io/name'] === 'devbox'
  ) {
    return {
      scope: 'same_workspace',
      resourceKind: 'Ingress',
      component: 'devbox',
      displayType: 'Devbox',
      displayName: getRecommendedDisplayName(labels, ingressName),
      host,
      namespace,
      ingressName,
      publicDomainPrefix,
      labels: pickSafeLabels(labels),
      matchedBy: 'app.kubernetes.io/part-of=devbox',
      confidence: labels['app.kubernetes.io/part-of'] === 'devbox' ? 'high' : 'medium'
    };
  }

  if (
    labels['app.kubernetes.io/name'] ||
    labels['app.kubernetes.io/instance'] ||
    labels['app.kubernetes.io/component'] ||
    labels['app.kubernetes.io/managed-by']
  ) {
    return {
      scope: 'same_workspace',
      resourceKind: 'Ingress',
      component: 'workspace_component',
      displayType: 'workspace component',
      displayName: getRecommendedDisplayName(labels, ingressName),
      host,
      namespace,
      ingressName,
      publicDomainPrefix,
      labels: pickSafeLabels(labels),
      matchedBy: 'kubernetes-recommended-labels',
      confidence: 'medium'
    };
  }

  return {
    scope: 'same_workspace',
    resourceKind: 'Ingress',
    component: 'ingress',
    displayType: 'Ingress',
    displayName: ingressName,
    host,
    namespace,
    ingressName,
    publicDomainPrefix,
    labels: pickSafeLabels(labels),
    matchedBy: 'unlabeled-ingress',
    confidence: 'low'
  };
}

type PublicDomainK8sContext = {
  k8sNetworkingApp: NetworkingV1Api;
  namespace: string;
};

export function normalizeAndValidatePublicDomainPrefix(value: string) {
  if (!isCustomPublicDomainPrefixEnabled()) {
    throw new PublicDomainError(
      'Custom public domain prefixes are disabled',
      'INVALID_PUBLIC_DOMAIN'
    );
  }

  const result = validatePublicDomainPrefix(value);

  if (!result.valid) {
    throw new PublicDomainError(
      getPublicDomainPrefixValidationMessage(result),
      result.reason === 'reserved' ? 'RESERVED_PUBLIC_DOMAIN' : 'INVALID_PUBLIC_DOMAIN'
    );
  }

  return result.value;
}

export async function dryRunPublicDomainIngress(
  target: PublicDomainTarget,
  k8s: PublicDomainDryRunContext
) {
  const prefix = normalizeAndValidatePublicDomainPrefix(target.prefix);
  const host = `${prefix}.${target.domain}`;
  const appName = target.appName || 'public-domain-check';
  const networkName = target.networkName || getDryRunIngressName(prefix);

  await k8s.apiClient.create(
    {
      apiVersion: 'networking.k8s.io/v1',
      kind: 'Ingress',
      metadata: {
        name: networkName,
        namespace: k8s.namespace,
        labels: {
          [appDeployKey]: appName,
          [publicDomainKey]: prefix
        },
        annotations: {
          'kubernetes.io/ingress.class': 'nginx'
        }
      },
      spec: {
        rules: [
          {
            host,
            http: {
              paths: [
                {
                  path: '/',
                  pathType: 'Prefix',
                  backend: {
                    service: {
                      name: appName,
                      port: {
                        number: 80
                      }
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    },
    undefined,
    'All',
    'applaunchpad-public-domain-check'
  );

  return {
    prefix,
    host
  };
}

export async function ensurePublicDomainTargetsAvailable(
  targets: PublicDomainTarget[],
  k8s: PublicDomainK8sContext
) {
  if (!isCustomPublicDomainPrefixEnabled()) return;
  if (targets.length === 0) return;

  const seenHosts = new Set<string>();
  const appsByHost = new Map<string, Set<string>>();

  for (const target of targets) {
    const prefix = normalizeAndValidatePublicDomainPrefix(target.prefix);
    const host = `${prefix}.${target.domain}`;
    if (seenHosts.has(host)) {
      throw new PublicDomainError(
        `Public domain "${host}" is duplicated in this application`,
        'PUBLIC_DOMAIN_CONFLICT',
        409
      );
    }
    target.prefix = prefix;
    seenHosts.add(host);
    if (target.appName) {
      const apps = appsByHost.get(host) || new Set<string>();
      apps.add(target.appName);
      appsByHost.set(host, apps);
    }
  }

  const { body } = await k8s.k8sNetworkingApp.listNamespacedIngress(k8s.namespace);

  for (const item of body.items || []) {
    const ownerAppName = item.metadata?.labels?.[appDeployKey];
    const hosts =
      item.spec?.rules
        ?.map((rule) => rule.host)
        .filter((host): host is string => typeof host === 'string') || [];
    const conflictingHost = hosts.find((host) => {
      if (!seenHosts.has(host)) return false;
      return !ownerAppName || !appsByHost.get(host)?.has(ownerAppName);
    });

    if (conflictingHost) {
      const conflictOwner = getPublicDomainConflictOwner(item, conflictingHost);
      throw new PublicDomainError(
        getSameWorkspacePublicDomainConflictMessage(conflictOwner),
        'PUBLIC_DOMAIN_CONFLICT',
        409,
        conflictOwner
      );
    }
  }
}

export function validateAppPublicDomainPrefixes(app: AppEditType) {
  return app.networks
    .filter((network) => network.openPublicDomain && !network.openNodePort && !network.customDomain)
    .map((network) => {
      const prefix = normalizeAndValidatePublicDomainPrefix(network.publicDomain);
      network.publicDomain = prefix;
      return {
        prefix,
        domain: network.domain || global.AppConfig?.cloud?.domain || 'cloud.sealos.io',
        appName: app.appName,
        networkName: network.networkName
      };
    });
}

export async function ensurePublicDomainPrefixesAvailable(app: AppEditType, k8s: K8sContext) {
  if (!isCustomPublicDomainPrefixEnabled()) return;

  const targets = validateAppPublicDomainPrefixes(app);
  await ensurePublicDomainTargetsAvailable(targets, k8s);
}
