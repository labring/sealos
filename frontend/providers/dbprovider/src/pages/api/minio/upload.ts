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

    let kubeconfig;
    try {
      kubeconfig = await authSession(req);
    } catch (authError) {
      console.error('Authentication failed:', authError);
      return jsonRes(res, {
        code: 401,
        data: 'Authentication failed'
      });
    }

    let k8sResult;
    try {
      k8sResult = await getK8s({ kubeconfig });
    } catch (k8sError) {
      console.error('K8s initialization failed:', k8sError);
      return jsonRes(res, {
        code: 500,
        data:
          'K8s initialization failed: ' +
          (k8sError instanceof Error ? k8sError.message : String(k8sError))
      });
    }

    const { namespace } = k8sResult;

    let files;
    try {
      const uploadResult = await upload.doUpload(req, res);
      files = uploadResult.files;
    } catch (uploadError) {
      console.error('File upload failed:', uploadError);
      return jsonRes(res, {
        code: 500,
        data:
          'File upload failed: ' +
          (uploadError instanceof Error ? uploadError.message : String(uploadError))
      });
    }

    const bucketName = process.env?.MINIO_BUCKET_NAME || 'database-test';

    const startTime = performance.now();
    const upLoadResults = await Promise.all(
      files.map(async (file) => {
        const fileName = `${namespace}-${Date.now()}-${file.filename}`;
        try {
          await minioClient.fPutObject(bucketName, fileName, file.path);
          return fileName;
        } catch (minioError) {
          console.error('MinIO upload failed for file:', fileName, minioError);
          throw minioError;
        }
      })
    );
    const endTime = performance.now();
    const duration = endTime - startTime;

    jsonRes(res, {
      data: upLoadResults
    });
  } catch (error) {
    console.error('Upload handler error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error?.constructor?.name
    });

    jsonRes(res, {
      code: 500,
      error: error instanceof Error ? error.message : error
    });
  }
}

export const config = {
  api: {
    bodyParser: false
  }
};
