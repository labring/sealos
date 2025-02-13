import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { enableRealNameAuth } from '@/services/enable';
import * as tcsdk from 'tencentcloud-sdk-nodejs';
import { NextApiRequest, NextApiResponse } from 'next';
import { globalPrisma } from '@/services/backend/db/init';
import { GetDetectInfoEnhancedResponse } from 'tencentcloud-sdk-nodejs/tencentcloud/services/faceid/v20180301/faceid_models';
import { RealNameOSSConfigType } from '@/types';
import { Client, ClientOptions } from 'minio';
import { getInviterInfo } from '@/utils/getInviteInfo';

export type TencentCloudFaceAuthConfig = {
  secretId: string;
  secretKey: string;
  ruleId: string;
  realNameAuthReward?: number;
};

type JsonValue = string | number | boolean | object | null;

export type RealNameAuthProvider = {
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

    const realNameAuthReward = config.realNameAuthReward;

    const userRealNameFaceAuthInfo = await getUserRealNameInfo(bizToken, config);
    const isFaceRecognitionSuccess = userRealNameFaceAuthInfo.Text?.ErrCode === 0;

    const userUid = payload.userUid;
    const userId = payload.userId;
    const timestamp = Date.now();

    // Fetch existing user real name info
    const userRealNameInfo = await globalPrisma.userRealNameInfo.findUnique({
      where: { userUid }
    });

    if (!userRealNameInfo || !userRealNameInfo.additionalInfo) {
      return jsonRes(res, { code: 400, message: 'User real name info not found' });
    }

    if (userRealNameInfo.isVerified) {
      return jsonRes(res, { code: 400, message: 'User real name info already verified' });
    }

    const inviteInfo = await getInviterInfo(userId);

    let additionalInfo: AdditionalInfo = userRealNameInfo.additionalInfo;

    additionalInfo.faceRecognition.callback.isUsed = true;

    // Initialize or reset userMaterials array
    additionalInfo.userMaterials = [];

    const minioConfig: ClientOptions = {
      endPoint: realNameOSS.endpoint,
      accessKey: realNameOSS.accessKey,
      secretKey: realNameOSS.accessKeySecret,
      useSSL: realNameOSS.ssl
    };
    const minioClient = new Client(minioConfig);

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

    if (!isFaceRecognitionSuccess) {
      await globalPrisma.userRealNameInfo.update({
        where: { userUid: userUid },
        data: {
          isVerified: false,
          idVerifyFailedTimes: { increment: 1 },
          additionalInfo: additionalInfo
        }
      });

      res.setHeader('Content-Type', 'text/html');
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Real Name Authentication</title>
          <style>
            body, html {
              height: 100%;
              margin: 0;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            h1 {
              text-align: center;
              color: #ff0000; /* Red color for error message */
            }
          </style>
        </head>
        <body>
          <h1>Real Name Authentication Failed</h1>
        </body>
        </html>
      `);
    }

    const realnameInfo = await globalPrisma.userRealNameInfo.findFirst({
      where: {
        realName: userRealNameFaceAuthInfo.Text?.Name,
        idCard: userRealNameFaceAuthInfo.Text?.IdCard,
        isVerified: true
      }
    });

    if (realnameInfo) {
      await globalPrisma.userRealNameInfo.update({
        where: { userUid: userUid },
        data: {
          isVerified: false,
          idVerifyFailedTimes: { increment: 1 },
          additionalInfo: additionalInfo
        }
      });

      res.setHeader('Content-Type', 'text/html');
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Real Name Authentication</title>
          <style>
            body, html {
              height: 100%;
              margin: 0;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            h1 {
              text-align: center;
              color: #ff0000; /* Red color for error message */
            }
          </style>
        </head>
        <body>
          <h1>Real name information has been used</h1>
        </body>
        </html>
      `);
    }

    if (realNameAuthReward) {
      await globalPrisma.$transaction(async (globalPrisma) => {
        const currentAccount = await globalPrisma.account.findUniqueOrThrow({
          where: { userUid }
        });

        if (!currentAccount.balance) {
          throw new Error('faceidRealNameAuth: Account balance not found');
        }

        const currentActivityBonus = currentAccount.activityBonus || BigInt(0);
        const realnameReward = BigInt(realNameAuthReward);

        const newActivityBonus = currentActivityBonus + realnameReward;
        const newBalance = currentAccount.balance + realnameReward;

        const updatedAccount = await globalPrisma.account.update({
          where: { userUid },
          data: {
            activityBonus: newActivityBonus,
            balance: newBalance
          }
        });

        const userRealNameInfo = await globalPrisma.userRealNameInfo.update({
          where: { userUid },
          data: {
            realName: userRealNameFaceAuthInfo.Text?.Name,
            idCard: userRealNameFaceAuthInfo.Text?.IdCard,
            isVerified: true,
            additionalInfo: additionalInfo
          }
        });

        const accountTransaction = await globalPrisma.accountTransaction.create({
          data: {
            type: 'REALNAME_AUTH_REWARD',
            userUid: userUid,
            balance: realnameReward,
            balance_before: currentAccount.balance,
            deduction_balance: 0, // No deduction in this case
            deduction_balance_before: currentAccount.deduction_balance,
            message: 'Real name authentication reward',
            billing_id: userRealNameInfo.id // You'll need to implement this function
          }
        });

        await globalPrisma.userTask.updateMany({
          where: {
            userUid,
            task: {
              taskType: 'REAL_NAME_AUTH'
            },
            status: 'NOT_COMPLETED'
          },
          data: {
            rewardStatus: 'COMPLETED',
            status: 'COMPLETED',
            completedAt: new Date()
          }
        });

        if (inviteInfo.inviterId && inviteInfo.amount) {
          const inviterUser = await globalPrisma.user.findUniqueOrThrow({
            where: { id: inviteInfo.inviterId }
          });

          if (!inviterUser) {
            throw new Error('faceidRealNameAuth: Inviter user not found');
          }

          const inviterAccount = await globalPrisma.account.findUniqueOrThrow({
            where: { userUid: inviterUser.uid }
          });

          if (!inviterAccount.balance) {
            throw new Error('faceidRealNameAuth: Inviter account balance not found');
          }

          const currentActivityBonus = inviterAccount.activityBonus || BigInt(0);
          const realnameInviteReward = inviteInfo.amount;

          const newActivityBonus = currentActivityBonus + realnameInviteReward;
          const newBalance = inviterAccount.balance + realnameInviteReward;

          await globalPrisma.account.update({
            where: { userUid: inviterUser.uid },
            data: {
              activityBonus: newActivityBonus,
              balance: newBalance
            }
          });

          await globalPrisma.accountTransaction.create({
            data: {
              type: 'REALNAME_AUTH_INVITE_REWARD',
              userUid: inviterUser.uid,
              balance: realnameInviteReward,
              balance_before: inviterAccount.balance,
              deduction_balance: 0, // No deduction in this case
              deduction_balance_before: inviterAccount.deduction_balance,
              message: 'Real name authentication invite reward',
              billing_id: userRealNameInfo.id // You'll need to implement this function
            }
          });
        }

        return {
          account: updatedAccount,
          transaction: accountTransaction,
          userRealNameInfo: userRealNameInfo
        };
      });

      res.setHeader('Content-Type', 'text/html');
      return res.send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Real Name Authentication</title>
            <style>
              body, html {
                height: 100%;
                margin: 0;
                display: flex;
                justify-content: center;
                align-items: center;
              }
              h1 {
                text-align: center;
              }
            </style>
          </head>
          <body>
            <h1>Real Name Authentication Successful</h1>
          </body>
          </html>
        `);
    }

    await globalPrisma.userRealNameInfo.update({
      where: { userUid },
      data: {
        realName: userRealNameFaceAuthInfo.Text?.Name,
        idCard: userRealNameFaceAuthInfo.Text?.IdCard,
        isVerified: true,
        additionalInfo: additionalInfo
      }
    });

    res.setHeader('Content-Type', 'text/html');
    return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Real Name Authentication</title>
          <style>
            body, html {
              height: 100%;
              margin: 0;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            h1 {
              text-align: center;
            }
          </style>
        </head>
        <body>
          <h1>Real Name Authentication Successful</h1>
        </body>
        </html>
      `);
  } catch (error) {
    console.error('faceidRealNameAuth: Internal error');
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    } else {
      console.error('Unknown error:', error);
    }
    res.setHeader('Content-Type', 'text/html');
    return res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Server Error</title>
        <style>
          body, html {
            height: 100%;
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: Arial, sans-serif;
          }
          .error-container {
            text-align: center;
            padding: 20px;
            border: 1px solid #ff0000;
            border-radius: 5px;
          }
          h1 {
            color: #ff0000;
            margin-bottom: 10px;
          }
          p {
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h1>Server Error</h1>
          <p>The server has encountered an error. Please try again later.</p>
        </div>
      </body>
      </html>
    `);
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
