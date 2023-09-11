import { reciveAction } from '@/api/namespace';
import { authSession } from '@/services/backend/auth';
import { queryNSByUid } from '@/services/backend/db/namespace';
import { queryUTN } from '@/services/backend/db/userToNamespace';
import { jsonRes } from '@/services/backend/response';
import { acceptInvite, modifyTeamRole, unbindingRole } from '@/services/backend/team';

import { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });

    const { k8s_username, uid } = payload.user;
    const { ns_uid, action } = req.body as { ns_uid?: string; action: reciveAction };
    if (!ns_uid) return jsonRes(res, { code: 400, message: 'nsid is required' });
    if (![reciveAction.Accepte, reciveAction.Reject].includes(action))
      return jsonRes(res, {
        code: 400,
        message: `action must be ${reciveAction.Accepte}, ${reciveAction.Reject}`
      });
    const namespace = await queryNSByUid({ uid: ns_uid });
    if (!namespace) return jsonRes(res, { code: 404, message: 'fail to get ns' });
    // 邀请状态这层,
    // const user = await queryUser({ id: payload.user.uid, provider: 'uid' });
    // if (!user) return jsonRes(res, { code: 404, message: 'fail to get user' });
    const utn = await queryUTN({ userId: uid, k8s_username, namespaceId: ns_uid });
    if (!utn) return jsonRes(res, { code: 404, message: "you're not invited" });
    if (action === reciveAction.Accepte) {
      await modifyTeamRole({
        k8s_username,
        role: utn.role,
        userId: uid,
        namespace,
        action: 'Grant'
      });
      const result = await acceptInvite({
        k8s_username,
        ns_uid,
        userId: uid
      });
      if (!result) throw new Error('failed to change Status');
    } else if (action === reciveAction.Reject) {
      const unbindingResult = await unbindingRole({ k8s_username, ns_uid, userId: uid });
      if (!unbindingResult) throw new Error('fail to unbinding');
    }

    jsonRes(res, {
      code: 200,
      message: 'Successfully'
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'get price error' });
  }
}
