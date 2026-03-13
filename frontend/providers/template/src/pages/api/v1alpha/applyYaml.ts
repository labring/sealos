import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { applyWithInstanceOwnerReferences } from '@/services/backend/instanceOwnerReferencesApply';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { yamlList } = req.body as {
    yamlList: string[];
  };

  if (!yamlList) {
    return jsonRes(res, {
      code: 500,
      error: 'yaml list is empty'
    });
  }

  try {
    const { applyYamlList, k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const { appliedKinds } = await applyWithInstanceOwnerReferences(
      { applyYamlList, k8sCustomObjects, namespace },
      yamlList,
      'create'
    );

    jsonRes(res, { data: appliedKinds, message: 'success' });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
