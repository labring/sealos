import path from 'path';
import { TemplateType } from '@/types/app';
import type { TemplateRepoProvider } from '@/types';

export type TemplateRepo = {
  url: string;
  branch: string;
  provider?: TemplateRepoProvider;
};

type ResolveTemplateAssetUrlOptions = {
  assetUrl?: string;
  repo: TemplateRepo;
  templateFilePath?: string;
  repoRootPath?: string;
};

const ASSET_FIELDS = ['readme', 'icon'] as const;
const TEMPLATE_ASSET_PROXY_PREFIX = '/api/templateAsset?path=';
const SAFE_ICON_EXTENSIONS = new Set([
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.avif'
]);

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function isProxyUrl(value: string) {
  return value.startsWith(TEMPLATE_ASSET_PROXY_PREFIX);
}

function isRelativeAssetUrl(value: string) {
  return value.startsWith('./') || value.startsWith('/');
}

function normalizeUrlPath(value: string) {
  return value.replace(/\\/g, '/').split('/').filter(Boolean).map(encodeURIComponent).join('/');
}

function normalizeSafeAssetPath(value: string) {
  const parts = value.replace(/\\/g, '/').split('/').filter(Boolean);
  if (parts.includes('..')) return '';

  const normalized = path.posix.normalize(parts.join('/'));
  if (
    !normalized ||
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    path.posix.isAbsolute(normalized)
  ) {
    return '';
  }
  return normalized;
}

function hasSafeIconExtension(assetPath: string) {
  return SAFE_ICON_EXTENSIONS.has(path.posix.extname(assetPath).toLowerCase());
}

function getRelativeBasePath(templateFilePath?: string, repoRootPath?: string) {
  if (!templateFilePath || !repoRootPath) return '';

  const relativeFilePath = path.relative(repoRootPath, templateFilePath);
  const relativeDir = path.dirname(relativeFilePath);

  return relativeDir === '.' ? '' : relativeDir.replace(/\\/g, '/');
}

function resolveRepoAssetPath(assetUrl: string, templateFilePath?: string, repoRootPath?: string) {
  const assetPath = assetUrl.replace(/^\.\/|^\//, '');

  if (assetUrl.startsWith('/')) {
    return normalizeUrlPath(assetPath);
  }

  return normalizeUrlPath(
    path.posix.join(getRelativeBasePath(templateFilePath, repoRootPath), assetPath)
  );
}

export function parseGitRepoUrl(repoUrl: string) {
  try {
    const url = new URL(repoUrl.replace(/\.git$/, ''));
    const parts = url.pathname.split('/').filter(Boolean);

    if (parts.length < 2) return null;

    return {
      host: url.host,
      origin: url.origin,
      ownerPath: parts.slice(0, -1),
      repo: parts[parts.length - 1]
    };
  } catch (error) {
    return null;
  }
}

function findSubsequence(haystack: string[], needle: string[]) {
  if (needle.length === 0 || haystack.length < needle.length) return -1;
  outer: for (let start = 0; start <= haystack.length - needle.length; start++) {
    for (let offset = 0; offset < needle.length; offset++) {
      if (haystack[start + offset] !== needle[offset]) {
        continue outer;
      }
    }
    return start;
  }
  return -1;
}

function decodeUrlPathParts(pathname: string) {
  try {
    return pathname
      .split('/')
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment));
  } catch (error) {
    return null;
  }
}

function getRepoAssetRawUrl(repo: TemplateRepo, assetPath: string) {
  const parsedRepo = parseGitRepoUrl(repo.url);
  if (!parsedRepo || !assetPath) return '';

  const encodedRef = encodeURIComponent(repo.branch);
  const projectPath = [...parsedRepo.ownerPath, parsedRepo.repo].map(encodeURIComponent).join('/');

  if (parsedRepo.host === 'github.com') {
    return `https://raw.githubusercontent.com/${projectPath}/${encodedRef}/${assetPath}`;
  }

  if (parsedRepo.host === 'gitlab.com' || parsedRepo.host.includes('gitlab')) {
    return `${parsedRepo.origin}/${projectPath}/-/raw/${encodedRef}/${assetPath}`;
  }

  return `${parsedRepo.origin}/${projectPath}/raw/${encodedRef}/${assetPath}`;
}

function getProxyableTemplateAssetPath(assetUrl: string, repo: TemplateRepo) {
  if (!assetUrl || isProxyUrl(assetUrl)) return '';
  if (/^(data|blob):/i.test(assetUrl)) return '';

  const parsedRepo = parseGitRepoUrl(repo.url);
  if (!parsedRepo) return '';

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(assetUrl);
  } catch (error) {
    return '';
  }

  const pathParts = decodeUrlPathParts(parsedUrl.pathname);
  if (!pathParts) return '';

  const repoPath = [...parsedRepo.ownerPath, parsedRepo.repo];
  const repoIndex = findSubsequence(pathParts, repoPath);
  if (repoIndex < 0) return '';

  let afterRepo = pathParts.slice(repoIndex + repoPath.length);
  if (parsedRepo.host === 'github.com' && parsedUrl.hostname === 'raw.githubusercontent.com') {
    const branch = afterRepo[0];
    if (!branch || (repo.branch && branch !== repo.branch)) return '';
    const assetPath = normalizeSafeAssetPath(afterRepo.slice(1).join('/'));
    return assetPath && hasSafeIconExtension(assetPath) ? assetPath : '';
  }

  if (afterRepo[0] === '-' && afterRepo[1] === 'raw') {
    afterRepo = afterRepo.slice(1);
  }
  if (afterRepo[0] !== 'raw') return '';

  const branchOffset = afterRepo[1] === 'branch' ? 2 : 1;
  const branch = afterRepo[branchOffset];
  if (!branch || (repo.branch && branch !== repo.branch)) return '';

  const assetPath = normalizeSafeAssetPath(afterRepo.slice(branchOffset + 1).join('/'));
  return assetPath && hasSafeIconExtension(assetPath) ? assetPath : '';
}

export function getTemplateAssetProxyUrl(assetUrl: string, repo: TemplateRepo) {
  if (!assetUrl || isProxyUrl(assetUrl)) return assetUrl || '';
  const proxyablePath = getProxyableTemplateAssetPath(assetUrl, repo);
  if (!proxyablePath) return assetUrl;
  return `${TEMPLATE_ASSET_PROXY_PREFIX}${encodeURIComponent(proxyablePath)}`;
}

type TemplateAssetResource = {
  spec: {
    icon?: string;
    i18n?: Record<string, { icon?: string; [key: string]: string | undefined }>;
  };
};

export function proxyTemplateIconUrls<T extends TemplateAssetResource>(
  template: T,
  repo: TemplateRepo
): T {
  const spec = {
    ...template.spec,
    icon: getTemplateAssetProxyUrl(template.spec.icon || '', repo)
  };

  if (template.spec.i18n) {
    spec.i18n = Object.fromEntries(
      Object.entries(template.spec.i18n).map(([lang, data]) => {
        const nextData = { ...data };
        if (nextData.icon) {
          nextData.icon = getTemplateAssetProxyUrl(nextData.icon, repo);
        }
        return [lang, nextData];
      })
    ) as typeof template.spec.i18n;
  }

  return {
    ...template,
    spec
  } as T;
}

export function resolveTemplateAssetUrl({
  assetUrl,
  repo,
  templateFilePath,
  repoRootPath
}: ResolveTemplateAssetUrlOptions) {
  if (!assetUrl || isHttpUrl(assetUrl) || !isRelativeAssetUrl(assetUrl)) {
    return assetUrl || '';
  }

  const assetPath = resolveRepoAssetPath(assetUrl, templateFilePath, repoRootPath);
  return getRepoAssetRawUrl(repo, assetPath) || assetUrl;
}

export function resolveTemplateAssetUrls(
  template: TemplateType,
  options: Omit<ResolveTemplateAssetUrlOptions, 'assetUrl'>
) {
  const resolvedTemplate = {
    ...template,
    spec: {
      ...template.spec,
      i18n: template.spec.i18n ? { ...template.spec.i18n } : template.spec.i18n
    }
  };

  ASSET_FIELDS.forEach((field) => {
    resolvedTemplate.spec[field] = resolveTemplateAssetUrl({
      ...options,
      assetUrl: resolvedTemplate.spec[field]
    });
  });

  if (resolvedTemplate.spec.i18n) {
    Object.entries(resolvedTemplate.spec.i18n).forEach(([lang, data]) => {
      const resolvedI18nData = { ...data };

      ASSET_FIELDS.forEach((field) => {
        if (resolvedI18nData[field]) {
          resolvedI18nData[field] = resolveTemplateAssetUrl({
            ...options,
            assetUrl: resolvedI18nData[field]
          });
        }
      });

      resolvedTemplate.spec.i18n![lang] = resolvedI18nData;
    });
  }

  return resolvedTemplate;
}
