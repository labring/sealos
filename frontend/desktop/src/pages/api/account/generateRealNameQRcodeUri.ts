import { jsonRes } from '@/services/backend/response';
import { enableRealNameAuth } from '@/services/enable';
import type { NextApiRequest, NextApiResponse } from 'next';
import * as tcsdk from 'tencentcloud-sdk-nodejs';
import { verifyAccessToken } from '@/services/backend/auth';
import { globalPrisma } from '@/services/backend/db/init';

type TencentCloudFaceAuthConfig = {
  secretId: string;
  secretKey: string;
  ruleId: string;
};

type JsonValue = string | number | boolean | object | null;

type RealNameAuthProvider = {
  id: string;
  backend: string;
  authType: string;
  maxFailedTimes: number;
  config: JsonValue;
  createdAt: Date;
  updatedAt: Date;
};

type AdditionalInfo =
  | {
      faceRecognition?: {
        callback?: {
          bizToken?: string;
          url?: string | null;
          isUsed?: boolean;
          createdAt?: number;
        };
      };
      userMaterials?: string[];
    }
  | any;

type QRCodeUrlResult = {
  url: string;
  bizToken: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableRealNameAuth) {
    console.error('faceidRealNameAuth: Real name authentication not enabled');
    return jsonRes(res, { code: 503, message: 'Real name authentication not enabled' });
  }

  if (req.method !== 'GET') {
    console.error('faceidRealNameAuth: Method not allowed');
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }

  const payload = await verifyAccessToken(req.headers);
  if (!payload) return jsonRes(res, { code: 401, message: 'Token is invaild' });

  try {
    const realNameAuthProvider: RealNameAuthProvider | null =
      await globalPrisma.realNameAuthProvider.findFirst({
        where: {
          backend: 'TENCENTCLOUD',
          authType: 'tcloudFaceAuth'
        }
      });

    if (!realNameAuthProvider) {
      throw new Error('faceidRealNameAuth: Real name authentication provider not found');
    }

    const config: TencentCloudFaceAuthConfig =
      realNameAuthProvider.config as TencentCloudFaceAuthConfig;

    if (!config) {
      throw new Error('faceidRealNameAuth: Real name authentication configuration not found');
    }

    const realNameInfo = await globalPrisma.userRealNameInfo.findUnique({
      where: {
        userUid: payload.userUid
      }
    });

    if (realNameInfo && realNameInfo.isVerified) {
      console.info(`faceidRealNameAuth: User ${payload.userUid} has already been verified`);
      return jsonRes(res, {
        code: 409,
        message: 'Identity verification has been completed, cannot be repeated.'
      });
    }

    if (realNameInfo && realNameInfo.idVerifyFailedTimes >= realNameAuthProvider.maxFailedTimes) {
      console.info(
        `faceidRealNameAuth: User ${payload.userUid} has reached the maximum number of failed attempts`
      );
      return jsonRes(res, {
        code: 429,
        message: 'You have exceeded the maximum number of attempts. Please submit a ticket'
      });
    }

    let urlResult: QRCodeUrlResult | null = null;
    let additionalInfo: AdditionalInfo = realNameInfo?.additionalInfo || {};

    const currentTime = new Date().getTime();
    const urlCreatedAt = additionalInfo.faceRecognition?.callback?.createdAt || 0;
    const urlExpirationTime = 7200 * 1000;

    /* If the user has not been authenticated, or the authentication link has expired,
     or the authentication link has already been used, 
    the authentication link needs to be regenerated.
    */

    const shouldGenerateNewUrl =
      !realNameInfo ||
      !additionalInfo.faceRecognition?.callback?.url ||
      additionalInfo.faceRecognition?.callback?.isUsed ||
      currentTime - urlCreatedAt > urlExpirationTime;

    if (shouldGenerateNewUrl) {
      const redirectUrl = `https://${global.AppConfig?.cloud.domain}/api/account/faceIdRealNameAuthCallback`;
      const regionToken = req.headers['authorization'] as string;
      urlResult = await generateRealNameQRcodeUri(
        redirectUrl,
        regionToken,
        config as TencentCloudFaceAuthConfig
      );

      additionalInfo = {
        ...additionalInfo,
        faceRecognition: {
          ...additionalInfo.faceRecognition,
          callback: {
            bizToken: urlResult.bizToken,
            url: urlResult.url,
            isUsed: false,
            createdAt: currentTime
          }
        }
      };

      await globalPrisma.userRealNameInfo.upsert({
        where: { userUid: payload.userUid },
        update: { additionalInfo },
        create: {
          userUid: payload.userUid,
          isVerified: false,
          idVerifyFailedTimes: 0,
          additionalInfo
        }
      });
    } else {
      urlResult = {
        url: additionalInfo.faceRecognition?.callback?.url || null,
        bizToken: additionalInfo.faceRecognition?.callback?.bizToken || null
      };
    }

    return jsonRes(res, {
      code: 200,
      message: 'success generate real name auth url',
      data: { url: urlResult.url, bizToken: urlResult.bizToken }
    });
  } catch (error) {
    console.error('faceidRealNameAuth: Internal error');
    console.error(error);
    return jsonRes(res, { code: 500, data: 'The server has encountered an error' });
  }
}

async function generateRealNameQRcodeUri(
  redirectUrl: string,
  regionToken: string,
  config: TencentCloudFaceAuthConfig
): Promise<QRCodeUrlResult> {
  const FaceClient = tcsdk.faceid.v20180301.Client;
  const client = new FaceClient({
    credential: {
      secretId: config.secretId,
      secretKey: config.secretKey
    }
    // region: '',
    // profile: {
    //   signMethod: 'HmacSHA256',
    //   httpProfile: {
    //     endpoint: 'faceid.tencentcloudapi.com',
    //     reqMethod: 'POST',
    //     reqTimeout: 30 // Request timeout, default 60s
    //   }
    // }
  });

  const params = {
    RuleId: config.ruleId,
    RedirectUrl: redirectUrl,
    Extra: `regionToken=${regionToken}`
  };

  const data = await client.DetectAuth(params);

  if (!data.Url || !data.BizToken) {
    throw new Error('Failed to generate QR code URL: Missing Url or BizToken');
  }

  return {
    url: data.Url,
    bizToken: data.BizToken
  };
}
