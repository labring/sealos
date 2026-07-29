import path from 'path';
import { TemplateType } from '@/types/app';
import type { TemplateRepoProvider } from '@/types';

type TemplateRepo = {
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

function normalizeTemplateRepoProvider(provider?: TemplateRepoProvider): TemplateRepoProvider {
  return provider || 'auto';
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function isRelativeAssetUrl(value: string) {
  return value.startsWith('./') || value.startsWith('/');
}

function normalizeUrlPath(value: string) {
  return value.replace(/\\/g, '/').split('/').filter(Boolean).map(encodeURIComponent).join('/');
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

function parseGitRepoUrl(repoUrl: string) {
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

function inferTemplateRepoProvider(host: string): Exclude<TemplateRepoProvider, 'auto'> {
  if (host === 'github.com') return 'github';
  if (host === 'gitlab.com' || host.includes('gitlab')) return 'gitlab';
  return 'gogs';
}

function getRepoAssetRawUrl(repo: TemplateRepo, assetPath: string) {
  const parsedRepo = parseGitRepoUrl(repo.url);
  if (!parsedRepo || !assetPath) return '';

  const encodedRef = encodeURIComponent(repo.branch);
  const projectPath = [...parsedRepo.ownerPath, parsedRepo.repo].map(encodeURIComponent).join('/');
  const provider = normalizeTemplateRepoProvider(repo.provider);
  const resolvedProvider =
    provider === 'auto' ? inferTemplateRepoProvider(parsedRepo.host) : provider;

  if (resolvedProvider === 'github') {
    return `https://raw.githubusercontent.com/${projectPath}/${encodedRef}/${assetPath}`;
  }

  if (resolvedProvider === 'gitlab') {
    return `${parsedRepo.origin}/${projectPath}/-/raw/${encodedRef}/${assetPath}`;
  }

  return `${parsedRepo.origin}/${projectPath}/raw/${encodedRef}/${assetPath}`;
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
