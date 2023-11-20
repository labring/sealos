import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';
import { GetTemplateByName } from '../getTemplateSource';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { templateName } = req.query as { templateName: string };

    const { namespace } = await getK8s({
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
