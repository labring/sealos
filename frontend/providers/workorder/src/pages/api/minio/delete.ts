import { jsonRes } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';
import { BucketName, minioClient } from './upload';
import { verifyAccessToken } from '@/services/backend/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!process.env?.MINIO_URL || !process.env?.MINIO_SECRET_KEY) {
      return jsonRes(res, {
        code: 500,
        data: 'Missing minio service'
      });
    }
    const payload = await verifyAccessToken(req);
    if (!payload) {
      return jsonRes(res, {
        code: 401,
        message: "'token is invaild'"
      });
    }

    const { fileName } = req.query as {
      fileName: string;
    };

    await minioClient.removeObject(BucketName, fileName);

    jsonRes(res, {
      data: 'File deleted successfully'
    });
  } catch (error) {
    jsonRes(res, {
      code: 500,
      error
    });
  }
}

export const config = {
  api: {
    bodyParser: false
  }
};
