const MARKETING_QUERY_KEYS = ['sea_attr', 'consent_token'] as const;
const MARKETING_QUERY_STORAGE_KEY = 'sealos_marketing_query_v1';
const MARKETING_QUERY_MAX_LENGTH = {
  sea_attr: 16384,
  consent_token: 8192
} as const;

export type MarketingQuery = Partial<Record<(typeof MARKETING_QUERY_KEYS)[number], string>>;

function firstQueryValue(value: unknown, maxLength: number): string | undefined {
  if (typeof value === 'string' && value.trim() && value.length <= maxLength) {
    return value;
  }
  if (Array.isArray(value)) {
    const first = value.find(
      (item) => typeof item === 'string' && item.trim() && item.length <= maxLength
    );
    return typeof first === 'string' ? first : undefined;
  }
  return undefined;
}

export function marketingQueryFromRecord(record: Record<string, unknown>): MarketingQuery {
  const result: MarketingQuery = {};
  for (const key of MARKETING_QUERY_KEYS) {
    const value = firstQueryValue(record[key], MARKETING_QUERY_MAX_LENGTH[key]);
    if (value) {
      result[key] = value;
    }
  }
  return result;
}

export function resolveMarketingQuery(record: Record<string, unknown>): MarketingQuery {
  const persisted = readPersistedMarketingQuery();
  const current = marketingQueryFromRecord(record);
  const query = { ...persisted, ...current };
  if (current.sea_attr && current.sea_attr !== persisted.sea_attr && !current.consent_token) {
    delete query.consent_token;
  }
  return query;
}

function hasMarketingQuery(query: MarketingQuery): boolean {
  return MARKETING_QUERY_KEYS.some((key) => !!query[key]);
}

export function mergeMarketingQuery(raw: string | undefined, query: MarketingQuery): string {
  const params = new URLSearchParams(raw || '');
  for (const key of MARKETING_QUERY_KEYS) {
    const value = query[key];
    if (value) {
      params.set(key, value);
    }
  }
  return params.toString();
}

export function appendMarketingQuery(path: string, query: MarketingQuery): string {
  if (!hasMarketingQuery(query)) {
    return path;
  }
  const url = new URL(path, 'https://desktop.sealos.local');
  for (const key of MARKETING_QUERY_KEYS) {
    const value = query[key];
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function persistMarketingQuery(query: MarketingQuery): void {
  if (!hasMarketingQuery(query) || typeof window === 'undefined') {
    return;
  }
  try {
    sessionStorage.setItem(MARKETING_QUERY_STORAGE_KEY, JSON.stringify(query));
  } catch {
    // Session storage is optional in private browsing contexts.
  }
}

function readPersistedMarketingQuery(): MarketingQuery {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const parsed = JSON.parse(sessionStorage.getItem(MARKETING_QUERY_STORAGE_KEY) || '{}');
    return marketingQueryFromRecord(parsed && typeof parsed === 'object' ? parsed : {});
  } catch {
    return {};
  }
}
