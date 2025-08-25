import { TemplateSourceType } from '@/types/app';
import { reduce, mapValues } from 'lodash';

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
