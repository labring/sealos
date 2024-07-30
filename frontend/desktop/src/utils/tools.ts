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

/*
根据〖中华人民共和国国家标准 GB 11643-1999〗中有关公民身份号码的规定，公民身份号码是特征组合码，由十七位数字本体码和一位数字校验码组成。排列顺序从左至右依次为：六位数字地址码，八位数字出生日期码，三位数字顺序码和一位数字校验码。
    地址码表示编码对象常住户口所在县(市、旗、区)的行政区划代码。
    出生日期码表示编码对象出生的年、月、日，其中年份用四位数字表示，年、月、日之间不用分隔符。
    顺序码表示同一地址码所标识的区域范围内，对同年、月、日出生的人员编定的顺序号。顺序码的奇数分给男性，偶数分给女性。
    校验码是根据前面十七位数字码，按照ISO 7064:1983.MOD 11-2校验码计算出来的检验码。
出生日期计算方法。
    15位的身份证编码首先把出生年扩展为4位，简单的就是增加一个19或18,这样就包含了所有1800-1999年出生的人;
    2000年后出生的肯定都是18位的了没有这个烦恼，至于1800年前出生的,那啥那时应该还没身份证号这个东东，⊙﹏⊙b汗...
下面是正则表达式:
 出生日期1800-2099  (18|19|20)?\d{2}(0[1-9]|1[12])(0[1-9]|[12]\d|3[01])
 身份证正则表达式 /^\d{6}(18|19|20)?\d{2}(0[1-9]|1[012])(0[1-9]|[12]\d|3[01])\d{3}(\d|X)$/i
 15位校验规则 6位地址编码+6位出生日期+3位顺序号
 18位校验规则 6位地址编码+8位出生日期+3位顺序号+1位校验位

 校验位规则     公式:∑(ai×Wi)(mod 11)……………………………………(1)
                公式(1)中：
                i----表示号码字符从由至左包括校验码在内的位置序号；
                ai----表示第i位置上的号码字符值；
                Wi----示第i位置上的加权因子，其数值依据公式Wi=2^(n-1）(mod 11)计算得出。
                i 18 17 16 15 14 13 12 11 10 9 8 7 6 5 4 3 2 1
                Wi 7 9 10 5 8 4 2 1 6 3 7 9 10 5 8 4 2 1
*/
//身份证号合法性验证
//支持15位和18位身份证号
//支持地址编码、出生日期、校验位验证
export function identityCodeValid(code: string): boolean {
  const city: { [key: number]: string } = {
    11: '北京',
    12: '天津',
    13: '河北',
    14: '山西',
    15: '内蒙古',
    21: '辽宁',
    22: '吉林',
    23: '黑龙江 ',
    31: '上海',
    32: '江苏',
    33: '浙江',
    34: '安徽',
    35: '福建',
    36: '江西',
    37: '山东',
    41: '河南',
    42: '湖北 ',
    43: '湖南',
    44: '广东',
    45: '广西',
    46: '海南',
    50: '重庆',
    51: '四川',
    52: '贵州',
    53: '云南',
    54: '西藏 ',
    61: '陕西',
    62: '甘肃',
    63: '青海',
    64: '宁夏',
    65: '新疆',
    71: '台湾',
    81: '香港',
    82: '澳门',
    91: '国外 '
  };
  let pass = true;

  if (
    !code ||
    !/^\d{6}(18|19|20)?\d{2}(0[1-9]|1[012])(0[1-9]|[12]\d|3[01])\d{3}(\d|X)$/i.test(code)
  ) {
    pass = false;
  } else if (!city[parseInt(code.substr(0, 2), 10)]) {
    pass = false;
  } else {
    // 18位身份证需要验证最后一位校验位
    if (code.length === 18) {
      const codeArray = code.split('') as (string | number)[];
      // ∑(ai×Wi)(mod 11)
      // 加权因子
      const factor: number[] = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
      // 校验位
      const parity: (number | string)[] = [1, 0, 'X', 9, 8, 7, 6, 5, 4, 3, 2];
      let sum = 0;

      for (let i = 0; i < 17; i++) {
        const ai = parseInt(codeArray[i] as string, 10); // 将字符转换为数字
        const wi = factor[i];
        sum += ai * wi;
      }

      const last = parity[sum % 11];
      if (last.toString() !== codeArray[17].toString().toUpperCase()) {
        pass = false;
      }
    }
  }

  return pass;
}
