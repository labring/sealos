import {
  deleteRequestCrd,
  generateRequestCrd,
  ROLE_LIST,
  RoleAction,
  UserRole
} from '@/types/team';
import { KubeConfig, V1Status } from '@kubernetes/client-node';
import { K8sApiDefault } from './kubernetes/admin';
import { ApplyYaml, GetCRD } from './kubernetes/user';
import { prisma } from '@/services/backend/db/init';
import { JoinStatus, Role } from 'prisma/region/generated/client';
import { roleToUserRole, UserRoleToRole, vaildManage } from '@/utils/tools';
import { createHash } from 'node:crypto';

const _applyRoleRequest =
  (kc: KubeConfig, nsid: string, idempotent: boolean = false) =>
  (action: 'Grant' | 'Deprive' | 'Update') =>
  async (k8s_username: string, role: UserRole) => {
    const hash = createHash('sha256');
    const props = {
      user: k8s_username,
      namespace: nsid,
      action,
      role: ROLE_LIST[role]
    };
    let name = '';
    hash.update(JSON.stringify(props) + new Date().getTime());
    name = hash.digest('hex');
    const createCR = () =>
      ApplyYaml(
        kc,
        generateRequestCrd({
          user: k8s_username,
          namespace: nsid,
          action,
          role: ROLE_LIST[role],
          name
        })
      );
    return new Promise((resolve, reject) => {
      let times = 3;
      const wrap = () =>
        createCR()
          .then((res) => resolve(res))
          .catch((err) => {
            if (times > 0) {
              times--;
              wrap();
            } else {
              return reject(err);
            }
          });
      wrap();
    });
  };

export const applyDeleteRequest = (user: string) => {
  const kc = new KubeConfig();
  kc.loadFromDefault();
  const createCR = () =>
    ApplyYaml(
      kc,
      deleteRequestCrd({
        user
      })
    );
  return new Promise((resolve, reject) => {
    let times = 3;
    const wrap = () =>
      createCR()
        .then((res) => resolve(res))
        .catch((err) => {
          if (times > 0) {
            times--;
            wrap();
          } else {
            return reject(err);
          }
        });
    wrap();
  });
};

type ModifyWorkspaceBaseParam = {
  k8s_username: string; // 目标
  // ns_uid: string; // 目标
  workspaceId: string;
  role: UserRole;
  action: RoleAction;
};
// 只修改，不包含邀请的业务逻辑，应该是确保数据库已经有记录,只修改记录，并且修改k8s的rolebinding
export const modifyWorkspaceRole = async ({
  k8s_username,
  // ns_uid,
  workspaceId,
  ...props
}: ModifyWorkspaceBaseParam &
  (
    | {
        action: 'Grant' | 'Create';
      }
    | {
        action: 'Deprive' | 'Modify';
        pre_role: UserRole;
      }
    | {
        action: 'Change';
        pre_k8s_username: string;
      }
    | {
        action: 'Merge';
        pre_role: UserRole;
      }
  )) => {
  const kc = K8sApiDefault();
  const applyRoleRequest = _applyRoleRequest(kc, workspaceId);
  const grantApply = applyRoleRequest('Grant');
  const depriveApply = applyRoleRequest('Deprive');
  const updateApply = applyRoleRequest('Update');

  if (props.action === 'Grant') {
    await grantApply(k8s_username, props.role);
  } else if (props.action === 'Deprive') {
    if (props.pre_role !== props.role) return null;
    await depriveApply(k8s_username, props.role);
  } else if (props.action === 'Change') {
    // abdicate role
    if (props.role === UserRole.Owner && props.pre_k8s_username) {
      // remove owner
      await updateApply(props.pre_k8s_username, UserRole.Developer);
      // add owner
      await updateApply(k8s_username, UserRole.Owner);
    }
  } else if (props.action === 'Create') {
    // create new workspace
    if (props.role === UserRole.Owner) {
      await grantApply(k8s_username, UserRole.Owner);
    }
  } else if (props.action === 'Modify') {
    // modify other role
    // same role
    if (props.pre_role === props.role) return null;
    await updateApply(k8s_username, props.role);
  }
};
// 4 conditions
/**
 * | same role          | user role >= user merge role | merge user role > user role                    | target user out of workspace                 |
 * | deprive merge user | deprive merge user           | deprive merge user & update to merge user role | deprive merge user & grant merge user role   |
 *
 * */
export const mergeUserWorkspaceRole = async ({
  workspaceId,
  mergeUserCrName,
  userCrName,
  userRole,
  mergeUserRole
}: {
  workspaceId: string;
  mergeUserCrName: string;
  userCrName: string;
  userRole?: Role;
  mergeUserRole: Role;
}) => {
  const kc = K8sApiDefault();
  const applyRoleRequest = _applyRoleRequest(kc, workspaceId, true);
  const grantApply = applyRoleRequest('Grant');
  const depriveApply = applyRoleRequest('Deprive');
  const updateApply = applyRoleRequest('Update');
  // handle pre user
  await depriveApply(mergeUserCrName, roleToUserRole(mergeUserRole));
  // handle new user
  const targetUserExist = !(userRole === undefined || userRole === null);
  if (targetUserExist) {
    const targetUserRoleisHigher = vaildManage(roleToUserRole(userRole))(
      roleToUserRole(mergeUserRole),
      true
    );
    if (!targetUserRoleisHigher) {
      await updateApply(userCrName, roleToUserRole(mergeUserRole));
    }
  } else {
    await grantApply(userCrName, roleToUserRole(mergeUserRole));
  }
  // handle new user
};
// ==================================
// 以下是邀请的业务逻辑,只负责改数据库
// 邀请要把 user 预先加到 ns/user 表，待确认以后再 修改 user表->更新rolebinding, (direct=true 直接绑定),不需要确认
/**
 *
 * @param userId target regionUid
 * @param ns_uid target workspaceUid
 * @param role UserRole
 * @param direct boolean
 * @param managerId regionUid
 */
export const bindingRole = async ({
  userCrUid,
  ns_uid,
  role,
  direct,
  managerId
}: {
  userCrUid: string;
  ns_uid: string;
  role: UserRole;
  direct?: boolean;
  managerId?: string;
}) => {
  return prisma.userWorkspace.create({
    data: {
      status: !!direct ? JoinStatus.IN_WORKSPACE : JoinStatus.INVITED,
      role: UserRoleToRole(role),
      isPrivate: false,
      workspaceUid: ns_uid,
      userCrUid,
      joinAt: new Date(),
      ...(managerId ? { handlerUid: managerId } : {})
    }
  });
};
export const modifyBinding = async ({
  userCrUid,
  workspaceUid,
  role
}: {
  userCrUid: string;
  workspaceUid: string;
  role: UserRole;
}) => {
  return prisma.userWorkspace.update({
    where: {
      workspaceUid_userCrUid: {
        userCrUid,
        workspaceUid
      }
    },
    data: {
      role: UserRoleToRole(role)
    }
  });
};

// reject Invitation
export const unbindingRole = async ({
  userCrUid,
  workspaceUid
}: {
  userCrUid: string;
  workspaceUid: string;
}) => {
  return prisma.userWorkspace.delete({
    where: {
      workspaceUid_userCrUid: {
        userCrUid,
        workspaceUid
      }
    }
  });
};
// accept Invitation
export const acceptInvite = async ({
  userCrUid,
  workspaceUid
}: {
  userCrUid: string;
  workspaceUid: string;
}) => {
  return prisma.userWorkspace.update({
    where: {
      workspaceUid_userCrUid: {
        userCrUid,
        workspaceUid
      }
    },
    data: {
      status: JoinStatus.IN_WORKSPACE,
      joinAt: new Date()
    }
  });
};

export const mergeUserModifyBinding = async ({
  mergeUserCrUid,
  workspaceUid,
  userCrUid,
  userRole,
  mergeUserRole
}: {
  mergeUserCrUid: string;
  workspaceUid: string;
  userCrUid: string;
  userRole?: Role;
  mergeUserRole: Role;
}) => {
  let role;
  if (undefined === userRole || userRole === null) {
    const role = mergeUserRole;
    // user is not in workspace
    await prisma.$transaction([
      prisma.userWorkspace.create({
        data: {
          role,
          userCrUid: userCrUid,
          workspaceUid,
          status: JoinStatus.IN_WORKSPACE,
          isPrivate: false
        }
      }),
      prisma.userWorkspace.delete({
        where: {
          workspaceUid_userCrUid: {
            userCrUid: mergeUserCrUid,
            workspaceUid
          }
        }
      })
    ]);
  } else {
    const userRoleisHigher = vaildManage(roleToUserRole(userRole))(
      roleToUserRole(mergeUserRole),
      true
    );
    if (userRoleisHigher) {
      role = userRole;
    } else {
      role = mergeUserRole;
    }
    await prisma.$transaction([
      prisma.userWorkspace.findUniqueOrThrow({
        where: {
          workspaceUid_userCrUid: {
            userCrUid: userCrUid,
            workspaceUid
          },
          role: userRole
        }
      }),
      prisma.userWorkspace.update({
        where: {
          workspaceUid_userCrUid: {
            userCrUid: userCrUid,
            workspaceUid
          }
        },
        data: {
          role
        }
      }),
      prisma.userWorkspace.delete({
        where: {
          workspaceUid_userCrUid: {
            userCrUid: mergeUserCrUid,
            workspaceUid
          }
        }
      })
    ]);
  }
};
