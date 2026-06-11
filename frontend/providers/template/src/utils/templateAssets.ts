import { TemplateType } from '@/types/app';
import fs from 'fs';
import path from 'path';

function hasUrlScheme(value: string) {
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

function isLocalAssetUrl(value: string) {
  return Boolean(value) && !hasUrlScheme(value) && !value.startsWith('//');
}

function hasLocalAsset(template: TemplateType, field: 'readme' | 'icon') {
  const value = template.spec[field];
  if (value && isLocalAssetUrl(value)) return true;

  if (!template.spec.i18n) return false;
  return Object.values(template.spec.i18n).some((data) => {
    const nextValue = data[field];
    return Boolean(nextValue && isLocalAssetUrl(nextValue));
  });
}

export function hasLocalTemplateAssets(template: TemplateType) {
  return hasLocalAsset(template, 'readme') || hasLocalAsset(template, 'icon');
}

export function getTemplateRepoRootPath() {
  return path.resolve(process.cwd(), 'templates');
}

function assertInRepo(repoRootPath: string, targetPath: string) {
  const root = path.resolve(repoRootPath);
  const target = path.resolve(targetPath);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error('Template asset path escapes repository root.');
  }
  return target;
}

export function resolveTemplateRelativeAssetPath(
  templateFilePath: string,
  assetUrl: string,
  repoRootPath = getTemplateRepoRootPath()
) {
  if (!isLocalAssetUrl(assetUrl)) return '';

  const normalizedTemplateFile = path.resolve(templateFilePath);
  assertInRepo(repoRootPath, normalizedTemplateFile);
  const baseDir = path.dirname(normalizedTemplateFile);
  const assetPath = assetUrl.startsWith('/')
    ? path.resolve(repoRootPath, assetUrl.replace(/^\//, ''))
    : path.resolve(baseDir, assetUrl.replace(/^\.\//, ''));

  return assertInRepo(repoRootPath, assetPath);
}

export function resolveTemplateAssetApiUrl(
  templateName: string,
  assetUrl: string,
  locale?: string
) {
  if (!isLocalAssetUrl(assetUrl)) return assetUrl || '';

  const query = new URLSearchParams({
    templateName,
    asset: assetUrl
  });
  if (locale) query.set('locale', locale);
  return `/api/templateAsset?${query.toString()}`;
}

export function rewriteTemplateAssetsToLocalApi(template: TemplateType) {
  const templateName = template.metadata.name;
  const resolved = {
    ...template,
    spec: {
      ...template.spec,
      i18n: template.spec.i18n ? { ...template.spec.i18n } : template.spec.i18n
    }
  };

  resolved.spec.readme = resolveTemplateAssetApiUrl(templateName, resolved.spec.readme);
  resolved.spec.icon = resolveTemplateAssetApiUrl(templateName, resolved.spec.icon);

  if (resolved.spec.i18n) {
    Object.entries(resolved.spec.i18n).forEach(([lang, data]) => {
      const nextData = { ...data };
      if (nextData.readme) {
        nextData.readme = resolveTemplateAssetApiUrl(templateName, nextData.readme, lang);
      }
      if (nextData.icon) {
        nextData.icon = resolveTemplateAssetApiUrl(templateName, nextData.icon, lang);
      }
      resolved.spec.i18n![lang] = nextData;
    });
  }

  return resolved;
}

export function findTemplateByName(jsonPath: string, templateName: string) {
  const jsonData: TemplateType[] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  return jsonData.find((item) => item.metadata.name === templateName);
}

export function readTemplateAssetFile({
  jsonPath,
  templateName,
  assetUrl,
  repoRootPath = getTemplateRepoRootPath()
}: {
  jsonPath: string;
  templateName: string;
  assetUrl: string;
  repoRootPath?: string;
}) {
  const template = findTemplateByName(jsonPath, templateName);
  if (!template?.spec?.filePath) {
    throw new Error('Template not found.');
  }

  const targetPath = resolveTemplateRelativeAssetPath(
    template.spec.filePath,
    assetUrl,
    repoRootPath
  );
  if (!targetPath || !fs.existsSync(targetPath)) {
    throw new Error('Template asset not found.');
  }

  return {
    path: targetPath,
    content: fs.readFileSync(targetPath)
  };
}
