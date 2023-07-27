import { authSession } from '@/services/backend/auth';
import { queryNSByUid } from '@/services/backend/db/namespace';
import { queryUser } from '@/services/backend/db/user';
import { queryUTN, queryUsersByNamespace } from '@/services/backend/db/userToNamespace';
import { setUserTeamDelete } from '@/services/backend/kubernetes/admin';
import { jsonRes } from '@/services/backend/response';
import { applyDeleteRequest, modifyTeamRole, unbindingRole } from '@/services/backend/team';
import { NSType, UserRole } from '@/types/team';
import { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    const { user: tokenUser } = payload;
    const { ns_uid } = req.body as { ns_uid?: string };
    if (!ns_uid) return jsonRes(res, { code: 400, message: 'ns_uid is required' });
    const user = await queryUser({ id: tokenUser.uid, provider: 'uid' });
    if (tokenUser.ns_uid === ns_uid)
      return jsonRes(res, {
        code: 403,
        message: 'you can not delete the namespace which you are in'
      });
    if (!user)
      return jsonRes(res, { code: 404, message: `the user ${tokenUser.uid} is not found` });
    const utn = await queryUTN({
      userId: tokenUser.uid,
      k8s_username: tokenUser.k8s_username,
      namespaceId: ns_uid
    });
    if (!utn) return jsonRes(res, { code: 404, message: 'you are not in the namespace' });
    if (utn.role !== UserRole.Owner)
      return jsonRes(res, { code: 403, message: 'you are not owner' });
    const namespace = await queryNSByUid({ uid: ns_uid });
    if (!namespace) return jsonRes(res, { code: 404, message: 'fail to get ns' });
    if (namespace.nstype === NSType.Private)
      return jsonRes(res, { code: 403, message: "this namespace can't be delete" });

    const users = await queryUsersByNamespace({ namespaceId: ns_uid });
    if (!users) return jsonRes(res, { code: 404, message: 'fail to get users of ns' });
    const creator = namespace.id.replace('ns-', '');
    const res1 = await setUserTeamDelete(creator);
    if (!res1) throw new Error('fail to update user ');
    const res2 = await applyDeleteRequest(creator);
    if (!res2) throw new Error('fail to delete namespace ');
    const results = await Promise.all(
      users.map(async ({ userId, k8s_username }) => {
        // 保证每个用户都清掉
        const _result = await unbindingRole({
          userId,
          k8s_username,
          ns_uid: namespace.uid
        });
        if (!_result) return false;
        return true;
      })
    );

    if (!results.every((x) => x))
      return jsonRes(res, { code: 404, message: 'fail to remove users of ns' });
    jsonRes(res, { code: 200, message: 'Successfully' });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'fail to remove ns' });
  }
}
