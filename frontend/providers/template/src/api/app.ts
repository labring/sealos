import { POST } from '@/services/request';

export const postDeployApp = (yamlList: string[], type: 'create' | 'replace' | 'dryrun') =>
  POST('/api/applyApp', { yamlList, type });

export const getTemplate = (templateName: string) => POST('/api/getTemplate', { templateName });

export const getKindTemplate = (templateName: string) =>
  POST('/api/getKindTemplate', { templateName });
