export const PUBLIC_DOMAIN_PREFIX_MAX_LENGTH = 63;
export const PUBLIC_DOMAIN_PREFIX_MIN_LENGTH = 3;

export type PublicDomainConflictOwnerComponent =
  | 'app_launchpad'
  | 'devbox'
  | 'workspace_component'
  | 'ingress';

export type PublicDomainConflictOwner = {
  scope: 'same_workspace';
  resourceKind: 'Ingress';
  component: PublicDomainConflictOwnerComponent;
  displayType: string;
  displayName: string;
  host: string;
  namespace: string;
  ingressName: string;
  publicDomainPrefix?: string;
  labels?: Record<string, string>;
  matchedBy:
    | 'cloud.sealos.io/app-deploy-manager'
    | 'app.kubernetes.io/part-of=devbox'
    | 'kubernetes-recommended-labels'
    | 'unlabeled-ingress';
  confidence: 'high' | 'medium' | 'low';
};

let reservedPublicDomainPrefixes = new Set<string>();

export type PublicDomainPrefixValidationResult =
  | { valid: true; value: string }
  | { valid: false; value: string; reason: 'format' | 'reserved' };

export type ManagedPublicDomainNetwork = {
  openPublicDomain?: boolean;
  openNodePort?: boolean;
  customDomain?: string;
  publicDomain?: string;
  domain?: string;
};

export type DuplicateManagedPublicDomainHost = {
  host: string;
  indexes: number[];
};

export function normalizePublicDomainPrefix(value: string) {
  return value.trim().toLowerCase();
}

export function normalizePublicDomainReservedPrefixes(prefixes?: unknown) {
  if (!Array.isArray(prefixes)) return [];

  return prefixes
    .filter((prefix): prefix is string => typeof prefix === 'string')
    .map(normalizePublicDomainPrefix);
}

export function setPublicDomainReservedPrefixes(prefixes?: unknown) {
  reservedPublicDomainPrefixes = new Set(normalizePublicDomainReservedPrefixes(prefixes));
}

export function getPublicDomainReservedPrefixes() {
  return Array.from(reservedPublicDomainPrefixes);
}

export function validatePublicDomainPrefix(value: string): PublicDomainPrefixValidationResult {
  const normalized = normalizePublicDomainPrefix(value);
  const pattern = new RegExp(
    `^[a-z0-9](?:[a-z0-9-]{${PUBLIC_DOMAIN_PREFIX_MIN_LENGTH - 2},${
      PUBLIC_DOMAIN_PREFIX_MAX_LENGTH - 2
    }}[a-z0-9])$`
  );

  if (!pattern.test(normalized)) {
    return { valid: false, value: normalized, reason: 'format' };
  }

  if (reservedPublicDomainPrefixes.has(normalized)) {
    return { valid: false, value: normalized, reason: 'reserved' };
  }

  return { valid: true, value: normalized };
}

export function getDuplicateManagedPublicDomainHosts(
  networks: ManagedPublicDomainNetwork[],
  defaultDomain: string
) {
  const indexesByHost = new Map<string, number[]>();

  networks.forEach((network, index) => {
    if (!network.openPublicDomain || network.openNodePort || network.customDomain) return;

    const prefixResult = validatePublicDomainPrefix(network.publicDomain || '');
    const domain = network.domain || defaultDomain;
    if (!prefixResult.valid || !domain) return;

    const host = `${prefixResult.value}.${domain}`;
    indexesByHost.set(host, [...(indexesByHost.get(host) || []), index]);
  });

  return Array.from(indexesByHost.entries())
    .filter(([, indexes]) => indexes.length > 1)
    .map(([host, indexes]): DuplicateManagedPublicDomainHost => ({ host, indexes }));
}
