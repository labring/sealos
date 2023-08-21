import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { TemplateType } from '@/types/app';
import { getTemplateDataSource } from '@/utils/json-yaml';
import fs from 'fs';
import yaml from 'js-yaml';
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { templateName } = req.body;
    let user_namespace = '';

    try {
      const { namespace } = await getK8s({
        kubeconfig: await authSession(req.headers)
      });
      user_namespace = namespace;
    } catch (error) {
      console.log(error, 'errpr-');
    }

    const TemplateEnvs = {
      SEALOS_CLOUD_DOMAIN: process.env.SEALOS_CLOUD_DOMAIN || 'cloud.sealos.io',
      SEALOS_CERT_SECRET_NAME: process.env.SEALOS_CERT_SECRET_NAME || 'wildcard-cert',
      SEALOS_NAMESPACE: user_namespace || ''
    };

    const originalPath = process.cwd();
    const targetPath = path.resolve(originalPath, 'FastDeployTemplates', 'template');

    const yamlString = fs.readFileSync(`${targetPath}/${templateName}.yaml`, 'utf-8');

    const yamlData = yaml.loadAll(yamlString);
    const templateYaml: TemplateType = yamlData.find(
      (item: any) => item.kind === 'Template'
    ) as TemplateType;
    const yamlList = yamlData.filter((item: any) => item.kind !== 'Template');
    const dataSource = getTemplateDataSource(templateYaml);

    jsonRes(res, {
      code: 200,
      data: {
        source: {
          ...dataSource,
          ...TemplateEnvs
        },
        yamlList: yamlList
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
