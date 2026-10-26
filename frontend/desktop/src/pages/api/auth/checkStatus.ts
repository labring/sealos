import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { checkUserStatusSvc } from '@/services/backend/svc/access';
import { checkKubeconfig } from '@/services/backend/kubernetes/checkKubeconfig';
import { jsonRes } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';

export const config = { api: { bodyParser: { sizeLimit: '64kb' } } };

export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return jsonRes(res, { code: 405, message: 'Method not allowed' });

  await filterAccessToken(req, res, async ({ userUid, userCrName }) => {
    const kubeconfig = req.body?.kubeconfig;
    if (typeof kubeconfig !== 'string' || !kubeconfig.trim()) {
      return jsonRes(res, { code: 401, message: 'Missing session kubeconfig' });
    }

    const result = await checkKubeconfig(kubeconfig, userCrName);
    if (result.code !== 200) return jsonRes(res, result);
    await checkUserStatusSvc({ userUid })(req, res);
  });
});
