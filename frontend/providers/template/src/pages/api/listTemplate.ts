import { jsonRes } from '@/services/backend/response';
import { TemplateType } from '@/types/app';
import {
  filterConfiguredCategorySlugs,
  getCategorySlugs,
  parseTemplateCategories
} from '@/utils/template';
import type { TemplateCategory } from '@/types/config';
import { getTemplateEnvs, parseGithubUrl } from '@/utils/tools';
import { proxyTemplateIconUrls, type TemplateRepo } from '@/utils/templateAsset';
import fs from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import {
  createTemplateCatalogEtag,
  getTemplateCatalogVersion,
  getTemplateCategories
} from '@/services/backend/template-categories';
import { ensureTemplateRepoFresh } from '@/services/backend/template-repo';

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
  language?: string,
  templateRepo?: TemplateRepo
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

      const template = {
        ...item,
        spec
      };
      return templateRepo ? proxyTemplateIconUrls(template, templateRepo) : template;
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
  language?: string,
  templateRepo?: TemplateRepo
): TemplateType[] =>
  readTemplates(
    fs.readFileSync(jsonPath, 'utf8'),
    cdnUrl,
    configuredCategories,
    language,
    templateRepo
  );

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const language = req.query.language as string;

  const originalPath = process.cwd();
  const jsonPath = path.resolve(originalPath, 'templates.json');
  const cdnUrl = process.env.CDN_URL;
  const configuredCategories = parseTemplateCategories(process.env.TEMPLATE_CATEGORIES);
  const templateEnvs = getTemplateEnvs();
  const templateRepo = {
    url: templateEnvs.TEMPLATE_REPO_URL,
    branch: templateEnvs.TEMPLATE_REPO_BRANCH,
    provider: templateEnvs.TEMPLATE_REPO_PROVIDER
  };

  try {
    await ensureTemplateRepoFresh(originalPath);

    const templates = readTemplatesFromFile(
      jsonPath,
      cdnUrl,
      getTemplateCategories(configuredCategories),
      language,
      templateRepo
    );

    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    console.log(`[${timestamp}] language: ${language}, templates count: ${templates.length}`);

    const categories = getTemplateCategories(configuredCategories);
    const menuKeys = getCategorySlugs(categories).join(',');

    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.setHeader(
      'ETag',
      createTemplateCatalogEtag([
        'listTemplate',
        language || 'default',
        getTemplateCatalogVersion()
      ])
    );

    jsonRes(res, {
      data: { templates: templates, menuKeys, categories },
      code: 200
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: 'api listTemplate error', error: error });
  }
}
