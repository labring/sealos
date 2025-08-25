import type { NextRequest } from 'next/server';

import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { authSession } from '@/services/backend/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const headerList = req.headers;

    const { getUserQuota } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    const { GPU_ENABLE } = process.env;

    const quota = await getUserQuota();

    const filteredQuota = GPU_ENABLE ? quota : quota.filter((item) => item.type !== 'gpu');

    return jsonRes({
      data: {
        quota: filteredQuota
      }
    });
  } catch (error) {
    console.log(error);
    return jsonRes({ code: 500, message: 'get price error' });
  }
}
