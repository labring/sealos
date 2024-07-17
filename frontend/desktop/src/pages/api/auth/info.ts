import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { globalPrisma, prisma } from '@/services/backend/db/init';
import { ProviderType } from 'prisma/global/generated/client';
import { verifyAccessToken } from '@/services/backend/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const regionUser = await verifyAccessToken(req.headers);
    if (!regionUser)
      return jsonRes(res, {
        code: 401,
        message: 'invalid token'
      });
    const [regionData, globalData] = await Promise.all([
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
      })
    ]);
    if (!regionData || !globalData)
      return jsonRes(res, {
        code: 404,
        message: 'Not found'
      });
    const info = {
      ...globalData,
      oauthProvider: globalData.oauthProvider.map((o) => ({
        providerType: o.providerType,
        providerId: (
          [ProviderType.PHONE, ProviderType.PASSWORD, ProviderType.EMAIL] as ProviderType[]
        ).includes(o.providerType)
          ? o.providerId
          : ''
      }))
    };
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
