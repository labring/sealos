import { authSession } from '@/services/backend/auth';
import { queryUsersByNamespace } from '@/services/backend/db/userToNamespace';
import { jsonRes } from '@/services/backend/response';
import { NamespaceDto } from '@/types/team';
import { TeamUserDto } from '@/types/user';
import { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    const { ns_uid } = req.body;
    if (!ns_uid) return jsonRes(res, { code: 400, message: 'nsid is required' });
    const utnWithUser = await queryUsersByNamespace({ namespaceId: ns_uid });

    if (utnWithUser.length <= 0)
      return jsonRes(res, { code: 404, message: 'namespace not founded!' });
    const rawNamespace = utnWithUser[0].namespace;
    const namespace: NamespaceDto = {
      uid: rawNamespace.uid,
      id: rawNamespace.id,
      createTime: rawNamespace.createTime,
      teamName: rawNamespace.teamName,
      nstype: rawNamespace.nstype
    };
    const users = utnWithUser.map<TeamUserDto>((x) => ({
      uid: x.userId,
      k8s_username: x.k8s_username,
      avatarUrl: x.user.avatar_url,
      name: x.user.name,
      createdTime: x.user.created_time,
      joinTime: x.joinTime,
      role: x.role,
      status: x.status
    }));
    jsonRes(res, {
      code: 200,
      message: 'Successfully',
      data: {
        users,
        namespace
      }
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'query ns error' });
  }
}
