import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { applyWithNodePort } from '@/services/backend/nodePortApply';
import { generateYamlList, parseTemplateString } from '@/utils/json-yaml';
import { mapValues, reduce } from 'lodash';
import type { NextApiRequest, NextApiResponse } from 'next';
import { GetTemplateByName } from '../getTemplateSource';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const nodeIP = process.env.SEALOS_NODE_IP;
    if (!nodeIP) {
      return jsonRes(res, { code: 500, error: 'SEALOS_NODE_IP not configured' });
    }

    const { applyYamlList, k8sCustomObjects, k8sCore, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    let yamls: string[];

    if (req.body.yamlList) {
      // Mode A: pre-rendered YAML list
      yamls = req.body.yamlList;
    } else if (req.body.templateName) {
      // Mode B: server-side rendering from template name
      const { templateName, templateForm = {} } = req.body as {
        templateName: string;
        templateForm: Record<string, string>;
      };

      const { code, message, dataSource, TemplateEnvs, appYaml } = await GetTemplateByName({
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

      const generateStr = parseTemplateString(appYaml || '', {
        ...TemplateEnvs,
        defaults: _defaults,
        inputs: { ..._inputs, ...templateForm }
      });
      const correctYaml = generateYamlList(generateStr, app_name);
      yamls = correctYaml.map((item) => item.value);
    } else {
      return jsonRes(res, { code: 400, error: 'yamlList or templateName is required' });
    }

    const result = await applyWithNodePort(
      { applyYamlList, k8sCustomObjects, k8sCore, namespace },
      yamls,
      req.body.type || 'create',
      nodeIP
    );

    jsonRes(res, { data: result });
  } catch (err: any) {
    console.log('deploy template app with nodePort error', err);
    return jsonRes(res, handleK8sError(err));
  }
}
