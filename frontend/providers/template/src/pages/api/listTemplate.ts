import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { TemplateType } from '@/types/app';
import fs from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const originalPath = process.cwd();
  const jsonPath = path.resolve(originalPath, 'fast_deploy_template.json');

  try {
    if (fs.existsSync(jsonPath)) {
      const jsonData = fs.readFileSync(jsonPath, 'utf8');
      const _templates: TemplateType[] = JSON.parse(jsonData);
      const templates = _templates.filter((item) => item?.spec?.draft !== true);
      console.log(`${templates.length}/${_templates?.length}`, 'templates length');
      return jsonRes(res, { data: templates, code: 200 });
    } else {
      return jsonRes(res, { data: [], code: 200 });
    }
  } catch (error) {
    console.log(error);
    jsonRes(res, { code: 500, data: 'error' });
  }
}
