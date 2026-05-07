import { TemplateType } from '@/types/app';
import { getCategorySlugs } from '@/utils/template';
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { getCachedTemplates } from './templateCache';
import { Config } from '@/config';
import { sendError, ErrorType, ErrorCode } from '@/types/v2alpha/error';

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

  // Add caching headers for GET requests
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600'); // 5min client, 10min CDN
  res.setHeader('ETag', `"template-list-${language}"`);

  try {
    // Use shared cache instead of directly reading templates
    const config = Config();
    const cacheResult = getCachedTemplates(
      jsonPath,
      config.template.cdnHost,
      config.template.categories,
      language
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

    const menuKeys = getCategorySlugs(config.template.categories);

    // Add menuKeys as response header if needed
    if (menuKeys.length > 0) {
      res.setHeader('X-Menu-Keys', menuKeys.join(','));
    }

    // Return templates array directly
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
