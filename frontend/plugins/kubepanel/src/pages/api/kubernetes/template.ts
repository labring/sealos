import fs from 'fs';
import { sendErrorResponse } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';
import { isObject, isString } from 'lodash';
import { hasTypedProperty } from '@/k8slens/utilities';
import { ErrnoCode, buildErrno } from '@/services/backend/error';
import { TemplateQuery, TemplateResponse } from '@/types/api/kubenertes';
function isTemplateQuery(query: unknown): query is TemplateQuery {
  return isObject(query) && hasTypedProperty(query, 'kind', isString);
}

export default function handler(req: NextApiRequest, resp: NextApiResponse<TemplateResponse>) {
  try {
    if (req.method !== 'GET')
      throw buildErrno('Request Method is not allowed', ErrnoCode.UserMethodNotAllow);

    if (!isTemplateQuery(req.query))
      throw buildErrno(`There has some invalid query in ${req.query}`, ErrnoCode.UserBadRequest);

    const { kind } = req.query;
    const templatePath = `${process.cwd()}/public/create-resource-templates/${kind}.yaml`;

    if (!fs.existsSync(templatePath))
      throw buildErrno(`Template "${kind}" not found`, ErrnoCode.UserBadRequest);

    const template = fs.readFileSync(templatePath, 'utf8');
    if (template === '')
      throw buildErrno(`Read template "${kind}" failed`, ErrnoCode.ServerInternalError);

    resp.status(200).json({
      code: 200,
      data: template
    });
  } catch (err: any) {
    sendErrorResponse(resp, err);
  }
}
