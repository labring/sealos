import {
  appendMarketingQuery,
  clearPersistedMarketingQuery,
  marketingQueryFromRecord,
  mergeMarketingQuery,
  resolveMarketingQuery
} from '@/utils/marketing-attribution';

describe('marketing attribution query propagation', () => {
  it('keeps only the signed attribution parameters from router input', () => {
    expect(
      marketingQueryFromRecord({
        consent_token: 'token-1',
        sea_attr: ['state-1', 'state-2'],
        openapp: 'system-brain'
      })
    ).toEqual({ consent_token: 'token-1', sea_attr: 'state-1' });
  });

  it('merges current attribution over stale query parameters', () => {
    expect(
      mergeMarketingQuery('templateName=n8n&sea_attr=old-state&consent_token=old-token', {
        consent_token: 'token-1',
        sea_attr: 'state-1'
      })
    ).toBe('templateName=n8n&sea_attr=state-1&consent_token=token-1');
  });

  it('appends attribution to redirects', () => {
    expect(appendMarketingQuery('/?openapp=system-brain', { sea_attr: 'state-1' })).toBe(
      '/?openapp=system-brain&sea_attr=state-1'
    );
  });

  it('drops a persisted consent token when a new attribution payload arrives', () => {
    const storage = new Map<string, string>([
      [
        'sealos_marketing_query_v1',
        JSON.stringify({ consent_token: 'old-token', sea_attr: 'old-state' })
      ]
    ]);
    vi.stubGlobal('window', {});
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => storage.get(key) || null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key)
    });

    expect(resolveMarketingQuery({ sea_attr: 'new-state' })).toEqual({
      sea_attr: 'new-state'
    });
    vi.unstubAllGlobals();
  });

  it('clears persisted attribution on logout', () => {
    const storage = new Map<string, string>([
      ['sealos_marketing_query_v1', JSON.stringify({ sea_attr: 'state-1' })]
    ]);
    vi.stubGlobal('window', {});
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => storage.get(key) || null,
      removeItem: (key: string) => storage.delete(key)
    });

    clearPersistedMarketingQuery();

    expect(storage.has('sealos_marketing_query_v1')).toBe(false);
    vi.unstubAllGlobals();
  });
});
