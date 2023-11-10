import { ApiBaseParamsMap } from '@/constants/kube-api';
import { ResourceKey } from '@/constants/kube-object';
<<<<<<<< HEAD:frontend/plugins/kubepanel/src/pages/api/delete.ts
import { deleteResource } from '@/services/backend/api';
========
import { createResource } from '@/services/backend/api';
>>>>>>>> ce505fc3 (feat: added delete resource function):frontend/plugins/kubepanel/src/pages/api/create.ts
import { authSession } from '@/services/backend/auth';
import { getKubeApiParams } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'DELETE') throw new Error(`Method not allowed: ${req.method}`);

    const { resource, name } = req.query;
    if (typeof resource !== 'string') throw new Error(`invalid resource ${resource}`);
    if (typeof name !== 'string') throw new Error(`invalid name ${name}`);

    const apiBaseParams = ApiBaseParamsMap[resource as ResourceKey];
    if (!apiBaseParams) throw new Error(`invalid resource ${resource}`);

    const { serverUrl, requestOpts, namespace } = getKubeApiParams(await authSession(req.headers));
<<<<<<<< HEAD:frontend/plugins/kubepanel/src/pages/api/delete.ts
    const data = await deleteResource(
========

    if (!req.body.data) throw new Error(`invalid data ${req.body.data}`);
    const resourceData = yaml.load(req.body.data);

    const data = await createResource(
>>>>>>>> ce505fc3 (feat: added delete resource function):frontend/plugins/kubepanel/src/pages/api/create.ts
      {
        urlParams: { ...apiBaseParams, serverUrl, namespace },
        opts: requestOpts
      },
      name
    );

    jsonRes(res, {
      code: 200,
      data
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
