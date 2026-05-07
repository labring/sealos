import { EnvResponse, YamlItemType } from '@/types';
import { TemplateSourceType } from '@/types/app';
import type { TemplateCategory } from '@/types/config';
import { reduce, mapValues } from 'lodash';
import { developGenerateYamlList, generateYamlList, parseTemplateString } from './json-yaml';

export const DEFAULT_TEMPLATE_CATEGORIES: TemplateCategory[] = [
  { slug: 'ai', i18n: { en: 'AI', zh: 'AI' } },
  { slug: 'backend', i18n: { en: 'Backend', zh: '后端' } },
  { slug: 'blog', i18n: { en: 'Blog', zh: '博客' } },
  { slug: 'database', i18n: { en: 'Database', zh: '数据库' } },
  { slug: 'dev-ops', i18n: { en: 'DevOps', zh: '运维' } },
  { slug: 'frontend', i18n: { en: 'Frontend', zh: '前端' } },
  { slug: 'game', i18n: { en: 'Games', zh: '游戏' } },
  { slug: 'low-code', i18n: { en: 'Low-Code', zh: '低代码' } },
  { slug: 'monitor', i18n: { en: 'Monitoring', zh: '监控' } },
  { slug: 'storage', i18n: { en: 'Storage', zh: '存储' } },
  { slug: 'tool', i18n: { en: 'Tools', zh: '工具' } }
];

export function parseTemplateCategories(value?: string): TemplateCategory[] {
  if (!value) return DEFAULT_TEMPLATE_CATEGORIES;

  try {
    const categories = JSON.parse(value);
    if (!Array.isArray(categories)) return DEFAULT_TEMPLATE_CATEGORIES;

    return categories.filter(
      (category): category is TemplateCategory =>
        typeof category?.slug === 'string' &&
        !!category.slug &&
        typeof category?.i18n === 'object' &&
        category.i18n !== null
    );
  } catch (error) {
    console.error('[Template Categories] Failed to parse TEMPLATE_CATEGORIES:', error);
    return DEFAULT_TEMPLATE_CATEGORIES;
  }
}

export function getCategorySlugs(categories: readonly TemplateCategory[] = []) {
  return categories.map((category) => category.slug).filter(Boolean);
}

export function filterConfiguredCategorySlugs(
  templateCategories: readonly string[] | undefined,
  configuredCategories: readonly TemplateCategory[] = []
) {
  if (!templateCategories?.length || !configuredCategories.length) return [];

  const configuredSlugSet = new Set(getCategorySlugs(configuredCategories));
  return templateCategories.filter((category) => configuredSlugSet.has(category));
}

export function getCategoryLabel(category: TemplateCategory, language?: string) {
  if (language && category.i18n[language]) return category.i18n[language];
  return category.i18n.en || category.i18n.zh || category.slug;
}

export const getTemplateInputDefaultValues = (templateSource: TemplateSourceType | undefined) => {
  const inputs = templateSource?.source?.inputs;
  return reduce(
    inputs,
    (acc, item) => {
      // @ts-ignore
      acc[item.key] = item.default || '';
      return acc;
    },
    {}
  );
};

export const getTemplateDefaultValues = (templateSource: TemplateSourceType | undefined) => {
  return mapValues(templateSource?.source.defaults, (value) => value.value || '');
};

export const getTemplateValues = (templateSource: TemplateSourceType | undefined) => {
  return {
    defaults: getTemplateDefaultValues(templateSource),
    defaultInputs: getTemplateInputDefaultValues(templateSource)
  };
};

export const generateYamlData = (
  templateSource: TemplateSourceType,
  inputs: Record<string, string>,
  platformEnvs?: EnvResponse,
  isDevelop: boolean = false
): YamlItemType[] => {
  if (!templateSource) return [];

  const app_name = templateSource?.source?.defaults?.app_name?.value;
  const { defaults, defaultInputs } = getTemplateValues(templateSource);

  const data = {
    ...platformEnvs,
    ...templateSource?.source,
    inputs: {
      ...defaultInputs,
      ...inputs
    },
    defaults: defaults
  };

  const generateStr = parseTemplateString(templateSource.appYaml, data);

  return isDevelop
    ? developGenerateYamlList(generateStr, app_name)
    : generateYamlList(generateStr, app_name);
};
