import { K8sApiDefault } from '@/services/backend/kubernetes/admin';
import { CRDMeta, UpdateCRD } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { initK8s } from 'sealos-desktop-sdk/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { activityType, phase } = req.body as {
      activityType: string;
      phase: 'launchpad' | 'database' | 'template' | 'terminal';
    };
    if (!activityType || !phase)
      return jsonRes(res, { code: 400, message: 'Bad Request: Invalid parameters' });

    const { namespace, kube_user, kc } = await initK8s({ req });
    const defaultKc = K8sApiDefault();
    if (!namespace) return jsonRes(res, { code: 401, message: 'kubeConfig is vaild' });
    if (!defaultKc) return jsonRes(res, { code: 401, message: 'No cluster permissions' });

    const endTime = new Date().toISOString();

    const jsonPatch = [
      {
        op: 'add',
        path: `/metadata/annotations/activity.${activityType}.current-phase`,
        value: phase
      },
      {
        op: 'add',
        path: `/metadata/annotations/activity.${activityType}.${phase}.endTime`,
        value: endTime
      }
    ];

    const AccountMeta: CRDMeta = {
      group: 'account.sealos.io',
      version: 'v1',
      namespace: 'sealos-system',
      plural: 'accounts'
    };

    // const accountDesc = await GetCRD(kc, AccountMeta, kube_user.name);
    const reuslt = await UpdateCRD(defaultKc, AccountMeta, kube_user.name, jsonPatch);

    jsonRes(res, { data: reuslt?.body });
  } catch (error) {
    console.log(error, 'get user account err');
    jsonRes(res, { code: 500, data: error });
  }
}
