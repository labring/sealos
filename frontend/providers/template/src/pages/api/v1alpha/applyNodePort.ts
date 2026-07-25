import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { applyWithNodePort } from '@/services/backend/nodePortApply';
import {
  generateYamlList,
  handleTemplateToInstanceYaml,
  parseTemplateString
} from '@/utils/json-yaml';
import { mapValues, reduce } from 'lodash';
import JsYaml from 'js-yaml';
import type { NextApiRequest, NextApiResponse } from 'next';
import { GetTemplateByName } from '../getTemplateSource';

type ApplyNodePortRequestBody = {
  yamlList?: string[];
  type?: 'create' | 'replace';
  name?: string;
  template?: string;
  args?: Record<string, string>;
};

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
    const body = req.body as ApplyNodePortRequestBody;

    if (body.yamlList) {
      // Mode A: pre-rendered YAML list
      yamls = body.yamlList;
    } else if (body.template) {
      // Mode B: server-side rendering from template name
      const { name, template, args = {} } = body;
      const appName = name?.trim();
      const templateName = template.trim();

      if (!appName) {
        return jsonRes(res, { code: 400, error: 'name is required' });
      }

      if (!templateName) {
        return jsonRes(res, { code: 400, error: 'template is required' });
      }

      const { code, message, dataSource, TemplateEnvs, appYaml, templateYaml } =
        await GetTemplateByName({
          namespace,
          templateName
        });

      if (code !== 20000) {
        return jsonRes(res, { code, message });
      }

      if (!templateYaml) {
        return jsonRes(res, { code: 400, message: 'Invalid template request!' });
      }

      const firstDocSeparatorIndex = appYaml.search(/^---\s*$/m);
      if (firstDocSeparatorIndex === -1) {
        return jsonRes(res, { code: 500, error: 'Failed to process template YAML' });
      }

      const instanceYaml = handleTemplateToInstanceYaml(templateYaml, appName);
      const renderedAppYaml = `${JsYaml.dump(instanceYaml)}\n${appYaml.slice(
        firstDocSeparatorIndex
      )}`;

      const _defaults = mapValues(dataSource?.defaults, (value) => value.value);
      _defaults.app_name = appName;
      const _inputs = reduce(
        dataSource?.inputs,
        (acc, item) => {
          // @ts-ignore
          acc[item.key] = item.default;
          return acc;
        },
        {}
      );

      const generateStr = parseTemplateString(renderedAppYaml, {
        ...TemplateEnvs,
        defaults: _defaults,
        inputs: { ..._inputs, ...args }
      });
      const correctYaml = generateYamlList(generateStr, appName);
      yamls = correctYaml.map((item) => item.value);
    } else {
      return jsonRes(res, { code: 400, error: 'yamlList or template is required' });
    }

    const result = await applyWithNodePort(
      { applyYamlList, k8sCustomObjects, k8sCore, namespace },
      yamls,
      body.type || 'create',
      nodeIP
    );

    jsonRes(res, { data: result });
  } catch (err: any) {
    console.log('deploy template app with nodePort error', err);
    return jsonRes(res, handleK8sError(err));
  }
}
