import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';

export type UploadAppPayload = { appname: string; namespace: string; file: File };

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const SERVER_BASE_URL = process.env.SERVER_BASE_URL || '';

    await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const form = formidable({
      keepExtensions: true
    });

    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];
    const appname = fields.appname?.[0];
    const namespace = fields.namespace?.[0];

    if (!file || !appname || !namespace) {
      throw new Error('Missing required fields');
    }

    const formData = new FormData();

    formData.append(
      'file',
      new Blob([fs.readFileSync(file.filepath)]),
      file.originalFilename || ''
    );

    const response = await fetch(
      `${SERVER_BASE_URL}/api/uploadApp?namespace=${namespace}&appname=${appname}`,
      {
        method: 'POST',
        body: formData
      }
    );
    const result = (await response.json()) as {
      message: string;
    };

    fs.unlinkSync(file.filepath);

    jsonRes(res, {
      data: result
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
