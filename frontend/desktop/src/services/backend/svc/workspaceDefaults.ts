import type { NextApiRequest } from 'next';

export type WorkspaceLocale = 'zh' | 'en';

export const DEFAULT_PRIVATE_WORKSPACE_NAMES: Record<WorkspaceLocale, string> = {
  zh: '个人空间',
  en: 'Personal Workspace'
};

export function normalizeWorkspaceLocale(locale?: string | null): WorkspaceLocale {
  return locale?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function getDefaultPrivateWorkspaceName(locale?: string | null) {
  return DEFAULT_PRIVATE_WORKSPACE_NAMES[normalizeWorkspaceLocale(locale)];
}

function getPreferredWorkspaceLocale(acceptLanguageHeader: string) {
  const normalizedHeader = acceptLanguageHeader.toLowerCase();
  const indexOfZh = normalizedHeader.indexOf('zh');
  const indexOfEn = normalizedHeader.indexOf('en');
  if (indexOfZh === -1) return 'en';
  if (indexOfEn === -1 || indexOfZh < indexOfEn) return 'zh';
  return 'en';
}

export function getRequestWorkspaceLocale(req: Pick<NextApiRequest, 'cookies' | 'headers'>) {
  const cookieLocale = req.cookies?.NEXT_LOCALE;
  if (cookieLocale) return normalizeWorkspaceLocale(cookieLocale);

  const acceptLanguage = req.headers?.['accept-language'];
  const acceptLanguageHeader = Array.isArray(acceptLanguage)
    ? acceptLanguage.join(',')
    : acceptLanguage || '';
  return getPreferredWorkspaceLocale(acceptLanguageHeader);
}

export function getRequestDefaultPrivateWorkspaceName(
  req: Pick<NextApiRequest, 'cookies' | 'headers'>
) {
  return getDefaultPrivateWorkspaceName(getRequestWorkspaceLocale(req));
}
