import { InvitedStatus, UserRole } from '@/types/team';

export type TUserToNamespace = {
  userId: string;
  k8s_username: string;
  namespaceId: string;
  status: InvitedStatus;
  joinTime?: Date;
  role: UserRole;
  createTime: Date;
  updateTime?: Date;
  // 发起操作的人
  managerId?: string;
};
