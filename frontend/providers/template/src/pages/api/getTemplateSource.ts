import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { TemplateType } from '@/types/app';
import { getTemplateDataSource, handleTemplateToInstanceYaml } from '@/utils/json-yaml';
import fs from 'fs';
import yaml from 'js-yaml';
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { replaceRawWithCDN } from './listTemplate';
import { EnvResponse } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { templateName } = req.query as { templateName: string };

    let user_namespace = '';

    try {
      const { namespace } = await getK8s({
        kubeconfig: await authSession(req.headers)
      });
      user_namespace = namespace;
    } catch (error) {
      console.log(error, 'Unauthorized allowed');
    }

    const { code, message, dataSource, templateYaml, TemplateEnvs, yamlList } =
      await GetTemplateByName({
        namespace: user_namespace,
        templateName: templateName
      });

    if (code !== 20000) {
      return jsonRes(res, { code, message });
    }

    jsonRes(res, {
      code: 200,
      data: {
        source: {
          ...dataSource,
          ...TemplateEnvs
        },
        yamlList: yamlList,
        templateYaml: templateYaml
      }
    });
  } catch (err: any) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

export async function GetTemplateByName({
  namespace,
  templateName
}: {
  namespace: string;
  templateName: string;
}) {
  const cdnUrl = process.env.CDN_URL;
  const targetFolder = process.env.TEMPLATE_REPO_FOLDER || 'template';

  const TemplateEnvs: EnvResponse = {
    SEALOS_CLOUD_DOMAIN: process.env.SEALOS_CLOUD_DOMAIN || 'cloud.sealos.io',
    SEALOS_CERT_SECRET_NAME: process.env.SEALOS_CERT_SECRET_NAME || 'wildcard-cert',
    TEMPLATE_REPO_URL:
      process.env.TEMPLATE_REPO_URL || 'https://github.com/labring-actions/templates',
    SEALOS_NAMESPACE: namespace || '',
    SEALOS_SERVICE_ACCOUNT: namespace.replace('ns-', ''),
    SHOW_AUTHOR: process.env.SHOW_AUTHOR || 'false'
  };

  const originalPath = process.cwd();
  const targetPath = path.resolve(originalPath, 'templates', targetFolder);
  // Query by file name in template details
  const jsonPath = path.resolve(originalPath, 'templates.json');
  const jsonData: TemplateType[] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const _tempalte = jsonData.find((item) => item.metadata.name === templateName);
  const _tempalteName = _tempalte ? _tempalte.spec.fileName : `${templateName}.yaml`;
  const yamlString = _tempalte?.spec?.filePath
    ? fs.readFileSync(_tempalte?.spec?.filePath, 'utf-8')
    : fs.readFileSync(`${targetPath}/${_tempalteName}`, 'utf-8');

  const yamlData = yaml.loadAll(yamlString);
  const templateYaml: TemplateType = yamlData.find(
    (item: any) => item.kind === 'Template'
  ) as TemplateType;
  if (!templateYaml) {
    return {
      code: 40000,
      message: 'Lack of kind template'
    };
  }
  templateYaml.spec.deployCount = _tempalte?.spec?.deployCount;
  if (cdnUrl) {
    templateYaml.spec.readme = replaceRawWithCDN(templateYaml.spec.readme, cdnUrl);
    templateYaml.spec.icon = replaceRawWithCDN(templateYaml.spec.icon, cdnUrl);
  }

  const yamlList = yamlData.filter((item: any) => item.kind !== 'Template');
  const dataSource = getTemplateDataSource(templateYaml, TemplateEnvs);

  // Convert template to instance
  const instanceName = dataSource?.defaults?.['app_name']?.value;
  if (!instanceName) {
    return {
      code: 40000,
      message: 'default app_name is missing'
    };
  }
  const instanceYaml = handleTemplateToInstanceYaml(templateYaml, instanceName);
  yamlList.unshift(instanceYaml);

  return {
    code: 20000,
    message: 'success',
    dataSource,
    TemplateEnvs,
    yamlList,
    templateYaml
  };
}
