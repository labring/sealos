import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import pluralize from 'pluralize';
export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { name, apiVersion, kind } = req.query as Record<
      'name' | 'apiVersion' | 'kind',
      undefined | null | string
    >;
    if (!name || !apiVersion || !kind) {
      return jsonRes(res, { message: 'bad request', code: 400 });
    }
    const [group, version] = apiVersion.split('/');
    if (!version || !group) return jsonRes(res, { message: 'bad request', code: 400 });
    const client = await getK8s({
      kubeconfig: await authSession(req.headers)
    });
    const plural = pluralize.plural(kind.toLocaleLowerCase());
    const result = await client.k8sCustomObjects.deleteNamespacedCustomObject(
      group,
      version,
      client.namespace,
      plural,
      name
    );

    jsonRes(res, { data: result });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
