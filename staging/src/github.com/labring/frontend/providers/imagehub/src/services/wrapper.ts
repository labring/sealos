// Application controller relative

import { parse } from '@ctrl/golang-template';

// This is a wrapper for golang's application controller's apply:start command
export const CRDTemplateBuilder = (template: string, params: any): string => {
  return parse(template, params);
};
