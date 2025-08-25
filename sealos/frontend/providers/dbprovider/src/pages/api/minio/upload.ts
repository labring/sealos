import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import * as Minio from 'minio';
import multer from 'multer';
import { customAlphabet } from 'nanoid';
import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
const nanoid = customAlphabet('1234567890abcdef', 12);

type FileType = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  filename: string;
  path: string;
  size: number;
};

/**
 * Creates the multer uploader
 */
const maxSize = 5 * 1024 * 1024 * 1024;

class UploadModel {
  uploader = multer({
    limits: {
      fieldSize: maxSize
    },
    preservePath: true,
    storage: multer.diskStorage({
      filename: (_req, file, cb) => {
        const { ext } = path.parse(decodeURIComponent(file.originalname));
        cb(null, nanoid() + ext);
      }
    })
  }).any();

  async doUpload(req: NextApiRequest, res: NextApiResponse) {
    return new Promise<{
      files: FileType[];
    }>((resolve, reject) => {
      // @ts-ignore
      this.uploader(req, res, (error) => {
        if (error) {
          console.log(error, 'multer err');
          return reject(error);
        }
        resolve({
          ...req.body,
          files:
            // @ts-ignore
            req.files?.map((file) => ({
              ...file,
              originalname: decodeURIComponent(file.originalname)
            })) || []
        });
      });
    });
  }
}

const upload = new UploadModel();

const minioClient = new Minio.Client({
  endPoint: process.env?.MINIO_URL || 'minioapi.dev.sealos.top',
  port: Number(process.env?.MINIO_PORT) || 443,
  useSSL: Boolean(process.env?.MINIO_USE_SSL) || true,
  accessKey: process.env?.MINIO_ACCESS_KEY || 'database',
  secretKey: process.env?.MINIO_SECRET_KEY || 'database'
});

export default async function handler(req: any, res: NextApiResponse) {
  try {
    if (!process.env?.MINIO_URL || !process.env?.MINIO_SECRET_KEY) {
      return jsonRes(res, {
        code: 500,
        data: 'Missing minio service'
      });
    }

    const { applyYamlList, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });
    const { files } = await upload.doUpload(req, res);
    const bucketName = process.env?.MINIO_BUCKET_NAME || 'database-test';

    const startTime = performance.now();
    const upLoadResults = await Promise.all(
      files.map(async (file) => {
        const fileName = `${namespace}-${Date.now()}-${file.filename}`;
        await minioClient.fPutObject(bucketName, fileName, file.path);
        return fileName;
      })
    );
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log(upLoadResults);
    console.log(`file:${files} time:${duration}`);

    jsonRes(res, {
      data: upLoadResults
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
