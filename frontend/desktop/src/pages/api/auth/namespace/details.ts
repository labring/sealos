import { jsonRes } from '@/services/backend/response';
import { NamespaceDto, NSType } from '@/types/team';
import { TeamUserDto } from '@/types/user';
import { NextApiRequest, NextApiResponse } from 'next';
import { globalPrisma, prisma } from '@/services/backend/db/init';
import { joinStatusToNStatus, roleToUserRole } from '@/utils/tools';
import { validate } from 'uuid';
import { verifyAccessToken } from '@/services/backend/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    const { ns_uid } = req.body;
    if (!ns_uid || !validate(ns_uid))
      return jsonRes(res, { code: 400, message: 'ns_uid is invaild' });
    const queryResult = await prisma.userWorkspace.findMany({
      where: {
        workspaceUid: ns_uid,
        isPrivate: false
      },
      include: {
        workspace: true,
        userCr: true
      }
    });

    if (queryResult.length <= 0)
      return jsonRes(res, { code: 404, message: 'namespace not founded!' });

    const workspace = queryResult[0].workspace;
    const selfItem = queryResult.find((item) => item.userCrUid === payload.userCrUid);
    if (!selfItem) return jsonRes(res, { code: 404, message: 'You are not in the namespace' });
    const userResult = await globalPrisma.user.findMany({
      where: {
        uid: {
          in: queryResult.map((x) => x.userCr.userUid)
        }
      }
    });
    if (!userResult) throw Error(`userUid is invalid: ${selfItem.userCr.userUid}`);
    const namespace: NamespaceDto = {
      uid: workspace.uid,
      id: workspace.id,
      role: roleToUserRole(selfItem.role),
      createTime: workspace.createdAt,
      teamName: workspace.displayName,
      nstype: NSType.Team
    };
    const users = queryResult.flatMap<TeamUserDto>((x) => {
      const user = userResult.find((user) => user.uid === x.userCr.userUid);
      // when the user is deleting
      if (!user) return [];
      return [
        {
          uid: x.userCr.userUid,
          crUid: x.userCrUid,
          k8s_username: x.userCr.crName,
          avatarUrl: user.avatarUri,
          nickname: user.nickname,
          createdTime: x.userCr.createdAt.toString(),
          joinTime: x.joinAt || undefined,
          role: roleToUserRole(x.role),
          status: joinStatusToNStatus(x.status)
        }
      ];
    });
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
