import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { enableRealNameAuth } from '@/services/enable';
import * as tcsdk from 'tencentcloud-sdk-nodejs';
import { NextApiRequest, NextApiResponse } from 'next';
import { globalPrisma } from '@/services/backend/db/init';
import { GetDetectInfoEnhancedResponse } from 'tencentcloud-sdk-nodejs/tencentcloud/services/faceid/v20180301/faceid_models';
import { RealNameOSSConfigType } from '@/types';
import { Client } from 'minio';

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

const realNameOSS: RealNameOSSConfigType = global.AppConfig.realNameOSS;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableRealNameAuth) {
    console.error('faceidRealNameAuth: Real name authentication not enabled');
    return jsonRes(res, { code: 503, message: 'Real name authentication not enabled' });
  }

  const bizToken = req.query?.BizToken as string;
  const extraQuery = req.query?.Extra as string;

  const regionToken = extraQuery?.split('regionToken=')[1];
  if (!regionToken) {
    return jsonRes(res, { code: 400, message: 'Token is required' });
  }

  req.headers['authorization'] = regionToken;

  const payload = await verifyAccessToken(req.headers);
  if (!payload) return jsonRes(res, { code: 401, message: 'Token is invaild' });

  if (!realNameOSS) {
    return jsonRes(res, {
      code: 500,
      message: 'Real name authentication oss configuration not found'
    });
  }

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

    const userRealNameFaceAuthInfo = await getUserRealNameInfo(bizToken, config);
    const isFaceRecognitionSuccess = userRealNameFaceAuthInfo.Text?.ErrCode === 0;

    const userUid = payload.userUid;
    const timestamp = Date.now();

    // Fetch existing user real name info
    const userRealNameInfo = await globalPrisma.userRealNameInfo.findUnique({
      where: { userUid }
    });

    if (!userRealNameInfo || !userRealNameInfo.additionalInfo) {
      return jsonRes(res, { code: 400, message: 'User real name info not found' });
    }

    let additionalInfo: AdditionalInfo = userRealNameInfo.additionalInfo;

    additionalInfo.faceRecognition.callback.isUsed = true;

    // Initialize or reset userMaterials array
    additionalInfo.userMaterials = [];

    const minioClient = new Client({
      endPoint: realNameOSS.endpoint,
      port: 9000, // Default MinIO port, adjust if necessary
      useSSL: false, // Set to true if using HTTPS
      accessKey: realNameOSS.accessKey,
      secretKey: realNameOSS.accessKeySecret
    });

    if (userRealNameFaceAuthInfo.BestFrame?.BestFrame) {
      const imageBuffer = Buffer.from(userRealNameFaceAuthInfo.BestFrame.BestFrame, 'base64');
      const imagePath = `${userUid}/${timestamp}_bestframe.jpg`;
      await uploadFile(
        minioClient,
        realNameOSS.realNameBucket,
        imagePath,
        imageBuffer,
        'image/jpeg'
      );
      additionalInfo.userMaterials.push(imagePath);
    }

    if (userRealNameFaceAuthInfo.VideoData?.LivenessVideo) {
      const videoBuffer = Buffer.from(userRealNameFaceAuthInfo.VideoData.LivenessVideo, 'base64');
      const videoPath = `${userUid}/${timestamp}_video.mp4`;
      await uploadFile(
        minioClient,
        realNameOSS.realNameBucket,
        videoPath,
        videoBuffer,
        'video/mp4'
      );
      additionalInfo.userMaterials.push(videoPath);
    }

    if (isFaceRecognitionSuccess) {
      await globalPrisma.userRealNameInfo.update({
        where: { userUid },
        data: {
          realName: userRealNameFaceAuthInfo.Text?.Name,
          idCard: userRealNameFaceAuthInfo.Text?.IdCard,
          isVerified: true,
          additionalInfo
        }
      });

      return jsonRes(res, { code: 200, message: 'Real name authentication successful' });
    } else {
      await globalPrisma.userRealNameInfo.update({
        where: { userUid },
        data: {
          isVerified: false,
          idVerifyFailedTimes: { increment: 1 },
          additionalInfo
        }
      });

      return jsonRes(res, { code: 400, message: 'Real name authentication failed' });
    }
  } catch (error) {
    console.error('faceidRealNameAuth: Internal error');
    console.error(error);
    return jsonRes(res, { code: 500, data: 'The server has encountered an error' });
  }
}

async function getUserRealNameInfo(
  bizToken: string,
  config: TencentCloudFaceAuthConfig
): Promise<GetDetectInfoEnhancedResponse> {
  const FaceClient = tcsdk.faceid.v20180301.Client;
  const client = new FaceClient({
    credential: {
      secretId: config.secretId,
      secretKey: config.secretKey
    },
    region: '',
    profile: {
      signMethod: 'HmacSHA256',
      httpProfile: {
        endpoint: 'faceid.tencentcloudapi.com',
        reqMethod: 'POST',
        reqTimeout: 30 // Request timeout, default 60s
      }
    }
  });

  const params = {
    BizToken: bizToken,
    InfoType: '0',
    RuleId: config.ruleId,
    BestFramesCount: 0
  };

  const data = await client.GetDetectInfoEnhanced(params);
  return data;
}

async function uploadFile(
  minioClient: Client,
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  await minioClient.putObject(bucket, path, buffer, buffer.length, { 'Content-Type': contentType });
}
