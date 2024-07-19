import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { TemplateType } from '@/types/app';
import { findTopKeyWords } from '@/utils/template';
import { parseGithubUrl } from '@/utils/tools';
import fs from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { Cron } from 'croner';

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
  jsonPath: string,
  cdnUrl?: string,
  blacklistedCategories?: string[]
): TemplateType[] => {
  const jsonData = fs.readFileSync(jsonPath, 'utf8');
  const _templates: TemplateType[] = JSON.parse(jsonData);

  const templates = _templates
    .filter((item) => {
      const isBlacklisted =
        blacklistedCategories &&
        blacklistedCategories.some((category) =>
          (item?.spec?.categories ?? []).map((c) => c.toLowerCase()).includes(category)
        );
      return !item?.spec?.draft && !isBlacklisted;
    })
    .map((item) => {
      if (!!cdnUrl) {
        item.spec.readme = replaceRawWithCDN(item.spec.readme, cdnUrl);
        item.spec.icon = replaceRawWithCDN(item.spec.icon, cdnUrl);
      }
      return item;
    });

  return templates;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const originalPath = process.cwd();
  const jsonPath = path.resolve(originalPath, 'templates.json');
  const cdnUrl = process.env.CDN_URL;
  const baseurl = `http://${process.env.HOSTNAME || 'localhost'}:${process.env.PORT || 3000}`;
  const blacklistedCategories = process.env.BLACKLIST_CATEGORIES
    ? process.env.BLACKLIST_CATEGORIES.split(',')
    : [];
  const menuCount = Number(process.env.SIDEBAR_MENU_COUNT) || 10;

  try {
    if (!global.updateRepoCronJob) {
      global.updateRepoCronJob = new Cron(
        '*/5 * * * *',
        async () => {
          const result = await (await fetch(`${baseurl}/api/updateRepo`)).json();
          const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
          console.log(`[${now}] updateRepoCronJob`);
        },
        {
          timezone: 'Asia/Shanghai'
        }
      );
    }

    if (!fs.existsSync(jsonPath)) {
      console.log(`${baseurl}/api/updateRepo`);
      await fetch(`${baseurl}/api/updateRepo`);
    }

    const templates = readTemplates(jsonPath, cdnUrl, blacklistedCategories);
    const categories = templates.map((item) => (item.spec?.categories ? item.spec.categories : []));
    const topKeys = findTopKeyWords(categories, menuCount);

    jsonRes(res, { data: { templates: templates, menuKeys: topKeys.join(',') }, code: 200 });
  } catch (error) {
    jsonRes(res, { code: 500, data: 'api listTemplate error', error: error });
  }
}
