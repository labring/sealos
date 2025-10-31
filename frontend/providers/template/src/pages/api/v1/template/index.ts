import { jsonRes } from '@/services/backend/response';
import { TemplateType } from '@/types/app';
import { findTopKeyWords } from '@/utils/template';
import fs from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { Cron } from 'croner';
import { readTemplates } from '../../listTemplate';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const language = (req.query.language as string) || 'en';
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
          await fetch(`${baseurl}/api/updateRepo`);
          const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' });
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

    const templates = readTemplates(jsonPath, cdnUrl, blacklistedCategories, language);

    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    console.log(`[${timestamp}] language: ${language}, templates count: ${templates.length}`);

    const simplifiedTemplates = templates.map((template: TemplateType) => {
      const locale = language || 'en';
      const i18nData = template.spec?.i18n?.[locale];

      return {
        name: template.metadata.name,
        uid: template.metadata.uid,
        resourceType: 'template',
        readme: i18nData?.readme || template.spec.readme || '',
        icon: i18nData?.icon || template.spec.icon || '',
        description: i18nData?.description || template.spec.description || '',
        gitRepo: template.spec.gitRepo || '',
        category: template.spec.categories || [],
        input: template.spec.inputs || {},
        deployCount: template.spec.deployCount || 0
      };
    });

    const categories = templates.map((item: TemplateType) =>
      item.spec?.categories ? item.spec.categories : []
    );
    const topKeys = findTopKeyWords(categories, menuCount);

    jsonRes(res, {
      data: {
        templates: simplifiedTemplates,
        menuKeys: topKeys.join(',')
      },
      code: 200
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: 'api listTemplate error', error: error });
  }
}
