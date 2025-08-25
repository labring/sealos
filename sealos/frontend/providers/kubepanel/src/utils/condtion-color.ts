import { snakeCase } from 'lodash';

const conditionColorMap = {
  available: 'color-ok',
  progressing: 'color-info',
  replica_failure: 'color-error'
} as const;

export const getConditionColor = (condition: string): string | undefined => {
  return conditionColorMap[snakeCase(condition) as keyof typeof conditionColorMap];
};
