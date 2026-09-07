import { jsonRes } from '@/services/backend/response';

import fs from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { getTemplateCategories } from '@/services/backend/template-categories';
import { filterConfiguredCategorySlugs, parseTemplateCategories } from '@/utils/template';
import { TemplateType } from '@/types/app';
import { ensureTemplateRepoFresh } from '@/services/backend/template-repo';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const originalPath = process.cwd();
  const jsonPath = path.resolve(originalPath, 'templates.json');

  try {
    await ensureTemplateRepoFresh(originalPath);

    if (fs.existsSync(jsonPath)) {
      const categories = getTemplateCategories(
        parseTemplateCategories(process.env.TEMPLATE_CATEGORIES)
      );
      const jsonData = fs.readFileSync(jsonPath, 'utf8');
      const _templates: TemplateType[] = JSON.parse(jsonData);
      const templates = _templates
        .filter((item) => item?.spec?.draft !== true)
        .map((item) => ({
          ...item,
          spec: {
            ...item.spec,
            categories: filterConfiguredCategorySlugs(item.spec.categories, categories)
          }
        }));
      return jsonRes(res, { data: templates, code: 200 });
    } else {
      return jsonRes(res, { data: [], code: 200 });
    }
  } catch (error) {
    console.log(error);
    jsonRes(res, { code: 500, data: 'error' });
  }
}
