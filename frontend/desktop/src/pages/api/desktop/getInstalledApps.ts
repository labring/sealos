// import MockInstalAPPs from 'mock/installedApps';
import type { NextApiRequest, NextApiResponse } from 'next';
import { authSession } from 'services/backend/auth';
import { GetUserDefaultNameSpace, K8sApi, ListCRD } from '../../../services/backend/kubernetes';
import { JsonResp } from '../response';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const kubeconfig = await authSession(req.headers);
    const kc = K8sApi(kubeconfig);
    const kube_user = kc.getCurrentUser();
    if (kube_user === null) {
      return res.status(400);
    }

    const defaultMeta = {
      group: 'app.sealos.io',
      version: 'v1',
      namespace: 'app-system',
      plural: 'apps'
    };

    const meta = {
      group: 'app.sealos.io',
      version: 'v1',
      namespace: GetUserDefaultNameSpace(kube_user.name),
      plural: 'apps'
    };

    const defaultResult = await ListCRD(kc, defaultMeta);
    const userResult = await ListCRD(kc, meta);

    //@ts-ignore
    const defaultArr = defaultResult?.body?.items.map((item: any) => {
      return { key: `system-${item.metadata.name}`, ...item.spec };
    });
    //@ts-ignore
    const userArr = userResult?.body?.items.map((item: any) => {
      return { key: `user-${item.metadata.name}`, ...item.spec };
    });

    let apps = [...defaultArr, ...userArr];

    // if (process.env.NODE_ENV === 'development') {
    //   apps = apps.concat(MockInstalAPPs)
    // }
    JsonResp(apps, res);
  } catch (err) {
    // console.log(err);
    JsonResp([], res);
  }
}
