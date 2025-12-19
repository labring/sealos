import type { TextProps } from 'antd/es/typography/Text';
import { snakeCase } from 'lodash';

const conditionTextToneMap: Record<string, TextProps['type']> = {
  available: 'success',
  progressing: 'secondary',
  replica_failure: 'danger'
};

export const getConditionTextTone = (condition: string): TextProps['type'] | undefined => {
  return conditionTextToneMap[snakeCase(condition)];
};
