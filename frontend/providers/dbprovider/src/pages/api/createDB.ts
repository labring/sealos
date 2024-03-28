import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { KbPgClusterType } from '@/types/cluster';
import { DBEditType } from '@/types/db';
import { json2Account, json2CreateCluster } from '@/utils/json2Yaml';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { payload, isEdit } = req.body as { payload: DBEditType; isEdit: boolean };
    console.log(req.body);

    const { k8sCustomObjects, namespace, applyYamlList, delYamlList } = await getK8s({
      kubeconfig: await authSession(req)
    });

    if (isEdit) {
      const cluster = json2CreateCluster(payload);
      await applyYamlList([cluster], 'replace');
      return jsonRes(res, {
        data: 'success update db'
      });
    }

    const account = json2Account(payload);
    const cluster = json2CreateCluster(payload);
    await applyYamlList([account, cluster], 'create');
    const { body } = (await k8sCustomObjects.getNamespacedCustomObject(
      'apps.kubeblocks.io',
      'v1alpha1',
      namespace,
      'clusters',
      payload.dbName
    )) as {
      body: KbPgClusterType;
    };
    const dbUid = body.metadata.uid;
    const dbName = body.metadata.name;

    const updateAccountYaml = json2Account(payload, dbUid);
    console.log(updateAccountYaml);
    await applyYamlList([updateAccountYaml], 'replace');

    jsonRes(res, {
      data: 'success create db'
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
