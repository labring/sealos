import { jsonRes } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';
import { BucketName, minioClient } from './upload';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!process.env?.MINIO_URL || !process.env?.MINIO_SECRET_KEY) {
      return jsonRes(res, {
        code: 500,
        data: 'Missing minio service'
      });
    }
    const { fileName } = req.query as {
      fileName: string;
    };

    const url = await minioClient.presignedGetObject(BucketName, fileName);

    jsonRes(res, {
      data: url
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
