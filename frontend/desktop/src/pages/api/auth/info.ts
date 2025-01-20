import { verifyAccessToken } from '@/services/backend/auth';
import { globalPrisma, prisma } from '@/services/backend/db/init';
import { jsonRes } from '@/services/backend/response';
import {
  enableEmailSms,
  enableGithub,
  enableGoogle,
  enablePassword,
  enablePhoneSms,
  enableWechat
} from '@/services/enable';
import { NextApiRequest, NextApiResponse } from 'next';
import { ProviderType } from 'prisma/global/generated/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const regionUser = await verifyAccessToken(req.headers);
    if (!regionUser)
      return jsonRes(res, {
        code: 401,
        message: 'invalid token'
      });
    const [regionData, globalData, realNameInfo, enterpriseRealNameInfo, restrictedUser] =
      await Promise.all([
        prisma.userCr.findUnique({
          where: {
            uid: regionUser.userCrUid
          }
        }),
        globalPrisma.user.findUnique({
          where: {
            uid: regionUser.userUid
          },
          include: {
            oauthProvider: {
              select: {
                providerType: true,
                providerId: true
              }
            }
          }
        }),
        globalPrisma.userRealNameInfo.findUnique({
          where: {
            userUid: regionUser.userUid
          }
        }),
        globalPrisma.enterpriseRealNameInfo.findUnique({
          where: {
            userUid: regionUser.userUid
          }
        }),
        globalPrisma.restrictedUser.findUnique({
          where: {
            userUid: regionUser.userUid
          }
        })
      ]);

    if (!regionData || !globalData)
      return jsonRes(res, {
        code: 404,
        message: 'Not found'
      });

    const info: {
      oauthProvider: { providerType: ProviderType; providerId: string }[];
      uid: string;
      createdAt: Date;
      updatedAt: Date;
      avatarUri: string;
      nickname: string;
      id: string;
      name: string;
      realName?: string;
      enterpriseRealName?: string;
      userRestrictedLevel?: number;
    } = {
      ...globalData,
      oauthProvider: globalData.oauthProvider
        .filter((o) => {
          if (o.providerType === ProviderType.GOOGLE) {
            return enableGoogle();
          } else if (o.providerType === ProviderType.GITHUB) {
            return enableGithub();
          } else if (o.providerType === ProviderType.PHONE) {
            return enablePhoneSms();
          } else if (o.providerType === ProviderType.EMAIL) {
            return enableEmailSms();
          } else if (o.providerType === ProviderType.PASSWORD) {
            return enablePassword();
          } else if (o.providerType === ProviderType.WECHAT) {
            return enableWechat();
          }
          return true;
        })
        .map((o) => ({
          providerType: o.providerType,
          providerId: (
            [ProviderType.PHONE, ProviderType.PASSWORD, ProviderType.EMAIL] as ProviderType[]
          ).includes(o.providerType)
            ? o.providerId
            : ''
        }))
    };

    if (realNameInfo && realNameInfo.isVerified && realNameInfo.realName) {
      info.realName = realNameInfo.realName;
    }

    if (
      enterpriseRealNameInfo &&
      enterpriseRealNameInfo.isVerified &&
      enterpriseRealNameInfo.enterpriseName
    ) {
      info.enterpriseRealName = enterpriseRealNameInfo.enterpriseName;
    }

    if (restrictedUser) {
      info.userRestrictedLevel = restrictedUser.restrictedLevel;
    }

    return jsonRes(res, {
      code: 200,
      message: 'Successfully',
      data: {
        info
      }
    });
  } catch (err) {
    console.log(err);
    return jsonRes(res, {
      message: 'Failed to get info',
      code: 500
    });
  }
}
