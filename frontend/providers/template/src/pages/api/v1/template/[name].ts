import { jsonRes } from '@/services/backend/response';
import { generateYamlData, getTemplateDefaultValues } from '@/utils/template';
import fs from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { getResourceUsage, ResourceUsage } from '@/utils/usage';
import { readTemplates } from '../../listTemplate';
import { GetTemplateByName } from '../../getTemplateSource';

function simplifyResourceValue(
  resource: { min: number; max: number },
  divisor: number = 1
): number | { min: number; max: number } {
  const convertedMin = Number((resource.min / divisor).toFixed(2));
  const convertedMax = Number((resource.max / divisor).toFixed(2));

  return convertedMin === convertedMax ? convertedMax : { min: convertedMin, max: convertedMax };
}

function simplifyResourceUsage(resource: ResourceUsage) {
  return {
    cpu: simplifyResourceValue(resource.cpu, 1000),
    memory: simplifyResourceValue(resource.memory, 1024),
    storage: simplifyResourceValue(resource.storage, 1024),
    nodeport: resource.nodeport
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { name: templateName } = req.query as { name: string };
  const language = (req.query.language as string) || 'en';

  if (!templateName) {
    return jsonRes(res, {
      code: 400,
      message: 'Template name is required'
    });
  }

  try {
    const originalPath = process.cwd();
    const jsonPath = path.resolve(originalPath, 'templates.json');
    const cdnUrl = process.env.CDN_URL;

    if (!fs.existsSync(jsonPath)) {
      return jsonRes(res, {
        code: 404,
        message: 'Templates not found'
      });
    }

    const templates = readTemplates(jsonPath, cdnUrl, [], language);
    const template = templates.find((t) => t.metadata.name === templateName);

    if (!template) {
      return jsonRes(res, {
        code: 404,
        message: `Template '${templateName}' not found`
      });
    }

    const locale = language || 'en';
    const i18nData = template.spec?.i18n?.[locale];

    let simplifiedResource = null;
    try {
      const templateDetail = await GetTemplateByName({
        namespace: '',
        templateName,
        locale: 'en',
        includeReadme: 'false'
      });

      if (
        templateDetail.code === 20000 &&
        templateDetail.templateYaml &&
        templateDetail.appYaml &&
        templateDetail.TemplateEnvs
      ) {
        const templateSource = {
          source: {
            ...templateDetail.dataSource,
            ...templateDetail.TemplateEnvs
          },
          appYaml: templateDetail.appYaml,
          templateYaml: templateDetail.templateYaml
        };

        const renderedYaml = generateYamlData(
          templateSource,
          getTemplateDefaultValues(templateSource),
          templateDetail.TemplateEnvs
        );

        const resourceUsage = getResourceUsage(renderedYaml.map((item) => item.value));
        simplifiedResource = simplifyResourceUsage(resourceUsage);
      }
    } catch (error) {}

    if (!simplifiedResource && template.spec.requirements) {
      const staticReq = template.spec.requirements as any;
      if (staticReq.cpu && typeof staticReq.cpu === 'object' && 'min' in staticReq.cpu) {
        simplifiedResource = simplifyResourceUsage(staticReq as ResourceUsage);
      } else {
        simplifiedResource = staticReq;
      }
    }

    const result = {
      name: template.metadata.name,
      uid: template.metadata.uid,
      resourceType: 'template',
      resource: simplifiedResource,
      readme: i18nData?.readme || template.spec.readme || '',
      icon: i18nData?.icon || template.spec.icon || '',
      description: i18nData?.description || template.spec.description || '',
      gitRepo: template.spec.gitRepo || '',
      category: template.spec.categories || [],
      input: template.spec.inputs || {},
      deployCount: template.spec.deployCount || 0
    };

    jsonRes(res, {
      data: result,
      code: 200
    });
  } catch (error) {
    console.error('Error in template detail API:', error);
    jsonRes(res, {
      code: 500,
      message: 'Failed to get template details',
      error: error
    });
  }
}
