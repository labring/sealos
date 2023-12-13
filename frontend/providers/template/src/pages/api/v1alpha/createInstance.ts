import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { generateYamlList, parseTemplateString } from '@/utils/json-yaml';
import JSYAML from 'js-yaml';
import { mapValues, reduce } from 'lodash';
import type { NextApiRequest, NextApiResponse } from 'next';
import { GetTemplateByName } from '../getTemplateSource';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { templateName, templateForm } = req.body as {
      templateName: string;
      templateForm: Record<string, string>;
    };

    const { namespace, applyYamlList } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const { code, message, dataSource, templateYaml, TemplateEnvs, yamlList } =
      await GetTemplateByName({
        namespace,
        templateName
      });

    if (code !== 20000) {
      return jsonRes(res, { code, message });
    }

    const app_name = dataSource?.defaults?.app_name?.value || '';
    const _defaults = mapValues(dataSource?.defaults, (value) => value.value);
    const _inputs = reduce(
      dataSource?.inputs,
      (acc, item) => {
        // @ts-ignore
        acc[item.key] = item.default;
        return acc;
      },
      {}
    );
    const yamlString = yamlList?.map((item) => JSYAML.dump(item)).join('---\n');

    const generateStr = parseTemplateString(yamlString!, /\$\{\{\s*(.*?)\s*\}\}/g, {
      ...TemplateEnvs,
      defaults: _defaults,
      inputs: { ..._inputs, ...templateForm }
    });
    const correctYaml = generateYamlList(generateStr, app_name);

    const yamls = correctYaml.map((item) => item.value);

    const applyRes = await applyYamlList(yamls, 'create');

    jsonRes(res, {
      code: 200,
      data: applyRes
    });
  } catch (err: any) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
