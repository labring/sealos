import {
  getDefaultPrivateWorkspaceName,
  getRequestDefaultPrivateWorkspaceName,
  getRequestWorkspaceLocale,
  normalizeWorkspaceLocale
} from '@/services/backend/svc/workspaceDefaults';

describe('workspace defaults', () => {
  it('normalizes workspace locale to supported languages', () => {
    expect(normalizeWorkspaceLocale('zh')).toBe('zh');
    expect(normalizeWorkspaceLocale('zh-Hans')).toBe('zh');
    expect(normalizeWorkspaceLocale('en')).toBe('en');
    expect(normalizeWorkspaceLocale(undefined)).toBe('en');
  });

  it('returns localized private workspace names', () => {
    expect(getDefaultPrivateWorkspaceName('zh')).toBe('个人空间');
    expect(getDefaultPrivateWorkspaceName('en')).toBe('Personal Workspace');
    expect(getDefaultPrivateWorkspaceName('fr')).toBe('Personal Workspace');
  });

  it('prefers NEXT_LOCALE over Accept-Language headers', () => {
    expect(
      getRequestWorkspaceLocale({
        cookies: { NEXT_LOCALE: 'zh' },
        headers: { 'accept-language': 'en-US,en;q=0.9' }
      } as any)
    ).toBe('zh');
  });

  it('falls back to Accept-Language when locale cookie is missing', () => {
    expect(
      getRequestDefaultPrivateWorkspaceName({
        cookies: {},
        headers: { 'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8' }
      } as any)
    ).toBe('个人空间');

    expect(
      getRequestDefaultPrivateWorkspaceName({
        cookies: {},
        headers: { 'accept-language': 'en-US,en;q=0.9,zh;q=0.8' }
      } as any)
    ).toBe('Personal Workspace');
  });
});
