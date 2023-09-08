import { authSession } from '@/services/backend/auth';
import { queryNSByUid } from '@/services/backend/db/namespace';
import { queryUserByk8sUser } from '@/services/backend/db/user';
import { queryUTN, queryUsersByNamespace } from '@/services/backend/db/userToNamespace';
import { jsonRes } from '@/services/backend/response';
import { bindingRole, checkCanManage } from '@/services/backend/team';
import { INVITE_LIMIT } from '@/types/api';
import { InvitedStatus, UserRole } from '@/types/team';
import { isUserRole, vaildManage } from '@/utils/tools';
import { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    const { ns_uid, targetUsername, role } = req.body as {
      ns_uid?: string;
      targetUsername?: string;
      role?: UserRole;
    };
    if (!ns_uid) return jsonRes(res, { code: 400, message: 'ns_uid is required' });
    if (!targetUsername) return jsonRes(res, { code: 400, message: 'targetUsername is required' });
    if (!isUserRole(role)) return jsonRes(res, { code: 400, message: 'role is required' });
    if (role === UserRole.Owner) return jsonRes(res, { code: 403, message: 'role must be others' });
    if (targetUsername === payload.user.k8s_username)
      return jsonRes(res, { code: 403, message: 'target user must be others' });
    const tUser = await queryUserByk8sUser(targetUsername);
    if (!tUser) return jsonRes(res, { code: 404, message: 'user is not found' });
    const userUtns = await queryUsersByNamespace({ namespaceId: ns_uid });
    if (!userUtns)
      return jsonRes(res, { code: 404, message: 'there are not user in the namespace ' });
    const userInInvit = userUtns.filter((v) => v.status === InvitedStatus.Inviting);
    if (userInInvit.length >= INVITE_LIMIT)
      return jsonRes(res, { code: 403, message: 'the invited users are too many' });
    const ownUtn = userUtns.find(
      (x) => x.userId === payload.user.uid && x.k8s_username === payload.user.k8s_username
    );
    if (!ownUtn) return jsonRes(res, { code: 403, message: 'you are not in the namespace' });
    const vaild = vaildManage(ownUtn.role, ownUtn.userId)(role, tUser.uid);
    if (!vaild) return jsonRes(res, { code: 403, message: 'you are not manager' });
    const tUtn = userUtns.find(
      (utn) => utn.k8s_username === targetUsername && tUser.uid === utn.userId
    );
    if (tUtn) return jsonRes(res, { code: 403, message: 'target user is already invite' });
    const result = await bindingRole({
      k8s_username: targetUsername,
      ns_uid,
      role,
      userId: tUser.uid,
      managerId: ownUtn.userId
    });
    if (!result) throw new Error('fail to binding role');
    jsonRes(res, {
      code: 200,
      message: 'Successfully'
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'invite member error' });
  }
}
