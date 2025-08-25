import { jsonRes } from '@/services/backend/response';
import { NamespaceDto, NSType } from '@/types/team';
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/services/backend/db/init';
import { roleToUserRole } from '@/utils/tools';
import { JoinStatus } from 'prisma/region/generated/client';
import { verifyAccessToken } from '@/services/backend/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    const queryResults = await prisma.userWorkspace.findMany({
      where: {
        status: JoinStatus.IN_WORKSPACE,
        userCrUid: payload.userCrUid
      },
      include: {
        workspace: true
      }
    });
    const privateIdx = queryResults.findIndex((x) => x.isPrivate);
    if (privateIdx < 0) throw Error('Namespace is invalid');
    queryResults.unshift(queryResults.splice(privateIdx, 1)[0]);
    const namespaces = queryResults.map<NamespaceDto>((x) => ({
      id: x.workspace.id,
      uid: x.workspace.uid,
      createTime: x.workspace.createdAt,
      nstype: x.isPrivate ? NSType.Private : NSType.Team,
      teamName: x.workspace.displayName,
      role: roleToUserRole(x.role)
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
