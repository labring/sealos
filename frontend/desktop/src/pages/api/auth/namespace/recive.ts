import { authSession } from '@/services/backend/auth';
import { queryMessage, queryNamespacesByUser } from '@/services/backend/db/userToNamespace';
import { jsonRes } from '@/services/backend/response';
import { InvitedStatus, teamMessageDto } from '@/types/team';
import { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    const k8s_username = payload.user.k8s_username;
    const ns = await queryMessage({ userId: payload.user.uid, k8s_username });
    const messages = ns
      .filter((x) => x.status === InvitedStatus.Inviting)
      .map<teamMessageDto>((x) => ({
        nsid: x.namespace.id,
        ns_uid: x.namespace.uid,
        teamName: x.namespace.teamName,
        role: x.role,
        managerName: x.manager.name
      }));
    jsonRes(res, {
      code: 200,
      message: 'Successfully',
      data: {
        messages
      }
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'list reciveMessage error' });
  }
}
