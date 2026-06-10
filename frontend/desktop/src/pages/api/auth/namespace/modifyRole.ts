import { verifyAccessToken } from '@/services/backend/auth';
import { prisma } from '@/services/backend/db/init';
import { jsonRes } from '@/services/backend/response';
import { modifyBinding, modifyWorkspaceRole } from '@/services/backend/team';
import { UserRole } from '@/types/team';
import { isUserRole, roleToUserRole, vaildManage } from '@/utils/tools';
import { NextApiRequest, NextApiResponse } from 'next';
import { JoinStatus } from 'prisma/region/generated/client';
import { validate } from 'uuid';

type ModifyRoleError = {
  code: number;
  message: string;
};

type ModifyRoleBody = {
  ns_uid: string;
  targetUserCrUid: string;
  tRole: UserRole;
};

export const validateModifyRoleRequest = (
  body: {
    ns_uid?: string;
    targetUserCrUid?: string;
    tRole?: UserRole;
  },
  requesterUserCrUid: string
): { ok: true; data: ModifyRoleBody } | { ok: false; error: ModifyRoleError } => {
  const { ns_uid, targetUserCrUid, tRole } = body;

  if (!targetUserCrUid || !validate(targetUserCrUid))
    return { ok: false, error: { code: 400, message: 'tUserId is invalid' } };
  if (!isUserRole(tRole)) return { ok: false, error: { code: 400, message: 'tRole is required' } };
  if (!ns_uid || !validate(ns_uid))
    return { ok: false, error: { code: 400, message: 'ns_uid is invalid' } };
  if (targetUserCrUid === requesterUserCrUid)
    return { ok: false, error: { code: 403, message: 'target user is not self' } };

  return { ok: true, data: { ns_uid, targetUserCrUid, tRole } };
};

export const getModifyRolePermissionError = ({
  requesterRole,
  targetCurrentRole,
  isSelf
}: {
  requesterRole: UserRole;
  targetCurrentRole: UserRole;
  requestedRole: UserRole;
  isSelf: boolean;
}): ModifyRoleError | null => {
  if (requesterRole !== UserRole.Owner) return { code: 403, message: 'you are not owner' };

  const canManageTargetCurrentRole = vaildManage(requesterRole)(targetCurrentRole, isSelf);

  if (!canManageTargetCurrentRole) return { code: 403, message: 'you are not manager' };

  return null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });

    const requestValidation = validateModifyRoleRequest(req.body, payload.userCrUid);
    if (!requestValidation.ok) return jsonRes(res, requestValidation.error);

    const { ns_uid, targetUserCrUid, tRole } = requestValidation.data;

    //  get utn
    const queryResults = await prisma.userWorkspace.findMany({
      where: {
        workspaceUid: ns_uid,
        userCrUid: {
          in: [payload.userCrUid, targetUserCrUid]
        },
        status: JoinStatus.IN_WORKSPACE
      },
      include: {
        workspace: true,
        userCr: true
      }
    });
    const own = queryResults.find((x) => x.userCrUid === payload.userCrUid);
    if (!own) return jsonRes(res, { code: 403, message: 'you are not in namespace' });
    const targetUser = queryResults.find((x) => x.userCrUid === targetUserCrUid);
    if (!targetUser) return jsonRes(res, { code: 404, message: 'target is not in namespace' });

    const ownRole = roleToUserRole(own.role);
    const targetRole = roleToUserRole(targetUser.role);
    const permissionError = getModifyRolePermissionError({
      requesterRole: ownRole,
      targetCurrentRole: targetRole,
      requestedRole: tRole,
      isSelf: targetUser.userCrUid === own.userCrUid
    });

    if (permissionError) return jsonRes(res, permissionError);

    // if role is same, do nothing
    if (targetRole === tRole) return jsonRes(res, { code: 200, message: 'Successfully' });

    await modifyWorkspaceRole({
      k8s_username: targetUser.userCr.crName,
      role: tRole,
      action: 'Modify',
      workspaceId: targetUser.workspace.id,
      pre_role: targetRole
    });
    const updateResult = await modifyBinding({
      userCrUid: targetUser.userCrUid,
      workspaceUid: targetUser.workspaceUid,
      role: tRole
    });
    if (!updateResult) throw new Error('modify utn error');
    jsonRes(res, {
      code: 200,
      message: 'Successfully'
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'fail to modify member role' });
  }
}
