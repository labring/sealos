import { jsonRes } from '@/services/backend/response';
import { enableEnterpriseRealNameAuth } from '@/services/enable';
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAccessToken } from '@/services/backend/auth';
import { globalPrisma } from '@/services/backend/db/init';
import { RealNameOSSConfigType } from '@/types';
import * as Minio from 'minio';
import formidable, { Fields, Files, File, Part } from 'formidable';
import path from 'path';
import Formidable from 'formidable/Formidable';
import fs from 'fs/promises';

export const config = {
  api: {
    bodyParser: false
  }
};

const realNameOSS: RealNameOSSConfigType = global.AppConfig.realNameOSS;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!enableEnterpriseRealNameAuth) {
    console.error('enterpriseRealNameAuth: enterprise real name authentication not enabled');
    return jsonRes(res, { code: 503, message: 'Enterprise real name authentication not enabled' });
  }

  if (req.method !== 'POST') {
    console.error('enterpriseRealNameAuth: Method not allowed');
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }

  const payload = await verifyAccessToken(req.headers);
  if (!payload) return jsonRes(res, { code: 401, message: 'Token is invalid' });

  if (!realNameOSS) {
    return jsonRes(res, {
      code: 500,
      message: 'Real name authentication oss configuration not found'
    });
  }

  try {
    const userUid = payload.userUid;

    const form = formidable({
      multiples: false,
      keepExtensions: true,
      maxFileSize: MAX_FILE_SIZE,
      filter: function (part: Part): boolean {
        return part.mimetype !== null && ALLOWED_FILE_TYPES.includes(part.mimetype);
      },
      filename: function (name: string, ext: string, part: Part, form: Formidable): string {
        const sanitizedName = sanitizeFilename(part.originalFilename || 'unnamed');
        return sanitizedName;
      }
    });

    const formData = await parseFormData(req, form);
    const { fields, files } = formData;
    const enterpriseName = fields.enterpriseName?.[0];

    if ((enterpriseName && enterpriseName.length < 1) || enterpriseName.length > 20) {
      return jsonRes(res, {
        code: 400,
        message: 'Enterprise name must be between 1 and 20 characters'
      });
    }

    if (!files.enterpriseQualification?.[0] || !files.supportingMaterials?.[0]) {
      return jsonRes(res, {
        code: 400,
        message: 'Enterprise qualification and supporting materials are required'
      });
    }

    if (
      files &&
      files.enterpriseQualification?.[0] &&
      files.enterpriseQualification?.[0].size > MAX_FILE_SIZE
    ) {
      return jsonRes(res, {
        code: 400,
        message: 'Enterprise qualification file size exceeds the maximum limit'
      });
    }

    if (
      files &&
      files.supportingMaterials?.[0] &&
      files.supportingMaterials?.[0].size > MAX_FILE_SIZE
    ) {
      return jsonRes(res, {
        code: 400,
        message: 'Supporting materials file size exceeds the maximum limit'
      });
    }

    // Check if EnterpriseRealNameInfo exists
    const existingInfo = await globalPrisma.enterpriseRealNameInfo.findUnique({
      where: { userUid }
    });

    if (!existingInfo) {
      // Create new EnterpriseRealNameInfo
      const ossPaths = await uploadFiles(userUid, files);
      await createEnterpriseRealNameInfo(userUid, enterpriseName, ossPaths);
      return jsonRes(res, {
        code: 200,
        message: 'Enterprise real name authentication submitted successfully',
        data: { status: 'Pending' }
      });
    }

    // Handle existing EnterpriseRealNameInfo cases
    switch (existingInfo.verificationStatus) {
      case 'Pending':
        return jsonRes(res, { code: 400, message: 'Authentication is under review' });
      case 'Success':
        return jsonRes(res, { code: 400, message: 'Cannot authenticate multiple times' });
      case 'Failed':
        // Re-upload files and update EnterpriseRealNameInfo
        const newOssPaths = await uploadFiles(userUid, files);
        await updateEnterpriseRealNameInfo(existingInfo.id, enterpriseName, newOssPaths);
        return jsonRes(res, {
          code: 200,
          data: { status: 'Pending' },
          message: 'Enterprise real name authentication resubmitted successfully'
        });
      default:
        return jsonRes(res, { code: 500, message: 'Invalid verification status' });
    }
  } catch (error) {
    console.error('enterpriseRealNameAuth: Internal error', error);
    return jsonRes(res, { code: 500, message: 'The server has encountered an error' });
  }
}

// Helper functions
async function parseFormData(req: NextApiRequest, form: Formidable): Promise<any> {
  return new Promise((resolve, reject) => {
    form.parse(req, (err: Error, fields: Fields, files: Files) => {
      if (err) {
        reject(err);
      } else {
        resolve({ fields, files });
      }
    });
  });
}

function sanitizeFilename(filename: string): string {
  // Remove any path components
  const basename = path.basename(filename);
  // Define a blacklist of malicious characters
  const blacklist = /[<>:"/\\|?*\x00-\x1F]/g;
  // Replace blacklisted characters with underscores
  return basename.replace(blacklist, '_');
}

async function uploadFiles(userUid: string, files: Files): Promise<string[]> {
  const minioClient = new Minio.Client({
    endPoint: realNameOSS.endpoint,
    accessKey: realNameOSS.accessKey,
    secretKey: realNameOSS.accessKeySecret,
    port: realNameOSS.port,
    useSSL: realNameOSS.ssl
  });

  const filesToUpload = [
    { file: files.enterpriseQualification?.[0], name: 'enterpriseQualification' },
    { file: files.supportingMaterials?.[0], name: 'supportingMaterials' }
  ].filter((item) => item.file !== null);

  const uploadPromises = filesToUpload.map((item) =>
    uploadFile(minioClient, userUid, item.file!, item.name)
  );

  return await Promise.all(uploadPromises);
}

async function uploadFile(
  minioClient: Minio.Client,
  userUid: string,
  file: File,
  fileType: string
): Promise<string> {
  const timestamp = Date.now();
  const fileName = `${timestamp}_${fileType}_${file.newFilename}`;
  const filePath = `/${userUid}/${fileName}`;
  try {
    await minioClient.fPutObject(realNameOSS.enterpriseRealNameBucket, filePath, file.filepath, {
      'Content-Type': file.mimetype || 'application/octet-stream'
    });
    // Check if the file exists before attempting to delete it
    try {
      await fs.access(file.filepath);
      // If no error is thrown, the file exists, so we can delete it
      await fs.unlink(file.filepath);
      console.debug(`File ${file.filepath} has been deleted.`);
    } catch (accessError) {
      // If an error is thrown, the file doesn't exist
      console.debug(`File ${file.filepath} does not exist or is not accessible.`);
    }
  } catch (error) {
    console.error('EnterpriseRealNameAuth uploadFile: Error uploading file', error);
    throw error;
  }

  return filePath;
}

async function createEnterpriseRealNameInfo(
  userUid: string,
  enterpriseName: string,
  ossPaths: string[]
) {
  await globalPrisma.enterpriseRealNameInfo.create({
    data: {
      userUid,
      enterpriseName: enterpriseName,
      supportingMaterials: { ossPaths: ossPaths }, // Remaining paths for supportingMaterials
      verificationStatus: 'Pending'
    }
  });
}

async function updateEnterpriseRealNameInfo(
  id: string,
  enterpriseName: string,
  ossPaths: string[]
) {
  await globalPrisma.enterpriseRealNameInfo.update({
    where: { id },
    data: {
      enterpriseName: enterpriseName,
      supportingMaterials: { ossPaths: ossPaths },
      verificationStatus: 'Pending'
    }
  });
}
