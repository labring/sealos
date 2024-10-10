import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export type ExportAppPayload = {
  yaml: string;
  images: { name: string }[];
  appname: string;
  namespace: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const exportAppUrl = process.env.EXPORT_APP_URL || '';

    await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const data = req.body as ExportAppPayload;

    const temp = await fetch(
      `${exportAppUrl}?namespace=${data.namespace}&&appname=${data.appname}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          yaml: data.yaml,
          images: data.images
        })
      }
    );

    const result = (await temp.json()) as {
      message: string;
      path: string;
      url: string;
      error?: string;
    };

    console.log('export app result:', result);

    jsonRes<{
      downloadPath: string;
      error?: string;
    }>(res, {
      data: {
        downloadPath: result?.url,
        error: result?.error
      }
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
