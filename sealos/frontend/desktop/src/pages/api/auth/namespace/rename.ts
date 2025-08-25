import { jsonRes } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/services/backend/db/init';
import { validate } from 'uuid';
import { Role } from 'prisma/region/generated/client';
import { verifyAccessToken } from '@/services/backend/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    const { teamName, ns_uid } = req.body as { teamName: string; ns_uid: string };
    if (!teamName) return jsonRes(res, { code: 400, message: 'teamName is required' });
    if (!ns_uid || !validate(ns_uid))
      return jsonRes(res, { code: 400, message: 'ns_uid is invaild' });

    const queryResult = await prisma.userWorkspace.findFirst({
      where: {
        workspaceUid: ns_uid,
        userCrUid: payload.userCrUid,
        role: Role.OWNER
      },
      include: {
        workspace: true
      }
    });

    if (!queryResult) return jsonRes(res, { code: 404, message: 'the namespace is not found' });

    const updatedWorkspace = await prisma.workspace.update({
      where: {
        uid: ns_uid
      },
      data: {
        displayName: teamName
      }
    });

    if (!updatedWorkspace) return jsonRes(res, { code: 500, message: 'failed to rename team' });

    jsonRes(res, {
      code: 200,
      message: 'Successfully'
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'failed to rename team' });
  }
}
