import { authSession } from '@/services/backend/auth';
import { queryNamespacesByUser } from '@/services/backend/db/userToNamespace';
import { jsonRes } from '@/services/backend/response';
import { InvitedStatus, NamespaceDto, UserRole } from '@/types/team';
import { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    const k8s_username = payload.user.k8s_username;
    const ns = await queryNamespacesByUser({ userId: payload.user.uid, k8s_username });
    // 没接受应该不能查看消息
    const namespaces = ns
      .filter(
        (x) =>
          x.status === InvitedStatus.Accepted &&
          x.k8s_username === payload.user.k8s_username &&
          x.userId === payload.user.uid
      )
      .map<NamespaceDto>((x) => ({
        id: x.namespace.id,
        uid: x.namespace.uid,
        createTime: x.namespace.createTime,
        nstype: x.namespace.nstype,
        teamName: x.namespace.teamName,
        role: x.role
      }));
    jsonRes(res, {
      code: 200,
      message: 'Successfully',
      data: {
        namespaces
      }
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'list ns error' });
  }
}
