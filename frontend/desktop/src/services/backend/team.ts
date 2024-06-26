import {
  RoleAction,
  generateRequestCrd,
  ROLE_LIST,
  UserRole,
  watchEventType,
  deleteRequestCrd
} from '@/types/team';
import { KubeConfig } from '@kubernetes/client-node';
import { K8sApiDefault } from './kubernetes/admin';
import { ApplyYaml } from './kubernetes/user';
import { prisma } from '@/services/backend/db/init';
import { JoinStatus, Role } from 'prisma/region/generated/client';
import { UserRoleToRole } from '@/utils/tools';

const _applyRoleRequest =
  (kc: KubeConfig, nsid: string) =>
  (action: 'Grant' | 'Deprive' | 'Update', types: watchEventType[]) =>
  (k8s_username: string, role: UserRole) => {
    const createCR = () =>
      ApplyYaml(
        kc,
        generateRequestCrd({
          user: k8s_username,
          namespace: nsid,
          action,
          role: ROLE_LIST[role]
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

type ModifyTeamBaseParam = {
  k8s_username: string; // 目标
  // ns_uid: string; // 目标
  workspaceId: string;
  role: UserRole;
  action: RoleAction;
};
// 只修改，不包含邀请的业务逻辑，应该是确保数据库已经有记录,只修改记录，并且修改k8s的rolebinding
export const modifyTeamRole = async ({
  k8s_username,
  // ns_uid,
  workspaceId,
  ...props
}:
  | (ModifyTeamBaseParam & {
      action: 'Grant' | 'Create';
    })
  | (ModifyTeamBaseParam & {
      action: 'Deprive' | 'Modify';
      pre_role: UserRole;
    })
  | (ModifyTeamBaseParam & {
      action: 'Change';
      pre_k8s_username: string;
    })) => {
  const kc = K8sApiDefault();
  const applyRoleRequest = _applyRoleRequest(kc, workspaceId);
  const grantApply = applyRoleRequest('Grant', [watchEventType.ADDED]);
  const depriveApply = applyRoleRequest('Deprive', [watchEventType.DELETED]);
  const updateApply = applyRoleRequest('Update', []);
  // let result: TeamRolebinding | null = null;

  if (props.action === 'Grant') {
    // result =
    await grantApply(k8s_username, props.role);
    // console.log(result)
  } else if (props.action === 'Deprive') {
    // 保证存在
    if (props.pre_role !== props.role) return null;
    // result =
    await depriveApply(k8s_username, props.role);
  } else if (props.action === 'Change') {
    // 移交自己的权限
    if (props.role === UserRole.Owner && props.pre_k8s_username) {
      // 先把自己的权限去掉
      // result =
      await updateApply(props.pre_k8s_username, UserRole.Developer);
      // 再补充新的权限上来
      // result =
      await updateApply(k8s_username, UserRole.Owner);
    }
  } else if (props.action === 'Create') {
    //  创建新的团队
    if (props.role === UserRole.Owner) {
      await grantApply(k8s_username, UserRole.Owner);
    }
  } else if (props.action === 'Modify') {
    // 修改他人权限
    // 相同权限，不管
    if (props.pre_role === props.role) return null;
    updateApply(k8s_username, props.role);
  } // if (!result) return null;
  // return result;
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
