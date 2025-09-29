import { EnvResponse, YamlItemType } from '@/types';
import { TemplateSourceType } from '@/types/app';
import { reduce, mapValues } from 'lodash';
import { developGenerateYamlList, generateYamlList, parseTemplateString } from './json-yaml';

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

export function findTopKeyWords(keywordsList: string[][], topCount: number) {
  const flatKeywordsList = keywordsList.filter(Boolean).flat();

  const keywordCountMap = new Map();

  flatKeywordsList.forEach((keyword) => {
    const count = keywordCountMap.get(keyword) || 0;
    keywordCountMap.set(keyword, count + 1);
  });

  const sortedKeywords = Array.from(keywordCountMap.entries()).sort((a, b) => b[1] - a[1]);

  const topKeywords = sortedKeywords.slice(0, topCount).map((entry) => entry[0]);

  return topKeywords;
}

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
