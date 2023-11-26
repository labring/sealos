import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import { isString, startCase } from 'lodash';
import { mustGetTypedProperty } from '@/utils/api';

export default function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const name = mustGetTypedProperty(req.query, 'name', isString, 'string');

    const templatePath = `${process.cwd()}/public/create-resource-templates/${name}.yaml`;

    if (!fs.existsSync(templatePath)) throw new Error(`template "${startCase(name)}" not found`);

    const template = fs.readFileSync(templatePath, 'utf8');
    if (template === '') throw new Error(`read template "${startCase(name)}" failed`);

    jsonRes(res, {
      code: 200,
      data: template
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
