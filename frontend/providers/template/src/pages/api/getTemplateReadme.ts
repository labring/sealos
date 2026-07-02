import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { GetTemplateReadmeByName } from './getTemplateSource';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { templateName, locale = 'en' } = req.query as {
      templateName: string;
      locale: string;
    };

    let user_namespace = '';
    try {
      const { namespace } = await getK8s({
        kubeconfig: await authSession(req.headers)
      });
      user_namespace = namespace;
    } catch (error) {}

    const { code, message, readmeContent, readUrl } = await GetTemplateReadmeByName({
      namespace: user_namespace,
      templateName,
      locale
    });

    if (code !== 20000) {
      return jsonRes(res, { code, message });
    }

    jsonRes(res, {
      code: 200,
      data: {
        readmeContent,
        readUrl
      }
    });
  } catch (err: any) {
    console.log(err);
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
