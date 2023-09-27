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
