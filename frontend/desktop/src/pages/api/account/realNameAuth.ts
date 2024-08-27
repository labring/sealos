import { jsonRes } from '@/services/backend/response';
import { enableRealNameAuth } from '@/services/enable';
import { z } from 'zod';
import type { NextApiRequest, NextApiResponse } from 'next';
import * as tcsdk from 'tencentcloud-sdk-nodejs';
import { verifyAccessToken } from '@/services/backend/auth';
import { identityCodeValid } from '@/utils/tools';
import { globalPrisma } from '@/services/backend/db/init';

type TencentCloudPhone3efConfig = {
  secretId: string;
  secretKey: string;
};

// type OtherBackendConfig = { ... };

// backend_authType
type ConfigMap = {
  TENCENTCLOUD_tcloudphone3ef: TencentCloudPhone3efConfig;
  // 'OTHER_BACKEND_authType': OtherBackendConfig;
};

type RealNameAuthProvider = {
  id: string;
  backend: string;
  authType: string;
  maxFailedTimes: number;
  config: ConfigType;
  createdAt: Date;
  updatedAt: Date;
};

type ConfigType = {
  [K in keyof ConfigMap]: RealNameAuthProvider extends { backend: infer B; authType: infer A }
    ? `${B extends string ? B : never}_${A extends string ? A : never}` extends K
      ? ConfigMap[K]
      : never
    : never;
}[keyof ConfigMap];

const bodySchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Name must not be empty' })
    .max(20, { message: 'Name must not exceed 20 characters' }),
  idCard: z.string().refine(identityCodeValid, { message: 'Invalid ID card number' })
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableRealNameAuth) {
    console.error('realNameAuth: Real name authentication not enabled');
    return jsonRes(res, { code: 503, message: 'Real name authentication not enabled' });
  }

  if (req.method !== 'POST') {
    console.error('realNameAuth: Method not allowed');
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }

  const payload = await verifyAccessToken(req.headers);
  if (!payload) return jsonRes(res, { code: 401, message: 'Token is invaild' });

  try {
    const { name, idCard } = bodySchema.parse(req.body);

    const oauthProvider = await globalPrisma.oauthProvider.findFirst({
      where: {
        userUid: payload.userUid,
        providerType: 'PHONE'
      }
    });

    if (!oauthProvider) {
      console.error('realNameAuth: User has not bound phone number');
      return jsonRes(res, { code: 400, message: 'Mobile number not bound' });
    }

    const phone = oauthProvider.providerId;

    const realNameAuthProvider = (await globalPrisma.realNameAuthProvider.findFirst({
      where: {
        backend: 'TENCENTCLOUD',
        authType: 'tcloudphone3ef'
      }
    })) as RealNameAuthProvider | null;

    const config = realNameAuthProvider?.config;

    if (!config) {
      throw new Error('realNameAuth: Real name authentication configuration not found');
    }

    const realNameInfo = await globalPrisma.userRealNameInfo.findUnique({
      where: {
        userUid: payload.userUid
      }
    });

    if (realNameInfo && realNameInfo.isVerified) {
      console.info(`realNameAuth: User ${payload.userUid} has already been verified`);
      return jsonRes(res, {
        code: 409,
        message: 'Identity verification has been completed, cannot be repeated.'
      });
    }

    if (realNameInfo && realNameInfo.idVerifyFailedTimes >= realNameAuthProvider.maxFailedTimes) {
      console.info(
        `realNameAuth: User ${payload.userUid} has reached the maximum number of failed attempts`
      );
      return jsonRes(res, {
        code: 429,
        message: 'You have exceeded the maximum number of attempts. Please submit a ticket'
      });
    }

    const { code, data } = await tcloudphone3efVerifyService(phone, name, idCard, config);

    /* '-4' and '-5' are the results of chargeable interfaces, 
    and the number of failures is recorded for subsequent limitation.
    */
    if (code === '-4' || code === '-5') {
      await globalPrisma.userRealNameInfo.upsert({
        where: { userUid: payload.userUid },
        update: {
          realName: name,
          idCard: idCard,
          phone: phone,
          idVerifyFailedTimes: {
            increment: 1
          },
          updatedAt: new Date()
        },
        create: {
          userUid: payload.userUid,
          realName: name,
          idCard: idCard,
          phone: phone,
          idVerifyFailedTimes: 1,
          isVerified: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    if (code !== 0) {
      console.info(
        `realNameAuth: Real name authentication failed,useruid ${payload.userUid} code:${code} data:${data}`
      );
      return jsonRes(res, {
        code: 400,
        message:
          'Identity verification failed. Please ensure that the name, ID number, and mobile number are consistent'
      });
    }

    await globalPrisma.userRealNameInfo.upsert({
      where: { userUid: payload.userUid },
      update: {
        realName: name,
        idCard: idCard,
        phone: phone,
        isVerified: true,
        updatedAt: new Date()
      },
      create: {
        userUid: payload.userUid,
        realName: name,
        idCard: idCard,
        phone: phone,
        idVerifyFailedTimes: 0,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return jsonRes(res, { code: 200, message: 'Identity verification success', data: { name } });
  } catch (error) {
    console.error('realNameAuth: Internal error');
    console.error(error);
    return jsonRes(res, { code: 500, data: 'The server has encountered an error' });
  }
}

async function tcloudphone3efVerifyService(
  phone: string,
  name: string,
  idCard: string,
  config: TencentCloudPhone3efConfig
) {
  const FaceClient = tcsdk.faceid.v20180301.Client;
  const client = new FaceClient({
    credential: {
      secretId: config.secretId,
      secretKey: config.secretKey
    },
    profile: {
      signMethod: 'HmacSHA256',
      httpProfile: {
        reqMethod: 'POST',
        reqTimeout: 30 // Request timeout, default 60s
      }
    }
  });

  const res = await client.PhoneVerification({
    Phone: phone,
    IdCard: idCard,
    Name: name
  });

  if (res?.Result !== '0') {
    return { code: res?.Result, data: res?.Description };
  }

  return { code: 0, data: res?.Description };
}
