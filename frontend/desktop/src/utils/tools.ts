import { InvitedStatus, UserNsStatus, UserRole } from '@/types/team';
import dayjs from 'dayjs';
import { JoinStatus, Role } from 'prisma/region/generated/client';
import { Prisma as GlobalPrisma } from 'prisma/global/generated/client';
import { OauthProvider } from '@/types/user';
import { Prisma } from '@prisma/client/extension';
import { globalPrisma } from '@/services/backend/db/init';

export const validateNumber = (num: number) => typeof num === 'number' && isFinite(num) && num > 0;

export const formatTime = (time: string | number | Date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return dayjs(time).format(format);
};

export function appWaitSeconds(ms: number) {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

export async function getBase64FromRemote(url: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobToBase64 = (blob: Blob) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => {
          const dataUrl = reader.result;
          resolve(dataUrl);
        };
        reader.onerror = (error) => {
          reject(error);
        };
      });

    return await blobToBase64(blob);
  } catch {
    return '';
  }
}

export const getFavorable =
  (steps: number[] = [], ratios: number[] = []) =>
  (amount: number) => {
    let ratio = 0;

    const step = [...steps].reverse().findIndex((step) => amount >= step);
    if (ratios.length > step && step > -1) ratio = [...ratios].reverse()[step];
    return Math.floor((amount * ratio) / 100);
  };
export const retrySerially = <T>(fn: () => Promise<T>, times: number) =>
  new Promise<T>((res, rej) => {
    let retries = 0;
    const attempt = () => {
      fn()
        .then((_res) => {
          res(_res);
        })
        .catch((error) => {
          retries++;
          console.log(`Attempt ${retries} failed: ${error}`);
          retries < times ? attempt() : rej(error);
        });
    };
    attempt();
  });
// search manager relation
export const vaildManage = (ownRole: UserRole) => (targetRole: UserRole, isSelf: boolean) => {
  if (targetRole === UserRole.Owner) return [UserRole.Owner].includes(ownRole); // only owner
  else if (targetRole === UserRole.Manager)
    //
    return [UserRole.Owner, ...(isSelf ? [UserRole.Manager] : [])].includes(ownRole);
  // manager via self
  else if (targetRole === UserRole.Developer)
    return [UserRole.Owner, UserRole.Manager, ...(isSelf ? [UserRole.Developer] : [])].includes(
      ownRole
    );
  else return false;
};
export const isUserRole = (role: any): role is UserRole =>
  [UserRole.Developer, UserRole.Manager, UserRole.Owner].includes(role);
export const UserRoleToRole = (role: UserRole): Role =>
  [Role.OWNER, Role.MANAGER, Role.DEVELOPER][role];
export const roleToUserRole = (role: Role): UserRole => {
  const map: Record<Role, UserRole> = {
    [Role.OWNER]: UserRole.Owner,
    [Role.MANAGER]: UserRole.Manager,
    [Role.DEVELOPER]: UserRole.Developer
  };
  return map[role];
};
export const joinStatusToNStatus = (js: JoinStatus): InvitedStatus => {
  const map: Record<JoinStatus, InvitedStatus> = {
    [JoinStatus.NOT_IN_WORKSPACE]: InvitedStatus.Rejected,
    [JoinStatus.INVITED]: InvitedStatus.Inviting,
    [JoinStatus.IN_WORKSPACE]: InvitedStatus.Accepted
  };
  return map[js];
};
export const NStatusToJoinStatus = (ns: InvitedStatus): JoinStatus => {
  return [JoinStatus.INVITED, JoinStatus.IN_WORKSPACE, JoinStatus.NOT_IN_WORKSPACE][ns];
};

export function compareFirstLanguages(acceptLanguageHeader: string) {
  const indexOfZh = acceptLanguageHeader.indexOf('zh');
  const indexOfEn = acceptLanguageHeader.indexOf('en');
  if (indexOfZh === -1) return 'en';
  if (indexOfEn === -1 || indexOfZh < indexOfEn) return 'zh';
  return 'en';
}

type TOauthProviders = Prisma.Result<
  typeof globalPrisma.oauthProvider,
  GlobalPrisma.OauthProviderDefaultArgs,
  'findMany'
>;

export function userCanMerge(
  mergeUserOauthProviders: TOauthProviders,
  userOauthProviders: TOauthProviders
) {
  const curTypeList = userOauthProviders.map((o) => o.providerType);
  const mergeTypeSet = new Set(mergeUserOauthProviders.map((o) => o.providerType));
  const canMerge = curTypeList.every((t) => !mergeTypeSet.has(t));
  return canMerge;
}
