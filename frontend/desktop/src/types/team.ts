import { K8sApiDefault } from '@/services/backend/kubernetes/admin';
import * as k8s from '@kubernetes/client-node';
import { UUID, createHash } from 'crypto';
import * as yaml from 'js-yaml';
export type RoleAction = 'Grant' | 'Deprive' | 'Change' | 'Create' | 'Modify';
export const ROLE_LIST = ['Owner', 'Manager', 'Developer'] as const;
export const INVITED_STATUS_LIST = ['Inviting', 'Accepted', 'Rejected'] as const;

export enum InvitedStatus {
  Inviting,
  Accepted,
  Rejected
}
export type teamMessageDto = {
  role: UserRole; // 根据role 可以判断是做啥
  teamName: string;
  nsid: string; //namespace id
  ns_uid: string; //namespace uid
  managerName: string;
};
export type RoleType = (typeof ROLE_LIST)[number];
type CRD = {
  apiVersion: 'user.sealos.io/v1';
  kind: 'Operationrequest';
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    user: string;
    action: 'Deprive' | 'Grant' | 'Update';
    role: RoleType;
  };
};
export const generateRequestCrd = ({
  ...props
}: CRD['spec'] & { namespace: string; name: string }) => {
  const requestCrd: CRD = {
    apiVersion: 'user.sealos.io/v1',
    kind: 'Operationrequest',
    metadata: {
      name: props.name,
      namespace: props.namespace
    },
    spec: {
      user: props.user,
      action: props.action,
      role: props.role
    }
  };
  try {
    const result = yaml.dump(requestCrd);
    return result;
  } catch (error) {
    return '';
  }
};
type DeleteCRD = {
  apiVersion: 'user.sealos.io/v1';
  kind: 'DeleteRequest';
  metadata: {
    name: string;
  };
  spec: {
    user: string;
  };
};
export const deleteRequestCrd = (props: DeleteCRD['spec']) => {
  const hash = createHash('sha256');
  hash.update(JSON.stringify(props));
  const name = hash.digest('hex');
  const requestCrd: DeleteCRD = {
    apiVersion: 'user.sealos.io/v1',
    kind: 'DeleteRequest',
    metadata: {
      name
    },
    spec: {
      user: props.user
    }
  };

  try {
    const result = yaml.dump(requestCrd);
    return result;
  } catch (error) {
    return '';
  }
};
export type Namespace = {
  // uuid v4
  uid: string;
  // ns 的名字 ns-xxx
  id: string;
  createTime: Date;
  // 展示到前端的名字
  teamName: string;
  readonly nstype: NSType;
};
export type NamespaceDto = {
  uid: string;
  // ns 的名字 ns-xxx
  id: string;
  createTime: Date;
  // 展示到前端的名字
  teamName: string;
  role: UserRole;
  readonly nstype: NSType;
};
export enum UserRole {
  Owner, // 0
  Manager, // 1
  Developer // 2
}
//可能是私人的ns, 也可能是团队的ns
export enum NSType {
  Team,
  Private
}
export enum UserNsStatus {
  Inviting,
  Accepted,
  Rejected
}

export type NSUser = {
  // uuid 真实身份
  userId: string;
  // 集群里的身份 nanoid
  k8s_username: string;
  joinTime: Date;
  role: UserRole;
  status: InvitedStatus;
};
export type TeamRolebinding = {
  kind: 'Role';
  apiVersion: 'rbac.authorization.k8s.io/v1';
  metadata: {
    name: RoleType;
    namespace: `ns-${string}`;
    uid: UUID;
    resourceVersion: string;
    creationTimestamp: string;
    annotations: {
      'user.sealos.io/creator': string;
      'user.sealos.io/owner': string;
    };
    ownerReferences: [[Object]];
    managedFields: [[Object]];
  };
  rules: [{ verbs: [Array<unknown>]; apiGroups: [Array<unknown>]; resources: [Array<unknown>] }];
};
