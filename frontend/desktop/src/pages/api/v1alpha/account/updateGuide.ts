import { K8sApiDefault } from '@/services/backend/kubernetes/admin';
import { UpdateCRD } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { initK8s } from 'sealos-desktop-sdk/service';
import { AccountMeta } from '@/pages/api/account/getAccount';

export type UpdateUserGuideParams = {
  activityType: 'beginner-guide';
  phase: 'launchpad' | 'database' | 'template' | 'terminal';
  phasePage: 'create' | 'detail' | 'index';
  shouldSendGift: boolean;
};

// req header is kubeconfig
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      activityType,
      phase,
      phasePage,
      shouldSendGift = false
    } = req.body as UpdateUserGuideParams;
    if (!activityType || !phase || !phasePage)
      return jsonRes(res, { code: 400, message: 'Desktop Bad Request: Invalid parameters' });

    const { namespace, kube_user, kc } = await initK8s({ req });
    const defaultKc = K8sApiDefault();
    if (!namespace) return jsonRes(res, { code: 401, message: 'kubeConfig is vaild' });
    if (!defaultKc) return jsonRes(res, { code: 401, message: 'No cluster permissions' });

    const endTime = new Date().toISOString();

    const jsonPatch = shouldSendGift
      ? [
          {
            op: 'add',
            path: `/metadata/annotations/activity.${activityType}.current-phase`,
            value: phase
          },
          {
            op: 'add',
            path: `/metadata/annotations/activity.${activityType}.${phase}.endTime`,
            value: endTime
          },
          {
            op: 'add',
            path: `/metadata/annotations/frontend.guide.${phase}.${phasePage}`,
            value: endTime
          }
        ]
      : [
          {
            op: 'add',
            path: `/metadata/annotations/frontend.guide.${phase}.${phasePage}`,
            value: endTime
          }
        ];

    const reuslt = await UpdateCRD(defaultKc, AccountMeta, kube_user.name, jsonPatch);
    console.log('updateDesktopGuide', jsonPatch, reuslt?.body);

    jsonRes(res, { data: reuslt?.body });
  } catch (error) {
    console.log(error, 'get user account err');
    jsonRes(res, { code: 500, data: error });
  }
}
