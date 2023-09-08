import { authSession } from '@/services/backend/auth';
import { queryUsersByNamespace } from '@/services/backend/db/userToNamespace';
import { jsonRes } from '@/services/backend/response';
import { modifyBinding, modifyTeamRole, unbindingRole } from '@/services/backend/team';
import { InvitedStatus, NSType, UserRole } from '@/types/team';
import { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    const { ns_uid, targetUsername, targetUserId } = req.body as {
      ns_uid?: string;
      targetUserId?: string;
      targetUsername?: string;
    };
    if (!ns_uid) return jsonRes(res, { code: 400, message: 'ns_uid is required' });
    if (!targetUsername) return jsonRes(res, { code: 400, message: 'targetUsername is required' });
    if (!targetUserId) return jsonRes(res, { code: 400, message: 'targetUserId is required' });
    if (targetUserId === payload.user.uid)
      return jsonRes(res, { code: 409, message: "the targetUserId can't be self" });
    // 校检自身user
    const utns = await queryUsersByNamespace({ namespaceId: ns_uid });
    const ownUtn = utns.find((utn) => utn.userId === payload.user.uid);
    if (!ownUtn) return jsonRes(res, { code: 404, message: 'you are not in namespace' });
    if (ownUtn)
      if (ownUtn.role !== UserRole.Owner)
        return jsonRes(res, { code: 403, message: 'you are not owner' });
    if (ownUtn.namespace.nstype === NSType.Private)
      return jsonRes(res, { code: 403, message: "you can't abdicate private " });
    // 校检目标user
    const targetUtn = utns.find(
      (utn) => utn.userId === targetUserId && utn.k8s_username === targetUsername
    );
    if (!targetUtn || targetUtn.status !== InvitedStatus.Accepted)
      return jsonRes(res, { code: 404, message: 'the targetUser is not in namespace' });
    // 升级为 owner
    const bindResult = await modifyBinding({
      k8s_username: targetUsername,
      namespaceId: ns_uid,
      role: UserRole.Owner,
      userId: targetUserId
    });
    if (!bindResult) throw new Error('fail to binding role');
    // 降级为 developer
    const unbindResult = await modifyBinding({
      k8s_username: payload.user.k8s_username,
      role: UserRole.Developer,
      userId: payload.user.uid,
      namespaceId: ns_uid
    });
    if (!unbindResult) throw new Error('fail to unbinding role');

    await modifyTeamRole({
      action: 'Change',
      pre_k8s_username: payload.user.k8s_username,
      k8s_username: targetUsername,
      userId: targetUserId,
      role: UserRole.Owner,
      namespace: ownUtn.namespace
    });
    jsonRes(res, {
      code: 200,
      message: 'Successfully'
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'adbication error' });
  }
}
