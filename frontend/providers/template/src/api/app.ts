import { GET, POST } from '@/services/request';
import { TemplateSourceType } from '@/types/app';

type GetTemplateSourceOptions = {
  locale?: string;
  includeReadme?: boolean;
  includeRequirements?: boolean;
};

export const postDeployApp = (
  yamlList: string[],
  type: 'create' | 'replace' | 'dryrun' = 'create'
) => POST('/api/applyApp', { yamlList, type });

export const getTemplateSource = (templateName: string, options?: GetTemplateSourceOptions) =>
  GET<TemplateSourceType>('/api/getTemplateSource', {
    templateName,
    locale: options?.locale,
    includeReadme: options?.includeReadme === undefined ? undefined : String(options.includeReadme),
    includeRequirements:
      options?.includeRequirements === undefined ? undefined : String(options.includeRequirements)
  });

export const getTemplateReadme = (templateName: string, locale?: string) =>
  GET<Pick<TemplateSourceType, 'readUrl' | 'readmeContent'>>('/api/getTemplateReadme', {
    templateName,
    locale
  });
