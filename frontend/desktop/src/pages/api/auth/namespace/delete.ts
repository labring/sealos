import { setUserTeamDelete } from '@/services/backend/kubernetes/admin';
import { jsonRes } from '@/services/backend/response';
import { applyDeleteRequest } from '@/services/backend/team';
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/services/backend/db/init';
import { validate } from 'uuid';
import { Role } from 'prisma/region/generated/client';
import { verifyAccessToken } from '@/services/backend/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    const { ns_uid } = req.body as {
      ns_uid?: string;
    };
    if (!ns_uid || !validate(ns_uid))
      return jsonRes(res, { code: 400, message: 'ns_uid is invaild' });
    if (payload.workspaceUid === ns_uid)
      return jsonRes(res, {
        code: 403,
        message: 'you can not delete the namespace which you are in'
      });
    const queryResult = await prisma.userWorkspace.findUnique({
      where: {
        workspaceUid_userCrUid: {
          workspaceUid: ns_uid,
          userCrUid: payload.userCrUid
        },
        role: Role.OWNER,
        isPrivate: false
      },
      include: {
        workspace: true
      }
    });
    if (!queryResult) return jsonRes(res, { code: 404, message: 'the namespace is not found' });
    const creator = queryResult.workspace.id.replace('ns-', '');
    const res1 = await setUserTeamDelete(creator);
    if (!res1) throw new Error('fail to update user ');
    const res2 = await applyDeleteRequest(creator);
    if (!res2) throw new Error('fail to delete namespace ');
    const results = await prisma.userWorkspace.deleteMany({
      where: {
        workspaceUid: ns_uid,
        isPrivate: false
      }
    });

    if (results.count < 1)
      return jsonRes(res, { code: 404, message: 'fail to remove users of ns' });
    jsonRes(res, { code: 200, message: 'Successfully' });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'fail to remove ns' });
  }
}
