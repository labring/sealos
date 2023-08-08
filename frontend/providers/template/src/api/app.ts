import { POST } from '@/services/request';

export const postDeployApp = (yamlList: string[]) => POST('/api/applyApp', { yamlList });
export const getTemplate = (templateName: string) => POST('/api/getTemplate', { templateName });
