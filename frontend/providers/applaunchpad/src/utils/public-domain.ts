export const PUBLIC_DOMAIN_PREFIX_MAX_LENGTH = 32;
export const PUBLIC_DOMAIN_PREFIX_MIN_LENGTH = 3;

let reservedPublicDomainPrefixes = new Set<string>();

export type PublicDomainPrefixValidationResult =
  | { valid: true; value: string }
  | { valid: false; value: string; reason: 'format' | 'reserved' };

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
