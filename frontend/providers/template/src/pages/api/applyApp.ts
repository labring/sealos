import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { V1Status } from '@kubernetes/client-node';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const { yamlList, type = 'create' } = req.body as {
    yamlList: string[];
    type: 'create' | 'replace' | 'dryrun';
  };

  if (!yamlList) {
    return jsonRes(res, {
      code: 500,
      error: 'yaml list is empty'
    });
  }

  try {
    const { applyYamlList } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const applyRes = await applyYamlList(yamlList, type);

    jsonRes(res, { data: applyRes.map((item) => item.kind) });
  } catch (err: any) {
    if (err?.kind === 'Status' && err?.apiVersion === 'v1' && err?.status) {
      if (err.code === 403) {
        if (err.message?.includes('account balance less than 0')) {
          return jsonRes(res, {
            code: 40001,
            error: '账户余额不足，请充值后重试'
          });
        }
        return jsonRes(res, {
          code: 403,
          error: err.message || '权限不足'
        });
      }

      if (err.status === 'Failure') {
        return jsonRes(res, {
          code: 500,
          error: err.message
        });
      }
    }

    return jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
