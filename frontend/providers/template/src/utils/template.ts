import { EnvResponse, YamlItemType } from '@/types';
import { TemplateSourceType } from '@/types/app';
import type { TemplateCategory } from '@/types/config';
import { reduce, mapValues } from 'lodash';
import { developGenerateYamlList, generateYamlList, parseTemplateString } from './json-yaml';

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
