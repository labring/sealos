export const PUBLIC_DOMAIN_PREFIX_MAX_LENGTH = 32;
export const PUBLIC_DOMAIN_PREFIX_MIN_LENGTH = 3;

const RESERVED_PUBLIC_DOMAIN_PREFIXES = new Set([
  'admin',
  'api',
  'app',
  'auth',
  'billing',
  'console',
  'dashboard',
  'devbox',
  'help',
  'kube',
  'login',
  'root',
  'sealos',
  'static',
  'support',
  'system',
  'www'
]);

export type PublicDomainPrefixValidationResult =
  | { valid: true; value: string }
  | { valid: false; value: string; reason: 'format' | 'reserved' };

export function normalizePublicDomainPrefix(value: string) {
  return value.trim().toLowerCase();
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

  if (RESERVED_PUBLIC_DOMAIN_PREFIXES.has(normalized)) {
    return { valid: false, value: normalized, reason: 'reserved' };
  }

  return { valid: true, value: normalized };
}
