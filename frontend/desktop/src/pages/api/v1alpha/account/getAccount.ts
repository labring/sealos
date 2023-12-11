import { AccountMeta } from '@/pages/api/account/getAccount';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { initK8s } from 'sealos-desktop-sdk/service';

// req header is kubeconfig
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { k8sCustomObjects, kube_user } = await initK8s({
      req
    });

    const { body } = await k8sCustomObjects.getNamespacedCustomObject(
      AccountMeta.group,
      AccountMeta.version,
      AccountMeta.namespace,
      AccountMeta.plural,
      kube_user.name
    );

    jsonRes(res, { data: body });
  } catch (error) {
    console.log(error);
    jsonRes(res, { code: 500, data: error });
  }
}
