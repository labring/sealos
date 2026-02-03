import { jsonRes } from '@/services/backend/response';
import { TemplateType } from '@/types/app';
import { findTopKeyWords } from '@/utils/template';
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { getCachedTemplates } from './templateCache';
import { Config } from '@/config';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const language = (req.query.language as string) || 'en';
  const originalPath = process.cwd();
  const jsonPath = path.resolve(originalPath, 'templates.json');

  // Add caching headers for GET requests
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600'); // 5min client, 10min CDN
  res.setHeader('ETag', `"template-list-${language}"`);

  try {
    // Use shared cache instead of directly reading templates
    const cacheResult = getCachedTemplates(
      jsonPath,
      Config().template.cdnHost,
      Config().template.excludedCategories,
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

    const categories = templates.map((item: TemplateType) =>
      item.spec?.categories ? item.spec.categories : []
    );
    const topKeys = findTopKeyWords(categories, Config().template.sidebarMenuCount);

    // Add menuKeys as response header if needed
    if (topKeys.length > 0) {
      res.setHeader('X-Menu-Keys', topKeys.join(','));
    }

    // Return templates array directly
    res.status(200).json(simplifiedTemplates);
  } catch (error) {
    jsonRes(res, { code: 500, data: 'api listTemplate error', error: error });
  }
}
