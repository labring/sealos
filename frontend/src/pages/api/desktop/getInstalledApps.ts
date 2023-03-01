import installedApps from 'mock/installedApps';
import type { NextApiRequest, NextApiResponse } from 'next';
import { GetUserDefaultNameSpace, K8sApi, ListCRD } from '../../../services/backend/kubernetes';
import { JsonResp } from '../response';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { kubeconfig } = req.body;
  const kc = K8sApi(kubeconfig);
  const kube_user = kc.getCurrentUser();

  if (kube_user === null) {
    return res.status(400);
  }
  const meta = {
    group: 'app.sealos.io',
    version: 'v1',
    namespace: GetUserDefaultNameSpace(kube_user.name),
    plural: 'apps'
  };

  try {
    const listCrd = await ListCRD(kc, meta);
    //@ts-ignore
    const items = listCrd?.body?.items;
    let appItems = [];
    if (items) {
      appItems = items.map((item: any) => item.spec);
    }
    JsonResp([...installedApps, ...appItems], res);
  } catch (err) {
    JsonResp(installedApps, res);
  }
}
