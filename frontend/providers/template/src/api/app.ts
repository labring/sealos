import { GET, POST } from '@/services/request';
import { TemplateSourceType } from '@/types/app';

export const postDeployApp = (yamlList: string[], type: 'create' | 'replace' | 'dryrun') =>
  POST('/api/applyApp', { yamlList, type });

export const getTemplateSource = (templateName: string) =>
  GET<TemplateSourceType>('/api/getTemplateSource', { templateName });
