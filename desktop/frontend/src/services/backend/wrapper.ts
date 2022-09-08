// Application controller relative

import { parse } from '@ctrl/golang-template';
import { Session } from '../../interfaces/session';

// This is a wrapper for golang's application controller's apply:start command
const CRDTemplateBuilder = (template: string, params: any): string => {
  return parse(template, params);
};

export { CRDTemplateBuilder };
