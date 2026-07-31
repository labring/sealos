import { TemplateType } from '@/types/app';
import { getCategorySlugs, parseTemplateCategories } from '@/utils/template';
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { getCachedTemplates } from './templateCache';
import { sendError, ErrorType, ErrorCode } from '@/types/v2alpha/error';
import { getTemplateEnvs } from '@/utils/tools';
import {
  getTemplateCatalogVersion,
  getTemplateCategories
} from '@/services/backend/template-categories';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return sendError(res, {
      status: 405,
      type: ErrorType.CLIENT_ERROR,
      code: ErrorCode.METHOD_NOT_ALLOWED,
      message: 'Method not allowed. Use GET.'
    });
  }

  const language = (req.query.language as string) || 'en';
  const originalPath = process.cwd();
  const jsonPath = path.resolve(originalPath, 'templates.json');

  try {
    // Use shared cache instead of directly reading templates
    const configuredCategories = parseTemplateCategories(process.env.TEMPLATE_CATEGORIES);
    const templateEnvs = getTemplateEnvs();
    const templateRepo = {
      url: templateEnvs.TEMPLATE_REPO_URL,
      branch: templateEnvs.TEMPLATE_REPO_BRANCH,
      provider: templateEnvs.TEMPLATE_REPO_PROVIDER
    };
    const categories = getTemplateCategories(configuredCategories);
    const catalogVersion = getTemplateCatalogVersion(originalPath);
    const cacheResult = getCachedTemplates(
      jsonPath,
      process.env.CDN_URL,
      categories,
      language,
      templateRepo
    );
    const templates = cacheResult.data;

    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    console.log(`[${timestamp}] language: ${language}, templates count: ${templates.length}`);

    const simplifiedTemplates = templates.map((template: TemplateType) => {
      const locale = language || 'en';
      const i18nData = template.spec?.i18n?.[locale];

      return {
        name: template.metadata.name,
        resourceType: 'template',
        readme: i18nData?.readme || template.spec.readme || '',
        icon: i18nData?.icon || template.spec.icon || '',
        description: i18nData?.description || template.spec.description || '',
        gitRepo: template.spec.gitRepo || '',
        category: template.spec.categories || [],
        args: template.spec.inputs || {},
        deployCount: template.spec.deployCount || 0
      };
    });

    const menuKeys = getCategorySlugs(categories);

    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.setHeader('ETag', `"template-v2alpha-list-${language}-${catalogVersion}"`);

    if (menuKeys.length > 0) {
      res.setHeader('X-Menu-Keys', menuKeys.join(','));
    }

    res.status(200).json(simplifiedTemplates);
  } catch (error) {
    sendError(res, {
      status: 500,
      type: ErrorType.INTERNAL_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Failed to load templates.',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
