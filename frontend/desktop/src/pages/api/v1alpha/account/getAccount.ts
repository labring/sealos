import { jsonRes } from '@/services/backend/response';
import { AccountMeta } from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';
import { initK8s } from 'sealos-desktop-sdk/service';

// req header is kubeconfig
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { k8sCustomObjects, kube_user } = await initK8s({
      req
    });

    const account = await k8sCustomObjects.getNamespacedCustomObject({
      group: AccountMeta.group,
      version: AccountMeta.version,
      namespace: AccountMeta.namespace,
      plural: AccountMeta.plural,
      name: kube_user.name
    });

    jsonRes(res, { data: account });
  } catch (error) {
    console.log(error);
    jsonRes(res, { code: 500, data: error });
  }
}
