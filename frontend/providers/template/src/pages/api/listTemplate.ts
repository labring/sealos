import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { TemplateType } from '@/types/app';
import { parseGithubUrl } from '@/utils/tools';
import fs from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
const cron = require('node-cron');
let hasAddCron = false;

export function replaceRawWithCDN(url: string, cdnUrl: string) {
  let parsedUrl = parseGithubUrl(url);
  if (!parsedUrl || !cdnUrl) return url;
  if (parsedUrl.hostname === 'raw.githubusercontent.com') {
    const newUrl = `https://${cdnUrl}/gh/${parsedUrl.organization}/${parsedUrl.repository}@${parsedUrl.branch}/${parsedUrl.remainingPath}`;
    return newUrl;
  }
  return url;
}

export const readTemplates = (jsonPath: string, cdnUrl?: string) => {
  const jsonData = fs.readFileSync(jsonPath, 'utf8');
  const _templates: TemplateType[] = JSON.parse(jsonData);
  const templates = _templates
    .filter((item) => item?.spec?.draft !== true)
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

  try {
    if (!hasAddCron) {
      hasAddCron = true;
      cron.schedule('*/5 * * * *', async () => {
        const result = await (await fetch(`${baseurl}/api/updateRepo`)).json();
        console.log(`scheduling cron ${new Date().toString()}`, result);
      });
    }

    if (!fs.existsSync(jsonPath)) {
      console.log(`${baseurl}/api/updateRepo`);
      await fetch(`${baseurl}/api/updateRepo`);
    }

    const templates = readTemplates(jsonPath, cdnUrl);
    jsonRes(res, { data: templates, code: 200 });
  } catch (error) {
    jsonRes(res, { code: 500, data: 'error' });
  }
}
