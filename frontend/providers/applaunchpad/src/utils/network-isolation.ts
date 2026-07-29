import {
  MAX_CIDRS_PER_RULE,
  MAX_NETWORK_ISOLATION_RULES,
  type NetworkIsolationConfig
} from '@/types/networkIsolation';

export type CidrNormalizationResult =
  | {
      valid: true;
      value: string;
      isPublic: boolean;
    }
  | {
      valid: false;
      value: '';
      isPublic: false;
    };

export type NetworkIsolationValidation = {
  applicationRuleErrors: Record<string, 'required' | 'duplicate'>;
  cidrRuleErrors: Record<string, 'required' | 'invalid' | 'tooMany'>;
  exceedsRuleLimit: boolean;
  requiresPublicConfirmation: boolean;
  valid: boolean;
};

const parseIpv4 = (value: string): number[] | undefined => {
  const parts = value.split('.');

  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part))) return undefined;

  const octets = parts.map(Number);
  return octets.every((octet) => octet >= 0 && octet <= 255) ? octets : undefined;
};

const normalizeIpv4 = (octets: number[], prefix: number) => {
  const address = octets.reduce((result, octet) => result * 256 + octet, 0);
  const blockSize = Math.pow(2, 32 - prefix);
  const network = Math.floor(address / blockSize) * blockSize;
  const normalized = [0, 1, 2, 3].map(
    (index) => Math.floor(network / Math.pow(256, 3 - index)) % 256
  );

  return `${normalized.join('.')}/${prefix}`;
};

const parseIpv6 = (value: string): number[] | undefined => {
  let address = value.toLowerCase();

  if (address.includes('.')) {
    const lastColon = address.lastIndexOf(':');
    if (lastColon === -1) return undefined;
    const ipv4 = parseIpv4(address.slice(lastColon + 1));
    if (!ipv4) return undefined;
    address = `${address.slice(0, lastColon)}:${((ipv4[0] << 8) | ipv4[1]).toString(16)}:${(
      (ipv4[2] << 8) |
      ipv4[3]
    ).toString(16)}`;
  }

  if (address.split('::').length > 2) return undefined;

  const hasCompression = address.includes('::');
  const [leftValue, rightValue] = hasCompression ? address.split('::') : [address, ''];
  const left = leftValue ? leftValue.split(':') : [];
  const right = rightValue ? rightValue.split(':') : [];
  const groupCount = left.length + right.length;

  if ((!hasCompression && groupCount !== 8) || groupCount > 8) return undefined;

  const groups = [...left, ...Array(hasCompression ? 8 - groupCount : 0).fill('0'), ...right];
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) {
    return undefined;
  }

  return groups.map((group) => Number.parseInt(group, 16));
};

const formatIpv6 = (groups: number[]) => {
  let longestStart = -1;
  let longestLength = 0;
  let currentStart = -1;

  groups.forEach((group, index) => {
    if (group === 0) {
      if (currentStart === -1) currentStart = index;
      const currentLength = index - currentStart + 1;
      if (currentLength > longestLength) {
        longestStart = currentStart;
        longestLength = currentLength;
      }
      return;
    }
    currentStart = -1;
  });

  if (longestLength < 2) return groups.map((group) => group.toString(16)).join(':');

  const before = groups
    .slice(0, longestStart)
    .map((group) => group.toString(16))
    .join(':');
  const after = groups
    .slice(longestStart + longestLength)
    .map((group) => group.toString(16))
    .join(':');

  return `${before}::${after}`;
};

const normalizeIpv6 = (groups: number[], prefix: number) => {
  const normalized = groups.map((group, index) => {
    const remainingBits = prefix - index * 16;

    if (remainingBits >= 16) return group;
    if (remainingBits <= 0) return 0;
    return group & ((0xffff << (16 - remainingBits)) & 0xffff);
  });

  return `${formatIpv6(normalized)}/${prefix}`;
};

const parsePrefix = (value: string | undefined, defaultValue: number, maximum: number) => {
  if (value === undefined) return defaultValue;
  if (!/^\d+$/.test(value)) return undefined;

  const prefix = Number(value);
  return Number.isInteger(prefix) && prefix >= 0 && prefix <= maximum ? prefix : undefined;
};

export const normalizeCidr = (input: string): CidrNormalizationResult => {
  const value = input.trim();
  if (!value) return { valid: false, value: '', isPublic: false };

  const slashIndex = value.indexOf('/');
  if (slashIndex !== -1 && slashIndex !== value.lastIndexOf('/')) {
    return { valid: false, value: '', isPublic: false };
  }

  const address = slashIndex === -1 ? value : value.slice(0, slashIndex);
  const prefixValue = slashIndex === -1 ? undefined : value.slice(slashIndex + 1);
  const ipv4 = parseIpv4(address);

  if (ipv4) {
    const prefix = parsePrefix(prefixValue, 32, 32);
    if (prefix === undefined) {
      return { valid: false, value: '', isPublic: false };
    }
    const normalized = normalizeIpv4(ipv4, prefix);
    return { valid: true, value: normalized, isPublic: prefix === 0 };
  }

  const ipv6 = parseIpv6(address);
  if (!ipv6) return { valid: false, value: '', isPublic: false };

  const prefix = parsePrefix(prefixValue, 128, 128);
  if (prefix === undefined) {
    return { valid: false, value: '', isPublic: false };
  }

  const normalized = normalizeIpv6(ipv6, prefix);
  return { valid: true, value: normalized, isPublic: prefix === 0 };
};

export const normalizeCidrList = (values: string[]) => {
  const normalized = values.map(normalizeCidr);

  if (normalized.some((item) => !item.valid)) return undefined;

  return Array.from(new Set(normalized.map((item) => item.value))).sort((left, right) =>
    left.localeCompare(right)
  );
};

export const isPublicCidr = (value: string) => {
  const normalized = normalizeCidr(value);
  return normalized.valid && normalized.isPublic;
};

export const validateNetworkIsolationConfig = (
  config: NetworkIsolationConfig
): NetworkIsolationValidation => {
  const applicationRuleErrors: NetworkIsolationValidation['applicationRuleErrors'] = {};
  const cidrRuleErrors: NetworkIsolationValidation['cidrRuleErrors'] = {};
  const applicationPairs = new Set<string>();
  let requiresPublicConfirmation = false;

  config.rules.forEach((rule) => {
    if (rule.type === 'application') {
      const workspaceId = rule.sourceWorkspaceId.trim();
      const applicationId = rule.sourceApplicationId.trim();

      if (!workspaceId || !applicationId) {
        applicationRuleErrors[rule.id] = 'required';
        return;
      }

      const ruleKey = `${workspaceId.toLowerCase()}::${applicationId.toLowerCase()}`;
      if (applicationPairs.has(ruleKey)) {
        applicationRuleErrors[rule.id] = 'duplicate';
        return;
      }
      applicationPairs.add(ruleKey);
      return;
    }

    if (!rule.cidrs.length) {
      cidrRuleErrors[rule.id] = 'required';
      return;
    }

    if (rule.cidrs.length > MAX_CIDRS_PER_RULE) {
      cidrRuleErrors[rule.id] = 'tooMany';
      return;
    }

    const normalized = normalizeCidrList(rule.cidrs);
    if (!normalized) {
      cidrRuleErrors[rule.id] = 'invalid';
      return;
    }

    requiresPublicConfirmation = requiresPublicConfirmation || normalized.some(isPublicCidr);
  });

  const exceedsRuleLimit = config.rules.length > MAX_NETWORK_ISOLATION_RULES;
  const valid =
    !exceedsRuleLimit &&
    Object.keys(applicationRuleErrors).length === 0 &&
    Object.keys(cidrRuleErrors).length === 0;

  return {
    applicationRuleErrors,
    cidrRuleErrors,
    exceedsRuleLimit,
    requiresPublicConfirmation,
    valid
  };
};

export const normalizeNetworkIsolationConfig = (
  config: NetworkIsolationConfig
): NetworkIsolationConfig => ({
  enabled: config.enabled,
  rules: config.rules.map((rule) => {
    if (rule.type === 'application') {
      return {
        ...rule,
        sourceWorkspaceId: rule.sourceWorkspaceId.trim(),
        sourceApplicationId: rule.sourceApplicationId.trim()
      };
    }

    const cidrs = normalizeCidrList(rule.cidrs) || rule.cidrs;
    return {
      ...rule,
      cidrs,
      allowPublic: rule.allowPublic || undefined
    };
  })
});

export const confirmPublicCidrs = (config: NetworkIsolationConfig): NetworkIsolationConfig => {
  const normalized = normalizeNetworkIsolationConfig(config);

  return {
    ...normalized,
    rules: normalized.rules.map((rule) =>
      rule.type === 'cidr' && rule.cidrs.some(isPublicCidr) ? { ...rule, allowPublic: true } : rule
    )
  };
};
