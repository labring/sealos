import { authSession } from '@/services/backend/auth';
import { queryNSByUid } from '@/services/backend/db/namespace';
import { queryUser } from '@/services/backend/db/user';
import { queryUTN } from '@/services/backend/db/userToNamespace';
import { jsonRes } from '@/services/backend/response';
import { checkCanManage, modifyTeamRole, unbindingRole } from '@/services/backend/team';
import { InvitedStatus, UserRole } from '@/types/team';
import { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    //
    const { ns_uid, tUserId, tK8s_username } = req.body as {
      ns_uid?: string;
      tUserId?: string;
      tK8s_username?: string;
    };
    const k8s_username = payload.user.k8s_username;

    if (!ns_uid) return jsonRes(res, { code: 400, message: 'ns_id is required' });
    if (!tUserId) return jsonRes(res, { code: 400, message: 'tUserId is required' });
    if (!tK8s_username) return jsonRes(res, { code: 400, message: 'tK8s_username is required' });

    if (tUserId === payload.user.uid) {
      return jsonRes(res, { code: 403, message: 'target user must be others' });
    }
    const utn = await queryUTN({
      userId: tUserId,
      k8s_username: tK8s_username,
      namespaceId: ns_uid
    });
    // 之前没绑上,
    if (!utn) return jsonRes(res, { code: 404, message: 'target user is not in namespace' });
    const role = utn.role;
    if (
      !checkCanManage({
        userId: payload.user.uid,
        k8s_username,
        namespaceId: ns_uid,
        role,
        tUserId
      })
    )
      return jsonRes(res, { code: 403, message: 'you are not manager' });

    const namespace = await queryNSByUid({ uid: ns_uid });
    if (!namespace) return jsonRes(res, { code: 404, message: 'namespace is not found' });
    let unbinding_result = null;
    if (InvitedStatus.Inviting === utn.status) {
      // 等于取消邀请
      unbinding_result = await unbindingRole({
        k8s_username: tK8s_username,
        ns_uid: namespace.uid,
        userId: tUserId
      });
    } else if (InvitedStatus.Accepted === utn.status) {
      // 删除权限
      unbinding_result = await unbindingRole({
        k8s_username: tK8s_username,
        userId: tUserId,
        ns_uid: namespace.uid
      });
      if (!unbinding_result)
        return jsonRes(res, { code: 500, message: 'fail to remove team memeber role' });
      await modifyTeamRole({
        k8s_username: tK8s_username,
        role,
        action: 'Deprive',
        namespace,
        userId: tUserId,
        pre_role: utn.role
      });
    }
    jsonRes(res, {
      code: 200,
      message: 'Successfully',
      data: {
        unbinding_result
      }
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'fail to remove team member' });
  }
}
