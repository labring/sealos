import { jsonRes } from '@/services/backend/response';
import { TemplateType } from '@/types/app';
import { filterConfiguredCategorySlugs, getCategorySlugs } from '@/utils/template';
import { getConfiguredTemplateCategories } from '@/utils/templateCategories.server';
import type { TemplateCategory } from '@/types/config';
import { parseGithubUrl } from '@/utils/tools';
import fs from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { ensureRepoFresh } from '@/services/backend/template-repo';

export function replaceRawWithCDN(url: string, cdnUrl: string) {
  let parsedUrl = parseGithubUrl(url);
  if (!parsedUrl || !cdnUrl) return url;
  if (parsedUrl.hostname === 'raw.githubusercontent.com') {
    const newUrl = `https://${cdnUrl}/gh/${parsedUrl.organization}/${parsedUrl.repository}@${parsedUrl.branch}/${parsedUrl.remainingPath}`;
    return newUrl;
  }
  return url;
}

export const readTemplates = (
  jsonData: string,
  cdnUrl?: string,
  configuredCategories: TemplateCategory[] = [],
  language?: string
): TemplateType[] => {
  const _templates: TemplateType[] = JSON.parse(jsonData);

  const templates = _templates
    .filter((item) => !item?.spec?.draft)
    .map((item) => {
      const spec = {
        ...item.spec,
        categories: filterConfiguredCategorySlugs(item.spec.categories, configuredCategories)
      };

      if (cdnUrl) {
        spec.readme = replaceRawWithCDN(spec.readme, cdnUrl);
        spec.icon = replaceRawWithCDN(spec.icon, cdnUrl);
      }

      return {
        ...item,
        spec
      };
    })
    .filter((item) => {
      if (!language) return true;

      if (!item.spec.locale) return true;

      if (item.spec.locale === language || (item.spec.i18n && item.spec.i18n[language]))
        return true;

      return false;
    });

  return templates;
};

export const readTemplatesFromFile = (
  jsonPath: string,
  cdnUrl?: string,
  configuredCategories: TemplateCategory[] = [],
  language?: string
): TemplateType[] =>
  readTemplates(fs.readFileSync(jsonPath, 'utf8'), cdnUrl, configuredCategories, language);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const language = req.query.language as string;

  const originalPath = process.cwd();
  const jsonPath = path.resolve(originalPath, 'templates.json');
  const cdnUrl = process.env.CDN_URL;
  const repoRootPath = path.resolve(originalPath, 'templates');

  try {
    await ensureRepoFresh();

    const configuredCategories = getConfiguredTemplateCategories(repoRootPath);
    const templates = readTemplatesFromFile(jsonPath, cdnUrl, configuredCategories, language);

    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    console.log(`[${timestamp}] language: ${language}, templates count: ${templates.length}`);

    const menuKeys = getCategorySlugs(configuredCategories).join(',');

    jsonRes(res, {
      data: { templates: templates, menuKeys, categories: configuredCategories },
      code: 200
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: 'api listTemplate error', error: error });
  }
}
