import { TemplateSourceType } from '@/types/app';
import { reduce } from 'lodash';

export const getTemplateDefaultValues = (templateSource: TemplateSourceType | undefined) => {
  const inputs = templateSource?.source?.inputs;
  return reduce(
    inputs,
    (acc, item) => {
      // @ts-ignore
      acc[item.key] = item.default;
      return acc;
    },
    {}
  );
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
