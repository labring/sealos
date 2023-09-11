import { authSession } from '@/services/backend/auth';
import { queryUsersByNamespace, updateUTN } from '@/services/backend/db/userToNamespace';
import { jsonRes } from '@/services/backend/response';
import { modifyBinding, modifyTeamRole } from '@/services/backend/team';
import { InvitedStatus, NSType, UserRole } from '@/types/team';
import { isUserRole, vaildManage } from '@/utils/tools';
import { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    //
    const { ns_uid, tUserId, tK8s_username, tRole } = req.body as {
      ns_uid?: string;
      tUserId?: string;
      tK8s_username?: string;
      tRole?: UserRole;
    };
    if (!tUserId) return jsonRes(res, { code: 400, message: 'tUserId is required' });
    if (!tK8s_username) return jsonRes(res, { code: 400, message: 'tK8s_username is required' });
    if (!isUserRole(tRole)) return jsonRes(res, { code: 400, message: 'tRole is required' });
    if (!ns_uid) return jsonRes(res, { code: 400, message: 'ns_uid is required' });
    // 翻出utn
    const utns = await queryUsersByNamespace({ namespaceId: ns_uid });
    const ownUtn = utns.find((utn) => utn.userId === payload.user.uid);
    if (!ownUtn) return jsonRes(res, { code: 403, message: 'you are not in namespace' });
    if (ownUtn.namespace.nstype === NSType.Private)
      return jsonRes(res, { code: 403, message: "you can't modify private" });
    // 校检目标user
    const tUtn = utns.find((utn) => utn.userId === tUserId && utn.k8s_username === tK8s_username);
    // 还没进入团队中
    if (!tUtn || tUtn.status !== InvitedStatus.Accepted)
      return jsonRes(res, { code: 403, message: 'target user is not in namespace' });
    if (payload.user.k8s_username === tK8s_username && payload.user.uid === tUserId)
      return jsonRes(res, { code: 403, message: 'target user is not self' });
    // 不在ns
    if (!ownUtn) return jsonRes(res, { code: 403, message: 'you are not in namespace' });
    const vaildFn = vaildManage(ownUtn.role, ownUtn.userId);
    if (!vaildFn(tUtn.role, tUtn.userId) || !vaildFn(ownUtn.role, tUtn.userId))
      return jsonRes(res, { code: 403, message: 'you are not manager' });

    // 权限一致，不用管
    if (tUtn.role === tRole) return jsonRes(res, { code: 200, message: 'Successfully' });

    await modifyTeamRole({
      k8s_username: tK8s_username,
      role: tRole,
      action: 'Modify',
      namespace: {
        id: tUtn.namespace.id
      },
      userId: tUserId,
      pre_role: tUtn.role
    });
    const updateResult = await modifyBinding({
      ...tUtn,
      role: tRole
    });
    if (!updateResult) throw new Error('modify utn error');
    jsonRes(res, {
      code: 200,
      message: 'Successfully'
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'fail to remove team member' });
  }
}
