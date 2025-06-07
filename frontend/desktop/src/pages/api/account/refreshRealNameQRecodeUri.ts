import { jsonRes } from '@/services/backend/response';
import { enableRealNameAuth } from '@/services/enable';
import type { NextApiRequest, NextApiResponse } from 'next';
import * as tcsdk from 'tencentcloud-sdk-nodejs';
import { generateAuthenticationToken, verifyAccessToken } from '@/services/backend/auth';
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
    console.error('refreshRealNameQRecodeUri: Real name authentication not enabled');
    return jsonRes(res, { code: 503, message: 'Real name authentication not enabled' });
  }

  if (req.method !== 'POST') {
    console.error('refreshRealNameQRecodeUri: Method not allowed');
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
      throw new Error('refreshRealNameQRecodeUri: Real name authentication provider not found');
    }

    const config: TencentCloudFaceAuthConfig =
      realNameAuthProvider.config as TencentCloudFaceAuthConfig;

    if (!config) {
      throw new Error(
        'refreshRealNameQRecodeUri: Real name authentication configuration not found'
      );
    }

    const realNameInfo = await globalPrisma.userRealNameInfo.findUnique({
      where: {
        userUid: payload.userUid
      }
    });

    if (
      !realNameInfo ||
      !(<AdditionalInfo>realNameInfo.additionalInfo)?.faceRecognition?.callback?.url
    ) {
      console.info('refreshRealNameQRecodeUri: User real name info not found');
      return jsonRes(res, {
        code: 409,
        message: 'refresh real name qrcode uri failed need user real name info exist'
      });
    }

    if (realNameInfo.isVerified) {
      console.info(`refreshRealNameQRecodeUri: User ${payload.userUid} has already been verified`);
      return jsonRes(res, {
        code: 409,
        message: 'user real name info already verified, cannot be repeated.'
      });
    }

    if (realNameInfo.idVerifyFailedTimes >= realNameAuthProvider.maxFailedTimes) {
      console.info(
        `refreshRealNameQRecodeUri: User ${payload.userUid} has reached the maximum number of failed attempts`
      );
      return jsonRes(res, {
        code: 429,
        message: 'You have exceeded the maximum number of attempts. Please submit a ticket'
      });
    }

    let additionalInfo: AdditionalInfo = realNameInfo?.additionalInfo;

    const currentTime = new Date().getTime();

    const redirectUrl =
      global.AppConfig?.common.realNameCallbackUrl ||
      `https://${global.AppConfig?.cloud.domain}/api/account/faceIdRealNameAuthCallback`;

    const globalToken = generateAuthenticationToken(
      {
        userUid: payload.userUid,
        userId: payload.userId
      },
      '3h'
    );

    const urlResult: QRCodeUrlResult = await generateRealNameQRcodeUri(
      redirectUrl,
      globalToken,
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

    await globalPrisma.userRealNameInfo.update({
      where: { userUid: payload.userUid },
      data: {
        idVerifyFailedTimes: {
          increment: 1
        },
        additionalInfo
      }
    });

    return jsonRes(res, {
      code: 200,
      message: 'success refresh real name auth url'
    });
  } catch (error) {
    console.error('refreshRealNameQRecodeUri: Internal error');
    console.error(error);
    return jsonRes(res, { code: 500, data: 'The server has encountered an error' });
  }
}

async function generateRealNameQRcodeUri(
  redirectUrl: string,
  globalToken: string,
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
    Extra: `globalToken=${globalToken}`
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
