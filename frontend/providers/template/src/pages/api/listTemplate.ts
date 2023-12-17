import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { TemplateType } from '@/types/app';
import { parseGithubUrl } from '@/utils/tools';
import fs from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';

function replaceRawWithCDN(url: string, cdnUrl: string) {
  let parsedUrl = parseGithubUrl(url);
  if (!parsedUrl || !cdnUrl) return url;

  if (parsedUrl.hostname === 'raw.githubusercontent.com') {
    const newUrl = `https://${cdnUrl}/gh/${parsedUrl.organization}/${parsedUrl.repository}@${parsedUrl.branch}/${parsedUrl.remainingPath}`;
    return newUrl;
  }

  return url;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const originalPath = process.cwd();
  const jsonPath = path.resolve(originalPath, 'fast_deploy_template.json');
  const cdnUrl = process.env.CDN_URL;

  try {
    if (fs.existsSync(jsonPath)) {
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

      return jsonRes(res, { data: templates, code: 200 });
    } else {
      return jsonRes(res, { data: [], code: 200 });
    }
  } catch (error) {
    console.log(error);
    jsonRes(res, { code: 500, data: 'error' });
  }
}
