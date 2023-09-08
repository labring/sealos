import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import fs from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const originalPath = process.cwd();
  const jsonPath = path.resolve(originalPath, 'fast_deploy_template.json');

  try {
    if (fs.existsSync(jsonPath)) {
      const jsonData = fs.readFileSync(jsonPath, 'utf8');
      const objects = JSON.parse(jsonData);
      return jsonRes(res, { data: objects, code: 200 });
    } else {
      return jsonRes(res, { data: [], code: 200 });
    }
  } catch (error) {
    console.log(error);
    jsonRes(res, { code: 500, data: 'error' });
  }
}
