import { appDeployKey } from '@/constants/app';
import type { NetworkingV1Api } from '@kubernetes/client-node';
import type { K8sContext } from '@/services/backend/appService';
import type { AppEditType } from '@/types/app';
import { validatePublicDomainPrefix } from '@/utils/public-domain';

export class PublicDomainError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_PUBLIC_DOMAIN' | 'RESERVED_PUBLIC_DOMAIN' | 'PUBLIC_DOMAIN_CONFLICT',
    public status = 400
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

type PublicDomainK8sContext = {
  k8sNetworkingApp: NetworkingV1Api;
  namespace: string;
};

export function normalizeAndValidatePublicDomainPrefix(value: string) {
  const result = validatePublicDomainPrefix(value);

  if (!result.valid) {
    throw new PublicDomainError(
      result.reason === 'reserved'
        ? `Public domain prefix "${result.value}" is reserved`
        : `Public domain prefix "${result.value}" is invalid`,
      result.reason === 'reserved' ? 'RESERVED_PUBLIC_DOMAIN' : 'INVALID_PUBLIC_DOMAIN'
    );
  }

  return result.value;
}

export async function ensurePublicDomainTargetsAvailable(
  targets: PublicDomainTarget[],
  k8s: PublicDomainK8sContext
) {
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
      throw new PublicDomainError(
        `Public domain "${conflictingHost}" is already in use`,
        'PUBLIC_DOMAIN_CONFLICT',
        409
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
  const targets = validateAppPublicDomainPrefixes(app);
  await ensurePublicDomainTargetsAvailable(targets, k8s);
}
