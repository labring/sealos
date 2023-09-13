import {
  RoleAction,
  generateRequestCrd,
  ROLE_LIST,
  UserRole,
  NSType,
  InvitedStatus,
  watchEventType,
  deleteRequestCrd
} from '@/types/team';
import { KubeConfig } from '@kubernetes/client-node';
import { connectToUTN, createUTN, deleteUTN, queryUTN, updateUTN } from './db/userToNamespace';
import { K8sApiDefault } from './kubernetes/admin';
import { ApplyYaml } from './kubernetes/user';
import { vaildManage } from '@/utils/tools';
import { connectToDatabase } from './db/mongodb';

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
  userId: string; // 目标
  // ns_uid: string; // 目标
  namespace: {
    // nstype: NSType;
    id: string;
  };
  role: UserRole;
  action: RoleAction;
};
// 只修改，不包含邀请的业务逻辑，应该是确保数据库已经有记录,只修改记录，并且修改k8s的rolebinding
export const modifyTeamRole = async ({
  k8s_username,
  userId,
  // ns_uid,
  namespace,
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
  // if (namespace.nstype === NSType.Private) return Promise.reject('fail to modify private role');
  const kc = K8sApiDefault();
  const applyRoleRequest = _applyRoleRequest(kc, namespace.id);
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
export const bindingRole = async ({
  userId,
  k8s_username,
  ns_uid,
  role,
  direct,
  managerId
}: {
  userId: string;
  k8s_username: string;
  ns_uid: string;
  role: UserRole;
  direct?: boolean;
  managerId?: string;
}) => {
  const utn_result = await createUTN({
    userId,
    k8s_username,
    namespaceId: ns_uid,
    role,
    status: !!direct ? InvitedStatus.Accepted : InvitedStatus.Inviting,

    managerId
  });
  if (!utn_result) return null;
  return utn_result;
};
export const modifyBinding = async ({
  userId,
  k8s_username,
  namespaceId,
  role
}: {
  userId: string;
  k8s_username: string;
  namespaceId: string;
  role: UserRole;
}) => {
  const utn = await updateUTN({
    userId,
    k8s_username,
    namespaceId,
    role
  });
  return utn;
};

// 拒绝邀请 === 解绑
export const unbindingRole = async ({
  userId,
  k8s_username,
  ns_uid
}: {
  userId: string;
  k8s_username: string;
  ns_uid: string;
}) => {
  const utn_result = await deleteUTN({
    userId,
    namespaceId: ns_uid,
    k8s_username
  });
  if (!utn_result) return null;
  return utn_result;
};
// 接受邀请
export const acceptInvite = async ({
  userId,
  k8s_username,
  ns_uid: namespaceId
}: {
  userId: string;
  k8s_username: string;
  ns_uid: string;
}) => {
  const result = await updateUTN({
    userId,
    k8s_username,
    namespaceId,
    joinTime: new Date(),
    status: InvitedStatus.Accepted
  });
  return result;
};

// 检查用户是否有权限管理namespace, role 为被管理的角色
export async function checkCanManage({
  userId,
  namespaceId,
  k8s_username,
  tUserId,
  role
}: {
  userId: string;
  namespaceId: string;
  k8s_username: string;
  role: UserRole;
  tUserId: string;
}) {
  const item = await queryUTN({ userId, k8s_username, namespaceId });
  if (!item) return false;
  return vaildManage(item.role, userId)(role, tUserId);
}
