import { prisma } from './init';
import { UserRole } from '@/types/team';
import { Role } from 'prisma/region/generated/client';
import { UserRoleToRole, roleToUserRole } from '@/utils/tools';

type TWorkspace_invite_link = {
  role: UserRole;
  code: string;
  workspaceUid: string;
  createdAt: Date;
  inviterUid: string;
  inviterCrUid: string;
};

const WORKSPACE_INVITATION_EXPIRE_MS = 30 * 60 * 1000;

function toInviteLink(record: {
  role: Role;
  invitationCode: string;
  workspaceUid: string;
  createdAt: Date;
  inviterUid: string;
  inviterCrUid: string;
}): TWorkspace_invite_link {
  return {
    role: roleToUserRole(record.role),
    code: record.invitationCode,
    workspaceUid: record.workspaceUid,
    createdAt: record.createdAt,
    inviterUid: record.inviterUid,
    inviterCrUid: record.inviterCrUid
  };
}

export async function addOrUpdateInviteCode({
  code,
  inviterUid,
  role,
  workspaceUid,
  inviterCrUid
}: Omit<TWorkspace_invite_link, 'createdAt'>) {
  const prismaRole = UserRoleToRole(role);

  return prisma.workspaceInvitations.upsert({
    where: {
      workspaceUid_inviterUid_inviterCrUid_role: {
        workspaceUid,
        inviterUid,
        inviterCrUid,
        role: prismaRole
      }
    },
    create: {
      workspaceUid,
      inviterUid,
      inviterCrUid,
      role: prismaRole,
      invitationCode: code,
      expiresAt: new Date(Date.now() + WORKSPACE_INVITATION_EXPIRE_MS)
    },
    update: {
      invitationCode: code,
      expiresAt: new Date(Date.now() + WORKSPACE_INVITATION_EXPIRE_MS)
    }
  });
}

export async function getInviteCode({
  inviterUid,
  role,
  workspaceUid,
  inviterCrUid
}: Omit<TWorkspace_invite_link, 'createdAt' | 'code'>) {
  const result = await prisma.workspaceInvitations.findFirst({
    where: {
      inviterUid,
      inviterCrUid,
      workspaceUid,
      role: UserRoleToRole(role),
      expiresAt: {
        gt: new Date()
      }
    }
  });

  return result
    ? toInviteLink({
        role: result.role,
        invitationCode: result.invitationCode,
        workspaceUid: result.workspaceUid,
        createdAt: result.createdAt,
        inviterUid: result.inviterUid,
        inviterCrUid: result.inviterCrUid
      })
    : null;
}

export async function findInviteCode(code: string) {
  const result = await prisma.workspaceInvitations.findUnique({
    where: {
      invitationCode: code
    }
  });

  if (!result || result.expiresAt <= new Date()) return null;

  return toInviteLink({
    role: result.role,
    invitationCode: result.invitationCode,
    workspaceUid: result.workspaceUid,
    createdAt: result.createdAt,
    inviterUid: result.inviterUid,
    inviterCrUid: result.inviterCrUid
  });
}
