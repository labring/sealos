import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';
import { CreateLaunchpadRequestSchema, transformToLegacySchema } from '@/constants/schema';
import { createApp, createK8sContext } from '@/services/backend';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { method } = req;

    if (method === 'POST') {
      const parseResult = CreateLaunchpadRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        return jsonRes(res, {
          code: 400,
          error: parseResult.error
        });
      }

      const standardRequest = parseResult.data;

      const legacyRequest = transformToLegacySchema(standardRequest);

      const k8s = await createK8sContext(req);
      await createApp(legacyRequest, k8s);
      console.log(legacyRequest, 111, standardRequest);

      jsonRes(res, {
        data: { name: standardRequest.name }
      });
    } else {
      res.setHeader('Allow', ['POST']);
      return jsonRes(res, {
        code: 405,
        error: `Method ${method} Not Allowed`
      });
    }
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
